# 📊 État de configuration des MCPs et environnement de développement

**Date de dernière mise à jour :** 5 janvier 2025
**Objectif final :** Créer un template d'environnement de développement réutilisable dans un repo GitHub

---

## 🎯 OBJECTIF DU PROJET

Créer un environnement de développement standardisé avec :
- MCPs configurés et fonctionnels
- Hooks automatiques (prettier, eslint, tests)
- Configuration de sécurité
- Système de backup automatique
- À mettre dans un repo GitHub template pour réutilisation sur tous les nouveaux projets

---

## ✅ MCPs ACTUELLEMENT CONFIGURÉS (dans .mcp.json)

### 1. **Supabase** ✅ TESTÉ & FONCTIONNE
```json
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=mkbchdhbgdynxwfhpxbw"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```
- ✅ Testé avec `mcp__supabase__list_tables` → Fonctionne (trop de données mais connecté)
- **Utilité :** Gestion base de données, migrations, advisors de sécurité
- **Décision :** **GARDER** pour le template

### 2. **GitHub** ⚠️ CORRIGÉ - À TESTER
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```
- ⚠️ Ancien token expiré → **CORRIGÉ** avec le bon token
- ❓ **À TESTER après redémarrage** avec `mcp__github__search_repositories`
- **Utilité :** Gestion repos, issues, PR, commits
- **Décision :** **GARDER** pour le template (une fois testé)

### 3. **Sequential-thinking** 🆕 AJOUTÉ - À TESTER
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```
- 🆕 **VIENT D'ÊTRE AJOUTÉ** (5 janvier 2025)
- ❓ **À TESTER après redémarrage**
- **Utilité :** Raisonnement structuré étape par étape, décomposition de problèmes complexes
- **Type :** MCP officiel de référence
- **Décision :** **GARDER** - Très utile pour débugger et planifier

### 4. **Deepwiki** ❓ À TESTER
```json
{
  "command": "npx",
  "args": ["-y", "mcp-deepwiki@latest"]
}
```
- ❓ Pas encore testé
- **Utilité :** Récupération documentation de repos GitHub
- **À DÉCIDER après test**

### 5. **Playwright (Microsoft)** ✅ DÉJÀ CONFIGURÉ - À TESTER
```json
{
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```
- ✅ **DÉJÀ CONFIGURÉ** avec la bonne commande Microsoft
- ❓ **À TESTER après redémarrage**
- **Lien officiel :** https://github.com/microsoft/playwright-mcp
- **Ce qu'il fait :**
  - Automation de navigateur via l'arbre d'accessibilité (pas de screenshots !)
  - Navigation, clics, saisie de texte
  - Support multi-onglets
  - Génération de PDF
  - Enregistrement de sessions (traces, vidéos)
- **Avantages :**
  - Pas besoin de modèles de vision
  - Données structurées (plus rapide et précis)
  - Support Chromium, Firefox, WebKit, Edge
  - Modes : headless, avec interface, profils persistants
- **Utilité pour toi :**
  - ⭐⭐ Tests E2E automatiques de ton app
  - ⭐⭐ Scraping web si besoin
  - ⭐ Générer des PDFs de rapports
- **Décision :** **GARDER** - MCP officiel Microsoft, très puissant

### 6. **Vercel** ✅ CONFIGURÉ
```json
{
  "command": "npx",
  "args": ["-y", "@vercel/mcp-server"],
  "env": {
    "VERCEL_TOKEN": "vercel_XXXXXXXXXXXXXXXXXXXX"
  }
}
```
- ✅ Configuré (pas encore testé)
- **Utilité :** Déploiement, logs, env vars, domaines
- **Décision :** **GARDER** - Tu déploies sur Vercel

---

## 📋 MCPs LISTÉS DANS settings.local.json MAIS NON CONFIGURÉS

Ces MCPs sont listés dans `enabledMcpjsonServers` mais **sans configuration dans .mcp.json** :

1. ❌ **typescript-sdk** - Pas dans liste officielle, probablement n'existe pas
2. ❌ **slack** - Existe mais pas configuré (pertinent pour toi ?)
3. ❌ **filesystem** - MCP officiel, à ajouter ?
4. ❌ **memory-bank** - MCP officiel, à ajouter ?
5. ❌ **brave-search** - Recherche web, à ajouter ?
6. ❌ **google-maps** - Pertinent pour ton projet ?
7. ❌ **deep-graph** - Pas trouvé dans liste officielle
8. ❌ **puppeteer** - Tu as Playwright, doublon ?

**Action nécessaire :** Décider lesquels configurer vraiment

---

## 🧪 TESTS À FAIRE APRÈS REDÉMARRAGE

### Test 1 : Sequential-thinking
```
[Demander à Claude d'utiliser sequential-thinking pour décomposer un problème]
```
**Critère de succès :** Claude peut raisonner étape par étape

### Test 2 : GitHub MCP
```
[Tester] mcp__github__search_repositories avec query: "user:Allakabeth"
```
**Critère de succès :** Liste des repos sans erreur d'authentification

### Test 3 : Deepwiki
```
[Tester] mcp__deepwiki__deepwiki_fetch avec url: "vercel/next.js"
```
**Critère de succès :** Récupération de la documentation

### Test 4 : Playwright
```
[Tester] Ouvrir un navigateur et prendre un screenshot
```
**Critère de succès :** Screenshot créé

### Test 5 : Vercel
```
[Tester] Lister les projets Vercel ou les déploiements
```
**Critère de succès :** Liste des projets

---

## 🆕 MCPs CANDIDATS À ÉVALUER

L'utilisateur a commencé à me donner une liste de MCPs à évaluer :

### 1. Sequential-thinking ✅
- **Status :** Ajouté à la config
- **Lien :** https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
- **Analyse :** MCP officiel, très utile, **GARDÉ**

### 2. Context7 (Upstash) ⭐⭐⭐ TRÈS INTÉRESSANT
- **Status :** ✅ AJOUTÉ au .mcp.json
- **Lien :** https://github.com/upstash/context7
- **Type :** Communautaire (Upstash)
- **Ce qu'il fait :**
  - Récupère de la documentation **à jour** et spécifique à une version
  - Résout le problème des LLMs avec des données d'entraînement obsolètes
  - Fournit des exemples de code actuels directement dans le prompt
  - Commande : Ajouter "use context7" dans le prompt
- **Installation :**
  ```json
  {
    "command": "npx",
    "args": ["-y", "@upstash/context7"],
    "env": {
      "CONTEXT7_API_KEY": "optional-your-key-here"
    }
  }
  ```
- **Utilité pour toi :**
  - ⭐⭐⭐ Tu travailles avec Next.js, Supabase → Doc toujours à jour !
  - ⭐⭐⭐ Évite les bugs dus à des APIs obsolètes
  - ⭐⭐ Exemples de code actuels pour tes features
