# GIFT CLI - Outil de Gestion des Questions d'Examen

Un utilitaire en ligne de commande pour gérer une banque de questions au format GIFT (General Import Format Technology) pour le ministère de l'Éducation nationale de Sealand (SRYEM).

## 📋 Description

Cet outil permet aux enseignants et gestionnaires de :
- Rechercher et visualiser des questions dans la banque certifiée
- Analyser les statistiques de la banque de questions
- Filtrer par type de question et mots-clés
- Composer des examens conformes aux normes GIFT

## 🚀 Installation

```bash
npm install
```

## 📚 Utilisation

### Commande de recherche (EF01)

Rechercher et visualiser des questions de la banque :

```bash
# Rechercher tous les types de questions
node index.js search

# Rechercher par type
node index.js search MultipleChoice
node index.js search ShortAnswer
node index.js search Matching

# Rechercher avec un mot-clé
node index.js search "" "adverb"
node index.js search ShortAnswer "adverb"

# Options avancées
node index.js search MultipleChoice -v          # Mode verbose (affiche les réponses)
node index.js search ShortAnswer -l 5           # Limite à 5 résultats
node index.js search -d ./data                  # Spécifier un autre répertoire
```

#### Options de recherche

- `-v, --verbose` : Affiche les réponses détaillées pour chaque question
- `-l, --limit <nombre>` : Limite le nombre de résultats affichés
- `-d, --dataDir <dir>` : Spécifie le répertoire contenant les fichiers GIFT (défaut: `./data`)

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

## 📊 Types de Questions Supportés

Le parser reconnaît automatiquement les types suivants :

| Type | Description | Exemple GIFT |
|------|-------------|--------------|
| **MultipleChoice** | Questions à choix multiples | `{~wrong~=correct~wrong}` ou `{1:MC:~=correct~wrong}` |
| **ShortAnswer** | Questions à réponse courte | `{=answer1 =answer2}` ou `{1:SA:=answer}` |
| **Matching** | Questions d'association | `{=item1->match1 =item2->match2}` |
| **TrueFalse** | Questions vrai/faux | `{TRUE}` ou `{FALSE}` |
| **Numerical** | Questions numériques | `{#42}` |
| **Unknown** | Type non reconnu | - |

## 🏗️ Architecture

### Structure du Projet

```
projet/
├── index.js           # Interface CLI (Caporal)
├── giftParser.js      # Parser GIFT et fonctions de recherche
├── data/              # Banque de questions GIFT
├── package.json       # Dépendances
└── README.md          # Documentation
```

### Modules Principaux

#### `giftParser.js`

Fonctions exportées :
- `parseGiftFile(filePath)` : Parse un fichier GIFT et extrait les questions
- `searchQuestions(dataDir, type, keyword)` : Recherche des questions selon critères
- `getQuestionStats(dataDir)` : Calcule les statistiques de la banque
- `getAvailableTypes(dataDir)` : Liste tous les types de questions disponibles

#### `index.js`

Commandes CLI :
- `search [type] [keyword]` : Recherche et visualisation (EF01)
- `stats` : Affichage des statistiques
- `types` : Liste des types disponibles

## 📝 Format GIFT

Les fichiers GIFT sont structurés comme suit :

```gift
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
```gift
::Q1::Quelle est la capitale de la France? {
  ~Londres
  =Paris
  ~Berlin
  ~Madrid
}
```

**Short Answer:**
```gift
::Q2::Complétez la phrase. {
  =réponse correcte
  =autre réponse correcte
}
```

**Matching:**
```gift
::Q3::Associez les éléments. {
  =France -> Paris
  =Allemagne -> Berlin
  =Italie -> Rome
}
```

## 🎯 Conformité aux Exigences

### Exigences Fonctionnelles Implémentées

- ✅ **EF01** : Recherche et visualisation des questions
  - Recherche par type de question
  - Recherche par mots-clés
  - Affichage détaillé ou simplifié
  - Filtres multiples combinables

### Exigences Non Fonctionnelles

- ✅ **ENF02** : Compatible avec Windows, Linux, macOS (Node.js)
- ✅ **ENF04** : Code modulaire et maintenable
- ✅ **ENF05** : Interface CLI intuitive avec aide contextuelle
- ✅ **ENF06** : Respect des normes GIFT
- ✅ **ENF07** : Architecture extensible

## 📈 Statistiques de la Banque Actuelle

- **47 fichiers** GIFT
- **480 questions** au total
- **~10 questions** par fichier en moyenne

Répartition par type :
- MultipleChoice: 47.1% (226 questions)
- ShortAnswer: 37.5% (180 questions)
- Unknown: 12.9% (62 questions)
- Matching: 2.5% (12 questions)

### Commandes de composition d'examen (EF02)

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

#### Contraintes de composition

- **Minimum** : 15 questions
- **Maximum** : 20 questions
- **Unicité** : Aucune question dupliquée
- Les questions sont stockées dans `.current_exam.json` (fichier temporaire)

#### Gestion des erreurs

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

#### Format du fichier généré

Le fichier GIFT généré contient :
- **En-tête** : Métadonnées (titre, date, nombre de questions)
- **Questions** : Au format GIFT standard avec commentaires
- **Pied de page** : Résumé de l'examen

Exemple de sortie :

```gift
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

