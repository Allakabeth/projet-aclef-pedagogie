# 🔌 Guide des Serveurs MCP - ACLEF Pédagogie

**Date :** 2025-10-19
**Configuration :** `.mcp.json`

---

## 📋 Serveurs MCP Configurés

### 1. ✅ Supabase MCP Server

**Package :** `@supabase/mcp-server-supabase@latest`

**Configuration :**
```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=mkbchdhbgdynxwfhpxbw"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_***"
  }
}
```

**Projet :** mkbchdhbgdynxwfhpxbw (PRODUCTION - Planning ACLEF)

**Fonctionnalités :**
- ✅ Lister les tables (`list_tables`)
- ✅ Exécuter du SQL (`execute_sql`)
- ✅ Appliquer des migrations (`apply_migration`)
- ✅ Consulter les logs (`get_logs`)
- ✅ Vérifier les advisors sécurité/performance (`get_advisors`)
- ✅ Générer les types TypeScript (`generate_typescript_types`)
- ✅ Gérer les Edge Functions
- ✅ Gérer les branches de développement

**Documentation :** https://github.com/supabase/mcp-server-supabase

---

### 2. ✅ GitHub MCP Server

**Package :** `@modelcontextprotocol/server-github`

**Configuration :**
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_***"
  }
}
```

**Repo principal :** Allakabeth/Sauvegarde-BDD

**Fonctionnalités :**
- ✅ Lister les fichiers et dossiers (`get_file_contents`)
- ✅ Créer/modifier des fichiers (`create_or_update_file`)
- ✅ Créer des issues (`create_issue`)
- ✅ Créer des Pull Requests (`create_pull_request`)
- ✅ Lister les commits (`list_commits`)
- ✅ Rechercher du code (`search_code`)
- ✅ Forker des repos (`fork_repository`)
- ✅ Créer des branches (`create_branch`)

**Documentation :** https://github.com/modelcontextprotocol/servers/tree/main/src/github

---

### 3. 🆕 DeepWiki MCP Server

**Package :** `mcp-deepwiki@latest`

**Configuration :**
```json
"deepwiki": {
  "command": "npx",
  "args": ["-y", "mcp-deepwiki@latest"]
}
```

**Fonctionnalités :**
- 📖 Rechercher et extraire des connaissances depuis DeepWiki
- 📚 Accéder à la documentation technique
- 🔍 Obtenir les dernières informations sur les technologies
- 📄 Convertir la documentation en Markdown

**⚠️ Note importante :**
Le serveur non-officiel `@regenrek/deepwiki-mcp` ne fonctionne plus (DeepWiki a bloqué le scraping).
Utilisez le serveur officiel : `mcp-deepwiki@latest`

**Variables d'environnement optionnelles :**
```env
DEEPWIKI_MAX_CONCURRENCY=5          # Nombre de requêtes simultanées
DEEPWIKI_REQUEST_TIMEOUT=30000      # Timeout en ms
DEEPWIKI_MAX_RETRIES=3              # Nombre de tentatives
DEEPWIKI_RETRY_DELAY=250            # Délai entre tentatives (ms)
```

**Documentation :**
- https://github.com/regenrek/deepwiki-mcp
- https://www.npmjs.com/package/mcp-deepwiki
- https://cognition.ai/blog/deepwiki-mcp-server

---

### 4. 🆕 Playwright MCP Server (Microsoft)

**Package :** `@playwright/mcp@latest`

**Configuration :**
```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

**Fonctionnalités :**
- 🌐 **Automatisation browser** - Contrôle complet de Chrome, Firefox, WebKit
- 📸 **Capture de page** - Screenshots et snapshots d'accessibilité
- 🖱️ **Actions utilisateur** - Clics, saisie, navigation, formulaires
- 🔍 **Extraction de données** - Scraping web intelligent
- 🧪 **Tests automatisés** - Vérification d'éléments, assertions
- 📋 **Gestion des onglets** - Créer, fermer, sélectionner des onglets
- 📄 **Génération PDF** - Sauvegarder des pages en PDF
- 🎭 **Multi-navigateurs** - Chrome, Firefox, Safari/WebKit, Edge

