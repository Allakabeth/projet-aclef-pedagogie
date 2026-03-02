# Cahier des Charges - Application Python de Suivi de Formation

## 1. Contexte et Objectifs

### 1.1 Contexte
L'association ACLEF accompagne des adultes en situation d'illettrisme et d'alphabétisation. Les formatrices ont besoin d'un outil **simple et indépendant** pour gérer le suivi pédagogique des apprenants, sans dépendre d'une application web.

### 1.2 Objectifs
- **Autonomie** : Application fonctionnant en local, sans connexion internet
- **Simplicité** : Interface intuitive adaptée à un usage quotidien
- **Portabilité** : Possibilité de travailler à domicile et synchroniser au bureau
- **Pérennité** : Données exportables, pas de dépendance à un service externe

### 1.3 Utilisateurs
- 2 formatrices (travail au bureau et à domicile)
- Stockage des données sur le réseau du travail

---

## 2. Fonctionnalités Attendues

### 2.1 Gestion des Apprenants
| Fonction | Description |
|----------|-------------|
| Créer une fiche apprenant | Nom, prénom, date naissance, date entrée, coordonnées |
| Modifier/Archiver | Mise à jour des informations, archivage des sortants |
| Recherche | Recherche par nom, par profil, par formateur |

### 2.2 Outils de Positionnement
| Fonction | Description |
|----------|-------------|
| Lister les outils | Catalogue des outils d'évaluation disponibles |
| Créer un positionnement | Évaluation initiale d'un apprenant |
| Évaluer par domaine | Grille d'évaluation des compétences |
| Détecter le profil | Suggestion automatique du profil basée sur les évaluations |
| Historique | Conserver les positionnements successifs |

### 2.3 Référentiel de Compétences

#### 2.3.1 Domaines (6)
| Domaine | Emoji | Description |
|---------|-------|-------------|
| Communication orale | 🗣️ | Compréhension et expression orale |
| Lecture | 📖 | Déchiffrage, compréhension écrite |
| Écriture | ✍️ | Production écrite |
| Mathématiques | 🔢 | Calcul, raisonnement logique |
| Bureautique | 💻 | Traitement de texte, tableur |
| Internet | 🌐 | Navigation, démarches en ligne |

#### 2.3.2 Catégories de Compétences
| Domaine | Catégories |
|---------|------------|
| Communication orale | Compréhension orale, Expression orale, Interaction |
| Lecture | Acquisition, Suite, Textes références |
| Écriture | Acquisition, Suite |
| Mathématiques | Numération, Opérations, Fractions, Proportionnalité, Espace, Mesure, Temps |
| Bureautique | Bases informatiques, Gestion fichiers, Traitement texte, Tableur, Présentation |
| Internet | Bases Internet, Navigation web, Messagerie, Démarches en ligne, Sécurité |

#### 2.3.3 Sous-compétences
Chaque catégorie contient des compétences détaillées avec :
- Code unique (ex: LECT-ACQ-01)
- Intitulé
- Description
- Niveau de difficulté (degré ANLCI 1-4)

### 2.4 Profils Apprenants

#### 2.4.1 Types de Public et Profils (29 profils)
| Type | Profils | Degrés ANLCI |
|------|---------|--------------|
| **FLE** | A1 (Grand Débutant), A2 (Élémentaire), A3 (Intermédiaire) | 1-3 |
| **Illettrisme** | B1, B2, BA (Bonnes Acquisitions) | 1-4 |
| **Lecture** | GD (Grand Débutant), PD (Petit Débutant), D (Déchiffreur), PLNS, LPS | 1-4 |
| **Écriture** | GD, PD, D, PLNS, LPS | 1-4 |
| **Maths** | M0, M1, M2, M3, M4 | 1-4 |
| **Bureautique** | N0, N1, N2A, N2B | 1-4 |
| **Internet** | I0, I1, I2, I3 | 1-4 |

#### 2.4.2 Informations par Profil
- Code et nom
- Description
- Caractéristiques typiques
- Besoins de formation
- Couleur d'affichage
- Étapes de parcours recommandées

