# 📊 Architecture des Données - Projet ACLEF Pédagogie

## 🎯 Vue d'ensemble

L'application ACLEF Pédagogie suit un parcours pédagogique structuré pour enseigner la lecture aux non-lecteurs francophones :

```
APPRENANT → TEXTES → GROUPES DE SENS → MOTS → SYLLABES → PANIERS
```

---

## 🗄️ Structure de la Base de Données

### **Table `users`**
```sql
- id: INTEGER (PK)
- identifiant: VARCHAR (login unique)
- prenom: VARCHAR
- nom: VARCHAR
- email: VARCHAR
- role: VARCHAR ('apprenant' | 'admin')
- password_hash: VARCHAR
- created_at: TIMESTAMP
```

### **Table `textes_references`**
```sql
- id: INTEGER (PK)
- apprenant_id: INTEGER (FK → users.id)
- titre: VARCHAR
- description: TEXT
- contenu: TEXT (le texte complet oralisé par l'apprenant)
- created_at: TIMESTAMP
```
**Relations :** Un apprenant → plusieurs textes

### **Table `groupes_sens`**
```sql
- id: INTEGER (PK)
- texte_reference_id: INTEGER (FK → textes_references.id)
- contenu: TEXT (le groupe de mots qui font sens ensemble)
- ordre: INTEGER (position dans le texte)
- created_at: TIMESTAMP
```
**Relations :** Un texte → plusieurs groupes de sens

### **Table `mots_classifies`**
```sql
- id: INTEGER (PK)
- texte_reference_id: INTEGER (FK → textes_references.id)
- apprenant_id: INTEGER (FK → users.id)
- mot: VARCHAR (le mot en question)
- mot_normalise: VARCHAR (version normalisée pour recherche)
- classification: VARCHAR ('mono' | 'multi')
- valide_par_admin: BOOLEAN (correction centralisée)
- score_utilisateur: INTEGER (1 si correct, 0 si incorrect)
- created_at: TIMESTAMP
- validated_at: TIMESTAMP
- validated_by: INTEGER (FK → users.id admin)
```
**Relations :** 
- Un texte → plusieurs mots classifiés
- Un apprenant → plusieurs mots classifiés
- **IMPORTANT :** `valide_par_admin = true` → Correction s'applique à TOUS les apprenants

### **Table `signalements_syllabification`**
```sql
- id: INTEGER (PK)
- mot: VARCHAR
- segmentation_utilisateur: JSON (syllabes proposées par l'utilisateur)
- segmentation_systeme: JSON (syllabes proposées par l'algorithme)
- utilisateur: VARCHAR (identifiant de qui signale)
- source: VARCHAR ('reference-texts' | 'import-exercise')
- date_signalement: TIMESTAMP
- traite: BOOLEAN
- statut: VARCHAR ('en_attente' | 'accepte' | 'rejete')
- commentaire_admin: TEXT
```

---

## 🔄 Parcours Pédagogique

### **1. Création de Texte**
```
Apprenant → Oralise son texte → Texte sauvé dans `textes_references`
```

### **2. Découpage en Groupes de Sens**
```
Texte → Découpé en unités de sens → Groupes sauvés dans `groupes_sens`
```

### **3. Classification Mono/Multi**
```
Mots du texte → Classés mono ou multi → Sauvés dans `mots_classifies`
```

### **4. Segmentation Syllabique**
```
Mots multisyllabes → Découpés en syllabes → Vérification via API Coupe-Mots
```

### **5. Organisation en Paniers**
```
Syllabes → Organisées par ressemblance → Paniers personnalisés (en mémoire)
```

---

## 🛠️ APIs Principales

### **Textes**
- `GET /api/textes/list` → Textes de l'apprenant connecté
- `POST /api/textes/creer` → Créer un nouveau texte
- `GET /api/textes/get/[id]` → Détails d'un texte

### **Classification Mono/Multi**
- `GET /api/mots-classifies/monosyllabes?texteId=X` → Monosyllabes d'un texte
- `GET /api/mots-classifies/multisyllabes?texteId=X` → Multisyllabes d'un texte
- `POST /api/mots-classifies/multisyllabes` → Multisyllabes de plusieurs textes
- `POST /api/mots-classifies/sauvegarder` → Sauvegarder classifications

### **Syllabification**
- `POST /api/syllabification/coupe-mots` → Segmentation syllabique
- `POST /api/admin/signalement-syllabification` → Signaler erreur

### **Administration**
- `GET /api/admin/apprenants-list` → Liste des apprenants
- `GET /api/admin/donnees-apprenant/[id]` → Données complètes d'un apprenant
- `GET /api/admin/vue-donnees-apprenant/[id]` → Vue tabulaire d'un apprenant

---

