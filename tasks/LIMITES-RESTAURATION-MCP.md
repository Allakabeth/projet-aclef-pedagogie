# 🚨 LIMITES TECHNIQUES - Restauration Automatique MCP

**Date :** 2025-10-19
**Contexte :** Tentative de restauration automatique du backup PRODUCTION vers projet TEST
**Projet source :** mkbchdhbgdynxwfhpxbw (PRODUCTION)
**Projet cible :** dlahoaccqzeuiqfxuelw (TEST)

---

## ❌ LIMITE #1 : Fichier database.sql trop volumineux

### Taille du fichier
```bash
$ ls -lh database.sql
-rwxrwxrwx 1 aclef aclef 1.4M Oct 19 14:52 database.sql

$ wc -l database.sql
17733 database.sql
```

### Pourquoi ça bloque

1. **GitHub API :** Ne retourne pas le contenu des fichiers > 1 MB
   ```
   Tentative : mcp__github__get_file_contents
   Résultat : "content": "", "encoding": "none"
   Raison : Fichier 1.4 MB > limite API 1 MB
   ```

2. **Read tool (local) :** Peut lire le fichier, mais limite de tokens
   ```
   Fichier : 17 733 lignes ≈ 100 000+ tokens
   Limite Read : Techniquement possible mais...
   ```

3. **execute_sql MCP :** Limite de taille de requête inconnue
   ```
   Même si je lis le fichier, exécuter 17 733 lignes en une fois
   via execute_sql va probablement timeout ou échouer
   ```

### Solution de contournement
✅ **Cloner le repo localement** (FAIT)
```bash
git clone https://github.com/Allakabeth/Sauvegarde-BDD.git
# ✅ Succès - repo cloné dans /mnt/c/Projet ACLEF/Sauvegarde-BDD
```

---

## ❌ LIMITE #2 : PostgreSQL client (psql) non installé

### État actuel
```bash
$ which psql
(vide - psql non trouvé)

$ find /usr -name psql
/usr/share/bash-completion/completions/psql
# Seulement fichier de complétion, pas le binaire
```

### Pourquoi ça bloque

```bash
$ sudo apt-get install postgresql-client
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
```

- Pas d'accès sudo dans l'environnement WSL actuel
- Impossible d'installer PostgreSQL client
- **psql est la méthode STANDARD et RECOMMANDÉE pour restaurer un dump**

### Pourquoi psql est nécessaire

Le fichier database.sql contient :
- Des commandes spécifiques PostgreSQL (`\restrict`, `SET`, etc.)
- Des créations de schémas multiples (auth, extensions, graphql, realtime, storage, vault...)
- Des ALTER SCHEMA avec OWNER
- Des CREATE EXTENSION
- Des fonctions PL/pgSQL complexes
- Des triggers
- Des RLS policies

**Ces commandes ne peuvent PAS être exécutées via `execute_sql` car :**
1. Certaines commandes nécessitent des privilèges superuser
2. Les commandes `\` sont spécifiques à psql (pas du SQL standard)
3. L'ordre d'exécution est critique (schémas → tables → données → contraintes)

---

## ❌ LIMITE #3 : Projet TEST non vide

### Découverte

D'après la vérification précédente (résumé de conversation) :
```
Projet TEST (dlahoaccqzeuiqfxuelw) :
- 50+ tables existantes
- Données déjà présentes
- Schémas Supabase déjà créés
```

### Pourquoi ça bloque

Le fichier database.sql commence par :
```sql
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE SCHEMA graphql;
CREATE SCHEMA realtime;
CREATE SCHEMA storage;
CREATE SCHEMA vault;
-- etc.
```

Si ces schémas existent déjà → **ERREUR : schema already exists**

### Solutions possibles

1. **Réinitialiser le projet TEST** via Supabase Dashboard
   - ⚠️ Supprime TOUTES les données existantes
   - ⚠️ Nécessite action manuelle dans le dashboard

2. **Créer un NOUVEAU projet TEST vide**
   - ✅ Projet complètement vierge
   - ✅ Pas de conflits de schémas

3. **Modifier database.sql pour ignorer erreurs**
   - ❌ Complexe et risqué
   - ❌ Peut créer des incohérences

---

## ❌ LIMITE #4 : auth_users.sql - Limite de tokens MCP

### Taille du fichier
```bash
$ ls -lh auth_users.sql
-rwxrwxrwx 1 aclef aclef 306K Oct 19 14:52 auth_users.sql
```

### Pourquoi ça bloque (d'après résumé)

```
Fichier auth_users.sql : 171 417 tokens
Limite MCP Read : 25 000 tokens
Dépassement : 6.8x la limite
```

**Impossible de lire le fichier via GitHub API ou MCP Read.**

---

## ✅ SOLUTIONS POSSIBLES

### Solution 1 : Restauration manuelle avec psql (RECOMMANDÉE)

**Prérequis :**
1. Installer PostgreSQL client sur la machine locale
2. Avoir un projet Supabase TEST vide (ou réinitialisé)

**Commandes :**
```bash
# 1. Définir l'URL du projet TEST
export TEST_DB_URL="postgresql://postgres.dlahoaccqzeuiqfxuelw:YOUR_PASSWORD_HERE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"

