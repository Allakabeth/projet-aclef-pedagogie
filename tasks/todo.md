# 🎓 TODO : Module "Gérer la Formation" Complet

**Date de création** : 10 octobre 2025
**Objectif** : Créer un système complet de gestion pédagogique du début à la fin

---

## 🎯 Vue d'Ensemble du Besoin

### Parcours Complet
```
POSITIONNEMENT
    ↓
PLAN DE FORMATION (Référentiels)
    ↓
CRÉATION EXERCICES
    ↓
ATTRIBUTION INDIVIDUALISÉE
    ↓
SUIVI STATISTIQUE & PÉDAGOGIQUE
    ↓
BILAN À TOUT MOMENT
```

---

## ❓ Questions Critiques à Répondre AVANT de Commencer

### 1️⃣ Référentiels Existants
**Question** : Avez-vous déjà des référentiels de formation existants à intégrer ?
- [ ] Référentiel CléA (socle de compétences)
- [ ] Référentiel FLE (A1, A2, B1, B2)
- [ ] Référentiels internes ACLEF
- [ ] Autre : ________________
- [ ] Non, partir de zéro

**Si oui, format** :
- [ ] PDF (à intégrer manuellement)
- [ ] Excel/CSV (à importer)
- [ ] Autre

---

### 2️⃣ Positionnement Initial

**Question** : Comment souhaitez-vous réaliser les positionnements ?

**Option A - Évaluation manuelle formateur**
- Formateur remplit un formulaire par domaine
- Échelle de notation (1-5 ou A1-C2)
- Zone commentaires libre

**Option B - Tests automatiques**
- Batterie de tests intégrés dans l'application
- Scoring automatique
- Génération rapport de positionnement

**Option C - Hybride**
- Tests automatiques + Évaluation formateur
- Synthèse des deux sources

**Votre choix** : _____________

---

### 3️⃣ Exercices

**Question** : Faut-il créer de nouveaux types d'exercices ou réutiliser l'existant ?

**Modules existants à réutiliser** :
- [ ] 📋 Quiz (choix multiple, matching, ordering, numérique)
- [ ] 📖 Lire (segmentation, syllabes, compréhension)
- [ ] ✍️ Écrire (dictée, production écrite)
- [ ] 🔢 Compter (calcul, problèmes)
- [ ] 🚗 Code de la Route (vocabulaire)
- [ ] 🖼️ Imagiers

**Nouveaux types nécessaires** :
- [ ] Autre : ________________

**Votre choix** : _____________

---

### 4️⃣ Bilans

**Question** : Quel(s) format(s) pour les bilans ?

- [ ] PDF uniquement (lecture seule)
- [ ] PDF + Impression
- [ ] Export Word modifiable
- [ ] Export Excel (données brutes)
- [ ] HTML (consultation en ligne)

**Votre choix** : _____________

---

### 5️⃣ Ordre de Développement

**Question** : Par quel module commencer ?

**Option A - Logique chronologique**
```
1. Positionnement (évaluation initiale)
2. Plans de formation (définir objectifs)
3. Exercices (création et attribution)
4. Suivi (statistiques et résultats)
5. Bilans (synthèse)
```

**Option B - Logique pratique**
```
1. Plans de formation (structure de base)
2. Exercices (création et attribution)
3. Suivi (voir les résultats)
4. Positionnement (évaluation)
5. Bilans (synthèse)
```

**Option C - MVP rapide**
```
1. Plans de formation basiques
2. Attribution exercices existants
3. Suivi simple
(puis enrichir progressivement)
```

**Votre choix** : _____________

---

### 6️⃣ Données Existantes

**Question** : Y a-t-il des données de formation déjà en base à migrer ?

- [ ] Oui, positionnements existants (format : ________)
- [ ] Oui, plans de formation existants (format : ________)
- [ ] Oui, exercices attribués (format : ________)
- [ ] Oui, résultats d'exercices (format : ________)
- [ ] Non, c'est un nouveau système

**Si oui, détails** : _____________

---

### 7️⃣ Niveau de Granularité

