# HANDOFF VERS CLAUDE DESKTOP - Configuration MCP

**Date :** 19 octobre 2025
**Contexte :** Configuration serveurs MCP (Supabase + GitHub) qui tourne en boucle avec Claude Code
**Objectif :** Claude Desktop doit prendre en charge la configuration MCP car il garde la mémoire entre les étapes

---

## 🚨 PROBLÈME ACTUEL

**Boucle infinie avec Claude Code :**
1. Claude Code modifie la config MCP
2. Demande de redémarrer l'application
3. Au redémarrage, Claude Code a **tout oublié** (nouvelle session)
4. Les serveurs MCP ne démarrent toujours pas
5. On recommence → ♻️ BOUCLE

**Pourquoi Claude Desktop est mieux pour cette tâche :**
- ✅ Mémoire continue (pas de perte de contexte)
- ✅ Support MCP mature et stable
- ✅ Peut itérer sans redémarrage
- ✅ Interface graphique pour gérer OAuth

---

## 📂 ÉTAT ACTUEL DE LA CONFIGURATION

### Fichier `mcp.json` (racine du projet)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json`

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

**Note :**
- ✅ GitHub MCP a été RETIRÉ (causait des erreurs OAuth dans WSL)
- ✅ Supabase utilise un TOKEN d'accès (pas OAuth)
- ⚠️ Le token a été exposé dans le chat et devra être révoqué/régénéré après test

### Fichier `.claude/settings.local.json` (projet Claude Code)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/.claude/settings.local.json`

**Ligne 92 :** `"enableAllProjectMcpServers": true` ✅

**Lignes 96-107 :** `enabledMcpjsonServers` contient :
```json
"enabledMcpjsonServers": [
  "typescript-sdk",
  "github",        // ⚠️ PROBLÈME : Présent ici mais PAS dans mcp.json
  "puppeteer",
  "slack",
  "filesystem",
  "memory-bank",
  "sequential-thinking",
  "brave-search",
  "google-maps",
  "deep-graph",
  "supabase"
]
```

**Lignes 39-50 :** Permissions MCP configurées (allow) :
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
"mcp__supabase:select_*",
```

**Lignes 76-89 :** Permissions modification (ask) :
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

### Fichier `.env` (racine du projet)
**Emplacement :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/.env`

Contient les tokens (fichier ignoré par Git) :
```
SUPABASE_ACCESS_TOKEN=sbp_XXXXXXXXXX
GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_XXXXXXXXXX
```

---

## 🐛 SYMPTÔMES DU PROBLÈME

### Logs Claude Code (`~/.claude/debug/latest`)
```
[ERROR] Error streaming, falling back to non-streaming mode: 401
{"type":"error","error":{"type":"authentication_error","message":"OAuth authentication is currently not supported."}}
```

**Diagnostic :**
- L'erreur OAuth vient probablement de **"github"** dans `enabledMcpjsonServers` alors qu'il n'y a PAS de serveur GitHub dans `mcp.json`
- Les serveurs MCP ne démarrent pas (vérification : `ps aux | grep mcp` → aucun processus)
- Test d'outil MCP : `mcp__supabase:list_tables` → `No such tool available`

### Ce qui fonctionne ✅
- Le serveur Supabase MCP démarre **manuellement** :
  ```bash
  export SUPABASE_ACCESS_TOKEN="sbp_XXXXXXXXXX"
  npx -y @supabase/mcp-server-supabase@latest --project-ref=mkbchdhbgdynxwfhpxbw
  # → Fonctionne, attend des commandes
  ```
- Le fichier `mcp.json` est valide (JSON bien formé)
- Les permissions sont configurées

### Ce qui ne fonctionne PAS ❌
- Les serveurs MCP ne démarrent pas au lancement de Claude Code
- Les outils MCP ne sont pas disponibles
- Erreur OAuth mystérieuse (probablement GitHub fantôme)

---

## 🎯 MISSION POUR CLAUDE DESKTOP

### Objectif principal
Configurer les serveurs MCP pour :
1. **Supabase** (projet `mkbchdhbgdynxwfhpxbw`) - Accès à la base de données pédagogique
2. **GitHub** (repo `Allakabeth/Sauvegarde-BDD`) - Diagnostiquer pourquoi les backups échouent

### Contraintes techniques
- **Environnement :** Windows 11 avec WSL2 Ubuntu 24.04
- **Problème WSL :** OAuth GitHub ne fonctionne pas dans WSL (pas de navigateur natif)
- **Solution adoptée :** Utiliser des tokens d'accès directs (pas OAuth)

### Informations Supabase
- **Project Ref :** `mkbchdhbgdynxwfhpxbw`
- **Token actuel :** `sbp_XXXXXXXXXX`
- **Organisation :** (à confirmer lors de la config)
- **URL Dashboard :** https://supabase.com/dashboard/account/tokens

