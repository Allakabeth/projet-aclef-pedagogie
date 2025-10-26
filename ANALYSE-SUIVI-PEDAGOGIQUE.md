# ANALYSE : Suivi Pédagogique - Données disponibles

## 📊 Vue d'ensemble

Ce document analyse les données disponibles dans la base de données pour créer un tableau de bord de suivi pédagogique complet pour chaque apprenant.

---

## 1. 📚 MODULE LIRE (Lecture)

### 1.1 Textes créés (`textes_references`)
**Colonnes pertinentes :**
- `id` - Identifiant du texte
- `titre` - Titre du texte
- `apprenant_id` - Apprenant propriétaire
- `nombre_groupes` - Nombre de groupes de sens
- `nombre_mots_total` - Total de mots
- `nombre_mots_multi_syllabes` - Nombre de mots multisyllabes
- `created_at` - Date de création
- `updated_at` - Dernière modification

**Métriques :**
- ✅ Nombre total de textes créés
- ✅ Date du premier texte
- ✅ Date du dernier texte
- ✅ Progression dans le temps

### 1.2 Groupes de sens (`groupes_sens`)
**Colonnes pertinentes :**
- `texte_reference_id` - Lien vers le texte
- `ordre_groupe` - Position dans le texte
- `contenu` - Contenu du groupe
- `type_groupe` - Type (text, etc.)
- `created_at` - Date de création

**Relations :** Lié à `textes_references` via `texte_reference_id`

**Métriques :**
- ✅ Nombre moyen de groupes par texte
- ✅ Évolution de la complexité

### 1.3 Mots extraits (`mots_extraits`)
**Colonnes pertinentes :**
- `texte_reference_id` - Texte d'origine
- `groupe_sens_id` - Groupe d'origine
- `mot` - Mot original
- `mot_normalise` - Mot normalisé
- `nombre_syllabes` - Nombre de syllabes
- `position_dans_groupe` - Position
- `created_at` - Date

**Métriques :**
- ✅ Total de mots extraits
- ✅ Distribution mono/multisyllabes

### 1.4 Classification mono/multi (`mots_classifies`)
**Colonnes pertinentes :**
- `texte_reference_id` - Texte d'origine
- `apprenant_id` - Apprenant
- `mot` - Mot classé
- `mot_normalise` - Mot normalisé
- `classification` - "monosyllabe" ou "multisyllabe"
- `valide_par_admin` - Validation admin
- `score_utilisateur` - Score de l'apprenant
- `created_at` - Date de classification
- `validated_at` - Date de validation

**Métriques :**
- ✅ Nombre de mots classifiés
- ✅ Taux de réussite (si score_utilisateur disponible)
- ✅ Nombre de validations admin
- ✅ Progression dans la classification

### 1.5 Segmentation syllabique (`syllabes_mots` + `syllabes`)
**Tables :**
- `syllabes_mots` : Mots segmentés (mot_complet, mot_normalise)
- `syllabes` : Syllabes individuelles (syllabe, position_syllabe)

**Relations :**
- `syllabes` → `mots_extraits` via `mot_extrait_id`
- `syllabes_mots` → `textes_references` via `texte_reference_id`

**Métriques :**
- ✅ Nombre de mots segmentés
- ✅ Distribution des syllabes

### 1.6 Paniers de syllabes (`paniers_syllabes`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `texte_id` - Texte lié
- `lettre_panier` - Lettre du panier (A, B, C...)
- `nom_panier` - Nom du panier
- `syllabes` - Structure JSONB avec les syllabes
- `created_at` - Création
- `updated_at` - Modification

**Métriques :**
- ✅ Nombre de paniers créés
- ✅ Nombre de syllabes organisées
- ✅ Progression dans l'organisation

### 1.7 Enregistrements audio

#### 1.7.1 Enregistrements de groupes (`enregistrements_groupes`)
**Colonnes pertinentes :**
- `groupe_sens_id` - Groupe enregistré
- `apprenant_id` - Apprenant
- `audio_url` - URL du fichier audio
- `duree_secondes` - Durée
- `taille_bytes` - Taille fichier
- `created_at` - Date

