const fs = require("fs");
const path = require("path");

/**
 * Detect the type of a GIFT question based on its content
 */
function detectQuestionType(questionContent) {
  // Multiple Choice with feedback (1:MC:...)
  if (questionContent.match(/\{1:MC:/)) {
    return "MultipleChoice";
  }
  
  // Short Answer (1:SA:=...)
  if (questionContent.match(/\{1:SA:/)) {
    return "ShortAnswer";
  }
  
  // Matching question (=option -> match)
  if (questionContent.match(/\{[^}]*=[^~][^}]*->/)) {
    return "Matching";
  }
  
  // Multiple Choice simple (~=correct~wrong or ~wrong~=correct)
  if (questionContent.match(/\{[^}]*~[^}]*\}/)) {
    return "MultipleChoice";
  }
  
  // Essay/Open question (no special markers, just {})
  if (questionContent.match(/\{[^}]*=[^~][^}]*\}/) && !questionContent.includes("->")) {
    return "ShortAnswer";
  }
  
  // True/False (special case of multiple choice)
  if (questionContent.match(/\{(TRUE|FALSE|T|F)\}/i)) {
    return "TrueFalse";
  }
  
  // Numerical
  if (questionContent.match(/\{#[^}]*\}/)) {
    return "Numerical";
  }
  
  return "Unknown";
}

/**
 * Extract clean question text without GIFT markup
 */
function extractQuestionText(content) {
  // Remove HTML tags for display
  let text = content.replace(/<[^>]*>/g, "");
  
  // Remove answer blocks
  text = text.replace(/\{[^}]*\}/g, "[...]");
  
  return text.trim();
}

/**
 * Extract answers from a question
 */
function extractAnswers(content) {
  const answers = [];
  
  // Find all answer blocks in the content (including multi-line blocks)
  // Use [\s\S] to match any character including newlines
  const answerBlockRegex = /\{([\s\S]*?)\}/g;
  const matches = content.matchAll(answerBlockRegex);
  
  for (const match of matches) {
    let answerBlock = match[1];
    
    // Remove type prefixes like "1:MC:" or "1:SA:" or "#"
    answerBlock = answerBlock.replace(/^\d+:(MC|SA|NUMERICAL|SHORTANSWER|MULTICHOICE):/i, "");
    answerBlock = answerBlock.replace(/^#/, ""); // For numerical questions
    
    // Skip empty blocks
    if (!answerBlock.trim()) {
      continue;
    }
    
    // Multiple choice or matching (has ~ tilde character)
    if (answerBlock.includes("~")) {
      // Check if this is multi-line format (answers on separate lines) or inline format
      const lines = answerBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      const isMultiline = lines.length > 1 && lines.some(l => l.startsWith("~") || l.startsWith("="));
      
      if (isMultiline) {
        // Multi-line format: each answer on its own line
        for (const line of lines) {
          // Skip lines that don't start with ~ or =
          if (!line.startsWith("~") && !line.startsWith("=")) {
            continue;
          }
          
          // Check if this answer is marked as correct with =
          const isCorrect = line.startsWith("=");
          
          // Remove the ~ or = prefix
          let text = line.replace(/^[~=]/, "").trim();
          
          // Extract text before feedback marker
          const feedbackIndex = text.indexOf("#");
          if (feedbackIndex !== -1) {
            text = text.substring(0, feedbackIndex).trim();
          }
          
          if (text) {
            answers.push({
              text: text,
              correct: isCorrect,
            });
          }
        }
      } else {
        // Inline format: answers separated by ~ on same line
        const parts = answerBlock.split("~");
        
        parts.forEach((part) => {
          part = part.trim();
          if (part) {
            const isCorrect = part.startsWith("=");
            let text = part.replace(/^=/, "").trim();
            
            const feedbackIndex = text.indexOf("#");
            if (feedbackIndex !== -1) {
              text = text.substring(0, feedbackIndex).trim();
            }
            
            if (text) {
              answers.push({
                text: text,
                correct: isCorrect,
              });
            }
          }
        });
      }
    } else if (answerBlock.includes("=")) {
      // Short answer - can have multiple correct answers
      // Answers can be in format: {=answer1 =answer2 =answer3#feedback}
      
      // Use regex to find all answers starting with =
      // Pattern: = followed by text until space+= or # or end of string
      const answerPattern = /=([^=]+?)(?=\s+=|#|$)/g;
      const matches = [...answerBlock.matchAll(answerPattern)];
      
      if (matches.length > 0) {
        matches.forEach(match => {
          let text = match[1].trim();
          
          // Extract text before feedback marker
          const feedbackIndex = text.indexOf("#");
          if (feedbackIndex !== -1) {
            text = text.substring(0, feedbackIndex).trim();
          }
          
          if (text) {
            answers.push({
              text: text,
              correct: true,
            });
          }
        });
      } else {
        // Fallback: simple case with single answer
        let text = answerBlock.replace(/^=/, "").trim();
        const feedbackIndex = text.indexOf("#");
        if (feedbackIndex !== -1) {
          text = text.substring(0, feedbackIndex).trim();
        }
        if (text) {
          answers.push({
            text: text,
            correct: true,
          });
        }
      }
    }
  }
  
  return answers;
}

/**
 * Parse a GIFT file and extract questions with detailed information
 */
function parseGiftFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const questions = [];
  
  // Split content by lines first to handle comments
  const lines = content.split("\n");
  let currentQuestion = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts a new question (::title::)
    const questionStart = line.match(/^::([^:]+)::(.*)/);
    
    if (questionStart) {
      // Save previous question if exists
      if (currentQuestion && currentContent.length > 0) {
        const questionContent = currentContent.join("\n").trim();
        
        // Skip empty questions or pure instruction questions
        if (questionContent.length >= 5 && questionContent.includes("{")) {
          const type = detectQuestionType(questionContent);
          const questionText = extractQuestionText(questionContent);
          const answers = extractAnswers(questionContent);
          
          questions.push({
            title: currentQuestion,
            type: type,
            content: questionContent,
            questionText: questionText,
            answers: answers,
            rawContent: questionContent,
          });
        }
      }
      
      // Start new question
      currentQuestion = questionStart[1].trim();
      currentContent = [questionStart[2]]; // Include content after ::title::
    } else if (currentQuestion) {
      // Add line to current question content
      // Stop if we hit a comment that looks like a new section
      if (line.trim().startsWith("// Part ") || line.trim().startsWith("//Part ")) {
        // This is likely a section separator, save current question
        if (currentContent.length > 0) {
          const questionContent = currentContent.join("\n").trim();
          
          if (questionContent.length >= 5 && questionContent.includes("{")) {
            const type = detectQuestionType(questionContent);
            const questionText = extractQuestionText(questionContent);
            const answers = extractAnswers(questionContent);
            
            questions.push({
              title: currentQuestion,
              type: type,
              content: questionContent,
              questionText: questionText,
              answers: answers,
              rawContent: questionContent,
            });
          }
          
          currentQuestion = null;
          currentContent = [];
        }
      } else {
        currentContent.push(line);
      }
    }
  }
  
  // Don't forget last question
  if (currentQuestion && currentContent.length > 0) {
    const questionContent = currentContent.join("\n").trim();
    
    if (questionContent.length >= 5 && questionContent.includes("{")) {
      const type = detectQuestionType(questionContent);
      const questionText = extractQuestionText(questionContent);
      const answers = extractAnswers(questionContent);
      
      questions.push({
        title: currentQuestion,
        type: type,
        content: questionContent,
        questionText: questionText,
        answers: answers,
        rawContent: questionContent,
      });
    }
  }
  
  return questions;
}

