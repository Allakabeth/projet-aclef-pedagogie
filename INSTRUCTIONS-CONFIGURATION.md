# 🚀 Configuration du Système de Corrections Centralisées

## Vue d'ensemble

Le système de corrections centralisées permet de corriger une fois pour toutes les erreurs de syllabification qui s'appliqueront automatiquement à tous les utilisateurs et tous les textes.

## Étapes de configuration

### 1. Configuration de la base de données

Exécutez le script SQL suivant dans votre interface Supabase :

```bash
# Copier le contenu du fichier
cat setup-corrections-system.sql

# Puis coller dans l'éditeur SQL de Supabase et exécuter
```

### 2. Vérification de la configuration

Après l'exécution du script, vérifiez que les tables ont été créées :

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%correction%' OR table_name LIKE '%signalement%';

-- Vérifier les données d'exemple
SELECT * FROM corrections_syllabification;
SELECT * FROM corrections_mono_multi;
```

### 3. Test du système

1. **Accéder à l'interface admin** : `http://localhost:3001/admin`
2. **Consulter les signalements** : Cliquer sur "📋 Signalements de Syllabification"
3. **Tester une correction** : Faire un exercice, signaler une erreur, puis l'appliquer depuis l'admin

## Fonctionnement du système

### Flux de correction automatique

1. **Utilisateur fait un exercice** → API de syllabification vérifie les corrections centralisées
2. **Correction trouvée** → Appliquée automatiquement (tous utilisateurs)
3. **Pas de correction** → Algorithme standard utilisé

### Flux de signalement et correction

1. **Utilisateur signale une erreur** → Signalement enregistré
2. **Admin consulte les signalements** → Interface d'administration
3. **Admin applique une correction** → Correction centralisée créée
4. **Tous les utilisateurs suivants** → Bénéficient automatiquement de la correction

### Types de corrections

1. **Syllabification** : `corrections_syllabification`
   - Exemple : "châteaux" → ["châ", "teaux"]

2. **Mono/Multi-syllabes** : `corrections_mono_multi` (à implémenter)
   - Exemple : "avec" → "monosyllabe"

## Interface d'administration

### Signalements (`/admin/signalements-syllabification`)

- ✅ **Liste des signalements** avec filtres
- 🔍 **Détails** : segmentation utilisateur vs système
- ⚡ **Actions rapides** : Valider segmentation utilisateur ou système
- 📊 **Statistiques** : Nombre total, traités, en attente

### Actions disponibles

- **Valider segmentation utilisateur** : Applique la correction proposée par l'utilisateur
- **Valider segmentation système** : Confirme que l'algorithme avait raison
- **Marquer comme traité** : Signalement résolu automatiquement

## Avantages du système

### Pour les administrateurs
- 🎯 **Corrections ciblées** : Correction par mot spécifique
- 📈 **Traçabilité** : Qui a appliqué quoi et quand
- 📊 **Statistiques d'usage** : Nombre d'applications par correction
- 🔄 **Réversibilité** : Possibilité de désactiver une correction

### Pour les utilisateurs
- ✅ **Cohérence** : Même syllabification pour tous
- 🚀 **Amélioration continue** : Système s'améliore avec l'usage
- 📝 **Contribution** : Signalements pris en compte rapidement

### Pour le système
- ⚡ **Performance** : Corrections en cache, pas de recalcul
- 🎯 **Précision** : Corrections validées par des humains
- 🔄 **Évolutivité** : Facile d'ajouter de nouveaux types de corrections

## Structure des données

### Table `corrections_syllabification`
```sql
CREATE TABLE corrections_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT UNIQUE,                    -- Le mot à corriger
    segmentation_correcte TEXT[],       -- La bonne segmentation
    statut VARCHAR(20) DEFAULT 'actif', -- actif/inactif/test
    admin_correcteur TEXT,              -- Qui a fait la correction
    nombre_applications INTEGER,        -- Combien de fois utilisée
    date_creation TIMESTAMP,            -- Quand créée
    commentaire TEXT                    -- Notes
);
```

### Table `signalements_syllabification`
```sql
CREATE TABLE signalements_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT,                           -- Mot signalé
    segmentation_utilisateur TEXT[],    -- Ce que voulait l'utilisateur
    segmentation_systeme TEXT[],        -- Ce que proposait le système
    utilisateur TEXT,                   -- Qui a signalé
    traite BOOLEAN DEFAULT FALSE,       -- Si traité par admin
    date_signalement TIMESTAMP          -- Quand signalé
);
```

## Maintenance

### Consulter les corrections actives
```sql
SELECT * FROM v_corrections_actives ORDER BY nombre_applications DESC;
```

### Désactiver une correction
```sql
UPDATE corrections_syllabification 
SET statut = 'inactif' 
WHERE mot = 'exemple';
```

### Statistiques d'utilisation
```sql
SELECT 
    COUNT(*) as total_corrections,
    SUM(nombre_applications) as total_applications,
    AVG(nombre_applications) as moyenne_applications
FROM corrections_syllabification 
WHERE statut = 'actif';
```

## Dépannage

### Problème : Tables non créées
- Vérifier les permissions Supabase
- Réexécuter `setup-corrections-system.sql`

### Problème : Corrections non appliquées
- Vérifier que `statut = 'actif'` dans la table
- Vérifier les logs du serveur pour les erreurs de connexion BDD

### Problème : Interface admin inaccessible
- Vérifier l'authentification JWT
- Vérifier l'URL : `/admin/signalements-syllabification`

## Prochaines étapes

1. ✅ **Syllabification** - Implémenté
2. 🔄 **Mono/Multi-syllabes** - À implémenter
3. 🔄 **Interface de gestion des corrections** - À améliorer
4. 🔄 **Statistiques avancées** - À développer
5. 🔄 **Export/Import de corrections** - À créer

## Support

En cas de problème :
1. Consulter les logs du serveur Next.js
2. Vérifier la configuration Supabase
3. Tester les APIs avec un client REST (Postman, etc.)
4. Consulter ce guide de configuration