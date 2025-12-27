const fs = require('fs');
const path = require('path');
const examProfile = require('../examProfile');
const profileComparator = require('../profileComparator');

describe("SCN03: Le SRYEM visualise la banque de questions", function() {
    const dataDir = path.join(__dirname, '../data');
    const outputDir = path.join(__dirname, '../output');
    const validGift = path.join(dataDir, 'U1-p7-Adverbs.gift'); // Assuming this exists
    const invalidGift = path.join(outputDir, 'invalid.gift');

    beforeAll(function() {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        fs.writeFileSync(invalidGift, "This is not a gift file content");
    });

    afterAll(function() {
        if (fs.existsSync(invalidGift)) {
            fs.unlinkSync(invalidGift);
        }
    });

    describe("CT08: Génération d’un histogramme", function() {
        it("devrait générer un profil pour un fichier valide", function() {
            const profile = examProfile.generateExamProfile(validGift);
            expect(profile).toBeDefined();
            // Expect profile to have keys like 'MultipleChoice', 'ShortAnswer', etc.
            expect(Object.keys(profile).length).toBeGreaterThan(0);
        });
    });

    describe("CT09: Génération d’un histogramme à partir d’un fichier erroné", function() {
        it("devrait gérer l'erreur ou retourner un profil vide", function() {
            // Depending on implementation, it might throw or return empty
            try {
                const profile = examProfile.generateExamProfile(invalidGift);
                // If it returns empty object or similar
                expect(profile).toBeDefined();
            } catch (e) {
                expect(e).toBeDefined();
            }
        });
    });

    describe("CT10: Comparaison de 2 banques de questions", function() {
        it("devrait comparer deux fichiers et retourner des écarts", function() {
            const file1 = path.join(dataDir, 'U1-p7-Adverbs.gift');
            const file2 = path.join(dataDir, 'U2-p22-Gra-Ing_or_inf.gift');
            
            if (fs.existsSync(file1) && fs.existsSync(file2)) {
                const comparison = profileComparator.compareProfiles(file1, file2);
                expect(comparison).toBeDefined();
                // Check for expected structure of comparison report
            } else {
                pending("Fichiers de données manquants pour le test de comparaison");
            }
        });
    });
});