**Métriques :**
- ✅ Nombre d'enregistrements de groupes
- ✅ Durée totale enregistrée
- ✅ Progression dans l'oralisation

#### 1.7.2 Enregistrements de mots (`enregistrements_mots`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `mot` - Mot enregistré
- `audio_url` - URL audio
- `texte_id` - Texte d'origine (optionnel)
- `created_at` - Date

**Métriques :**
- ✅ Nombre de mots enregistrés
- ✅ Mots travaillés individuellement

### 1.8 Signalements et corrections
**Tables :**
- `signalements_syllabification` - Signalements d'erreurs
- `corrections_syllabification` - Corrections centralisées
- `corrections_mono_multi` - Corrections classification
- `corrections_demandees` - Demandes de correction

**Métriques :**
- ✅ Nombre de signalements faits par l'apprenant
- ✅ Implication dans l'amélioration du système

---

## 2. 🎯 MODULE QUIZ

### 2.1 Sessions de quiz (`quiz_sessions`)
**Colonnes pertinentes :**
- `quiz_id` - Quiz effectué
- `user_id` - Apprenant (= apprenant_id)
- `score` - Score obtenu
- `total_questions` - Nombre de questions
- `completed` - Quiz terminé ?
- `session_data` - Données JSONB détaillées
- `created_at` - Date de la session

**Relations :**
- Lié à `quiz` via `quiz_id`
- Lié à `users` via `user_id`

**Métriques :**
- ✅ Nombre de quiz effectués
- ✅ Score moyen
- ✅ Taux de complétion
- ✅ Progression des scores dans le temps
- ✅ Quiz terminés vs abandonnés

### 2.2 Attributions de quiz (`quiz_assignments`)
**Colonnes pertinentes :**
- `quiz_id` - Quiz attribué
- `user_id` - Apprenant
- `assigned_by` - Admin/formateur
- `assigned_at` - Date d'attribution
- `due_date` - Date limite
- `is_completed` - Complété ?
- `completed_at` - Date de complétion

**Métriques :**
- ✅ Nombre de quiz attribués
- ✅ Nombre de quiz complétés
- ✅ Taux de respect des deadlines
- ✅ Quiz en attente

### 2.3 Détails des quiz (`quiz`)
**Pour contexte :**
- `title` - Titre du quiz
- `category_id` - Catégorie
- `quiz_data` - Structure JSONB

---

## 3. 🎓 MODULE FORMATION

### 3.1 Plans de formation (`formation_plans`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `formateur_id` - Formateur référent
- `positionnement_id` - Positionnement de base
- `objectif_principal` - Objectif
- `date_debut` - Date de début
- `date_fin_prevue` - Date de fin prévue
- `statut` - en_cours, termine, abandonne
- `created_at`, `updated_at`

**Métriques :**
- ✅ Plan de formation actif
- ✅ Objectif principal
- ✅ Avancement (date_debut → date_fin_prevue)

### 3.2 Compétences du plan (`formation_plan_competences`)
**Colonnes pertinentes :**
- `plan_id` - Plan
- `competence_id` - Compétence ciblée
- `priorite` - 1=haute, 2=moyenne, 3=basse
- `statut` - a_travailler, en_cours, acquis
- `date_cible` - Date objectif
- `date_acquis` - Date d'acquisition
- `observations` - Notes

**Relations :**
- Lié à `formation_competences` via `competence_id`
- Contient `intitule`, `description`, `contexte` de la compétence

**Métriques :**
- ✅ Nombre de compétences ciblées
- ✅ Compétences acquises
- ✅ Compétences en cours
- ✅ Compétences à travailler
- ✅ Taux de progression

### 3.3 Positionnements (`formation_positionnements`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `formateur_id` - Formateur
- `date_positionnement` - Date
- `statut` - en_cours, termine, valide
- `commentaires_generaux` - Commentaires

**Relations :**
- Lié à `formation_evaluations_positionnement` (évaluations détaillées)

**Métriques :**
- ✅ Date du positionnement initial
- ✅ Statut du positionnement

