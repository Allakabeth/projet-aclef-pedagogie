# CLAUDE2.md - Informations Consolidées des Notes de Développement

**Date de consolidation :** 2025-10-26
**Source :** Fichiers du dossier `/tasks/` (17 fichiers analysés)

---

## 🚨 SÉCURITÉ - ACTION REQUISE

### Problème d'Authentification Admin

**État :** Problème critique identifié (TODO-SECURITE-ADMIN.md)

**Symptôme :**
12+ pages admin ont l'authentification DÉSACTIVÉE avec `USE_AUTH_CHECKS = false`

**Pages concernées :**
- `/admin/lire/valider-corrections.js`
- `/admin/lire/signalements-syllabification.js`
- `/admin/lire/visualiser-donnees-apprenant.js`
- `/admin/lire/vue-donnees-apprenant.js`
- `/admin/code-route/vocabulaire/index.js`
- `/admin/code-route/vocabulaire/[categorie].js`
- `/admin/quizz/nouveau.js`
- `/admin/quizz/gestion.js`
- Et autres...

**Action à faire :**
```javascript
// Changer dans chaque fichier concerné :
const USE_AUTH_CHECKS = false  // ❌ ACTUEL
// En :
const USE_AUTH_CHECKS = true   // ✅ CORRECT
```

**Raison de la désactivation :** Développement/debug temporaire
**Impact :** N'importe qui peut accéder aux pages admin sans authentification

---

## 🎓 MODULE FORMATION - État d'Avancement

### Phase 1 : Positionnement ✅ COMPLÈTE

**Statut :** Production-ready (phase1-complete-resume.md)

**Fonctionnalités :**
- ✅ 79 compétences préchargées en BDD
- ✅ 3 domaines : 📖 Lecture (35), ✍️ Écriture (20), 🔢 Mathématiques (24)
- ✅ 4 niveaux d'évaluation : Non acquis, En cours, Acquis, Expert
- ✅ 6 APIs backend fonctionnelles
- ✅ 4 composants React réutilisables
- ✅ 4 pages admin complètes

**Structure des données :**
```
formation_domaines (3 entrées)
├── formation_categories_competences (12 entrées)
    └── formation_competences (79 entrées)

formation_positionnements
└── formation_evaluations_positionnement
```

**Workflow :**
```
1. Admin crée positionnement
2. Sélectionne apprenant
3. Évalue compétences domaine par domaine
4. Sauvegarde régulièrement
5. Change statut en "Validé"
```

### Phase 2 : Plans de Formation ⚙️ 70% COMPLÉTÉ

**Statut :** APIs prêtes, pages UI manquantes (phase2-etat-avancement.md)

**Ce qui est fait :**
- ✅ 4 APIs backend (GET, POST, PUT, DELETE)
- ✅ API génération automatique depuis positionnement
- ✅ 3 composants React (PlanGenerator, CompetenceSelector, PlanSummary)
- ✅ Logique d'analyse : sélectionne "non_acquis" + "en_cours"

**Ce qui manque :**
- ❌ Page liste des plans (`/admin/formation/plans/index.js`)
- ❌ Page nouveau plan (`/admin/formation/plans/nouveau.js`)
- ❌ Page détail plan (`/admin/formation/plans/[id].js`)

**Durée estimée :** 2-3 heures pour finaliser les 3 pages UI

**Priorités assignées automatiquement :**
- Haute : compétences "non_acquis"
- Moyenne : compétences "en_cours"

### Phases 3-5 : À Venir

**Phase 3 - Attribution Exercices** (5-7 jours)
- Lier exercices modules existants (Quiz, Lire, Code Route)
- Attribuer exercices à un apprenant pour une compétence

**Phase 4 - Suivi** (1 semaine)
- Dashboard suivi global
- Suivi individuel par apprenant
- Visualisation résultats exercices

**Phase 5 - Bilans** (5-7 jours)
- Génération bilans PDF (lecture seule)
- Génération bilans Word (modifiable)
- Synthèse compétences acquises/en cours

---

## 🔌 MCP (Model Context Protocol)

### Configuration Actuelle

**Fichier :** `/mnt/c/Projet ACLEF/projet aclef pedagogie/mcp.json`

**⚠️ IMPORTANT :** Ce fichier est dans `.gitignore` car il contient des tokens secrets

**Serveurs MCP configurés :**

1. **Supabase MCP** ✅ FONCTIONNEL
   - Command : `npx -y @supabase/mcp-server-supabase@latest`
   - Project : mkbchdhbgdynxwfhpxbw
   - Token : sbp_0a6db35105a956290b3f3d2aca90c644b4f2c9e6
   - Capacités : Liste tables, describe colonnes, SELECT données

