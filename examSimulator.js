const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { parseGiftFile } = require("./giftParser");

function parseQuestionGaps(question) {
  const gaps = [];
  
  const gapRegex = /\{([\s\S]*?)\}/g;
  let match;
  let gapIndex = 0;
  
  while ((match = gapRegex.exec(question.content)) !== null) {
    gapIndex++;
    const blockContent = match[1];
    
    if (!blockContent.trim()) continue;
    
    const gapAnswers = [];
    
    const hasType = blockContent.match(/^\d+:(MC|SA):/i);
    const cleanBlock = hasType ? blockContent.replace(/^\d+:(MC|SA):/i, "") : blockContent;
    
    const lines = cleanBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    const isMultiline = lines.length > 1 && lines.some(l => l.startsWith("~") || l.startsWith("="));
    
    if (cleanBlock.includes("~") && !isMultiline) {
      const parts = cleanBlock.split("~");
      parts.forEach(part => {
        part = part.trim();
        if (part) {
          const isCorrect = part.startsWith("=");
          let text = part.replace(/^=/, "").trim();
          const feedbackIndex = text.indexOf("#");
          if (feedbackIndex !== -1) {
            text = text.substring(0, feedbackIndex).trim();
          }
          if (text) {
            gapAnswers.push({ text, correct: isCorrect });
          }
        }
      });
    } else if (isMultiline) {
      for (const line of lines) {
        if (!line.startsWith("~") && !line.startsWith("=")) continue;
        
        const isCorrect = line.startsWith("=");
        let text = line.replace(/^[~=]/, "").trim();
        const feedbackIndex = text.indexOf("#");
        if (feedbackIndex !== -1) {
          text = text.substring(0, feedbackIndex).trim();
        }
        if (text) {
          gapAnswers.push({ text, correct: isCorrect });
        }
      }
    } else if (cleanBlock.includes("=")) {
      const answerPattern = /=([^=]+?)(?=\s+=|#|$)/g;
      const matches = [...cleanBlock.matchAll(answerPattern)];
      
      if (matches.length > 0) {
        matches.forEach(match => {
          let text = match[1].trim();
          
          // Extract text before feedback marker
          const feedbackIndex = text.indexOf("#");
          if (feedbackIndex !== -1) {
            text = text.substring(0, feedbackIndex).trim();
          }
          
          if (text) {
            gapAnswers.push({ text, correct: true });
          }
        });
      } else {
        let text = cleanBlock.replace(/^=/, "").trim();
        const feedbackIndex = text.indexOf("#");
        if (feedbackIndex !== -1) {
          text = text.substring(0, feedbackIndex).trim();
        }
        if (text) {
          gapAnswers.push({ text, correct: true });
        }
      }
    }
    
    if (gapAnswers.length > 0) {
      gaps.push({
        index: gapIndex,
        answers: gapAnswers,
        type: question.type
      });
    }
  }
  
  return gaps;
}

function displayQuestion(question, questionNumber, totalQuestions) {
  console.log("\n" + "=".repeat(70));
  console.log(`Question ${questionNumber}/${totalQuestions}`);
  console.log("=".repeat(70));
  
  let displayText = question.questionText
    .replace(/\[html\]/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>(.*?)<\/b>/gi, "$1")
    .replace(/<i>(.*?)<\/i>/gi, "$1")
    .replace(/\/\/.*$/gm, "");
  
  console.log(displayText);
  console.log();
}

async function askForAnswer(rl, question, gapInfo = null) {
  return new Promise((resolve) => {
    if (question.type === "MultipleChoice") {
      if (gapInfo) {
        console.log(`\nGap ${gapInfo.index} - Choisissez une option:`);
        gapInfo.answers.forEach((answer, idx) => {
          console.log(`  ${idx + 1}. ${answer.text}`);
        });
        
        rl.question("\nVotre réponse (numéro): ", (answer) => {
          const choice = parseInt(answer) - 1;
          if (choice >= 0 && choice < gapInfo.answers.length) {
            resolve({ type: "choice", value: choice, text: gapInfo.answers[choice].text });
          } else {
            console.log("Choix invalide. Veuillez reessayer.");
            resolve(askForAnswer(rl, question, gapInfo));
          }
        });
      } else {
        console.log("Choisissez une option:");
        question.answers.forEach((answer, idx) => {
          console.log(`  ${idx + 1}. ${answer.text}`);
        });
        
        rl.question("\nVotre réponse (numéro): ", (answer) => {
          const choice = parseInt(answer) - 1;
          if (choice >= 0 && choice < question.answers.length) {
            resolve({ type: "choice", value: choice, text: question.answers[choice].text });
          } else {
            console.log("Choix invalide. Veuillez reessayer.");
            resolve(askForAnswer(rl, question));
          }
        });
      }
    } else if (question.type === "ShortAnswer") {
      if (gapInfo) {
        rl.question(`\nGap ${gapInfo.index} - Votre réponse: `, (answer) => {
          resolve({ type: "text", value: answer.trim(), gapIndex: gapInfo.index });
        });
      } else {
        rl.question("\nVotre réponse: ", (answer) => {
          resolve({ type: "text", value: answer.trim() });
        });
      }
    } else {
      resolve({ type: "unknown", value: "" });
    }
  });
}

function checkAnswer(question, userAnswer, gaps = null) {
  if (question.type === "MultipleChoice") {
    if (gaps && userAnswer.gapIndex !== undefined) {
      const gap = gaps[userAnswer.gapIndex - 1];
      if (gap && gap.answers[userAnswer.value]) {
        return gap.answers[userAnswer.value].correct;
      }
      return false;
    } else {
      return question.answers[userAnswer.value]?.correct || false;
    }
  } else if (question.type === "ShortAnswer") {
    const userText = userAnswer.value.toLowerCase().trim();
    return question.answers.some(
      (answer) => answer.correct && answer.text.toLowerCase().trim() === userText
    );
  }
  
  return false;
}

async function simulateExam(giftFilePath) {
  if (!fs.existsSync(giftFilePath)) {
    throw new Error(`Le fichier ${giftFilePath} est introuvable. Vérifiez le chemin.`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("SIMULATION D'EXAMEN");
  console.log("=".repeat(70));
  console.log(`\nChargement de l'examen depuis: ${path.basename(giftFilePath)}`);
  
  const questions = parseGiftFile(giftFilePath);
  
  if (questions.length === 0) {
    throw new Error("Aucune question trouvée dans le fichier GIFT.");
  }
  
  console.log(`${questions.length} questions chargees avec succes.\n`);
  console.log("Instructions:");
  console.log("- Pour les questions à choix multiple, entrez le numéro de votre choix");
  console.log("- Pour les questions ouvertes, tapez votre réponse");
  console.log("- Les réponses sont sensibles à la casse pour les questions ouvertes");
  console.log("\nAppuyez sur Entrée pour commencer...");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  await new Promise((resolve) => {
    rl.question("", resolve);
  });
  
  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    displayQuestion(question, i + 1, questions.length);
    
    const gaps = parseQuestionGaps(question);
    
    if (gaps.length > 1) {
      console.log(`\nCette question contient ${gaps.length} trous a remplir.`);
      
      const gapResults = [];
      for (const gap of gaps) {
        const userAnswer = await askForAnswer(rl, question, gap);
        userAnswer.gapIndex = gap.index;
        const isCorrect = checkAnswer(question, userAnswer, gaps);
        
        gapResults.push({
          gapIndex: gap.index,
          userAnswer: userAnswer.text || userAnswer.value,
          correct: isCorrect,
          correctAnswers: gap.answers.filter(a => a.correct).map(a => a.text),
        });
      }
      
      const correctGaps = gapResults.filter(r => r.correct).length;
      const score = correctGaps / gaps.length;
      
      results.push({
        questionNumber: i + 1,
        title: question.title,
        type: question.type,
        gaps: gapResults,
        score: score,
        hasMultipleGaps: true,
      });
      
      console.log(`\nQuestion completee (${correctGaps}/${gaps.length} trous corrects)`);
    } else {
      const userAnswer = await askForAnswer(rl, question);
      const isCorrect = checkAnswer(question, userAnswer);
      
      const correctAnswers = question.answers
        .filter((a) => a.correct)
        .map((a) => a.text);
      
      results.push({
        questionNumber: i + 1,
        title: question.title,
        type: question.type,
        userAnswer: userAnswer.text || userAnswer.value,
        correct: isCorrect,
        correctAnswers: correctAnswers,
        hasMultipleGaps: false,
      });
      
      console.log(`\nQuestion completee`);
    }
  }
  
  rl.close();
  
  return calculateResults(results);
}

function calculateResults(results) {
  console.log("\n" + "=".repeat(70));
  console.log("RESULTATS DE L'EXAMEN");
  console.log("=".repeat(70));
  
  let totalScore = 0;
  let maxScore = results.length;
  
  results.forEach((result) => {
    console.log(`\nQuestion ${result.questionNumber}: ${result.title}`);
    console.log(`Type: ${result.type}`);
    
    if (result.hasMultipleGaps) {
      const correctGaps = result.gaps.filter(g => g.correct).length;
      console.log(`Score: ${(result.score * 100).toFixed(0)}% (${correctGaps}/${result.gaps.length} trous corrects)`);
      
      result.gaps.forEach((gap) => {
        const icon = gap.correct ? "[OK]" : "[ERREUR]";
        console.log(`  ${icon} Trou ${gap.gapIndex}: ${gap.userAnswer}`);
        if (!gap.correct) {
          console.log(`     Réponse(s) correcte(s): ${gap.correctAnswers.join(" OU ")}`);
        }
      });
      
      totalScore += result.score;
    } else {
      const icon = result.correct ? "[OK]" : "[ERREUR]";
      console.log(`${icon} Votre réponse: ${result.userAnswer}`);
      
      if (!result.correct) {
        console.log(`   Réponse(s) correcte(s): ${result.correctAnswers.join(" OU ")}`);
      }
      
      totalScore += result.correct ? 1 : 0;
    }
  });
  
  const percentage = (totalScore / maxScore) * 100;
  const note = (totalScore / maxScore) * 20;
  
  console.log("\n" + "=".repeat(70));
  console.log("BILAN FINAL");
  console.log("=".repeat(70));
  console.log(`Score: ${totalScore.toFixed(2)}/${maxScore}`);
  console.log(`Pourcentage: ${percentage.toFixed(2)}%`);
  console.log(`Note: ${note.toFixed(2)}/20`);
  
  if (percentage >= 90) {
    console.log("\nExcellent travail !");
  } else if (percentage >= 75) {
    console.log("\nTres bien !");
  } else if (percentage >= 50) {
    console.log("\nBien, mais il y a de la place pour amelioration.");
  } else {
    console.log("\nContinuez a pratiquer !");
  }
  
  return {
    results,
    totalScore,
    maxScore,
    percentage,
    note,
  };
}

function saveResults(examResults, outputPath) {
  const timestamp = new Date().toLocaleString("fr-FR");
  
  let content = "=".repeat(70) + "\n";
  content += "RÉSULTATS DE L'EXAMEN\n";
  content += "=".repeat(70) + "\n";
  content += `Date: ${timestamp}\n`;
  content += `Score: ${examResults.totalScore.toFixed(2)}/${examResults.maxScore}\n`;
  content += `Pourcentage: ${examResults.percentage.toFixed(2)}%\n`;
  content += `Note: ${examResults.note.toFixed(2)}/20\n`;
  content += "\n" + "=".repeat(70) + "\n";
  content += "DÉTAIL DES RÉPONSES\n";
  content += "=".repeat(70) + "\n\n";
  
  examResults.results.forEach((result) => {
    content += `Question ${result.questionNumber}: ${result.title}\n`;
    content += `Type: ${result.type}\n`;
    
    if (result.hasMultipleGaps) {
      const correctGaps = result.gaps.filter(g => g.correct).length;
      content += `Score: ${(result.score * 100).toFixed(0)}% (${correctGaps}/${result.gaps.length} trous corrects)\n`;
      
      result.gaps.forEach((gap) => {
        const icon = gap.correct ? "[CORRECT]" : "[INCORRECT]";
        content += `  ${icon} Trou ${gap.gapIndex}: ${gap.userAnswer}\n`;
        if (!gap.correct) {
          content += `     Réponse(s) correcte(s): ${gap.correctAnswers.join(" OU ")}\n`;
        }
      });
    } else {
      const icon = result.correct ? "[CORRECT]" : "[INCORRECT]";
      content += `${icon} Votre réponse: ${result.userAnswer}\n`;
      
      if (!result.correct) {
        content += `Réponse(s) correcte(s): ${result.correctAnswers.join(" OU ")}\n`;
      }
    }
    
    content += "\n";
  });
  
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`\nBilan sauvegarde dans: ${outputPath}`);
}

module.exports = {
  simulateExam,
  saveResults,
};