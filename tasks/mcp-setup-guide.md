# Configuration MCP GitHub + Supabase - Guide Complet

**Date :** 19 octobre 2025
**Projet :** ACLEF Pédagogie
**Statut :** ✅ Configuration terminée - En attente de redémarrage

---

## 🎯 OBJECTIFS ATTEINTS

### 1. Mode Consultation (Lecture automatique) ✅
Claude Code peut **consulter sans demander permission** :
- **GitHub :** Repos, workflows, logs, issues, PRs, secrets (liste)
- **Supabase :** Structure BDD, tables, colonnes, données (SELECT)

### 2. Mode Création/Modification (Avec autorisation) ✅
Claude Code peut **modifier AVEC autorisation** :
- **GitHub :** Créer/modifier workflows, issues, PRs, re-run jobs
- **Supabase :** Créer/modifier tables, colonnes, insérer/modifier données

---

## 📦 FICHIERS CRÉÉS/MODIFIÉS

### ✅ `mcp.json` (nouveau fichier)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json`

**Contenu :**
```json
{
  "$schema": "https://github.com/modelcontextprotocol/specification/raw/main/schema/mcp.schema.json",
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=mkbchdhbgdynxwfhpxbw"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Fonctionnalités activées :**
- **GitHub Remote MCP** - Authentification OAuth (pas de token manuel)
- **Supabase MCP** - Accès projet mkbchdhbgdynxwfhpxbw

---

### ✅ `.claude/settings.local.json` (modifié)

**Permissions ajoutées :**

#### Section `"allow"` (consultation libre)
```json
"mcp__github:get_*",
"mcp__github:list_*",
"mcp__github:search_*",
"mcp__github:read_*",
"mcp__github:fetch_*",
"mcp__github:view_*",
"mcp__supabase:list_*",
"mcp__supabase:get_*",
"mcp__supabase:describe_*",
"mcp__supabase:show_*",
"mcp__supabase:query_read",
"mcp__supabase:select_*"
```

#### Section `"ask"` (modification avec autorisation)
```json
"mcp__github:create_*",
"mcp__github:update_*",
"mcp__github:delete_*",
"mcp__github:push_*",
"mcp__github:merge_*",
"mcp__github:close_*",
"mcp__github:rerun_*",
"mcp__supabase:create_*",
"mcp__supabase:alter_*",
"mcp__supabase:drop_*",
"mcp__supabase:insert_*",
"mcp__supabase:update_*",
"mcp__supabase:delete_*",
"mcp__supabase:execute_*"
```

#### MCP Server activé
```json
"enabledMcpjsonServers": [
  "typescript-sdk",
  "github",
  "puppeteer",
  "slack",
  "filesystem",
  "memory-bank",
  "sequential-thinking",
  "brave-search",
  "google-maps",
  "deep-graph",
  "supabase"  // ← AJOUTÉ
]
```

---

## 🚀 INSTRUCTIONS DE DÉMARRAGE

### ÉTAPE 1 : Redémarrer Claude Code

**⚠️ OBLIGATOIRE** pour charger les nouveaux MCP servers.

1. **Fermer complètement** Claude Code
2. **Relancer** l'application

### ÉTAPE 2 : Authentification GitHub (OAuth)

Au redémarrage, Claude Code va détecter le serveur GitHub MCP et demander l'authentification.

**Ce qui va se passer :**
1. 🌐 Une fenêtre de navigateur s'ouvre automatiquement
2. 🔐 Connexion à GitHub avec votre compte
3. ✅ Autoriser l'accès à Claude Code
4. 🎉 Retour automatique à Claude Code

**Scopes demandés :**
- `repo` - Accès aux repos privés
- `workflow` - Accès aux GitHub Actions
- `read:org` - Lecture des organisations
- `admin:repo_hook` - Gestion des webhooks (optionnel)

**Si l'authentification échoue :**
- Vérifier que vous êtes connecté à GitHub
- Vérifier que vous avez accès au repo `Allakabeth/Sauvegarde-BDD`

### ÉTAPE 3 : Authentification Supabase

Après GitHub, Supabase demandera également l'authentification.

**Ce qui va se passer :**
1. 🌐 Une fenêtre de navigateur s'ouvre
2. 🔐 Connexion à Supabase
3. 🏢 **IMPORTANT :** Choisir l'organisation contenant le projet `mkbchdhbgdynxwfhpxbw`
4. ✅ Autoriser l'accès
5. 🎉 Retour automatique à Claude Code

**Si vous ne voyez pas le projet :**
- Vérifier que vous êtes connecté au bon compte Supabase
- Vérifier que le projet existe : https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw

---

## 🧪 TESTS À EFFECTUER

### Test 1 : GitHub MCP - Consultation libre ✅
```
Demander à Claude Code :
"Liste-moi tous les workflows GitHub du repo Allakabeth/Sauvegarde-BDD"

Résultat attendu : Claude répond SANS demander permission
```

### Test 2 : GitHub MCP - Logs des workflows ✅
```
Demander à Claude Code :
"Affiche-moi les logs du dernier run du workflow 'Supabase Database Backup'"

Résultat attendu : Claude affiche les logs d'erreur SANS demander permission
```

### Test 3 : GitHub MCP - Modification avec autorisation 🔐
```
Demander à Claude Code :
"Re-run le dernier workflow de backup qui a échoué"

Résultat attendu : Claude DEMANDE permission avant d'exécuter
```

### Test 4 : Supabase MCP - Consultation libre ✅
```
Demander à Claude Code :
"Affiche-moi la liste de toutes les tables de ma base Supabase"

