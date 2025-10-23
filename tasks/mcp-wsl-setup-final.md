# Configuration MCP pour WSL - Solution Finale

**Date :** 19 octobre 2025
**Projet :** ACLEF Pédagogie
**Environnement :** WSL2 Ubuntu 24.04
**Statut :** ✅ Supabase MCP configuré | ❌ GitHub MCP non disponible en WSL

---

## 🎯 RÉSUMÉ DE LA SOLUTION

### ✅ Ce qui fonctionne
- **Supabase MCP** : Accès complet à la base de données via MCP
  - Consultation : tables, colonnes, données (SELECT)
  - Modification : CREATE, ALTER, INSERT, UPDATE, DELETE (avec autorisation)

### ❌ Ce qui ne fonctionne PAS dans WSL
- **GitHub MCP** : Nécessite OAuth qui ne fonctionne pas dans WSL
  - Raison : Pas de navigateur natif pour l'authentification OAuth
  - Alternative : Utiliser WebFetch, gh CLI, ou interface web GitHub

---

## 📦 FICHIERS CRÉÉS/MODIFIÉS

### ✅ `mcp.json` (avec token Supabase)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json`

**⚠️ IMPORTANT :** Ce fichier contient votre token Supabase et est maintenant dans `.gitignore`

**Contenu :**
```json
{
  "$schema": "https://github.com/modelcontextprotocol/specification/raw/main/schema/mcp.schema.json",
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=mkbchdhbgdynxwfhpxbw"
      ],
      "env": {
        "NODE_ENV": "production",
        "SUPABASE_ACCESS_TOKEN": "sbp_XXXXXXXXXX"
      }
    }
  }
}
```

### ✅ `mcp.json.template` (versionnable)
Template sans token pour le contrôle de version Git.

### ✅ `.env` (tokens stockés)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/.env`
**⚠️ IMPORTANT :** Dans .gitignore, ne jamais commiter

Contient :
- `GITHUB_TOKEN` (pour futur usage si GitHub MCP fonctionne un jour)
- `SUPABASE_ACCESS_TOKEN`

### ✅ `.gitignore` (mis à jour)
Ajouté :
- `mcp.json` (contient le token)
- `.env` (déjà présent)

---

## 🚀 PROCHAINES ÉTAPES

### ÉTAPE 1 : Redémarrer Claude Code

**⚠️ OBLIGATOIRE pour que mcp.json soit chargé**

1. Fermez complètement Claude Code
2. Relancez l'application
3. Ouvrez le projet `/mnt/c/Projet ACLEF/projet aclef pedagogie`

### ÉTAPE 2 : Vérifier que Supabase MCP est chargé

Au redémarrage, Claude Code devrait :
1. Détecter `mcp.json`
2. Lancer le serveur Supabase MCP avec le token
3. Rendre disponibles les outils `mcp__supabase:*`

**Test :** Demandez à Claude Code :
```
"Liste-moi toutes les tables de ma base Supabase"
```

**Résultat attendu :** Claude répond SANS demander permission et affiche les tables.

### ÉTAPE 3 : Tester les capacités Supabase MCP

#### Consultation (automatique) ✅
```
"Affiche la structure de la table 'users'"
"Combien d'apprenants sont dans la base ?"
"Montre-moi les 5 derniers quiz créés"
```

#### Modification (avec autorisation) 🔐
```
"Crée une table de test 'test_mcp'"
"Insère un enregistrement de test"
"Supprime la table de test"
```

---

## 🔐 SÉCURITÉ : TOKENS EXPOSÉS

### ⚠️ PROBLÈME
Vous avez partagé vos tokens dans le chat Claude. Même s'ils sont maintenant protégés dans des fichiers ignorés par Git, **ils ont été exposés**.

### ✅ SOLUTION : Révoquer et régénérer

**Après avoir testé que MCP fonctionne**, vous DEVEZ :

#### 1. Révoquer le token GitHub actuel
1. Allez sur : https://github.com/settings/tokens
2. Trouvez le token : `Claude Code MCP WSL`
3. Cliquez sur "Delete" ou "Revoke"

#### 2. Révoquer le token Supabase actuel
1. Allez sur : https://supabase.com/dashboard/account/tokens
2. Trouvez le token : `Claude Code MCP WSL`
3. Cliquez sur "Revoke"

