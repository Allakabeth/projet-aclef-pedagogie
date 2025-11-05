# 🧪 Guide de Tests des MCPs Installés

**Date:** 5 novembre 2025
**MCPs à tester:** 6 nouveaux + 7 existants = 13 total

---

## ✅ TESTS RAPIDES DES NOUVEAUX MCPs

### 1. Serena - Navigation code symbole par symbole

**Test:** Recherche de symboles dans le projet

```
Prompts à essayer:
- "Trouve le symbole useAuth dans le projet"
- "Montre-moi tous les endroits où supabaseClient est utilisé"
- "Liste les composants qui utilisent useState"
```

**Résultat attendu:** Liste des fichiers et lignes où ces symboles apparaissent

---

### 2. Memory (officiel) - Mémoire persistante

**Test:** Stocker et récupérer une information

```
Prompts à essayer:
- "Mémorise que le projet ACLEF Pédagogie utilise Next.js 15 et Supabase"
- "Rappelle-moi la stack technique du projet"
- "Quelles sont les fonctionnalités principales de l'app?"
```

**Résultat attendu:** Capacité à stocker des entités et relations, puis les récupérer

---

### 3. Memory Bank - Multi-projets fichiers locaux

**Test:** Stockage isolé par projet

```
Prompts à essayer:
- "Liste les projets en mémoire"
- "Stocke cette info pour le projet pedagogie: utilise syllabification Hyphenopoly"
- "Quelles infos as-tu sur le projet pedagogie?"
```

**Vérification:** Dossier `/mnt/c/Projet ACLEF/.memory-bank` créé avec sous-dossiers par projet

---

### 4. Filesystem - Opérations fichiers sécurisées

**Test:** Lecture/écriture dans `/data` et `/public`

```
Prompts à essayer:
- "Liste les fichiers dans /data"
- "Lis le fichier French top 10,000 words dans /data"
- "Crée un fichier test.txt dans /public/temp"
```

**Résultat attendu:** Accès uniquement aux dossiers autorisés, erreur si tentative d'accès ailleurs

---

### 5. Fetch - Récupération contenu web

**Test:** Télécharger et convertir HTML → Markdown

```
Prompts à essayer:
- "Récupère la documentation Next.js 15 depuis https://nextjs.org/docs"
- "Fetch le contenu de https://supabase.com/docs/guides/auth"
```

**Résultat attendu:** Contenu web converti en Markdown propre

---

### 6. Sequential-thinking (déjà installé)

**Test:** Raisonnement structuré

```
Prompts à essayer:
- "Analyse étape par étape comment ajouter un nouveau type d'exercice"
- "Décompose le problème: comment optimiser les requêtes Supabase?"
```

**Résultat attendu:** Réflexion structurée en étapes numérotées

---

## 📊 TESTS DES MCPs EXISTANTS

### 7. Supabase ✅ (déjà testé - fonctionne)

```
Commandes:
- Liste les tables: mcp__supabase__list_tables
- Vérifie les advisors de sécurité
```

### 8. GitHub ✅ (token corrigé - à tester)

```
Prompts:
- "Liste mes repositories GitHub"
- "Cherche les issues ouvertes sur projet-aclef-pedagogie"
```

### 9. Context7 (documentation à jour)

```
Prompts:
- "use context7: Comment utiliser Supabase Auth avec Next.js 15?"
- "use context7: Dernières features de React 19"
```

### 10. Playwright (automation browser)

```
Prompts:
- "Ouvre localhost:3000 et fais un screenshot"
- "Navigue vers la page de login et teste le formulaire"
```

### 11. Deepwiki (documentation repos)

```
Prompts:
- "Récupère la doc de vercel/next.js"
- "Fetch la documentation de supabase/supabase"
```

### 12. Vercel (déploiement)

```
Prompts:
- "Liste mes projets Vercel"
- "Montre les logs du dernier déploiement"
```

---

## 🔥 PROCHAINES INSTALLATIONS (Après tests)

### À installer si tests OK:

1. **PromptX** - Agents intelligents + Excel Tool
   - Nuwa: Créer expert pédagogique FLE
   - Luban: Intégrer APIs en 3 min
   - Excel: Analyser données apprenants

2. **Claude Context** - Recherche sémantique projet
   - Nécessite: Clé OpenAI + Compte Zilliz Cloud (gratuit)
   - Réduit coûts de 40%

3. **MCP-RAG** - Analyse PDF/images pédagogiques
   - OCR intégré
   - Parfait pour créer exercices depuis documents

4. **Memory Service** - UI web + triggers auto
   - Dashboard: http://127.0.0.1:8888
   - Upload PDF, documents

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Serena trouve des symboles dans le code
- [ ] Memory stocke et récupère des informations
- [ ] Memory Bank crée le dossier multi-projets
- [ ] Filesystem accède uniquement aux dossiers autorisés
- [ ] Fetch télécharge et convertit du contenu web
- [ ] Sequential-thinking structure le raisonnement
- [ ] Supabase liste les tables
- [ ] GitHub accède aux repos
- [ ] Context7 récupère de la documentation
- [ ] Playwright ouvre un navigateur
- [ ] Deepwiki fetch des docs de repos
- [ ] Vercel liste les projets

**Si tous les tests passent:** ✅ Configuration réussie!

**Si certains échouent:** ⚠️ Vérifier les logs et la configuration dans `.mcp.json`

---

## 🐛 DEBUGGING

### MCP ne répond pas?

1. Vérifier les logs Claude Code
2. Tester manuellement la commande:
   ```bash
   # Exemple pour Serena
   uvx --from git+https://github.com/oraios/serena serena start-mcp-server
   ```

3. Vérifier que les dépendances sont installées:
   ```bash
   uv --version  # doit afficher 0.9.7
   node --version  # doit afficher v20.19.5
   ```

### Variables d'environnement manquantes?

Vérifier dans `.mcp.json` (NON commité - local uniquement):
- `SUPABASE_ACCESS_TOKEN`
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `VERCEL_TOKEN`
- `MEMORY_BANK_ROOT`

---

**🚀 Bon tests!**
