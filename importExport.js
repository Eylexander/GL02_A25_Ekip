const fs = require("fs");
const path = require("path");
const { parseGiftFile } = require("./giftParser");

function importGiftFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Le fichier ${filePath} est introuvable.`,
        errorType: "FILE_NOT_FOUND",
      };
    }
    
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
      return {
        success: false,
        error: `Impossible de lire le fichier. Vérifiez les permissions.`,
        errorType: "PERMISSION_DENIED",
      };
    }
    
    if (!filePath.toLowerCase().endsWith(".gift")) {
      return {
        success: false,
        error: "Le fichier doit avoir l'extension .gift",
        errorType: "INVALID_EXTENSION",
      };
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        success: false,
        error: "Le fichier est vide.",
        errorType: "EMPTY_FILE",
      };
    }
    
    const questions = parseGiftFile(filePath);
    
    if (!questions || questions.length === 0) {
      return {
        success: false,
        error: "Le fichier n'est pas au format GIFT valide. Aucune question trouvée.",
        errorType: "INVALID_FORMAT",
      };
    }
    
    const typeCount = {};
    const validQuestions = [];
    const invalidQuestions = [];
    
    questions.forEach((q, idx) => {
      if (q.title && q.type && q.content) {
        validQuestions.push(q);
        typeCount[q.type] = (typeCount[q.type] || 0) + 1;
      } else {
        invalidQuestions.push({
          index: idx + 1,
          title: q.title || "(sans titre)",
          reason: "Structure invalide",
        });
      }
    });
    
    if (validQuestions.length === 0) {
      return {
        success: false,
        error: "Le fichier n'est pas au format GIFT valide. Vérifiez la syntaxe.",
        errorType: "INVALID_SYNTAX",
      };
    }
    
    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
      totalQuestions: questions.length,
      validQuestions: validQuestions.length,
      invalidQuestions: invalidQuestions.length,
      typeDistribution: typeCount,
      invalidDetails: invalidQuestions,
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'import : ${error.message}`,
      errorType: "IMPORT_ERROR",
    };
  }
}

function exportGiftFile(sourceFilePath, destinationPath) {
  try {
    if (!fs.existsSync(sourceFilePath)) {
      return {
        success: false,
        error: `Le fichier source ${sourceFilePath} est introuvable.`,
        errorType: "SOURCE_NOT_FOUND",
      };
    }
    
    const importResult = importGiftFile(sourceFilePath);
    if (!importResult.success) {
      return {
        success: false,
        error: `Le fichier source n'est pas valide : ${importResult.error}`,
        errorType: "INVALID_SOURCE",
      };
    }
    
    let destFile;
    const destStats = fs.existsSync(destinationPath) ? fs.statSync(destinationPath) : null;
    
    if (destStats && destStats.isDirectory()) {
      destFile = path.join(destinationPath, path.basename(sourceFilePath));
    } else if (destinationPath.endsWith("/") || destinationPath.endsWith("\\")) {
      return {
        success: false,
        error: `Le dossier de destination ${destinationPath} n'existe pas.`,
        errorType: "DEST_DIR_NOT_FOUND",
      };
    } else {
      destFile = destinationPath;
      const destDir = path.dirname(destFile);
      
      if (!fs.existsSync(destDir)) {
        return {
          success: false,
          error: `Le dossier de destination ${destDir} n'existe pas.`,
          errorType: "DEST_DIR_NOT_FOUND",
        };
      }
    }
    
    const destDir = path.dirname(destFile);
    try {
      fs.accessSync(destDir, fs.constants.W_OK);
    } catch (err) {
      return {
        success: false,
        error: `Impossible d'écrire dans le dossier spécifié. Vérifiez les permissions.`,
        errorType: "PERMISSION_DENIED",
      };
    }
    
    if (fs.existsSync(destFile)) {
      return {
        success: false,
        error: `Le fichier ${destFile} existe déjà. Supprimez-le d'abord ou choisissez un autre nom.`,
        errorType: "FILE_EXISTS",
      };
    }
    
    const content = fs.readFileSync(sourceFilePath, "utf8");
    fs.writeFileSync(destFile, content, "utf8");
    
    return {
      success: true,
      sourceFile: sourceFilePath,
      destinationFile: destFile,
      questionsExported: importResult.validQuestions,
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'export : ${error.message}`,
      errorType: "EXPORT_ERROR",
    };
  }
}

function importToBank(filePath, bankDir = "./data") {
  try {
    const importResult = importGiftFile(filePath);
    if (!importResult.success) {
      return importResult;
    }
    
    if (!fs.existsSync(bankDir)) {
      return {
        success: false,
        error: `Le dossier de la banque ${bankDir} n'existe pas.`,
        errorType: "BANK_DIR_NOT_FOUND",
      };
    }
    
    try {
      fs.accessSync(bankDir, fs.constants.W_OK);
    } catch (err) {
      return {
        success: false,
        error: `Impossible d'écrire dans la banque. Vérifiez les permissions.`,
        errorType: "PERMISSION_DENIED",
      };
    }
    
    const fileName = path.basename(filePath);
    const destFile = path.join(bankDir, fileName);
    
    if (fs.existsSync(destFile)) {
      return {
        success: false,
        error: `Le fichier ${fileName} existe déjà dans la banque.`,
        errorType: "FILE_EXISTS_IN_BANK",
      };
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    fs.writeFileSync(destFile, content, "utf8");
    
    return {
      success: true,
      filePath,
      fileName,
      destinationPath: destFile,
      questionsImported: importResult.validQuestions,
      typeDistribution: importResult.typeDistribution,
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'import dans la banque : ${error.message}`,
      errorType: "IMPORT_TO_BANK_ERROR",
    };
  }
}

module.exports = {
  importGiftFile,
  exportGiftFile,
  importToBank,
};