- **Gratuit ?** Oui (tier gratuit sans clé API, clé optionnelle pour + de requêtes)
- **Supporte :** 20+ éditeurs dont Claude Code
- **Langages supportés :** 17+ langages
- **Décision préliminaire :** **TRÈS RECOMMANDÉ** - résout un vrai problème

### 3. Codemcp ❌ PAS RECOMMANDÉ (redondant)
- **Status :** Non ajouté
- **Lien :** https://github.com/ezyang/codemcp
- **Type :** Communautaire (ezyang)
- **Ce qu'il fait :**
  - Transforme Claude Desktop en assistant de programmation en paire
  - Édition automatique de code avec auto-acceptation des changements
  - Gestion Git : commit automatique à chaque modif LLM
  - Shell sécurisé avec whitelist de commandes dans `codemcp.toml`
  - Indépendant de l'IDE (vim, VS Code, etc.)
- **Installation :**
  - Nécessite Claude Desktop (pas Claude Code)
  - Extension navigateur Chrome obligatoire
  - Configuration SSE avec `uvx --from git+...`
- **Pourquoi PAS pour toi :**
  - ❌ Tu utilises **Claude Code**, pas Claude Desktop
  - ❌ **Redondant** : Claude Code fait déjà tout ça nativement
  - ❌ Tu as déjà des hooks Git automatiques configurés
  - ❌ Tu as déjà l'édition de code intégrée (Edit, Write, MultiEdit)
  - ❌ Setup complexe (extension Chrome + config SSE)
- **Utilité pour toi :** ⭐ Aucune - Tu as déjà mieux
- **Décision :** **NE PAS INSTALLER** - Complètement redondant avec ton setup

### 4A. Memory (MCP Officiel) ⭐⭐⭐ SERVEUR OFFICIEL
- **Status :** Découvert dans le dépôt officiel
- **Lien :** https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- **Type :** **MCP OFFICIEL de référence**
- **Ce qu'il fait :**
  - Système de mémoire persistante basé sur un **graphe de connaissances**
  - Stockage d'entités et relations sémantiques
  - Architecture plus simple que Memory Service
- **Utilité pour toi :**
  - ⭐⭐⭐ Mémoire persistante entre conversations
  - ⭐⭐ Structure de graphe pour relations complexes
  - ⭐⭐ MCP officiel = support long terme garanti
- **Décision préliminaire :** À évaluer vs Memory Service (voir ci-dessous)

### 4B. MCP Memory Service ⭐⭐⭐ PRIORITÉ (Alternative complète)
- **Status :** À installer EN PRIORITÉ (après collecte de la liste)
- **IMPORTANT :** L'utilisateur a identifié la mémoire comme source majeure de frustration actuelle
- **Lien :** https://github.com/doobidoo/mcp-memory-service
- **Type :** Communautaire (doobidoo) - Production-ready, plus complet que l'officiel
- **Ce qu'il fait :**
  - **Mémoire persistante** entre conversations avec recherche sémantique
  - **Document management** : Upload PDF, texte, markdown, JSON
  - Chunking intelligent + tagging automatique
  - **Interface web** : Dashboard à http://127.0.0.1:8888/
  - **Triggers automatiques** : 85%+ de précision pour rappeler des mémoires pertinentes
  - **Multi-backend** : SQLite local, Cloudflare cloud, ou hybride
  - Support OAuth 2.1 pour équipes
  - Zero database locks (accès concurrent HTTP + MCP)
- **Installation :**
  ```bash
  pip install mcp-memory-service
  # OU
  git clone && python install.py (setup interactif)
  ```
  Configuration automatique de Claude Desktop/Code
- **Utilisation :**
  - `memory store "Information à retenir"`
  - `memory recall "recherche sémantique"`
  - Upload documents via web UI
  - Triggers automatiques pendant les conversations
- **Utilité pour toi :**
  - ⭐⭐⭐ **Se souvenir de décisions** architecturales entre projets
  - ⭐⭐⭐ **Patterns de code** réutilisables
  - ⭐⭐⭐ **Documentation** centralisée de tes projets
  - ⭐⭐ Stocker des **solutions** à des bugs récurrents
  - ⭐⭐ **Contexte partagé** entre conversations
- **Avantages :**
  - Backend hybride : rapide (5ms) + sync cloud
  - Interface web complète
  - Support documents (pas juste du texte)
  - Triggers automatiques (pas besoin de demander)
- **Note :** Tu as "memory-bank" listé mais pas configuré → Ces 2 MCPs sont plus complets
- **Comparaison Memory vs Memory Service :**
  | Critère | Memory (Officiel) | Memory Service (Tiers) |
  |---------|------------------|----------------------|
  | Support officiel | ✅ MCP officiel | ⚠️ Communautaire |
  | Interface web | ❌ Non | ✅ Dashboard complet |
  | Upload documents | ❌ Non | ✅ PDF, JSON, MD |
  | Triggers auto | ❌ Manuel | ✅ 85%+ précision |
  | Backend cloud | ❌ Local seulement | ✅ Cloudflare + local |
  | Complexité | ⭐ Simple | ⭐⭐ Moyenne |
  | Production-ready | ⭐⭐ Beta | ⭐⭐⭐ Prod |
- **Décision préliminaire :** **INSTALLER LES DEUX** et choisir après test
  - Memory officiel → Mémoire conversationnelle simple
  - Memory Service → Gestion documentaire + RAG

### 5. RAG (neuml) ⚠️ PAS UN MCP - Application standalone
- **Status :** Non applicable
- **Lien :** https://github.com/neuml/rag
- **Type :** Application Streamlit standalone (PAS un MCP)
- **Ce qu'il fait :**
  - Application RAG (Retrieval Augmented Generation)
  - Recherche vectorielle + génération par LLM
  - Graph RAG avec knowledge graphs
  - Interface Streamlit pour interroger des documents
  - Support Vector RAG et Graph RAG
- **Installation :**
  ```bash
  # Docker
  docker run -d --gpus=all -it -p 8501:8501 neuml/rag
  # OU Python
  pip install -r requirements.txt && streamlit run rag.py
  ```
- **Pourquoi PAS pour toi :**
  - ❌ Ce n'est **PAS un MCP server** - c'est une app Streamlit séparée
  - ❌ Nécessiterait de lancer une app externe à part
  - ✅ **MCP Memory Service couvre déjà le besoin RAG** :
    - Recherche sémantique avec embeddings ✅
    - Stockage de documents ✅
    - Retrieval automatique ✅
    - Intégré directement à Claude ✅
- **Alternative MCP possible :**
  - Chercher un vrai "RAG MCP server" si besoin spécifique
  - Mais Memory Service devrait suffire pour tes cas d'usage
- **Décision :** **NE PAS INSTALLER** - Pas un MCP, besoin déjà couvert

