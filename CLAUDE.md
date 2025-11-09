# PROJET ACLEF Pédagogique





## CONTEXTE CRITIQUE

Application pédagogique pour plublic en situation d'illetrisme et alphabétisation.


## TECHNOLOGIES UTILISÉES

### Framework & Runtime
- **Next.js** 15.4.6 (avec Turbopack pour le développement)
- **React** 19.1.0
- **Node.js**

### Backend & Base de données
- **Supabase** (@supabase/supabase-js ^2.54.0) - PostgreSQL + Auth
- Row Level Security (RLS) activé sur les tables sensibles

### Traitement de texte & Documents
- **hyphenopoly** ^6.0.0 - Syllabification automatique
- **mammoth** ^1.10.0 - Lecture fichiers DOCX
- **pdfjs-dist** ^5.4.149 - Lecture fichiers PDF

### Upload & Parsing de données
- **formidable** ^3.5.4 - Upload de fichiers
- **form-data** ^4.0.4 - Gestion formulaires multipart
- **jszip** ^3.10.1 - Manipulation fichiers ZIP

### Sécurité & Authentification
- **bcryptjs** ^3.0.2 - Hashage des mots de passe
- **jsonwebtoken** ^9.0.2 - Gestion des tokens JWT

### Intelligence Artificielle
- **@google/generative-ai** ^0.24.1 - Génération de quiz avec Gemini

### Styling
- CSS Modules (approche modulaire)
- CSS Global (styles de base)
- Pas de framework CSS lourd (approche native)





## STRUCTURE DU PROJET

