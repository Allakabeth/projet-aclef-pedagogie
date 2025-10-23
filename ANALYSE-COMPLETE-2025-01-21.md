# ✅ ANALYSE COMPLÈTE - Projet ACLEF Pédagogie

**Date :** 21 janvier 2025
**Projet :** ACLEF Pédagogie - Application pour public en situation d'illettrisme et alphabétisation

---

## 1. 🔒 Sécurité (FAIT)

Le fichier `.mcp.json` est maintenant protégé dans `.gitignore`.

**⚠️ ACTION REQUISE URGENTE :**
- [ ] Révoquer le token Supabase `sbp_XXXXXXXXXX` (exposé dans les logs)
- [ ] Révoquer le token GitHub `ghp_XXXXXXXXXX` (exposé dans les logs)
- [ ] Générer de nouveaux tokens
- [ ] Les stocker dans des variables d'environnement

---

## 2. 📂 Analyse `/lire/voir-mes-textes.js`

### **Rôle de la page**
Page d'affichage de la liste des **textes de référence** créés par l'apprenant. C'est le point d'entrée principal pour gérer les textes oralisés.

### **Flux de données**

```
┌────────────────────────────────────────────────────┐
│  AUTHENTIFICATION (JWT)                            │
│  localStorage: token, user                         │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  API: /api/textes/list                             │
│  → Récupère tous les textes de l'apprenant         │
│  → Table: textes_references                        │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  API: /api/textes/stats                            │
│  → Calcule: nombre_textes, nombre_mots_différents │
│  → Tables: textes_references + mots_extraits       │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  AFFICHAGE (UI)                                    │
│  - Cartes colorées avec dégradés                   │
│  - Statistiques (groupes, mots)                    │
│  - Boutons d'action (Voir/Modifier/Supprimer)      │
│  - Synthèse vocale (Web Speech API)                │
└────────────────────────────────────────────────────┘
```

### **Fonctionnalités clés**

#### **1. Lecture vocale** (lines 14-57)
- Utilise `window.speechSynthesis` (Web Speech API)
- Recherche automatique d'une voix masculine française
- Pitch réglé à 0.6 (plus grave)
- Rate à 0.8 (vitesse modérée)

#### **2. Statistiques** (API `/api/textes/stats`)
```javascript
{
  nombre_textes: 5,
  nombre_mots_differents: 142,  // Mots UNIQUES normalisés
  derniere_mise_a_jour: "2025-01-21T10:30:00Z"
}
```

**Calcul des mots différents :**
- Récupère tous les `mots_extraits` de TOUS les textes de l'apprenant
- Utilise un `Set` JavaScript pour compter les `mot_normalise` uniques
- Évite les doublons inter-textes

#### **3. Suppression sécurisée** (lines 125-173)
- **Double confirmation** : clic → demande confirmation → confirmation finale
- Auto-annulation après 10 secondes
- API : `/api/textes/supprimer-simple/[id]`

#### **4. Navigation**
```javascript
/lire/texte/[id]           // Voir le texte
/lire/modifier-texte/[id]  // Modifier le texte
/lire/mes-textes-references // Retour menu principal
```

### **Design UX/UI**

#### **Accessibilité pédagogique**
- **Cartes colorées** : 8 dégradés rotatifs pour différenciation visuelle
- **Gros boutons** : Texte + Icône + Flèche de navigation
- **Lecture audio** : Tous les labels sont oralisables (aide à la lecture)
- **Confirmation visuelle** : Changement de couleur des boutons (rouge pour supprimer)

#### **Pattern d'interaction**
```
[🔊 Écouter le titre]  ← Bouton rond en haut à droite

[👁️ Voir →]           ← Clic gauche : écoute "Voir"
                         Clic droit (→) : navigation

[✏️ Modifier →]       ← Même pattern

[🗑️ Supprimer →]     ← Double confirmation requise
```

---

## 3. 🗄️ Analyse de la Base de Données

### **Vue d'ensemble (50 tables)**

#### **📚 MODULE LECTURE (Cœur pédagogique)**

```
┌─────────────────┐
│     USERS       │ (88 apprenants + admins)
│  - identifiant  │
│  - role         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  TEXTES_REFERENCES (27) │ ← POINT D'ENTRÉE
│  - titre                │
│  - apprenant_id         │
│  - nombre_groupes       │
│  - nombre_mots_total    │
└────────┬────────────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│ GROUPES_SENS (312)│        │ MOTS_EXTRAITS (629)│
│ - contenu         │        │ - mot              │
│ - ordre_groupe    │        │ - mot_normalise    │
│ - type_groupe     │        │ - nombre_syllabes  │
└──────────┬────────┘        └──────────┬─────────┘
           │                            │
           ▼                            ▼
    ┌──────────────┐          ┌──────────────┐
    │ Découpage en │          │ SYLLABES (2053)│
    │ unités de    │          │ - syllabe      │
    │ sens         │          │ - position     │
    └──────────────┘          └────────────────┘
```

