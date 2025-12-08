const fs = require("fs");
const path = require("path");

function detectQuestionType(questionContent) {
  // Check for explicitly marked question types first
  if (questionContent.match(/\{1:MC:/)) {
    return "MultipleChoice";
  }
  
  if (questionContent.match(/\{1:SA:/)) {
    return "ShortAnswer";
  }
  
  // Check for Numerical questions (must come before other checks)
  if (questionContent.match(/\{#[^}]*\}/)) {
    return "Numerical";
  }
  
  // Check for Matching questions
  if (questionContent.match(/\{[^}]*=[^~][^}]*->/)) {
    return "Matching";
  }
  
  // Check for TrueFalse questions (including those with feedback)
  // Matches {TRUE}, {FALSE}, {T}, {F} and variations with feedback like {FALSE#feedback#more}
  // Also handles newlines after opening brace
  if (questionContent.match(/\{\s*(TRUE|FALSE|T|F)([#~}\s]|$)/i)) {
    return "TrueFalse";
  }
  
  // Check for Multiple Choice questions (contains ~)
  if (questionContent.match(/\{[^}]*~[^}]*\}/)) {
    return "MultipleChoice";
  }
  
  // Check for ShortAnswer questions (contains = but not -> and not ~)
  if (questionContent.match(/\{[^}]*=[^~][^}]*\}/) && !questionContent.includes("->")) {
    return "ShortAnswer";
  }
  
  // Check for empty answer blocks {} - these are essay/fill-in questions
  if (questionContent.match(/\{\s*\}/)) {
    return "Essay";
  }
  
  return "Unknown";
}

function extractQuestionText(content) {
  let text = content.replace(/<[^>]*>/g, "");
  
  text = text.replace(/\{[^}]*\}/g, "[...]");
  
  return text.trim();
}

function extractAnswers(content) {
  const answers = [];
  
  const answerBlockRegex = /\{([\s\S]*?)\}/g;
  const matches = content.matchAll(answerBlockRegex);
  
  for (const match of matches) {
    let answerBlock = match[1];
    
    answerBlock = answerBlock.replace(/^\d+:(MC|SA|NUMERICAL|SHORTANSWER|MULTICHOICE):/i, "");
    answerBlock = answerBlock.replace(/^#/, "");
    
    if (!answerBlock.trim()) {
      continue;
    }
    
    if (answerBlock.includes("~")) {
      const lines = answerBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      const isMultiline = lines.length > 1 && lines.some(l => l.startsWith("~") || l.startsWith("="));
      
      if (isMultiline) {
        for (const line of lines) {
          if (!line.startsWith("~") && !line.startsWith("=")) {
            continue;
          }
          
          const isCorrect = line.startsWith("=");
          
          let text = line.replace(/^[~=]/, "").trim();
          
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
      const answerPattern = /=([^=]+?)(?=\s+=|#|$)/g;
      const matches = [...answerBlock.matchAll(answerPattern)];
      
      if (matches.length > 0) {
        matches.forEach(match => {
          let text = match[1].trim();
          
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

function parseGiftFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const questions = [];
  
  const lines = content.split("\n");
  let currentQuestion = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const questionStart = line.match(/^::([^:]+)::(.*)/);
    
    if (questionStart) {
      if (currentQuestion && currentContent.length > 0) {
        const questionContent = currentContent.join("\n").trim();
        
        if (questionContent.length >= 5 && questionContent.includes("{")) {
          const type = detectQuestionType(questionContent);
          if (type === "Unknown") {
            console.log("Type de question inconnu:", questionContent);
            console.log("Chemin:", filePath);
          }
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
      
      currentQuestion = questionStart[1].trim();
      currentContent = [questionStart[2]];
    } else if (currentQuestion) {
      if (line.trim().startsWith("// Part ") || line.trim().startsWith("//Part ")) {
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
        console.error(`Erreur lors de l'analyse du fichier ${file}: ${error.message}`);
      }
    }
  });
  
  return results;
}

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
        console.error(`Erreur lors de l'analyse du fichier ${file}: ${error.message}`);
      }
    }
  });
  
  return stats;
}

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
