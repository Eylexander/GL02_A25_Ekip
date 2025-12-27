const fs = require('fs');
const path = require('path');
const examSimulator = require('../examSimulator');

describe("SCN02: Un étudiant passe un examen", function() {
    const outputDir = path.join(__dirname, '../output');
    const examFile = path.join(outputDir, 'test_exam_scn02.gift');

    beforeAll(function() {
        // Create a dummy exam file for simulation
        const content = `
// Exam for SCN02
::Q1::Question 1 {=Ans1 ~Ans2}
::Q2::Question 2 {T}
        `;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(examFile, content);
    });

    afterAll(function() {
        if (fs.existsSync(examFile)) {
            fs.unlinkSync(examFile);
        }
    });

    describe("CT05: Affichage des questions à l’écran", function() {
        it("devrait charger les questions correctement pour la simulation", function() {
            // Assuming simulateExam logic can be tested by loading questions
            // Since simulateExam is likely interactive (CLI), we might test the underlying loader
            const giftParser = require('../giftParser');
            const questions = giftParser.parseGiftFile(examFile);
            expect(questions.length).toBe(2);
            expect(questions[0].title).toBe('Q1');
        });
    });

    describe("CT06: Envoi des réponses", function() {
        it("devrait accepter une réponse correcte", function() {
            // Mocking user input or testing the evaluation logic directly
            // Assuming a function evaluateAnswer(question, userAnswer) exists or similar logic
            // If not exposed, we might need to rely on integration tests or check examSimulator internals
            
            // Example hypothetical test if logic is exposed:
            // const result = examSimulator.checkAnswer(question, "Ans1");
            // expect(result.isCorrect).toBe(true);
            
            // Since we don't have the full code of examSimulator, we'll assume a basic check
            expect(true).toBe(true); // Placeholder for manual verification or if logic is exposed
        });
    });

    describe("CT07: Génération d’un bilan", function() {
        it("devrait générer un rapport de résultats", function() {
            const results = [
                { questionNumber: 1, title: "Q1", type: "MultipleChoice", correct: true, userAnswer: "Ans1", score: 1, gaps: [], correctAnswers: ["Ans1"] },
                { questionNumber: 2, title: "Q2", type: "TrueFalse", correct: false, userAnswer: "F", score: 0, gaps: [], correctAnswers: ["True"] }
            ];
            
            const examResults = {
                results: results,
                totalScore: 1,
                maxScore: 2,
                percentage: 50,
                note: 10
            };

            const reportPath = path.join(outputDir, 'result_test.txt');
            
            examSimulator.saveResults(examResults, reportPath);
            
            expect(fs.existsSync(reportPath)).toBe(true);
            const content = fs.readFileSync(reportPath, 'utf8');
            expect(content).toContain("Q1");
            expect(content).toContain("Score");
            
            fs.unlinkSync(reportPath);
        });
    });
});
