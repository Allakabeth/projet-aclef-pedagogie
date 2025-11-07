# Ajout Imagiers Partagés + Menu Quiz

**Date :** 29 octobre 2025
**Objectif :** Ajouter fonctionnalités de partage d'imagiers et système de quiz QCM

---

## FONCTIONNALITÉ 1 : IMAGIERS PARTAGÉS

### Base de données
- [ ] Ajouter colonne `shared` (boolean, default: false) dans table `imagiers`
- [ ] Migration SQL pour ajouter le champ

### API
- [ ] Créer `/api/imagiers/share` - Partager/départager un imagier
  - PUT method
  - Toggle `shared` field
  - Vérifier que l'utilisateur est le créateur

- [ ] Créer `/api/imagiers/shared-list` - Liste des imagiers partagés
  - GET method
  - Retourne tous les imagiers avec `shared = true`
  - Accessible par tous les apprenants
  - Exclure les imagiers de l'utilisateur connecté (on affiche seulement ceux des autres)

- [ ] Utiliser `/api/imagiers/duplicate` existante - Import d'un imagier partagé
  - Déjà créée, fonctionne parfaitement
  - L'utilisateur devient propriétaire de la copie

### Frontend

**Modification du menu principal (`pages/imagiers.js`) :**
- [ ] Ajouter bouton "📚 Imagiers partagés" (couleur : vert)

**Création page imagiers partagés (`pages/imagiers/partages.js`) :**
- [ ] Liste des imagiers partagés par d'autres utilisateurs
- [ ] Cards avec titre, description, nombre d'éléments, créateur
- [ ] Bouton "📥 Importer" pour dupliquer l'imagier dans "Mes imagiers"
- [ ] Bouton "👁️ Aperçu" pour voir l'imagier en lecture seule (optionnel)
- [ ] Après import : l'utilisateur devient propriétaire et peut modifier sa copie
- [ ] Message de confirmation : "✅ Imagier importé dans Mes imagiers"

**Modification mes-imagiers.js :**
- [ ] Ajouter bouton "🔗 Partager" / "🔒 Retirer le partage" dans mode liste
- [ ] Icône de statut partagé dans la card (🌍 si partagé)
- [ ] Appel API pour toggle le partage

---

## FONCTIONNALITÉ 2 : MENU QUIZ

### Frontend

**Modification du menu principal (`pages/imagiers.js`) :**
- [ ] Ajouter bouton "🎯 Quiz" (couleur : rouge/rose)

**Création page quiz (`pages/imagiers/quiz.js`) :**

**Étape 1 : Sélection de l'imagier**
- [ ] Liste des imagiers de l'utilisateur + imagiers partagés
- [ ] Filtrer ceux qui ont au moins 4 éléments avec question
- [ ] Bouton "Démarrer le quiz"

**Étape 2 : Configuration**
- [ ] Choix du nombre de propositions : 4 ou 12 (radio buttons)
- [ ] Afficher un message si l'imagier a < 12 éléments

**Étape 3 : Jeu du quiz**
- [ ] Afficher l'image (grande taille)
- [ ] Afficher la question SI elle existe
- [ ] Sinon afficher : "Qu'est-ce que c'est ?"
- [ ] QCM avec 4 ou 12 boutons selon le choix
  - 1 bonne réponse (le mot correct)
  - 3 ou 11 mauvaises réponses (autres mots de l'imagier)
- [ ] Feedback immédiat :
  - ✅ Bonne réponse : bouton vert + son/animation
  - ❌ Mauvaise réponse : bouton rouge + réessayer
- [ ] Bouton "Suivant" après bonne réponse
- [ ] Compteur : "Question X / N"
- [ ] Score : "X bonnes réponses"

**Étape 4 : Écran de fin**
- [ ] Score final : "X / N bonnes réponses"
- [ ] Pourcentage de réussite
- [ ] Félicitations ou encouragements
- [ ] Bouton "Recommencer"
- [ ] Bouton "Retour aux imagiers"

### Design
- **Couleur principale :** Rouge/rose (`#ef4444`, `#f87171`)
- **Disposition :** Image centrée + QCM vertical ou grille 2x2 (selon 4 ou 12)
- **Police :** Grande lisibilité (public alphabétisation)

---

## SCHÉMA DE NAVIGATION

```
Menu Imagiers
├── Créer un imagier
├── Mes imagiers
├── 📚 Imagiers partagés [NOUVEAU]
│   └── Visualisation en lecture seule
├── Où est-ce ?
├── Qu'est-ce ?
└── 🎯 Quiz [NOUVEAU]
    ├── Sélection imagier (mes imagiers + partagés)
    ├── Choix nombre de propositions (4 ou 12)
    └── Jeu de quiz QCM
```

---

## STRUCTURE DES FICHIERS

### À créer
```
pages/imagiers/partages.js       - Liste des imagiers partagés
pages/imagiers/quiz.js            - Jeu de quiz QCM
pages/api/imagiers/share.js       - API partage imagier
pages/api/imagiers/shared-list.js - API liste partagés
```

### À modifier
```
pages/imagiers.js                 - Ajout 2 nouveaux boutons
pages/imagiers/mes-imagiers.js    - Ajout bouton partager
```

### Migration SQL
```
supabase/migrations/add_shared_field.sql
```

---

## ✅ QUESTIONS DE VALIDATION - RÉPONSES

### 1. Imagiers partagés
- **Q:** Les imagiers partagés sont-ils visibles par TOUS les apprenants ou seulement certains ?
- **R :** Tous les apprenants ✅

- **Q:** Le créateur peut-il modifier un imagier partagé après l'avoir partagé ?
- **R :** Oui, mais chaque apprenant **importe** (duplique) l'imagier. L'original reste au créateur, la copie appartient à l'importateur ✅

### 2. Quiz
- **Q:** Toutes les questions de l'imagier ou seulement X questions ?
- **R :** Toutes les questions ✅

- **Q:** Ordre des questions : aléatoire ou séquentiel ?
- **R :** Aléatoire ✅

- **Q:** Peut-on faire le quiz plusieurs fois ?
- **R :** Oui, avec bouton "Recommencer" ✅

- **Q:** Faut-il stocker les scores en base de données ?
- **R :** Non, pas pour l'instant (à faire plus tard avec le suivi pédagogique) ✅

- **Q:** Si l'imagier a moins de 4 ou 12 éléments, que faire ?
- **R :** ✅
  - Si < 4 éléments : message d'erreur "Imagier trop petit"
  - Si entre 4 et 12 : proposer seulement le mode 4 propositions

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Migration SQL** - Ajouter champ `shared`
2. **API share** - Créer endpoint de partage
3. **API shared-list** - Créer endpoint liste partagés
4. **Bouton partager** - Ajouter dans mes-imagiers.js
5. **Page imagiers partagés** - Créer pages/imagiers/partages.js
6. **Bouton menu Quiz** - Ajouter dans pages/imagiers.js
7. **Page Quiz** - Créer pages/imagiers/quiz.js avec toute la logique

---

## ✅ PLAN VALIDÉ - PRÊT À CODER ! 🚀

**Décisions finales :**
1. ✅ Imagiers partagés = système d'IMPORT (duplication)
2. ✅ Pas de stockage des scores (pour l'instant)
3. ✅ Mode 4 propositions si < 12 éléments

**Ordre d'exécution :**
1. Migration SQL → API share → API shared-list
2. Bouton partager + icône dans mes-imagiers.js
3. Page imagiers partagés avec bouton "Importer"
4. Page Quiz avec choix 4 ou 12 propositions
5. Tests et déploiement