### 6. MCP-RAG (AnuragB7) ⭐⭐⭐ PARFAIT POUR TON CAS D'USAGE 🎓
- **Status :** À installer EN PRIORITÉ pour le workflow pédagogique
- **Lien :** https://github.com/AnuragB7/MCP-RAG
- **Type :** Application Streamlit + Serveur MCP (Production-ready)
- **Ce qu'il fait :**
  - **RAG professionnel** : Traite fichiers jusqu'à 200 Mo
  - **Support multi-formats** :
    - PDF avec extraction page par page + détection tableaux ✅
    - DOCX avec paragraphes et tableaux ✅
    - Excel par feuille avec contexte colonnes ✅
    - CSV avec regroupement intelligent ✅
    - PPTX (PowerPoint) ✅
    - **Images : JPEG, PNG, WEBP, GIF avec OCR intégré** ✅
  - **Chunking intelligent** selon taille fichier
  - **Gestion mémoire** via streaming
  - **Recherche sémantique** avec scores de confiance
  - **Requêtes multi-documents**
  - **Attribution sources** avec citations
  - **Interface Streamlit** + Agent LangChain + MCP Tools
- **Architecture :**
  - Streamlit UI → LangChain Agent → MCP Server
  - ChromaDB ou Milvus pour vecteurs
  - OpenAI-compatible endpoints
- **Installation :**
  ```bash
  git clone https://github.com/AnuragB7/MCP-RAG.git
  python -m venv venv
  pip install -r requirements.txt
  # Config .env : API_KEY, BASE_URL, MODEL_NAME
  streamlit run streamlit_app.py
  ```
- **Prérequis :**
  - Python 3.11+ ✅ (tu as 3.12)
  - Clé OpenAI (ou compatible)
  - 8 Go RAM minimum
- **POURQUOI C'EST PARFAIT POUR TOI :**
  - ✅ **Analyse PDF avec images** → Ton besoin principal !
  - ✅ **OCR intégré** → Lit texte dans images
  - ✅ **Détection tableaux** → Utile pour docs formation
  - ✅ **Chunking intelligent** → Gère gros documents
  - ✅ **Citations sources** → Traçabilité pédagogique
  - ✅ **Interface Streamlit** → UI pour visualiser
  - ✅ **RAG avancé** → Contexte pertinent pour génération exercices
- **Workflow pédagogique :**
  1. Upload PDF de formation (avec images)
  2. MCP-RAG extrait texte + images + OCR
  3. Chunking intelligent du contenu
  4. Tu poses : "Crée 10 exercices reconnaissance mots niveau CP basés sur ce document"
  5. RAG trouve les sections pertinentes
  6. Claude génère exercices adaptés avec contexte exact
- **Complémentarité avec Memory Service :**
  - **MCP-RAG** = Analyse documents → Génère exercices
  - **Memory Service** = Mémorise patterns → Cohérence long-terme
  - Les deux ensemble = Puissance maximale 🚀
- **Décision :** **INSTALLER EN PRIORITÉ** - Résout ton besoin principal

### 7. Filesystem (MCP Officiel) ⭐⭐⭐ TRÈS UTILE
- **Status :** Découvert dans le dépôt officiel
- **Lien :** https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
- **Type :** **MCP OFFICIEL de référence**
- **Ce qu'il fait :**
  - Gestion **sécurisée** des opérations fichiers
  - **Contrôle d'accès configurable** (whitelist de dossiers)
  - Lecture, écriture, liste, recherche de fichiers
  - Création/suppression de dossiers
  - Manipulation de fichiers dans des répertoires autorisés uniquement
- **Utilité pour toi :**
  - ⭐⭐⭐ **Upload sécurisé** de PDF/images pédagogiques
  - ⭐⭐⭐ **Gestion fichiers** dans `/data`, `/uploads`, etc.
  - ⭐⭐ **Sandbox** : Empêche accès aux fichiers système sensibles
  - ⭐⭐ **Traçabilité** : Log toutes les opérations fichiers
