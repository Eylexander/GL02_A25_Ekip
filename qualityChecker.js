const { parseGiftFile } = require("./giftParser");

/**
 * Verify the quality of a GIFT exam file
 */
function verifyGiftExam(giftFilePath) {
  const errors = [];
  const warnings = [];
  
  try {
    // Parse the GIFT file
    const questions = parseGiftFile(giftFilePath);
    
    // Check 1: Minimum number of questions (15)
    if (questions.length < 15) {
      errors.push(
        `Nombre de questions insuffisant : ${questions.length}/15 minimum`
      );
    }
    
    // Check 2: Maximum number of questions (20)
    if (questions.length > 20) {
      errors.push(
        `Nombre de questions excessif : ${questions.length}/20 maximum`
      );
    }
    
    // Check 3: Question uniqueness
    const seen = new Set();
    const duplicates = [];
    
    questions.forEach((q, idx) => {
      const key = q.title;
      if (seen.has(key)) {
        duplicates.push(`Question "${q.title}" dupliquée à la position ${idx + 1}`);
      }
      seen.add(key);
    });
    
    if (duplicates.length > 0) {
      errors.push(...duplicates);
    }
    
    // Check 4: Questions with no answers
    const noAnswers = [];
    questions.forEach((q, idx) => {
      if (!q.answers || q.answers.length === 0) {
        noAnswers.push(
          `Question ${idx + 1} "${q.title}" n'a pas de réponses`
        );
      }
    });
    
    if (noAnswers.length > 0) {
      errors.push(...noAnswers);
    }
    
    // Check 5: Multiple choice questions with no correct answer
    const noCorrect = [];
    questions.forEach((q, idx) => {
      if (q.type === "MultipleChoice") {
        const hasCorrect = q.answers.some(a => a.correct);
        if (!hasCorrect) {
          noCorrect.push(
            `Question ${idx + 1} "${q.title}" n'a pas de réponse correcte`
          );
        }
      }
    });
    
    if (noCorrect.length > 0) {
      errors.push(...noCorrect);
    }
    
    // Check 6: Unknown question types
    const unknownTypes = questions.filter(q => q.type === "Unknown");
    if (unknownTypes.length > 0) {
      warnings.push(
        `${unknownTypes.length} question(s) de type inconnu détectée(s). ` +
        `Vérifiez le format GIFT.`
      );
    }
    
    // Check 7: Question type diversity
    const typeCount = {};
    questions.forEach(q => {
      typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    });
    
    if (Object.keys(typeCount).length === 1) {
      warnings.push(
        "L'examen ne contient qu'un seul type de question. " +
        "Envisagez d'ajouter plus de variété."
      );
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalQuestions: questions.length,
        typeDistribution: typeCount,
        duplicates: duplicates.length,
        missingAnswers: noAnswers.length,
        missingCorrect: noCorrect.length,
      },
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [`Erreur lors de la lecture du fichier : ${error.message}`],
      warnings: [],
      stats: null,
    };
  }
}

module.exports = {
  verifyGiftExam,
};

