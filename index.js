const cli = require("@caporal/core").default;
const chalk = require("chalk");
const {
  searchQuestions,
  getQuestionStats,
  getAvailableTypes,
} = require("./giftParser");
const {
  initExam,
  addQuestion,
  removeQuestion,
  getCurrentExam,
  clearExam,
  validateExam,
  getExamStats,
  moveQuestion,
} = require("./examManager");
const {
  generateGiftFile,
  previewGiftFile,
  getDefaultFilename,
} = require("./giftGenerator");
const {
  generateVCardFile,
  getDefaultVCardFilename,
  validateEmail,
  previewVCard,
} = require("./vcardGenerator");
const {
  simulateExam,
  saveResults,
} = require("./examSimulator");
const {
  verifyGiftExam,
} = require("./qualityChecker");
const {
  generateProfileReport,
  saveProfileToFile,
} = require("./examProfile");
const {
  compareProfiles,
  generateComparisonReport,
  saveComparisonReport,
} = require("./profileComparator");
const {
  importGiftFile,
  exportGiftFile,
  importToBank,
} = require("./importExport");
const fs = require("fs");
const path = require("path");

cli
  .version("gift-cli")
  .version("0.01")
  
  .command("search", "Search and visualize questions from GIFT files")
  .argument("[type]", "Filter by question type (e.g., MultipleChoice, ShortAnswer)")
  .argument("[keyword]", "Filter by keyword in question content")
  .option("-d, --dataDir <dir>", "Directory containing GIFT files", {
    default: "./data",
  })
  .option("-v, --verbose", "Show detailed information including answers", {
    default: false,
  })
  .option("-l, --limit <number>", "Limit number of results displayed", {
    validator: cli.NUMBER,
  })
  .action(({ args, options, logger }) => {
    const { type, keyword } = args;
    const { dataDir, verbose, limit } = options;

    if (!fs.existsSync(dataDir)) {
      logger.error(chalk.red(`Directory "${dataDir}" does not exist.`));
      process.exit(1);
    }

    const results = searchQuestions(dataDir, type, keyword);

    if (results.length === 0) {
      logger.info(chalk.yellow("No questions found matching your criteria."));
      logger.info(chalk.gray("\nTip: Use 'gift-cli types' to see available question types."));
    } else {
      const displayCount = limit ? Math.min(limit, results.length) : results.length;
      logger.info(chalk.green(`Found ${results.length} question(s)`));
      
      if (limit && results.length > limit) {
        logger.info(chalk.gray(`Showing first ${displayCount} results\n`));
      } else {
        logger.info("");
      }

      results.slice(0, displayCount).forEach((q, i) => {
        logger.info(chalk.blue.bold(`━━━ Question ${i + 1} ━━━`));
        logger.info(chalk.cyan(`File:  `) + chalk.white(q.file));
        logger.info(chalk.cyan(`Title: `) + chalk.white(q.title));
        logger.info(chalk.cyan(`Type:  `) + chalk.yellow(q.type));
        logger.info(chalk.cyan(`Text:  `) + chalk.white(q.questionText));
        
        if (verbose && q.answers && q.answers.length > 0) {
          logger.info(chalk.cyan(`Answers:`));
          q.answers.forEach((ans, idx) => {
            const marker = ans.correct ? chalk.green("✓") : chalk.red("✗");
            logger.info(`  ${marker} ${ans.text}`);
          });
        }
        
        logger.info(""); // Empty line between questions
      });
      
      // Summary statistics
      const typeCount = {};
      results.forEach((q) => {
        typeCount[q.type] = (typeCount[q.type] || 0) + 1;
      });
      
      logger.info(chalk.blue.bold("━━━ Search Summary ━━━"));
      logger.info(chalk.cyan("Question types in results:"));
      Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          logger.info(`  ${chalk.yellow(type)}: ${count} question(s)`);
        });
    }
  })
  
  .command("stats", "Display statistics about the question bank")
  .option("-d, --dataDir <dir>", "Directory containing GIFT files", {
    default: "./data",
  })
  .action(({ options, logger }) => {
    const { dataDir } = options;

    if (!fs.existsSync(dataDir)) {
      logger.error(chalk.red(`Directory "${dataDir}" does not exist.`));
      process.exit(1);
    }

    const stats = getQuestionStats(dataDir);
    
    logger.info(chalk.green.bold("\n📊 Question Bank Statistics\n"));
    logger.info(chalk.cyan("Total files:     ") + chalk.white(stats.totalFiles));
    logger.info(chalk.cyan("Total questions: ") + chalk.white(stats.totalQuestions));
    logger.info(chalk.cyan("Avg per file:    ") + chalk.white(Math.round(stats.totalQuestions / stats.totalFiles)));
    
    logger.info(chalk.blue.bold("\n━━━ Questions by Type ━━━"));
    Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / stats.totalQuestions) * 100).toFixed(1);
        const bar = "█".repeat(Math.floor(percentage / 2));
        logger.info(
          `${chalk.yellow(type.padEnd(20))} ${chalk.white(count.toString().padStart(4))} ${chalk.gray(`(${percentage}%)`)} ${chalk.green(bar)}`
        );
      });
    
    logger.info(chalk.blue.bold("\n━━━ Top 10 Files by Question Count ━━━"));
    Object.entries(stats.byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([file, count]) => {
        logger.info(`${chalk.white(count.toString().padStart(4))} ${chalk.gray("questions")} ${chalk.cyan(file)}`);
      });
    
    logger.info("");
  })
  
  .command("types", "List all available question types in the question bank")
  .option("-d, --dataDir <dir>", "Directory containing GIFT files", {
    default: "./data",
  })
  .action(({ options, logger }) => {
    const { dataDir } = options;

    if (!fs.existsSync(dataDir)) {
      logger.error(chalk.red(`Directory "${dataDir}" does not exist.`));
      process.exit(1);
    }

    const types = getAvailableTypes(dataDir);
    
    logger.info(chalk.green.bold("\n📋 Available Question Types\n"));
    types.forEach((type) => {
      logger.info(`  ${chalk.yellow("•")} ${chalk.cyan(type)}`);
    });
    logger.info(chalk.gray("\nUse these type names with the 'search' command."));
    logger.info(chalk.gray("Example: gift-cli search MultipleChoice"));
    logger.info("");
  })
  
  .command("exam-init", "Initialize a new exam composition (EF02)")
  .argument("[title]", "Title of the exam", { default: "Nouvel examen" })
  .action(({ args, logger }) => {
    const { title } = args;
    
    try {
      const exam = initExam(title);
      logger.info(chalk.green.bold("\n✓ Nouvel examen initialisé\n"));
      logger.info(chalk.cyan("Titre: ") + chalk.white(exam.title));
      logger.info(chalk.cyan("Date de création: ") + chalk.gray(new Date(exam.createdAt).toLocaleString('fr-FR')));
      logger.info(chalk.cyan("Questions: ") + chalk.yellow("0"));
      logger.info(chalk.cyan("Contraintes: ") + chalk.gray(`${exam.metadata.minQuestions}-${exam.metadata.maxQuestions} questions requises`));
      logger.info(chalk.gray("\nUtilisez 'exam-add' pour ajouter des questions à l'examen."));
      logger.info("");
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-add", "Add a question to the current exam (EF02)")
  .argument("<file>", "File name containing the question")
  .argument("<title>", "Title of the question (use quotes if it contains spaces)")
  .option("-d, --dataDir <dir>", "Directory containing GIFT files", {
    default: "./data",
  })
  .action(({ args, options, logger }) => {
    const { file, title } = args;
    const { dataDir } = options;
    
    try {
      const exam = addQuestion(dataDir, file, title);
      const questionCount = exam.questions.length;
      
      logger.info(chalk.green.bold("\n✓ Question ajoutée avec succès\n"));
      logger.info(chalk.cyan("Position: ") + chalk.yellow(`#${questionCount}`));
      logger.info(chalk.cyan("Fichier: ") + chalk.white(file));
      logger.info(chalk.cyan("Titre: ") + chalk.white(title));
      logger.info(chalk.cyan("Total: ") + chalk.yellow(`${questionCount}/${exam.metadata.maxQuestions} questions`));
      
      if (questionCount < exam.metadata.minQuestions) {
        const remaining = exam.metadata.minQuestions - questionCount;
        logger.info(chalk.yellow(`\n⚠ Il vous faut encore ${remaining} question(s) minimum pour valider l'examen.`));
      } else if (questionCount >= exam.metadata.minQuestions && questionCount <= exam.metadata.maxQuestions) {
        logger.info(chalk.green(`\n✓ L'examen contient un nombre valide de questions (${questionCount}).`));
      }
      
      logger.info(chalk.gray("\nUtilisez 'exam-list' pour voir toutes les questions de l'examen."));
      logger.info("");
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-remove", "Remove a question from the current exam (EF02)")
  .argument("<index>", "Position of the question to remove (1-based)", {
    validator: cli.NUMBER,
  })
  .action(({ args, logger }) => {
    const { index } = args;
    
    try {
      const { exam, removed } = removeQuestion(index);
      
      logger.info(chalk.green.bold("\n✓ Question retirée avec succès\n"));
      logger.info(chalk.cyan("Titre: ") + chalk.white(removed.title));
      logger.info(chalk.cyan("Fichier: ") + chalk.white(removed.file));
      logger.info(chalk.cyan("Total: ") + chalk.yellow(`${exam.questions.length}/${exam.metadata.maxQuestions} questions`));
      
      if (exam.questions.length < exam.metadata.minQuestions) {
        const remaining = exam.metadata.minQuestions - exam.questions.length;
        logger.info(chalk.yellow(`\n⚠ Il vous faut encore ${remaining} question(s) minimum pour valider l'examen.`));
      }
      
      logger.info("");
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-list", "Display the current exam composition (EF02)")
  .option("-v, --verbose", "Show detailed question information", {
    default: false,
  })
  .action(({ options, logger }) => {
    const { verbose } = options;
    
    try {
      const exam = getCurrentExam();
      
      if (!exam || exam.questions.length === 0) {
        logger.info(chalk.yellow("\n⚠ Aucun examen en cours ou l'examen est vide.\n"));
        logger.info(chalk.gray("Utilisez 'exam-init' pour créer un nouvel examen."));
        logger.info(chalk.gray("Utilisez 'exam-add' pour ajouter des questions.\n"));
        return;
      }
      
      logger.info(chalk.green.bold("\n📝 Composition de l'examen\n"));
      logger.info(chalk.cyan("Titre: ") + chalk.white(exam.title));
      logger.info(chalk.cyan("Questions: ") + chalk.yellow(`${exam.questions.length}/${exam.metadata.maxQuestions}`));
      logger.info(chalk.cyan("Dernière modification: ") + chalk.gray(new Date(exam.modifiedAt).toLocaleString('fr-FR')));
      
      // Validation status
      const isValid = exam.questions.length >= exam.metadata.minQuestions && 
                      exam.questions.length <= exam.metadata.maxQuestions;
      
      if (isValid) {
        logger.info(chalk.cyan("Statut: ") + chalk.green("✓ Valide"));
      } else if (exam.questions.length < exam.metadata.minQuestions) {
        logger.info(chalk.cyan("Statut: ") + chalk.yellow(`⚠ ${exam.metadata.minQuestions - exam.questions.length} question(s) manquante(s)`));
      } else {
        logger.info(chalk.cyan("Statut: ") + chalk.red(`✗ Trop de questions (max: ${exam.metadata.maxQuestions})`));
      }
      
      logger.info(chalk.blue.bold("\n━━━ Questions ━━━\n"));
      
      exam.questions.forEach((q, i) => {
        logger.info(chalk.yellow(`${(i + 1).toString().padStart(2)}. `) + chalk.white(q.title));
        logger.info(chalk.gray(`    Fichier: ${q.file}`));
        logger.info(chalk.gray(`    Type: ${q.type}`));
        
        if (verbose) {
          logger.info(chalk.gray(`    Texte: ${q.questionText.substring(0, 100)}${q.questionText.length > 100 ? '...' : ''}`));
          if (q.answers && q.answers.length > 0) {
            logger.info(chalk.gray(`    Réponses: ${q.answers.length} réponse(s)`));
          }
        }
        logger.info("");
      });
      
      // Statistics
      const stats = getExamStats();
      logger.info(chalk.blue.bold("━━━ Statistiques ━━━\n"));
      logger.info(chalk.cyan("Répartition par type:"));
      Object.entries(stats.typeDistribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const percentage = ((count / stats.questionCount) * 100).toFixed(1);
          logger.info(`  ${chalk.yellow(type.padEnd(20))} ${count.toString().padStart(2)} ${chalk.gray(`(${percentage}%)`)}`);
        });
      
      logger.info(chalk.cyan("\nFichiers sources: ") + chalk.white(stats.fileCount));
      
      logger.info("");
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-validate", "Validate the current exam composition (EF02)")
  .action(({ logger }) => {
    try {
      const validation = validateExam();
      
      logger.info(chalk.green.bold("\n🔍 Validation de l'examen\n"));
      
      if (validation.valid) {
        logger.info(chalk.green.bold("✓ L'examen est valide!\n"));
        logger.info(chalk.cyan("Nombre de questions: ") + chalk.white(validation.stats.questionCount));
        logger.info(chalk.cyan("Types de questions: ") + chalk.white(Object.keys(validation.stats.typeDistribution).length));
      } else {
        logger.info(chalk.red.bold("✗ L'examen n'est pas valide\n"));
      }
      
      // Display errors
      if (validation.errors.length > 0) {
        logger.info(chalk.red.bold("Erreurs:"));
        validation.errors.forEach((err, i) => {
          logger.info(chalk.red(`  ${i + 1}. ${err}`));
        });
        logger.info("");
      }
      
      if (validation.warnings.length > 0) {
        logger.info(chalk.yellow.bold("Avertissements:"));
        validation.warnings.forEach((warn, i) => {
          logger.info(chalk.yellow(`  ${i + 1}. ${warn}`));
        });
        logger.info("");
      }
      
      logger.info(chalk.blue.bold("Statistiques:"));
      logger.info(chalk.cyan("  Questions: ") + chalk.white(validation.stats.questionCount));
      logger.info(chalk.cyan("  Répartition par type:"));
      Object.entries(validation.stats.typeDistribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          logger.info(`    ${chalk.yellow(type)}: ${count}`);
        });
      
      logger.info("");
      
      if (!validation.valid) {
        process.exit(1);
      }
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-clear", "Clear the current exam and start over (EF02)")
  .action(({ logger }) => {
    try {
      clearExam();
      logger.info(chalk.green("\n✓ L'examen a été effacé.\n"));
      logger.info(chalk.gray("Utilisez 'exam-init' pour créer un nouvel examen.\n"));
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-move", "Move a question to a different position (EF02)")
  .argument("<from>", "Current position of the question (1-based)", {
    validator: cli.NUMBER,
  })
  .argument("<to>", "New position for the question (1-based)", {
    validator: cli.NUMBER,
  })
  .action(({ args, logger }) => {
    const { from, to } = args;
    
    try {
      const exam = moveQuestion(from, to);
      logger.info(chalk.green(`\n✓ Question déplacée de la position ${from} vers la position ${to}\n`));
      logger.info(chalk.gray("Utilisez 'exam-list' pour voir l'ordre actuel des questions.\n"));
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-generate", "Generate a GIFT file from the current exam (EF03)")
  .argument("[filename]", "Output filename (default: auto-generated from exam title)")
  .option("-o, --output <dir>", "Output directory", {
    default: "./output",
  })
  .option("-f, --force", "Overwrite existing file without confirmation", {
    default: false,
  })
  .action(({ args, options, logger }) => {
    const { filename } = args;
    const { output, force } = options;
    
    try {
      const exam = getCurrentExam();
      
      if (!exam || exam.questions.length === 0) {
        logger.error(chalk.red("\n✗ Aucun examen en cours ou l'examen est vide.\n"));
        logger.info(chalk.gray("Utilisez 'exam-init' et 'exam-add' pour créer un examen.\n"));
        process.exit(1);
      }
      
      const validation = validateExam();
      if (!validation.valid) {
        logger.error(chalk.red("\n✗ L'examen n'est pas valide. Impossible de générer le fichier GIFT.\n"));
        logger.error(chalk.red("Erreurs:"));
        validation.errors.forEach((err, i) => {
          logger.error(chalk.red(`  ${i + 1}. ${err}`));
        });
        logger.info(chalk.gray("\nCorrigez les erreurs et réessayez.\n"));
        process.exit(1);
      }
      
      const outputFilename = filename || getDefaultFilename(exam.title);
      const outputPath = path.join(output, outputFilename);
      
      if (fs.existsSync(outputPath) && !force) {
        logger.error(chalk.yellow(`\n⚠ Le fichier "${outputPath}" existe déjà.\n`));
        logger.info(chalk.gray("Utilisez l'option --force pour écraser le fichier existant.\n"));
        process.exit(1);
      }
      
      logger.info(chalk.blue("\n⏳ Génération du fichier GIFT...\n"));
      
      const result = generateGiftFile(exam, outputPath);
      
      logger.info(chalk.green.bold("✓ Fichier GIFT généré avec succès!\n"));
      logger.info(chalk.cyan("Fichier: ") + chalk.white(outputPath));
      logger.info(chalk.cyan("Taille: ") + chalk.white(`${(result.size / 1024).toFixed(2)} KB`));
      logger.info(chalk.cyan("Questions: ") + chalk.white(result.questionCount));
      
      if (result.validation.warnings.length > 0) {
        logger.info(chalk.yellow("\n⚠ Avertissements:"));
        result.validation.warnings.forEach((warn, i) => {
          logger.info(chalk.yellow(`  ${i + 1}. ${warn}`));
        });
      }
      
      logger.info(chalk.gray("\n💡 Le fichier est prêt à être importé sur Moodle."));
      logger.info(chalk.gray(`   Chemin: ${outputPath}\n`));
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exam-preview", "Preview the GIFT file content without saving (EF03)")
  .option("-l, --lines <number>", "Number of lines to display", {
    validator: cli.NUMBER,
    default: 30,
  })
  .action(({ options, logger }) => {
    const { lines } = options;
    
    try {
      const exam = getCurrentExam();
      
      if (!exam || exam.questions.length === 0) {
        logger.error(chalk.red("\n✗ Aucun examen en cours ou l'examen est vide.\n"));
        process.exit(1);
      }
      
      logger.info(chalk.blue.bold("\n📄 Aperçu du fichier GIFT\n"));
      
      const preview = previewGiftFile(exam, lines);
      
      logger.info(chalk.gray("─".repeat(70)));
      console.log(preview.content);
      logger.info(chalk.gray("─".repeat(70)));
      
      if (preview.truncated) {
        logger.info(chalk.yellow(`\n⚠ Aperçu tronqué: ${preview.showingLines}/${preview.totalLines} lignes affichées`));
        logger.info(chalk.gray("Utilisez -l pour afficher plus de lignes ou 'exam-generate' pour créer le fichier complet.\n"));
      } else {
        logger.info(chalk.green(`\n✓ Aperçu complet: ${preview.totalLines} lignes\n`));
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("vcard-generate", "Generate a VCard file for a teacher (EF04)")
  .option("--firstName <name>", "Teacher's first name (required)")
  .option("--lastName <name>", "Teacher's last name (required)")
  .option("--email <email>", "Teacher's email address")
  .option("--phone <phone>", "Teacher's work phone number")
  .option("--mobile <mobile>", "Teacher's mobile phone number")
  .option("--organization <org>", "Organization name", {
    default: "SRYEM - Ministère de l'Éducation nationale de Sealand"
  })
  .option("--department <dept>", "Department name")
  .option("--title <title>", "Job title", {
    default: "Enseignant"
  })
  .option("--role <role>", "Professional role")
  .option("--city <city>", "City")
  .option("--country <country>", "Country", {
    default: "Sealand"
  })
  .option("--note <note>", "Additional notes")
  .option("-o, --output <dir>", "Output directory", {
    default: "./output"
  })
  .option("-f, --force", "Overwrite existing file without confirmation", {
    default: false
  })
  .action(({ options, logger }) => {
    try {
      const teacherData = {
        firstName: options.firstName,
        lastName: options.lastName,
        email: options.email,
        phone: options.phone,
        mobile: options.mobile,
        organization: options.organization,
        department: options.department,
        title: options.title,
        role: options.role,
        note: options.note,
        address: {}
      };
      
      if (options.city || options.country) {
        teacherData.address = {
          city: options.city,
          country: options.country
        };
      }
      
      if (!teacherData.firstName || !teacherData.lastName) {
        logger.error(chalk.red("\n✗ Erreur: Les champs --firstName et --lastName sont obligatoires.\n"));
        logger.info(chalk.gray("Exemple: vcard-generate --firstName Jean --lastName Dupont --email jean.dupont@sryem.se\n"));
        process.exit(1);
      }
      
      if (teacherData.email && !validateEmail(teacherData.email)) {
        logger.error(chalk.red("\n✗ Erreur: L'email fourni n'est pas valide.\n"));
        logger.info(chalk.gray("Format attendu: nom@domaine.se\n"));
        process.exit(1);
      }
      
      const filename = getDefaultVCardFilename(teacherData.firstName, teacherData.lastName);
      const outputPath = path.join(options.output, filename);
      
      if (fs.existsSync(outputPath) && !options.force) {
        logger.error(chalk.yellow(`\n⚠ Le fichier "${outputPath}" existe déjà.\n`));
        logger.info(chalk.gray("Utilisez l'option --force pour écraser le fichier existant.\n"));
        process.exit(1);
      }
      
      logger.info(chalk.blue("\n⏳ Génération de la VCard...\n"));
      
      const result = generateVCardFile(teacherData, outputPath);
      
      logger.info(chalk.green.bold("✓ Fichier VCard généré avec succès!\n"));
      logger.info(chalk.cyan("Enseignant: ") + chalk.white(result.teacher));
      logger.info(chalk.cyan("Fichier: ") + chalk.white(outputPath));
      logger.info(chalk.cyan("Taille: ") + chalk.white(`${result.size} octets`));
      
      logger.info(chalk.gray("\n💡 Le fichier peut être importé dans un carnet d'adresses."));
      logger.info(chalk.gray(`   Chemin: ${outputPath}\n`));
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("vcard-preview", "Preview VCard content (EF04)")
  .option("--firstName <name>", "Teacher's first name (required)")
  .option("--lastName <name>", "Teacher's last name (required)")
  .option("--email <email>", "Teacher's email address")
  .option("--phone <phone>", "Teacher's work phone number")
  .option("--organization <org>", "Organization name", {
    default: "SRYEM - Ministère de l'Éducation nationale de Sealand"
  })
  .option("--title <title>", "Job title", {
    default: "Enseignant"
  })
  .action(({ options, logger }) => {
    try {
      const teacherData = {
        firstName: options.firstName,
        lastName: options.lastName,
        email: options.email,
        phone: options.phone,
        organization: options.organization,
        title: options.title,
      };
      
      if (!teacherData.firstName || !teacherData.lastName) {
        logger.error(chalk.red("\n✗ Erreur: Les champs --firstName et --lastName sont obligatoires.\n"));
        process.exit(1);
      }
      
      logger.info(chalk.blue.bold("\n📇 Aperçu de la VCard\n"));
      
      const preview = previewVCard(teacherData);
      
      if (!preview.valid) {
        logger.error(chalk.red("✗ Données invalides:\n"));
        preview.errors.forEach((err, i) => {
          logger.error(chalk.red(`  ${i + 1}. ${err}`));
        });
        logger.info("");
        process.exit(1);
      }
      
      logger.info(chalk.cyan("Enseignant: ") + chalk.white(preview.teacher));
      logger.info("");
      logger.info(chalk.gray("─".repeat(70)));
      console.log(preview.content);
      logger.info(chalk.gray("─".repeat(70)));
      logger.info(chalk.green("\n✓ VCard valide selon RFC 6350\n"));
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("simuler", "Simulate taking an exam from a GIFT file")
  .argument("<examen>", "Path to the GIFT exam file")
  .option("-s, --save <fichier>", "Save results to a file", {
    validator: cli.STRING,
  })
  .action(async ({ args, options, logger }) => {
    try {
      const examPath = args.examen;
      
      // Check if file exists
      if (!fs.existsSync(examPath)) {
        logger.error(chalk.red(`\n✗ Le fichier ${examPath} est introuvable. Vérifiez le chemin.\n`));
        process.exit(1);
      }
      
      const results = await simulateExam(examPath);
      
      if (options.save) {
        const outputPath = options.save;
        saveResults(results, outputPath);
      } else {
        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        rl.question("\n💾 Voulez-vous sauvegarder le bilan ? (o/n): ", (answer) => {
          if (answer.toLowerCase() === "o" || answer.toLowerCase() === "oui") {
            const defaultPath = `./resultats_${new Date().toISOString().split('T')[0]}.txt`;
            rl.question(`Nom du fichier [${defaultPath}]: `, (filename) => {
              const outputPath = filename.trim() || defaultPath;
              saveResults(results, outputPath);
              rl.close();
            });
          } else {
            logger.info("\n");
            rl.close();
          }
        });
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      if (error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  })
  
  .command("verifier", "Verify the quality of a GIFT exam file")
  .argument("<examen>", "Path to the GIFT exam file to verify")
  .action(({ args, logger }) => {
    try {
      const examPath = args.examen;
      
      // Check if file exists
      if (!fs.existsSync(examPath)) {
        logger.error(chalk.red(`\n✗ Le fichier ${examPath} est introuvable.\n`));
        process.exit(1);
      }
      
      logger.info(chalk.blue.bold("\n🔍 VÉRIFICATION DE LA QUALITÉ DE L'EXAMEN\n"));
      logger.info(chalk.gray(`Fichier: ${examPath}\n`));
      
      const result = verifyGiftExam(examPath);
      
      if (result.stats) {
        logger.info(chalk.cyan("📊 Statistiques:"));
        logger.info(`   Questions: ${result.stats.totalQuestions}`);
        logger.info(`   Types: ${Object.keys(result.stats.typeDistribution).join(", ")}`);
        Object.entries(result.stats.typeDistribution).forEach(([type, count]) => {
          logger.info(`     - ${type}: ${count}`);
        });
        logger.info("");
      }
      
      if (result.errors.length > 0) {
        logger.error(chalk.red.bold("❌ Erreurs détectées:\n"));
        result.errors.forEach((error, i) => {
          logger.error(chalk.red(`   ${i + 1}. ${error}`));
        });
        logger.info("");
      }
      
      if (result.warnings.length > 0) {
        logger.warn(chalk.yellow.bold("⚠️  Avertissements:\n"));
        result.warnings.forEach((warning, i) => {
          logger.warn(chalk.yellow(`   ${i + 1}. ${warning}`));
        });
        logger.info("");
      }
      
      if (result.valid) {
        logger.info(chalk.green.bold("✅ Examen conforme aux règles du SRYEM\n"));
        process.exit(0);
      } else {
        logger.error(chalk.red.bold("❌ L'examen ne peut pas être validé. Veuillez corriger les erreurs listées ci-dessus.\n"));
        process.exit(1);
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("profil", "Generate a question type distribution histogram for an exam")
  .argument("<examen>", "Path to the GIFT exam file")
  .option("-s, --sortie <fichier>", "Save histogram to a file", {
    validator: cli.STRING,
  })
  .action(({ args, options, logger }) => {
    try {
      const examPath = args.examen;
      
      // Check if file exists
      if (!fs.existsSync(examPath)) {
        logger.error(chalk.red(`\n✗ Le fichier ${examPath} est introuvable.\n`));
        process.exit(1);
      }
      
      logger.info(chalk.blue.bold("\n📊 PROFIL DE L'EXAMEN\n"));
      logger.info(chalk.gray(`Fichier: ${examPath}\n`));
      
      const result = generateProfileReport(examPath);
      
      if (!result.success) {
        logger.error(chalk.red(`\n✗ Erreur: ${result.error}\n`));
        process.exit(1);
      }
      
      console.log(result.histogram);
      
      logger.info(chalk.cyan("\n📈 Statistiques:"));
      logger.info(`   Nombre de types différents: ${result.stats.typeCount}`);
      logger.info(`   Type le plus fréquent: ${
        Object.entries(result.stats.typeDistribution)
          .sort((a, b) => b[1] - a[1])[0][0]
      }`);
      logger.info("");
      
      if (options.sortie) {
        const saveResult = saveProfileToFile(result.histogram, options.sortie);
        
        if (saveResult.success) {
          logger.info(chalk.green(`✓ Histogramme sauvegardé sous ${options.sortie}\n`));
        } else {
          logger.error(chalk.red(`✗ Erreur lors de la sauvegarde: ${saveResult.error}\n`));
          process.exit(1);
        }
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("comparer", "Compare an exam profile with the question bank")
  .argument("<examen>", "Path to the exam GIFT file")
  .option("-b, --banque <path>", "Path to bank file or directory (default: ./data)", {
    default: "./data",
  })
  .option("-s, --sortie <fichier>", "Save comparison report to a file", {
    validator: cli.STRING,
  })
  .action(({ args, options, logger }) => {
    try {
      const examPath = args.examen;
      const bankPath = options.banque;
      
      if (!fs.existsSync(examPath)) {
        logger.error(chalk.red(`\n✗ Le fichier d'examen ${examPath} est introuvable.\n`));
        process.exit(1);
      }
      
      if (!fs.existsSync(bankPath)) {
        logger.error(chalk.red(`\n✗ La banque ${bankPath} est introuvable.\n`));
        process.exit(1);
      }
      
      logger.info(chalk.blue.bold("\n📊 COMPARAISON DES PROFILS\n"));
      logger.info(chalk.gray(`Examen: ${examPath}`));
      logger.info(chalk.gray(`Banque: ${bankPath}\n`));
      
      const comparison = compareProfiles(examPath, bankPath);
      
      if (!comparison.success) {
        logger.error(chalk.red(`\n✗ ${comparison.error}\n`));
        process.exit(1);
      }
      
      const report = generateComparisonReport(comparison);
      
      console.log(report);
      
      if (options.sortie) {
        const saveResult = saveComparisonReport(report, options.sortie);
        
        if (saveResult.success) {
          logger.info(chalk.green(`\n✓ Rapport de comparaison sauvegardé sous ${options.sortie}\n`));
        } else {
          logger.error(chalk.red(`\n✗ Erreur lors de la sauvegarde: ${saveResult.error}\n`));
          process.exit(1);
        }
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("importer", "Import and validate a GIFT file")
  .argument("<fichier>", "Path to the GIFT file to import")
  .option("-b, --banque", "Import to the question bank (./data)", {
    default: false,
  })
  .action(({ args, options, logger }) => {
    try {
      const filePath = args.fichier;
      
      logger.info(chalk.blue.bold("\n📥 IMPORT DE FICHIER GIFT\n"));
      logger.info(chalk.gray(`Fichier: ${filePath}\n`));
      
      if (options.banque) {
        const result = importToBank(filePath);
        
        if (!result.success) {
          logger.error(chalk.red(`✗ ${result.error}\n`));
          process.exit(1);
        }
        
        logger.info(chalk.green.bold("✅ Fichier importé dans la banque avec succès!\n"));
        logger.info(chalk.cyan(`📁 Destination: ${result.destinationPath}`));
        logger.info(chalk.cyan(`📝 Questions chargées: ${result.questionsImported}`));
        logger.info(chalk.cyan(`📊 Répartition par type:`));
        Object.entries(result.typeDistribution).forEach(([type, count]) => {
          logger.info(`   - ${type}: ${count}`);
        });
        logger.info("");
        
      } else {
        const result = importGiftFile(filePath);
        
        if (!result.success) {
          logger.error(chalk.red(`✗ ${result.error}\n`));
          process.exit(1);
        }
        
        logger.info(chalk.green.bold("✅ Fichier GIFT valide!\n"));
        logger.info(chalk.cyan(`📝 Questions totales: ${result.totalQuestions}`));
        logger.info(chalk.cyan(`✓  Questions valides: ${result.validQuestions}`));
        
        if (result.invalidQuestions > 0) {
          logger.warn(chalk.yellow(`⚠  Questions invalides: ${result.invalidQuestions}`));
        }
        
        logger.info(chalk.cyan(`\n📊 Répartition par type:`));
        Object.entries(result.typeDistribution).forEach(([type, count]) => {
          logger.info(`   - ${type}: ${count}`);
        });
        logger.info("");
      }
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  })
  
  .command("exporter", "Export a GIFT file to a destination")
  .argument("<source>", "Path to the source GIFT file")
  .argument("<destination>", "Destination path (file or directory)")
  .action(({ args, logger }) => {
    try {
      const sourcePath = args.source;
      const destPath = args.destination;
      
      logger.info(chalk.blue.bold("\n📤 EXPORT DE FICHIER GIFT\n"));
      logger.info(chalk.gray(`Source: ${sourcePath}`));
      logger.info(chalk.gray(`Destination: ${destPath}\n`));
      
      const result = exportGiftFile(sourcePath, destPath);
      
      if (!result.success) {
        logger.error(chalk.red(`✗ ${result.error}\n`));
        process.exit(1);
      }
      
      logger.info(chalk.green.bold("✅ Fichier exporté avec succès!\n"));
      logger.info(chalk.cyan(`📁 Destination: ${result.destinationFile}`));
      logger.info(chalk.cyan(`📝 Questions exportées: ${result.questionsExported}`));
      logger.info("");
      
    } catch (error) {
      logger.error(chalk.red(`\n✗ Erreur: ${error.message}\n`));
      process.exit(1);
    }
  });

cli.run(process.argv.slice(2));
