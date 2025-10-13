# 🗄️ Analyse Base de Données Supabase Existante

**Date** : 10 octobre 2025
**Projet** : ACLEF-Pédagogie (partagé avec ACLEF-Planning)

---

## 📊 Vue d'Ensemble

La base de données Supabase est **PARTAGÉE** entre deux projets :
- `projet-aclef-planning-v8` (gestion planning formateurs/apprenants)
- `projet-aclef-pédagogie` (modules pédagogiques)

**⚠️ ATTENTION** : Les modifications de schéma impactent les DEUX projets !

---

## 🔑 Table Centrale : `users`

### Structure (déduite des références)

```sql
-- Table PARTAGÉE entre Planning et Pédagogie
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    identifiant VARCHAR(100), -- Login personnalisé
    password_hash TEXT, -- Mot de passe hashé (bcrypt)

    role VARCHAR(20), -- 'admin', 'salarié', 'formateur', 'apprenant'

    -- Planning
    custom_password BOOLEAN DEFAULT FALSE,
    archive BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Rôles utilisés** :
- `admin` - Administrateur complet
- `salarié` - Équivalent admin
- `formateur` - Formateur (utilisé dans Planning)
- `apprenant` - Apprenant

---

## 📚 Tables MODULE LIRE (Pédagogie)

### 1. `textes_references`
```sql
CREATE TABLE textes_references (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    nombre_groupes INTEGER DEFAULT 0,
    nombre_mots_total INTEGER DEFAULT 0,
    nombre_mots_multi_syllabes INTEGER DEFAULT 0
);
```

### 2. `groupes_sens`
```sql
CREATE TABLE groupes_sens (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    ordre_groupe INTEGER NOT NULL,
    contenu TEXT NOT NULL,
    type_groupe VARCHAR(20) DEFAULT 'text', -- 'text' ou 'linebreak'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. `mots_classifies`
```sql
CREATE TABLE mots_classifies (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL,
    classification VARCHAR(10) NOT NULL, -- 'mono' ou 'multi'
    valide_par_admin BOOLEAN DEFAULT FALSE,
    score_utilisateur INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP DEFAULT NULL,
    validated_by INTEGER REFERENCES users(id)
);
```

### 4. Autres tables Lire
- `mots_extraits`
- `syllabes_mots`
- `syllabes`
- `corrections_demandees`
- `signalements_syllabification`
- `corrections_syllabification`

---

## 📋 Tables MODULE QUIZ (Pédagogie)

### 1. `quiz_categories`
```sql
CREATE TABLE quiz_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '📋',
    color VARCHAR(7) DEFAULT '#3b82f6',
    order_index INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

**Catégories par défaut** :
- Mathématiques, Français, Histoire, Géographie, Sciences, Culture Générale, Sport, Technologie

### 2. `quiz`
```sql
CREATE TABLE quiz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    category_id UUID REFERENCES quiz_categories(id) ON DELETE SET NULL
);
```

**Structure `quiz_data` (JSONB)** :
```json
{
  "questions": [
    {
      "type": "multiple_choice" | "matching" | "ordering" | "numeric",
      "question": "...",
      "options": [...], // selon type
      "correctAnswer": "..." // selon type
    }
  ]
}
```

### 3. `quiz_sessions`
```sql
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### 4. `quiz_assignments` ⭐ IMPORTANT
```sql
CREATE TABLE quiz_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    due_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(quiz_id, user_id)
);
```

**→ Cette table sera RÉUTILISÉE pour le module Formation !**

---

## 🚗 Tables MODULE CODE ROUTE (Pédagogie)

### 1. `vocabulaire_code_route`
```sql
CREATE TABLE vocabulaire_code_route (
    id SERIAL PRIMARY KEY,
    mot VARCHAR(255) NOT NULL,
    definition_simple TEXT,
    categorie VARCHAR(100),
    emoji VARCHAR(10),
    ordre_categorie INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `definitions_personnalisees_code_route`
```sql
CREATE TABLE definitions_personnalisees_code_route (
    id SERIAL PRIMARY KEY,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    apprenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ma_definition TEXT,
    mon_exemple TEXT,
    audio_url TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW(),
    UNIQUE(vocabulaire_id, apprenant_id)
);
```

### 3. `progression_vocabulaire_code_route`
```sql
CREATE TABLE progression_vocabulaire_code_route (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    statut VARCHAR(20) DEFAULT 'nouveau',
    nombre_revisions INTEGER DEFAULT 0,
    derniere_revision TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(apprenant_id, vocabulaire_id)
);
```

---

## 🔍 Observations Critiques

### ⚠️ Types Mixtes pour `user_id`

**Problème identifié** :
- Table `users` : `id` est de type **UUID**
- Anciennes tables module Lire : `apprenant_id` est de type **INTEGER**
- Nouvelles tables (Quiz, Code Route) : `apprenant_id` / `user_id` sont de type **UUID**

**Exemple** :
```sql
-- ❌ INCOHÉRENT
CREATE TABLE textes_references (
    apprenant_id INTEGER REFERENCES users(id) -- users.id est UUID !
);

-- ✅ CORRECT
CREATE TABLE quiz (
    created_by UUID REFERENCES users(id)
);
```

**→ Les tables du module LIRE ont probablement une MIGRATION en attente ou utilisent un système de conversion**

### 🎯 Conventions de Nommage

**UUID vs SERIAL** :
- Tables récentes : `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Tables anciennes : `id SERIAL PRIMARY KEY`

**Timestamps** :
- Tables récentes : `TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())`
- Tables anciennes : `TIMESTAMP DEFAULT NOW()`