### Vue d'ensemble
```
📂 projet-aclef-pédagogie/
├── 📂 pages/              # Routes Next.js
│   ├── _app.js           # Configuration globale de l'application
│   ├── _document.js      # Document HTML personnalisé
│   ├── index.js          # Page d'accueil
│   ├── login.js          # Connexion apprenants
│   ├── dashboard.js      # Tableau de bord apprenant
│   ├── setup.js          # Configuration initiale
│   ├── change-password.js # Changement de mot de passe
│   │
│   ├── 📂 admin/         # Interface administrateur
│   │   ├── index.js      # Dashboard admin
│   │   ├── 📂 lire/      # Gestion module lecture
│   │   │   ├── index.js
│   │   │   ├── valider-corrections.js
│   │   │   ├── signalements-syllabification.js
│   │   │   ├── visualiser-donnees-apprenant.js
│   │   │   ├── vue-donnees-apprenant.js
│   │   │   └── regenerer-syllabes.js
│   │   ├── 📂 quiz/      # Gestion des quiz
│   │   ├── 📂 imagiers/  # Gestion des imagiers
│   │   ├── 📂 formation/ # Module formation
│   │   │   ├── 📂 outils-pedagogiques/
│   │   │   │   ├── 📂 assignations/
│   │   │   │   └── 📂 exercices/
│   │   │   ├── 📂 plans/
│   │   │   ├── 📂 positionnements/
│   │   │   ├── 📂 referentiel/
│   │   │   └── 📂 suivi-pedagogique/
│   │   ├── 📂 code-route/ # Code de la route (vocabulaire + exercices)
│   │   │   ├── 📂 exercice/
│   │   │   └── 📂 vocabulaire/
│   │   ├── 📂 compter/    # Module calcul
│   │   ├── 📂 ecrire/     # Module écriture
│   │   └── 📂 fle/        # Français Langue Étrangère
│   │
│   ├── 📂 lire/          # Module de lecture (apprenant)
│   │   ├── mes-textes-references.js
│   │   ├── voir-mes-textes.js
│   │   ├── creer-texte.js
│   │   ├── creer-texte-manuel.js
│   │   ├── enregistrer-texte.js
│   │   ├── importer-texte.js
│   │   ├── 📂 modifier-texte/
│   │   │   └── [id].js
│   │   │
│   │   ├── monosyllabes-multisyllabes.js
│   │   ├── segmentation-choix.js
│   │   ├── segmentation-syllabes.js
│   │   ├── segmentation-import.js
│   │   │
│   │   ├── syllabes-paniers.js  # ⭐ Gestion paniers de syllabes
│   │   ├── voir-paniers.js
│   │   │
│   │   ├── 📂 mes-syllabes-mots/  # Exercices syllabes & mots
│   │   │   ├── classement.js
│   │   │   ├── ou-est.js
│   │   │   ├── quest-ce.js
│   │   │   ├── dictee-vocale.js
│   │   │   └── dictee-vocale-vosk.js
│   │   │
│   │   ├── je-joue-syllabes.js
│   │   ├── syllabes-jeu-1.js    # 🎮 Jeux de syllabes
│   │   ├── syllabes-jeu-2.js    # (11 jeux au total)
│   │   ├── syllabes-jeu-3.js
│   │   ├── syllabes-jeu-4.js
│   │   ├── syllabes-jeu-5.js
│   │   ├── syllabes-jeu-6.js
│   │   ├── syllabes-jeu-7.js
│   │   ├── syllabes-jeu-8.js
│   │   ├── syllabes-jeu-9.js
│   │   ├── syllabes-jeu-10.js
│   │   ├── syllabes-jeu-11.js
│   │   │
│   │   ├── 📂 construis-phrases/  # ⭐ Construction de phrases
│   │   │   ├── index.js
│   │   │   ├── tranquille.js
│   │   │   ├── difficile.js
│   │   │   └── defi.js
│   │   │
│   │   ├── 📂 dictees-recherche/  # Dictées & recherche
│   │   │   ├── auto-evaluation.js
│   │   │   └── evaluation.js
│   │   ├── dictees-recherche.js
│   │   │
│   │   ├── ecoute-et-trouve.js  # ⭐ Jeu écoute & reconnaissance
│   │   ├── lis-et-trouve.js     # ⭐ Jeu lecture & reconnaissance
│   │   ├── ou-est-ce.js
│   │   ├── quest-ce.js
│   │   ├── reconnaitre-les-mots.js
│   │   ├── remettre-dans-ordre.js
│   │   ├── recolte-syllabes.js
│   │   ├── stats-completion.js
│   │   │
│   │   └── 📂 texte/
│   │       └── [id].js
│   │
│   ├── 📂 imagiers/      # Gestion des imagiers
│   ├── 📂 quizz/         # Système de quiz
│   │   ├── 📂 play/
│   │   └── 📂 quiz/
│   ├── 📂 exercices/     # Exercices assignés
│   │   └── 📂 realiser/
│   ├── 📂 code-route/    # Code de la route (apprenant)
│   │
│   └── 📂 api/           # Routes API
│       ├── 📂 admin/     # APIs administrateur
│       │   ├── apprenants-list.js
│       │   ├── 📂 donnees-apprenant/
│       │   │   └── [id].js
│       │   ├── 📂 vue-donnees-apprenant/
│       │   ├── appliquer-correction.js
│       │   ├── signalement-syllabification.js
│       │   ├── 📂 code-route/
│       │   │   ├── 📂 exercices/
│       │   │   └── 📂 vocabulaire/
│       │   └── 📂 formation/
│       │       ├── 📂 categories/
│       │       ├── 📂 categories-outils/
│       │       ├── 📂 competences/
│       │       ├── 📂 domaines/
│       │       ├── 📂 exercices/
│       │       │   └── 📂 assignations/
│       │       ├── 📂 plans/
│       │       │   └── 📂 [id]/
│       │       ├── 📂 positionnements/
│       │       │   └── 📂 [id]/
│       │       └── 📂 suivi-apprenant/
│       │
│       ├── 📂 auth/      # Authentification
│       │   └── 📂 apprenant/
│       ├── 📂 apprenants/
│       ├── 📂 textes/    # Gestion des textes
│       │   ├── 📂 get/
│       │   ├── 📂 modifier/
│       │   ├── 📂 supprimer/
│       │   └── 📂 supprimer-simple/
│       ├── 📂 mots-classifies/  # Classification mono/multi
│       ├── 📂 syllabification/  # Segmentation syllabique
│       │   └── coupe-mots.js
│       ├── 📂 corrections/
│       ├── 📂 enregistrements/
│       │   └── 📂 delete/
│       ├── 📂 enregistrements-groupes/
│       ├── 📂 enregistrements-mots/
│       │   └── 📂 delete/
│       ├── 📂 imagiers/
│       │   └── 📂 delete/
│       ├── 📂 paniers/
│       ├── 📂 phrases/
│       ├── 📂 quiz/
│       ├── 📂 quizz/
│       ├── 📂 exercices/
│       │   └── 📂 assignation/
│       ├── 📂 code-route/
│       ├── 📂 syllabes-mots/
│       ├── 📂 mots/
│       ├── 📂 sessions/
│       ├── 📂 speech/
│       ├── 📂 dictionnaire/
│       ├── 📂 debug/
│       ├── 📂 setup/
│       └── 📂 exercises/
│
├── 📂 components/        # Composants React
│   ├── AIQuizGenerator.js      # Génération quiz par IA
│   ├── AIQuizModifier.js       # Modification quiz
│   ├── QuizPlayer.js           # Lecteur de quiz
│   ├── QuizPlayerMatching.js   # Lecteur quiz type appariement
│   ├── QuizPlayerOrdering.js   # Lecteur quiz type ordre
│   ├── AudioButton.js          # Lecture audio
│   ├── VoiceRecorder.js        # ⭐ Enregistrement vocal (nov 2024)
│   ├── CSVUploader.js          # Upload CSV
│   ├── CSVPreview.js           # Prévisualisation CSV
│   ├── ImageUpload.js          # Upload d'images
│   ├── CategorySelector.js     # Sélection catégories
│   ├── TemplateDownloader.js   # Téléchargement templates
│   ├── EnhancedErrorDisplay.js # Affichage erreurs
│   ├── 📂 QuestionTypes/       # Types de questions quiz
│   │   ├── MultipleChoiceEditor.js
│   │   ├── MatchingEditor.js
│   │   ├── NumericEditor.js
│   │   └── OrderingEditor.js
│   └── 📂 formation/           # Composants module formation
│
├── 📂 lib/               # Bibliothèques utilitaires
│   ├── supabaseClient.js       # Client Supabase standard
│   ├── supabaseAdmin.js        # Client Supabase admin (service role)
│   ├── jwt.js                  # Gestion tokens JWT
│   ├── csv-parser.js           # Parsing CSV
│   ├── csv-parser-simple.js    # Parsing CSV simplifié
│   ├── csv-parser-ultra-simple.js
│   ├── excel-parser.js         # Parsing Excel
│   ├── wordAnalyzer.js         # Analyse de mots
│   └── convertNumbers.js       # Conversion nombres
│
├── 📂 data/              # Données CSV et vocabulaire
│   └── French top 10,000 words with links - 10,000 words.csv
│
├── 📂 scripts/           # Scripts utilitaires
├── 📂 supabase/          # Configuration Supabase
│   └── 📂 migrations/    # Migrations SQL structurées
│       ├── 20250121000000_create_enregistrements_groupes.sql
│       ├── 20250920171356_create_quiz_tables.sql
│       ├── 20251006000000_create_vocabulaire_code_route.sql
│       ├── 20251007000000_create_quiz_assignments.sql
│       ├── 20251010000000_create_formation_tables.sql
│       ├── 20251010000001_seed_formation_data.sql
│       ├── 20251010000002_adapt_formation_plans.sql
│       ├── 20251010000003_create_formation_exercices.sql
│       ├── 20251010000004_create_categories_outils.sql
│       ├── 20251010000005_create_exercices_code_route.sql
│       ├── 20251029120000_add_shared_to_imagiers.sql
│       └── create-enregistrements-mots-table.sql
├── 📂 styles/            # Styles CSS globaux et modules
├── 📂 types/             # Définitions TypeScript
├── 📂 utils/             # Fonctions utilitaires
├── 📂 tasks/             # Suivi des tâches
├── 📂 DEV/               # Journal de développement
│   └── DEV.md
├── 📂 docs/              # Documentation additionnelle
│
├── 📄 package.json       # Dépendances npm
├── 📄 next.config.mjs    # Configuration Next.js
├── 📄 .env.local         # Variables d'environnement (gitignored)
├── 📄 .gitignore         # Fichiers ignorés par Git
├── 📄 .mcp.json          # Configuration serveurs MCP
├── 📄 CLAUDE.md          # Ce fichier - Instructions Claude
├── 📄 Règles.md          # Règles de travail strictes
├── 📄 ARCHITECTURE-DONNEES.md
├── 📄 ANALYSE-SUIVI-PEDAGOGIQUE.md
└── 📄 SUIVI-PEDAGOGIQUE-README.md

```