**Question** : Niveau de détail souhaité pour les compétences ?

**Granularité Fine (détaillée)** :
```
Exemple Lecture :
├─ Reconnaissance lettres
│  ├─ Lettres majuscules
│  ├─ Lettres minuscules
│  └─ Lettres cursives
├─ Syllabes simples (CV)
├─ Syllabes complexes (CVC, CCV)
└─ Lecture mots
   ├─ Mots 1 syllabe
   ├─ Mots 2 syllabes
   └─ Mots 3+ syllabes
```

**Granularité Large (globale)** :
```
Exemple Lecture :
├─ Déchiffrage
├─ Lecture courante
└─ Compréhension
```

**Votre choix** : _____________

---

### 8️⃣ Interface Apprenant

**Question** : Les apprenants doivent-ils avoir accès à leur propre suivi ?

- [ ] Oui, consultation complète (plan, exercices, résultats, bilans)
- [ ] Oui, consultation partielle (uniquement exercices et résultats)
- [ ] Non, réservé aux formateurs/admin

**Votre choix** : _____________

---

## 📊 Architecture Proposée (selon vos réponses)

### Base de Données (Tables Supabase à créer)

```sql
-- 1. POSITIONNEMENTS
CREATE TABLE positionnements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    date_positionnement TIMESTAMP DEFAULT NOW(),
    statut TEXT DEFAULT 'en_cours', -- en_cours, terminé, validé
    commentaires_generaux TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. RÉSULTATS POSITIONNEMENT
CREATE TABLE resultats_positionnement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    positionnement_id UUID REFERENCES positionnements(id) ON DELETE CASCADE,
    domaine TEXT, -- lire, écrire, compter, fle
    sous_domaine TEXT,
    niveau_acquis INTEGER, -- 1-5 ou échelle adaptée
    niveau_cible INTEGER,
    observations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. RÉFÉRENTIELS DE FORMATION
CREATE TABLE referentiels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL,
    description TEXT,
    domaine TEXT, -- lire, écrire, compter, fle, code-route
    niveau TEXT, -- débutant, intermédiaire, avancé
    objectifs JSONB,
    duree_estimee INTEGER, -- en heures
    ordre INTEGER,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. COMPÉTENCES
CREATE TABLE competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referentiel_id UUID REFERENCES referentiels(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- ex: LIRE-SYL-01
    intitule TEXT NOT NULL,
    description TEXT,
    prerequis TEXT[], -- codes compétences prérequises
    niveau_difficulte INTEGER, -- 1-5
    ordre INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. PLANS DE FORMATION
CREATE TABLE plans_formation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    date_debut DATE,
    date_fin_prevue DATE,
    statut TEXT DEFAULT 'en_cours', -- en_cours, terminé, abandonné
    objectif_principal TEXT,
    positionnement_id UUID REFERENCES positionnements(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. COMPÉTENCES DU PLAN
CREATE TABLE plan_competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES plans_formation(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES competences(id),
    priorite INTEGER, -- 1=haute, 2=moyenne, 3=basse
    statut TEXT DEFAULT 'a_faire', -- a_faire, en_cours, acquis, non_acquis
    date_attribution DATE DEFAULT CURRENT_DATE,
    date_acquis DATE,
    taux_reussite DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. EXERCICES FORMATION
CREATE TABLE exercices_formation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titre TEXT NOT NULL,
    description TEXT,
    type TEXT, -- quiz, lire, ecrire, compter, code-route
    competence_id UUID REFERENCES competences(id),
    contenu JSONB,
    niveau_difficulte INTEGER,
    duree_estimee INTEGER, -- en minutes
    consignes TEXT,
    correction_auto BOOLEAN DEFAULT true,
    actif BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. ATTRIBUTIONS EXERCICES
CREATE TABLE attributions_exercices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    exercice_id UUID REFERENCES exercices_formation(id),
    plan_id UUID REFERENCES plans_formation(id),
    date_attribution TIMESTAMP DEFAULT NOW(),
    date_limite DATE,
    statut TEXT DEFAULT 'attribue', -- attribue, commence, termine
    obligatoire BOOLEAN DEFAULT true,
    ordre INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. RÉSULTATS EXERCICES
CREATE TABLE resultats_exercices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribution_id UUID REFERENCES attributions_exercices(id),
    apprenant_id UUID REFERENCES users(id),
    exercice_id UUID REFERENCES exercices_formation(id),
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    score DECIMAL(5,2), -- sur 100
    reponses JSONB,
    temps_passe INTEGER, -- en secondes
    nombre_tentatives INTEGER DEFAULT 1,
    statut TEXT DEFAULT 'en_cours', -- en_cours, reussi, echec
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. SUIVIS PÉDAGOGIQUES
CREATE TABLE suivis_pedagogiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    plan_id UUID REFERENCES plans_formation(id),
    date_suivi TIMESTAMP DEFAULT NOW(),
    type TEXT, -- entretien, observation, evaluation
    observations TEXT,
    points_forts TEXT[],
    points_amelioration TEXT[],
    actions_prevues TEXT[],
    formateur_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. BILANS
CREATE TABLE bilans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apprenant_id UUID REFERENCES users(id),
    plan_id UUID REFERENCES plans_formation(id),
    date_bilan DATE DEFAULT CURRENT_DATE,
    type TEXT, -- intermediaire, final, personnalise
    periode_debut DATE,
    periode_fin DATE,
    donnees_statistiques JSONB,
    synthese TEXT,
    competences_acquises TEXT[],
    competences_en_cours TEXT[],
    recommandations TEXT,
    genere_par UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🏗️ Structure des Pages (à créer)

```
📂 admin/formation/
├── index.js                              # Dashboard Formation
├── 📂 positionnements/
│   ├── index.js                          # Liste
│   ├── nouveau.js                        # Créer
│   └── [id].js                           # Détail/Modifier
├── 📂 referentiels/
│   ├── index.js                          # Liste
│   ├── nouveau.js                        # Créer
│   ├── [id].js                           # Détail
│   └── competences.js                    # Gestion
├── 📂 plans/
│   ├── index.js                          # Liste
│   ├── nouveau.js                        # Créer (assistant)
│   ├── [id].js                           # Détail
│   └── assigner-competences.js           # Attribution
├── 📂 exercices/
│   ├── index.js                          # Bibliothèque
│   ├── nouveau.js                        # Créer
│   ├── [id].js                           # Modifier
│   └── attribuer.js                      # Attribution
├── 📂 suivi/
│   ├── index.js                          # Vue d'ensemble
│   ├── [apprenantId].js                  # Suivi individuel
│   ├── statistiques.js                   # Stats globales
│   └── observations.js                   # Saisie observations
└── 📂 bilans/
    ├── index.js                          # Liste
    ├── generer.js                        # Générer
    └── [id].js                           # Consulter
