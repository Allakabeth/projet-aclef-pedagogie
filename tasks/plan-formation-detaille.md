# 🎓 PLAN DÉTAILLÉ : Module "Gérer la Formation"

**Date** : 10 octobre 2025
**Projet** : ACLEF-Pédagogie
**Basé sur** : Analyse des documents de positionnement fournis

---

## 📊 Analyse des Documents de Positionnement

### Structure Identifiée

#### 📖 LECTURE (2 documents)

**Lecture 1 - Acquisition initiale**
- **Items** : Compétences d'acquisition
  - Connaissance lettres alphabet
  - Quelques mots en global
  - Quelques syllabes
  - 2 lettres, 3 lettres, + (progression)
  - Accès à une phrase

- **Textes références**
  - Quantité de textes références ?
  - Sait-il les dire en entier ?
  - Sait-il trouver le groupe de sens ?
  - Sait-il reconnaître le groupe de sens ?
  - Sait-il isoler les mots ?
  - Sait-il isoler les mots « affectifs » ?
  - Sait-il isoler tous les mots ?
  - Sait-il se repérer dans son classeur ?
  - Sait-il reconnaître les étiquettes mélangées (d'un texte / plusieurs textes) ?
  - Sait-il lire ses gammes accordéons ?
  - Sait-il lire ses histoires sur carton (groupe de sens / mot isolé) ?
  - Combien d'analogies découvertes ?

**Lecture 2 - Suite (granularité fine)**
- Avec le texte: Objectifs graduels
  - Sait-il faire des hypothèses sur le sens par comparaison ?
  - Sait-il découvrir un mot nouveau par référence ?
  - Sur un mot référence: Peut-il lire le contenu de chaque cas ?
  - Fait-il correspondance syllabes graphiques / phonologiques ?
  - Comprend-il un texte de 20 lignes environ au vocabulaire simple (Lire Hamster...) après lecture silencieuse ?
  - Avec question du formateur ? Sans question ?
  - Combien de temps ?
- En lecture orale, sait identifier les différents mots de ce texte ?
- Comprend-il un texte plus long (30 lignes et +...) ?
- Sait-il construire le sens et mémoriser les informations ?
- Sait-il construire le sens de la totalité du texte ?
- Est capable de construire du sens dans des paragraphes ?
- En lecture orale, sait-il déchiffrer les différents mots de ce texte ?

#### ✍️ ÉCRITURE (2 documents)

**Écriture 1 - Acquisition**
- Peut-il graphier les lettres ?
- Transférer écriture/cursive avec majuscules ?
- Copie avec segmentation des mots ?
- Sait-il écrire quelques mots ?
- Sait-il écrire quelques syllabes ?
- Sait-il produire une phrase ?
- Sait-il produire une phrase avec ses outils ?
- Sous la dictée-recherche, sait-il retrouver:
  - des groupes de sens ?
  - des mots ?
- Sous la dictée-recherche, sait-il transcrire un groupe de sens ?
- Sait-il produire un texte avec ses outils (4-5 lignes) ?
- Sait-il produire les syllabes repères et classées dans son cahier d'analogies ?

**Écriture 2 - Suite (Acquisition)**
- Accords ? Accord des adjectifs ? Accord des noms ? Règles de grammaire
- Accords des mots ? Fleur ? Impératif ? Accords AVEC AVOIR, Élire ? Accords AVEC Être ?
- Présent ? Présent avec NE III NON jolie, vous, Ilé ou listes ? Présent N avec II/NON III Présent ?
- Règles des NouN/illNaIre : NINI ? Règles des NNNINAIre (NNP) ?
- Passé ? Passé ? Passé ? Passé ? Imparfait ? Futur ?
- Sait-il construire un texte (5/6 lignes) orthographe et structure sans ses outils ?

#### 🔢 MATHÉMATIQUES (2 documents)

**Maths 1 - Évaluation**
- **Activement : Numération**
  - Vide (0)
  - Fait reconnaître ordinaux (nombres, problèmes réversibles jusqu'à 10, GR3)
  - Vide (0)
  - Vide (0)
  - Vide (0)
- **Alternative : Nombres** (grille de suivi détaillée avec cases vides)

**Maths 2 - MATHÉMATIQUES (détaillé)**
- **Maîtrise des écritures supérieures**
  - Addition avec retenue
  - Soustraction
  - Multiplication avec retenue
  - Multiplications à un chiffre
  - Multiplications à plusieurs chiffres
  - Utilise de première calculette
  - Division à plusieurs chiffres
  - Fractions de décimaux à un ou plusieurs chiffres

- **Maîtrise des Fractions**
  - Les fractions
  - Opérations avec fractions simples

- **Maîtrise de la Mesure**
  - Avec dates, km.
  - Le Longueur
  - Le parcours
  - Le périmètre
  - L'euro
  - La Masse
  - La Capacité
  - Les volumes

- **Maîtrise de la proportionnalité**
  - Pourcentage

- **Maîtrise du Temps**
  - Apprend à mesure
  - L'emploi du temps, les horaires (analogique / digital)

- **Maîtrise de la Numération**
  - Chiffres romains

- **Maîtrise de l'Espace**
  - Plan
  - Plan de la ville

---

## 🎯 Architecture Adaptée à VOS Besoins

### Caractéristiques Identifiées

✅ **Granularité TRÈS FINE** : Chaque compétence est détaillée
✅ **Progression graduée** : Questions de plus en plus complexes
✅ **Évaluation binaire** : OUI / NON (cases à cocher)
✅ **Système de suivi temporel** : Dates multiples pour suivre évolution
✅ **Contextualisation** : Beaucoup de questions incluent le contexte (ex: "avec ses outils", "sans ses outils")

### Décisions d'Architecture

**1. Structure Référentiel**
```
DOMAINE (ex: Lecture)
  ├─ CATÉGORIE (ex: Acquisition, Textes références)
  │   ├─ COMPÉTENCE (ex: Connaissance lettres alphabet)
  │   │   ├─ Évaluation: OUI/NON
  │   │   ├─ Date
  │   │   └─ Observations
```

**2. Système d'Import**
- Format CSV ou Excel simple
- Structure: Domaine | Catégorie | Compétence | Ordre
- Import manuel via interface admin

**3. Positionnement**
- Évaluation manuelle formateur
- Interface reprenant la structure des documents
- Colonnes: Compétence | OUI | NON | Date | Observations

**4. Bilans**
- Export PDF (lecture seule)
- Export Word modifiable (pour commentaires)
- Template reprenant structure positionnement

---

## 🗄️ Schéma SQL Adapté

```sql
-- 1. DOMAINES (Lecture, Écriture, Mathématiques)
CREATE TABLE domaines_formation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL, -- Lecture, Écriture, Mathématiques
    emoji TEXT, -- 📖, ✍️, 🔢
    ordre INTEGER,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CATÉGORIES (ex: Acquisition, Textes références)
CREATE TABLE categories_competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domaine_id UUID REFERENCES domaines_formation(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    ordre INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. COMPÉTENCES (granularité fine)
CREATE TABLE competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categorie_id UUID REFERENCES categories_competences(id) ON DELETE CASCADE,
    code TEXT, -- ex: LECT-ACQ-01
    intitule TEXT NOT NULL, -- ex: "Connaissance lettres alphabet"
    description TEXT,
    contexte TEXT, -- ex: "avec ses outils", "sans ses outils"
    ordre INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. POSITIONNEMENTS
CREATE TABLE positionnements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    formateur_id UUID REFERENCES users(id),
    date_positionnement DATE DEFAULT CURRENT_DATE,
    statut TEXT DEFAULT 'en_cours', -- en_cours, termine, valide
    commentaires_generaux TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. ÉVALUATIONS COMPÉTENCES (lors positionnement)
CREATE TABLE evaluations_positionnement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    positionnement_id UUID REFERENCES positionnements(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id),
    evaluation TEXT, -- 'oui', 'non', 'en_cours', 'non_evalue'
    date_evaluation DATE,
    observations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. PLANS DE FORMATION
CREATE TABLE plans_formation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    formateur_id UUID REFERENCES users(id),
    positionnement_id UUID REFERENCES positionnements(id),
    date_debut DATE DEFAULT CURRENT_DATE,
    date_fin_prevue DATE,
    objectif_principal TEXT,
    statut TEXT DEFAULT 'en_cours', -- en_cours, termine, abandonne
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. COMPÉTENCES CIBLÉES DU PLAN
CREATE TABLE plan_competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES plans_formation(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id),
    priorite INTEGER, -- 1=haute, 2=moyenne, 3=basse
    statut TEXT DEFAULT 'a_travailler', -- a_travailler, en_cours, acquis
    date_cible DATE,
    date_acquis DATE,
    observations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. EXERCICES ATTRIBUÉS (réutilise modules existants)
CREATE TABLE attributions_exercices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES plans_formation(id) ON DELETE CASCADE,
    apprenant_id UUID REFERENCES users(id),

    -- Type d'exercice (module existant)
    type_exercice TEXT NOT NULL, -- 'quiz', 'lire', 'ecrire', 'compter', 'code-route', 'imagier'

    -- Référence vers l'exercice du module
    quiz_id UUID, -- Si type='quiz'
    texte_id UUID, -- Si type='lire' (textes_references)
    exercice_id UUID, -- ID générique si autre module

    -- Métadonnées
    titre TEXT NOT NULL,
    description TEXT,
    consignes TEXT,

    -- Attribution
    competence_cible_id UUID REFERENCES competences(id),
    date_attribution TIMESTAMP DEFAULT NOW(),
    date_limite DATE,
    obligatoire BOOLEAN DEFAULT true,
    ordre INTEGER,

    -- Statut
    statut TEXT DEFAULT 'attribue', -- attribue, commence, termine

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. RÉSULTATS EXERCICES
CREATE TABLE resultats_exercices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribution_id UUID REFERENCES attributions_exercices(id),
    apprenant_id UUID REFERENCES users(id),

    date_debut TIMESTAMP,
    date_fin TIMESTAMP,

    -- Résultats
    score DECIMAL(5,2), -- sur 100
    reussi BOOLEAN,
    temps_passe INTEGER, -- en secondes
    nombre_tentatives INTEGER DEFAULT 1,

    -- Détails (JSON flexible selon type)
    details JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. SUIVIS PÉDAGOGIQUES (observations formateur)
CREATE TABLE suivis_pedagogiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    plan_id UUID REFERENCES plans_formation(id),
    formateur_id UUID REFERENCES users(id),

    date_suivi TIMESTAMP DEFAULT NOW(),
    type TEXT, -- 'entretien', 'observation', 'evaluation'

    observations TEXT,
    points_forts TEXT,
    points_amelioration TEXT,
    actions_prevues TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. BILANS
CREATE TABLE bilans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    plan_id UUID REFERENCES plans_formation(id),
    formateur_id UUID REFERENCES users(id),

    date_bilan DATE DEFAULT CURRENT_DATE,
    type TEXT, -- 'intermediaire', 'final'

    periode_debut DATE,
    periode_fin DATE,

    -- Synthèse
    synthese TEXT,
    competences_acquises TEXT[], -- codes compétences
    competences_en_cours TEXT[],
    recommandations TEXT,

    -- Fichiers générés
    fichier_pdf TEXT, -- chemin fichier
    fichier_word TEXT, -- chemin fichier

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📅 Plan de Développement Recommandé

### ✅ Ordre Optimal : **Option B Modifiée**

```
Phase 1: POSITIONNEMENT (évaluation initiale)
  ↓
Phase 2: PLANS DE FORMATION (définir objectifs)
  ↓
Phase 3: ATTRIBUTION EXERCICES (lier modules existants)
  ↓
Phase 4: SUIVI (voir résultats, observations)
  ↓
Phase 5: BILANS (synthèse PDF/Word)
```

**Justification** :
1. ✅ On commence par le **positionnement** car c'est la base de tout
2. ✅ Les compétences sont définies **dès le positionnement**
3. ✅ Le plan se construit **à partir du positionnement**
4. ✅ On peut **immédiatement attribuer** des exercices existants
5. ✅ Pas besoin d'attendre un système de création d'exercices

---

## 🚀 PHASE 1 : Positionnement (Priorité 1)

**Durée estimée** : 1 semaine

### Objectifs

✅ Créer interface de positionnement reprenant la structure des documents
✅ Permettre évaluation manuelle OUI/NON/EN_COURS par formateur
✅ Suivi temporel avec dates multiples
✅ Import des compétences depuis CSV

---

### 📁 Fichiers à Créer

#### 1. Script SQL d'initialisation

**Fichier** : `database/init-formation-tables.sql`

```sql
-- Contient toutes les tables ci-dessus
-- + Insertion des 3 domaines (Lecture, Écriture, Mathématiques)
```

#### 2. Script d'import compétences

**Fichier** : `scripts/import-competences-formation.js`

**Fonction** : Importer un CSV de compétences dans la base

**Format CSV attendu** :
```csv
domaine,categorie,competence,contexte,ordre
Lecture,Acquisition,Connaissance lettres alphabet,,1
Lecture,Acquisition,Quelques mots en global,,2
Lecture,Textes références,Quantité textes références?,,1
Écriture,Acquisition,Peut-il graphier les lettres?,,1
Mathématiques,Numération,Addition avec retenue,,1
```

#### 3. API - Domaines & Compétences

**Fichiers** :
- `pages/api/admin/formation/domaines.js`
  - GET : Liste des domaines

- `pages/api/admin/formation/categories.js`
  - GET : Liste catégories par domaine
  - POST : Créer catégorie

- `pages/api/admin/formation/competences.js`
  - GET : Liste compétences par catégorie
  - POST : Créer compétence
  - PUT : Modifier compétence
  - DELETE : Supprimer compétence

#### 4. API - Positionnements

**Fichiers** :
- `pages/api/admin/formation/positionnements/index.js`
  - GET : Liste positionnements (avec filtres)
  - POST : Créer nouveau positionnement

- `pages/api/admin/formation/positionnements/[id].js`
  - GET : Détail positionnement
  - PUT : Mettre à jour statut/commentaires
  - DELETE : Supprimer positionnement

- `pages/api/admin/formation/positionnements/[id]/evaluations.js`
  - GET : Évaluations du positionnement
  - POST : Enregistrer évaluations batch
  - PUT : Modifier une évaluation

#### 5. Pages Admin - Gestion Référentiel

**Fichiers** :
- `pages/admin/formation/index.js`
  - Dashboard Formation
  - 4 cartes : Positionnement | Plans | Suivi | Bilans

- `pages/admin/formation/referentiel/index.js`
  - Vue d'ensemble référentiel
  - Liste domaines → catégories → compétences
  - Bouton "Importer CSV"

- `pages/admin/formation/referentiel/import.js`
  - Interface d'import CSV
  - Prévisualisation avant import
  - Validation et import en base

#### 6. Pages Admin - Positionnements

**Fichiers** :
- `pages/admin/formation/positionnements/index.js`
  - Liste tous les positionnements
  - Filtres : Apprenant, Formateur, Date, Statut
  - Actions : Voir, Modifier, Supprimer, Créer

- `pages/admin/formation/positionnements/nouveau.js`
  - **Étape 1** : Sélection apprenant
  - **Étape 2** : Sélection formateur
  - **Étape 3** : Choix domaines à évaluer
  - **Étape 4** : Interface d'évaluation

- `pages/admin/formation/positionnements/[id].js`
  - Détail du positionnement
  - Interface d'évaluation (si en_cours)
  - Synthèse (si terminé)

#### 7. Composants Réutilisables

**Fichiers** :
- `components/formation/ApprenantSelector.js`
  - Dropdown sélection apprenant

- `components/formation/DomaineCard.js`
  - Carte d'un domaine (Lecture, Écriture, Maths)

- `components/formation/EvaluationGrid.js`
  - Grille d'évaluation reprenant structure documents
  - Colonnes: Compétence | OUI | NON | EN_COURS | Date | Observations

- `components/formation/ProgressBar.js`
  - Barre de progression (nb compétences évaluées / total)

---

### 🎨 Maquette Interface Positionnement

#### Page : `/admin/formation/positionnements/nouveau`

```
┌─────────────────────────────────────────────────────────┐
│ 📋 Nouveau Positionnement                    [Étape 3/4]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Apprenant: Marie DUPONT                                 │
│ Formateur: Jean MARTIN                                  │
│ Date: 10/10/2025                                        │
│                                                         │
│ ┌─── Domaines à évaluer ────────────────────────────┐ │
│ │ ☑ 📖 Lecture                                      │ │
│ │ ☑ ✍️ Écriture                                     │ │
│ │ ☑ 🔢 Mathématiques                                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ [< Précédent]              [Suivant : Évaluation >]    │
└─────────────────────────────────────────────────────────┘
```

#### Page : Évaluation (Étape 4)

```
┌──────────────────────────────────────────────────────────────┐
│ 📖 LECTURE - Acquisition                    [Progression: 35%]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Compétence                            OUI  NON  Date    Obs │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ Connaissance lettres alphabet          ○   ○  [____] [💬] │
│ Quelques mots en global                ●   ○  [10/10] [💬] │
│ Quelques syllabes                      ●   ○  [10/10] [💬] │
│ 2 lettres ?                            ○   ●  [10/10] [💬] │
│ 3 lettres ?                            ○   ○  [____] [💬] │
│ + ... ?                                ○   ○  [____] [💬] │
│ Accès à une phrase ?                   ○   ○  [____] [💬] │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ 📖 LECTURE - Textes références                               │
├──────────────────────────────────────────────────────────────┤
│ Quantité textes références ?           ○   ○  [____] [💬] │
│ Sait-il les dire en entier ?           ○   ○  [____] [💬] │
│ [... 15 compétences supplémentaires ...]                    │
│                                                              │
│ [< Catégorie précédente] [Enregistrer] [Catégorie suiv. >] │
└──────────────────────────────────────────────────────────────┘
```

---

### 🧪 Tests Phase 1

**À tester** :
1. Import CSV compétences
2. Création positionnement (3 domaines)
3. Évaluation OUI/NON/EN_COURS
4. Ajout observations
5. Sauvegarde progressive
6. Navigation entre catégories
7. Finalisation positionnement
8. Consultation positionnement terminé

---

## 🚀 PHASE 2 : Plans de Formation (Priorité 2)

**Durée estimée** : 5-7 jours

### Objectifs

✅ Créer plan de formation à partir d'un positionnement
✅ Sélectionner compétences cibles à travailler
✅ Définir priorités et dates cibles
✅ Suivi progression par compétence

### Fichiers à Créer

**APIs** :
- `pages/api/admin/formation/plans/index.js` (GET, POST)
- `pages/api/admin/formation/plans/[id].js` (GET, PUT, DELETE)
- `pages/api/admin/formation/plans/[id]/competences.js` (GET, POST, PUT, DELETE)

**Pages** :
- `pages/admin/formation/plans/index.js` (liste)
- `pages/admin/formation/plans/nouveau.js` (création)
- `pages/admin/formation/plans/[id].js` (détail)

**Composants** :
- `components/formation/CompetenceSelector.js`
- `components/formation/PlanProgressBar.js`

---

## 🚀 PHASE 3 : Attribution Exercices (Priorité 3)

**Durée estimée** : 5-7 jours

### Objectifs

✅ Lier exercices modules existants (Quiz, Lire, Écrire, etc.) au plan
✅ Attribuer exercices à un apprenant pour une compétence
✅ Définir ordre, dates limites, obligatoire/optionnel

### Fichiers à Créer

**APIs** :
- `pages/api/admin/formation/attributions/index.js`
- `pages/api/admin/formation/attributions/[id].js`
- `pages/api/admin/formation/exercices/recherche.js` (recherche dans tous modules)

**Pages** :
- `pages/admin/formation/exercices/bibliotheque.js`
- `pages/admin/formation/exercices/attribuer.js`

---

## 🚀 PHASE 4 : Suivi (Priorité 4)

**Durée estimée** : 1 semaine

### Objectifs

✅ Dashboard suivi global
✅ Suivi individuel par apprenant
✅ Visualisation résultats exercices
✅ Observations formateur

### Fichiers à Créer

**APIs** :
- `pages/api/admin/formation/suivi/apprenants.js`
- `pages/api/admin/formation/suivi/[apprenantId].js`
- `pages/api/admin/formation/suivi/observations.js`

**Pages** :
- `pages/admin/formation/suivi/index.js`
- `pages/admin/formation/suivi/[apprenantId].js`

---

## 🚀 PHASE 5 : Bilans (Priorité 5)

**Durée estimée** : 5-7 jours

### Objectifs

✅ Génération bilans PDF (lecture seule)
✅ Génération bilans Word (modifiable, commentaires)
✅ Synthèse compétences acquises/en cours
✅ Recommandations

### Fichiers à Créer

**APIs** :
- `pages/api/admin/formation/bilans/generer.js`
- `pages/api/admin/formation/bilans/export-pdf.js`
- `pages/api/admin/formation/bilans/export-word.js`

**Pages** :
- `pages/admin/formation/bilans/index.js`
- `pages/admin/formation/bilans/generer.js`
- `pages/admin/formation/bilans/[id].js`

**Bibliothèques** :
- `jsPDF` (génération PDF)
- `docx` (génération Word)

---

## 📊 Timeline Globale

| Phase | Durée | Période |
|-------|-------|---------|
| Phase 1 : Positionnement | 1 semaine | S1 |
| Phase 2 : Plans | 5-7 jours | S2 |
| Phase 3 : Attribution | 5-7 jours | S3 |
| Phase 4 : Suivi | 1 semaine | S4 |
| Phase 5 : Bilans | 5-7 jours | S5 |
| **TOTAL** | **5 semaines** | |

---

## ✅ Prochaine Étape Immédiate

**Je vous propose de commencer par la PHASE 1 : Positionnement**

### Actions concrètes :

1. **Créer le schéma SQL** (tables domaines, catégories, compétences, positionnements)
2. **Préparer fichier CSV** avec les compétences extraites de vos documents
3. **Créer script d'import** pour peupler la base
4. **Développer interface de positionnement**

---

## ❓ Validation Finale Avant de Commencer

**Validez-vous :**

1. ✅ La structure SQL proposée ?
2. ✅ L'ordre de développement (Positionnement → Plans → Attribution → Suivi → Bilans) ?
3. ✅ Le format d'import CSV pour les compétences ?
4. ✅ L'interface de positionnement (grille OUI/NON/Date/Obs) ?

**Dois-je commencer par :**
- [ ] Créer le fichier SQL complet
- [ ] Créer le CSV des compétences (extrait de vos documents)
- [ ] Les deux en parallèle

Dites-moi "GO" et je commence immédiatement ! 🚀