- **Installation :**
  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path1", "/allowed/path2"],
    "env": {}
  }
  ```
- **Configuration pour ton projet :**
  ```json
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/mnt/c/Projet ACLEF/projet aclef pedagogie/data",
    "/mnt/c/Projet ACLEF/projet aclef pedagogie/public/uploads"
  ]
  ```
- **Décision préliminaire :** **INSTALLER** - Sécurité + contrôle essentiel

### 8. Fetch (MCP Officiel) ⭐⭐ UTILE
- **Status :** Découvert dans le dépôt officiel
- **Lien :** https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
- **Type :** **MCP OFFICIEL de référence**
- **Ce qu'il fait :**
  - Récupération de **contenu web** optimisée pour LLMs
  - **Conversion** HTML → Markdown
  - **Nettoyage** du contenu (suppression JS, CSS, etc.)
  - Headers et cookies configurables
  - Gestion des redirections
- **Utilité pour toi :**
  - ⭐⭐ **Récupérer docs pédagogiques** en ligne
  - ⭐⭐ **Extraire contenu** de sites éducatifs
  - ⭐ **Analyse de pages** web pour création exercices
  - ⭐ Alternative à WebFetch de Claude Code
- **Installation :**
  ```json
  {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"],
    "env": {}
  }
  ```
- **Décision préliminaire :** **OPTIONNEL** - Peut être utile mais pas critique

### 9. Serena (oraios) ⭐⭐⭐⭐⭐ TRÈS POPULAIRE - GAME CHANGER
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/oraios/serena
- **Type :** Communautaire - Production-ready (15.4k ⭐, 1.1k forks)
- **Ce qu'il fait :**
  - **Édition sémantique de code** au niveau symbole (pas textuel)
  - Navigation intelligente dans codebases complexes
  - **Réduction massive de tokens** + amélioration qualité
  - Outils de récupération sémantique :
    - `find_symbol` : Localiser symboles spécifiques
    - `find_referencing_symbols` : Identifier dépendances
    - `insert_after_symbol` : Édition ciblée précise
  - Support **23+ langages** via LSP : Python, JS/TS, PHP, Go, Rust, C/C++, Java, C#, Ruby, Swift, Kotlin, etc.
- **Architecture :**
  - Serveurs de langage LSP (gopls, rust-analyzer, typescript-language-server, etc.)
  - Indexation pour accélération
  - Contextes adaptés : ide-assistant, codex, personnalisés
- **Installation :**
  ```bash
  # Via uvx (recommandé)
  uvx --from git+https://github.com/oraios/serena serena start-mcp-server
  ```
  Configuration automatique pour Claude Code/Desktop
- **Prérequis :**
  - Python 3.x ✅ (tu as 3.12)
  - uv (gestionnaire de paquets Python) - à installer
  - Serveurs de langage selon besoins (typescript-language-server pour ton projet)
- **Utilité pour toi :**
  - ⭐⭐⭐⭐ **Navigation Next.js/React** : Trouve composants, hooks, API routes
  - ⭐⭐⭐⭐ **Édition précise** : Modifie fonctions sans relire fichiers entiers
  - ⭐⭐⭐⭐ **Réduit tokens** : Extraction contexte ciblé = moins de coût
  - ⭐⭐⭐ **Analyse dépendances** : Où ce composant est utilisé ?
  - ⭐⭐⭐ **Refactoring intelligent** : Renommage symboles avec références
- **Cas d'usage concrets :**
  1. "Trouve toutes les utilisations du hook useAuth"
  2. "Insère une fonction après handleSubmit dans LoginForm"
  3. "Modifie la signature de cette API sans casser les appelants"
  4. "Liste tous les composants qui utilisent supabaseClient"
- **Avantages :**
  - ✅ Production-ready (1,532 commits, roadmap active)
  - ✅ Communauté massive (15.4k stars)
  - ✅ Intégration native Claude Code
  - ✅ "Enormous productivity boost" (témoignages utilisateurs)
  - ✅ Multilingue complet
- **Limitations connues :**
  - Moins utile pour code from scratch (excellent pour édition/navigation)
  - C/C++ support en construction
  - Java lent au démarrage
- **Complémentarité avec ton stack :**
  - **Serena** = Navigation/édition sémantique Next.js
  - **Memory Service** = Se souvient des patterns
  - **MCP-RAG** = Analyse documents pédagogiques
  - Les trois ensemble = Productivité maximale 🚀
- **Décision préliminaire :** **INSTALLER ABSOLUMENT** - C'est un des MCPs les plus utiles pour développeurs

### 10. Claude Context (Zilliztech) ⭐⭐⭐⭐ POPULAIRE - Recherche sémantique codebase
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/zilliztech/claude-context
- **Type :** Communautaire (Zilliztech/Milvus) - Production-ready (4.4k ⭐, 387 forks)
- **Ce qu'il fait :**
  - **Recherche sémantique globale** sur l'ensemble d'une codebase
  - **Indexation hybride** : BM25 (mots-clés) + embeddings vectoriels denses
  - Stockage dans **Milvus Cloud** (base de données vectorielle)
  - Accès à des millions de lignes sans charger les répertoires entiers
  - **Réduit coûts de ~40%** selon benchmarks officiels
- **Outils disponibles :**
  - `index_codebase` : Indexer un répertoire
  - `search_code` : Requêtes en langage naturel
  - `clear_index` : Supprimer un index
  - `get_indexing_status` : Progression d'indexation
- **Installation :**
  ```bash
  claude mcp add claude-context \
    -e OPENAI_API_KEY=sk-votre-clé \
    -e MILVUS_TOKEN=votre-clé-zilliz \
    -- npx @zilliz/claude-context-mcp@latest
  ```
- **Prérequis :**
  - Node.js 20.0.0 à <24.0.0 ✅ **TON NODE v20.19.5 COMPATIBLE!**
  - Clé OpenAI (embeddings)
  - Compte Zilliz Cloud gratuit (token)
- **Utilité pour toi :**
  - ⭐⭐⭐⭐ **Exploration projet** : "Trouve tous les fichiers liés à l'authentification"
  - ⭐⭐⭐⭐ **Contexte pertinent** : Recherche sémantique au lieu de grep
  - ⭐⭐⭐ **Réduction coûts** : ~40% de tokens en moins
  - ⭐⭐⭐ **Grandes codebases** : Ton projet = 143 fichiers → Parfait !
- **Cas d'usage concrets :**
  1. "Indexe tout le projet pédagogique"
  2. "Trouve tous les fichiers qui gèrent la syllabification"
  3. "Où est implémentée la logique de quiz ?"
  4. "Montre-moi les composants liés aux imagiers"
- **Avantages :**
  - ✅ Production-ready (147 commits, MIT)
  - ✅ Support officiel Anthropic (intégration native)
  - ✅ Benchmarks quantifiés (réduction coûts 40%)
  - ✅ Recherche hybride (mots-clés + sémantique)
  - ✅ Zilliz Cloud gratuit
- **Limitations connues :**
  - ⚠️ Node.js <24 requis (vérifier version)
  - Nécessite clé OpenAI (coût embeddings)
  - Dépendance cloud Zilliz (pas 100% local)
- **Complémentarité avec Serena :**
  - **Serena** = Navigation précise symbole par symbole (micro)
    - "Trouve la fonction handleSubmit dans LoginForm"
  - **Claude Context** = Recherche sémantique globale (macro)
    - "Trouve tous les fichiers liés à l'auth"
  - Les deux ensemble = Navigation locale + exploration globale 🎯
- **Relation Milvus :**
  - Zilliztech = créateur de Milvus (base vectorielle open-source)
  - Claude Context utilise Milvus Cloud comme backend
  - Alternative : Milvus auto-hébergé (via MILVUS_ADDRESS)
- **Décision préliminaire :** **INSTALLER ABSOLUMENT**
  - ✅ Node v20.19.5 compatible confirmé
  - Complémentaire parfait avec Serena
  - Installation immédiate recommandée

### 11. Magic-MCP (21st-dev) ⭐⭐ INTÉRESSANT - Génération composants UI par IA
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/21st-dev/magic-mcp
- **Type :** Communautaire (21st-dev) - En BÊTA (3.9k ⭐, 255 forks)
- **Ce qu'il fait :**
  - **Génération de composants UI React** par descriptions en langage naturel
  - "v0 mais dans ton IDE" (alternative à Vercel v0)
  - Intégration directe Cursor, Windsurf, VSCode
  - Aperçu en temps réel des composants
  - Accès à bibliothèque de composants modernes (21st.dev)
  - Support TypeScript complet (90.5%)
  - Intégration SVGL (assets et logos professionnels)
- **Installation :**
  ```bash
  npx @21st-dev/cli@latest install <client> --api-key <key>
  ```
  Ou installation manuelle dans config MCP de l'IDE
- **Prérequis :**
  - Node.js (LTS)
  - IDE supporté (Cursor, Windsurf, VSCode+Cline)
  - Clé API de 21st.dev Magic Console (gratuit en bêta)
- **Utilité pour toi :**
  - ⭐⭐ **Prototypage rapide** : Nouveaux composants UI pour exercices
  - ⭐⭐ **Création formulaires** : "Crée un formulaire de login moderne"
  - ⭐ **Barres navigation** : Composants prêts à l'emploi
  - ⭐ **Boutons réactifs** : Design moderne automatique
- **Cas d'usage concrets :**
  1. "Crée un composant carte interactive pour les imagiers"
  2. "Génère un formulaire de quiz avec animations"
  3. "Crée une barre de progression pour les exercices"
  4. "Design un dashboard moderne pour l'admin"
- **Avantages :**
  - ✅ Intégration IDE native
  - ✅ Gratuit pendant la bêta
  - ✅ Composants React/TypeScript
  - ✅ Code éditable et personnalisable
  - ✅ Bibliothèque communautaire 21st.dev
- **Limitations connues :**
  - ⚠️ **EN BÊTA** (pas production-ready)
  - Nécessite clé API externe
  - Focus uniquement sur UI (pas logique métier)
  - Pas de génération backend
- **Pertinence pour ton projet :**
  - ⭐⭐ Utile mais pas critique
  - Ton projet a déjà des composants fonctionnels
  - Plus utile pour **nouveaux composants** ou refonte UI
  - Focus actuel = logique pédagogique, pas design
- **Comparaison avec alternatives :**
  - **Magic-MCP** = Génération UI dans IDE
  - **Vercel v0** = Génération UI externe (web)
  - **shadcn/ui** = Bibliothèque composants (manuel)
  - Magic-MCP = Meilleur workflow IDE, mais v0 plus mature
- **Décision préliminaire :** **OPTIONNEL - Priorité basse**
  - Installer APRÈS les MCPs critiques (Serena, Memory, etc.)
  - Utile pour phase "amélioration UX" future
  - En bêta = moins prioritaire que production-ready

### 12. PromptX (Deepractice) ⭐⭐⭐⭐ PLATEFORME COMPLÈTE - Agent IA intelligent
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/Deepractice/PromptX
- **Type :** Communautaire - Production-ready (3k ⭐, 828 commits)
- **Ce qu'il fait :**
  - **Plateforme MCP complète** qui transforme Claude en expert professionnel
  - **"Chat is all you need"** : Conversation naturelle sans syntaxe complexe
  - **Architecture modulaire** : Client desktop + serveur HTTP (port 5203)
  - Système de mémoire cognitive persistante entre conversations
- **Composants principaux :**

  **1. Nuwa (Concepteur de Rôles IA)**
  - Crée des experts IA via description naturelle
  - "J'ai besoin de quelqu'un qui comprend code ET produit" → Product Manager technique
  - Pas de configuration manuelle, dialogue conversationnel

  **2. Luban (Intégrateur d'Outils)**
  - Connecte **n'importe quelle API en 3 minutes**
  - Support : Slack, PostgreSQL, OpenAI, webhooks personnalisés
  - L'IA accède directement aux outils sans intervention

  **3. Writer (Créateur de Contenu)**
  - Contenu authentique sans stigmate IA
  - Méthodologie ISSUE (dialogue conversationnel détaillé)
  - Posts techniques, copies marketing, annonces produits

  **4. Outils Intégrés**
  - Excel Tool : Analyse données, génération rapports
  - Word Tool : Lecture/création documents professionnels
  - PDF Reader : Extraction contenu avec cache intelligent

- **Installation :**

  **Méthode 1 : Client desktop (Recommandé)**
  - Téléchargement macOS (Silicon/Intel) ou Windows
  - Interface graphique, serveur HTTP auto sur :5203
  - Configuration automatique

  **Méthode 2 : NPX (Développeurs)**
  ```bash
  npx -y @promptx/mcp-server
  ```

  **Méthode 3 : Docker (Production)**
  ```bash
  docker run -d -p 5203:5203 -v ~/.promptx:/root/.promptx deepracticexs/promptx:latest
  ```

  Configuration MCP (Claude/Cursor) :
  ```json
  {
    "promptx": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:5203/mcp"
    }
  }
  ```

- **Prérequis :**
  - Node.js (méthode 2)
  - Docker (méthode 3)
  - Port 5203 disponible
  - Clés API optionnelles (pour intégrations externes)

- **Utilité pour toi :**
  - ⭐⭐⭐⭐ **Nuwa** : Créer "Expert pédagogie FLE" ou "Expert syllabification"
  - ⭐⭐⭐⭐ **Luban** : Intégrer APIs externes rapidement (ElevenLabs, Gemini, etc.)
  - ⭐⭐⭐⭐ **Excel Tool** : Analyser données apprenants, stats exercices
  - ⭐⭐⭐ **Writer** : Générer contenu pédagogique authentique
  - ⭐⭐⭐ **PDF/Word** : Analyser documents formation, créer rapports

- **Cas d'usage concrets :**
  1. **Nuwa** : "Crée un expert pédagogique spécialisé en illettrisme niveau débutant"
  2. **Luban** : "Connecte l'API Gemini pour générer des quiz en 3 minutes"
  3. **Excel** : "Analyse les résultats des 50 apprenants et génère rapport de progression"
  4. **Writer** : "Rédige des consignes d'exercices adaptées au niveau CP"
  5. **PDF** : "Extrait le vocabulaire d'un manuel de formation FLE"

- **Avantages :**
  - ✅ Production-ready (828 commits, déploiement Docker)
  - ✅ Client desktop avec interface graphique
  - ✅ Architecture modulaire extensible
  - ✅ Mémoire cognitive persistante
  - ✅ Support multi-plateforme (macOS/Windows/Linux)
  - ✅ Signage numérique (SignPath) pour Windows
  - ✅ **Paradigme révolutionnaire** : "Traiter l'IA comme une personne, pas un logiciel"

- **Limitations connues :**
  - Nécessite serveur HTTP local (port 5203)
  - Roadmap avec features expérimentales (pas tout production-ready)
  - Client desktop = dépendance supplémentaire
  - Documentation en développement

- **Pertinence pour ton projet :**
  - ⭐⭐⭐⭐ **TRÈS PERTINENT** pour projet pédagogique
  - **Nuwa** = Créer agents pédagogiques spécialisés
  - **Luban** = Intégrations API simplifiées (tu as plein d'APIs)
  - **Excel** = Analyse données apprenants critiques
  - **Writer** = Contenu pédagogique authentique

- **Différence avec autres MCPs :**
  - **PromptX** = Plateforme complète (agent intelligent + outils + intégrations)
  - **Serena** = Navigation code spécialisée
  - **Claude Context** = Recherche sémantique pure
  - **Memory Service** = Mémoire pure
  - PromptX = **"Meta-MCP"** qui orchestre l'intelligence

- **Complémentarité :**
  - **PromptX** (Nuwa) = Créer expert pédagogique
  - **Memory Service** = Mémoriser patterns pédagogiques
  - **MCP-RAG** = Analyser documents formation
  - **Serena** = Naviguer code Next.js
  - Ensemble = **Système complet intelligent** 🚀

- **Décision préliminaire :** **INSTALLER EN PRIORITÉ 1.5**
  - Entre Memory et MCP-RAG en importance
  - **Nuwa** + **Luban** = Game changers pour développement pédagogique
  - Excel Tool critique pour analyse données apprenants
  - Client desktop simple à installer

### 13. Sourcegraph MCP (divar-ir) ⭐ NICHE - Recherche multi-repos externe
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/divar-ir/sourcegraph-mcp
- **Type :** Communautaire - En BETA/Prototype (15 ⭐, 7 commits)
- **Ce qu'il fait :**
  - Intègre **Sourcegraph** (plateforme de recherche de code) avec assistants IA
  - Recherche de code avancée sur **plusieurs dépôts** (multi-repos)
  - Support regex, filtres fichiers/langages, opérateurs booléens
  - Guide de requête pour optimiser recherches LLM
  - Récupération de contenu de fichiers/répertoires
- **Installation :**
  ```bash
  # Via UV (recommandé)
  uv sync && uv run python -m src.main

  # Via pip
  python -m venv venv && pip install -e .

  # Via Docker
  docker build -t sourcegraph-mcp .
  ```
- **Prérequis :**
  - Python 3.10+
  - Accès à instance Sourcegraph (cloud ou self-hosted)
  - Token d'accès pour instances privées
  - UV optionnel mais recommandé
- **Utilité pour toi :**
  - ⭐ **PAS VRAIMENT PERTINENT** pour ton cas d'usage
  - Sourcegraph = Plateforme pour **dizaines de repos** (entreprises)
  - Ton projet = **UN SEUL repo** (projet-aclef-pedagogie)
  - Overkill pour recherche mono-repo
- **Cas d'usage généraux :**
  1. Entreprise avec 50+ repos : "Trouve tous les usages de cette fonction"
  2. Monorepos géants : "Cherche ce pattern dans tous les services"
  3. Organisation multi-projets : "Analyse code partagé entre repos"
- **Avantages (pour grandes orgas) :**
  - ✅ Recherche multi-repos centralisée
  - ✅ Syntaxe de recherche avancée (regex, filtres)
  - ✅ Guide de requête pour LLM
  - ✅ Intégration Claude/Cursor
- **Limitations :**
  - ⚠️ **BETA/Prototype** (15 stars, 7 commits seulement)
  - Nécessite instance Sourcegraph (coût si cloud, setup si self-hosted)
  - Overkill pour projets mono-repo
  - Pas production-ready (juillet 2025, récent)
  - Communauté très petite
- **Comparaison avec alternatives :**

  | MCP | Scope | Pertinence pour toi |
  |-----|-------|---------------------|
  | **Serena** | Local, symbole par symbole | ⭐⭐⭐⭐ Parfait |
  | **Claude Context** | Local, sémantique | ⭐⭐⭐⭐ Parfait |
  | **Sourcegraph** | Multi-repos externe | ⭐ Overkill |

- **Quand utiliser Sourcegraph MCP :**
  - ✅ Organisation avec 10+ repos interconnectés
  - ✅ Monorepo géant (>1M lignes)
  - ✅ Besoin d'analyser code partagé entre projets
  - ❌ **PAS pour ton cas** : mono-repo de 143 fichiers
- **Note sur Cody (Sourcegraph) :**
  - Cody = Assistant IA concurrent de Claude Code (pas un MCP)
  - Cody supporte MCP via OpenCtx
  - Pas pertinent car tu utilises Claude Code
- **Décision préliminaire :** **NE PAS INSTALLER**
  - Pas adapté à ton cas d'usage (mono-repo)
  - Serena + Claude Context couvrent déjà la navigation locale
  - Nécessite setup Sourcegraph (complexe et coûteux)
  - BETA avec petite communauté (risque abandon)
  - **Utiliser seulement si :** Tu travailles sur projet-aclef-planning ET projet-aclef-pedagogie simultanément (multi-repos)

### 14. Memory Bank (alioshr) ⭐⭐⭐ PRODUCTION - Mémoire fichiers multi-projets
- **Status :** Nouveau candidat à évaluer
- **Lien :** https://github.com/alioshr/memory-bank-mcp
- **Type :** Communautaire - Production-ready (745 ⭐, 54 commits, MIT)
- **Ce qu'il fait :**
  - **Mémoire persistante basée sur fichiers** (filesystem local)
  - **Multi-projets** : Isolation par répertoire avec sécurité
  - Service centralisé pour banques mémoire
  - Opérations CRUD : lecture/écriture/mise à jour/listing
  - Validation stricte des chemins (prévention traversée répertoires)
- **Installation :**
  ```bash
  npx -y @smithery/cli install @alioshr/memory-bank-mcp --client claude
  ```
  Ou configuration manuelle avec variable `MEMORY_BANK_ROOT`
- **Prérequis :**
  - Node.js (via npx)
  - Répertoire accessible pour stockage
  - Variable d'environnement `MEMORY_BANK_ROOT`
  - Docker optionnel pour isolation
- **Utilité pour toi :**
  - ⭐⭐⭐ **Multi-projets** : projet-aclef-pedagogie ET projet-aclef-planning
  - ⭐⭐⭐ **Fichiers locaux** : Contrôle total, pas de cloud
  - ⭐⭐ **Simple** : Structure de fichiers, facile à comprendre
  - ⭐⭐ **Persistance** : Mémoire entre sessions
- **Cas d'usage concrets :**
  1. Mémoriser contexte spécifique à projet-aclef-pedagogie
  2. Mémoriser contexte projet-aclef-planning séparément
  3. Partager mémoire entre plusieurs sessions Claude
  4. Backup simple (copier dossier MEMORY_BANK_ROOT)
- **Avantages :**
  - ✅ Production-ready (745 stars, tests, doc complète)
  - ✅ Multi-projets (isolation par répertoire)
  - ✅ Fichiers locaux (pas de dépendance cloud)
  - ✅ Auto-hébergeable (contrôle total)
  - ✅ Gratuit et open-source (MIT)
  - ✅ Backup facile (système de fichiers)
  - ✅ Compatible Smithery (écosystème)
- **Limitations :**
  - ❌ Pas d'interface web (CLI/fichiers uniquement)
  - ❌ Pas de triggers automatiques (manuel)
  - ❌ Pas de recherche sémantique avancée
  - ❌ Pas de support documents (PDF, etc.)
  - ❌ Moins scalable que cloud (filesystem local)
- **Comparaison 3 MCPs de mémoire :**

  | Critère | Memory (Officiel) | Memory Bank (alioshr) | Memory Service (doobidoo) |
  |---------|------------------|----------------------|---------------------------|
  | Stars GitHub | N/A (officiel) | 745 ⭐ | Moins populaire |
  | Architecture | Graphe connaissances | Fichiers locaux | Cloud + local hybride |
  | Multi-projets | ❌ Mono-projet | ✅ Multi-projets | ⚠️ À vérifier |
  | Interface web | ❌ Non | ❌ Non | ✅ Dashboard http://127.0.0.1:8888 |
  | Triggers auto | ❌ Manuel | ❌ Manuel | ✅ 85%+ précision |
  | Upload docs | ❌ Non | ❌ Non | ✅ PDF, JSON, MD |
  | Backend cloud | ❌ Local | ❌ Local | ✅ Cloudflare + local |
  | Recherche sémantique | ⭐ Basique | ⭐ Basique (fichiers) | ⭐⭐⭐ Avancée (embeddings) |
  | Complexité | ⭐ Simple | ⭐⭐ Moyenne | ⭐⭐⭐ Élevée |
  | Installation | `npx` simple | `npx` + var env | `pip` + setup |
  | Production-ready | ⭐⭐ Beta | ⭐⭐⭐ Production | ⭐⭐⭐ Production |
  | Backup | ❓ Propriétaire | ✅ Copie dossier | ⚠️ Dépend backend |
  | Support officiel | ✅ Anthropic | ❌ Communauté | ❌ Communauté |

- **Quand choisir Memory Bank :**
  - ✅ Travail sur **plusieurs projets** (pédagogie + planning)
  - ✅ Préférence **fichiers locaux** vs cloud
  - ✅ Besoin **backup simple** (copie dossier)
  - ✅ Infrastructure **auto-hébergée**
  - ❌ Pas besoin UI web ni triggers auto

- **Pertinence pour ton projet :**
  - ⭐⭐⭐ **TRÈS PERTINENT** si tu travailles sur les 2 projets ACLEF
  - Multi-projets = isolation pedagogie/planning
  - Fichiers locaux = contrôle total
  - Production-ready = fiable

- **Note importante :**
  - Tu as "memory-bank" listé dans `settings.local.json` ligne 183
  - C'est probablement **CE MCP** que tu avais vu !
  - Jamais configuré dans `.mcp.json` → À ajouter si tu choisis

- **Décision préliminaire :** **INSTALLER comme 3ème option mémoire**
  - **Stratégie recommandée :** Installer les **3 MCPs de mémoire** et tester
    1. **Memory (officiel)** → Simple, support Anthropic
    2. **Memory Bank (alioshr)** → Multi-projets, fichiers locaux
    3. **Memory Service (doobidoo)** → Avancé, UI web, documents
  - Après tests : **Garder celui qui convient le mieux** à ton workflow
  - Probable choix final : **Memory Bank** (équilibre simplicité/fonctionnalités)

### 15. [EN ATTENTE - Liste à compléter]
L'utilisateur va continuer à donner d'autres MCPs à évaluer...

---

## 🚀 RÉCAPITULATIF DES SERVEURS MCP OFFICIELS

D'après le dépôt https://github.com/modelcontextprotocol/servers :

### Serveurs actifs (dans le dépôt main)
1. ✅ **Everything** - Serveur de test polyvalent
2. ✅ **Fetch** - Récupération contenu web → **ÉVALUÉ #8**
3. ✅ **Filesystem** - Opérations fichiers sécurisées → **ÉVALUÉ #7**
4. ✅ **Git** - Manipulation dépôts Git → Similar à GitHub (déjà installé)
5. ✅ **Memory** - Mémoire persistante graphe → **ÉVALUÉ #4A**
6. ✅ **Sequential Thinking** - Raisonnement structuré → **DÉJÀ INSTALLÉ #3**
7. ✅ **Time** - Gestion fuseaux horaires → Pas utile pour toi

### Serveurs archivés (déplacés dans repositories séparés)
- **Brave Search** → Repository officiel Brave
- **GitHub** → @modelcontextprotocol/server-github ✅ **DÉJÀ INSTALLÉ**
- **GitLab** → Repository séparé
- **Google Drive** → Repository séparé
- **PostgreSQL** → @supabase/mcp-server-supabase ✅ **DÉJÀ INSTALLÉ**
- **Puppeteer** → Similar à Playwright ✅ **DÉJÀ INSTALLÉ**
- **Slack** → Maintenu par Zencoder
- **SQLite** → Repository séparé

**Conclusion :** Tu as déjà la majorité des MCPs officiels importants!

---

## 🚀 MCPs COMMUNAUTAIRES POTENTIELLEMENT INTÉRESSANTS

D'après la recherche effectuée, voici les MCPs tiers qui pourraient être pertinents :

### Sécurité & Qualité
- ⭐⭐⭐ **Semgrep** - Analyse sécurité automatique
- ⭐⭐ **SonarQube** - Qualité de code

### Audio (utilisé dans le projet)
- ⭐⭐⭐ **ElevenLabs MCP** - Intégration native (au lieu d'API calls)

### Infrastructure
- ⭐ **AWS CDK** - Si utilisation AWS
- ⭐ **Cloudflare** - Workers, KV, R2

---

## 🎯 RÉCAPITULATIF : MCPs À INSTALLER

### 🔥 PRIORITÉ 0 : Duo game changer développement (20k ⭐ combinés)
1. **Serena** (15.4k ⭐) - Édition sémantique symbole par symbole
   - Installation : `uvx --from git+https://github.com/oraios/serena serena start-mcp-server`
   - **Note :** Nécessite uv (gestionnaire Python)
   - **Impact :** Navigation précise Next.js/React, refactoring intelligent

