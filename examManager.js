const fs = require("fs");
const path = require("path");
const { parseGiftFile } = require("./giftParser");

const EXAM_FILE = ".current_exam.json";

function loadCurrentExam() {
  if (fs.existsSync(EXAM_FILE)) {
    try {
      const data = fs.readFileSync(EXAM_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading exam file:", error.message);
      return createEmptyExam();
    }
  }
  return createEmptyExam();
}

function saveCurrentExam(exam) {
  try {
    fs.writeFileSync(EXAM_FILE, JSON.stringify(exam, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error saving exam file:", error.message);
    return false;
  }
}

function createEmptyExam() {
  return {
    title: "Nouvel examen",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    questions: [],
    metadata: {
      minQuestions: 15,
      maxQuestions: 20,
    },
  };
}

function initExam(title = "Nouvel examen") {
  const exam = createEmptyExam();
  exam.title = title;
  saveCurrentExam(exam);
  return exam;
}

function getQuestionByReference(dataDir, file, title) {
  const filePath = path.join(dataDir, file);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Le fichier "${file}" n'existe pas dans ${dataDir}`);
  }
  
  const questions = parseGiftFile(filePath);
  const question = questions.find(q => q.title === title);
  
  if (!question) {
    throw new Error(`La question "${title}" n'a pas été trouvée dans ${file}`);
  }
  
  return {
    file: file,
    title: title,
    type: question.type,
    questionText: question.questionText,
    content: question.content,
    answers: question.answers,
    addedAt: new Date().toISOString(),
  };
}

function addQuestion(dataDir, file, title) {
  const exam = loadCurrentExam();
  
  if (!exam || !exam.questions) {
    throw new Error("Aucun examen en cours. Utilisez 'exam-init' pour créer un nouvel examen."    );
  }
  
  if (exam.questions.length >= exam.metadata.maxQuestions) {
    throw new Error(
      `Un examen ne peut contenir plus de ${exam.metadata.maxQuestions} questions. ` +
      `Veuillez retirer des questions avant d'en ajouter.`
    );
  }
  
  const isDuplicate = exam.questions.some(
    q => q.file === file && q.title === title
  );
  
  if (isDuplicate) {
    throw new Error(
      "Cette question est déjà dans l'examen. Veuillez en choisir une autre."
    );
  }
  
  const question = getQuestionByReference(dataDir, file, title);
  
  exam.questions.push(question);
  exam.modifiedAt = new Date().toISOString();
  
  saveCurrentExam(exam);
  return exam;
}

function removeQuestion(index) {
  const exam = loadCurrentExam();
  
  if (!exam || !exam.questions || exam.questions.length === 0) {
    throw new Error("L'examen est vide. Aucune question à retirer.");
  }
  
  const idx = index - 1;
  
  if (idx < 0 || idx >= exam.questions.length) {
    throw new Error(
      `Index invalide. L'examen contient ${exam.questions.length} question(s). ` +
      `Veuillez spécifier un index entre 1 et ${exam.questions.length}.`
    );
  }
  
  const removed = exam.questions.splice(idx, 1)[0];
  exam.modifiedAt = new Date().toISOString();
  
  saveCurrentExam(exam);
  return { exam, removed };
}

function getCurrentExam() {
  return loadCurrentExam();
}

function clearExam() {
  if (fs.existsSync(EXAM_FILE)) {
    fs.unlinkSync(EXAM_FILE);
  }
  return createEmptyExam();
}

function validateExam() {
  const exam = loadCurrentExam();
  const errors = [];
  const warnings = [];
  
  if (exam.questions.length < exam.metadata.minQuestions) {
    errors.push(
      `L'examen doit contenir au moins ${exam.metadata.minQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  if (exam.questions.length > exam.metadata.maxQuestions) {
    errors.push(
      `L'examen ne peut contenir plus de ${exam.metadata.maxQuestions} questions. ` +
      `Actuellement: ${exam.questions.length} question(s).`
    );
  }
  
  const seen = new Set();
  exam.questions.forEach((q, idx) => {
    const key = `${q.file}::${q.title}`;
    if (seen.has(key)) {
      errors.push(
        `Question dupliquée à la position ${idx + 1}: "${q.title}" (${q.file})`
      );
    }
    seen.add(key);
  });
  
  const typeCount = {};
  exam.questions.forEach(q => {
    typeCount[q.type] = (typeCount[q.type] || 0) + 1;
  });
  
  if (Object.keys(typeCount).length === 1) {
    warnings.push(
      "L'examen ne contient qu'un seul type de question. " +
      "Envisagez d'ajouter plus de variété."
    );
  }
  
  if (typeCount.Unknown > 0) {
    warnings.push(
      `L'examen contient ${typeCount.Unknown} question(s) de type inconnu. ` +
      `Vérifiez le format GIFT.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      questionCount: exam.questions.length,
      typeDistribution: typeCount,
    },
  };
}

function getExamStats() {
  const exam = loadCurrentExam();
  
  const stats = {
    title: exam.title,
    questionCount: exam.questions.length,
    minRequired: exam.metadata.minQuestions,
    maxAllowed: exam.metadata.maxQuestions,
    isValid: exam.questions.length >= exam.metadata.minQuestions && 
             exam.questions.length <= exam.metadata.maxQuestions,
    typeDistribution: {},
    files: new Set(),
  };
  
  exam.questions.forEach(q => {
    stats.typeDistribution[q.type] = (stats.typeDistribution[q.type] || 0) + 1;
    stats.files.add(q.file);
  });
  
  stats.fileCount = stats.files.size;
  stats.files = Array.from(stats.files);
  
  return stats;
}

function moveQuestion(fromIndex, toIndex) {
  const exam = loadCurrentExam();
  
  if (!exam || !exam.questions || exam.questions.length === 0) {
    throw new Error("L'examen est vide. Aucune question à déplacer.");
  }
  
  const from = fromIndex - 1;
  const to = toIndex - 1;
  
  if (from < 0 || from >= exam.questions.length) {
    throw new Error(`Index source invalide: ${fromIndex}`);
  }
  
  if (to < 0 || to >= exam.questions.length) {
    throw new Error(`Index destination invalide: ${toIndex}`);
  }
  
  const [question] = exam.questions.splice(from, 1);
  exam.questions.splice(to, 0, question);
  exam.modifiedAt = new Date().toISOString();
  
  saveCurrentExam(exam);
  return exam;
}

module.exports = {
  initExam,
  addQuestion,
  removeQuestion,
  getCurrentExam,
  clearExam,
  validateExam,
  getExamStats,
  moveQuestion,
  loadCurrentExam,
  saveCurrentExam,
};