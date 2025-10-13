# Phase 2 - Plans de Formation : ÉTAT D'AVANCEMENT

**Date**: 10 octobre 2025
**Statut global**: 70% complété ⚙️

---

## ✅ TERMINÉ

### APIs Backend (4/4 - 100%)

1. **`/api/admin/formation/plans/index.js`** ✅
   - GET: Liste des plans avec filtres (apprenant_id, formateur_id, statut)
   - POST: Création d'un nouveau plan

2. **`/api/admin/formation/plans/[id].js`** ✅
   - GET: Détail complet d'un plan avec toutes les compétences
   - PUT: Mise à jour (dates, objectifs, statut)
   - DELETE: Suppression du plan et compétences associées

3. **`/api/admin/formation/plans/[id]/competences.js`** ✅
   - GET: Liste des compétences du plan
   - POST: Ajout/modification en batch (upsert automatique)
   - DELETE: Retrait d'une compétence spécifique

4. **`/api/admin/formation/plans/generer-depuis-positionnement.js`** ✅
   - POST: Génération automatique d'un plan
   - **Logique implémentée:**
     - Analyse des évaluations (sélectionne "non_acquis" + "en_cours")
     - Assignation priorités: haute (non_acquis), moyenne (en_cours)
     - Tri pédagogique: domaine > catégorie > compétence (par ordre)
     - Création plan + insertion compétences en une transaction
     - Retourne statistiques (total, haute, moyenne)

### Composants React (3/3 - 100%)

1. **`PlanGenerator.js`** ✅
   - Prévisualisation avant génération
   - Analyse du positionnement en temps réel
   - Statistiques par domaine et priorité
   - Message d'avertissement si 0 compétence

2. **`CompetenceSelector.js`** ✅
   - Recherche full-text
   - Filtres domaine + catégorie (cascading)
   - Sélection multiple avec checkboxes
   - Compteur en temps réel

3. **`PlanSummary.js`** ✅
   - Vue d'ensemble complète
   - Barre de progression (% validé)
   - Statistiques par statut (à faire, en cours, validé)
   - Répartition par priorité et domaine

### Dashboard Formation

- ✅ Menu "Plans de formation" activé et cliquable
- ✅ Route: `/admin/formation/plans`

---

## 🚧 À TERMINER (3 pages manquantes)

### Page 1: Liste des Plans
**Route:** `/admin/formation/plans/index.js`

**Fonctionnalités requises:**
- Tableau/cartes des plans existants
- Filtres: recherche, apprenant, statut (brouillon, actif, terminé)
- Affichage: apprenant, formateur, dates, progression, nb compétences
- Actions: Voir détail, Modifier, Supprimer
- Bouton "Nouveau plan"

**Code suggéré:**
```javascript
// Similaire à pages/admin/formation/positionnements/index.js
// Remplacer l'API par /api/admin/formation/plans
// Ajouter colonne "Progression" avec pourcentage
```

### Page 2: Nouveau Plan
**Route:** `/admin/formation/plans/nouveau.js`

**Fonctionnalités requises:**
- **Option A:** Générer depuis un positionnement existant
  - Sélecteur de positionnement (dropdown avec apprenants)
  - Composant `<PlanGenerator />` pour prévisualisation
  - Bouton "Générer automatiquement"

- **Option B:** Création manuelle
  - Sélection apprenant (`<ApprenantSelector />`)
  - Dates de début et fin prévue
  - Objectifs généraux (textarea)
  - Composant `<CompetenceSelector />` pour ajouter compétences manuellement

- Redirection vers détail du plan après création

**Code suggéré:**
```javascript
import PlanGenerator from '@/components/formation/PlanGenerator'
import ApprenantSelector from '@/components/formation/ApprenantSelector'
import CompetenceSelector from '@/components/formation/CompetenceSelector'

// Toggle entre "Générer depuis positionnement" et "Création manuelle"
const [mode, setMode] = useState('auto') // 'auto' ou 'manuel'
```

### Page 3: Détail Plan
**Route:** `/admin/formation/plans/[id].js`

**Fonctionnalités requises:**
- **En-tête:**
  - Nom apprenant + formateur
  - Dates (début, fin prévue)
  - Statut (brouillon, actif, terminé, archivé)

- **Section 1:** Résumé (`<PlanSummary />`)

- **Section 2:** Liste des compétences
  - Tableau: Compétence | Domaine | Priorité | Statut | Actions
  - Tri par ordre pédagogique
  - Actions: Modifier priorité, Changer statut, Retirer du plan
  - Badge couleur par priorité (rouge=haute, orange=moyenne, vert=faible)

- **Section 3:** Ajouter des compétences
  - Bouton "Ajouter des compétences"
  - Modale avec `<CompetenceSelector />`

- **Section 4:** Objectifs et notes
  - Textarea pour objectifs généraux
  - Textarea par compétence pour objectifs spécifiques