**Outils disponibles :**

**Core automation :**
- `browser_navigate` - Naviguer vers une URL
- `browser_click` - Cliquer sur un élément
- `browser_type` - Saisir du texte
- `browser_snapshot` - Capturer l'état de la page (sans screenshot)
- `browser_take_screenshot` - Prendre une capture d'écran
- `browser_fill_form` - Remplir un formulaire complet
- `browser_select_option` - Sélectionner dans un dropdown
- `browser_hover` - Survoler un élément
- `browser_press_key` - Appuyer sur une touche
- `browser_drag` - Drag & drop
- `browser_wait_for` - Attendre un élément/texte
- `browser_evaluate` - Exécuter du JavaScript
- `browser_close` - Fermer le navigateur

**Avancé :**
- `browser_tabs` - Gérer les onglets (liste, créer, fermer, sélectionner)
- `browser_console_messages` - Récupérer les messages console
- `browser_network_requests` - Lister les requêtes réseau
- `browser_handle_dialog` - Gérer les alertes/confirmations
- `browser_file_upload` - Upload de fichiers
- `browser_resize` - Redimensionner la fenêtre
- `browser_navigate_back` - Retour arrière

**PDF (opt-in) :**
- `browser_pdf_save` - Sauvegarder en PDF

**Testing (opt-in) :**
- `browser_verify_element_visible` - Vérifier visibilité
- `browser_verify_text_visible` - Vérifier texte
- `browser_verify_value` - Vérifier valeur
- `browser_generate_locator` - Générer localisateur pour tests

**Configuration avancée (exemples) :**

```json
// Mode headless
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless"]
}

// Navigateur spécifique
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--browser", "firefox"]
}

// Avec capacités PDF et Vision
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--caps", "pdf,vision"]
}

// Mode isolé (session temporaire)
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--isolated"]
}
```

**Options disponibles :**
- `--browser` : chrome, firefox, webkit, msedge
- `--headless` : Mode sans interface
- `--device` : Émuler un appareil (ex: "iPhone 15")
- `--caps` : Capacités additionnelles (vision, pdf, testing)
- `--isolated` : Session temporaire (pas de sauvegarde)
- `--user-data-dir` : Dossier de profil persistant
- `--viewport-size` : Taille de la fenêtre (ex: "1920x1080")
- `--save-video` : Enregistrer vidéo de la session
- `--save-trace` : Enregistrer trace Playwright

**Profil utilisateur :**

Par défaut, Playwright MCP utilise un profil persistant :
- **Windows** : `%USERPROFILE%\AppData\Local\ms-playwright\mcp-chrome-profile`
- **macOS** : `~/Library/Caches/ms-playwright/mcp-chrome-profile`
- **Linux** : `~/.cache/ms-playwright/mcp-chrome-profile`

Vos sessions de connexion sont conservées entre les utilisations.

**Documentation :**
- https://github.com/microsoft/playwright-mcp
- https://playwright.dev/docs/intro

---

## 🚀 Utilisation

### Démarrage Automatique

Les serveurs MCP démarrent automatiquement lorsque Claude Code est lancé.

**Vérification :**
1. Ouvrir Claude Code
2. Les serveurs doivent apparaître dans la barre latérale
3. Les outils MCP sont disponibles dans les conversations

### Test des Serveurs

**Supabase :**
```
"Liste les tables de ma base de données Supabase"
```

**GitHub :**
```
"Affiche le contenu du fichier README.md du repo Allakabeth/Sauvegarde-BDD"
```

**DeepWiki :**
```
"Cherche la documentation sur React Hooks sur DeepWiki"
```

**Playwright :**
```
"Ouvre Google et cherche 'Claude Code'"
"Prends un screenshot de la page actuelle"
"Clique sur le bouton 'Connexion'"
"Remplis le formulaire avec mon email"
```

---

## 🔧 Configuration Avancée

### Ajouter des Variables d'Environnement

Pour DeepWiki (optionnel), créer un fichier `.env` :

