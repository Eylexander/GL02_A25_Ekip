const fs = require('fs');
const path = require('path');
const vcardGenerator = require('../vcardGenerator');

describe("SCN04: Un enseignant partage son contact", function() {
    const outputDir = path.join(__dirname, '../output');
    
    beforeAll(function() {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
    });

    describe("CT11: Génération d’un fichier VCard", function() {
        it("devrait rejeter une adresse email invalide", function() {
            const result = vcardGenerator.validateEmail("invalid-email");
            expect(result).toBe(false);
        });

        it("devrait accepter une adresse email valide", function() {
            const result = vcardGenerator.validateEmail("test@sryem.se");
            expect(result).toBe(true);
        });

        it("devrait générer un fichier vcf si toutes les infos sont présentes", function() {
            const teacherData = {
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@sryem.se"
            };
            const outputPath = path.join(outputDir, 'john_doe.vcf');
            
            vcardGenerator.generateVCardFile(teacherData, outputPath);
            
            expect(fs.existsSync(outputPath)).toBe(true);
            const content = fs.readFileSync(outputPath, 'utf8');
            expect(content).toContain("FN:John Doe");
            expect(content).toContain("john.doe@sryem.se");
            
            fs.unlinkSync(outputPath);
        });
    });
});
