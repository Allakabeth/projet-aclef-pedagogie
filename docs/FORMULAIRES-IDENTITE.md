# Système de Formulaires d'Identité - Documentation

## 📋 Vue d'ensemble

Le système de **Formulaires d'Identité** permet aux apprenants de s'entraîner à remplir des formulaires administratifs (CAF, Pôle Emploi, médical, inscription, etc.) en deux phases :

1. **Phase 1** : L'apprenant entre ses informations personnelles avec l'aide du formateur
2. **Phase 2** : L'apprenant s'entraîne en remplissant des formulaires de manière autonome

Le système collecte des **statistiques détaillées par champ** pour identifier précisément les difficultés de chaque apprenant.

---

## 🗄️ Architecture de la base de données

### Tables créées

#### 1. `profils_identite`
Stocke les informations personnelles des apprenants.

**Champs principaux :**
- `apprenant_id` (FK vers users, UNIQUE)
- **Identité** : nom, prenom, nom_naissance, date_naissance, lieu_naissance, nationalite
- **Adresse** : adresse_ligne1, adresse_ligne2, code_postal, ville, pays
- **Contact** : telephone, email, telephone_urgence
- **Situation** : situation_familiale, nombre_enfants
- **Administratif** : numero_secu, numero_allocataire, numero_pole_emploi
- `profil_complet` (boolean) - Indique si le profil est complètement rempli

#### 2. `stats_formulaires_champs`
Enregistre les performances détaillées par champ.

**Champs principaux :**
- `assignation_id`, `apprenant_id`, `exercice_id`
- `champ_id`, `champ_label`, `champ_type`
- `correct` (boolean)
- `valeur_attendue`, `valeur_saisie`
- `temps_saisie_secondes` (int)

#### 3. `formation_exercices`
Type ajouté : `'formulaire_identite'`

**Structure du contenu (JSONB) :**
```json
{
  "nom_formulaire": "Demande CAF",
  "consigne": "Remplissez ce formulaire...",
  "champs": [
    {
      "id": "nom",
      "label": "Nom de famille",
      "type": "text",
      "obligatoire": true,
      "source_donnee": "nom",
      "aide": "Écrivez en majuscules",
      "validation": null
    }
  ]
}
```

---

## 🔄 Workflow complet

### Pour l'apprenant

#### Étape 1 : Remplir son profil d'identité
1. Se connecter au dashboard
2. Cliquer sur **"👤 Mon Profil"**
3. Remplir toutes les sections :
   - Identité
   - Adresse
   - Contact
   - Situation familiale
   - Informations administratives
4. Cocher "Mon profil est complet" et sauvegarder

#### Étape 2 : Réaliser un exercice formulaire
1. Aller dans **"Mes Exercices"**
2. Sélectionner un exercice de type **"Formulaire d'identité"**
3. Remplir le formulaire
4. Le système mesure automatiquement :
   - Le temps passé sur chaque champ (focus/blur)
   - La validité de chaque réponse
5. Soumettre les réponses
6. Consulter son score et les champs corrects/incorrects

### Pour le formateur/admin

#### Créer un exercice formulaire

**Option 1 : Depuis un template**
1. Aller dans **Admin → Formation → Exercices**
2. Cliquer sur **"Nouveau"**
3. Choisir le type **"Formulaire d'identité"**
4. Importer un template depuis `data/templates-formulaires.json`
5. Personnaliser si nécessaire
6. Sauvegarder

**Option 2 : Créer manuellement**
1. Choisir le type **"Formulaire d'identité"**
2. Entrer le nom du formulaire
3. Ajouter des champs un par un depuis la liste disponible
4. Configurer chaque champ :
   - Obligatoire ou optionnel
   - Texte d'aide
   - Validation (regex pour les champs text)
5. Réordonner avec les boutons ↑/↓
6. Sauvegarder

#### Assigner l'exercice
1. Sélectionner l'apprenant
2. Définir la date limite
3. Assigner l'exercice

#### Consulter les statistiques
1. Aller dans **Admin → Formation → Stats Formulaires**
2. Filtrer par :
   - Apprenant
   - Exercice
   - Date
3. Consulter :
   - **Vue d'ensemble** : taux de réussite global
   - **Par champ** : identifier les champs difficiles (tri automatique du plus difficile au plus facile)
   - **Détails** : temps moyen par champ

