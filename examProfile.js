const fs = require("fs");
const path = require("path");
const { parseGiftFile } = require("./giftParser");

function generateExamProfile(giftFilePath) {
  try {
    if (!fs.existsSync(giftFilePath)) {
      return {
        success: false,
        error: `Le fichier ${giftFilePath} est introuvable.`,
        errorType: "FILE_NOT_FOUND",
      };
    }
    
    try {
      fs.accessSync(giftFilePath, fs.constants.R_OK);
    } catch (err) {
      return {
        success: false,
        error: `Impossible de lire le fichier ${giftFilePath}. Vérifiez les permissions.`,
        errorType: "PERMISSION_DENIED",
      };
    }
    
    const stats = fs.statSync(giftFilePath);
    if (stats.size === 0) {
      return {
        success: false,
        error: "Le fichier est vide.",
        errorType: "EMPTY_FILE",
      };
    }
    
    const questions = parseGiftFile(giftFilePath);
    
    if (!questions || questions.length === 0) {
      return {
        success: false,
        error: "Aucune question trouvée dans le fichier. Vérifiez le format GIFT.",
        errorType: "NO_QUESTIONS",
      };
    }
    
    const typeCount = {};
    questions.forEach(q => {
      typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    });
    
    const totalQuestions = questions.length;
    
    return {
      success: true,
      totalQuestions,
      typeDistribution: typeCount,
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la lecture du fichier : ${error.message}`,
      errorType: "PARSE_ERROR",
    };
  }
}

function generateTextHistogram(typeDistribution, totalQuestions) {
  const maxBarLength = 50;
  const maxCount = Math.max(...Object.values(typeDistribution));
  
  let output = "";
  output += "═".repeat(70) + "\n";
  output += "HISTOGRAMME DES TYPES DE QUESTIONS\n";
  output += "═".repeat(70) + "\n\n";
  
  const sorted = Object.entries(typeDistribution)
    .sort((a, b) => b[1] - a[1]);
  
  sorted.forEach(([type, count]) => {
    const percentage = ((count / totalQuestions) * 100).toFixed(1);
    const barLength = Math.round((count / maxCount) * maxBarLength);
    const bar = "█".repeat(barLength);
    
    output += `${type.padEnd(20)} (${String(count).padStart(2)}) │`;
    output += bar.padEnd(maxBarLength + 2);
    output += `│ ${percentage}%\n`;
  });
  
  output += "\n" + "─".repeat(70) + "\n";
  output += `Total: ${totalQuestions} questions\n`;
  output += "─".repeat(70) + "\n";
  
  return output;
}

function generateProfileReport(giftFilePath) {
  const profile = generateExamProfile(giftFilePath);
  
  if (!profile.success) {
    return {
      success: false,
      error: profile.error,
      errorType: profile.errorType,
    };
  }
  
  if (profile.totalQuestions === 0) {
    return {
      success: false,
      error: "Aucune question valide trouvée dans le fichier.",
      errorType: "NO_VALID_QUESTIONS",
    };
  }
  
  if (Object.keys(profile.typeDistribution).length === 0) {
    return {
      success: false,
      error: "Impossible de déterminer les types de questions.",
      errorType: "NO_TYPES",
    };
  }
  
  const histogram = generateTextHistogram(
    profile.typeDistribution,
    profile.totalQuestions
  );
  
  return {
    success: true,
    histogram,
    stats: {
      totalQuestions: profile.totalQuestions,
      typeDistribution: profile.typeDistribution,
      typeCount: Object.keys(profile.typeDistribution).length,
    },
  };
}

function saveProfileToFile(histogram, outputPath) {
  try {
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      return {
        success: false,
        error: `Le dossier ${outputDir} n'existe pas.`,
        errorType: "DIR_NOT_FOUND",
      };
    }
    
    try {
      fs.accessSync(outputDir, fs.constants.W_OK);
    } catch (err) {
      return {
        success: false,
        error: `Impossible d'écrire dans le dossier ${outputDir}. Vérifiez les permissions.`,
        errorType: "PERMISSION_DENIED",
      };
    }
    
    if (fs.existsSync(outputPath)) {
      try {
        fs.accessSync(outputPath, fs.constants.W_OK);
      } catch (err) {
        return {
          success: false,
          error: `Le fichier ${outputPath} existe et n'est pas modifiable. Vérifiez les permissions.`,
          errorType: "FILE_NOT_WRITABLE",
        };
      }
    }
    
    const timestamp = new Date().toLocaleString("fr-FR");
    
    let content = "";
    content += "═".repeat(70) + "\n";
    content += "PROFIL D'EXAMEN - ANALYSE DES TYPES DE QUESTIONS\n";
    content += "═".repeat(70) + "\n";
    content += `Généré le: ${timestamp}\n`;
    content += "═".repeat(70) + "\n\n";
    content += histogram;
    
    fs.writeFileSync(outputPath, content, "utf8");
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la sauvegarde : ${error.message}`,
      errorType: "WRITE_ERROR",
    };
  }
}

module.exports = {
  generateExamProfile,
  generateTextHistogram,
  generateProfileReport,
  saveProfileToFile,
};