#### **🎯 Système de Classification Mono/Multi**

```
┌─────────────────────────────────┐
│  MOTS_CLASSIFIES (299)          │
│  - mot                          │
│  - classification (mono|multi)  │
│  - valide_par_admin (BOOLEAN)   │ ← ⭐ CORRECTION CENTRALISÉE
│  - score_utilisateur            │
│  - texte_reference_id           │
│  - apprenant_id                 │
└─────────────────────────────────┘
         │
         ├─── valide_par_admin = TRUE  → Appliqué à TOUS
         └─── valide_par_admin = FALSE → Apprenant uniquement
```

**Tables de corrections centralisées :**
- `corrections_syllabification` (53) - Segmentation corrigée
- `corrections_mono_multi` (2) - Classification corrigée
- `signalements_syllabification` (62) - Erreurs signalées

#### **📊 MODULE QUIZ (Évaluation)**

```
QUIZ_CATEGORIES (9)
   │
   ├─── QUIZ (3)
   │      └─── quiz_data (JSONB)
   │
   ├─── QUIZ_ASSIGNMENTS (8)  ← Attribution admin→apprenant
   │
   └─── QUIZ_SESSIONS (33)    ← Résultats des tentatives
```

#### **🚗 MODULE CODE DE LA ROUTE**

```
VOCABULAIRE_CODE_ROUTE (111)
   ├─── categorie
   ├─── mot
   ├─── definition_simple
   ├─── emoji
   │
   ├─── PROGRESSION_VOCABULAIRE_CODE_ROUTE (0)
   │      └─── statut (nouveau, en_cours, acquis)
   │
   └─── DEFINITIONS_PERSONNALISEES_CODE_ROUTE (0)
          └─── ma_definition, mon_exemple, audio_url
```

#### **🎓 MODULE FORMATION (Nouveau système)**

**Hiérarchie des compétences :**
```
FORMATION_DOMAINES (3)
  ├── Lecture 📖
  ├── Écriture ✍️
  └── Mathématiques 🔢
       │
       ▼
FORMATION_CATEGORIES_COMPETENCES (12)
  ├── Acquisition
  ├── Textes références
  └── ...
       │
       ▼
FORMATION_COMPETENCES (79)
  └── Compétences granulaires (basées sur référentiel ACLEF)
```

**Parcours pédagogique :**
```
┌──────────────────────────┐
│ FORMATION_POSITIONNEMENTS│ (1)
│ - Évaluation initiale    │
│ - Statut: en_cours       │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ FORMATION_PLANS          │ (1)
│ - Objectif principal     │
│ - Date début/fin         │
└─────────┬────────────────┘
          │
          ├─── FORMATION_PLAN_COMPETENCES (18)
          │      └─── Compétences à travailler
          │
          ├─── FORMATION_ATTRIBUTIONS_EXERCICES (0)
          │      └─── Quiz/Textes/Vocabulaire attribués
          │
          ├─── FORMATION_SUIVIS_PEDAGOGIQUES (0)
          │      └─── Observations formateurs
          │
          └─── FORMATION_BILANS (0)
                 └─── Bilans intermédiaires/finaux
```

#### **📅 MODULE PLANNING (Autre projet)**

Tables liées au planning des formateurs et apprenants :
- `planning_hebdomadaire` (203)
- `planning_type_formateurs` (270)
- `planning_apprenants` (101)
- `absences_formateurs` (125)
- `absences_apprenants` (12)
- `presence_formateurs` (35)

#### **🖼️ MODULE IMAGIERS**

```
IMAGIERS (7)
   └─── IMAGIER_ELEMENTS (140)
          ├─── mot
          ├─── image_url
          ├─── question
          └─── reponse
```

---

## 4. 🔑 Points Clés de l'Architecture

### **Système de Corrections Centralisées** ⭐

**Principe :**
Les corrections validées par admin (`valide_par_admin = true`) s'appliquent à **TOUS** les apprenants automatiquement.

**Priorité des données :**
```
1. Corrections centralisées (valide_par_admin = true)
2. Mots de l'apprenant pour ce texte (valide_par_admin = false)
3. AUCUN FALLBACK (plus de données cachées)
```

### **Parcours Pédagogique Standard**

