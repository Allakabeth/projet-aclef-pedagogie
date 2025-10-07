# PROJET ACLEF Pédagogique





## CONTEXTE CRITIQUE

Application pédagogique pour plublic en situation d'illetrisme et alphabétisation.


IMPORTANTE : Cette app FONCTIONNE. Ne pas tout refaire.



## RÈGLES ABSOLUES

1. **JAMAIS modifier le code existant sans permission explicite**
2. **TOUJOURS demander avant de refactorer**
3. **JAMAIS coder en dur des données**
4. **JAMAIS ajouter de fallbacks cachés**
5. **Si tu ne comprends pas, DEMANDE. Ne devine pas.**
6. 

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
├── 📂 pages/              # 143 fichiers - Routes Next.js
│   ├── _app.js           # Configuration globale de l'application
│   ├── _document.js      # Document HTML personnalisé
│   ├── index.js          # Page d'accueil
│   ├── login.js          # Connexion apprenants
│   ├── dashboard.js      # Tableau de bord apprenant
│   ├── setup.js          # Configuration initiale
│   │
│   ├── 📂 admin/         # Interface administrateur
│   │   ├── index.js      # Dashboard admin
│   │   ├── 📂 lire/      # Gestion module lecture
│   │   │   ├── valider-corrections.js
│   │   │   ├── signalements-syllabification.js
│   │   │   ├── visualiser-donnees-apprenant.js
│   │   │   ├── vue-donnees-apprenant.js
│   │   │   └── regenerer-syllabes.js
│   │   ├── 📂 quiz/      # Gestion des quiz
│   │   ├── 📂 imagiers/  # Gestion des imagiers
│   │   ├── 📂 formation/ # Module formation
│   │   └── 📂 fle/       # Français Langue Étrangère
│   │
│   ├── 📂 lire/          # Module de lecture (apprenant)
│   │   ├── mes-textes-references.js
│   │   ├── monosyllabes-multisyllabes.js
│   │   ├── segmentation-choix.js
│   │   ├── segmentation-syllabes.js
│   │   ├── segmentation-import.js
│   │   └── mes-syllabes.js  # ⭐ INNOVATION : Organisation en paniers
│   │
│   ├── 📂 imagiers/      # Gestion des imagiers
│   ├── 📂 quizz/         # Système de quiz
│   │
│   └── 📂 api/           # Routes API
│       ├── 📂 admin/     # APIs administrateur
│       │   ├── apprenants-list.js
│       │   ├── donnees-apprenant/[id].js
│       │   ├── appliquer-correction.js
│       │   └── signalement-syllabification.js
│       ├── 📂 auth/      # Authentification
│       ├── 📂 textes/    # Gestion des textes
│       ├── 📂 mots-classifies/  # Classification mono/multi
│       └── 📂 syllabification/  # Segmentation syllabique
│
├── 📂 components/        # 14 composants React
│   ├── AIQuizGenerator.js      # Génération quiz par IA
│   ├── AIQuizModifier.js       # Modification quiz
│   ├── QuizPlayer.js           # Lecteur de quiz
│   ├── AudioButton.js          # Lecture audio
│   ├── CSVUploader.js          # Upload CSV
│   ├── CSVPreview.js           # Prévisualisation CSV
│   ├── ImageUpload.js          # Upload d'images
│   ├── CategorySelector.js     # Sélection catégories
│   ├── TemplateDownloader.js   # Téléchargement templates
│   ├── EnhancedErrorDisplay.js # Affichage erreurs
│   └── 📂 QuestionTypes/       # Types de questions quiz
│       ├── MultipleChoiceEditor.js
│       ├── MatchingEditor.js
│       ├── NumericEditor.js
│       └── OrderingEditor.js
│
├── 📂 lib/               # 8 bibliothèques utilitaires
│   ├── supabaseClient.js       # Client Supabase standard
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
├── 📂 styles/            # Styles CSS globaux et modules
├── 📂 types/             # Définitions TypeScript
├── 📂 utils/             # Fonctions utilitaires
│
├── 📄 package.json       # Dépendances npm
├── 📄 next.config.mjs    # Configuration Next.js
├── 📄 .env.local         # Variables d'environnement (gitignored)
├── 📄 .gitignore         # Fichiers ignorés par Git
│
└── 📄 Documentation SQL
    ├── database-schema.sql                    # Schéma complet
    ├── setup-corrections-system.sql           # Système corrections
    ├── create-signalements-table.sql          # Table signalements
    ├── add-missing-fields.sql                 # Ajout champs
    └── ARCHITECTURE-DONNEES.md                # 📖 Doc architecture