### 3.4 Évaluations du positionnement (`formation_evaluations_positionnement`)
**Colonnes pertinentes :**
- `positionnement_id` - Positionnement
- `competence_id` - Compétence évaluée
- `evaluation` - oui, non, en_cours, non_evalue
- `date_evaluation` - Date
- `observations` - Notes

**Métriques :**
- ✅ État initial des compétences
- ✅ Comparaison avant/après formation

### 3.5 Exercices attribués (`formation_attributions_exercices`)
**Colonnes pertinentes :**
- `plan_id` - Plan de formation
- `apprenant_id` - Apprenant
- `type_exercice` - quiz, lire_texte, code_route_vocabulaire, imagier
- `quiz_id`, `texte_id`, `vocabulaire_id` - Références
- `titre` - Titre de l'exercice
- `description`, `consignes` - Instructions
- `competence_cible_id` - Compétence visée
- `date_attribution`, `date_limite` - Dates
- `obligatoire` - Obligatoire ?
- `ordre` - Ordre dans le plan
- `statut` - attribue, commence, termine
- `created_by` - Créateur

**Métriques :**
- ✅ Nombre d'exercices attribués
- ✅ Exercices terminés
- ✅ Exercices en cours
- ✅ Exercices à faire
- ✅ Respect des deadlines

### 3.6 Résultats des exercices (`formation_resultats_exercices`)
**Colonnes pertinentes :**
- `attribution_id` - Attribution liée
- `apprenant_id` - Apprenant
- `date_debut`, `date_fin` - Période
- `score` - Score /100
- `reussi` - Réussi ?
- `temps_passe` - Temps en secondes
- `nombre_tentatives` - Nombre de tentatives
- `details` - JSONB avec détails

**Métriques :**
- ✅ Score moyen par exercice
- ✅ Temps moyen passé
- ✅ Taux de réussite
- ✅ Nombre de tentatives moyennes
- ✅ Progression des scores

### 3.7 Suivis pédagogiques (`formation_suivis_pedagogiques`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `plan_id` - Plan
- `formateur_id` - Formateur
- `date_suivi` - Date
- `type` - entretien, observation, evaluation
- `observations` - Notes
- `points_forts` - Points forts
- `points_amelioration` - À améliorer
- `actions_prevues` - Actions prévues

**Métriques :**
- ✅ Nombre d'entretiens/suivis
- ✅ Historique des observations

### 3.8 Bilans (`formation_bilans`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `plan_id` - Plan
- `formateur_id` - Formateur
- `date_bilan` - Date
- `type` - intermediaire, final
- `periode_debut`, `periode_fin` - Période
- `synthese` - Synthèse
- `competences_acquises`, `competences_en_cours` - Listes
- `recommandations` - Recommandations
- `fichier_pdf`, `fichier_word` - Documents

**Métriques :**
- ✅ Bilans intermédiaires effectués
- ✅ Bilan final

### 3.9 Exercices pédagogiques (`formation_exercices` + `formation_exercices_assignations`)
**Tables :**
- `formation_exercices` : Exercices créés (type, titre, difficulté, contenu JSONB)
- `formation_exercices_assignations` : Assignations + résultats

**Métriques :**
- ✅ Exercices assignés
- ✅ Scores obtenus
- ✅ Tentatives

---

## 4. 🗂️ MODULE IMAGIERS

### 4.1 Imagiers (`imagiers` + `imagier_elements`)
**Colonnes pertinentes :**
- `imagiers.titre`, `theme`, `description`
- `imagier_elements.mot`, `image_url`, `question`, `reponse`

**Note :** Pas de tracking individuel par apprenant pour l'instant

**Métriques possibles :**
- ⚠️ Pas de données de suivi actuellement
- Possible future intégration

---

## 5. 📖 MODULE CODE DE LA ROUTE

### 5.1 Vocabulaire (`vocabulaire_code_route`)
**Colonnes pertinentes :**
- `categorie` - Catégorie du mot
- `mot` - Terme
- `definition_simple` - Définition
- `emoji` - Emoji illustratif

