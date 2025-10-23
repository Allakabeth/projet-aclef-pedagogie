# 📊 RAPPORT DE COMPARAISON - Bases de Données Supabase

**Date :** 2025-10-19
**Comparaison :** PRODUCTION vs TEST
**Objectif :** Vérifier l'intégrité de la restauration du backup

---

## 🗄️ BASE DE DONNÉES PRODUCTION

**Projet :** mkbchdhbgdynxwfhpxbw
**Nom :** Planning ACLEF (PRODUCTION)
**Status :** ✅ Active - Système en production

### 📊 Statistiques Globales

- **Nombre total de tables :** 50 tables dans le schéma `public`
- **Total de lignes :** ~4 880 lignes (estimation)
- **Utilisateurs :** 88 utilisateurs (formateurs, apprenants, admin)
- **RLS :** Désactivé sur toutes les tables

### 📋 Tables et Données (Détail)

| Table | Lignes | Description |
|-------|--------|-------------|
| **GESTION UTILISATEURS** |||
| `users` | 88 | Utilisateurs (formateurs, apprenants, admin, salariés) |
| `admin_sessions` | 489 | Sessions administrateur |
| **PLANNING & PRÉSENCE** |||
| `absences_formateurs` | 119 | Absences des formateurs |
| `presence_formateurs` | 18 | Pointage présence formateurs |
| `planning_formateurs_hebdo` | 279 | Planning hebdomadaire formateurs |
| `planning_hebdomadaire` | 204 | Planning hebdomadaire général |
| `planning_type_formateurs` | 270 | Planning type (modèle) formateurs |
| `planning_apprenants` | 101 | Planning apprenants |
| `absences_apprenants` | 10 | Absences et présences exceptionnelles |
| `lieux` | 4 | Lieux de formation |
| `suspensions_parcours` | 3 | Suspensions de parcours apprenants |
| **MESSAGERIE** |||
| `messages` | 264 | Messages entre formateurs et admin |
| **MODULE LECTURE (Pédagogie)** |||
| `textes_references` | 18 | Textes oralisés par les apprenants |
| `groupes_sens` | 197 | Groupes de mots avec sens |
| `mots_extraits` | 429 | Mots extraits des textes |
| `syllabes_mots` | 214 | Mots avec segmentation syllabique |
| `syllabes` | 1364 | Syllabes individuelles |
| `mots_classifies` | 299 | Mots classifiés mono/multisyllabes |
| `paniers_syllabes` | 48 | Paniers d'organisation de syllabes |
| `corrections_demandees` | 26 | Demandes de correction utilisateurs |
| `signalements_syllabification` | 62 | Signalements erreurs syllabification |
| `corrections_syllabification` | 53 | Corrections centralisées (tous apprenants) |
| `corrections_mono_multi` | 2 | Corrections mono/multi centralisées |
| **MODULE IMAGIERS** |||
| `imagiers` | 7 | Collections d'imagiers |
| `imagier_elements` | 140 | Éléments des imagiers |
| **MODULE QUIZ** |||
| `quiz_categories` | 9 | Catégories de quiz |
| `quiz` | 3 | Quiz créés |
| `quiz_sessions` | 33 | Sessions de quiz complétées |
| `quiz_assignments` | 8 | Attributions de quiz |
| **MODULE CODE DE LA ROUTE** |||
| `vocabulaire_code_route` | 111 | Vocabulaire code de la route |
| `definitions_personnalisees_code_route` | 0 | Définitions personnalisées (vide) |
| `progression_vocabulaire_code_route` | 0 | Progression vocabulaire (vide) |
| **MODULE FORMATION** |||
| `formation_domaines` | 3 | Domaines de formation |
| `formation_categories_competences` | 12 | Catégories de compétences |
| `formation_competences` | 79 | Référentiel compétences |
| `formation_positionnements` | 1 | Positionnements initiaux |
| `formation_evaluations_positionnement` | 0 | Évaluations positionnement (vide) |
| `formation_plans` | 1 | Plans de formation individualisés |
| `formation_plan_competences` | 18 | Compétences ciblées dans plans |
| `formation_attributions_exercices` | 0 | Attributions exercices (vide) |
| `formation_resultats_exercices` | 0 | Résultats exercices (vide) |
| `formation_suivis_pedagogiques` | 0 | Suivis pédagogiques (vide) |
| `formation_bilans` | 0 | Bilans de formation (vide) |
| `formation_exercices` | 0 | Exercices pédagogiques (vide) |
| `formation_exercices_assignations` | 0 | Assignations exercices (vide) |
| `categories_outils_pedagogiques` | 8 | Catégories outils pédagogiques |