```

---

## 📅 Plan d'Implémentation (estimations)

### Phase 1 : Fondations (1-2 semaines)
- [ ] Créer tables Supabase
- [ ] Structure pages `/admin/formation/`
- [ ] Endpoints API de base
- [ ] Composants réutilisables

### Phase 2 : Positionnements (3-4 jours)
- [ ] Pages positionnements
- [ ] APIs positionnements

### Phase 3 : Référentiels & Compétences (5-7 jours)
- [ ] Pages référentiels
- [ ] Gestion compétences
- [ ] Système prérequis

### Phase 4 : Plans de Formation (1 semaine)
- [ ] Pages plans
- [ ] Assistant création
- [ ] Système suggestions

### Phase 5 : Exercices (1 semaine)
- [ ] Bibliothèque exercices
- [ ] Attribution individualisée

### Phase 6 : Suivi & Résultats (1 semaine)
- [ ] Dashboard suivi
- [ ] Statistiques
- [ ] Graphiques

### Phase 7 : Bilans (3-4 jours)
- [ ] Générateur bilans
- [ ] Templates PDF

### Phase 8 : Interface Apprenant (3-4 jours)
- [ ] Pages côté apprenant

### Phase 9 : Finitions (5-7 jours)
- [ ] Tests
- [ ] Documentation

**DURÉE TOTALE ESTIMÉE** : 6-8 semaines

---

## 🎯 Prochaine Étape

**VEUILLEZ RÉPONDRE AUX 8 QUESTIONS CI-DESSUS**

Une fois vos réponses fournies, je créerai un plan détaillé personnalisé avec :
- Architecture adaptée à vos besoins
- Ordre de développement optimal
- Liste précise des fichiers à créer
- Timeline détaillée

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ✅ HISTORIQUE : Modules Précédents (Terminés)

## PLAN : Interface Admin - Gestion Module Code de la Route

## Analyse de l'existant

✅ **Ce qui existe déjà :**
- Tables : `vocabulaire_code_route`, `definitions_personnalisees_code_route`, `progression_vocabulaire_code_route`
- Interface apprenant complète (`/code-route/vocabulaire`)
- APIs de lecture : `/api/code-route/categories`, `/api/code-route/vocabulaire`
- API de sauvegarde définitions : `/api/code-route/sauvegarder-definition`
- Page admin placeholder : `/admin/code-route/index.js`
- Données : ~150 mots répartis en catégories (Véhicules, Actions, Équipements, Infrastructure, etc.)

⚠️ **Ce qui manque :**
- Interface admin VISUELLE pour gérer le vocabulaire
- APIs admin pour créer/modifier/supprimer/dupliquer des mots
- Système de réorganisation de l'ordre des mots
- **Système d'attribution aux apprenants** (nouveau besoin identifié)
- Statistiques d'utilisation par les apprenants

---

## Fonctionnalités à implémenter

### 1. Vue d'ensemble du vocabulaire (INTERFACE VISUELLE)
- **Cartes visuelles** par mot (style cards avec emoji, catégorie, mot, définition)
- Filtres : catégorie, recherche texte, apprenants assignés
- Vue groupée par catégorie
- Actions rapides sur chaque carte

### 2. Actions sur les mots

#### **Modifier**
- Modal d'édition avec tous les champs
- Champs : mot, définition_simple, catégorie, emoji, ordre_categorie
- Sauvegarde instantanée

#### **Classer/Réorganiser**
- Changer l'ordre dans la catégorie (champs numériques)
- Possibilité de déplacer vers une autre catégorie

#### **Supprimer**
- Confirmation avec warning si apprenants concernés
- Suppression en cascade des définitions liées

#### **Dupliquer**
- Créer une copie du mot (avec suffixe "(copie)")
- Permet de créer des variantes facilement

#### **Attribuer aux apprenants** ⭐ (NOUVELLE FONCTIONNALITÉ)
- Modal de sélection d'apprenants
- Cases à cocher : liste de tous les apprenants
- Bouton "Tous les apprenants" / "Aucun"
- Visualisation : badge sur carte montrant nb d'apprenants assignés
- Par défaut : disponible pour tous OU système d'opt-in à définir

### 3. Création de nouveau vocabulaire
- Bouton "➕ Nouveau mot"
- Formulaire modal
- Attribution aux apprenants directement lors de la création

### 4. Gestion des attributions
- Table intermédiaire `vocabulaire_apprenants` (à créer)
- Si pas d'entrée = disponible pour tous OU système inverse à définir
- API dédiée pour gérer les attributions

---

## Tâches à effectuer

### Phase 0 : CLARIFICATION ✅

**Vocabulaire** : Accessible à TOUS les apprenants (pas d'attribution)
**Quiz sur vocabulaire** : Attribuables via table existante `quiz_assignments`

### Phase 1 : APIs Admin - Vocabulaire

- [ ] **Créer `/api/admin/code-route/vocabulaire.js`**
  - GET : Récupérer tout le vocabulaire
  - POST : Ajouter un nouveau mot
  - PUT : Modifier un mot existant
  - DELETE : Supprimer un mot

- [ ] **Créer `/api/admin/code-route/dupliquer.js`**
  - POST : Dupliquer un mot (avec "(copie)" dans le nom)

### Phase 2 : Interface Admin - Gestion Vocabulaire (VISUELLE avec cartes)

- [ ] **Modifier `/pages/admin/code-route/index.js`**
  - Layout : Header + Filtres + Grille de cartes
  - Cartes visuelles : emoji, catégorie, mot, définition
  - Filtres : catégorie, recherche texte
  - Boutons d'action sur chaque carte : ✏️ Modifier, 🗑️ Supprimer, 📋 Dupliquer

- [ ] **Créer formulaire d'ajout (Modal)**
  - Bouton "➕ Nouveau mot"
  - Champs : mot, définition_simple, catégorie, emoji, ordre_categorie
  - Validation côté client

- [ ] **Créer formulaire d'édition (Modal)**
  - Même structure que formulaire d'ajout
  - Pré-rempli avec données existantes
  - Champ pour changer l'ordre et la catégorie
  - Bouton Annuler/Sauvegarder

- [ ] **Implémenter la suppression**
  - Bouton avec icône poubelle sur carte
  - Modal de confirmation
  - Warning si des apprenants ont créé des définitions

- [ ] **Système de duplication**
  - Bouton avec icône copie sur carte
  - Crée une copie avec "(copie)" dans le nom
  - Ouvre directement le modal d'édition

### Phase 3 : Interface Admin - Création Quiz depuis Vocabulaire

- [ ] **Créer `/pages/admin/code-route/creer-quiz.js`**
  - Sélection de mots du vocabulaire
  - Génération automatique de questions (QCM, matching, etc.)
  - Sauvegarde dans table `quiz` avec catégorie "Code de la Route"

- [ ] **Créer `/pages/admin/code-route/attribuer-quiz.js`**
  - Liste des quiz Code de la Route existants
  - Sélection d'apprenants (cases à cocher)
  - Bouton "Tous" / "Aucun"
  - Sauvegarde dans `quiz_assignments` (table existante)

### Phase 4 : Tests et validation

- [ ] Tester création de nouveau mot
- [ ] Tester modification de mot existant
- [ ] Tester suppression (avec et sans définitions liées)
- [ ] Tester duplication
- [ ] Tester création de quiz depuis vocabulaire
- [ ] Tester attribution de quiz aux apprenants
- [ ] Tester filtres et recherche
- [ ] Vérifier que tous les apprenants voient tout le vocabulaire

---

## Principe de travail

1. **UN SEUL fichier à la fois**
2. **Validation avant chaque modification**
3. **Pas de refactoring non demandé**
4. **Simplicité maximale**

---

## Ordre de développement ✅

**VALIDÉ** : Vocabulaire accessible à TOUS, attribution uniquement pour les QUIZ

Étapes (validation à chaque étape) :

1. **Phase 1** : API vocabulaire (GET/POST/PUT/DELETE) + duplication
2. **Phase 2** : Interface admin vocabulaire (cartes + CRUD)
3. **Phase 3** : Interface création quiz + attribution aux apprenants
4. **Phase 4** : Tests complets

---

## Révision ✅

### Structure Implémentée

**Architecture organisée en 3 niveaux :**

```
/admin/code-route/
├── index.js                    → Menu principal (Vocabulaire | Exercice)
├── vocabulaire/
│   ├── index.js               → Gestion catégories (créer, renommer, supprimer)
│   └── [categorie].js         → Gestion mots par catégorie (ajouter, modifier, supprimer, dupliquer)
└── exercice/
    └── index.js               → Placeholder (à développer)