### Parcours Pédagogique (Flow de données)
```
APPRENANT → TEXTES → GROUPES DE SENS → MOTS → SYLLABES → PANIERS → EXERCICES
```

1. **Création texte** (`textes_references`) - L'apprenant oralise/importe/crée son texte
2. **Découpage** (`groupes_sens`) - Division en unités de sens
3. **Classification** (`mots_classifies`) - Mots mono/multisyllabes
4. **Segmentation** (API syllabification) - Découpe en syllabes
5. **Organisation** (Paniers en mémoire) - Regroupement par similarité
6. **Exercices** - 11 jeux de syllabes + construction phrases + dictées
7. **Évaluation** - Stats de complétion et progression

### Tables de Base de Données Principales

**Module LIRE (Lecture & Syllabification):**
- **`users`** - Apprenants et administrateurs
- **`textes_references`** - Textes oralisés/importés par les apprenants
- **`groupes_sens`** - Groupes de mots qui font sens ensemble
- **`mots_classifies`** - Mots classifiés mono/multisyllabes
- **`signalements_syllabification`** - Signalements d'erreurs
- **`corrections_syllabification`** - Corrections centralisées (appliquées à TOUS)
- **`enregistrements_groupes`** - Enregistrements audio des groupes de sens
- **`enregistrements_mots`** - Enregistrements audio des mots
- **`paniers`** - Organisation des syllabes en paniers

