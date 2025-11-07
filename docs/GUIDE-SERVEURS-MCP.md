# 📖 Guide d'Utilisation - Serveurs MCP
**Projet ACLEF Pédagogie** | Mis à jour : 2025-11-05

---

## 🎯 Qu'est-ce qu'un Serveur MCP ?

Les serveurs MCP (Model Context Protocol) sont des outils spécialisés que Claude peut utiliser pour t'aider dans des tâches spécifiques. Pense à eux comme des **assistants experts** dans différents domaines.

**Tu as actuellement 10 serveurs connectés et opérationnels.**

---

## 📊 Tes Serveurs MCP (10/14)

### 🗄️ 1. SUPABASE (Base de données)
**Ce qu'il fait :** Accès direct à ta base de données Supabase
**Quand l'utiliser :**
- Lire les données de ta BDD (apprenants, textes, syllabes...)
- Créer/modifier des tables
- Appliquer des migrations
- Déboguer des problèmes de données

**Exemples concrets :**
```
Toi : "Montre-moi tous les apprenants actifs"
Toi : "Combien de textes références existent ?"
Toi : "Crée une nouvelle table pour les statistiques"
Toi : "Affiche les 10 derniers signalements de syllabification"
```

**Limites :**
- En mode read-only sur le toolkit
- Accès complet sur le serveur principal

---

### 🐙 2. GITHUB (Gestion de code)
**Ce qu'il fait :** Interaction avec GitHub (repos, issues, PRs, commits)
**Quand l'utiliser :**
- Voir l'historique des commits
- Créer/lire des issues
- Gérer les Pull Requests
- Chercher du code dans d'autres repos

**Exemples concrets :**
```
Toi : "Montre-moi les 5 derniers commits"
Toi : "Crée une issue pour le bug de syllabification"
Toi : "Recherche des exemples de quiz Next.js sur GitHub"
Toi : "Liste les branches du projet"
```

---

### 🧠 3. SERENA (Assistant code sémantique)
**Ce qu'il fait :** Analyse intelligente de ton code (structure, symboles, relations)
**Quand l'utiliser :**
- Comprendre l'architecture du projet
- Trouver où est définie une fonction
- Voir toutes les références d'une classe
- Naviguer dans un gros projet

**Exemples concrets :**
```
Toi : "Trouve la fonction de syllabification principale"
Toi : "Où est utilisé le composant AudioButton ?"
Toi : "Montre-moi la structure du dossier pages/lire"
Toi : "Liste tous les fichiers API du projet"
```

**Super pouvoir :** Comprend la sémantique du code (pas juste du texte brut)

---

### 💾 4. MEMORY (Mémoire contextuelle)
**Ce qu'il fait :** Stocke des informations pendant notre conversation
**Quand l'utiliser :**
- Se souvenir de décisions prises
- Garder en tête des infos importantes
- Créer un contexte qui dure

**Exemples concrets :**
```
Toi : "Souviens-toi que le mot de passe admin est changé"
Toi : "Note que le module quiz utilise Gemini AI"
Toi : "Rappelle-toi de ne jamais modifier mes-syllabes.js"
```

**Différence avec Memory-Bank :**
- Memory = temporaire (cette conversation)
- Memory-Bank = permanent (toutes les conversations)

---

### 🏦 5. MEMORY-BANK (Banque de mémoire permanente)
**Ce qu'il fait :** Stocke des documents de référence par projet
**Quand l'utiliser :**
- Documenter l'architecture
- Sauvegarder des procédures
- Créer des notes techniques persistantes
- Garder un historique des bugs résolus

**Exemples concrets :**
```
Toi : "Crée un doc sur le système de corrections centralisées"
Toi : "Documente la procédure de déploiement Vercel"
Toi : "Sauvegarde les règles de sécurité Supabase RLS"
Toi : "Note les bugs connus du module imagiers"
```

**Projets actuels :**
- `projet-aclef-pedagogie` (ce projet)

**Fichiers existants :**
- `test-memory-bank.md` (test de connexion)
- `guide-serveurs-mcp.md` (ce guide)

---

### 🤔 6. SEQUENTIAL-THINKING (Pensée séquentielle)
**Ce qu'il fait :** Décompose des problèmes complexes étape par étape
**Quand l'utiliser :**
- Résoudre un bug difficile
- Planifier une grosse feature
- Analyser un problème complexe
- Prendre une décision architecturale

**Exemples concrets :**
```
Toi : "Aide-moi à déboguer pourquoi les syllabes ne s'affichent pas"
Toi : "Planifie l'ajout d'un système de statistiques"
Toi : "Analyse pourquoi l'API est lente"
```

**Super pouvoir :** Raisonnement structuré et méthodique

---

### 📚 7. DEEPWIKI (Documentation technique)
**Ce qu'il fait :** Accède à de la documentation technique en profondeur
**Quand l'utiliser :**
- Chercher comment utiliser une librairie
- Comprendre un concept technique
- Trouver des exemples de code

**Exemples concrets :**
```
Toi : "Comment utiliser hyphenopoly pour la syllabification ?"
Toi : "Montre-moi des exemples Next.js API routes"
Toi : "Doc sur les tokens JWT et refresh"
```

---