- **Actions finales:**
  - Sauvegarder
  - Changer statut (activer, terminer, archiver)
  - Supprimer le plan

**Code suggéré:**
```javascript
// Similaire à pages/admin/formation/positionnements/[id].js
// Remplacer EvaluationGrid par une liste de compétences éditable
// Ajouter gestion priorités et statuts par compétence
```

---

## 📊 Structure des données

### Tables utilisées (déjà créées en Phase 1)

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
├── ordre (INTEGER)
├── objectif_specifique (TEXT)
├── statut (VARCHAR) - 'a_faire', 'en_cours', 'valide'
├── created_at
└── updated_at
```

---

## 🎯 Workflow complet Phase 2

```
1. Formateur valide un positionnement en Phase 1
2. Formateur va dans "Plans de formation"
3. Clique "Nouveau plan"
4. Choisit "Générer depuis positionnement"
5. Sélectionne le positionnement validé
6. Prévisualisation apparaît (X compétences, priorités)
7. Clique "Générer le plan"
8. Redirigé vers détail du plan (brouillon)
9. Peut ajouter/retirer des compétences manuellement
10. Peut modifier priorités et objectifs
11. Change statut en "Actif" quand prêt
12. Plan visible dans la liste avec progression
```

---

## 🧪 Tests à effectuer (quand pages créées)

### Test 1: Génération automatique
1. Créer un positionnement test avec 10+ évaluations variées
2. Aller dans Plans → Nouveau plan
3. Sélectionner "Générer depuis positionnement"
4. Vérifier prévisualisation cohérente
5. Générer le plan
6. Vérifier que seules compétences "non_acquis" et "en_cours" sont présentes
7. Vérifier l'ordre pédagogique (domaine > catégorie > compétence)
8. Vérifier priorités (haute=non_acquis, moyenne=en_cours)

### Test 2: Création manuelle
1. Nouveau plan en mode manuel
2. Sélectionner apprenant
3. Ajouter 5 compétences via CompetenceSelector
4. Définir dates et objectifs
5. Créer le plan
6. Vérifier toutes les données sauvegardées

### Test 3: Modification du plan
1. Ouvrir un plan existant
2. Ajouter 2 nouvelles compétences
3. Changer priorité d'une compétence
4. Modifier objectifs généraux
5. Sauvegarder
6. Recharger la page → vérifier persistance

### Test 4: Changement de statut
1. Plan en brouillon → passer en "actif"
2. Travailler sur compétences → passer en "terminé"
3. Archiver un vieux plan
4. Vérifier filtres dans la liste

---

## 📝 Commandes pour finaliser Phase 2

```bash
# 1. Créer les 3 pages manquantes (templates fournis ci-dessus)

# 2. Tester en local
npm run dev

# 3. Naviguer vers:
http://localhost:3000/admin/formation/plans

# 4. Vérifier build
npm run build

# 5. Si tout OK, commiter
git add .
git commit -m "Phase 2: Plans de formation complets"
```

---

## 🚀 Ce qui est déjà utilisable

Même sans les pages, les APIs fonctionnent ! Tu peux tester via curl ou Postman:

```bash
# Générer un plan depuis positionnement
curl -X POST http://localhost:3000/api/admin/formation/plans/generer-depuis-positionnement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"positionnement_id": "UUID_DU_POSITIONNEMENT"}'

# Lister les plans
curl http://localhost:3000/api/admin/formation/plans \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ajouter des compétences à un plan
curl -X POST http://localhost:3000/api/admin/formation/plans/PLAN_ID/competences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "competences": [
      {
        "competence_id": "UUID",
        "priorite": "haute",
        "ordre": 1,
        "objectif_specifique": "Objectif..."
      }
    ]
  }'
```

---

## ⏭️ Prochaines étapes

**Pour finaliser Phase 2 (estimé: 2-3h):**
1. Créer `pages/admin/formation/plans/index.js` (liste)
2. Créer `pages/admin/formation/plans/nouveau.js` (création)
3. Créer `pages/admin/formation/plans/[id].js` (détail)
4. Tester le workflow complet
5. Ajuster styles si besoin

**Phase 3 - Attribution d'exercices (après Phase 2):**
- Lier plans aux modules existants (Quiz, Lire, Écrire, Code Route)
- Créer API d'attribution
- Interface pour assigner exercices par compétence
- Suivi des résultats

---

## 💡 Suggestions d'amélioration

- [ ] Export PDF du plan
- [ ] Duplication de plan (template)
- [ ] Historique des modifications
- [ ] Notifications email quand plan activé
- [ ] Vue calendrier (échéances)
- [ ] Graphique de progression

---

**État actuel: PRÊT pour finalisation pages UI** ✨

Toute la logique backend et composants sont fonctionnels. Il ne reste que 3 pages à créer pour avoir un système complet de gestion de plans de formation !
