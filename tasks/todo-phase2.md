# TODO - Phase 2 : Plans de Formation

## 📋 Vue d'ensemble

**Objectif**: Générer automatiquement des plans de formation basés sur les résultats des positionnements, et permettre l'attribution d'exercices personnalisés.

**Durée estimée**: 1 semaine

---

## ✅ Pré-requis (COMPLÉTÉS)

- [x] Phase 1 - Positionnement terminée
- [x] 79 compétences chargées en BDD
- [x] Système d'évaluation fonctionnel
- [x] APIs de base créées

---

## 📝 Tâches à réaliser

### 1. API - Plans de formation

- [ ] **`/api/admin/formation/plans/index.js`**
  - GET: Liste tous les plans
  - POST: Créer un nouveau plan (manuel ou depuis positionnement)

- [ ] **`/api/admin/formation/plans/[id].js`**
  - GET: Détail d'un plan avec compétences associées
  - PUT: Mettre à jour un plan
  - DELETE: Supprimer un plan

- [ ] **`/api/admin/formation/plans/[id]/competences.js`**
  - GET: Liste des compétences du plan
  - POST: Ajouter/modifier des compétences au plan (batch)
  - DELETE: Retirer une compétence du plan

- [ ] **`/api/admin/formation/plans/generer-depuis-positionnement.js`**
  - POST: Analyser un positionnement et générer un plan automatiquement
  - Logique: Sélectionner compétences "non_acquis" et "en_cours"
  - Calculer priorités

### 2. Composants React

- [ ] **`PlanGenerator`**
  - Analyseur de positionnement
  - Prévisualisation du plan généré
  - Bouton "Générer le plan"

- [ ] **`CompetenceSelector`**
  - Sélection manuelle de compétences
  - Filtrage par domaine/catégorie
  - Ajout/retrait par glisser-déposer (optionnel)

- [ ] **`CompetencePriorityEditor`**
  - Modification de la priorité (haute, moyenne, faible)
  - Réorganisation de l'ordre
  - Ajout d'objectifs/notes par compétence

- [ ] **`PlanSummary`**
  - Vue résumé d'un plan
  - Statistiques (nb compétences, domaines couverts)
  - Progression (si exercices attribués)

### 3. Pages Admin

- [ ] **`/admin/formation/plans/index.js`**
  - Liste des plans existants
  - Filtres: apprenant, statut, date
  - Actions: voir, modifier, supprimer

- [ ] **`/admin/formation/plans/nouveau.js`**
  - Choix: générer depuis positionnement OU création manuelle
  - Sélection du positionnement source
  - Prévisualisation avant création

- [ ] **`/admin/formation/plans/[id].js`**
  - Détail du plan
  - Liste des compétences avec priorités
  - Modification des objectifs
  - Attribution d'exercices (lien vers Phase 3)

### 4. Algorithme de génération

- [ ] **Logique d'analyse du positionnement**
  ```
  1. Récupérer toutes les évaluations
  2. Filtrer par niveau:
     - Priorité HAUTE: non_acquis
     - Priorité MOYENNE: en_cours
     - (ignorer: acquis, expert)
  3. Organiser par domaine
  4. Respecter l'ordre pédagogique (colonne `ordre`)
  5. Générer le plan avec métadonnées
  ```

- [ ] **Gestion des dépendances** (optionnel pour Phase 2)
  - Certaines compétences sont pré-requis d'autres
  - À implémenter si besoin

---

## 🗄️ Structure de données

### Tables à utiliser

```sql
formation_plans
├── id (UUID)
├── apprenant_id (UUID) → users
├── formateur_id (UUID) → users
├── positionnement_id (UUID) → formation_positionnements (optionnel)
├── date_creation
├── date_debut
├── date_fin_prevue
├── objectifs_generaux (TEXT)
├── statut (VARCHAR) - 'brouillon', 'actif', 'termine', 'archive'
├── created_at
└── updated_at

formation_plan_competences
├── id (UUID)
├── plan_id (UUID) → formation_plans
├── competence_id (UUID) → formation_competences
├── priorite (VARCHAR) - 'haute', 'moyenne', 'faible'
├── ordre (INTEGER) - ordre dans le plan
├── objectif_specifique (TEXT)
├── statut (VARCHAR) - 'a_faire', 'en_cours', 'valide'
├── created_at
└── updated_at
```