2. **GitHub MCP** ❌ NON FONCTIONNEL EN WSL
   - Raison : Nécessite OAuth qui ne fonctionne pas dans WSL
   - Alternative : Utiliser `gh` CLI, WebFetch, ou interface web

### Permissions Claude Code

**Lecture automatique (sans permission) :**
- `mcp__supabase:list_*`
- `mcp__supabase:get_*`
- `mcp__supabase:describe_*`
- `mcp__supabase:select_*`

**Modification (avec autorisation) :**
- `mcp__supabase:create_*`
- `mcp__supabase:alter_*`
- `mcp__supabase:insert_*`
- `mcp__supabase:update_*`
- `mcp__supabase:delete_*`

### Diagnostic de Problèmes

**Si MCP ne démarre pas :**
1. Vérifier que `mcp.json` existe à la racine du projet
2. Vérifier `.claude/settings.local.json` :
   ```json
   "enableAllProjectMcpServers": true
   ```
3. Vérifier les logs : `~/.claude/debug/latest`
4. Redémarrer Claude Code COMPLÈTEMENT (pas juste fermer la fenêtre)

**Test de fonctionnement :**
```
Demande : "Liste-moi toutes les tables de ma base Supabase"
Résultat attendu : Claude répond SANS demander permission
```

---

## 🗄️ BASE DE DONNÉES SUPABASE

### Vue d'Ensemble

**Projet Production :** mkbchdhbgdynxwfhpxbw
- 50 tables
- ~4 880 lignes totales
- Partagé entre `projet-aclef-planning-v8` et `projet-aclef-pédagogie`

**⚠️ ATTENTION :** Modifications de schéma impactent les DEUX projets !

### Table Centrale : `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    identifiant VARCHAR(100),
    password_hash TEXT,
    role VARCHAR(20), -- 'admin', 'salarié', 'formateur', 'apprenant'
    custom_password BOOLEAN DEFAULT FALSE,
    archive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Problème Identifié : Types Mixtes

**Incohérence détectée :**
- Table `users` : `id` est **UUID**
- Anciennes tables module Lire : `apprenant_id` est **INTEGER** ⚠️
- Nouvelles tables (Quiz, Code Route) : `user_id` est **UUID** ✅

**Solution :** Ne PAS toucher aux anciennes tables (risque de casser le module Lire)

### Conventions pour Nouvelles Tables

**Type ID :** UUID (comme Quiz)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Type Timestamps :** Format complet
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
```

**Type user_id :** UUID (référence vers `users.id`)
```sql
apprenant_id UUID REFERENCES users(id)
formateur_id UUID REFERENCES users(id)
```

**Préfixe obligatoire :** `formation_` pour éviter conflits
```sql
-- ✅ BON
formation_positionnements
formation_plans
formation_competences

-- ❌ ÉVITER (trop générique)
positionnements
plans
```

### Tables par Module

**Module Lire (7 tables) :**
- `textes_references`
- `groupes_sens`
- `mots_classifies`
- `mots_extraits`
- `syllabes_mots`
- `syllabes`
- `corrections_syllabification`

**Module Quiz (4 tables) :**
- `quiz_categories`
- `quiz`
- `quiz_sessions`
- `quiz_assignments`

**Module Code Route (3 tables) :**
- `vocabulaire_code_route`
- `definitions_personnalisees_code_route`
- `progression_vocabulaire_code_route`

**Module Formation (11 tables) :**
- Préfixe : `formation_*`
- Voir CLAUDE.md pour détails complets

---

## 💾 SAUVEGARDE & RESTAURATION BDD

### Limites Techniques MCP

**Rapport :** LIMITES-RESTAURATION-MCP.md

**Conclusion :** La restauration automatique via MCP est **IMPOSSIBLE**

**Raisons :**

1. **Fichier database.sql trop volumineux**
   - Taille : 1.4 MB (17 733 lignes)
   - GitHub API : limite 1 MB
   - MCP Read : limite ~25 000 tokens

2. **PostgreSQL client (psql) non installé**
   - Commande `sudo apt-get install postgresql-client` échoue
   - Pas d'accès sudo dans environnement WSL actuel
   - psql est la méthode STANDARD pour restaurer un dump

3. **Projet TEST non vide**
   - Schémas Supabase déjà créés
   - Erreur "schema already exists" si on tente de restaurer

### Solution Manuelle Recommandée

**Commandes complètes :**
```bash
# Installation PostgreSQL client (nécessite sudo)
sudo apt-get install -y postgresql-client

