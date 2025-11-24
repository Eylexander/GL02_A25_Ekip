const fs = require("fs");
const path = require("path");

/**
 * Format a date for GIFT file header
 */
function formatDate(date) {
  return new Date(date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Generate GIFT file header with metadata
 */
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

/**
 * Escape special characters for GIFT format
 */
function escapeGift(text) {
  // GIFT special characters that need escaping
  return text
    .replace(/\\/g, '\\\\')  // Backslash first
    .replace(/~/g, '\\~')    // Tilde
    .replace(/=/g, '\\=')    // Equals (only when not used as correct answer marker)
    .replace(/#/g, '\\#')    // Hash
    .replace(/\{/g, '\\{')   // Left brace
    .replace(/\}/g, '\\}');  // Right brace
}

/**
 * Convert a question to GIFT format
 * The question already has the correct GIFT format in its rawContent,
 * so we can use it directly with proper formatting
 */
function questionToGift(question, index) {
  const lines = [];
  
  // Add a separator comment
  if (index > 0) {
    lines.push("");
  }
  
  lines.push(`// Question ${index + 1}`);
  lines.push(`// Type: ${question.type}`);
  lines.push(`// Source: ${question.file}`);
  lines.push("");
  
  // Use the original GIFT content
  // Format: ::title::content
  const giftLine = `::${question.title}::${question.content}`;
  lines.push(giftLine);
  
  return lines.join("\n");
}

/**
 * Generate complete GIFT file content from exam
 */
function generateGiftContent(exam) {
  if (!exam || !exam.questions || exam.questions.length === 0) {
    throw new Error("L'examen est vide. Impossible de générer un fichier GIFT.");
  }
  
  const parts = [];
  
  // Add header
  parts.push(generateGiftHeader(exam));
  
  // Add each question
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
  
  // Add footer
  parts.push("");
  parts.push("// ========================================");
  parts.push(`// Fin de l'examen - ${exam.questions.length} questions`);
  parts.push("// ========================================");
  parts.push("");
  
  return parts.join("\n");
}

/**
 * Validate GIFT syntax (basic validation)
 */
function validateGiftSyntax(content) {
  const errors = [];
  const warnings = [];
  
  // Count questions by looking for :: markers
  const questionPattern = /::[^:]+::/g;
  const questionMatches = content.match(questionPattern);
  const questionCount = questionMatches ? questionMatches.length : 0;
  
  if (questionCount === 0) {
    errors.push("Aucune question trouvée dans le fichier GIFT");
  }
  
  // Check for severely malformed content
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  if (Math.abs(openBraces - closeBraces) > 2) {
    warnings.push(
      `Nombre d'accolades déséquilibré: ${openBraces} ouvertes, ${closeBraces} fermées. ` +
      `Cela peut causer des problèmes lors de l'import dans Moodle.`
    );
  }
  
  // Basic structure check
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

/**
 * Save GIFT file to disk
 */
function saveGiftFile(content, filePath) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
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

/**
 * Generate and save a GIFT file from an exam
 */
function generateGiftFile(exam, outputPath) {
  // Validate exam has minimum questions
  if (exam.questions.length < exam.metadata.minQuestions) {
    throw new Error(
      `L'examen doit contenir au moins ${exam.metadata.minQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  // Validate exam has maximum questions
  if (exam.questions.length > exam.metadata.maxQuestions) {
    throw new Error(
      `L'examen ne peut contenir plus de ${exam.metadata.maxQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  // Generate content
  const content = generateGiftContent(exam);
  
  // Validate syntax
  const validation = validateGiftSyntax(content);
  
  if (!validation.valid) {
    const errorMsg = "Le fichier GIFT généré contient des erreurs:\n" +
      validation.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
    throw new Error(errorMsg);
  }
  
  // Save file
  const result = saveGiftFile(content, outputPath);
  
  return {
    ...result,
    validation,
    questionCount: exam.questions.length,
  };
}

/**
 * Preview GIFT content without saving
 */
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

/**
 * Get default output filename based on exam title
 */
function getDefaultFilename(examTitle) {
  // Sanitize title for filename
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