2. **Claude Context** (4.4k ⭐) - Recherche sémantique globale codebase
   - Installation : `claude mcp add claude-context ...`
   - **Note :** Nécessite clés OpenAI + Zilliz Cloud (gratuit)
   - **Impact :** Réduit coûts 40%, exploration intelligente projet
   - ✅ **Node v20.19.5 compatible confirmé!**

**Les deux ensemble = Navigation complète (micro + macro)** 🎯

### 🔥 PRIORITÉ 1 : Mémoire (résout frustration majeure)
**Stratégie : Installer les 3 et choisir après tests** 🧪

3. **Memory (officiel)** - Mémoire conversationnelle simple
   - Installation : `npx @modelcontextprotocol/server-memory`
   - ✅ Support Anthropic, simple

4. **Memory Bank (alioshr)** (745 ⭐) - Multi-projets fichiers locaux
   - Installation : `npx -y @smithery/cli install @alioshr/memory-bank-mcp --client claude`
   - ✅ **Probablement le meilleur équilibre** pour toi
   - ✅ Multi-projets (pédagogie + planning)
   - ✅ Fichiers locaux = backup facile
   - 💡 **Tu l'avais listé dans settings.local.json ligne 183!**

5. **Memory Service (tiers)** - Mémoire + documents + UI web
   - Installation : `pip install mcp-memory-service`
   - **Note :** Nécessite pip3 (à installer sur WSL)
   - ✅ Dashboard web, triggers auto, upload PDF

