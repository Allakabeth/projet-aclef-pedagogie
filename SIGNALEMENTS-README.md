# Configuration des Signalements de Syllabification

Ce guide explique comment configurer le système de signalements pour l'exercice de syllabification.

## Statut Actuel
✅ **Les signalements fonctionnent** : ils sont reçus et loggés dans la console du serveur  
⚠️ **Base de données** : optionnelle, à configurer pour la persistance

## Configuration Rapide (Production)

### 1. Créer la table dans Supabase

Connectez-vous à votre projet Supabase et exécutez ce SQL dans l'éditeur SQL :

```sql
-- Créer la table des signalements
CREATE TABLE IF NOT EXISTS signalements_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL,
    segmentation_utilisateur TEXT[] NOT NULL,
    segmentation_systeme TEXT[] NOT NULL,
    utilisateur TEXT,
    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traite BOOLEAN DEFAULT FALSE,
    commentaire_admin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_signalements_mot ON signalements_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_traite ON signalements_syllabification(traite);
CREATE INDEX IF NOT EXISTS idx_signalements_date ON signalements_syllabification(date_signalement);
```

### 2. Vérifier les permissions

Assurez-vous que votre service role key a les permissions pour :
- Insérer dans la table `signalements_syllabification`
- Lire la table pour vérification

## Fonctionnement

### Avec BDD configurée
- ✅ Signalements sauvés en base
- ✅ Consultation possible via interface admin
- ✅ Traçabilité complète

### Sans BDD (actuel)
- ✅ Signalements reçus et loggés
- ✅ Visible dans les logs du serveur  
- ⚠️ Pas de persistance après redémarrage

## Logs des Signalements

Les signalements apparaissent dans les logs du serveur ainsi :

```
📝 SIGNALEMENT REÇU:
   Mot: "exemple"
   Utilisateur: ex-em-ple
   Système: e-xem-ple
   Par: user@example.com
   Date: 2025-01-15T10:30:00.000Z
```

## Interface Utilisateur

- ✅ Messages d'état clairs pour l'utilisateur
- ✅ Différenciation BDD configurée / loggé seulement
- ✅ Gestion d'erreurs améliorée
- ✅ Feedback de confirmation

## Test

1. Faites un exercice de syllabification
2. Ratez volontairement un mot
3. Cliquez sur "🚨 Signaler erreur"
4. Vérifiez les logs du serveur ou la table BDD

## Maintenance

### Consulter les signalements (avec BDD)
```sql
SELECT * FROM signalements_syllabification 
ORDER BY date_signalement DESC;
```

### Marquer comme traité
```sql
UPDATE signalements_syllabification 
SET traite = true, commentaire_admin = 'Corrigé dans la version X.X'
WHERE id = X;
```

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du serveur Next.js
2. Vérifiez la configuration Supabase
3. Testez avec l'API `/api/admin/signalement-syllabification`