/**
 * Search questions by type and keyword across all GIFT files
 */
function searchQuestions(dataDir, type, keyword) {
  const files = fs.readdirSync(dataDir);
  const results = [];
  
  files.forEach((file) => {
    if (file.endsWith(".gift")) {
      const filePath = path.join(dataDir, file);
      try {
        const questions = parseGiftFile(filePath);
        questions.forEach((q) => {
          const matchesType = !type || q.type.toLowerCase() === type.toLowerCase();
          const matchesKeyword = !keyword || 
            q.title.toLowerCase().includes(keyword.toLowerCase()) ||
            q.questionText.toLowerCase().includes(keyword.toLowerCase()) ||
            q.content.toLowerCase().includes(keyword.toLowerCase());
          
          if (matchesType && matchesKeyword) {
            results.push({
              file: file,
              title: q.title,
              type: q.type,
              questionText: q.questionText,
              content: q.content,
              answers: q.answers,
            });
          }
        });
      } catch (error) {
        console.error(`Error parsing file ${file}: ${error.message}`);
      }
    }
  });
  
  return results;
}

/**
 * Get statistics about question types in the data directory
 */
function getQuestionStats(dataDir) {
  const files = fs.readdirSync(dataDir);
  const stats = {
    totalFiles: 0,
    totalQuestions: 0,
    byType: {},
    byFile: {},
  };
  
  files.forEach((file) => {
    if (file.endsWith(".gift")) {
      const filePath = path.join(dataDir, file);
      try {
        const questions = parseGiftFile(filePath);
        stats.totalFiles++;
        stats.totalQuestions += questions.length;
        stats.byFile[file] = questions.length;
        
        questions.forEach((q) => {
          stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
        });
      } catch (error) {
        console.error(`Error parsing file ${file}: ${error.message}`);
      }
    }
  });
  
  return stats;
}

/**
 * List all available question types in the data directory
 */
function getAvailableTypes(dataDir) {
  const files = fs.readdirSync(dataDir);
  const types = new Set();
  
  files.forEach((file) => {
    if (file.endsWith(".gift")) {
      const filePath = path.join(dataDir, file);
      try {
        const questions = parseGiftFile(filePath);
        questions.forEach((q) => types.add(q.type));
      } catch (error) {
        // Ignore errors for this function
      }
    }
  });
  
  return Array.from(types).sort();
}

module.exports = {
  parseGiftFile,
  searchQuestions,
  getQuestionStats,
  getAvailableTypes,
};