### 2.5 Plan de Formation
| Fonction | Description |
|----------|-------------|
| Créer un plan | Basé sur le positionnement initial |
| Définir les objectifs | Objectif principal, compétences ciblées |
| Planifier la durée | Date début, date fin prévue |
| Sélectionner les étapes | Étapes de parcours adaptées au profil |
| Associer les outils | Exercices et outils pédagogiques |

#### 2.5.1 Étapes de Parcours
Chaque profil a des étapes définies avec :
- Numéro d'étape
- Objectifs lecture
- Objectifs écriture
- Durée estimée (min-max en heures)
- Indicateurs de réussite
- Outils recommandés

### 2.6 Outils de Formation
| Fonction | Description |
|----------|-------------|
| Catalogue | Liste des exercices et supports pédagogiques |
| Par compétence | Filtrer par domaine/compétence ciblée |
| Par difficulté | Filtrer par niveau de difficulté |
| Attribution | Assigner un outil à un apprenant |
| Suivi utilisation | Marquer comme réalisé, noter les observations |

### 2.7 Bilan de Formation
| Fonction | Description |
|----------|-------------|
| Créer un bilan | Intermédiaire ou final |
| Période couverte | Date début - date fin |
| Synthèse | Texte libre de synthèse |
| Compétences acquises | Liste des compétences validées |
| Compétences en cours | Liste des compétences en progression |
| Durée réalisée | Nombre d'heures effectives |
| Recommandations | Suite de parcours proposée |
| Export PDF | Génération d'un document PDF |

### 2.8 ACA (Attestation de Compétences Acquises)
| Fonction | Description |
|----------|-------------|
| Générer ACA | À partir d'un bilan validé |
| Numérotation | Numéro unique automatique |
| Informations | Date, lieu de délivrance |
| Signataire | Nom et fonction |
| Liste compétences | Compétences attestées |
| Export PDF | Document officiel imprimable |

### 2.9 Synchronisation
| Fonction | Description |
|----------|-------------|
| Exporter | Créer un fichier de synchronisation (.sync) |
| Importer | Intégrer les modifications depuis un fichier |
| Détection conflits | Identifier les modifications concurrentes |
| Résolution | Interface pour choisir quelle version garder |

---

## 3. Architecture Technique

### 3.1 Technologies
| Composant | Technologie |
|-----------|-------------|
| Langage | Python 3.10+ |
| Interface | CustomTkinter (moderne) |
| Base de données | SQLite (fichier local) |
| Export PDF | ReportLab ou WeasyPrint |
| Export Excel | openpyxl |
| Packaging | PyInstaller (→ .exe) |

### 3.2 Structure des Fichiers
```
SuiviFormation/
├── SuiviFormation.exe          # Application (ou app.py si Python)
├── config.json                 # Configuration (chemin données)
├── data/
│   └── suivi_formation.db      # Base SQLite
├── exports/
│   ├── bilans/                 # PDFs des bilans
│   └── aca/                    # PDFs des attestations
├── sync/
│   └── *.sync                  # Fichiers de synchronisation
└── logs/
    └── app.log                 # Journal d'activité
```

### 3.3 Schéma Base de Données SQLite

