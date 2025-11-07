# 🎯 Ajout des exercices "Reconnaître les Mots"

## 📋 Objectif

Créer deux nouveaux exercices similaires à "ou-est-ce" et "qu'est-ce", mais qui travaillent sur les **mots individuels** plutôt que sur les groupes de sens.

**IMPORTANT** : Ces exercices se situent **AVANT** la séparation mots/syllabes dans le parcours pédagogique.

## 🎮 Les deux exercices à créer

### 1. **"Écoute et trouve"** (Audio → Texte)
- 🔊 L'apprenant **ENTEND** un mot
- 📝 Il doit **CLIQUER** sur le mot écrit correspondant parmi **4 à 12 choix** (configurable)
- **Option à ajouter** : Nombre de mots présentés (slider 4-12)
- Similaire à : `/lire/ou-est-ce.js` (mais avec des mots)

### 2. **"Lis et trouve"** (Texte → Audio)
- 📝 L'apprenant **VOIT** un mot écrit
- 🔊 Il doit **TROUVER** le bon audio parmi **4 à 8 boutons** (configurable)
- **Option à ajouter** : Nombre de sons présentés (slider 4-8)
- Similaire à : `/lire/quest-ce.js` (mais avec des mots)

## 📊 Source des données

Les mots proviennent de la table **`mots_classifies`** :
- **TOUS les mots** (mono + multi) du/des texte(s) sélectionné(s)
- Création d'une nouvelle API : `/api/mots-classifies/tous-les-mots.js`
- Format : `{ mots: [{ id, mot, texte_titre, classification }] }`

## ✅ Plan de Tâches

### Phase 1 : Créer l'API pour récupérer les mots
- [ ] Créer `/api/mots-classifies/tous-les-mots.js`
- [ ] L'API retourne TOUS les mots (mono + multi) des textes sélectionnés
- [ ] Format : `{ mots: [{ id, mot, texte_titre, classification }] }`

### Phase 2 : Créer "Écoute et trouve" (Audio → Texte)
- [ ] Créer `/pages/lire/ecoute-et-trouve.js`
- [ ] S'inspirer de `/pages/lire/ou-est-ce.js`
- [ ] Modifications principales :
  - Charger les MOTS au lieu des groupes de sens
  - **Ajouter option : Nombre de choix (slider 4-12)**
  - Afficher UN mot à trouver parmi X étiquettes (X = option choisie)
  - Gestion audio avec voix personnalisée + ElevenLabs
- [ ] Ajouter un lien dans le menu `/pages/lire/index.js`

### Phase 3 : Créer "Lis et trouve" (Texte → Audio)
- [ ] Créer `/pages/lire/lis-et-trouve.js`
- [ ] S'inspirer de `/pages/lire/quest-ce.js`
- [ ] Modifications principales :
  - Charger les MOTS au lieu des groupes de sens
  - **Ajouter option : Nombre de sons (slider 4-8)**
  - Afficher UN mot écrit
  - X boutons audio à écouter (X = option choisie)
- [ ] Ajouter un lien dans le menu `/pages/lire/index.js`

### Phase 4 : Tests et ajustements
- [ ] Tester avec des textes contenant peu de mots (5-10)
- [ ] Tester avec des textes contenant beaucoup de mots (50+)
- [ ] Vérifier la gestion des voix personnalisées
- [ ] Vérifier la gestion du cache audio
- [ ] Tester sur mobile (responsive)

## 🎨 Interface prévue

### Exercice 1 : "Écoute et trouve" (Audio → Texte)
```
┌─────────────────────────────────────┐
│  🎯 Écoute et trouve                │
├─────────────────────────────────────┤
│  Configuration :                    │
│  Nombre de mots : [====●====] 8     │
│                   4 ←→ 12           │
│                                     │
│  🔊 [Bouton Écouter]                │
│                                     │
│  Cliquez sur le mot que vous       │
│  entendez :                         │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │patate│ │cerise│ │banane│        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │pomme │ │orange│ │fraise│        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐                 │
│  │melon │ │kiwi  │                 │
│  └──────┘ └──────┘                 │
└─────────────────────────────────────┘
```

### Exercice 2 : "Lis et trouve" (Texte → Audio)
```
┌─────────────────────────────────────┐
│  🔊 Lis et trouve                   │
├─────────────────────────────────────┤
│  Configuration :                    │
│  Nombre de sons : [====●==] 6       │
│                   4 ←→ 8            │
│                                     │
│  Trouvez l'audio qui correspond à : │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        PATATE               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Écoutez les audios :              │
│                                     │
│  ┌──────────┐ ┌──────────┐         │
│  │ 1        │ │ 2        │         │
│  │ 🔊  ✅   │ │ 🔊  ✅   │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 3        │ │ 4        │         │
│  │ 🔊  ✅   │ │ 🔊  ✅   │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 5        │ │ 6        │         │
│  │ 🔊  ✅   │ │ 🔊  ✅   │         │
│  └──────────┘ └──────────┘         │
└─────────────────────────────────────┘
```

## 🔄 Différences avec "ou-est-ce" et "qu-est-ce"

| Aspect | Groupes de sens | Mots |
|--------|----------------|------|
| **Source de données** | `groupes_sens` | `mots_classifies` |
| **API** | `/api/textes/get/[id]` | `/api/mots-classifies/tous-les-mots` (à créer) |
| **Contenu** | Phrases courtes | Mots isolés |
| **Volume** | 10-50 groupes/texte | 50-200 mots/texte |

## ⚙️ Configuration technique

### Options de jeu
- ✅ Ordre de lecture : Aléatoire / Séquentiel
- ✅ Affichage des choix : Mélangé / Fixe
- ✅ Voix : Voix personnalisée / ElevenLabs
- ✅ Sélection de textes multiples
- ✅ **NOUVEAU - Exercice 1 : Nombre de mots affichés (slider 4-12)**
- ✅ **NOUVEAU - Exercice 2 : Nombre de sons présentés (slider 4-8)**

### Système de scoring
- ✅ Score : X/Y (bonnes réponses / tentatives)
- ✅ Progression : X/Y (mots complétés / mots totaux)
- ✅ Pourcentage final

### Responsive
- ✅ Adaptation mobile (masquage d'éléments desktop)
- ✅ Boutons simplifiés sur mobile (icônes uniquement)

## 📝 Fichiers à créer/modifier

### Nouveaux fichiers
1. `/pages/api/mots-classifies/tous-les-mots.js` (API - retourne tous les mots mono + multi)
2. `/pages/lire/ecoute-et-trouve.js` (Exercice 1 : Audio → Texte, 4-12 choix)
3. `/pages/lire/lis-et-trouve.js` (Exercice 2 : Texte → Audio, 4-8 sons)

### Fichiers à modifier
1. `/pages/lire/index.js` (Ajouter liens vers "Écoute et trouve" et "Lis et trouve")

## 🎯 Prochaine étape

**Attendre validation de ce plan avant de commencer le développement.**

---

*Plan créé le 05/01/2025*