Résultat attendu : Claude répond SANS demander permission
```

### Test 5 : Supabase MCP - Structure table ✅
```
Demander à Claude Code :
"Montre-moi la structure de la table 'users' avec tous les champs et types"

Résultat attendu : Claude répond SANS demander permission
```

### Test 6 : Supabase MCP - Modification avec autorisation 🔐
```
Demander à Claude Code :
"Crée une table 'test_mcp' avec une colonne id de type UUID"

Résultat attendu : Claude DEMANDE permission avant d'exécuter
```

---

## 📊 PERMISSIONS DÉTAILLÉES

### GitHub MCP

| Action | Permission | Exemples d'opérations |
|--------|------------|----------------------|
| **Consultation** | ✅ Automatique | Liste repos, workflows, issues, PRs, logs, secrets (liste seulement) |
| **Modification** | 🔐 Sur demande | Créer issue/PR, modifier workflow, re-run job, fermer issue |

### Supabase MCP

| Action | Permission | Exemples d'opérations |
|--------|------------|----------------------|
| **Consultation** | ✅ Automatique | Liste tables, describe colonnes, SELECT données, show indexes |
| **Modification** | 🔐 Sur demande | CREATE TABLE, ALTER TABLE, INSERT/UPDATE/DELETE, DROP TABLE |

---

## 🎯 CAS D'USAGE : DIAGNOSTIC BACKUP

**Objectif :** Diagnostiquer pourquoi les backups GitHub Actions échouent

**Étapes avec MCP activé :**

1. **Consulter l'état actuel** (automatique)
```
"Montre-moi tous les runs du workflow 'Supabase Database Backup' et leur statut"
```

2. **Analyser les logs d'erreur** (automatique)
```
"Affiche-moi les logs complets du dernier run qui a échoué"
```

3. **Vérifier les secrets** (automatique)
```
"Liste les secrets configurés dans le repo Sauvegarde-BDD"
```

4. **Identifier le problème**
```
"Analyse les logs et identifie pourquoi le backup échoue"
```

5. **Proposer une solution**
```
"Propose-moi une solution pour corriger le workflow de backup"
```

6. **Appliquer la correction** (avec autorisation)
```
"Modifie le workflow .github/workflows/backup.yml selon ta proposition"
→ Claude DEMANDE permission
→ Vous validez
→ Claude applique la modification
```

---

## 🐛 DÉPANNAGE

### Problème : MCP servers ne se lancent pas

**Symptômes :**
- Pas de fenêtre d'authentification au redémarrage
- Messages d'erreur "MCP server not found"

**Solutions :**
1. Vérifier que `mcp.json` est à la racine du projet
2. Vérifier la syntaxe JSON (pas de virgules en trop)
3. Redémarrer Claude Code complètement
4. Vérifier les logs : `~/.claude/debug/`

### Problème : Authentification GitHub échoue

**Solutions :**
1. Vérifier connexion internet
2. Vérifier que vous êtes connecté à GitHub dans le navigateur
3. Essayer en navigation privée (pour éviter conflits de cookies)
4. Révoquer les autorisations précédentes : https://github.com/settings/apps/authorizations

### Problème : Authentification Supabase échoue

**Solutions :**
1. Vérifier que le projet `mkbchdhbgdynxwfhpxbw` existe
2. Vérifier que vous avez accès à ce projet dans votre dashboard Supabase
3. Essayer de vous connecter manuellement : https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw

### Problème : Permissions refusées

**Symptômes :**
- Claude demande permission pour des actions de lecture
- Claude ne demande PAS permission pour des actions de modification

**Solutions :**
1. Vérifier `.claude/settings.local.json`
2. Vérifier que les patterns correspondent : `mcp__github:get_*` vs `mcp__github:create_*`
3. Redémarrer Claude Code après modification des permissions

---

## 📚 RESSOURCES

### Documentation officielle

**GitHub MCP Server :**
- Repository : https://github.com/github/github-mcp-server
- Guide pratique : https://github.blog/ai-and-ml/generative-ai/a-practical-guide-on-how-to-use-the-github-mcp-server/
- Changelog : https://github.blog/changelog/

**Supabase MCP Server :**
- Repository : https://github.com/supabase-community/supabase-mcp
- Documentation : https://supabase.com/docs/guides/getting-started/mcp
- Security best practices : https://supabase.com/docs/guides/platform/mcp#security

**MCP Protocol :**
- Spécification : https://github.com/modelcontextprotocol/specification
- Schema : https://github.com/modelcontextprotocol/specification/raw/main/schema/mcp.schema.json

---

## ✅ CHECKLIST POST-INSTALLATION

- [ ] Claude Code redémarré
- [ ] Authentification GitHub OAuth réussie
- [ ] Authentification Supabase réussie
- [ ] Test consultation GitHub (liste workflows) réussi
- [ ] Test consultation Supabase (liste tables) réussi
- [ ] Test modification GitHub avec autorisation réussi
- [ ] Test modification Supabase avec autorisation réussi
- [ ] Logs du dernier backup consultés
- [ ] Problème de backup identifié
- [ ] Solution de correction appliquée

---

## 🎉 PRÊT À DIAGNOSTIQUER LE BACKUP !

Une fois Claude Code redémarré et authentifié, vous pourrez dire :

**"Analyse le repo Allakabeth/Sauvegarde-BDD et identifie pourquoi les backups échouent"**

Claude pourra alors :
1. ✅ Consulter les workflows sans permission
2. ✅ Lire les logs d'erreur sans permission
3. ✅ Analyser la configuration sans permission
4. 🔐 Proposer des modifications (avec votre autorisation)
5. 🔐 Appliquer les corrections (avec votre autorisation)

---

**Configuration terminée le 19 octobre 2025**
**Prochaine étape : Redémarrer Claude Code**
