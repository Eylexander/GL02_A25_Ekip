# GIFT CLI - Outil de Gestion des Questions d'Examen

Cet outil est un utilitaire en ligne de commande pour gérer une banque de questions au format GIFT (General Import Format Technology) pour le ministère de l'Éducation nationale de Sealand (SRYEM).

Cet outil permet aux enseignants et gestionnaires de :

- Rechercher et visualiser des questions dans la banque certifiée
- Analyser les statistiques de la banque de questions
- Filtrer par type de question et mots-clés
- Composer des examens conformes aux normes GIFT
- Créer des carte permettant d’identifier des acteurs (enseignants, secretaires etc)
- Simuler un examen
- Exporter et importer des examens

La banque de questions initiales nous a été fournis par le client, et se situe dans le dossier “data”.

## Installation

### Prérequis

- [Node.js](https://nodejs.org/) (version 14 ou supérieure recommandée)
- [npm](https://www.npmjs.com/) (normalement inclus avec Node.js)

### Étapes d'installation

1.  Clonez ce dépôt (si ce n'est pas déjà fait) et naviguez dans le dossier du projet :
    ```bash
    cd GL02_A25_Ekip
    ```

2.  Installez les dépendances nécessaires :
    ```bash
    npm install
    ```

3.  Vérifiez l'installation en affichant l'aide :
    ```bash
    node index.js --help
    ```

### **Types de Questions Supportés**

Le parser reconnaît automatiquement les types suivants :

| Type | Description | Exemple GIFT |
| --- | --- | --- |
| **MultipleChoice** | Questions à choix multiples | `{~wrong~=correct~wrong}` ou `{1:MC:~=correct~wrong}` |
| **ShortAnswer** | Questions à réponse courte | `{=answer1 =answer2}` ou `{1:SA:=answer}` |
| **Matching** | Questions d'association | `{=item1->match1 =item2->match2}` |
| **TrueFalse** | Questions vrai/faux | `{TRUE}` ou `{FALSE}` (supporte le feedback) |
| **Numerical** | Questions numériques | `{#42}` ou `{#1822:0}` |
| **Essay** | Questions à développement/réponse libre | `{}` (bloc de réponse vide) |

### Architecture

**Structure du Projet**

```
projet/
├── index.js              # Interface CLI (Caporal) - Point d'entrée
├── giftParser.js         # Parser GIFT et fonctions de recherche
├── examManager.js        # Gestion de la composition d'examens
├── giftGenerator.js      # Génération de fichiers GIFT
├── vcardGenerator.js     # Génération de fichiers VCard
├── examSimulator.js      # Simulation de passation d'examens
├── qualityChecker.js     # Vérification de qualité des examens
├── examProfile.js        # Génération de profils d'examens
├── profileComparator.js  # Comparaison de profils
├── importExport.js       # Import/export de fichiers GIFT
├── data/                 # Banque de questions GIFT (47 fichiers)
├── output/               # Fichiers générés (examens, VCards)
├── package.json          # Dépendances
└── README.md             # Documentation

```

### Modules Principaux

### `giftParser.js`

Parser GIFT et recherche de questions.

**Fonctions exportées :**

- `parseGiftFile(filePath)` : Parse un fichier GIFT et extrait les questions
- `searchQuestions(dataDir, type, keyword)` : Recherche des questions selon critères
- `getQuestionStats(dataDir)` : Calcule les statistiques de la banque
- `getAvailableTypes(dataDir)` : Liste tous les types de questions disponibles


### `examManager.js`

Gestion de la composition d'examens.

**Fonctions exportées :**

- `initExam(title)` : Initialise un nouvel examen
- `addQuestion(file, title)` : Ajoute une question à l'examen
- `removeQuestion(index)` : Retire une question par position
- `moveQuestion(from, to)` : Déplace une question
- `getCurrentExam()` : Récupère l'examen en cours
- `clearExam()` : Efface l'examen en cours
- `validateExam()` : Valide l'examen (15-20 questions, unicité)
- `getExamStats()` : Statistiques de l'examen

**Contraintes :**

- Minimum 15 questions, maximum 20
- Aucune question dupliquée
- Stockage dans `.current_exam.json`

### `giftGenerator.js`

Génération de fichiers GIFT conformes.

**Fonctions exportées :**

- `generateGiftFile(exam, outputPath)` : Génère un fichier GIFT
- `previewGiftFile(exam, maxLines)` : Aperçu du fichier
- `getDefaultFilename()` : Nom de fichier avec timestamp

**Format généré :**

- En-tête avec métadonnées
- Questions au format GIFT standard
- Commentaires de structure
- Compatibilité Moodle garantie

### `vcardGenerator.js`

Génération de fichiers VCard RFC 6350/6868.

**Fonctions exportées :**

- `generateVCardFile(teacherData, outputPath)` : Génère une VCard
- `validateEmail(email)` : Validation d'email
- `previewVCard(teacherData)` : Aperçu de la VCard
- `getDefaultVCardFilename(firstName, lastName)` : Nom par défaut

**Conformité RFC :**

- VCard 4.0 (RFC 6350)
- Encodage paramètres (RFC 6868)
- Line folding automatique
- Validation des champs

### `examSimulator.js`

Simulation de passation d'examens.

**Fonctions exportées :**

- `simulateExam(giftFilePath)` : Lance une simulation interactive
- `saveResults(results, outputPath)` : Sauvegarde le bilan

**Fonctionnalités :**

- Support MultipleChoice et ShortAnswer
- Questions à trous multiples (cloze tests)
- Scoring proportionnel
- Bilan détaillé avec note sur 20
- Comparaison insensible à la casse

### `qualityChecker.js`

Vérification de qualité des examens.

**Fonctions exportées :**

- `verifyGiftExam(giftFilePath)` : Vérifie un examen GIFT

**Vérifications :**

- Nombre de questions (15-20)
- Unicité des questions
- Présence de réponses
- Réponses correctes présentes
- Détection de types inconnus

### `examProfile.js`

Génération de profils d'examens (histogrammes).

**Fonctions exportées :**

- `generateExamProfile(giftFilePath)` : Analyse la répartition
- `generateTextHistogram(typeDistribution, total)` : Histogramme ASCII
- `generateProfileReport(giftFilePath)` : Rapport complet
- `saveProfileToFile(histogram, outputPath)` : Sauvegarde

**Visualisation :**

- Histogramme ASCII art
- Barres proportionnelles
- Pourcentages par type
- Statistiques détaillées

### `profileComparator.js`

Comparaison de profils d'examens.

**Fonctions exportées :**

- `generateBankProfile(bankPath)` : Analyse la banque
- `compareProfiles(examPath, bankPath)` : Compare examen vs banque
- `generateComparisonReport(comparison)` : Génère rapport
- `saveComparisonReport(report, outputPath)` : Sauvegarde

**Analyse :**

- Écarts en points de pourcentage
- Détection écarts significatifs (>10%)
- Recommandations d'équilibrage
- Support fichier ou dossier

### `importExport.js`

Import/export de fichiers GIFT.

**Fonctions exportées :**

- `importGiftFile(filePath)` : Import et validation
- `exportGiftFile(sourceFilePath, destinationPath)` : Export
- `importToBank(filePath, bankDir)` : Import dans la banque

**Sécurité :**

- Validation format GIFT
- Vérification permissions
- Protection contre écrasement
- Statistiques d'import



### Format GIFT

Les fichiers GIFT sont structurés comme suit :

```
// Commentaire
::Titre de la question::Texte de la question {
  ~réponse incorrecte
  =réponse correcte
  ~autre réponse incorrecte
}

::Autre question::[html]Question avec HTML {
  =réponse
}

```

### Exemples de Questions

**Multiple Choice:**

```
::Q1::Quelle est la capitale de la France? {
  ~Londres
  =Paris
  ~Berlin
  ~Madrid
}

```

**Short Answer:**

```
::Q2::Complétez la phrase. {
  =réponse correcte
  =autre réponse correcte
}

```

**Matching:**

```
::Q3::Associez les éléments. {
  =France -> Paris
  =Allemagne -> Berlin
  =Italie -> Rome
}

```

**True/False:**

```
::Q4::La Terre est plate. {
  FALSE#Correct! La Terre est ronde.#Bien joué!
}

```

**Numerical:**

```
::Q5::Quand est né Ulysses S. Grant? {#
  =1822:0
  =%50%1822:2
}

```

**Essay (Fill-in-the-blank):**

```
::Q6::[html]
<b>A:</b> I hit my head on the windscreen. (<i>wear a seatbelt</i>)<br>
<b>B:</b> You ____. {}

```

## Statistiques de la Banque Actuelle

- **47 fichiers** GIFT
- **425 questions** au total
- **~9 questions** par fichier en moyenne

Répartition par type :

- MultipleChoice: 53.2% (226 questions)
- ShortAnswer: 42.1% (179 questions)
- Matching: 2.8% (12 questions)
- Essay: 1.4% (6 questions)
- TrueFalse: 0.2% (1 question)
- Numerical: 0.2% (1 question)
- Unknown: 0.0% (0 questions)

# Guide d’installation

Vous pouvez télécharger le projet soit via un dossier qui vous sera envoyé en format zip, ou bien en “clonant” le repository associé.

Pour installer les dependances nécessaires pour le projet, executez la commande suivante:

```bash
npm install

```

## Guide d’utilisation

Chacune des fonctionnalités demandées ont été réalisés et sont présentées dans cette partie.

Leur nom de code est indiqué entre parenthèse et un exemple d’utilisation est associé.  

### Commande de recherche (EF01)

Rechercher et visualiser des questions de la banque :

```bash
# Rechercher tous les types de questions
node index.js search

# Rechercher par type
node index.js search MultipleChoice
node index.js search ShortAnswer
node index.js search Matching
node index.js search Essay
node index.js search TrueFalse
node index.js search Numerical

# Rechercher avec un mot-clé
node index.js search "" "adverb"
node index.js search ShortAnswer "adverb"

# Options avancées
node index.js search MultipleChoice -v          # Mode verbose (affiche les réponses)
node index.js search ShortAnswer -l 5           # Limite à 5 résultats
node index.js search -d ./data                  # Spécifier un autre répertoire

```

### Options de recherche

- `v, --verbose` : Affiche les réponses détaillées pour chaque question
- `l, --limit <nombre>` : Limite le nombre de résultats affichés
- `d, --dataDir <dir>` : Spécifie le répertoire contenant les fichiers GIFT (défaut: `./data`)

### Commande de statistiques

Afficher les statistiques de la banque de questions :

```bash
node index.js stats

```

Cette commande affiche :

- Nombre total de fichiers et de questions
- Moyenne de questions par fichier
- Répartition par type de question (avec graphique en barres)
- Top 10 des fichiers par nombre de questions

### Commande de types

Lister tous les types de questions disponibles :

```bash
node index.js types

```

### Commandes de composition d'examen (EF02)

Il est spécifié dans le cahier des charges que cet outil doit gérer la création d’un examen.

L’utilisateur peut donc créer un examen à la fois. 

L’examen est stocké dans un fichier temporaire en format json.

Pour le sauvegarder dans le format GIFT pour moodle (EF03), il doit avoir rempli toutes les conditions.

Une fois sauvegardé, l’utilisateur peut créer un nouvel examen.

Composer un examen en sélectionnant des questions :

```bash
# Initialiser un nouvel examen
node index.js exam-init "Examen de Grammaire Anglaise"

# Ajouter des questions à l'examen
node index.js exam-add "U1-p7-Adverbs.gift" "U1 p7 Adverbs GR 1.1"
node index.js exam-add "U2-p22-Gra-Ing_or_inf.gift" "U2 p22 6.1a – Verb patterns -ing or inf"

# Afficher la composition actuelle
node index.js exam-list
node index.js exam-list -v  # Mode verbose avec détails

# Retirer une question (par position)
node index.js exam-remove 3

# Déplacer une question
node index.js exam-move 5 2  # Déplace la question de la position 5 vers la position 2

# Valider l'examen
node index.js exam-validate

# Effacer l'examen en cours
node index.js exam-clear

```

Si vous souhaitez tester rapidement, vous pouvez initialiser un examen et ajouter 15 questions au hasard via cette commande:

```bash
node index.js exam-init "My Exam" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p32 Review 1 MultiChoice" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p32 Review 2 OpenCloze" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p33 Review 3 Word formation" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p33 Review 4.1 more irritating than" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p33 Review 4.2 interesting for/to" && node index.js exam-add "EM-U4-p32_33-Review.gift" "EM U4 p33 Review 4.3 so excited by/about" && node index.js exam-add "EM-U42-Ultimate.gift" "EM U42 Ultimate q1" && node index.js exam-add "EM-U42-Ultimate.gift" "EM U42 Ultimate q2" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.1" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.2" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.3" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.4" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.5" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.6" && node index.js exam-add "EM-U5-p34-Gra-Expressions_of_quantity.gift" "EM U5 p34 Gra1.7"

```

### Contraintes de composition

- **Minimum** : 15 questions
- **Maximum** : 20 questions
- **Unicité** : Aucune question dupliquée
- Les questions sont stockées dans `.current_exam.json` (fichier temporaire)

### Gestion des erreurs

Le système détecte et signale automatiquement :

- ✗ **Question dupliquée** : "Cette question est déjà dans l'examen. Veuillez en choisir une autre."
- ✗ **Limite dépassée** : "Un examen ne peut contenir plus de 20 questions. Veuillez retirer des questions avant d'en ajouter."
- ✗ **Question inexistante** : "La question '[titre]' n'a pas été trouvée dans [fichier]"
- ✗ **Fichier introuvable** : "Le fichier '[fichier]' n'existe pas dans [répertoire]"

### Génération de fichiers GIFT (EF03)

Exporter l'examen composé au format GIFT pour Moodle :

```bash
# Générer un fichier GIFT avec nom automatique
node index.js exam-generate

# Générer avec un nom personnalisé
node index.js exam-generate "examen_final.gift"

# Spécifier le répertoire de sortie
node index.js exam-generate -o ./mes_examens

# Forcer l'écrasement d'un fichier existant
node index.js exam-generate -f

# Aperçu du fichier GIFT sans le sauvegarder
node index.js exam-preview
node index.js exam-preview -l 100  # Afficher 100 lignes

```

### Format du fichier généré

Le fichier GIFT généré contient :

- **En-tête** : Métadonnées (titre, date, nombre de questions)
- **Questions** : Au format GIFT standard avec commentaires
- **Pied de page** : Résumé de l'examen

Exemple de sortie :

```
// ========================================
// Examen Test GL02
// ========================================
// Généré le: 24 novembre 2025 à 13:32
// Nombre de questions: 20
// Format: GIFT (Moodle)
//
// Créé le: 24 novembre 2025 à 13:26
// ========================================

// Question 1
// Type: MultipleChoice
// Source: EM-U42-Ultimate.gift

::EM U42 Ultimate q1::What's the answer? {
  ~wrong answer
  =right answer
}

```

### Gestion des erreurs de génération

- ✗ **Examen vide** : "L'examen est vide. Impossible de générer un fichier GIFT."
- ✗ **Examen invalide** : "L'examen n'est pas valide. Impossible de générer le fichier GIFT."
- ✗ **Fichier existe** : "Le fichier existe déjà. Utilisez --force pour écraser."
- ✗ **Permission refusée** : "Impossible d'écrire le fichier. Vérifiez les permissions du dossier."
- ✗ **Syntaxe invalide** : "Le format de la question [ID] est invalide."

### Création de fichiers VCard (EF04)

Générer des fichiers VCard pour les enseignants conformes aux normes RFC 6350 et RFC 6868 :

```bash
# Générer une VCard avec informations minimales (requises)
node index.js vcard-generate --firstName Jean --lastName Dupont

# Générer avec email et téléphone
node index.js vcard-generate \\
  --firstName Jean \\
  --lastName Dupont \\
  --email jean.dupont@sryem.se \\
  --phone "+46 123 456 789"

# Générer avec toutes les informations
node index.js vcard-generate \\
  --firstName "Dr. Marie" \\
  --lastName Martin \\
  --email marie.martin@sryem.se \\
  --phone "+46 12 345 6789" \\
  --mobile "+46 70 123 4567" \\
  --organization "SRYEM" \\
  --department "Département d'anglais" \\
  --title "Professeur d'anglais" \\
  --role "Responsable pédagogique" \\
  --city "Sealand City" \\
  --country "Sealand" \\
  --note "Spécialiste en évaluation" \\
  -o ./vcards

# Aperçu de la VCard sans la sauvegarder
node index.js vcard-preview \\
  --firstName Jean \\
  --lastName Dupont \\
  --email jean.dupont@sryem.se

# Forcer l'écrasement d'un fichier existant
node index.js vcard-generate --firstName Jean --lastName Dupont -f

```

### Simulation de passation d'examen (EF05)

### Description

La fonctionnalité de simulation permet de passer un examen à partir d'un fichier GIFT et d'obtenir un bilan détaillé des résultats.

### Commande de base

```bash
node index.js simuler <chemin-vers-fichier.gift>

```

### Options

- `-save <fichier>` : Sauvegarder automatiquement le bilan dans un fichier
    
    ```bash
    node index.js simuler output/my_exam_2025-12-05.gift --save resultats.txt
    
    ```
    

### Exemple d'utilisation

1. **Lancer une simulation simple**
    
    ```bash
    node index.js simuler output/my_exam_2025-12-05.gift
    
    ```
    
2. **Lancer une simulation et sauvegarder les résultats**
    
    ```bash
    node index.js simuler output/my_exam_2025-12-05.gift --save mes_resultats.txt
    
    ```
    

### Types de questions supportées

### 1. Questions à choix multiples (MultipleChoice)

- Format simple avec un seul choix
- Format avec plusieurs trous (cloze tests)
- Affichage numéroté des options
- Saisie du numéro de l'option choisie

### Affichage des résultats

Le système affiche un bilan détaillé comprenant :

1. **Par question :**
    - Titre et type de question
    - Réponse de l'étudiant
    - Indication correcte (✅) ou incorrecte (❌)
    - Affichage des bonnes réponses en cas d'erreur
2. **Bilan final :**
    - Score total (nombre de points / nombre de questions)
    - Pourcentage de réussite
    - Note sur 20
    - Message d'encouragement

**Exemple de résultat:**

```
📊 RÉSULTATS DE L'EXAMEN
======================================================================

Question 1: EM U4 p32 Review 1 MultiChoice
Type: MultipleChoice
Score: 89% (8/9 trous corrects)
  ✅ Trou 1: similar to
  ✅ Trou 2: took
  ❌ Trou 3: concentration
     Réponse(s) correcte(s): attention
  ...

======================================================================
📈 BILAN FINAL
======================================================================
Score: 13.45/15
Pourcentage: 89.67%
Note: 17.93/20

🎉 Excellent travail !

```

### Sauvegarde des résultats

Après la simulation, vous pouvez :

1. Sauvegarder automatiquement avec l'option `-save`
2. Choisir de sauvegarder interactivement
3. Spécifier un nom de fichier personnalisé

Le fichier de résultats contient :

- Date et heure de passage
- Score et note
- Détail complet de chaque question
- Réponses correctes et incorrectes

### Gestion des erreurs

### Fichier introuvable

```
✗ Le fichier examen1.gift est introuvable. Vérifiez le chemin.

```

**Solution :** Vérifiez que le chemin du fichier est correct et que le fichier existe.

### Réponse invalide

```
⚠️  Choix invalide. Veuillez réessayer.

```

**Solution :** Pour les questions à choix multiple, entrez un numéro valide correspondant aux options affichées.

### Aucune question trouvée

```
✗ Aucune question trouvée dans le fichier GIFT.

```

**Solution :** Vérifiez que le fichier GIFT contient des questions au format correct.

### Fonctionnalités avancées

Questions multi-lignes

Le système gère automatiquement les questions au format multi-ligne :

```
::Question::What's the answer? {
  ~wrong answer
  ~another wrong answer
  =right answer
}

```

### Réponses multiples acceptées

Pour les questions à réponse courte, plusieurs réponses peuvent être correctes :

```
::Question::The answer is {=forty two=42=forty-two}

```

### Formats HTML

Le système nettoie automatiquement les balises HTML pour un affichage propre :

- `<b>texte</b>` → texte en gras affiché normalement
- `<br>` → saut de ligne
- `<i>texte</i>` → texte italique affiché normalement

### Notes importantes

1. **Sensibilité à la casse :** Les réponses courtes sont comparées en ignorant la casse (majuscules/minuscules).
2. **Questions complexes :** Les questions avec plusieurs trous reçoivent un score proportionnel au nombre de trous corrects.
3. **Format GIFT :** Seuls les fichiers au format GIFT sont supportés (pas JSON).
4. **Interactivité :** La simulation est interactive et nécessite la présence de l'utilisateur pour répondre aux questions.

### Verifier le format des examens (EF06):

Utilisation:

```bash
   node index.js verifier <fichier.gift>
```

Exemple de sortie:

```bash
info: 
🔍 VÉRIFICATION DE LA QUALITÉ DE L'EXAMEN

info: Fichier: output/my_exam_2025-12-05.gift

info: 📊 Statistiques:
info:    Questions: 15
info:    Types: MultipleChoice, ShortAnswer
info:      - MultipleChoice: 9
info:      - ShortAnswer: 6
info: 
info: ✅ Examen conforme aux règles du SRYEM
```

### Profil des examens (EF07)

**Statistiques**:

- Nombre de types différents
- Type le plus fréquent
- Répartition détaillée

**Utilisation :**

```bash
# Afficher dans le terminal*

node index.js profil output/my_exam_2025-12-05.gift

# Sauvegarder dans un fichier*

node index.js profil output/my_exam_2025-12-05.gift --sortie profil.txt

# Analyser la banque de questions*

node index.js profil data/EM-U4-p32_33-Review.gift
```

**Exemple de sortie :**

```bash
📊 PROFIL DE L'EXAMEN

══════════════════════════════════════════════════════════════════

HISTOGRAMME DES TYPES DE QUESTIONS

══════════════════════════════════════════════════════════════════

MultipleChoice       ( 9) │████████████████████████████  │ 60.0%

ShortAnswer          ( 6) │███████████████████           │ 40.0%

──────────────────────────────────────────────────────────────────

Total: 15 questions
```

### Comparaison des profils d’examens (EF08)

**Analyse complète**

- Support fichier unique ou dossier entier
- Agrégation de tous les fichiers GIFT de la banque
- Calcul automatique des pourcentages

**Comparaison détaillée**

- Écarts en points de pourcentage
- Tri par importance des différences
- Tableau comparatif clair

**Recommandations intelligentes**

- Détection écarts significatifs (> 10%)
- Sur-représentation (> +15%)
- Sous-représentation (< -15%)

### Utilisation :

```bash
# Comparer avec la banque par défaut (./data)
node index.js comparer output/my_exam_2025-12-05.gift

# Spécifier une autre banque
node index.js comparer output/my_exam_2025-12-05.gift --banque data/

# Sauvegarder le rapport
node index.js comparer output/my_exam_2025-12-05.gift --sortie rapport.txt

```

### Exemple de résultat :

```
📊 COMPARAISON DES PROFILS

Type                 Examen    Banque    Écart
──────────────────────────────────────────────────────────────────
MultipleChoice          60.0%     53.2%     +6.8%
ShortAnswer             40.0%     42.4%     -2.4%

✅ Votre examen présente une répartition similaire à la banque.
   Aucun écart significatif détecté (> 10%).

```

### Import / Export de données (EF10)

**Import**

- Validation format GIFT complète
- Vérification permissions et extension
- Statistiques par type de question
- Détection questions invalides
- Option d'import dans la banque

**Export**

- Export vers fichier spécifique ou dossier
- Validation du source avant export
- Protection contre écrasement
- Vérification des permissions

**Sécurité**

- Toutes les vérifications nécessaires
- Pas d'écrasement accidentel
- Messages d'erreur clairs
- Validation complète

### Exemples d'utilisation :

```bash
# Valider un fichier GIFT
node index.js importer output/my_exam_2025-12-05.gift

# Importer dans la banque
node index.js importer mon_examen.gift --banque

# Exporter vers un fichier
node index.js exporter output/exam.gift exports/exam_final.gift

# Exporter vers un dossier
node index.js exporter output/exam.gift exports/

```

### Exigences Non Fonctionnelles - Conformité

### ENF01 - Performance

**Exigence :** Répondre rapidement aux requêtes, même avec une banque volumineuse.

**Justification :**

- Parsing optimisé avec regex efficaces (~425 questions en <1s)
- Pas de chargement en mémoire de toute la banque (lecture à la demande)
- Recherche indexée par fichier (parallélisable)
- Opérations courantes (search, stats) : <2 secondes
- Pas de dépendances lourdes ralentissant le démarrage

### ENF02 - Compatibilité

**Exigence :** Compatible Windows, Linux, macOS.

**Justification :**

- Node.js multi-plateforme (testé sur macOS, compatible Windows/Linux)
- Utilisation exclusive de modules Node.js natifs (`fs`, `path`, `readline`)
- Chemins de fichiers gérés avec `path.join()` (portabilité)
- Pas de commandes shell spécifiques à un OS
- Framework CLI (`@caporal/core`) cross-platform

### ENF03 - Sécurité

**Exigence :** Protection des données, stockage sécurisé.

**Justification :**

- Validation stricte des entrées (chemins, emails, formats)
- Vérification des permissions avant lecture/écriture
- Protection contre écrasement accidentel (confirmation requise)
- Pas de stockage de données sensibles en clair
- Fichiers générés avec permissions par défaut du système
- Validation GIFT empêche injection de code malveillant
- Aucune connexion réseau (pas de risque de fuite)

### ENF04 - Maintenabilité

**Exigence :** Code modulaire pour mises à jour faciles.

**Justification :**

- Architecture modulaire : 9 modules indépendants
- Séparation claire des responsabilités (parser, generator, validator...)
- Fonctions exportées réutilisables
- Pas de duplication de code (DRY principle)
- Nommage clair et cohérent
- Chaque module ~100-400 lignes (taille gérable)
- Ajout de nouvelles fonctionnalités sans modifier l'existant

### ENF05 - Accessibilité

**Exigence :** Interface intuitive, documentation claire.

**Justification :**

- CLI avec aide contextuelle (`-help` sur chaque commande)
- Messages d'erreur explicites et actionnables
- Feedback visuel (couleurs, icônes, progression)
- Commandes nommées intuitivement (`search`, `add-question`, `verifier`)
- Guide de démarrage rapide dans README
- Exemples d'utilisation pour chaque commande
- Workflow complet documenté
- Mode interactif pour les opérations complexes (add-question)

### ENF06 - Conformité aux normes

**Exigence :** Respect GIFT et RFC 6350/6868.

**Justification :**

**Format GIFT :**

- Parser conforme à la spécification GIFT (Moodle)
- Support de tous les types : MC, SA, Matching, TrueFalse, Numerical
- Gestion des formats inline et multi-lignes
- Préservation des feedbacks et métadonnées
- Génération compatible Moodle (testé avec imports)

**RFC 6350 (VCard 4.0) :**

- VERSION:4.0 obligatoire
- Champs FN et N conformes
- Format de date ISO 8601 (REV)
- PRODID personnalisé

**RFC 6868 (Encodage) :**

- Line folding à 75 caractères
- Encodage UTF-8
- Échappement des caractères spéciaux

### ENF07 - Extensibilité

**Exigence :** Architecture permettant ajout de fonctionnalités sans refonte.

**Justification :**

- Architecture plugin-ready (modules indépendants)
- Interface CLI extensible (ajout de commandes facile)
- Parser GIFT découple format des traitements
- Système de types de questions extensible
- Modules de profil/comparaison réutilisables
- Exemple : ajout de EF05-EF10 sans modifier EF01-EF04
- Format JSON intermédiaire (`.current_exam.json`) permet ajout de métadonnées
- Pas de couplage fort entre modules

### ENF08 - Documentation technique

**Exigence :** Documentation complète pour développeurs et utilisateurs.

**Justification :**

**Pour utilisateurs finaux :**

- [README.md](http://readme.md/) 
- Guide d'installation
- 25+ exemples d'utilisation
- Workflow complet étape par étape
- Aide contextuelle intégrée (`-help`)

**Pour développeurs :**

- Architecture détaillée avec tous les modules
- Fonctions exportées documentées
- Commentaires dans le code
- Structure du projet claire
- Exemples de formats GIFT
- Exigences système spécifiées

## Informations supplémentaires:

Le format GIFT original que le client avait spécifié était le suivant:

Format GIFT
gift-file = *(question-block / comment)
question-block = question-title question-content question-answers
question-title = "::" question-id "::" *(WSP / VCHAR) CRLF
question-id = 1*(ALPHA / DIGIT / "_")
question-content = *(WSP / VCHAR) CRLF
question-answers = "{" *(answer) "}"
answer = (correct-answer / incorrect-answer) CRLF
correct-answer = "=" answer-text "#" feedback CRLF
incorrect-answer = "~" answer-text "#" feedback CRLF
answer-text = *(WSP / VCHAR)
feedback = *(WSP / VCHAR)
comment = "//" *(WSP / VCHAR) CRLF

Celui ci a du être modifié (et suit la structure indiqué dans la partie EF03) puisque ce format simplifié ne pouvait pas géré les questions qui attendent plusieurs réponses comme les textes à trous.

Le point "EF09 - Gestion des erreurs" n'a pas une partie à part entière, puisque la gestion des erreurs est intégrée des autres fonctionnalités.

Nous voulons également spécifier que nous avons interprété le cahier des charges comme suit:
Pour la génération des examens, nous les exportons en même temps dans le fichier output. Pour simuler un examen, nous importons aussi ce fichier. 
Nous avons quand même réalisé en plus, dans une partie à part la fonctionnalité EF10 d'export et import des examens.

## Auteurs

Ce projet a été conçu et développé par l'équipe **EKIP** dans le cadre de l'unité d'enseignement **GL02** à l'**Université de Technologie de Troyes (UTT)** (Semestre Automne 2025).

Projet développé pour le **SRYEM** (Ministère de l'Éducation nationale de Sealand).

## Licence

Ce code source est mis à disposition sous licence **MIT**.
Vous êtes libre de l'utiliser, le modifier et le distribuer, sous réserve de mentionner les auteurs originaux.