```env
DEEPWIKI_MAX_CONCURRENCY=10
DEEPWIKI_REQUEST_TIMEOUT=60000
DEEPWIKI_MAX_RETRIES=5
```

### Ajouter un Nouveau Serveur MCP

1. Éditer `.mcp.json`
2. Ajouter une nouvelle entrée dans `mcpServers` :

```json
{
  "mcpServers": {
    "nom-serveur": {
      "command": "npx",
      "args": ["-y", "package-npm@latest"],
      "env": {
        "API_KEY": "votre-clé"
      }
    }
  }
}
```

3. Redémarrer Claude Code

---

## 📚 Serveurs MCP Populaires

### Serveurs Recommandés à Ajouter

| Serveur | Package | Description |
|---------|---------|-------------|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | Accès aux fichiers locaux |
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | Connexion directe PostgreSQL |
| **Puppeteer** | `@modelcontextprotocol/server-puppeteer` | Automatisation browser |
| **Brave Search** | `@modelcontextprotocol/server-brave-search` | Recherche web |
| **Google Drive** | `@modelcontextprotocol/server-gdrive` | Accès Google Drive |
| **Slack** | `@modelcontextprotocol/server-slack` | Intégration Slack |

### Exemple d'Ajout : Filesystem

```json
"filesystem": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/mnt/c/Projet ACLEF"
  ]
}
```

---

## 🐛 Dépannage

### Erreur "Server failed to start"

1. Vérifier que Node.js est installé : `node --version`
2. Vérifier que npm fonctionne : `npm --version`
3. Nettoyer le cache : `npm cache clean --force`
4. Redémarrer Claude Code

### Token API Invalide

**Supabase :**
1. Aller sur https://supabase.com/dashboard
2. Settings → API → Service Role Key
3. Remplacer dans `.mcp.json`

**GitHub :**
1. Aller sur https://github.com/settings/tokens
2. Générer un nouveau token (classic)
3. Permissions : `repo` (accès complet)
4. Remplacer dans `.mcp.json`

### Serveur ne répond pas

1. Ouvrir les DevTools de Claude Code (Ctrl+Shift+I)
2. Console → Vérifier les erreurs
3. Redémarrer le serveur MCP spécifique
4. Vérifier les logs : `~/.claude/logs/`

---

## 🔐 Sécurité

### ⚠️ IMPORTANT : Ne PAS Commiter .mcp.json

Le fichier `.mcp.json` contient des **tokens sensibles**.

**Ajoutez à `.gitignore` :**
```
# Configuration MCP (tokens sensibles)
.mcp.json
mcp.json
```

**Sauvegarde sécurisée :**
Créer un template sans les tokens :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=VOTRE_PROJECT_REF"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "VOTRE_TOKEN_ICI"
      }
    }
  }
}
```

Sauvegarder dans `.mcp.json.template` (sans tokens).

---

## 📊 Statut des Serveurs

| Serveur | Status | Version | Dernière Vérification |
|---------|--------|---------|----------------------|
| Supabase | ✅ Actif | latest | 2025-10-19 |
| GitHub | ✅ Actif | latest | 2025-10-19 |
| DeepWiki | 🆕 Nouveau | latest | 2025-10-19 |
| Playwright | 🆕 Nouveau | latest | 2025-10-19 |

---

## 🔗 Ressources Utiles

**Documentation Officielle :**
- MCP Protocol : https://modelcontextprotocol.io/
- Serveurs MCP : https://github.com/modelcontextprotocol/servers
- Claude Code : https://claude.com/claude-code

**Communauté :**
- GitHub Discussions : https://github.com/modelcontextprotocol/servers/discussions
- Discord : https://discord.gg/modelcontextprotocol

---

**Configuration à jour ! 🎉**

Les 4 serveurs MCP sont configurés et prêts à l'emploi :
- ✅ **Supabase** - Base de données PRODUCTION
- ✅ **GitHub** - Gestion de code et repos
- 🆕 **DeepWiki** - Documentation technique
- 🆕 **Playwright** - Automatisation browser (Microsoft)