**Nommage colonnes** :
- Tables Quiz : `created_at`, `updated_at`, `is_active`
- Tables Lire : `created_at`, `valide_par_admin`
- Convention snake_case partout

---

## ✅ Recommandations pour MODULE FORMATION

### 1. Suivre les Conventions Récentes

**Type ID** : Utiliser **UUID** (comme Quiz)
```sql
CREATE TABLE nom_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ...
);
```

**Type Timestamps** : Utiliser format complet
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
```

**Type user_id** : Utiliser **UUID** (référence vers `users.id`)
```sql
apprenant_id UUID REFERENCES users(id)
formateur_id UUID REFERENCES users(id)
```

### 2. Préfixer les Tables

Pour éviter les conflits avec le projet Planning :
```sql
-- ✅ BON (préfixe explicite)
CREATE TABLE formation_positionnements (...);
CREATE TABLE formation_plans (...);
CREATE TABLE formation_competences (...);

-- ❌ À ÉVITER (trop générique)
CREATE TABLE positionnements (...);
CREATE TABLE plans (...);
```

### 3. Réutiliser l'Existant

**Table `quiz_assignments`** :
→ Peut être **RÉUTILISÉE** pour attribuer des exercices !

**Structure générique** :
- `quiz_id` → Peut référencer un quiz, un texte, un exercice...
- `user_id` → L'apprenant
- `assigned_by` → Le formateur/admin
- `due_date`, `is_completed` → Déjà présents

**Option A** : Renommer en `exercice_assignments` (plus générique)
**Option B** : Créer `formation_attributions` (spécifique)

**→ Je recommande Option B pour ne PAS modifier l'existant**

### 4. Utiliser JSONB pour Flexibilité

Comme `quiz.quiz_data`, utiliser JSONB pour données flexibles :
```sql
CREATE TABLE formation_exercices (
    contenu JSONB, -- Structure flexible selon type
    metadata JSONB -- Métadonnées additionnelles
);
```

---

## 📝 Schéma SQL Adapté pour MODULE FORMATION

### Principes

✅ Préfixer toutes les tables avec `formation_`
✅ Utiliser UUID pour tous les IDs
✅ Utiliser UUID pour toutes les références à `users`
✅ Timestamps avec TIME ZONE
✅ JSONB pour données flexibles
✅ Ne PAS modifier les tables existantes

### Tables à Créer

```
formation_domaines
formation_categories_competences
formation_competences
formation_positionnements
formation_evaluations_positionnement
formation_plans
formation_plan_competences
formation_attributions_exercices (au lieu de réutiliser quiz_assignments)
formation_resultats_exercices
formation_suivis_pedagogiques
formation_bilans
```

---

## 🚀 Migration Strategy

### Phase 1 : Création Tables Formation

**Fichier** : `supabase/migrations/20251010000000_create_formation_tables.sql`

**Contenu** :
- Toutes les tables `formation_*`
- Index de performance
- Triggers `updated_at`
- Commentaires SQL

### Phase 2 : Insertion Données Initiales

**Fichier** : `supabase/migrations/20251010000001_seed_formation_data.sql`

**Contenu** :
- Insertion des 3 domaines (Lecture, Écriture, Mathématiques)
- Insertion catégories par domaine
- Insertion compétences (depuis CSV analysé)

### Phase 3 : Permissions RLS

**Fichier** : `supabase/migrations/20251010000002_formation_rls_policies.sql`

**Contenu** :
- Politiques RLS pour chaque table
- Séparation admin/formateur/apprenant

---

## ❓ Questions à Résoudre

### 1. Tables Module LIRE

**Question** : Les tables `textes_references`, `mots_classifies` etc. utilisent `apprenant_id INTEGER`.

**Options** :
- A) Laisser tel quel (système legacy qui fonctionne)
- B) Migrer vers UUID (risqué, impact sur tout le module Lire)

**→ Recommandation : Option A (ne pas toucher)**

### 2. Réutilisation `quiz_assignments`

**Question** : Réutiliser `quiz_assignments` pour tous types d'exercices ?

**Options** :
- A) Réutiliser et renommer en `exercice_assignments`
- B) Créer `formation_attributions_exercices` (spécifique)

**→ Recommandation : Option B (isolation, pas de régression)**

### 3. Lien avec Modules Existants

**Question** : Comment lier un exercice de formation à un quiz/texte/imagier existant ?

**Solution** :
```sql
CREATE TABLE formation_attributions_exercices (
    -- Type + Référence polymorphe
    type_exercice TEXT NOT NULL, -- 'quiz', 'lire_texte', 'code_route', etc.

    -- IDs optionnels selon type
    quiz_id UUID REFERENCES quiz(id),
    texte_id INTEGER REFERENCES textes_references(id),
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id)

    -- ...
);
```

---

## ✅ Validation Finale

**Tables existantes identifiées** : ✅
- `users` (partagée, UUID)
- Module Lire (7 tables, INTEGER pour apprenant_id)
- Module Quiz (4 tables, UUID)
- Module Code Route (3 tables, UUID)

**Conventions identifiées** : ✅
- UUID pour nouvelles tables
- Timestamps WITH TIME ZONE
- snake_case partout
- JSONB pour flexibilité

**Stratégie définie** : ✅
- Préfixe `formation_` pour isolation
- Ne PAS toucher l'existant
- Créer tables dédiées
- Migration en 3 phases

**Prêt à créer le schéma SQL adapté** : ✅

---

## 🎯 Prochaine Étape

Créer le fichier SQL complet :
```
supabase/migrations/20251010000000_create_formation_tables.sql
```

Avec :
- 11 tables `formation_*`
- Tous les index
- Triggers `updated_at`
- Commentaires explicatifs

**Dites "GO" pour que je crée le fichier !** 🚀
