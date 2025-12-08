const fs = require("fs");
const path = require("path");
const { generateExamProfile } = require("./examProfile");

function generateBankProfile(bankPath) {
  try {
    const stats = fs.statSync(bankPath);
    let files = [];
    
    if (stats.isDirectory()) {
      const allFiles = fs.readdirSync(bankPath);
      files = allFiles
        .filter(f => f.endsWith(".gift"))
        .map(f => path.join(bankPath, f));
    } else {
      files = [bankPath];
    }
    
    if (files.length === 0) {
      return {
        success: false,
        error: "Aucun fichier GIFT trouvé dans la banque.",
        errorType: "NO_FILES",
      };
    }
    
    let totalQuestions = 0;
    const typeCount = {};
    const fileStats = [];
    
    files.forEach(file => {
      const profile = generateExamProfile(file);
      if (profile.success) {
        totalQuestions += profile.totalQuestions;
        
        Object.entries(profile.typeDistribution).forEach(([type, count]) => {
          typeCount[type] = (typeCount[type] || 0) + count;
        });
        
        fileStats.push({
          file: path.basename(file),
          questions: profile.totalQuestions,
          types: profile.typeDistribution,
        });
      }
    });
    
    if (totalQuestions === 0) {
      return {
        success: false,
        error: "Aucune question valide trouvée dans la banque.",
        errorType: "NO_QUESTIONS",
      };
    }
    
    const typePercentages = {};
    Object.entries(typeCount).forEach(([type, count]) => {
      typePercentages[type] = (count / totalQuestions) * 100;
    });
    
    return {
      success: true,
      totalQuestions,
      typeDistribution: typeCount,
      typePercentages,
      filesAnalyzed: files.length,
      fileStats,
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'analyse de la banque : ${error.message}`,
      errorType: "ANALYSIS_ERROR",
    };
  }
}

function compareProfiles(examPath, bankPath) {
  const examProfile = generateExamProfile(examPath);
  if (!examProfile.success) {
    return {
      success: false,
      error: `Erreur avec l'examen : ${examProfile.error}`,
      errorType: examProfile.errorType,
    };
  }
  
  const bankProfile = generateBankProfile(bankPath);
  if (!bankProfile.success) {
    return {
      success: false,
      error: `Erreur avec la banque : ${bankProfile.error}`,
      errorType: bankProfile.errorType,
    };
  }
  
  if (bankProfile.totalQuestions < 10) {
    return {
      success: false,
      error: "La banque ne contient pas assez de questions pour une comparaison significative (minimum 10).",
      errorType: "INSUFFICIENT_DATA",
    };
  }
  
  const examPercentages = {};
  Object.entries(examProfile.typeDistribution).forEach(([type, count]) => {
    examPercentages[type] = (count / examProfile.totalQuestions) * 100;
  });
  
  const allTypes = new Set([
    ...Object.keys(examPercentages),
    ...Object.keys(bankProfile.typePercentages),
  ]);
  
  const comparisons = [];
  allTypes.forEach(type => {
    const examPct = examPercentages[type] || 0;
    const bankPct = bankProfile.typePercentages[type] || 0;
    const difference = examPct - bankPct;
    
    comparisons.push({
      type,
      examCount: examProfile.typeDistribution[type] || 0,
      examPercent: examPct,
      bankPercent: bankPct,
      difference,
      relativeDifference: bankPct > 0 ? (difference / bankPct) * 100 : null,
    });
  });
  
  comparisons.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  
  return {
    success: true,
    exam: {
      path: examPath,
      totalQuestions: examProfile.totalQuestions,
      typeDistribution: examProfile.typeDistribution,
      typePercentages: examPercentages,
    },
    bank: {
      path: bankPath,
      totalQuestions: bankProfile.totalQuestions,
      filesAnalyzed: bankProfile.filesAnalyzed,
      typeDistribution: bankProfile.typeDistribution,
      typePercentages: bankProfile.typePercentages,
    },
    comparisons,
  };
}