---

## 📁 Fichiers créés/modifiés

### Migrations SQL
- `supabase/migrations/20251029000001_create_profils_identite.sql`
- `supabase/migrations/20251029000002_create_stats_formulaires_champs.sql`
- `supabase/migrations/20251029000003_add_formulaire_identite_type.sql`

### API Routes
- `pages/api/formation/profil-identite.js` - GET/POST profil
- `pages/api/admin/formation/stats-champs.js` - GET stats détaillées
- `pages/api/exercices/soumettre.js` - Modifié pour supporter formulaire_identite

### Pages Apprenant
- `pages/formation/mon-profil-identite.js` - Formulaire de profil
- `pages/dashboard.js` - Ajout bouton "👤 Mon Profil"
- `pages/exercices/realiser/[id].js` - Ajout player formulaire

### Pages Admin
- `pages/admin/formation/outils-pedagogiques/exercices/nouveau.js` - Support nouveau type
- `pages/admin/formation/outils-pedagogiques/exercices/[id].js` - Édition formulaires
- `pages/admin/formation/stats-formulaires.js` - Nouvelle page stats

### Composants
- `components/QuestionTypes/FormulaireIdentiteEditor.js` - Éditeur admin

### Data
- `data/templates-formulaires.json` - 6 templates pré-configurés

---

## ✅ Checklist de tests

### Tests de base de données
- [ ] Exécuter les 3 migrations dans l'ordre
- [ ] Vérifier que la table `profils_identite` existe
- [ ] Vérifier que la table `stats_formulaires_champs` existe
- [ ] Vérifier que le type `formulaire_identite` est accepté dans `formation_exercices`

### Tests API
- [ ] **GET** `/api/formation/profil-identite` - Retourne null si pas de profil
- [ ] **POST** `/api/formation/profil-identite` - Crée un nouveau profil
- [ ] **POST** `/api/formation/profil-identite` - Met à jour un profil existant
- [ ] **POST** `/api/formation/profil-identite` - Validation email incorrecte → erreur
- [ ] **POST** `/api/formation/profil-identite` - Validation code postal incorrecte → erreur
- [ ] **GET** `/api/admin/formation/stats-champs` - Retourne stats vides si pas de données
- [ ] **GET** `/api/admin/formation/stats-champs?apprenant_id=X` - Filtre par apprenant
- [ ] **POST** `/api/exercices/soumettre` - Type formulaire_identite → score calculé

### Tests Interface Apprenant
- [ ] Bouton "👤 Mon Profil" visible sur le dashboard
- [ ] Page mon-profil-identite charge correctement
- [ ] Formulaire profil sauvegarde les données
- [ ] Indicateur de progression fonctionne (X/19 champs)
- [ ] Validation client affiche les erreurs (email, téléphone, code postal)
- [ ] Player formulaire affiche les champs configurés
- [ ] Player mesure le temps par champ (vérifier via console.log des reponses)
- [ ] Soumission formulaire retourne un score
- [ ] Champs corrects/incorrects affichés après soumission

### Tests Interface Admin
- [ ] Type "Formulaire d'identité" visible dans le select de création
- [ ] Éditeur FormulaireIdentiteEditor s'affiche
- [ ] Ajout de champs fonctionne
- [ ] Suppression de champs fonctionne
- [ ] Réordonnancement (↑/↓) fonctionne
- [ ] Validation lors de la sauvegarde (nom formulaire requis, au moins 1 champ)
- [ ] Édition d'un exercice existant charge les données
- [ ] Page stats-formulaires charge les données
- [ ] Filtres (apprenant, exercice, date) fonctionnent
- [ ] Tableau statistiques affiche les données triées par difficulté

### Tests de Templates
- [ ] Fichier `templates-formulaires.json` est valide (JSON valid)
- [ ] 6 templates présents (CAF simple, CAF complet, Pôle Emploi, Medical, Inscription, État civil)
- [ ] Chaque template a tous les champs requis (id, nom, description, champs)

---

## 🔧 Déploiement

### Étapes de mise en production