**Décision finale :** Installer les **3** et garder le meilleur après tests
- **Probable gagnant :** Memory Bank (équilibre parfait)

### 🔥 PRIORITÉ 1.5 : Plateforme intelligente pédagogique (NOUVEAU!)
6. **PromptX** (3k ⭐) - Plateforme MCP complète avec agents intelligents
   - Installation : Client desktop (macOS/Windows) OU `npx -y @promptx/mcp-server`
   - **Composants :**
     - **Nuwa** : Créer experts IA spécialisés ("Expert pédagogie FLE")
     - **Luban** : Intégrer APIs en 3 min (Gemini, ElevenLabs, etc.)
     - **Excel Tool** : Analyser données apprenants ⭐⭐⭐⭐
     - **Writer** : Contenu pédagogique authentique
     - **PDF/Word** : Analyser documents formation
   - **Impact :** Meta-MCP orchestrant l'intelligence, critique pour pédagogie
   - **Pourquoi prioritaire :** Excel Tool pour analyse apprenants + Luban pour intégrations API

### 🔥 PRIORITÉ 2 : Analyse documents pédagogiques
7. **MCP-RAG** - OCR + PDF + Images → Exercices
   - Installation : git clone + venv + pip install
   - **Note :** Nécessite clé OpenAI ou compatible