```
1. CRÉATION TEXTE
   └─ Apprenant oralise son texte → textes_references

2. DÉCOUPAGE
   └─ Division en groupes de sens → groupes_sens

3. CLASSIFICATION
   └─ Mono/Multisyllabes → mots_classifies

4. SEGMENTATION
   └─ API syllabification → syllabes

5. ORGANISATION
   └─ Paniers (en mémoire) → Innovation pédagogique
```

### **Innovation : Paniers de Syllabes** ⭐

**Concept :**
> "On prend les syllabes au début, on entend et on voit pareil"

**Exemple :**
```
Mot: PATATE → [PA] [TA] [TE]

Alphabet: [A] [B] [C]...[P]...[T]...

Paniers P: [PA: papa, papillon, patate] [PI: piste, pire]
Paniers T: [TA: tapis, quota, patate] [TE: tenir, pépite, patate]
```

**Table :** `paniers_syllabes` (48 enregistrements)
```sql
- apprenant_id
- texte_id
- lettre_panier (P, T, etc.)
- nom_panier (PA, TA, TE, etc.)
- syllabes (JSONB array)
```

---

## 5. 📊 Statistiques de la Base

| Module | Tables | Enregistrements Totaux |
|--------|--------|------------------------|
| **Lecture** | 10 | ~4,200 |
| **Formation** | 14 | ~118 |
| **Quiz** | 4 | ~44 |
| **Code Route** | 3 | ~111 |
| **Planning** | 8 | ~1,094 |
| **Users** | 1 | 88 |
| **Imagiers** | 2 | 147 |
| **Autres** | 8 | ~1,046 |

**Total : 50 tables, ~6,848 enregistrements**

---

## 6. 🎯 Recommandations

### **Sécurité**
- ✅ `.mcp.json` protégé dans `.gitignore`
- ⚠️ **RÉVOQUER immédiatement les tokens exposés**

### **Performance**
- La page `/lire/voir-mes-textes` fait **2 appels API** au chargement :
  - `GET /api/textes/list` → Textes
  - `GET /api/textes/stats` → Statistiques

  **Optimisation possible :** Fusionner en un seul appel retournant `{textes, stats}`

### **Code Quality**
- Code bien structuré et commenté
- Bonne séparation des responsabilités (API / UI)
- Accessibilité pédagogique bien pensée (voix, couleurs, boutons)

---

## 7. 📋 Structure Complète des Tables

### **Tables du Module Lecture**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `textes_references` | 27 | titre, apprenant_id, nombre_groupes, nombre_mots_total |
| `groupes_sens` | 312 | texte_reference_id, contenu, ordre_groupe, type_groupe |
| `mots_extraits` | 629 | texte_reference_id, mot, mot_normalise, nombre_syllabes |
| `syllabes` | 2,053 | mot_extrait_id, syllabe, position_syllabe |
| `mots_classifies` | 299 | mot, classification, valide_par_admin, apprenant_id |
| `syllabes_mots` | 296 | texte_reference_id, mot_complet, mot_normalise |
| `paniers_syllabes` | 48 | apprenant_id, lettre_panier, nom_panier, syllabes (JSONB) |
| `signalements_syllabification` | 62 | mot, segmentation_utilisateur, segmentation_systeme |
| `corrections_syllabification` | 53 | mot, segmentation_correcte, statut |
| `corrections_mono_multi` | 2 | mot, classification_correcte |
| `corrections_demandees` | 26 | mot_classifie_id, correction_proposee, statut |

### **Tables du Module Quiz**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `quiz_categories` | 9 | name, description, icon, color, order_index |
| `quiz` | 3 | title, quiz_data (JSONB), category_id, created_by |
| `quiz_assignments` | 8 | quiz_id, user_id, assigned_by, due_date, is_completed |
| `quiz_sessions` | 33 | quiz_id, user_id, score, total_questions, session_data (JSONB) |

### **Tables du Module Formation**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `formation_domaines` | 3 | nom, emoji, description, ordre |
| `formation_categories_competences` | 12 | domaine_id, nom, description, ordre |
| `formation_competences` | 79 | categorie_id, code, intitule, contexte, ordre |
| `formation_positionnements` | 1 | apprenant_id, formateur_id, statut, commentaires_generaux |
| `formation_evaluations_positionnement` | 0 | positionnement_id, competence_id, evaluation |
| `formation_plans` | 1 | apprenant_id, objectif_principal, statut |
| `formation_plan_competences` | 18 | plan_id, competence_id, priorite, statut |
| `formation_attributions_exercices` | 0 | plan_id, type_exercice, quiz_id, texte_id, vocabulaire_id |
| `formation_resultats_exercices` | 0 | attribution_id, score, reussi, details (JSONB) |
| `formation_suivis_pedagogiques` | 0 | apprenant_id, observations, points_forts |
| `formation_bilans` | 0 | apprenant_id, type, synthese, fichier_pdf |
| `formation_exercices` | 0 | competence_id, type, contenu (JSONB) |
| `formation_exercices_assignations` | 0 | exercice_id, apprenant_id, statut, score |
| `categories_outils_pedagogiques` | 8 | nom, emoji, couleur, ordre |