1. **Exécuter les migrations**
```bash
# Migration 1 : Créer table profils_identite
psql $DATABASE_URL -f supabase/migrations/20251029000001_create_profils_identite.sql

# Migration 2 : Créer table stats_formulaires_champs
psql $DATABASE_URL -f supabase/migrations/20251029000002_create_stats_formulaires_champs.sql

# Migration 3 : Ajouter type formulaire_identite
psql $DATABASE_URL -f supabase/migrations/20251029000003_add_formulaire_identite_type.sql
```

2. **Déployer le code**
```bash
git add .
git commit -m "Feature: Système de formulaires d'identité"
git push
```

3. **Vérifier le déploiement**
- Tester la connexion apprenant
- Créer un profil de test
- Créer un exercice formulaire de test
- Assigner et réaliser l'exercice
- Consulter les statistiques

---

## 📊 Analyse des statistiques

### Identifier les difficultés

La page **Stats Formulaires** permet d'identifier précisément les champs qui posent problème :

**Indicateurs clés :**
- **Taux de réussite < 50%** (rouge) → Champ très difficile
- **Temps moyen > 30s** → Champ qui demande de la réflexion
- **Échecs répétés** → Besoin d'accompagnement ciblé

**Exemples d'interprétation :**

| Champ | Taux réussite | Temps moyen | Action recommandée |
|-------|---------------|-------------|-------------------|
| Email | 30% | 45s | Exercices spécifiques format email |
| Code postal | 85% | 8s | OK, champ maîtrisé |
| Numéro sécu | 45% | 60s | Séance dédiée aux numéros administratifs |

### Utiliser les données pour adapter la pédagogie

1. **Créer des exercices ciblés** sur les champs difficiles
2. **Organiser des sessions de groupe** pour les difficultés communes
3. **Proposer des aides visuelles** (exemples de format)
4. **Ajuster le temps d'accompagnement** selon les besoins identifiés

---

## 🎯 Fonctionnalités futures possibles

- [ ] Import de templates externes (JSON/CSV)
- [ ] Export des statistiques en Excel
- [ ] Visualisation graphique de l'évolution dans le temps
- [ ] Générateur automatique de formulaires à partir de PDF
- [ ] Mode "dictée" pour les apprenants ayant des difficultés de lecture
- [ ] Suggestions d'exercices personnalisées basées sur les difficultés

---

## 🐛 Dépannage

### L'apprenant ne peut pas remplir de formulaire
**Cause** : Profil non complété
**Solution** : Aller dans "👤 Mon Profil" et compléter toutes les informations

### Les stats n'apparaissent pas
**Cause** : Aucun exercice réalisé ou filtre trop restrictif
**Solution** : Vérifier les filtres ou assigner des exercices

### Erreur lors de la soumission
**Cause** : Profil supprimé/inexistant
**Solution** : Recréer le profil de l'apprenant

### Validation échoue sur le profil
**Cause** : Format incorrect (email, téléphone, code postal)
**Solution** : Vérifier les formats :
- Email : `exemple@domaine.fr`
- Téléphone : `0612345678` ou `+33612345678`
- Code postal : `75001` (5 chiffres)

---

## 📝 Notes techniques

### Normalisation des valeurs
Les comparaisons utilisent `normalizeValue()` qui :
- Convertit en minuscules
- Supprime les espaces (trim)
- Gère les valeurs null/undefined

**Exemple :**
```javascript
"Jean DUPONT  " === "jean dupont" // true après normalisation
```

### Tracking du temps
Le temps est mesuré en secondes via les événements `onFocus` et `onBlur`. Si un apprenant revient plusieurs fois sur un champ, les temps sont cumulés.

### Score
Le score est calculé sur les **champs obligatoires uniquement**.
```
Score = (champs_corrects / champs_obligatoires) * 100
```

### RLS (Row Level Security)
Les tables `profils_identite` et `stats_formulaires_champs` doivent avoir des politiques RLS permettant :
- Apprenant : lecture/écriture de son propre profil
- Admin : lecture de tous les profils et stats

---

## 👥 Contact et support

Pour toute question ou problème :
1. Consulter cette documentation
2. Vérifier les logs dans la console navigateur (F12)
3. Contacter l'équipe technique ACLEF

---

**Version du document** : 1.0
**Date de création** : 29 janvier 2025
**Dernière mise à jour** : 29 janvier 2025