function generateComparisonReport(comparison) {
  let report = "";
  
  report += "═".repeat(70) + "\n";
  report += "RAPPORT DE COMPARAISON DES PROFILS\n";
  report += "═".repeat(70) + "\n\n";
  
  report += "EXAMEN ANALYSE:\n";
  report += `   Fichier: ${path.basename(comparison.exam.path)}\n`;
  report += `   Questions: ${comparison.exam.totalQuestions}\n\n`;
  
  report += "BANQUE DE REFERENCE:\n";
  if (comparison.bank.filesAnalyzed > 1) {
    report += `   Fichiers analysés: ${comparison.bank.filesAnalyzed}\n`;
  } else {
    report += `   Fichier: ${path.basename(comparison.bank.path)}\n`;
  }
  report += `   Questions totales: ${comparison.bank.totalQuestions}\n\n`;
  
  report += "═".repeat(70) + "\n";
  report += "COMPARAISON PAR TYPE DE QUESTION\n";
  report += "═".repeat(70) + "\n\n";
  
  report += "Type                 Examen    Banque    Écart\n";
  report += "─".repeat(70) + "\n";
  
  comparison.comparisons.forEach(comp => {
    const examStr = `${comp.examPercent.toFixed(1)}%`.padStart(8);
    const bankStr = `${comp.bankPercent.toFixed(1)}%`.padStart(8);
    const diffStr = (comp.difference >= 0 ? "+" : "") + comp.difference.toFixed(1) + "%";
    const diffPadded = diffStr.padStart(8);
    
    report += `${comp.type.padEnd(20)} ${examStr}  ${bankStr}  ${diffPadded}\n`;
  });
  
  report += "\n" + "═".repeat(70) + "\n";
  report += "ANALYSE DES ÉCARTS\n";
  report += "═".repeat(70) + "\n\n";
  
  const significantDiffs = comparison.comparisons.filter(
    c => Math.abs(c.difference) > 10
  );
  
  if (significantDiffs.length > 0) {
    significantDiffs.forEach(comp => {
      if (comp.difference > 0) {
        report += `Votre examen contient ${comp.examPercent.toFixed(1)}% de questions de type "${comp.type}",\n`;
        report += `   contre ${comp.bankPercent.toFixed(1)}% en moyenne dans la banque.\n`;
        report += `   Écart: +${comp.difference.toFixed(1)} points de pourcentage.\n\n`;
      } else {
        report += `Votre examen contient ${comp.examPercent.toFixed(1)}% de questions de type "${comp.type}",\n`;
        report += `   contre ${comp.bankPercent.toFixed(1)}% en moyenne dans la banque.\n`;
        report += `   Écart: ${comp.difference.toFixed(1)} points de pourcentage.\n\n`;
      }
    });
  } else {
    report += "Votre examen presente une repartition similaire a la banque.\n";
    report += "   Aucun ecart significatif detecte (> 10%).\n\n";
  }
  
  report += "═".repeat(70) + "\n";
  report += "RECOMMANDATIONS\n";
  report += "═".repeat(70) + "\n\n";
  
  const overrepresented = comparison.comparisons.filter(c => c.difference > 15);
  const underrepresented = comparison.comparisons.filter(c => c.difference < -15);
  
  if (overrepresented.length > 0) {
    report += "Types sur-representes:\n";
    overrepresented.forEach(c => {
      report += `   - ${c.type}: Réduire de ${Math.abs(c.difference).toFixed(1)}%\n`;
    });
    report += "\n";
  }
  
  if (underrepresented.length > 0) {
    report += "Types sous-representes:\n";
    underrepresented.forEach(c => {
      report += `   - ${c.type}: Augmenter de ${Math.abs(c.difference).toFixed(1)}%\n`;
    });
    report += "\n";
  }
  
  if (overrepresented.length === 0 && underrepresented.length === 0) {
    report += "La repartition de votre examen est equilibree.\n\n";
  }
  
  report += "─".repeat(70) + "\n";
  
  return report;
}

function saveComparisonReport(report, outputPath) {
  try {
    const timestamp = new Date().toLocaleString("fr-FR");
    
    let content = "";
    content += "═".repeat(70) + "\n";
    content += "COMPARAISON DE PROFILS D'EXAMENS\n";
    content += "═".repeat(70) + "\n";
    content += `Généré le: ${timestamp}\n`;
    content += "═".repeat(70) + "\n\n";
    content += report;
    
    fs.writeFileSync(outputPath, content, "utf8");
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de la sauvegarde : ${error.message}`,
    };
  }
}

module.exports = {
  generateBankProfile,
  compareProfiles,
  generateComparisonReport,
  saveComparisonReport,
};