**Module QUIZ:**
- **`quiz`** - Définitions des quiz
- **`quiz_questions`** - Questions des quiz
- **`quiz_assignments`** - Assignations de quiz aux apprenants

**Module IMAGIERS:**
- **`imagiers`** - Collections d'imagiers (avec flag `shared` pour partage)

**Module FORMATION:**
- **`formation_domaines`** - Domaines de compétences
- **`formation_categories`** - Catégories de compétences
- **`formation_competences`** - Compétences détaillées
- **`formation_plans`** - Plans de formation personnalisés
- **`formation_positionnements`** - Évaluations de positionnement
- **`formation_exercices`** - Exercices pédagogiques
- **`formation_categories_outils`** - Catégories d'outils pédagogiques

**Module CODE-ROUTE:**
- **`vocabulaire_code_route`** - Vocabulaire code de la route
- **`exercices_code_route`** - Exercices code de la route

### Système de Corrections Centralisées ⭐

**Principe clé:** Les corrections validées par admin (`valide_par_admin = true`) s'appliquent automatiquement à **TOUS** les apprenants.

**Priorité des données:**
1. Corrections centralisées (`valide_par_admin = true`)
2. Mots de l'apprenant pour ce texte (`valide_par_admin = false`)
3. ~~Fallbacks~~ (SUPPRIMÉS - plus de données cachées)

### Modules Pédagogiques Détaillés

#### 🎯 Module LIRE (Lecture & Apprentissage)

**Création & Gestion de Textes:**
- Création manuelle, orale (enregistrement), ou import (DOCX, PDF)
- Modification et suppression de textes
- Visualisation de tous les textes de l'apprenant

**Segmentation & Classification:**
- Découpage en groupes de sens (unités significatives)
- Classification mono/multisyllabes
- Segmentation syllabique automatique (Hyphenopoly)

**Jeux & Exercices (11 jeux de syllabes):**
- `syllabes-jeu-1.js` à `syllabes-jeu-11.js` - Gamification de l'apprentissage
- `je-joue-syllabes.js` - Interface de sélection des jeux
- `ecoute-et-trouve.js` - ⭐ Reconnaissance auditive
- `lis-et-trouve.js` - ⭐ Reconnaissance visuelle
- `construis-phrases/` - Construction de phrases (3 niveaux: tranquille, difficile, défi)
- `dictees-recherche/` - Dictées avec auto-évaluation

**Organisation & Révision:**
- `syllabes-paniers.js` - Organisation en paniers thématiques
- `voir-paniers.js` - Visualisation des paniers
- `recolte-syllabes.js` - Collecte de syllabes
- `stats-completion.js` - Statistiques de progression

#### 📚 Module QUIZ

**Administration:**
- Création de quiz via IA (Google Gemini)
- 4 types de questions: QCM, Appariement, Numérique, Ordre
- Modification et gestion des quiz existants

**Apprenant:**
- Lecture de quiz assignés
- Enregistrement des résultats
- Suivi de progression

#### 🖼️ Module IMAGIERS

- Création d'imagiers personnels ou partagés
- Upload d'images avec catégorisation
- Gestion CSV pour import/export massif

#### 🎓 Module FORMATION (Suivi Pédagogique)

**Référentiel de compétences:**
- Domaines → Catégories → Compétences
- Structure hiérarchique complète

**Plans de formation:**
- Création de plans personnalisés par apprenant
- Suivi des objectifs et échéances

**Positionnements:**
- Évaluations initiales et continues
- Suivi de l'évolution

**Exercices & Outils:**
- Bibliothèque d'exercices pédagogiques
- Assignations personnalisées
- Catégories d'outils pédagogiques

#### 🚗 Module CODE-ROUTE

- Vocabulaire spécifique code de la route
- Exercices thématiques
- Gestion admin et réalisation apprenant

### Pages Critiques à NE PAS MODIFIER sans permission

- `/lire/mes-syllabes.js` - Innovation pédagogique (paniers)
- `/lire/monosyllabes-multisyllabes.js` - Classification
- `/lire/ecoute-et-trouve.js` - Jeu reconnaissance auditive
- `/lire/lis-et-trouve.js` - Jeu reconnaissance visuelle
- `/admin/lire/valider-corrections.js` - Système corrections
- `/api/syllabification/coupe-mots.js` - Segmentation syllabique


## MA MÉTHODE DE TRAVAIL

1. Je décris CE QUE je veux (pas comment)
2. Tu me proposes UN SEUL fichier à modifier
3. Tu me montres EXACTEMENT ce que tu vas changer
4. J'approuve ou je refuse
5. Tu modifies UN SEUL fichier
6. On teste
7. On passe au suivant