### 🎭 8. PLAYWRIGHT (Automation navigateur)
**Ce qu'il fait :** Contrôle automatique d'un navigateur web
**Quand l'utiliser :**
- Tester l'interface utilisateur
- Automatiser des actions répétitives
- Capturer des screenshots
- Vérifier le comportement de l'app

**Exemples concrets :**
```
Toi : "Teste le login d'un apprenant"
Toi : "Capture un screenshot du dashboard admin"
Toi : "Vérifie que le module quiz charge correctement"
Toi : "Simule le parcours complet d'un apprenant"
```

---

### 🎨 9. PROMPTX (Gestionnaire de prompts)
**Ce qu'il fait :** Gestion avancée des prompts et templates
**Quand l'utiliser :**
- Créer des workflows répétitifs
- Gérer des templates de prompts
- Automatiser des tâches courantes

**Exemples concrets :**
```
Toi : "Crée un template pour documenter une nouvelle API"
Toi : "Sauvegarde ce workflow de debug"
```

---

### 🔧 10. SUPABASE-TOOLKIT (Plugin Supabase)
**Ce qu'il fait :** Version read-only du serveur Supabase principal
**Quand l'utiliser :**
- Lecture sécurisée de la BDD
- Requêtes sans risque de modification

**Note :** Utilise plutôt le serveur Supabase principal (#1) qui a plus de droits.

---

## 🚫 Serveurs NON Connectés (4/14)

### ❌ PostgreSQL & MySQL
**Raison :** Pas nécessaires (on utilise déjà Supabase)

### ❌ Context7
**Raison :** Nécessite une clé API Upstash (service payant)

### ❌ Vercel
**Raison :** Nécessite un token VERCEL (déjà géré manuellement)

---

## 💡 Workflows Types

### 🐛 Déboguer un Problème
1. **Sequential-Thinking** → Analyser le problème
2. **Serena** → Trouver le code concerné
3. **Supabase** → Vérifier les données
4. **Memory-Bank** → Documenter la solution

### 🏗️ Ajouter une Feature
1. **Sequential-Thinking** → Planifier
2. **Serena** → Comprendre l'existant
3. **Deepwiki** → Chercher des exemples
4. **GitHub** → Créer une issue
5. **Memory-Bank** → Documenter

### 🔍 Comprendre le Code
1. **Serena** → Explorer la structure
2. **GitHub** → Voir l'historique
3. **Memory** → Noter les découvertes

### 📊 Analyser les Données
1. **Supabase** → Requêter la BDD
2. **Memory-Bank** → Sauvegarder les insights

### 🧪 Tester l'Application
1. **Playwright** → Automatiser les tests
2. **Supabase** → Vérifier l'état de la BDD
3. **Memory-Bank** → Documenter les résultats

---

## 🎯 Commandes Rapides

### Supabase
```
"Liste toutes les tables"
"Compte les apprenants actifs"
"Affiche le schéma de la table textes_references"
"Montre les 10 dernières corrections"
```

### GitHub
```
"Liste les commits d'aujourd'hui"
"Crée une issue : [titre]"
"Montre les branches"
"Recherche [mot-clé] dans le repo"
```

### Serena
```
"Trouve la fonction [nom]"
"Où est utilisé [composant] ?"
"Liste les fichiers dans [dossier]"
"Montre la structure du projet"
```

### Memory-Bank
```
"Crée un doc sur [sujet]"
"Lis le fichier [nom]"
"Liste tous les docs du projet"
"Mets à jour [fichier] avec [info]"
```

### Playwright
```
"Ouvre l'app et va sur /dashboard"
"Capture un screenshot de [page]"
"Teste le login avec [identifiant]"
"Vérifie que [élément] s'affiche"
```

---

## ⚡ Astuces Pro

### 1. Combine les Serveurs
```
"Utilise Serena pour trouver le code de syllabification,
puis Supabase pour voir les données,
puis Memory-Bank pour documenter"
```

### 2. Sois Précis
❌ Mauvais : "Regarde la base de données"
✅ Bon : "Montre-moi les 10 derniers signalements de syllabification triés par date"

### 3. Utilise Memory-Bank pour Documenter
Chaque fois qu'on résout un problème important, demande :
```
"Documente cette solution dans Memory-Bank"
```

### 4. Teste avec Playwright
Avant de déployer :
```
"Teste le parcours complet d'un apprenant avec Playwright"
```

---

## 📞 Comment Demander de l'Aide

**Format recommandé :**
```
[Serveur] + [Action] + [Détails]

Exemples :
"Supabase : affiche tous les apprenants ayant plus de 5 textes"
"Serena : trouve où est définie la fonction syllabify"
"Memory-Bank : crée un doc sur les bugs connus du module quiz"
```

---

## 🚀 Tu es maintenant prêt à utiliser tes serveurs MCP !

**N'hésite pas à demander :**
- "Utilise [serveur] pour [action]"
- "Combine [serveur1] et [serveur2] pour [objectif]"
- "Documente [chose] dans Memory-Bank"

**Rappel des règles :**
- Ne jamais modifier le code sans permission
- Toujours demander avant de refactorer
- Documenter les solutions importantes dans Memory-Bank
- Tester avec Playwright avant déploiement

---

*Guide créé le 2025-11-05 | Projet ACLEF Pédagogie*