### ⭐ RECOMMANDÉ : Sécurité fichiers
8. **Filesystem (officiel)** - Opérations fichiers sécurisées
   - Installation : `npx @modelcontextprotocol/server-filesystem /path1 /path2`

### 📦 OPTIONNEL : Récupération web
9. **Fetch (officiel)** - Contenu web optimisé LLM
   - Installation : `npx @modelcontextprotocol/server-fetch`
10. **Magic-MCP** (3.9k ⭐) - Génération composants UI (EN BÊTA)
    - Installation : `npx @21st-dev/cli@latest install ...`
    - **Note :** Priorité basse, utile pour phase future "amélioration UX"

### ✅ DÉJÀ INSTALLÉS
- Sequential-thinking ✅
- GitHub ✅ (token corrigé, à tester)
- Context7 ✅ (à tester)
- Playwright ✅ (à tester)
- Deepwiki ✅ (à tester)
- Vercel ✅ (à tester)
- Supabase ✅ (fonctionne)

---

## 🎯 PLAN D'ACTION RÉVISÉ

### Phase 0 : Installation PRIORITAIRE - Système de mémoire 🔥
**BESOIN CRITIQUE identifié par l'utilisateur : Mémoire persistante**

Dès que la collecte de la liste MCPs est terminée :
1. [ ] Installer pip3 sur WSL (prérequis Python)
2. [ ] **Installer Memory (officiel)** via npx
3. [ ] **Installer Memory Service (tiers)** via pip
4. [ ] Configurer les deux dans .mcp.json
5. [ ] Tester et comparer les deux systèmes
6. [ ] Choisir le meilleur ou garder les deux
7. [ ] Former l'utilisateur à l'utilisation
8. [ ] Documenter les best practices