### Informations GitHub
- **Repository cible :** `Allakabeth/Sauvegarde-BDD`
- **Token actuel :** `github_pat_XXXXXXXXXX`
- **Permissions requises :**
  - `repo` (accès complet aux repos privés)
  - `workflow` (gérer les GitHub Actions)
  - `read:org` (lire les infos d'organisation)

---

## 📝 INSTRUCTIONS POUR CLAUDE DESKTOP

### Étape 1 : Localiser le fichier de config MCP de Desktop

**Sur Windows :**
```
C:\Users\[USERNAME]\AppData\Roaming\Claude\claude_desktop_config.json
```

**Ou utiliser :** `%APPDATA%\Claude\claude_desktop_config.json`

Si le fichier n'existe pas, le créer.

### Étape 2 : Configuration Supabase MCP

**Option A - Avec token (RECOMMANDÉ pour WSL) :**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=mkbchdhbgdynxwfhpxbw"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_XXXXXXXXXX"
      }
    }
  }
}
```

**Option B - Avec OAuth (si Desktop supporte) :**
Tenter la config OAuth et voir si Desktop gère mieux l'authentification.

### Étape 3 : Configuration GitHub MCP

**À déterminer avec Claude Desktop :**
- Quel package MCP GitHub utiliser ? (`@modelcontextprotocol/server-github` ?)
- OAuth ou token ?
- Desktop peut-il gérer OAuth GitHub mieux que Code ?

### Étape 4 : Tester la configuration

Demander à Claude Desktop :
```
"Liste toutes les tables de ma base Supabase"
```

Résultat attendu : Liste des tables sans demander permission.

Puis :
```
"Affiche les workflows du repo Allakabeth/Sauvegarde-BDD"
```

Résultat attendu : Liste des workflows GitHub.

### Étape 5 : Diagnostiquer les backups

Une fois MCP fonctionnel, demander :
```
"Analyse pourquoi mes backups Supabase échouent.
Regarde les logs du workflow 'Supabase Database Backup'
dans le repo Allakabeth/Sauvegarde-BDD"
```

---

## 🔄 RETOUR VERS CLAUDE CODE

Une fois que Claude Desktop a :
- ✅ Configuré MCP avec succès
- ✅ Testé Supabase + GitHub
- ✅ Identifié pourquoi les backups échouent

**Transférer la config qui fonctionne :**

1. Copier le contenu de `claude_desktop_config.json` (Desktop)
2. Adapter pour `mcp.json` (Claude Code)
3. Claude Code pourra alors utiliser MCP sans redémarrage de session

---

## ⚠️ SÉCURITÉ - TOKENS EXPOSÉS

**IMPORTANT :** Les tokens ont été partagés dans le chat Claude Code. Une fois que tout fonctionne :

1. **Révoquer le token Supabase actuel**
   - https://supabase.com/dashboard/account/tokens
   - Supprimer : `Claude Code MCP WSL`

2. **Révoquer le token GitHub actuel**
   - https://github.com/settings/tokens
   - Supprimer : `Claude Code MCP WSL`

3. **Créer de nouveaux tokens**
   - Mêmes permissions
   - Ne JAMAIS les partager dans un chat

4. **Mettre à jour les fichiers**
   - `mcp.json`
   - `.env`
   - `claude_desktop_config.json`

---

## 📚 DOCUMENTATION DE RÉFÉRENCE

### Fichiers créés pendant le debug
- `/mnt/c/Projet ACLEF/projet aclef pedagogie/tasks/mcp-setup-guide.md` - Guide initial
- `/mnt/c/Projet ACLEF/projet aclef pedagogie/tasks/mcp-wsl-setup-final.md` - Guide WSL
- `/mnt/c/Projet ACLEF/projet aclef pedagogie/tasks/mcp-diagnostic.md` - Diagnostic
- `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json.template` - Template sans token

### Ressources MCP
- Spécification MCP : https://modelcontextprotocol.io/
- Supabase MCP : https://github.com/supabase/mcp-server-supabase
- GitHub MCP : https://github.com/modelcontextprotocol/servers/tree/main/src/github

---

## 🎯 CHECKLIST POUR CLAUDE DESKTOP

- [ ] Localiser/créer `claude_desktop_config.json`
- [ ] Configurer serveur Supabase MCP
- [ ] Tester : "Liste les tables Supabase"
- [ ] Configurer serveur GitHub MCP (si possible dans Windows)
- [ ] Tester : "Liste les workflows GitHub"
- [ ] Diagnostiquer les échecs de backup
- [ ] Documenter la config qui fonctionne
- [ ] Préparer la migration vers Claude Code
- [ ] Révoquer et régénérer les tokens exposés

---

**Bonne chance Claude Desktop ! 🚀**

Une fois que tu as résolu le problème MCP et diagnostiqué les backups, documente tout dans un fichier de résolution que l'utilisateur pourra donner à Claude Code.