## 🎨 Pages Principales

### **Pages Apprenant**
- `/dashboard` → Tableau de bord principal
- `/lire` → Menu des activités de lecture
- `/lire/mes-textes-references` → Textes de l'apprenant
- `/lire/monosyllabes-multisyllabes` → Classification mono/multi
- `/lire/segmentation-choix` → Choix exercice segmentation
- `/lire/segmentation-syllabes` → Segmentation textes références
- `/lire/segmentation-import` → Segmentation textes importés
- `/lire/mes-syllabes` → Organisation en paniers (INNOVATION)

### **Pages Admin**
- `/admin` → Tableau de bord admin
- `/admin/valider-corrections` → Validation corrections mono/multi
- `/admin/signalements-syllabification` → Validation segmentations
- `/admin/visualiser-donnees-apprenant` → Vue détaillée par apprenant
- `/admin/vue-donnees-apprenant` → Vue tabulaire par apprenant

---

## 🔍 Système de Corrections Centralisées

### **Principe**
Les corrections validées par les admins (`valide_par_admin = true`) s'appliquent à **TOUS** les apprenants automatiquement.

### **Flux**
1. **Apprenant** fait une erreur de classification
2. **Apprenant** ou système signale l'erreur
3. **Admin** valide la correction
4. **Correction** s'applique automatiquement à tous les futurs exercices

### **Priorité des données**
```
1. Corrections centralisées (valide_par_admin = true)
2. Mots de l'apprenant pour ce texte (valide_par_admin = false)
3. AUCUN FALLBACK (plus de syllabes_mots obsolète)
```

---

## 🚀 Innovation : Organisation en Paniers

### **Concept Pédagogique**
L'apprenant organise ses syllabes dans des "paniers" selon la règle :
> **"On prend les syllabes au début, on entend et on voit pareil"**

### **Interface**
```
Mot: PATATE → [PA] [TA] [TE]

Alphabet: [A] [B] [C]...[P]...[T]...

Paniers P: [PA: papa, papillon, patate] [PI: piste, pire]
Paniers T: [TA: tapis, quota, patate] [TE: tenir, pépite, patate]
```

### **Données**
- **Syllabes** : Obtenues via `/api/syllabification/coupe-mots`
- **Paniers** : Stockés en mémoire (useState)
- **Personnalisation** : Chaque apprenant crée SES paniers

---

## 🐛 Debugging

### **Pages de Debug Créées**
1. **Vue Tabulaire** (`/admin/vue-donnees-apprenant`)
   - Tableau : Texte | Groupes de Sens | Mono | Multi
   - Permet de voir exactement quels mots sont dans quels textes

2. **Vue Détaillée** (`/admin/visualiser-donnees-apprenant`)
   - Vue en blocs avec toutes les informations
   - Corrections centralisées affichées séparément

### **Requêtes SQL de Debug**
```sql
-- Voir tous les mots d'un apprenant
SELECT tr.titre, mc.mot, mc.classification, mc.valide_par_admin
FROM mots_classifies mc
JOIN textes_references tr ON mc.texte_reference_id = tr.id
JOIN users u ON mc.apprenant_id = u.id
WHERE u.identifiant = 'nina'
ORDER BY tr.id, mc.mot;

-- Voir les corrections centralisées
SELECT mot, classification, COUNT(*) as nb_fois
FROM mots_classifies 
WHERE valide_par_admin = true 
GROUP BY mot, classification 
ORDER BY mot;
```

---

## ⚠️ Points d'Attention

### **Corrections Centralisées**
- Les mots `valide_par_admin = true` apparaissent pour TOUS les apprenants
- Vérifier la source des mots via les pages d'admin

### **Pas de Fallbacks Cachés**
- Suppression des fallbacks sur `syllabes_mots` 
- Si pas de données : erreur claire, pas de données fantômes

### **APIs Hybrides**
- `GET /api/mots-classifies/multisyllabes?texteId=X` → Un seul texte
- `POST /api/mots-classifies/multisyllabes` → Plusieurs textes (pour mes-syllabes)

---

## 📝 Notes Techniques

### **Normalisation des Mots**
```javascript
const normalizeText = (text) => {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Supprimer accents
        .replace(/[^\w]/g, '')           // Supprimer ponctuation
}
```

### **Format Syllabification**
```javascript
// Input API
{ mots: ["patate", "cerise"] }

// Output API  
{ syllabifications: { 
    "patate": ["PA", "TA", "TE"],
    "cerise": ["CE", "RI", "SE"] 
}}
```

### **Gestion des Erreurs**
- **Plus de fallbacks silencieux**
- **Alertes explicites** en cas de problème
- **Logs détaillés** dans la console

---

*Documentation mise à jour le 13/01/2025*