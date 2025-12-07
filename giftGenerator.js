const fs = require("fs");
const path = require("path");

function formatDate(date) {
  return new Date(date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function generateGiftHeader(exam) {
  const header = [];
  header.push("// ========================================");
  header.push(`// ${exam.title}`);
  header.push("// ========================================");
  header.push(`// Généré le: ${formatDate(new Date())}`);
  header.push(`// Nombre de questions: ${exam.questions.length}`);
  header.push(`// Format: GIFT (Moodle)`);
  header.push("//");
  header.push(`// Créé le: ${formatDate(exam.createdAt)}`);
  header.push(`// Dernière modification: ${formatDate(exam.modifiedAt)}`);
  header.push("// ========================================");
  header.push("");
  return header.join("\n");
}

function questionToGift(question, index) {
  const lines = [];
  
  if (index > 0) {
    lines.push("");
  }
  
  lines.push(`// Question ${index + 1}`);
  lines.push(`// Type: ${question.type}`);
  lines.push(`// Source: ${question.file}`);
  lines.push("");
  
  const giftLine = `::${question.title}::${question.content}`;
  lines.push(giftLine);
  
  return lines.join("\n");
}

function generateGiftContent(exam) {
  if (!exam || !exam.questions || exam.questions.length === 0) {
    throw new Error("L'examen est vide. Impossible de générer un fichier GIFT.");
  }
  
  const parts = [];
  
  parts.push(generateGiftHeader(exam));
  
  exam.questions.forEach((question, index) => {
    try {
      parts.push(questionToGift(question, index));
    } catch (error) {
      throw new Error(
        `Le format de la question ${index + 1} est invalide. ` +
        `Veuillez vérifier la question "${question.title}". ` +
        `Erreur: ${error.message}`
      );
    }
  });
  
  parts.push("");
  parts.push("// ========================================");
  parts.push(`// Fin de l'examen - ${exam.questions.length} questions`);
  parts.push("// ========================================");
  parts.push("");
  
  return parts.join("\n");
}

function validateGiftSyntax(content) {
  const errors = [];
  const warnings = [];
  
  const questionPattern = /::[^:]+::/g;
  const questionMatches = content.match(questionPattern);
  const questionCount = questionMatches ? questionMatches.length : 0;
  
  if (questionCount === 0) {
    errors.push("Aucune question trouvée dans le fichier GIFT");
  }
  
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  if (Math.abs(openBraces - closeBraces) > 2) {
    warnings.push(
      `Nombre d'accolades déséquilibré: ${openBraces} ouvertes, ${closeBraces} fermées. ` +
      `Cela peut causer des problèmes lors de l'import dans Moodle.`
    );
  }
  
  if (!content.includes("::") || !content.includes("{")) {
    errors.push("Le fichier ne semble pas contenir de questions GIFT valides");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    questionCount,
  };
}

function saveGiftFile(content, filePath) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, "utf8");
    
    return {
      success: true,
      path: filePath,
      size: content.length,
    };
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error(
        "Impossible d'écrire le fichier. Vérifiez les permissions du dossier."
      );
    } else if (error.code === 'ENOENT') {
      throw new Error(
        "Le chemin spécifié n'existe pas. Vérifiez le chemin du fichier."
      );
    } else {
      throw new Error(
        `Erreur lors de l'écriture du fichier: ${error.message}`
      );
    }
  }
}

function generateGiftFile(exam, outputPath) {
  if (exam.questions.length < exam.metadata.minQuestions) {
    throw new Error(
      `L'examen doit contenir au moins ${exam.metadata.minQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  if (exam.questions.length > exam.metadata.maxQuestions) {
    throw new Error(
      `L'examen ne peut contenir plus de ${exam.metadata.maxQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  const content = generateGiftContent(exam);
  
  const validation = validateGiftSyntax(content);
  
  if (!validation.valid) {
    const errorMsg = "Le fichier GIFT généré contient des erreurs:\n" +
      validation.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
    throw new Error(errorMsg);
  }
  
  const result = saveGiftFile(content, outputPath);
  
  return {
    ...result,
    validation,
    questionCount: exam.questions.length,
  };
}

function previewGiftFile(exam, maxLines = 50) {
  const content = generateGiftContent(exam);
  const lines = content.split("\n");
  
  if (lines.length <= maxLines) {
    return {
      content,
      truncated: false,
      totalLines: lines.length,
    };
  }
  
  return {
    content: lines.slice(0, maxLines).join("\n") + "\n\n// ... (truncated)",
    truncated: true,
    totalLines: lines.length,
    showingLines: maxLines,
  };
}

function getDefaultFilename(examTitle) {
  const sanitized = examTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitized}_${timestamp}.gift`;
}

module.exports = {
  generateGiftContent,
  generateGiftFile,
  validateGiftSyntax,
  previewGiftFile,
  getDefaultFilename,
  saveGiftFile,
};