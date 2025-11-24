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
  const answerBlockMatch = content.match(/\{([^}]*)\}/);
  
  if (!answerBlockMatch) {
    return answers;
  }
  
  const answerBlock = answerBlockMatch[1];
  
  // Multiple choice or matching
  if (answerBlock.includes("~") || answerBlock.includes("->")) {
    // Split by ~ but preserve -> for matching questions
    const parts = answerBlock.split(/(?<![=-])~(?![=-])/);
    parts.forEach((part) => {
      part = part.trim();
      if (part) {
        const isCorrect = part.startsWith("=");
        const text = part.replace(/^=/, "").trim();
        if (text) {
          answers.push({
            text: text,
            correct: isCorrect,
          });
        }
      }
    });
  } else if (answerBlock.includes("=")) {
    // Short answer - can have multiple correct answers
    const parts = answerBlock.split(/\s*=\s*/);
    parts.forEach((part) => {
      part = part.trim();
      if (part) {
        answers.push({
          text: part,
          correct: true,
        });
      }
    });
  }
  
  return answers;
}

/**
 * Parse a GIFT file and extract questions with detailed information
 */
function parseGiftFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const questions = [];
  
  // Split content by question markers (::...::)
  const questionPattern = /::(.*?)::(.*?)(?=(?:::|$))/gs;
  let match;
  
  while ((match = questionPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const questionContent = match[2].trim();
    
    // Skip empty questions or instructions
    if (!questionContent || questionContent.length < 5) {
      continue;
    }
    
    const type = detectQuestionType(questionContent);
    const questionText = extractQuestionText(questionContent);
    const answers = extractAnswers(questionContent);
    
    questions.push({
      title: title,
      type: type,
      content: questionContent,
      questionText: questionText,
      answers: answers,
      rawContent: questionContent,
    });
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