```sql
-- APPRENANTS
CREATE TABLE apprenants (
    id INTEGER PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance DATE,
    date_entree DATE,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    notes TEXT,
    archive INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DOMAINES
CREATE TABLE domaines (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE,
    nom TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    ordre INTEGER
);

-- CATEGORIES DE COMPETENCES
CREATE TABLE categories_competences (
    id INTEGER PRIMARY KEY,
    domaine_id INTEGER REFERENCES domaines(id),
    code TEXT UNIQUE,
    nom TEXT NOT NULL,
    ordre INTEGER
);

-- COMPETENCES
CREATE TABLE competences (
    id INTEGER PRIMARY KEY,
    categorie_id INTEGER REFERENCES categories_competences(id),
    code TEXT UNIQUE,
    intitule TEXT NOT NULL,
    description TEXT,
    degre_anlci INTEGER,
    ordre INTEGER
);

-- PROFILS
CREATE TABLE profils (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    type_public TEXT NOT NULL,
    domaine_id INTEGER REFERENCES domaines(id),
    degre_anlci INTEGER,
    description TEXT,
    caracteristiques TEXT,
    besoins_formation TEXT,
    couleur TEXT,
    ordre INTEGER
);

-- ETAPES DE PARCOURS
CREATE TABLE etapes_parcours (
    id INTEGER PRIMARY KEY,
    profil_id INTEGER REFERENCES profils(id),
    numero INTEGER,
    nom TEXT,
    objectifs_lecture TEXT,
    objectifs_ecriture TEXT,
    duree_min INTEGER,
    duree_max INTEGER,
    indicateurs_reussite TEXT,
    outils_recommandes TEXT
);

-- OUTILS DE POSITIONNEMENT
CREATE TABLE outils_positionnement (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE,
    nom TEXT NOT NULL,
    description TEXT,
    domaine_id INTEGER REFERENCES domaines(id),
    type TEXT,
    fichier TEXT
);

-- POSITIONNEMENTS
CREATE TABLE positionnements (
    id INTEGER PRIMARY KEY,
    apprenant_id INTEGER REFERENCES apprenants(id),
    formateur TEXT,
    date_positionnement DATE,
    commentaires_generaux TEXT,
    profils_detectes TEXT,  -- JSON
    statut TEXT DEFAULT 'en_cours',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- EVALUATIONS (détail par compétence)
CREATE TABLE evaluations_positionnement (
    id INTEGER PRIMARY KEY,
    positionnement_id INTEGER REFERENCES positionnements(id),
    competence_id INTEGER REFERENCES competences(id),
    niveau_atteint INTEGER,  -- 0=non évalué, 1=non acquis, 2=en cours, 3=acquis
    commentaire TEXT
);

-- PLANS DE FORMATION
CREATE TABLE plans_formation (
    id INTEGER PRIMARY KEY,
    apprenant_id INTEGER REFERENCES apprenants(id),
    positionnement_id INTEGER REFERENCES positionnements(id),
    formateur TEXT,
    objectif_principal TEXT,
    date_debut DATE,
    date_fin_prevue DATE,
    statut TEXT DEFAULT 'actif',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- COMPETENCES CIBLEES DANS LE PLAN
CREATE TABLE plan_competences (
    id INTEGER PRIMARY KEY,
    plan_id INTEGER REFERENCES plans_formation(id),
    competence_id INTEGER REFERENCES competences(id),
    priorite INTEGER
);

-- OUTILS DE FORMATION
CREATE TABLE outils_formation (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE,
    titre TEXT NOT NULL,
    description TEXT,
    type TEXT,  -- exercice, support, jeu, etc.
    competence_id INTEGER REFERENCES competences(id),
    difficulte INTEGER,
    fichier TEXT,
    url TEXT
);

-- ATTRIBUTIONS D'OUTILS
CREATE TABLE attributions_outils (
    id INTEGER PRIMARY KEY,
    plan_id INTEGER REFERENCES plans_formation(id),
    outil_id INTEGER REFERENCES outils_formation(id),
    date_attribution DATE,
    date_realisation DATE,
    observations TEXT,
    statut TEXT DEFAULT 'a_faire'
);

-- BILANS
CREATE TABLE bilans (
    id INTEGER PRIMARY KEY,
    apprenant_id INTEGER REFERENCES apprenants(id),
    plan_id INTEGER REFERENCES plans_formation(id),
    formateur TEXT,
    date_bilan DATE,
    type TEXT,  -- intermediaire, final
    periode_debut DATE,
    periode_fin DATE,
    duree_realisee INTEGER,
    synthese TEXT,
    competences_acquises TEXT,  -- JSON
    competences_en_cours TEXT,  -- JSON
    recommandations TEXT,
    fichier_pdf TEXT,
    statut TEXT DEFAULT 'brouillon',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ATTESTATIONS (ACA)
CREATE TABLE attestations (
    id INTEGER PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    apprenant_id INTEGER REFERENCES apprenants(id),
    bilan_id INTEGER REFERENCES bilans(id),
    date_delivrance DATE,
    lieu_delivrance TEXT,
    signataire_nom TEXT,
    signataire_fonction TEXT,
    competences_attestees TEXT,  -- JSON
    fichier_pdf TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- HISTORIQUE SYNC
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY,
    date_sync DATETIME,
    type TEXT,  -- export, import
    fichier TEXT,
    nb_modifications INTEGER,
    details TEXT
);
```

---

## 4. Interface Utilisateur