### 5.2 Progression vocabulaire (`progression_vocabulaire_code_route`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `vocabulaire_id` - Mot de vocabulaire
- `statut` - nouveau, en_cours, maitrise
- `nombre_revisions` - Nombre de révisions
- `derniere_revision` - Date dernière révision

**Métriques :**
- ✅ Nombre de mots travaillés
- ✅ Mots maîtrisés
- ✅ Mots en cours
- ✅ Taux de révision

### 5.3 Définitions personnalisées (`definitions_personnalisees_code_route`)
**Colonnes pertinentes :**
- `vocabulaire_id` - Mot
- `apprenant_id` - Apprenant
- `ma_definition` - Définition personnelle
- `mon_exemple` - Exemple personnel
- `audio_url` - Enregistrement audio
- `date_creation`, `date_modification`

**Métriques :**
- ✅ Nombre de définitions personnalisées créées
- ✅ Engagement dans le vocabulaire

---

## 6. 👤 INFORMATIONS GÉNÉRALES APPRENANT

### 6.1 Table `users` (role = 'apprenant')
**Colonnes pertinentes :**
- `id` - UUID apprenant
- `prenom`, `nom` - Identité
- `initiales` - Initiales
- `dispositif` - HSP, OPCO
- `date_debut`, `date_fin` - Dates formation (anciennes)
- `date_entree_formation` - Date d'entrée
- `date_sortie_previsionnelle` - Date de sortie prévue
- `date_fin_formation_reelle` - Date réelle de fin
- `lieu_formation_id` - Lieu
- `statut_formation` - en_cours, termine, abandonne, suspendu
- `date_suspension`, `motif_suspension`, `date_reprise_prevue`
- `last_login` - Dernière connexion
- `created_at` - Création compte

**Métriques :**
- ✅ Durée de formation
- ✅ Statut actuel
- ✅ Dernière connexion
- ⚠️ **Pas d'historique complet des connexions** (seulement last_login)

### 6.2 Suspensions parcours (`suspensions_parcours`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `date_suspension` - Date
- `motif_suspension` - Motif
- `date_reprise_prevue` - Date prévue
- `date_reprise_reelle` - Date réelle

**Métriques :**
- ✅ Nombre de suspensions
- ✅ Durée des suspensions

### 6.3 Planning apprenant (`planning_apprenants`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `jour` - Jour de la semaine
- `creneau` - matin, AM
- `lieu_id` - Lieu
- `actif` - Actif ?

**Métriques :**
- ✅ Planning type de l'apprenant
- ✅ Nombre de créneaux par semaine

### 6.4 Absences (`absences_apprenants`)
**Colonnes pertinentes :**
- `apprenant_id` - Apprenant
- `type` - absence_periode, absence_ponctuelle, presence_exceptionnelle
- `date_debut`, `date_fin` - Dates
- `date_specifique` - Date spécifique
- `creneau` - matin, AM
- `motif` - Motif
- `statut` - actif, annule

**Métriques :**
- ✅ Taux d'absentéisme
- ✅ Nombre d'absences
- ✅ Périodes d'absence

---

## 7. 📊 SYNTHÈSE DES MÉTRIQUES DISPONIBLES

### 7.1 Vue d'ensemble générale
- ✅ **Nom, prénom, initiales**
- ✅ **Dispositif** (HSP/OPCO)
- ✅ **Dates formation** (entrée, sortie prévue, sortie réelle)
- ✅ **Statut** (en_cours, terminé, abandonné, suspendu)
- ✅ **Lieu de formation**
- ✅ **Dernière connexion**
- ⚠️ **Historique connexions** (non disponible)
- ✅ **Planning type** (jours/créneaux)
- ✅ **Absences et taux d'assiduité**

### 7.2 Module Lire
- ✅ **Textes créés** (nombre, dates, titres)
- ✅ **Mots extraits** (total, distribution mono/multi)
- ✅ **Mots classifiés** (nombre, taux de réussite)
- ✅ **Segmentation syllabique** (mots segmentés)
- ✅ **Paniers de syllabes** (nombre, organisation)
- ✅ **Enregistrements audio** (groupes + mots, durées)
- ✅ **Signalements** (implication dans amélioration)

