# GIFT CLI - Outil de Gestion des Questions d'Examen

Utilitaire en ligne de commande pour gérer une banque de questions au format GIFT (General Import Format Technology) pour le ministère de l'Éducation nationale de Sealand (SRYEM).

> **[Consultez le Wiki pour la documentation complète](https://github.com/Eylexander/GL02_A25_Ekip/wiki)**

---

## Installation Rapide

```bash
# 1. Naviguez dans le dossier du projet
cd GL02_A25_Ekip

# 2. Installez les dépendances
npm install

# 3. Vérifiez l'installation
node index.js --help
```

**Prérequis :** [Node.js](https://nodejs.org/) 14+ et npm

---

## Documentation

| Document | Description |
|----------|-------------|
| **[Guide Utilisateur](https://github.com/Eylexander/GL02_A25_Ekip/wiki/User-Guide)** | Documentation complète de toutes les commandes (EF01-EF10) avec exemples détaillés |
| **[Guide Développeur](https://github.com/Eylexander/GL02_A25_Ekip/wiki/Developer-Guide)** | Architecture technique, modules, tests et contribution |
| **[Plan de Tests](https://github.com/Eylexander/GL02_A25_Ekip/wiki/Test-Plan)** | Scénarios de validation et résultats des tests |
| **[Page d'accueil du Wiki](https://github.com/Eylexander/GL02_A25_Ekip/wiki)** | Vue d'ensemble de toute la documentation |

---

## Commandes Principales

```bash
# Rechercher des questions
node index.js search MultipleChoice
node index.js stats

# Composer un examen (15-20 questions)
node index.js exam-init "Mon Examen"
node index.js exam-add "fichier.gift" "Titre Question"
node index.js exam-generate "examen.gift"

# Simuler un examen
node index.js simuler output/examen.gift

# Vérifier la qualité
node index.js verifier output/examen.gift

# Analyser et comparer
node index.js profil output/examen.gift
node index.js comparer output/examen.gift
```

---

## Fonctionnalités

| Code | Fonctionnalité | Commande |
|------|----------------|----------|
| EF01 | Recherche de questions | `search`, `stats`, `types` |
| EF02 | Composition d'examen | `exam-init`, `exam-add`, `exam-list` |
| EF03 | Génération GIFT | `exam-generate`, `exam-preview` |
| EF04 | Génération VCard | `vcard-generate` |
| EF05 | Simulation d'examen | `simuler` |
| EF06 | Vérification qualité | `verifier` |
| EF07 | Profil d'examen | `profil` |
| EF08 | Comparaison profils | `comparer` |
| EF10 | Import / Export | `importer`, `exporter` |

---

## Auteurs & Licence

**Équipe EKIP** - Projet GL02, UTT (Automne 2025)  
Développé pour le **SRYEM** (Ministère de l'Éducation de Sealand)

**Licence MIT** - Utilisation libre avec mention des auteurs

---

*Dernière mise à jour : Janvier 2026*