**Pourquoi c'est prioritaire :**
- ✅ Résout une frustration majeure actuelle
- ✅ Améliore drastiquement l'efficacité
- ✅ Évite de réexpliquer le contexte à chaque conversation
- ✅ Accumulation de connaissances projet au fil du temps

### Phase 0bis : Installation PRIORITAIRE - Analyse pédagogique 🎓
1. [ ] Installer MCP-RAG
2. [ ] Configurer avec clé API OpenAI
3. [ ] Tester avec un PDF pédagogique
4. [ ] Valider le workflow de création d'exercices

### Phase 1 : Tests post-redémarrage ⏳ EN COURS
1. [ ] Redémarrer Claude Code
2. [ ] Tester Sequential-thinking
3. [ ] Tester GitHub MCP (token corrigé)
4. [ ] Tester Deepwiki
5. [ ] Tester Playwright
6. [ ] Tester Vercel
7. [ ] Documenter les résultats ci-dessous

### Phase 2 : Compléter la liste des MCPs candidats
1. [ ] L'utilisateur continue à donner des MCPs à évaluer
2. [ ] Analyser chaque MCP (utilité, pertinence, officiel/communautaire)
3. [ ] Faire le tri : GARDER / JETER / PEUT-ÊTRE

### Phase 3 : Créer le template d'environnement
1. [ ] Créer un repo GitHub `dev-environment-template`
2. [ ] Nettoyer la config (enlever tokens hardcodés)
3. [ ] Créer les fichiers :
   - `.claude/settings.json` (hooks, permissions)
   - `.mcp.json.template` (avec variables d'env)
   - `CLAUDE.md` (instructions)
   - `.github/workflows/backup.yml` (backup auto)
   - `README.md` (mode d'emploi)
4. [ ] Tester le template sur un nouveau projet
5. [ ] Documenter l'utilisation

---

## 📝 RÉSULTATS DES TESTS (à remplir après redémarrage)

### Sequential-thinking
- **Date test :**
- **Résultat :**
- **Notes :**

### GitHub MCP
- **Date test :**
- **Résultat :**
- **Notes :**

### Deepwiki
- **Date test :**
- **Résultat :**
- **Notes :**

### Playwright
- **Date test :**
- **Résultat :**
- **Notes :**

### Vercel
- **Date test :**
- **Résultat :**
- **Notes :**

---

## 🔧 CONFIGURATION ACTUELLE DES HOOKS

Le projet a déjà des **hooks très complets** dans `.claude/settings.json` :

### PreToolUse Hooks
- Log toutes les commandes Bash
- Warning sur console.log dans les fichiers JS/TS
- npm audit sur modification de package.json

### PostToolUse Hooks
- **Prettier** auto-format sur Write/Edit
- **TypeScript** check automatique
- Warning sur wildcard imports
- **Tests auto** après modifications de code

### Stop Hooks
- ESLint sur fichiers modifiés
- Analyse bundle size

**Décision :** **GARDER TOUS** pour le template - très complet

---

## 📦 BACKUP SYSTÈME

Un système de backup automatique existe déjà :
- **Workflow GitHub Actions** : `.github/workflows/backup.yml`
- **Fréquence :** Quotidien à 2h00 UTC
- **Stockage :** GitHub (repository Sauvegarde-BDD)
- **Contenu :** roles.sql, schema.sql, data.sql

**Décision :** **INCLURE** dans le template

---

## 💾 FICHIERS DE CONFIGURATION IMPORTANTS

### Configuration locale du projet
- `.claude/settings.json` - Hooks et permissions (142 lignes)
- `.claude/settings.local.json` - Permissions spécifiques au projet (190 lignes)
- `.mcp.json` - Configuration des MCPs (48 lignes)
- `CLAUDE.md` - Instructions pour Claude (projet pédagogie)

### Configuration globale utilisateur
- `~/.claude/settings.json` - Config globale (alwaysThinkingEnabled: true, plugin supabase-toolkit)

---

## 🎯 PROCHAINES ÉTAPES

1. **ATTENDRE** le redémarrage de Claude Code
2. **LIRE CE FICHIER** pour me rappeler où on en est
3. **TESTER** tous les MCPs configurés
4. **CONTINUER** à recevoir la liste des MCPs candidats de l'utilisateur
5. **CRÉER** le template final

---

## 📚 RESSOURCES UTILES

- Liste complète MCPs : https://github.com/wong2/awesome-mcp-servers
- MCPs officiels : https://github.com/modelcontextprotocol/servers
- Documentation MCP : https://modelcontextprotocol.io/
- MCP Server Finder : https://www.mcpserverfinder.com/

---

## ⚠️ NOTES IMPORTANTES

1. **Tokens hardcodés** : Le .mcp.json contient des tokens en dur
   - À remplacer par variables d'environnement dans le template
   - Créer un `.env.example` pour le template

2. **Tokens dans settings.local.json** : Beaucoup de permissions spécifiques avec tokens
   - À nettoyer pour le template
   - Garder seulement les patterns génériques

3. **Plugin supabase-toolkit** : Installé globalement mais pages de doc n'existent plus
   - Peut être obsolète ou en développement
   - À évaluer si utile

---

**FIN DU DOCUMENT - À METTRE À JOUR AU FUR ET À MESURE**