# 2. Naviguer vers le backup
cd /mnt/c/Projet\ ACLEF/Sauvegarde-BDD/backups/20251019_123633

# 3. Restaurer database complet
psql $TEST_DB_URL < database.sql

# 4. Restaurer auth users
psql $TEST_DB_URL < auth_users.sql

# 5. Vérifier
psql $TEST_DB_URL -c "SELECT COUNT(*) FROM users;"
```

**Temps estimé :** 5-10 minutes
**Fiabilité :** ✅ 100% - Méthode standard PostgreSQL

---

### Solution 2 : Installation de PostgreSQL client

**Option A : Via apt (nécessite sudo)**
```bash
sudo apt-get update
sudo apt-get install -y postgresql-client
```

**Option B : Via Homebrew (si disponible)**
```bash
brew install postgresql@17
```

**Option C : Binaire statique (sans sudo)**
```bash
# Télécharger binaire précompilé PostgreSQL 17
wget https://get.enterprisedb.com/postgresql/postgresql-17.x-linux-x64-binaries.tar.gz
tar -xzf postgresql-17.x-linux-x64-binaries.tar.gz
export PATH=$PWD/pgsql/bin:$PATH
psql --version
```

---

### Solution 3 : Exécution par morceaux (NON RECOMMANDÉE)

**Théoriquement possible mais :**
- ❌ Complexe : Nécessite de découper database.sql en sections
- ❌ Risqué : Ordre d'exécution critique (schémas → tables → contraintes)
- ❌ Chronophage : Nécessite parsing manuel du SQL
- ❌ Fragile : Une erreur peut corrompre la base

**Je NE recommande PAS cette approche.**

---

## 📊 RÉSUMÉ DES LIMITES

| Limite | Technique | Impact | Contournement |
|--------|-----------|--------|---------------|
| Fichier > 1 MB | GitHub API | ❌ Bloquant | ✅ Clone local |
| Fichier > 25K tokens | MCP Read | ❌ Bloquant | ✅ Clone local |
| psql non installé | Environnement WSL | ❌ Bloquant | ⚠️ Installation manuelle |
| Projet TEST non vide | Supabase | ⚠️ Conflits | ⚠️ Réinitialiser projet |
| Commandes superuser | execute_sql | ❌ Privilèges | ✅ Utiliser psql |

---

## 🎯 RECOMMANDATION FINALE

**La restauration automatique via MCP n'est PAS POSSIBLE** pour les raisons techniques documentées ci-dessus.

**ACTION REQUISE :**

1. **Installer PostgreSQL client** sur la machine WSL
2. **Réinitialiser le projet TEST** (ou créer nouveau projet vide)
3. **Exécuter la restauration manuellement** via psql

**Commandes complètes :**

```bash
# Installation PostgreSQL client (nécessite sudo ou alternative)
sudo apt-get install -y postgresql-client

# Ou alternative sans sudo :
wget https://ftp.postgresql.org/pub/source/v17.0/postgresql-17.0.tar.gz
# ... compilation manuelle

# Restauration
cd /mnt/c/Projet\ ACLEF/Sauvegarde-BDD/backups/20251019_123633
export TEST_DB_URL="postgresql://postgres.dlahoaccqzeuiqfxuelw:YOUR_PASSWORD_HERE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
psql $TEST_DB_URL < database.sql
psql $TEST_DB_URL < auth_users.sql
```

---

## ✅ CE QUI A FONCTIONNÉ

1. ✅ **Clone du repo** : Backup accessible localement
2. ✅ **Lecture RESTORE.md** : Instructions claires
3. ✅ **Analyse de database.sql** : Structure comprise (17 733 lignes)
4. ✅ **Identification des limites** : Documenté précisément

---

## ❌ CE QUI N'A PAS FONCTIONNÉ

1. ❌ **Lecture via GitHub API** : Fichiers > 1 MB
2. ❌ **Lecture auth_users.sql** : > 171K tokens
3. ❌ **Installation psql** : Pas d'accès sudo
4. ❌ **Restauration automatique MCP** : Multiples limites techniques

---

**Conclusion :** La restauration nécessite une intervention manuelle avec psql. Les outils MCP sont insuffisants pour gérer des dumps PostgreSQL complets de cette taille.
