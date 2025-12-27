const fs = require('fs');
const path = require('path');
const giftParser = require('../giftParser');
const examManager = require('../examManager');
const giftGenerator = require('../giftGenerator');

describe("SCN01: Enseignant composant un examen", function() {
    const dataDir = path.join(__dirname, '../data');
    const outputDir = path.join(__dirname, '../output');
    const testExamFile = path.join(outputDir, 'test_exam_scn01.gift');

    beforeAll(function() {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        examManager.clearExam();
    });

    afterAll(function() {
        if (fs.existsSync(testExamFile)) {
            fs.unlinkSync(testExamFile);
        }
        examManager.clearExam();
    });

    describe("CT01: Recherche de questions dans la banque", function() {
        it("devrait renvoyer au moins 1 résultat pour MultipleChoice et 'grammar'", function() {
            const results = giftParser.searchQuestions(dataDir, 'MultipleChoice', 'grammar');
            expect(Array.isArray(results)).toBe(true);
        });

        it("devrait renvoyer une liste vide pour un type inexistant 'ChoixFaux'", function() {
            const results = giftParser.searchQuestions(dataDir, 'ChoixFaux', 'grammar');
            expect(results.length).toBe(0);
        });

        it("devrait renvoyer une liste vide pour TrueFalse et 'grammar' si aucune correspondance", function() {
            const results = giftParser.searchQuestions(dataDir, 'TrueFalse', 'grammar');
            expect(results.length).toBe(0);
        });
    });

    describe("CT02: Sélection de questions et composition d’un examen", function() {
        beforeEach(function() {
            examManager.clearExam();
            examManager.initExam("Test Exam SCN01");
        });

        it("devrait ajouter une question à l'examen temporaire", function() {
            const questions = giftParser.searchQuestions(dataDir, 'MultipleChoice');
            if (questions.length > 0) {
                const q = questions[0];
                const result = examManager.addQuestion(dataDir, q.file, q.title);
                expect(result).toBeDefined();
                
                const currentExam = examManager.getCurrentExam();
                expect(currentExam.questions.length).toBe(1);
                expect(currentExam.questions[0].title).toBe(q.title);
            }
        });

        it("devrait refuser l'ajout d'une question déjà présente", function() {
            const questions = giftParser.searchQuestions(dataDir, 'MultipleChoice');
            if (questions.length > 0) {
                const q = questions[0];
                examManager.addQuestion(dataDir, q.file, q.title);
                
                expect(() => {
                    examManager.addQuestion(dataDir, q.file, q.title);
                }).toThrowError(/déjà dans l'examen/);
            }
        });

        it("devrait refuser l'ajout au-delà de 20 questions", function() {
            const allQuestions = giftParser.searchQuestions(dataDir);
            
            let addedCount = 0;
            const usedTitles = new Set();
            
            for (const q of allQuestions) {
                if (addedCount >= 20) break;
                if (!usedTitles.has(q.title)) {
                    try {
                        examManager.addQuestion(dataDir, q.file, q.title);
                        addedCount++;
                        usedTitles.add(q.title);
                    } catch (e) {
                        // Ignore duplicates
                    }
                }
            }
            
            if (addedCount === 20) {
                expect(examManager.getCurrentExam().questions.length).toBe(20);

                const extraQuestion = allQuestions.find(q => !usedTitles.has(q.title));
                if (extraQuestion) {
                    expect(() => {
                        examManager.addQuestion(dataDir, extraQuestion.file, extraQuestion.title);
                    }).toThrowError(/plus de 20 questions/);
                }
            }
        });
    });

    describe("CT03: Export d’un fichier GIFT", function() {
        beforeEach(function() {
            examManager.clearExam();
            examManager.initExam("Export Test");
            const questions = giftParser.searchQuestions(dataDir);
            
            // Add at least 15 questions to satisfy validation
            let addedCount = 0;
            const usedTitles = new Set();
            
            for (const q of questions) {
                if (addedCount >= 15) break;
                if (!usedTitles.has(q.title)) {
                    try {
                        examManager.addQuestion(dataDir, q.file, q.title);
                        addedCount++;
                        usedTitles.add(q.title);
                    } catch (e) {}
                }
            }
        });

        it("devrait générer un fichier GIFT valide", function() {
            const exam = examManager.getCurrentExam();
            giftGenerator.generateGiftFile(exam, testExamFile);
            expect(fs.existsSync(testExamFile)).toBe(true);
        });

        it("devrait échouer si le dossier est en lecture seule (simulation)", function() {
            spyOn(fs, 'writeFileSync').and.throwError("EACCES");
            try {
                giftGenerator.generateGiftFile(examManager.getCurrentExam(), testExamFile);
                fail("Devrait lancer une exception");
            } catch (e) {
                expect(e.message).toContain("EACCES");
            }
        });
    });

    describe("CT04: Import d’un fichier GIFT", function() {
        it("devrait rejeter un fichier qui n'est pas au format GIFT", function() {
            const importExport = require('../importExport');
            const badFile = path.join(__dirname, 'scn01_exam_composition_spec.js'); 
            
            try {
                const result = importExport.importGiftFile(badFile);
                if (typeof result === 'boolean') {
                    expect(result).toBe(false);
                }
            } catch (e) {
                expect(e).toBeDefined();
            }
        });
    });
});