### 7.3 Module Quiz
- ✅ **Quiz effectués** (nombre, scores, dates)
- ✅ **Score moyen** et **progression**
- ✅ **Taux de complétion**
- ✅ **Quiz attribués** vs **complétés**
- ✅ **Respect des deadlines**

### 7.4 Module Formation
- ✅ **Plan de formation actif**
- ✅ **Positionnement initial**
- ✅ **Compétences ciblées** (nombre, statuts)
- ✅ **Progression des compétences** (à travailler → acquis)
- ✅ **Exercices attribués** (nombre, types, statuts)
- ✅ **Résultats exercices** (scores, temps, tentatives)
- ✅ **Suivis pédagogiques** (entretiens, observations)
- ✅ **Bilans** (intermédiaires, finaux)

### 7.5 Module Code de la Route
- ✅ **Vocabulaire travaillé** (nombre de mots)
- ✅ **Statut des mots** (nouveau, en cours, maîtrisé)
- ✅ **Révisions** (nombre, fréquence)
- ✅ **Définitions personnalisées** (engagement)

---

## 8. ⚠️ LIMITATIONS IDENTIFIÉES

### 8.1 Historique des connexions
- ❌ **Pas de table de tracking des connexions**
- ⚠️ Seulement `users.last_login` disponible
- 💡 **Solution :** On peut afficher "Dernière connexion" mais pas l'historique complet ni la fréquence

### 8.2 Tracking temps passé par module
- ❌ **Pas de tracking automatique du temps** passé sur chaque module
- ⚠️ Seulement `temps_passe` dans `formation_resultats_exercices`
- 💡 **Solution :** Afficher le temps uniquement pour les exercices de formation

### 8.3 Imagiers
- ❌ **Pas de suivi individuel** par apprenant pour l'instant
- 💡 **Solution future :** Créer une table de suivi si nécessaire

---

## 9. 🎯 STRUCTURE PROPOSÉE POUR LA PAGE DE SUIVI

### 9.1 En-tête apprenant
```
┌─────────────────────────────────────────────────────────┐
│  👤 [Prénom Nom] (Initiales)                           │
│  📍 Lieu: [Nom du lieu]                                 │
│  📅 Entrée: [Date] | Sortie prévue: [Date]             │
│  📊 Statut: [Badge coloré]                              │
│  🕒 Dernière connexion: [Date et heure]                 │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Statistiques rapides (cartes)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📚 Textes   │ 🎯 Quiz     │ 🎓 Exercices│ ✅ Compétences│
│    [N]      │   [N]       │    [N]      │    [N/Total]  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 9.3 Onglets de détail
**Onglet 1 : Vue d'ensemble**
- Timeline globale d'activité
- Graphique de progression
- Dernières activités

**Onglet 2 : Module Lire**
- Liste des textes créés
- Statistiques mots/syllabes
- Enregistrements audio
- Paniers de syllabes

**Onglet 3 : Quiz**
- Liste des quiz effectués
- Graphique évolution scores
- Quiz en attente

**Onglet 4 : Formation**
- Plan de formation actif
- Progression des compétences (visuel)
- Exercices attribués/terminés
- Résultats détaillés

**Onglet 5 : Code de la Route**
- Vocabulaire travaillé
- Progression par catégorie

**Onglet 6 : Assiduité**
- Planning type
- Absences
- Taux de présence

**Onglet 7 : Suivis & Bilans**
- Entretiens pédagogiques
- Observations formateur
- Bilans intermédiaires/finaux

---

## 10. 📝 CONCLUSION

### Points forts
✅ **Données riches** disponibles dans de nombreuses tables
✅ **Traçabilité complète** des activités pédagogiques
✅ **Granularité fine** sur les compétences et exercices
✅ **Intégration** entre les différents modules

### Recommandations
💡 Pour améliorer le tracking :
1. Créer une table `connexions_historique` pour tracker toutes les connexions
2. Ajouter un tracking temps passé par module
3. Implémenter un suivi pour les imagiers

### Prochaine étape
➡️ **Créer l'API** `/api/admin/formation/suivi-apprenant/[id].js` qui agrège toutes ces données