### 4.1 Écran Principal
```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Suivi Formation ACLEF                        [Sync] [?]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 👥          │  │ 📋          │  │ 📊          │             │
│  │ Apprenants  │  │ Positionne- │  │ Plans de    │             │
│  │             │  │ ments       │  │ Formation   │             │
│  │   42        │  │   12        │  │   38        │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 📝          │  │ 🎓          │  │ 📖          │             │
│  │ Bilans      │  │ ACA         │  │ Référentiel │             │
│  │             │  │             │  │             │             │
│  │   8         │  │   5         │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Dernières activités :                                          │
│  • Positionnement Marie D. créé (14/01)                        │
│  • Bilan Ahmed K. validé (13/01)                               │
│  • Plan formation Sophie L. mis à jour (12/01)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Fiche Apprenant
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Retour                    Fiche Apprenant           [Éditer] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 Marie DUPONT                                                │
│  ─────────────────────────────────────────────────────────────  │
│  Date de naissance : 15/03/1985                                 │
│  Date d'entrée : 01/09/2025                                     │
│  Téléphone : 06 12 34 56 78                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PROFILS DÉTECTÉS                                        │   │
│  │ 📖 Lecture : PD (Petit Débutant)                        │   │
│  │ ✍️ Écriture : GD (Grand Débutant)                       │   │
│  │ 🔢 Maths : M1                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📋 Voir Positionnements]  [📊 Voir Plan]  [📝 Voir Bilans]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Grille de Positionnement
```
┌─────────────────────────────────────────────────────────────────┐
│  Positionnement : Marie DUPONT                    [Sauvegarder] │
├─────────────────────────────────────────────────────────────────┤
│  Domaines : [📖 Lecture ▼]                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▼ Acquisition                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LECT-ACQ-01 : Connaissance des lettres                    │ │
│  │ ○ Non évalué  ○ Non acquis  ● En cours  ○ Acquis         │ │
│  │ Note : Connaît 18 lettres sur 26                          │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ LECT-ACQ-02 : Quelques mots en global                     │ │
│  │ ○ Non évalué  ○ Non acquis  ○ En cours  ● Acquis         │ │
│  │ Note : Reconnaît son prénom et mots courants              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ▶ Textes références                                            │
│  ▶ Suite                                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Profil suggéré : PD (Petit Débutant)            [Valider]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Plan de Développement

### Phase 1 : Fondations (Semaine 1-2)
| Tâche | Priorité |
|-------|----------|
| Structure projet Python | Haute |
| Interface principale (CustomTkinter) | Haute |
| Base SQLite + schéma complet | Haute |
| Configuration (chemin réseau/local) | Haute |
| Import des données de référence (domaines, compétences, profils) | Haute |

### Phase 2 : Gestion Apprenants (Semaine 3)
| Tâche | Priorité |
|-------|----------|
| CRUD Apprenants | Haute |
| Recherche et filtres | Moyenne |
| Archivage | Moyenne |

### Phase 3 : Positionnement (Semaine 4-5)
| Tâche | Priorité |
|-------|----------|
| Création positionnement | Haute |
| Grille d'évaluation par domaine | Haute |
| Détection automatique profil | Haute |
| Liste outils de positionnement | Moyenne |

### Phase 4 : Plan de Formation (Semaine 6)
| Tâche | Priorité |
|-------|----------|
| Création plan depuis positionnement | Haute |
| Sélection compétences cibles | Haute |
| Association étapes de parcours | Moyenne |
| Catalogue outils de formation | Moyenne |

### Phase 5 : Bilan et ACA (Semaine 7-8)
| Tâche | Priorité |
|-------|----------|
| Création bilan | Haute |
| Sélection compétences acquises | Haute |
| Export PDF bilan | Haute |
| Génération ACA | Haute |
| Export PDF ACA | Haute |

### Phase 6 : Synchronisation (Semaine 9)
| Tâche | Priorité |
|-------|----------|
| Export fichier .sync | Haute |
| Import et fusion | Haute |
| Gestion des conflits | Moyenne |

### Phase 7 : Finalisation (Semaine 10)
| Tâche | Priorité |
|-------|----------|
| Tests complets | Haute |
| Packaging .exe | Haute |
| Documentation utilisateur | Moyenne |
| Formation utilisatrices | Moyenne |