### **Tables du Module Code de la Route**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `vocabulaire_code_route` | 111 | categorie, mot, definition_simple, emoji |
| `progression_vocabulaire_code_route` | 0 | apprenant_id, vocabulaire_id, statut |
| `definitions_personnalisees_code_route` | 0 | vocabulaire_id, ma_definition, audio_url |

### **Tables du Module Imagiers**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `imagiers` | 7 | titre, theme, description, created_by |
| `imagier_elements` | 140 | imagier_id, mot, image_url, question, reponse |

### **Tables du Module Planning**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `planning_hebdomadaire` | 203 | date, jour, creneau, lieu_id, formateurs_ids, apprenants_ids |
| `planning_type_formateurs` | 270 | formateur_id, jour, creneau, statut, lieu_id |
| `planning_apprenants` | 101 | apprenant_id, jour, creneau, lieu_id |
| `planning_formateurs_hebdo` | 276 | formateur_id, date, creneau, lieu_nom |
| `absences_formateurs` | 125 | formateur_id, date_debut, date_fin, type, motif |
| `absences_apprenants` | 12 | apprenant_id, type, date_debut, date_fin, motif |
| `presence_formateurs` | 35 | formateur_id, date, periode, present |
| `lieux` | 4 | nom, couleur, initiale |

### **Autres Tables**

| Table | Lignes | Colonnes principales |
|-------|--------|---------------------|
| `users` | 88 | identifiant, prenom, nom, role, email, password_hash |
| `admin_sessions` | 510 | admin_user_id, session_token, is_active |
| `messages` | 273 | expediteur_id, destinataire_id, objet, contenu, type |
| `suspensions_parcours` | 3 | apprenant_id, date_suspension, motif_suspension |

---

## 8. 🔍 APIs Principales

### **Module Lecture**

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/textes/list` | GET | Liste des textes de l'apprenant |
| `/api/textes/stats` | GET | Statistiques (nb textes, mots différents) |
| `/api/textes/creer` | POST | Créer un nouveau texte |
| `/api/textes/get/[id]` | GET | Détails d'un texte |
| `/api/textes/supprimer-simple/[id]` | POST | Supprimer un texte |
| `/api/mots-classifies/monosyllabes` | GET | Monosyllabes d'un texte |
| `/api/mots-classifies/multisyllabes` | GET/POST | Multisyllabes d'un/plusieurs textes |
| `/api/syllabification/coupe-mots` | POST | Segmentation syllabique |
| `/api/admin/signalement-syllabification` | POST | Signaler erreur |

### **Module Admin**

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/admin/apprenants-list` | GET | Liste des apprenants |
| `/api/admin/donnees-apprenant/[id]` | GET | Données complètes d'un apprenant |
| `/api/admin/vue-donnees-apprenant/[id]` | GET | Vue tabulaire d'un apprenant |
| `/api/admin/appliquer-correction` | POST | Appliquer correction centralisée |

---

## 9. 📱 Pages Principales

### **Pages Apprenant**

| Route | Rôle |
|-------|------|
| `/dashboard` | Tableau de bord principal |
| `/lire` | Menu des activités de lecture |
| `/lire/voir-mes-textes` | Liste des textes de référence |
| `/lire/mes-textes-references` | Menu textes références |
| `/lire/monosyllabes-multisyllabes` | Classification mono/multi |
| `/lire/segmentation-choix` | Choix exercice segmentation |
| `/lire/segmentation-syllabes` | Segmentation textes références |
| `/lire/segmentation-import` | Segmentation textes importés |
| `/lire/mes-syllabes` | Organisation en paniers ⭐ |

### **Pages Admin**

| Route | Rôle |
|-------|------|
| `/admin` | Tableau de bord admin |
| `/admin/lire/valider-corrections` | Validation corrections mono/multi |
| `/admin/lire/signalements-syllabification` | Validation segmentations |
| `/admin/lire/visualiser-donnees-apprenant` | Vue détaillée par apprenant |
| `/admin/lire/vue-donnees-apprenant` | Vue tabulaire par apprenant |
| `/admin/lire/regenerer-syllabes` | Régénération des syllabes |

---

**Analyse complète générée le 21 janvier 2025**
**Auteur :** Claude Code (Anthropic)
**Projet :** ACLEF Pédagogie
