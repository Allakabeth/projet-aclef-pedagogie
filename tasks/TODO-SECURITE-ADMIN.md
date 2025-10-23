# TODO - SÉCURITÉ : Réactiver les vérifications admin

**Date de création :** 2025-01-22
**Priorité :** 🔴 URGENT - Faille de sécurité

---

## 🔴 PROBLÈME

Plusieurs routes API admin ont leurs vérifications de sécurité **DÉSACTIVÉES** avec des commentaires "TEMPORAIRE".
→ **Risque :** N'importe quel utilisateur authentifié peut accéder aux fonctions admin.

---

## 📋 FICHIERS À CORRIGER

### 1. `/pages/api/corrections/traiter.js` (lignes 26-29)

**Problème actuel :**
```javascript
// TEMPORAIRE : vérification admin désactivée pour test
// if (decoded.role !== 'admin') {
//     return res.status(403).json({ error: 'Accès refusé - droits admin requis' })
// }
```

**Action requise :**
- Décommenter les lignes 27-29
- Tester que seuls les admins peuvent accepter/rejeter des corrections

**Danger :** N'importe quel utilisateur peut accepter/rejeter des corrections mono/multi

---

### 2. `/pages/api/corrections/lister.js` (lignes 26-29)

**Problème actuel :**
```javascript
// TEMPORAIRE : vérification admin désactivée pour test
// if (decoded.role !== 'admin') {
//     return res.status(403).json({ error: 'Accès refusé - droits admin requis' })
// }
```

**Action requise :**
- Décommenter les lignes 27-29
- Tester que seuls les admins peuvent lister les corrections

**Danger :** N'importe quel utilisateur peut voir toutes les corrections en attente

---

### 3. `/pages/api/admin/vue-donnees-apprenant/[id].js` (ligne 15)

**Problème actuel :**
```javascript
// TEMPORAIRE : Pas de vérification admin pour le moment
```

**Action requise :**
- Ajouter vérification JWT admin :
```javascript
const authHeader = req.headers.authorization
if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
}

const token = authHeader.split(' ')[1]
const decoded = verifyToken(token)
if (!decoded) {
    return res.status(401).json({ error: 'Token invalide' })
}

if (decoded.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - droits admin requis' })
}
```

**Danger :** N'importe qui peut voir les données détaillées de n'importe quel apprenant

---

### 4. `/pages/api/admin/apprenants-list.js` (ligne 15)

**Problème actuel :**
```javascript
// TEMPORAIRE : Pas de vérification admin pour le moment
```

**Action requise :**
- Ajouter vérification JWT admin (même code que #3)

**Danger :** N'importe qui peut lister tous les apprenants

---

### 5. `/pages/api/syllabification/coupe-mots.js` (ligne 52)

**Problème actuel :**
```javascript
// TEMPORAIRE : Pas d'authentification pour le moment
```

**Action requise :**
- ℹ️ **Décision à prendre :** Cette API fait juste de la segmentation syllabique
- **Option 1 :** Laisser publique (pas de données sensibles)
- **Option 2 :** Ajouter authentification JWT basique (pas besoin d'être admin)

**Danger :** Faible - juste de la segmentation de texte

---

## ⚠️ AUTRE POINT À VÉRIFIER

### Secret JWT avec fallback

**Fichier :** `/lib/jwt.js` (ligne 3)

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt-aclef-2024'
```

**Action requise :**
- Vérifier que `.env.local` contient bien une valeur `JWT_SECRET` forte
- Si non, générer un secret sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
- Ajouter dans `.env.local` :
```
JWT_SECRET=<secret-généré>
```

---

## 📝 ORDRE D'EXÉCUTION RECOMMANDÉ

1. ✅ Vérifier/créer `JWT_SECRET` dans `.env.local`
2. ✅ Corriger fichier #1 : `corrections/traiter.js`
3. ✅ Corriger fichier #2 : `corrections/lister.js`
4. ✅ Corriger fichier #3 : `admin/vue-donnees-apprenant/[id].js`
5. ✅ Corriger fichier #4 : `admin/apprenants-list.js`
6. ✅ Décider pour #5 : `syllabification/coupe-mots.js`
7. ✅ Tester toutes les routes admin avec compte non-admin
8. ✅ Tester toutes les routes admin avec compte admin
9. ✅ Push sur GitHub

---

## 🧪 TESTS À FAIRE

### Test 1 : Utilisateur non-admin ne doit PAS accéder
```bash
# Se connecter avec compte apprenant (ex: Boubou Sylla)
# Essayer d'accéder à :
- /api/corrections/lister
- /api/corrections/traiter
- /api/admin/apprenants-list
- /api/admin/vue-donnees-apprenant/[id]

# Résultat attendu : 403 Forbidden
```

### Test 2 : Admin doit accéder
```bash
# Se connecter avec compte admin
# Essayer d'accéder aux mêmes routes

# Résultat attendu : 200 OK avec données
```

---

## 📌 NOTES

- **Date de détection :** 2025-01-22
- **Détecté par :** Recherche systématique du hardcoding et commentaires "TEMPORAIRE"
- **Impact :** 🔴 Critique - Faille de sécurité permettant à n'importe quel utilisateur d'accéder aux fonctions admin
- **Effort estimé :** 30 minutes de code + 15 minutes de tests

---

**Ne pas oublier de supprimer ce fichier une fois les corrections appliquées !**