#### Gestion des erreurs de génération

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
node index.js vcard-generate \
  --firstName Jean \
  --lastName Dupont \
  --email jean.dupont@sryem.se \
  --phone "+46 123 456 789"

# Générer avec toutes les informations
node index.js vcard-generate \
  --firstName "Dr. Marie" \
  --lastName Martin \
  --email marie.martin@sryem.se \
  --phone "+46 12 345 6789" \
  --mobile "+46 70 123 4567" \
  --organization "SRYEM" \
  --department "Département d'anglais" \
  --title "Professeur d'anglais" \
  --role "Responsable pédagogique" \
  --city "Sealand City" \
  --country "Sealand" \
  --note "Spécialiste en évaluation" \
  -o ./vcards

# Aperçu de la VCard sans la sauvegarder
node index.js vcard-preview \
  --firstName Jean \
  --lastName Dupont \
  --email jean.dupont@sryem.se

# Forcer l'écrasement d'un fichier existant
node index.js vcard-generate --firstName Jean --lastName Dupont -f
```

#### Champs VCard disponibles

| Champ | Option | Obligatoire | Description |
|-------|--------|-------------|-------------|
| Prénom | `--firstName` | ✓ | Prénom de l'enseignant |
| Nom | `--lastName` | ✓ | Nom de famille |
| Email | `--email` | | Adresse email (validée) |
| Téléphone | `--phone` | | Numéro de téléphone professionnel |
| Mobile | `--mobile` | | Numéro de téléphone portable |
| Organisation | `--organization` | | Établissement (défaut: SRYEM) |
| Département | `--department` | | Service/département |
| Titre | `--title` | | Fonction (défaut: Enseignant) |
| Rôle | `--role` | | Rôle professionnel |
| Ville | `--city` | | Ville |
| Pays | `--country` | | Pays (défaut: Sealand) |
| Note | `--note` | | Informations complémentaires |

#### Format VCard généré

Conforme à **RFC 6350** (vCard 4.0) et **RFC 6868** (encodage des paramètres) :

```vcard
BEGIN:VCARD
VERSION:4.0
FN:Jean Dupont
N:Dupont;Jean;;;
EMAIL;TYPE=work:jean.dupont@sryem.se
TEL;TYPE=work,voice:+46 123 456 789
ORG:SRYEM - Ministère de l'Éducation nationale de Sealand
TITLE:Enseignant
REV:20251124T123730Z
PRODID:-//SRYEM//GIFT CLI VCard Generator//FR
END:VCARD
```

**Fonctionnalités RFC :**
- ✓ Line folding (lignes > 75 caractères)
- ✓ Encodage des caractères spéciaux (RFC 6868)
- ✓ Format de date ISO 8601 pour REV
- ✓ Types de propriétés standards (work, cell, etc.)

#### Gestion des erreurs VCard

- ✗ **Champ manquant** : "Le nom de famille de l'enseignant est obligatoire. Veuillez le spécifier."
- ✗ **Email invalide** : "L'email fourni n'est pas valide. Veuillez utiliser un format standard (ex. : nom@domaine.se)."
- ✗ **Téléphone invalide** : "Le numéro de téléphone fourni n'est pas valide."
- ✗ **Permission refusée** : "Impossible d'écrire le fichier. Vérifiez les permissions du dossier."
- ✗ **Fichier existe** : "Le fichier existe déjà. Utilisez --force pour écraser."

## 🔧 Dépendances

- `@caporal/core` : Framework CLI
- `chalk` : Colorisation des sorties terminal
- `fs` / `path` : Gestion des fichiers (built-in Node.js)

## 🚧 Prochaines Étapes

### Fonctionnalités implémentées

- ✅ **EF01** : Recherche et visualisation ✓ COMPLET
- ✅ **EF02** : Sélection et composition d'examens ✓ COMPLET
- ✅ **EF03** : Génération de fichiers GIFT ✓ COMPLET
- ✅ **EF04** : Création de fichiers VCard (RFC 6350/6868) ✓ COMPLET
- ✅ **EF06** : Vérification de la qualité (unicité, 15-20 questions) ✓ COMPLET
- ✅ **EF09** : Gestion des erreurs ✓ COMPLET

### Fonctionnalités restantes

- **EF05** : Simulation de passation d'examens
- **EF07** : Profil des examens (histogrammes)
- **EF08** : Comparaison des profils
- **EF10** : Import/Export de données

## 👥 Auteurs

Projet développé pour le SRYEM (Ministère de l'Éducation nationale de Sealand)

## 📄 Licence

À définir selon les politiques du SRYEM