---

## 6. Exports et Rapports

### 6.1 Export PDF - Bilan
```
┌─────────────────────────────────────────────────────────────────┐
│                         BILAN DE FORMATION                       │
│                                                                  │
│  Apprenant : Marie DUPONT                                       │
│  Période : 01/09/2025 - 31/12/2025                              │
│  Durée réalisée : 120 heures                                    │
│                                                                  │
│  SYNTHÈSE                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  Marie a fait des progrès significatifs en lecture...            │
│                                                                  │
│  COMPÉTENCES ACQUISES                                           │
│  ─────────────────────────────────────────────────────────────  │
│  ✓ LECT-ACQ-01 : Connaissance des lettres                       │
│  ✓ LECT-ACQ-02 : Quelques mots en global                        │
│  ✓ ECRIT-ACQ-01 : Tracer les lettres                            │
│                                                                  │
│  COMPÉTENCES EN COURS D'ACQUISITION                             │
│  ─────────────────────────────────────────────────────────────  │
│  → LECT-ACQ-03 : Lecture de syllabes                            │
│  → ECRIT-ACQ-02 : Encodage phonétique                           │
│                                                                  │
│  RECOMMANDATIONS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Poursuivre le travail sur les syllabes complexes...            │
│                                                                  │
│  Date : 31/12/2025                    Formateur : Sophie Martin  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Export PDF - ACA
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│              ATTESTATION DE COMPÉTENCES ACQUISES                │
│                           N° ACA-2025-042                        │
│                                                                  │
│  L'association ACLEF atteste que :                              │
│                                                                  │
│                      Mme Marie DUPONT                            │
│                   née le 15/03/1985                              │
│                                                                  │
│  a acquis les compétences suivantes dans le cadre               │
│  de sa formation :                                               │
│                                                                  │
│  LECTURE                                                         │
│  • Connaissance des lettres de l'alphabet                       │
│  • Reconnaissance de mots courants                              │
│  • Lecture de syllabes simples                                  │
│                                                                  │
│  ÉCRITURE                                                        │
│  • Tracé des lettres en script et cursive                       │
│  • Copie de mots et phrases courtes                             │
│                                                                  │
│  Fait à Paris, le 31/12/2025                                    │
│                                                                  │
│  La Directrice,                                                  │
│  [Signature]                                                     │
│  Mme Sophie MARTIN                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Données de Référence à Importer

Au premier lancement, l'application importera automatiquement :

### 7.1 Domaines (6)
- Communication orale, Lecture, Écriture, Mathématiques, Bureautique, Internet

### 7.2 Catégories (25)
- Toutes les catégories par domaine

### 7.3 Compétences (~100+)
- Toutes les compétences détaillées avec codes

### 7.4 Profils (29)
- FLE : A1, A2, A3
- Illettrisme : B1, B2, BA
- Lecture : GD, PD, D, PLNS, LPS
- Écriture : GD, PD, D, PLNS, LPS
- Maths : M0, M1, M2, M3, M4
- Bureautique : N0, N1, N2A, N2B
- Internet : I0, I1, I2, I3

### 7.5 Étapes de Parcours (~26)
- Étapes détaillées pour chaque profil

---

## 8. Prérequis Techniques

### 8.1 Pour le développement
- Python 3.10+
- Modules : customtkinter, sqlite3, reportlab, openpyxl, pillow

### 8.2 Pour l'utilisation (version .exe)
- Windows 10/11
- Aucune installation requise (application autonome)
- Accès réseau pour le stockage partagé (optionnel)

---

## 9. Livrables

1. **Application** : `SuiviFormation.exe` (Windows)
2. **Base pré-remplie** : Référentiels compétences et profils
3. **Documentation** : Guide utilisateur PDF
4. **Scripts** : Export des données depuis Supabase (optionnel)

---

## 10. Questions Ouvertes

- [ ] Format exact souhaité pour les exports PDF ?
- [ ] Logo ACLEF à intégrer dans les documents ?
- [ ] Champs supplémentaires pour la fiche apprenant ?
- [ ] Outils de positionnement spécifiques à lister ?
- [ ] Outils de formation existants à cataloguer ?

---

*Document créé le 19/01/2026*
*Version 1.0*