```

### APIs Créées

1. **`/api/admin/code-route/vocabulaire.js`**
   - GET : Récupérer vocabulaire (avec stats nb_definitions)
   - POST : Ajouter un mot
   - PUT : Modifier un mot
   - DELETE : Supprimer un mot

2. **`/api/admin/code-route/categories.js`** ⭐ NOUVEAU
   - GET : Liste catégories avec compteur
   - POST : Créer catégorie (avec placeholder)
   - PUT : Renommer catégorie (met à jour tous les mots)
   - DELETE : Supprimer catégorie (+ tous les mots)

3. **`/api/admin/code-route/dupliquer.js`**
   - POST : Dupliquer un mot (ajout "(copie)")

### Fonctionnalités Implémentées

**Menu principal** (`/admin/code-route`) :
- 2 cartes : Vocabulaire | Exercice
- Navigation claire

**Gestion catégories** (`/admin/code-route/vocabulaire`) :
- ✅ Créer une catégorie (nom + emoji)
- ✅ Renommer une catégorie (met à jour tous les mots)
- ✅ Supprimer une catégorie (warning si mots présents)
- ✅ Clic sur catégorie → gestion des mots

**Gestion mots par catégorie** (`/admin/code-route/vocabulaire/[categorie]`) :
- ✅ Ajouter un mot (mot, définition, emoji, ordre)
- ✅ Modifier un mot
- ✅ Supprimer un mot (warning si définitions apprenants)
- ✅ Dupliquer un mot (ouvre édition auto)
- ✅ Recherche dans les mots
- ✅ Badge #ordre sur chaque carte
- ✅ Stats : nb définitions apprenants

### Points Techniques

**Placeholder catégorie :**
Lors de la création d'une catégorie vide, un mot `_placeholder_` est créé (filtré dans l'affichage).
Permet d'initialiser la catégorie dans la base.

**Suppression en cascade :**
- Supprimer catégorie → supprime tous les mots
- Supprimer mot → supprime définitions apprenants (ON DELETE CASCADE)

**Auto-ordre :**
Si ordre non spécifié lors de l'ajout, prend automatiquement max(ordre) + 1 de la catégorie.

### Ce qui reste à faire (Phase future)

**Module Exercice :**
- Interface création d'exercices/quiz depuis vocabulaire
- Utiliser table existante `quiz` + `quiz_assignments`
- Attribution aux apprenants via `quiz_assignments`

### Tests à effectuer

1. ✅ Navigation : Menu → Vocabulaire → Catégorie → Mots
2. ✅ Créer une catégorie
3. ✅ Ajouter des mots dans la catégorie
4. ✅ Modifier/Dupliquer/Supprimer un mot
5. ✅ Renommer une catégorie (vérifier que les mots suivent)
6. ✅ Supprimer une catégorie (vérifier warning)
7. ✅ Recherche de mots
8. ✅ Vérifier stats définitions apprenants

### Fichiers Modifiés/Créés

**Pages :**
- `/admin/code-route/index.js` (remplacé)
- `/admin/code-route/vocabulaire/index.js` (nouveau)
- `/admin/code-route/vocabulaire/[categorie].js` (nouveau)
- `/admin/code-route/exercice/index.js` (nouveau)

**APIs :**
- `/api/admin/code-route/vocabulaire.js` (existait)
- `/api/admin/code-route/dupliquer.js` (existait)
- `/api/admin/code-route/categories.js` (nouveau)

---

# PLAN : Drag and Drop Mobile pour Quiz "Mettre dans l'ordre"

## Problème actuel
- Sur mobile, le quiz "ordering" utilise des boutons ▲ ▼ pour déplacer les items
- L'utilisateur veut du drag and drop natif mobile comme sur PC

## État actuel du code (QuizPlayerOrdering.js)
- **Ligne 353** : `draggable={!isMobile}` - Drag désactivé sur mobile
- **Lignes 422-457** : Boutons ▲ ▼ affichés uniquement sur mobile
- **Lignes 123-149** : Handlers drag and drop PC (dragStart, dragOver, drop)
- **Lignes 151-167** : Fonctions moveUp/moveDown pour les boutons

## Solution proposée
Activer le drag and drop mobile avec les événements tactiles (touch events)

### Modifications à apporter au fichier `components/QuizPlayerOrdering.js`

1. **Ajouter un state pour le touch drag** (après ligne 12)
   - `touchStartY` : position Y initiale du touch
   - `touchDraggedItem` : item en cours de drag touch
   - `touchTargetIndex` : index cible calculé pendant le drag

2. **Créer les handlers touch** (après ligne 149)
   - `handleTouchStart(e, item, index)` : Début du drag tactile
   - `handleTouchMove(e)` : Déplacement tactile avec calcul de position cible
   - `handleTouchEnd(e)` : Fin du drag, réorganisation de l'ordre

3. **Modifier la ligne 353** : Rendre les items draggables sur mobile
   - Avant : `draggable={!isMobile}`
   - Après : Retirer l'attribut draggable (on utilise uniquement touch)

4. **Ajouter les handlers touch aux items** (lignes 351-458)
   - `onTouchStart={(e) => handleTouchStart(e, item, index)}`
   - `onTouchMove={handleTouchMove}`
   - `onTouchEnd={handleTouchEnd}`

5. **Supprimer les boutons ▲ ▼ sur mobile** (lignes 421-457)
   - Remplacer par une icône de drag (⋮⋮) pour indiquer la possibilité de drag

6. **Ajouter un feedback visuel pendant le drag mobile**
   - Opacité réduite de l'item dragué (style dynamique)
   - Indicateur visuel de la position de drop (ligne de séparation)

## Impact minimal
- UN SEUL fichier modifié : `components/QuizPlayerOrdering.js`
- Pas de dépendances externes
- Pas de modifications des données
- Compatible avec le système PC existant

## Tâches à effectuer

- [x] Ajouter les states pour touch drag (ligne ~12)
- [x] Créer handleTouchStart (après ligne 149)
- [x] Créer handleTouchMove (calcul position cible)
- [x] Créer handleTouchEnd (réorganisation)
- [x] Ajouter événements touch aux items (lignes 351-458)
- [x] Supprimer boutons ▲ ▼ mobile (lignes 421-457)
- [x] Ajouter icône drag ⋮⋮ (remplacement des boutons)
- [x] Ajouter feedback visuel (opacité + ligne indicateur)
- [ ] Tester sur mobile réel
- [ ] Vérifier que PC fonctionne toujours

## Révision finale

### Modifications apportées (fichier `components/QuizPlayerOrdering.js`)

**1. States ajoutés (lignes 14-18)**
```js
const [touchStartY, setTouchStartY] = useState(null)
const [touchDraggedItem, setTouchDraggedItem] = useState(null)
const [touchDraggedIndex, setTouchDraggedIndex] = useState(null)
const [touchCurrentY, setTouchCurrentY] = useState(null)
```

**2. Handlers touch créés (lignes 175-218)**
- `handleTouchStart(e, item, index)` : Initialise le drag avec position de départ
- `handleTouchMove(e)` : Suit le mouvement du doigt, empêche le scroll
- `handleTouchEnd(e)` : Calcule le déplacement et réorganise les items

**3. Événements touch ajoutés (lignes 410-412)**
```js
onTouchStart={(e) => isMobile && handleTouchStart(e, item, index)}
onTouchMove={(e) => isMobile && handleTouchMove(e)}
onTouchEnd={(e) => isMobile && handleTouchEnd(e)}
```

**4. Boutons ▲ ▼ supprimés** (anciennes lignes 472-508)
Remplacés par une icône drag ⋮⋮ (lignes 479-495)

**5. Feedback visuel ajouté (lignes 426-427)**
- Opacité 0.5 pendant le drag
- Scale 1.02 pour effet de "lift"
- Cursor: grab pour indiquer le drag possible

**6. Calcul intelligent du déplacement**
Le handler `handleTouchEnd` calcule combien d'items déplacer en fonction de la distance parcourue (deltaY / hauteur d'item)

### Ce qui fonctionne maintenant

✅ **Sur mobile :** Drag and drop tactile fluide
✅ **Sur PC :** Drag and drop souris (inchangé)
✅ **Feedback visuel :** L'item devient transparent pendant le drag
✅ **Icône intuitive :** ⋮⋮ indique clairement qu'on peut drag
✅ **Pas de scroll :** Le scroll de la page est désactivé pendant le drag

### Tests à effectuer

1. Tester sur mobile réel (Android/iOS)
2. Vérifier le drag sur plusieurs items
3. Vérifier que le PC fonctionne toujours
4. Tester avec beaucoup d'items (10+)
5. Vérifier la validation du score