### 🔑 Informations Clés

**Tables non vides :** 39 tables contiennent des données
**Tables vides :** 11 tables (principalement dans module Formation)

**Répartition des données :**
- Planning & Gestion : ~1 800 lignes
- Module Lecture : ~2 700 lignes
- Module Formation : ~125 lignes
- Autres modules : ~250 lignes

---

## 🧪 BASE DE DONNÉES TEST

**Projet :** dlahoaccqzeuiqfxuelw
**Nom :** Test restauration
**Status :** ⚠️ À vérifier

### ❓ Statut de la Restauration

**QUESTION :** Le backup a-t-il été restauré sur le projet TEST ?

- [ ] OUI - Restauration effectuée
- [ ] NON - Projet TEST encore vierge
- [ ] EN COURS - Restauration en cours

### 📝 Note Importante

Les outils MCP Supabase sont configurés pour le projet PRODUCTION uniquement. Pour comparer avec le projet TEST, je dois :

1. **Option A** : Vous demandez de lancer l'application Python `restore_supabase_gui.py` et de restaurer le backup
2. **Option B** : Vous me donnez accès au projet TEST via une nouvelle configuration MCP
3. **Option C** : Vous lancez manuellement la restauration et je vérifie ensuite

---

## 🎯 PROCHAINES ÉTAPES

### Si le backup a été restauré sur TEST :

Je comparerai automatiquement :

1. **Nombre de tables** : Les 50 tables doivent être présentes
2. **Nombre de lignes par table** : Doit correspondre exactement
3. **Structure des tables** : Schémas identiques
4. **Données critiques** :
   - `users` : 88 utilisateurs
   - `textes_references` : 18 textes
   - `syllabes` : 1364 syllabes
   - `messages` : 264 messages
   - Etc.

### Si le backup n'a PAS été restauré :

1. Lancer l'application Python :
   ```bash
   # Sous Windows
   cd "C:\Projet ACLEF\projet aclef pedagogie"
   python restore_supabase_gui.py
   ```

2. Configurer :
   - GitHub Token : (laisser vide si repo public)
   - URL Supabase TEST : `postgresql://postgres.dlahoaccqzeuiqfxuelw:YOUR_PASSWORD_HERE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`

3. Restaurer le backup `20251019_123633`

4. Vérifier la restauration dans l'application

---

## 📊 RAPPORT D'INTÉGRITÉ (Après restauration)

### ✅ Vérifications à Effectuer

- [ ] **Nombre de tables** : PRODUCTION = TEST (50 tables)
- [ ] **Utilisateurs** : 88 rows identiques
- [ ] **Textes de référence** : 18 rows identiques
- [ ] **Syllabes** : 1364 rows identiques
- [ ] **Messages** : 264 rows identiques
- [ ] **Planning formateurs** : 270 rows identiques
- [ ] **Absences formateurs** : 119 rows identiques
- [ ] **Quiz** : 3 rows identiques
- [ ] **Corrections syllabification** : 53 rows identiques
- [ ] **Formation - Compétences** : 79 rows identiques

### 🔍 Tests Fonctionnels

- [ ] Connexion à l'application (users table accessible)
- [ ] Lecture des textes références
- [ ] Affichage des plannings
- [ ] Lecture des messages
- [ ] Accès aux quiz

---

## 📌 CONCLUSION TEMPORAIRE

**Base PRODUCTION :** ✅ Analysée et documentée
- 50 tables
- ~4 880 lignes totales
- Structure complexe avec 11 modules fonctionnels

**Base TEST :** ⚠️ En attente de vérification
- Statut de restauration à confirmer
- Comparaison détaillée à effectuer après restauration

**Backup :** ✅ Complet et structuré
- Fichier `database.sql` : 1.4 MB, 17 733 lignes
- Fichier `auth_users.sql` : 306 KB
- Date : 2025-10-19 12:36:33 UTC

---

**🔄 MISE À JOUR REQUISE :** Ce rapport sera complété dès que le projet TEST aura été vérifié/restauré.