#### 3. Créer de nouveaux tokens
Refaites la procédure de création (mêmes permissions) mais :
- **NE LES PARTAGEZ JAMAIS dans un chat/email**
- Copiez-les directement dans `mcp.json` et `.env`
- Ne les montrez à personne

#### 4. Mettre à jour les fichiers
```bash
# Éditer mcp.json avec le nouveau token Supabase
nano mcp.json

# Éditer .env avec les nouveaux tokens
nano .env
```

#### 5. Redémarrer Claude Code
Pour charger les nouveaux tokens.

---

## 🛠️ DIAGNOSTIC DES PROBLÈMES

### Problème : Les outils mcp__supabase ne sont pas disponibles

**Solutions :**
1. Vérifier que `mcp.json` existe à la racine du projet
2. Vérifier que `.claude/settings.local.json` contient :
   ```json
   "enableAllProjectMcpServers": true
   ```
3. Vérifier les logs : `~/.claude/debug/latest`
4. Redémarrer Claude Code complètement

### Problème : Erreur "Authentication failed" pour Supabase

**Solutions :**
1. Vérifier que le token dans `mcp.json` est correct
2. Vérifier que le token n'a pas expiré
3. Vérifier que le token a les permissions nécessaires
4. Régénérer un nouveau token si nécessaire

### Problème : npx télécharge le package à chaque fois

**C'est normal** avec l'option `-y` et `@latest`. Si vous voulez accélérer :
```bash
npm install -g @supabase/mcp-server-supabase
```
Puis modifier `mcp.json` pour utiliser le package global.

---

## 📊 PERMISSIONS CONFIGURÉES

### Supabase MCP

| Action | Permission | Exemples d'opérations |
|--------|------------|----------------------|
| **Consultation** | ✅ Automatique | `list_*`, `get_*`, `describe_*`, `show_*`, `select_*` |
| **Modification** | 🔐 Sur demande | `create_*`, `alter_*`, `drop_*`, `insert_*`, `update_*`, `delete_*` |

---

## 🎯 ALTERNATIVE POUR GITHUB (Sans MCP)

Puisque GitHub MCP ne fonctionne pas dans WSL, utilisez :

### Option 1 : GitHub CLI (RECOMMANDÉ)
```bash
# Installer gh CLI dans WSL
sudo apt install gh

# Authentifier avec votre token
gh auth login

# Utiliser gh pour interagir avec GitHub
gh workflow list --repo Allakabeth/Sauvegarde-BDD
gh run view <run-id> --log
gh workflow run backup.yml
```

### Option 2 : WebFetch
Claude Code peut utiliser WebFetch pour consulter GitHub (limité).

### Option 3 : Interface web
Accéder directement à GitHub dans le navigateur.

---

## 📝 CHECKLIST POST-INSTALLATION

- [ ] mcp.json créé avec token Supabase
- [ ] mcp.json ajouté à .gitignore
- [ ] .env créé avec les tokens
- [ ] .env déjà dans .gitignore (vérifier)
- [ ] mcp.json.template créé (versionnable)
- [ ] Claude Code redémarré
- [ ] Test : "Liste les tables Supabase" fonctionne
- [ ] Tokens révoqués et régénérés (IMPORTANT !)
- [ ] Nouveaux tokens mis à jour dans les fichiers
- [ ] Claude Code redémarré avec nouveaux tokens

---

## 🎉 VOUS ÊTES PRÊT !

Une fois Claude Code redémarré, vous pouvez demander :

**"Montre-moi toutes les tables de ma base de données Supabase"**

Claude pourra alors :
- ✅ Consulter la structure de votre base
- ✅ Lire les données
- ✅ Analyser votre schéma
- 🔐 Créer/modifier des tables (avec votre autorisation)
- 🔐 Insérer/modifier des données (avec votre autorisation)

Pour GitHub (diagnostiquer les backups), utilisez :
- WebFetch pour consulter les workflows
- Vous copiez/collez les logs
- Claude analyse et propose des solutions

---

**Configuration finalisée le 19 octobre 2025**
**Prochaine étape : Redémarrer Claude Code et RÉVOQUER les tokens exposés** ⚠️