**Note**: Ces tables existent déjà (créées en Phase 1 migration), il suffit de les utiliser.

---

## 🎯 User Stories

### US1: Génération automatique
**En tant que** formateur
**Je veux** générer un plan depuis un positionnement validé
**Afin de** gagner du temps et avoir une base de travail

**Critères d'acceptation:**
- Je peux sélectionner un positionnement validé
- Le système analyse les compétences "non acquis" et "en cours"
- Un plan est généré avec les compétences priorisées
- Je peux prévisualiser avant de créer
- Le plan est modifiable après génération

### US2: Création manuelle
**En tant que** formateur
**Je veux** créer un plan manuellement
**Afin de** personnaliser entièrement le parcours

**Critères d'acceptation:**
- Je peux créer un plan sans positionnement
- Je peux chercher et ajouter des compétences
- Je peux définir la priorité de chaque compétence
- Je peux réorganiser l'ordre

### US3: Modification du plan
**En tant que** formateur
**Je veux** modifier un plan existant
**Afin de** l'adapter au fur et à mesure

**Critères d'acceptation:**
- Je peux ajouter/retirer des compétences
- Je peux changer les priorités
- Je peux modifier les objectifs
- Je peux changer le statut (brouillon, actif, terminé)

---

## 🧪 Tests recommandés

1. **Génération depuis positionnement**
   - Créer un positionnement test avec évaluations variées
   - Générer un plan
   - Vérifier que seules les compétences "non acquis" et "en cours" sont présentes
   - Vérifier l'ordre et les priorités

2. **Création manuelle**
   - Créer un plan vierge
   - Ajouter manuellement 5-10 compétences
   - Définir priorités et objectifs
   - Sauvegarder

3. **Modification**
   - Ouvrir un plan existant
   - Ajouter/retirer des compétences
   - Modifier priorités
   - Vérifier persistance

4. **Navigation**
   - Vérifier liens entre positionnement et plan
   - Vérifier filtres dans la liste
   - Vérifier suppression

---

## 📊 Métriques de succès

- ✅ Génération automatique fonctionnelle en < 2 secondes
- ✅ Interface de modification intuitive
- ✅ Aucune perte de données lors des sauvegardes
- ✅ Workflow positionnement → plan → exercices fluide

---

## 🔗 Liens avec Phase 3

Phase 3 (Attribution d'exercices) dépend de Phase 2:

```
Plan de formation → Compétences priorisées → Exercices attribués
```

Dans la page de détail du plan, on ajoutera:
- Bouton "Attribuer des exercices" par compétence
- Lien vers les modules existants (Quiz, Lire, Écrire, etc.)

---

## ⚠️ Points d'attention

1. **Performance**
   - Génération de plan peut prendre du temps si 79 compétences
   - Utiliser Promise.all pour requêtes parallèles

2. **UX**
   - Rendre la modification de plan simple (drag & drop?)
   - Feedback visuel lors de la génération

3. **Données**
   - Gérer le cas où positionnement a 0 compétences "non acquis"
   - Permettre ajout manuel même si auto-génération

4. **Cohérence**
   - Respecter l'ordre pédagogique des compétences
   - Maintenir la hiérarchie domaine > catégorie > compétence

---

## 🚀 Go / No-Go

**Prêt à démarrer Phase 2 si:**
- ✅ Phase 1 complètement fonctionnelle
- ✅ Tests Phase 1 réussis
- ✅ Tables `formation_plans` et `formation_plan_competences` existantes en BDD
- ✅ Validation utilisateur de l'interface Phase 1

---

## 📅 Planning suggéré

**Jour 1-2**: APIs (4 endpoints)
**Jour 3**: Composants React (4 composants)
**Jour 4-5**: Pages admin (3 pages)
**Jour 6**: Algorithme de génération
**Jour 7**: Tests et ajustements

---

## 💡 Idées d'amélioration (optionnel)

- [ ] Export PDF du plan
- [ ] Envoi email au formateur quand plan créé
- [ ] Historique des modifications du plan
- [ ] Duplication de plan (template)
- [ ] Statistiques sur les plans (temps moyen, nb compétences)

---

**État actuel: EN ATTENTE de validation Phase 1**