# Restauration
cd /mnt/c/Projet\ ACLEF/Sauvegarde-BDD/backups/20251019_123633
export TEST_DB_URL="postgresql://postgres.dlahoaccqzeuiqfxuelw:YOUR_PASSWORD_HERE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
psql $TEST_DB_URL < database.sql
psql $TEST_DB_URL < auth_users.sql
```

**Backup disponible :** `20251019_123633`
- Date : 2025-10-19 12:36:33 UTC
- Fichiers : database.sql (1.4 MB), auth_users.sql (306 KB)

### Comparaison BDD Production vs Test

**Rapport :** RAPPORT-COMPARAISON-BDD.md

**Production (mkbchdhbgdynxwfhpxbw) :** ✅ Analysée
- 50 tables
- ~4 880 lignes totales
- Utilisateurs : 88
- Syllabes : 1 364
- Messages : 264

**TEST (dlahoaccqzeuiqfxuelw) :** ⚠️ État inconnu
- Comparaison détaillée à effectuer après restauration

---

## 🎙️ ENREGISTREMENT VOCAL

**Plan technique :** PLAN-ENREGISTREMENT-VOCAL.md

### API Envisagée : ElevenLabs

**Token configuré :** `.env.local`
```bash
NEXT_PUBLIC_ELEVENLABS_API_KEY=038249ac29c4e8dcb19172d0b8933303184c6814c025a4037e8b365910408219
```

**Capacités :**
- Génération voix réalistes
- Clonage de voix
- Multilangue

### Architecture Proposée

**1. Bucket Supabase Storage**
```sql
-- Créer bucket "enregistrements-apprenants"
-- Public : false (accès authentifié uniquement)
-- File size limit : 50 MB
```

**2. Table de métadonnées**
```sql
CREATE TABLE enregistrements_mots (
    id UUID PRIMARY KEY,
    apprenant_id UUID REFERENCES users(id),
    mot VARCHAR(100),
    audio_url TEXT, -- Chemin Supabase Storage
    duree_ms INTEGER,
    created_at TIMESTAMP
);
```

**3. API d'upload**
```javascript
// pages/api/upload-audio.js
// POST avec FormData (fichier audio)
// Stockage dans Supabase Storage
// Retour URL publique signée
```

**État actuel :** Plan technique prêt, implémentation à faire

**Instructions bucket :** INSTRUCTIONS-BUCKET-STORAGE.md
- Créer via Dashboard Supabase
- Configurer politiques RLS

---

## 🏗️ ARCHITECTURE ADMIN

**Analyse complète :** analyse-admin.md

### Structure Globale

**22 fichiers pages admin :**
- `/admin/index.js` - Hub central (596 lignes)
- 8 modules : Formation, Lire, Écrire, Compter, Code Route, Quiz, FLE, Imagiers

**14 endpoints API :**
- `/api/admin/code-route/` (3 fichiers)
- `/api/admin/lire/` (9 fichiers)
- `/api/admin/` (2 utilitaires)

### Problèmes Identifiés

**1. Fichiers volumineux ⚠️**
- `vocabulaire/index.js` : 20 709 lignes
- `vocabulaire/[categorie].js` : 26 497 lignes
- `api/code-route/vocabulaire.js` : 7 145 lignes

**Impact :** Maintenance difficile, performances IDE

**Recommandation :** Refactoriser en composants réutilisables

**2. Duplication de code**
- Authentification répétée dans chaque page
- Design de boutons dupliqué
- Grilles responsive dupliquées

**Solution :** Créer HOC `withAdminAuth` et composants UI partagés

**3. Routes fantômes**
- `/admin/quizz/categories` (référencé mais inexistant)
- `/admin/quizz/statistiques` (référencé mais inexistant)
- `/admin/quizz/import-export` (référencé mais inexistant)

**Action :** Créer pages manquantes ou retirer liens

### Authentification Admin

**Mécanisme :** localStorage (côté client)

**Tokens :**
- `quiz-admin-token` - Token d'authentification
- `quiz-admin-user` - Données utilisateur (JSON)

**Rôles autorisés :**
- `admin` - Accès complet ✅
- `salarié` - Équivalent admin ✅
- `apprenant` - Bloqué ❌

**Pattern standard :**
```javascript
useEffect(() => {
    const token = localStorage.getItem('quiz-admin-token')
    const userData = localStorage.getItem('quiz-admin-user')

    if (!token || !userData) {
        router.push('/aclef-pedagogie-admin')
        return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'admin' && user.role !== 'salarié') {
        alert('Accès refusé')
        router.push('/aclef-pedagogie-admin')
        return
    }
}, [router])
```

### Palette de Couleurs

| Module | Couleur | Code Hex |
|--------|---------|----------|
| Formation | Rouge | #ef4444 |
| Lire | Bleu | #3b82f6 |
| Écrire | Violet | #8b5cf6 |
| Compter | Orange | #f59e0b |
| Code Route | Rouge foncé | #dc2626 |
| Quiz | Vert | #059669 |
| FLE | Cyan | #0891b2 |
| Imagiers | Rose | #be185d |

---

## 📝 TODO CONSOLIDÉ

### Priorité 1 (Critique)

1. **Réactiver authentification admin**
   - Changer `USE_AUTH_CHECKS = false` → `true` dans 12+ pages
   - Tester chaque page après modification

2. **Finaliser Phase 2 Formation**
   - Créer 3 pages manquantes (liste, nouveau, détail)
   - Durée estimée : 2-3 heures

3. **Refactoriser fichiers volumineux Code Route**
   - Diviser `vocabulaire/index.js` (20k lignes)
   - Diviser `vocabulaire/[categorie].js` (26k lignes)

### Priorité 2 (Importante)

4. **Créer composants réutilisables**
   - `AdminButton`, `AdminCard`, `AdminGrid`
   - HOC `withAdminAuth`

5. **Compléter routes manquantes Quiz**
   - `/admin/quizz/categories`
   - `/admin/quizz/statistiques`
   - `/admin/quizz/import-export`

6. **Documentation développeur**
   - README par module
   - Documentation API

### Priorité 3 (Nice to have)

7. **Migration TypeScript** (progressivement)

8. **Tests automatisés** (unitaires + intégration)

9. **Optimisation performances** (code splitting, lazy loading)

---

## 🔐 TOKENS & SECRETS

**Fichier :** `.env.local` (dans .gitignore)

**Tokens configurés :**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mkbchdhbgdynxwfhpxbw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT
JWT_SECRET=aclef-formateur-secret-2024-change-me-in-production
JWT_REFRESH_SECRET=aclef-refresh-secret-2024-change-me-in-production

# Google AI
GOOGLE_AI_API_KEY=[REDACTED]
GEMINI_API_KEY=[REDACTED]

# Grok
GROK_API_KEY=[REDACTED]

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_API_KEY=[REDACTED]

# MCP Tokens
GITHUB_TOKEN=[REDACTED]
SUPABASE_ACCESS_TOKEN=[REDACTED]
```

