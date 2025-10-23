# 🔄 Application de Restauration Supabase

Application graphique Python pour restaurer les backups Supabase depuis GitHub.

## 📦 Fichiers Créés

- `restore_supabase_gui.py` - Application principale avec interface tkinter
- `requirements.txt` - Liste des dépendances Python
- `restore_config.json` - Configuration (créé automatiquement au premier lancement)

## ⚠️ Prérequis Système

### Option A : Installation sous Windows (RECOMMANDÉE)

Si vous êtes sous Windows avec WSL, il est **fortement recommandé** d'installer Python et les dépendances directement sous Windows plutôt que dans WSL, car tkinter nécessite un serveur X sous WSL.

1. **Installer Python sous Windows** :
   - Télécharger Python 3.12+ depuis https://www.python.org/downloads/
   - ✅ **IMPORTANT** : Cocher "Add Python to PATH" pendant l'installation
   - ✅ **IMPORTANT** : Cocher "Install tkinter" (inclus par défaut)

2. **Ouvrir PowerShell ou CMD Windows** (pas WSL) :
   ```powershell
   cd "C:\Projet ACLEF\projet aclef pedagogie"
   ```

3. **Installer les dépendances** :
   ```powershell
   pip install -r requirements.txt
   ```

4. **Lancer l'application** :
   ```powershell
   python restore_supabase_gui.py
   ```

### Option B : Installation sous WSL (Complexe)

Si vous voulez vraiment utiliser WSL, vous devez installer un serveur X :

1. **Installer un serveur X sous Windows** :
   - Télécharger VcXsrv : https://sourceforge.net/projects/vcxsrv/
   - Lancer XLaunch et configurer en mode "Multiple windows"

2. **Installer Python avec tkinter dans WSL** :
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-pip python3-tk
   ```

3. **Configurer DISPLAY** :
   ```bash
   export DISPLAY=:0
   ```

4. **Installer les dépendances** :
   ```bash
   cd "/mnt/c/Projet ACLEF/projet aclef pedagogie"
   pip3 install -r requirements.txt
   ```

5. **Lancer l'application** :
   ```bash
   python3 restore_supabase_gui.py
   ```

### Option C : Installation sous Linux (Simple)

```bash
# Installer tkinter
sudo apt-get install python3-tk

# Installer pip si nécessaire
sudo apt-get install python3-pip

# Installer les dépendances
pip3 install -r requirements.txt

# Lancer l'application
python3 restore_supabase_gui.py
```

## 🚀 Utilisation de l'Application

### 1. Configuration Initiale

Au premier lancement :

1. **GitHub Token (optionnel)** :
   - Pour les repos publics : laisser vide
   - Pour les repos privés : créer un token sur https://github.com/settings/tokens
   - Permissions requises : `repo` (accès complet)

2. **URL Supabase** :
   - Format : `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:5432/postgres`
   - Exemple : `postgresql://postgres.dlahoaccqzeuiqfxuelw:motdepasse@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`
   - **⚠️ IMPORTANT** : Utiliser le **Session Pooler** (port 5432) et non la connexion directe (port 6543)

3. **Enregistrer la configuration** :
   - Cliquer sur "💾 Enregistrer Config"
   - La configuration est sauvegardée dans `restore_config.json`

### 2. Charger les Backups

1. Cliquer sur "🔍 Charger les backups depuis GitHub"
2. L'application liste tous les backups disponibles
3. Format affiché : `YYYYMMDD_HHMMSS  (DD/MM/YYYY HH:MM:SS)`

### 3. Restaurer un Backup

1. **Sélectionner un backup** dans la liste
2. **Cliquer sur "🚀 RESTAURER"**
3. **Confirmer** l'opération (⚠️ ÉCRASE les données existantes)
4. **Suivre la progression** dans le journal :
   - Téléchargement de `database.sql`
   - Téléchargement de `auth_users.sql`
   - Restauration de la base de données
   - Restauration des utilisateurs
   - Vérification automatique

### 4. Vérifier la Base de Données

À tout moment, cliquer sur "✅ Vérifier la Base" pour :
- Compter le nombre de tables
- Compter le nombre d'utilisateurs
- Lister les premières tables

## 🔒 Sécurité

- ✅ Les mots de passe sont masqués par défaut (bouton 👁️ pour afficher)
- ✅ La configuration est sauvegardée localement (`.gitignore` recommandé)
- ✅ Confirmation obligatoire avant toute restauration
- ⚠️ Ne pas commiter `restore_config.json` (contient vos credentials)

## 📝 Ajouter à .gitignore

Ajoutez ces lignes à votre `.gitignore` :

```
# Application de restauration
restore_config.json
__pycache__/
*.pyc
```

## 🐛 Dépannage

### Erreur "No module named 'tkinter'"

**Sous Windows** :
- Réinstaller Python en cochant "Install tkinter"

**Sous Linux/WSL** :
```bash
sudo apt-get install python3-tk
```

### Erreur "No module named 'requests'"

```bash
pip3 install requests psycopg2-binary
```

### Erreur "Connection refused" lors de la vérification

- Vérifier que l'URL Supabase est correcte
- Vérifier que le port est bien 5432 (Session Pooler)
- Vérifier que le mot de passe ne contient pas de caractères spéciaux non encodés

### Erreur "GitHub API rate limit"

- Ajouter un GitHub Token dans la configuration
- Le rate limit est de 60 requêtes/heure sans token, 5000/heure avec token

## 📊 Architecture

```
restore_supabase_gui.py
├── RestoreApp (classe principale)
│   ├── Configuration (GitHub token, URL Supabase)
│   ├── Liste des backups (depuis GitHub API)
│   ├── Téléchargement (via raw.githubusercontent.com)
│   ├── Exécution SQL (via psycopg2)
│   └── Vérification (requêtes SQL)
│
├── Threading (opérations asynchrones)
│   ├── Chargement backups (non bloquant)
│   ├── Restauration (non bloquant)
│   └── Vérification (non bloquant)
│
└── Interface tkinter
    ├── Configuration
    ├── Liste backups
    ├── Actions (Restaurer, Vérifier)
    ├── Journal en temps réel
    └── Barre de progression
```

## 🎯 Fonctionnalités

- ✅ Interface graphique intuitive
- ✅ Configuration persistante
- ✅ Masquage/affichage des mots de passe
- ✅ Chargement asynchrone (pas de freeze)
- ✅ Journal en temps réel
- ✅ Barre de progression
- ✅ Confirmation avant écrasement
- ✅ Vérification automatique post-restauration
- ✅ Gestion d'erreurs complète
- ✅ Multi-threading

## 📞 Support

En cas de problème :
1. Vérifier le journal dans l'application
2. Vérifier les prérequis système
3. Consulter la section Dépannage
4. Vérifier les logs GitHub Actions du backup

## ✅ Checklist de Vérification

Avant de lancer l'application :

- [ ] Python 3.12+ installé
- [ ] tkinter installé (`python -c "import tkinter"`)
- [ ] pip installé (`pip --version`)
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] URL Supabase configurée
- [ ] GitHub Token configuré (si repo privé)
- [ ] Connexion réseau active

Après restauration :

- [ ] Nombre de tables correct
- [ ] Nombre d'utilisateurs correct
- [ ] Application web fonctionne
- [ ] Connexion utilisateur fonctionnelle

---

**Votre production est protégée ! 🛡️**