```

### Parcours Pédagogique (Flow de données)
```
APPRENANT → TEXTES → GROUPES DE SENS → MOTS → SYLLABES → PANIERS
```

1. **Création texte** (`textes_references`) - L'apprenant oralise son texte
2. **Découpage** (`groupes_sens`) - Division en unités de sens
3. **Classification** (`mots_classifies`) - Mots mono/multisyllabes
4. **Segmentation** (API syllabification) - Découpe en syllabes
5. **Organisation** (Paniers en mémoire) - Regroupement par similarité

### Tables de Base de Données Principales

- **`users`** - Apprenants et administrateurs
- **`textes_references`** - Textes oralisés par les apprenants
- **`groupes_sens`** - Groupes de mots qui font sens ensemble
- **`mots_classifies`** - Mots classifiés mono/multisyllabes
- **`signalements_syllabification`** - Signalements d'erreurs
- **`corrections_syllabification`** - Corrections centralisées (appliquées à TOUS)

### Système de Corrections Centralisées ⭐

**Principe clé:** Les corrections validées par admin (`valide_par_admin = true`) s'appliquent automatiquement à **TOUS** les apprenants.

**Priorité des données:**
1. Corrections centralisées (`valide_par_admin = true`)
2. Mots de l'apprenant pour ce texte (`valide_par_admin = false`)
3. ~~Fallbacks~~ (SUPPRIMÉS - plus de données cachées)

### Pages Critiques à NE PAS MODIFIER sans permission

- `/lire/mes-syllabes.js` - Innovation pédagogique (paniers)
- `/lire/monosyllabes-multisyllabes.js` - Classification
- `/admin/lire/valider-corrections.js` - Système corrections
- `/api/syllabification/coupe-mots.js` - Segmentation syllabique





## ERREURS À NE PLUS JAMAIS RÉPÉTER

* Casser la base de données
* Refaire le design sans sauvegarder
* Ajouter des fonctionnalités non demandées
* Modifier plusieurs fichiers à la fois



## MA MÉTHODE DE TRAVAIL

1. Je décris CE QUE je veux (pas comment)
2. Tu me proposes UN SEUL fichier à modifier
3. Tu me montres EXACTEMENT ce que tu vas changer
4. J'approuve ou je refuse
5. Tu modifies UN SEUL fichier
6. On teste
7. On passe au suivant



## REGLES À SUIVRE



1. Réfléchis d'abord au problème, lis le code source pour trouver les fichiers pertinents et rédige un plan dans tasks/todo.md.
2. Ce plan doit contenir une liste de tâches à effectuer que tu peux cocher au fur et à mesure de leur exécution.
3. Avant de commencer, demande-moi pour que je vérifie le plan.
4. Commence ensuite à travailler sur les tâches à effectuer, en les marquant comme terminées au fur et à mesure.
5. À chaque étape veille à me fournir une explication détaillée des modifications que tu as apportées.
6. Simplifie au maximum chaque tâche et modification de code. Nous souhaitons éviter les modifications massives ou complexes. Chaque modification doit avoir un impact minimal sur le code. Tout est une question de simplicité.
7. Enfin, ajoute une section de révision au fichier todo.md avec un résumé des modifications apportées et toute autre information pertinente.
8. NE SOIS PAS PARESSEUX. NE SOIS JAMAIS PARESSEUX. EN CAS DE BUG, ​​TROUVE-EN LA CAUSE ET CORRIGE-LA. Pas de correctifs temporaires. Tu es un développeur senior. Ne sois jamais paresseux.
9. Simplifie au maximum les correctifs et les modifications de code. Ils ne doivent affecter que le code nécessaire à la tâche et rien d'autre. Ils doivent avoir le moins d'impact possible sur le code. Ton objectif est de ne pas introduire de bugs. La simplicité est primordiale.



## QUAND JE DIS "STOP"



Tu arrêtes immédiatement. Tu ne finis pas ta phrase.
Tu ne "corriges" pas une dernière chose.
ESSENTIEL : Lors du débogage, il est impératif de suivre l'intégralité du flux de code, étape par étape. Sans hypothèses ni raccourcis.