**⚠️ SÉCURITÉ :** Ces tokens ont été exposés dans le chat Claude. Après validation du fonctionnement, RÉVOQUER et RÉGÉNÉRER tous les tokens.

---

## 🎯 WORKFLOW COMPLET MODULE FORMATION

### Phase 1 : Positionnement (PRODUCTION)

```
1. Admin → /admin/formation/positionnements/nouveau
2. Sélection apprenant
3. Date + commentaires généraux
4. CRÉER → Redirigé vers détail
5. Évaluation compétences par domaine (Lecture, Écriture, Maths)
6. Sauvegarde régulière (positionnement + évaluations)
7. Statut "Validé" quand terminé
```

### Phase 2 : Plans (70% COMPLÉTÉ)

```
1. Admin → /admin/formation/plans/nouveau
2. Option A : Générer depuis positionnement (automatique)
   - Sélectionner positionnement validé
   - Prévisualisation (X compétences, priorités)
   - GÉNÉRER
3. Option B : Création manuelle
   - Sélectionner apprenant
   - Ajouter compétences manuellement
4. Modifier priorités/objectifs dans détail du plan
5. Activer le plan
```

### Phase 3-5 : À Développer

**Phase 3 - Attribution Exercices :**
- Lier exercices modules existants (Quiz, Lire, Code Route)
- Attribuer à apprenant pour une compétence

**Phase 4 - Suivi :**
- Dashboard suivi global
- Suivi individuel
- Visualisation résultats

**Phase 5 - Bilans :**
- Génération PDF/Word
- Synthèse compétences
- Recommandations

---

## 📚 RÉFÉRENCES

**Fichiers sources analysés (17 fichiers) :**
- todo.md
- TODO-SECURITE-ADMIN.md
- README-FORMATION.md
- PLAN-ENREGISTREMENT-VOCAL.md
- INSTRUCTIONS-BUCKET-STORAGE.md
- HANDOFF-CLAUDE-DESKTOP.md
- LIMITES-RESTAURATION-MCP.md
- RAPPORT-COMPARAISON-BDD.md
- mcp-diagnostic.md
- mcp-setup-guide.md
- mcp-wsl-setup-final.md
- phase1-complete-resume.md
- phase2-etat-avancement.md
- plan-formation-detaille.md
- todo-phase2.md
- analyse-admin.md
- analyse-bdd-existante.md

**Fichier principal de référence :**
- `/mnt/c/Projet ACLEF/projet aclef pedagogie/CLAUDE.md`

---

**Note finale :** Ce document consolide les informations les plus importantes des notes de développement. Pour des détails complets, consulter CLAUDE.md et les fichiers sources dans `/tasks/`.
