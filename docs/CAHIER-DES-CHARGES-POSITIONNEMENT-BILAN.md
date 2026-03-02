# Cahier des Charges
## Système de Positionnement, Formation et Bilan ACLEF

**Version** : 1.0
**Date** : 07 janvier 2026
**Projet** : ACLEF Pédagogie

---

## Table des Matières

1. [Contexte et Objectifs](#1-contexte-et-objectifs)
2. [Flux Global du Système](#2-flux-global-du-système)
3. [Module 1 : Positionnement Initial](#3-module-1--positionnement-initial)
4. [Module 2 : Plan de Formation](#4-module-2--plan-de-formation)
5. [Module 3 : Outils de Positionnement et d'Évaluation](#5-module-3--outils-de-positionnement-et-dévaluation)
6. [Module 4 : Outils de Formation](#6-module-4--outils-de-formation)
7. [Module 5 : Recueil des Résultats](#7-module-5--recueil-des-résultats)
8. [Module 6 : Bilans](#8-module-6--bilans)
9. [Module 7 : Attestation de Compétences](#9-module-7--attestation-de-compétences)
10. [Architecture Technique](#10-architecture-technique)
11. [Annexes : Référentiels](#11-annexes--référentiels)

---

## 1. Contexte et Objectifs

### 1.1 Contexte

L'Association ACLEF (Association Calcul Lecture Écriture Formation) accompagne des publics en situation d'illettrisme et des apprenants FLE (Français Langue Étrangère) dans l'acquisition des savoirs de base.

Le projet s'appuie sur :
- Le **Référentiel ANLCI** (4 degrés de maîtrise des compétences de base)
- Les **profils de publics** en formation linguistique de base
- Les **référentiels de formation ACLEF** existants

### 1.2 Objectifs du Système

1. **Positionner** précisément chaque apprenant à l'entrée en formation
2. **Identifier** les compétences acquises et à acquérir
3. **Générer** un plan de formation individualisé
4. **Suivre** la progression avec des outils adaptés
5. **Évaluer** les acquis tout au long du parcours
6. **Produire** un bilan de fin de formation
7. **Délivrer** une attestation de compétences acquises

### 1.3 Publics Cibles

| Type de Public | Caractéristiques |
|----------------|-----------------|
| **Public FLE** | Ne peut pas communiquer en français oral (profils A1, A2, A3) |
| **Public Illettrisme** | Peut communiquer en français oral (profils B1, B2, BA) |
| **Public mixte** | Besoins en savoirs de base transversaux |

---

## 2. Flux Global du Système

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARCOURS DE L'APPRENANT                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  PRESCRIPTION│ ──> Orientation par un prescripteur
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   ACCUEIL    │ ──> Entretien d'accueil, recueil informations
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULE 1 : POSITIONNEMENT INITIAL                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Tests par       │ -> │ Attribution     │ -> │ Compétences  │ │
│  │ domaine         │    │ du profil       │    │ acquises     │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULE 2 : PLAN DE FORMATION                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Compétences     │ -> │ Modules de      │ -> │ Durée        │ │
│  │ à acquérir      │    │ formation       │    │ estimée      │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULES 3 & 4 : FORMATION                                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Outils de       │    │ Outils de       │    │ Exercices &  │ │
│  │ positionnement  │ <> │ formation       │ <> │ Quiz         │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULE 5 : RECUEIL DES RÉSULTATS                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Scores quiz     │    │ Progression     │    │ Observations │ │
│  │ & exercices     │ -> │ compétences     │ -> │ formateur    │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULE 6 : BILAN                                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Comparaison     │    │ Synthèse        │    │ Export       │ │
│  │ entrée/sortie   │ -> │ des acquis      │ -> │ PDF/Word     │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MODULE 7 : ATTESTATION DE COMPÉTENCES                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Sélection       │    │ Génération      │    │ Remise à     │ │
│  │ compétences     │ -> │ certificat      │ -> │ l'apprenant  │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Module 1 : Positionnement Initial

### 3.1 Objectif

Évaluer le niveau de l'apprenant à l'entrée en formation pour :
- Déterminer son **profil** dans chaque domaine
- Identifier les **compétences déjà acquises**
- Préparer le **plan de formation personnalisé**

### 3.2 Domaines Évalués

| Domaine | Sous-domaines | Profils possibles |
|---------|---------------|-------------------|
| **Communication orale** | Écouter, Parler | FLE: A1, A2, A3 / Illettrisme: B1, B2, BA |
| **Lecture** | Lire, Comprendre | GD, PD, D, PLNS, LPS |
| **Écriture** | Écrire, Produire | GD, PD, D, PLNS, LPS |
| **Mathématiques** | Calcul, Raisonnement | M0, M1, M2, M3, M4 |
| **Numérique** | Bureautique, Internet | Niveau 0, 1, 2, 3 |

### 3.3 Grille des Profils FLE (non francophones)

| Profil | Diagnostic | Caractéristiques | Besoins |
|--------|------------|------------------|---------|
| **A1** | Grand débutant | Aucune compréhension du français | Alphabétisation + FLE |
| **A2** | Débutant | Compréhension fragmentaire | FLE intensif |
| **A3** | Intermédiaire | Compréhension partielle | FLE perfectionnement |

### 3.4 Grille des Profils Illettrisme (francophones)

| Profil | Diagnostic | Caractéristiques | Besoins |
|--------|------------|------------------|---------|
| **B1** | Non scolarisé | Jamais appris à lire/écrire | Alphabétisation |
| **B2** | Peu scolarisé | Apprentissages oubliés | Remise à niveau |
| **BA** | Scolarisé | Difficultés ponctuelles | Perfectionnement |

### 3.5 Grille des Profils Lecture/Écriture

| Profil | Code | Description |
|--------|------|-------------|
| Grand Débutant | GD | Ne déchiffre pas, ne reconnaît pas les lettres |
| Petit Débutant | PD | Reconnaît quelques lettres, déchiffrage très lent |
| Déchiffreur | D | Lit syllabe par syllabe, compréhension limitée |
| Petit Lecteur Non Scripteur | PLNS | Lit des textes simples, n'écrit pas |
| Lecteur Petit Scripteur | LPS | Lit et écrit avec difficultés |

### 3.6 Correspondance avec les 4 Degrés ANLCI

| Degré | Lecture | Écriture | Maths | Description |
|-------|---------|----------|-------|-------------|
| **Degré 1** | GD, PD | GD, PD | M0, M1 | Repères structurants |
| **Degré 2** | D | D | M2 | Compétences fonctionnelles |
| **Degré 3** | PLNS | PLNS | M3 | Compétences facilitant l'action |
| **Degré 4** | LPS | LPS | M4 | Compétences renforçant l'autonomie |

### 3.7 Processus de Positionnement

```
1. ENTRETIEN D'ACCUEIL
   ├── Recueil informations personnelles
   ├── Parcours scolaire et professionnel
   ├── Objectifs de la formation
   └── Freins identifiés

2. AUTO-DIAGNOSTIC (optionnel)
   ├── Langues parlées/comprises
   ├── Usages numériques
   └── Rapport à l'écrit

3. TESTS D'ÉVALUATION PAR DOMAINE
   ├── Oral : Compréhension et expression
   ├── Lecture : Déchiffrage et compréhension
   ├── Écriture : Copie et production
   ├── Maths : Numération et opérations
   └── Numérique : Manipulation de base

4. ATTRIBUTION DU PROFIL
   ├── Algorithme basé sur les résultats
   ├── Validation par le formateur
   └── Enregistrement dans le système

5. ENTRETIEN DE RESTITUTION
   ├── Présentation du profil à l'apprenant
   ├── Discussion des objectifs
   └── Validation du plan de formation
```

### 3.8 Données à Collecter

| Donnée | Type | Obligatoire |
|--------|------|-------------|
| Identifiant apprenant | Référence | Oui |
| Date du positionnement | Date | Oui |
| Formateur évaluateur | Référence | Oui |
| Profil par domaine | Enum | Oui |
| Compétences évaluées | Liste | Oui |
| Statut par compétence | oui/non/en_cours | Oui |
| Observations | Texte libre | Non |
| Documents joints | Fichiers | Non |

### 3.9 Interface Utilisateur

**Page : `/admin/formation/positionnements/nouveau`**

- Sélection de l'apprenant
- Choix du domaine à évaluer
- Grille d'évaluation des compétences (checkboxes)
- Calcul automatique du profil suggéré
- Validation par le formateur
- Bouton "Générer le plan de formation"

---

## 4. Module 2 : Plan de Formation

### 4.1 Objectif

Construire un plan de formation individualisé basé sur :
- Le **profil initial** de l'apprenant
- Les **compétences à acquérir** pour atteindre le niveau supérieur
- Le **temps disponible** de formation
- Les **priorités** définies avec l'apprenant

### 4.2 Structure du Plan

```
PLAN DE FORMATION INDIVIDUALISÉ
│
├── INFORMATIONS GÉNÉRALES
│   ├── Apprenant : [Nom, Prénom]
│   ├── Date de début : [Date]
│   ├── Durée prévue : [X heures]
│   └── Objectif global : [Profil cible]
│
├── MODULE 1 : [DOMAINE - ex: Lecture]
│   ├── Profil actuel : [ex: PD - Petit Débutant]
│   ├── Profil cible : [ex: D - Déchiffreur]
│   ├── Durée estimée du module : [X heures] (à définir)
│   ├── Compétences à acquérir :
│   │   ├── C1 : [Intitulé]
│   │   ├── C2 : [Intitulé]
│   │   └── C3 : [Intitulé]
│   └── Outils recommandés : [Liste]
│
├── MODULE 2 : [DOMAINE - ex: Écriture]
│   └── ... (même structure)
│
├── MODULE 3 : [DOMAINE - ex: Mathématiques]
│   └── ... (même structure)
│
└── SYNTHÈSE
    ├── Durée totale formation : [X heures]
    ├── Répartition par domaine : [Graphique]
    └── Jalons de progression : [Dates]
```

### 4.3 Calcul des Compétences à Acquérir

**Règle** : Pour passer d'un profil N à un profil N+1, l'apprenant doit acquérir toutes les compétences du niveau N+1 qu'il ne possède pas encore.

**Exemple** :
```
Profil actuel : PD (Petit Débutant en lecture)
Profil cible : D (Déchiffreur)

Compétences du niveau D :
☑ Reconnaître les lettres de l'alphabet (acquis)
☐ Associer les sons aux lettres (à acquérir)
☐ Lire des syllabes simples (à acquérir)
☐ Lire des mots courants (à acquérir)
☑ Comprendre des mots isolés (acquis)

→ 3 compétences à acquérir pour atteindre le niveau D
```

### 4.4 Estimation des Durées

Les durées sont estimées **par module** (domaine), pas par compétence individuelle.

| Champ | Description |
|-------|-------------|
| `duree_estimee_module` | Durée prévisionnelle pour le module (en heures) |
| `duree_realisee_module` | Durée effectivement passée (mise à jour en cours de formation) |

**Note** : Les valeurs seront définies ultérieurement par les formateurs selon leur expérience terrain. Le système permet de saisir et modifier ces durées à tout moment.

### 4.5 Données du Plan de Formation

| Donnée | Type | Description |
|--------|------|-------------|
| `id` | UUID | Identifiant unique |
| `apprenant_id` | Référence | Lien vers l'apprenant |
| `positionnement_id` | Référence | Lien vers le positionnement initial |
| `date_creation` | Date | Date de création du plan |
| `date_debut_prevue` | Date | Début prévu de la formation |
| `date_fin_prevue` | Date | Fin prévue de la formation |
| `duree_totale_heures` | Nombre | Durée totale estimée |
| `statut` | Enum | brouillon/actif/termine/abandonne |
| `objectifs_globaux` | Texte | Objectifs à atteindre |
| `observations` | Texte | Notes du formateur |

### 4.6 Données des Compétences du Plan

| Donnée | Type | Description |
|--------|------|-------------|
| `id` | UUID | Identifiant unique |
| `plan_id` | Référence | Lien vers le plan |
| `competence_id` | Référence | Lien vers la compétence |
| `ordre` | Nombre | Ordre dans le module |
| `priorite` | Enum | haute/moyenne/basse |
| `date_debut` | Date | Début travail sur cette compétence |
| `date_fin` | Date | Fin travail (si acquis) |
| `statut` | Enum | a_travailler/en_cours/acquis/reporte |
| `observations` | Texte | Notes spécifiques |

### 4.6bis Données des Modules du Plan

| Donnée | Type | Description |
|--------|------|-------------|
| `id` | UUID | Identifiant unique |
| `plan_id` | Référence | Lien vers le plan |
| `domaine_id` | Référence | Domaine (Lecture, Écriture, etc.) |
| `profil_initial` | Texte | Profil à l'entrée (ex: PD) |
| `profil_cible` | Texte | Profil visé (ex: D) |
| `duree_estimee` | Nombre | Heures prévisionnelles (à définir) |
| `duree_realisee` | Nombre | Heures effectuées |
| `statut` | Enum | a_travailler/en_cours/termine |
| `observations` | Texte | Notes spécifiques |

### 4.7 Interface Utilisateur

**Page : `/admin/formation/plans/nouveau`**

1. Sélection de l'apprenant (ou depuis positionnement)
2. Affichage des profils par domaine
3. Sélection du profil cible par domaine
4. Génération automatique des compétences à acquérir
5. Ajustement des priorités et durées
6. Validation et enregistrement

**Page : `/admin/formation/plans/[id]`**

1. Vue d'ensemble du plan
2. Liste des compétences par module
3. Mise à jour des statuts
4. Ajout d'observations
5. Export PDF/Word

---

## 5. Module 3 : Outils de Positionnement et d'Évaluation

### 5.1 Objectif

Fournir des outils standardisés pour :
- **Évaluer** le niveau initial (positionnement)
- **Mesurer** la progression (évaluations intermédiaires)
- **Valider** les acquis (évaluations finales)

### 5.2 Types d'Outils

| Type | Usage | Format |
|------|-------|--------|
| **Tests de positionnement** | Entrée en formation | Papier/Numérique |
| **Auto-diagnostics** | Recueil perceptions | Questionnaire |
| **Quiz de validation** | Vérification acquis | QCM interactif |
| **Exercices pratiques** | Mise en situation | Exercices guidés |
| **Grilles d'observation** | Évaluation formateur | Checklist |

### 5.3 Tests de Positionnement par Degré

#### Degré 1 & 2 - Français

| Activité | Objectif | Support |
|----------|----------|---------|
| Dictée de lettres | Reconnaissance alphabet | Audio + papier |
| Lecture de syllabes | Déchiffrage basique | Cartes syllabes |
| Écriture de mots | Encodage | Dictée simple |
| Compréhension orale | Écoute + réponse | Audio + images |

#### Degré 3 - Français

| Activité | Objectif | Support |
|----------|----------|---------|
| Lecture de texte court | Fluidité + compréhension | Texte imprimé |
| Questions de compréhension | Sens global et détails | QCM |
| Production écrite | Rédaction guidée | Consigne + feuille |
| Expression orale | Communication | Mise en situation |

#### Degré 4 - Français

| Activité | Objectif | Support |
|----------|----------|---------|
| Lecture de document complexe | Compréhension fine | Document authentique |
| Synthèse écrite | Production autonome | Sujet libre |
| Argumentation | Expression structurée | Débat/exposé |

#### Mathématiques (tous degrés)

| Activité | M0-M1 | M2 | M3-M4 |
|----------|-------|----|----|
| Numération | Nombres jusqu'à 100 | Jusqu'à 1000 | Tous nombres |
| Opérations | Addition/Soustraction | Multiplication/Division | Opérations complexes |
| Problèmes | Situations simples | Problèmes guidés | Problèmes ouverts |
| Mesures | Longueurs, masses | Durées, monnaie | Conversions |

### 5.4 Organisation des Outils Existants

**Dossier source** : `C:\Users\ACLEF25\OneDrive - ...\positionnement plans de formation bilan`

| Fichier | Contenu | Usage |
|---------|---------|-------|
| `Outil Positionnement Oral lecture écriture.docx` | Grilles OLE | Positionnement |
| `positionnement bureautique.pdf` | Grilles bureautique | Positionnement numérique |
| `positionnement maths.docx` | Grilles maths | Positionnement maths |
| `Test A1.pdf` | Test niveau A1 | FLE |
| `methodologie elaboration plan de formation.pdf` | Tests degrés 1-4 | Référence |

**Sous-dossiers** :
- `CECRL/` : Compétences selon le cadre européen
- `FLE/` : Profils FLE détaillés
- `Illettrisme/` : Profils illettrisme détaillés
- `évaluations france terre d'asile FLE/` : Diagnostics FLE

### 5.5 Intégration dans l'Application

**Table `formation_outils_evaluation`** :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant |
| `nom` | Texte | Nom de l'outil |
| `type` | Enum | test/auto_diagnostic/quiz/exercice/grille |
| `domaine_id` | Référence | Domaine concerné |
| `degre` | Nombre | Degré ANLCI (1-4) |
| `profils` | Tableau | Profils concernés |
| `description` | Texte | Description |
| `fichier_url` | URL | Document PDF/Word |
| `quiz_id` | Référence | Quiz associé (si numérique) |
| `duree_estimee` | Nombre | Minutes |
| `consignes` | Texte | Instructions |

### 5.6 Interface Utilisateur

**Page : `/admin/formation/outils-evaluation`**

1. Liste des outils par domaine et degré
2. Filtres : type, domaine, profil
3. Aperçu de l'outil
4. Attribution à un apprenant
5. Lien vers résultats

---

## 6. Module 4 : Outils de Formation

### 6.1 Objectif

Proposer des ressources pédagogiques pour travailler les compétences identifiées dans le plan de formation.

### 6.2 Outils Existants dans l'Application

#### Module LIRE (existant)

| Outil | Compétences travaillées | Profils |
|-------|-------------------------|---------|
| Textes de référence | Lecture contextualisée | D, PLNS, LPS |
| Segmentation syllabes | Déchiffrage | GD, PD, D |
| Jeux de syllabes (11) | Reconnaissance | GD, PD, D |
| Écoute et trouve | Discrimination auditive | Tous |
| Lis et trouve | Reconnaissance visuelle | D, PLNS, LPS |
| Construis phrases | Syntaxe | PLNS, LPS |
| Dictées recherche | Encodage | D, PLNS, LPS |

#### Module QUIZ (existant)

| Outil | Usage | Profils |
|-------|-------|---------|
| QCM | Évaluation rapide | Tous |
| Appariement | Association | Tous |
| Ordre/Séquence | Logique | D, PLNS, LPS |
| Numérique | Calcul | M1-M4 |

### 6.3 Outils à Développer/Intégrer

| Domaine | Outils manquants | Priorité |
|---------|-----------------|----------|
| **Écriture** | Exercices de copie, production guidée | Haute |
| **Mathématiques** | Exercices numération, problèmes | Haute |
| **Oral** | Exercices écoute, prononciation | Moyenne |
| **Numérique** | Tutoriels bureautique, internet | Basse |

### 6.4 Liaison Compétence → Outil

**Table `formation_competences_outils`** (liaison N:N)

| Champ | Type | Description |
|-------|------|-------------|
| `competence_id` | Référence | Compétence concernée |
| `outil_type` | Enum | texte/jeu/quiz/exercice |
| `outil_id` | UUID | ID de l'outil |
| `niveau_difficulte` | Nombre | 1-5 |
| `ordre_suggere` | Nombre | Ordre dans la progression |

### 6.5 Attribution des Outils

**Automatique** : Lors de la génération du plan, le système suggère les outils correspondant aux compétences à acquérir.

**Manuelle** : Le formateur peut ajouter/retirer des outils pour chaque compétence.

---

## 7. Module 5 : Recueil des Résultats

### 7.1 Objectif

Centraliser toutes les données de progression pour :
- Suivre l'avancement de l'apprenant
- Alimenter les bilans
- Mesurer l'efficacité des outils

### 7.2 Sources de Données

| Source | Type de donnée | Automatique |
|--------|----------------|-------------|
| Quiz | Score, temps, tentatives | Oui |
| Jeux de syllabes | Réussite, erreurs | Oui |
| Exercices numériques | Score, progression | Oui |
| Textes créés | Quantité, qualité | Partiel |
| Observations formateur | Notes qualitatives | Non |
| Présences | Heures réalisées | Non |

### 7.3 Structure des Résultats

**Table `formation_resultats_exercices`** (existante) :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant |
| `apprenant_id` | Référence | Apprenant |
| `exercice_type` | Enum | quiz/jeu/texte/exercice |
| `exercice_id` | UUID | ID de l'exercice |
| `competences_evaluees` | Tableau | Compétences concernées |
| `score` | Nombre | Score obtenu |
| `score_max` | Nombre | Score maximum |
| `temps_passe` | Nombre | Secondes |
| `tentative` | Nombre | Numéro de tentative |
| `date` | Timestamp | Date/heure |
| `details` | JSON | Détails (réponses, erreurs) |

### 7.4 Agrégation des Résultats

**Par compétence** :
```
Compétence : "Lire des syllabes simples"
├── Quiz réalisés : 3
├── Score moyen : 75%
├── Jeux effectués : 15
├── Taux réussite jeux : 82%
├── Dernière évaluation : 85%
└── Statut suggéré : ACQUIS
```

**Par domaine** :
```
Domaine : Lecture
├── Compétences travaillées : 8/12
├── Compétences acquises : 5/12
├── Temps passé : 24 heures
├── Progression : 42%
└── Dernière activité : 05/01/2026
```

### 7.5 Règles de Validation Automatique

| Critère | Seuil | Action |
|---------|-------|--------|
| Score quiz ≥ 80% sur 2 tentatives | Réussi | Suggérer "Acquis" |
| Jeux réussis ≥ 90% | Réussi | Suggérer "Acquis" |
| Score < 50% après 3 tentatives | Difficulté | Alerter formateur |
| Aucune activité > 2 semaines | Inactivité | Alerter formateur |

### 7.6 Interface Utilisateur

**Page : `/admin/formation/suivi-pedagogique/[id]`** (existante, à enrichir)

Onglets :
1. **Vue d'ensemble** : Résumé progression
2. **Par domaine** : Détail par domaine
3. **Compétences** : Liste avec statuts
4. **Résultats** : Historique des activités
5. **Exercices** : Attributions et scores
6. **Observations** : Notes du formateur
7. **Bilans** : Bilans générés (nouveau)

---

## 8. Module 6 : Bilans

### 8.1 Objectif

Produire des synthèses de la progression à différentes étapes :
- **Bilan intermédiaire** : Point d'étape en cours de formation
- **Bilan final** : Synthèse à la fin de la formation

### 8.2 Types de Bilans

| Type | Déclencheur | Contenu |
|------|-------------|---------|
| **Intermédiaire** | À la demande ou jalons | Progression, difficultés, ajustements |
| **Final** | Fin de formation | Synthèse complète, acquis validés |

### 8.3 Contenu du Bilan

```
BILAN DE FORMATION
═══════════════════════════════════════════════════════════

INFORMATIONS GÉNÉRALES
───────────────────────────────────────────────────────────
Apprenant        : [Nom Prénom]
Période          : Du [date] au [date]
Durée réalisée   : [X] heures sur [Y] prévues
Formateur(s)     : [Noms]
Type de bilan    : [Intermédiaire / Final]

POSITIONNEMENT INITIAL
───────────────────────────────────────────────────────────
┌─────────────────┬──────────────┬──────────────┐
│ Domaine         │ Profil entrée│ Profil cible │
├─────────────────┼──────────────┼──────────────┤
│ Communication   │ A2           │ A3           │
│ Lecture         │ PD           │ D            │
│ Écriture        │ GD           │ PD           │
│ Mathématiques   │ M1           │ M2           │
│ Numérique       │ Niveau 0     │ Niveau 1     │
└─────────────────┴──────────────┴──────────────┘

PROGRESSION PAR DOMAINE
───────────────────────────────────────────────────────────

▶ LECTURE (Profil initial : PD → Profil actuel : D)
  Compétences acquises :
  ✓ Reconnaître les lettres de l'alphabet
  ✓ Associer les sons aux lettres
  ✓ Lire des syllabes simples
  ✓ Lire des mots courants

  Compétences en cours :
  ◐ Lire des phrases simples (75%)

  Compétences non travaillées :
  ○ Comprendre un texte court

▶ ÉCRITURE (Profil initial : GD → Profil actuel : PD)
  [...]

SYNTHÈSE CHIFFRÉE
───────────────────────────────────────────────────────────
• Compétences travaillées    : 24 / 35 (69%)
• Compétences acquises       : 18 / 35 (51%)
• Compétences en cours       : 6 / 35 (17%)
• Quiz réalisés              : 12 (score moyen : 72%)
• Exercices effectués        : 45
• Taux de présence           : 85%

OBSERVATIONS DU FORMATEUR
───────────────────────────────────────────────────────────
[Texte libre : points forts, difficultés rencontrées,
attitude, recommandations...]

PRÉCONISATIONS
───────────────────────────────────────────────────────────
□ Poursuite de formation recommandée
□ Compétences prioritaires pour la suite : [liste]
□ Orientation vers : [structure/dispositif]
```

### 8.4 Structure de Données

**Table `formation_bilans`** (existante, à compléter) :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant |
| `apprenant_id` | Référence | Apprenant concerné |
| `plan_id` | Référence | Plan de formation associé |
| `type` | Enum | intermediaire/final |
| `date_debut_periode` | Date | Début période évaluée |
| `date_fin_periode` | Date | Fin période évaluée |
| `duree_realisee` | Nombre | Heures effectuées |
| `formateur_id` | Référence | Formateur rédacteur |
| `date_creation` | Timestamp | Date création bilan |
| `statut` | Enum | brouillon/valide/archive |
| `observations` | Texte | Observations formateur |
| `preconisations` | Texte | Recommandations |
| `fichier_pdf` | URL | Export PDF généré |
| `fichier_word` | URL | Export Word généré |

**Table `formation_bilan_competences`** (nouvelle) :

| Champ | Type | Description |
|-------|------|-------------|
| `bilan_id` | Référence | Bilan parent |
| `competence_id` | Référence | Compétence |
| `statut_debut` | Enum | Statut en début de période |
| `statut_fin` | Enum | Statut en fin de période |
| `score_moyen` | Nombre | Score moyen sur la période |
| `commentaire` | Texte | Note spécifique |

### 8.5 Génération Automatique

Le système pré-remplit le bilan avec :
1. Les données du positionnement initial
2. Les données agrégées du recueil de résultats
3. Les statuts actuels des compétences du plan
4. Les statistiques calculées (scores, temps, progression)

Le formateur peut ensuite :
- Valider/modifier les données
- Ajouter des observations qualitatives
- Rédiger les préconisations
- Générer le document final

### 8.6 Interface Utilisateur

**Page : `/admin/formation/bilans/nouveau`**

1. Sélection de l'apprenant
2. Type de bilan (intermédiaire/final)
3. Période évaluée
4. Pré-remplissage automatique
5. Édition des sections
6. Aperçu avant génération
7. Export PDF/Word

**Page : `/admin/formation/bilans/[id]`**

1. Affichage du bilan complet
2. Modification si brouillon
3. Validation
4. Export PDF/Word
5. Génération attestation (si bilan final)

---

## 9. Module 7 : Attestation de Compétences

### 9.1 Objectif

Délivrer un document officiel attestant des compétences acquises par l'apprenant à l'issue de la formation.

### 9.2 Contenu de l'Attestation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                     [LOGO ACLEF]                                        │
│                                                                         │
│              ATTESTATION DE COMPÉTENCES ACQUISES                        │
│              ════════════════════════════════════                       │
│                                                                         │
│  L'Association ACLEF (Association Calcul Lecture Écriture Formation)    │
│  atteste que :                                                          │
│                                                                         │
│                        Monsieur/Madame                                  │
│                     ══════════════════════                              │
│                       [NOM Prénom]                                      │
│                  Né(e) le [date] à [lieu]                               │
│                                                                         │
│  a suivi une formation du [date début] au [date fin]                    │
│  d'une durée totale de [X] heures                                       │
│                                                                         │
│  et a acquis les compétences suivantes :                                │
│                                                                         │
│  COMMUNICATION ORALE                          Niveau atteint : [A3]     │
│  ──────────────────────────────────────────────────────────────────     │
│  ✓ Comprendre des consignes simples                                     │
│  ✓ S'exprimer dans des situations courantes                             │
│  ✓ Participer à une conversation simple                                 │
│                                                                         │
│  LECTURE                                      Niveau atteint : [D]      │
│  ──────────────────────────────────────────────────────────────────     │
│  ✓ Lire des mots et des phrases simples                                 │
│  ✓ Comprendre le sens global d'un texte court                           │
│  ✓ Repérer des informations dans un document                            │
│                                                                         │
│  ÉCRITURE                                     Niveau atteint : [PD]     │
│  ──────────────────────────────────────────────────────────────────     │
│  ✓ Copier des mots et des phrases                                       │
│  ✓ Écrire des mots familiers                                            │
│                                                                         │
│  MATHÉMATIQUES                                Niveau atteint : [M2]     │
│  ──────────────────────────────────────────────────────────────────     │
│  ✓ Maîtriser la numération jusqu'à 1000                                 │
│  ✓ Effectuer les 4 opérations de base                                   │
│  ✓ Résoudre des problèmes simples                                       │
│                                                                         │
│                                                                         │
│  Fait à [Ville], le [date]                                              │
│                                                                         │
│                                                                         │
│  [Signature]                              [Cachet de l'association]     │
│  Le/La Responsable de formation                                         │
│  [Nom du responsable]                                                   │
│                                                                         │
│                          N° Attestation : ACLEF-2026-XXXX               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Règles de Délivrance

| Critère | Condition |
|---------|-----------|
| Bilan final validé | Obligatoire |
| Présence minimale | ≥ 70% des heures prévues |
| Au moins 1 compétence acquise | Obligatoire |
| Validation formateur | Obligatoire |

### 9.4 Structure de Données

**Table `formation_attestations`** (nouvelle) :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant |
| `numero` | Texte | Numéro unique (ACLEF-2026-0001) |
| `apprenant_id` | Référence | Apprenant |
| `bilan_id` | Référence | Bilan final associé |
| `date_delivrance` | Date | Date de délivrance |
| `lieu_delivrance` | Texte | Ville |
| `signataire_nom` | Texte | Nom du signataire |
| `signataire_fonction` | Texte | Fonction |
| `fichier_pdf` | URL | PDF généré |
| `statut` | Enum | brouillon/delivree/annulee |

**Table `formation_attestation_competences`** (nouvelle) :

| Champ | Type | Description |
|-------|------|-------------|
| `attestation_id` | Référence | Attestation |
| `competence_id` | Référence | Compétence attestée |
| `domaine` | Texte | Domaine de la compétence |
| `niveau_atteint` | Texte | Profil/niveau atteint |

### 9.5 Numérotation

Format : `ACLEF-[ANNÉE]-[NUMÉRO SÉQUENTIEL]`

Exemple : `ACLEF-2026-0042`

### 9.6 Interface Utilisateur

**Page : `/admin/formation/attestations/nouveau`**

1. Sélection du bilan final validé
2. Vérification des critères
3. Sélection des compétences à attester
4. Informations signataire
5. Aperçu de l'attestation
6. Génération PDF
7. Enregistrement et archivage

**Page : `/admin/formation/attestations`**

1. Liste des attestations délivrées
2. Recherche par apprenant, date, numéro
3. Téléchargement PDF
4. Statistiques (nombre délivrées par période)

---

## 10. Architecture Technique

### 10.1 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15 (Pages Router), React 19 |
| Backend | API Routes Next.js |
| Base de données | PostgreSQL (Supabase) |
| Authentification | JWT + Supabase Auth |
| Stockage fichiers | Supabase Storage |
| Génération PDF | jsPDF + html2canvas ou pdfkit |
| Génération Word | docx (npm package) |

### 10.2 Nouvelles Tables à Créer

```sql
-- Table des profils référentiels
CREATE TABLE formation_profils (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,           -- ex: "A1", "GD", "M2"
    nom TEXT NOT NULL,                    -- ex: "Grand Débutant"
    type_public TEXT NOT NULL,            -- "FLE", "Illettrisme", "Maths", "Numerique"
    domaine_id UUID REFERENCES formation_domaines(id),
    degre_anlci INTEGER,                  -- 1, 2, 3 ou 4
    description TEXT,
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison compétences ↔ degrés ANLCI
ALTER TABLE formation_competences
ADD COLUMN degre_anlci INTEGER,
ADD COLUMN profil_minimum TEXT;  -- Code du profil minimum requis

-- Table des outils d'évaluation
CREATE TABLE formation_outils_evaluation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL,
    type TEXT NOT NULL,  -- "test", "auto_diagnostic", "quiz", "exercice", "grille"
    domaine_id UUID REFERENCES formation_domaines(id),
    degre INTEGER,
    profils TEXT[],
    description TEXT,
    fichier_url TEXT,
    quiz_id UUID REFERENCES quiz(id),
    duree_estimee INTEGER,  -- minutes
    consignes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table liaison compétences ↔ outils formation
CREATE TABLE formation_competences_outils (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competence_id UUID REFERENCES formation_competences(id),
    outil_type TEXT NOT NULL,
    outil_id UUID NOT NULL,
    niveau_difficulte INTEGER DEFAULT 1,
    ordre_suggere INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table détail bilan par compétence
CREATE TABLE formation_bilan_competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bilan_id UUID REFERENCES formation_bilans(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES formation_competences(id),
    statut_debut TEXT,
    statut_fin TEXT,
    score_moyen DECIMAL,
    commentaire TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des attestations
CREATE TABLE formation_attestations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT NOT NULL UNIQUE,
    apprenant_id UUID NOT NULL,
    bilan_id UUID REFERENCES formation_bilans(id),
    date_delivrance DATE NOT NULL,
    lieu_delivrance TEXT,
    signataire_nom TEXT,
    signataire_fonction TEXT,
    fichier_pdf TEXT,
    statut TEXT DEFAULT 'brouillon',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table détail attestation par compétence
CREATE TABLE formation_attestation_competences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attestation_id UUID REFERENCES formation_attestations(id) ON DELETE CASCADE,
    competence_id UUID REFERENCES formation_competences(id),
    domaine TEXT,
    niveau_atteint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_profils_type ON formation_profils(type_public);
CREATE INDEX idx_profils_domaine ON formation_profils(domaine_id);
CREATE INDEX idx_competences_degre ON formation_competences(degre_anlci);
CREATE INDEX idx_attestations_apprenant ON formation_attestations(apprenant_id);
CREATE INDEX idx_attestations_numero ON formation_attestations(numero);
```

### 10.3 Nouvelles API à Créer

```
/api/admin/formation/
├── profils/
│   ├── index.js         GET: liste, POST: créer
│   └── [id].js          GET, PUT, DELETE
├── outils-evaluation/
│   ├── index.js         GET: liste filtrée
│   └── [id].js          GET, PUT, DELETE
├── bilans/
│   ├── index.js         GET: liste, POST: créer
│   ├── [id].js          GET, PUT, DELETE
│   └── [id]/
│       ├── competences.js   GET, POST: compétences du bilan
│       ├── generer.js       POST: génération auto
│       └── exporter.js      GET: export PDF/Word
└── attestations/
    ├── index.js         GET: liste, POST: créer
    ├── [id].js          GET, PUT, DELETE
    ├── [id]/exporter.js GET: génération PDF
    └── prochain-numero.js GET: obtenir prochain numéro
```

### 10.4 Nouvelles Pages à Créer

```
/pages/admin/formation/
├── profils/
│   └── index.js              Gestion des profils référentiels
├── outils-evaluation/
│   ├── index.js              Liste des outils
│   └── [id].js               Détail/édition outil
├── bilans/
│   ├── index.js              Liste des bilans
│   ├── nouveau.js            Créer un bilan
│   └── [id].js               Voir/éditer bilan
└── attestations/
    ├── index.js              Liste des attestations
    ├── nouveau.js            Créer attestation
    └── [id].js               Voir attestation
```

### 10.5 Nouveaux Composants à Créer

```
/components/formation/
├── ProfilBadge.js            Affichage badge profil (A1, GD, M2...)
├── ProfilSelector.js         Sélecteur de profil cible
├── DegreProgress.js          Visualisation progression degrés
├── BilanGenerator.js         Générateur bilan semi-auto
├── BilanPreview.js           Aperçu bilan avant export
├── BilanPDFTemplate.js       Template React pour PDF bilan
├── AttestationPreview.js     Aperçu attestation
├── AttestationPDFTemplate.js Template React pour PDF attestation
├── CompetenceComparatif.js   Comparaison entrée/sortie
└── OutilEvaluationCard.js    Carte outil d'évaluation
```

---

## 11. Annexes : Référentiels

### 11.1 Référentiel des 4 Degrés ANLCI

**Source** : Document "methodologie elaboration plan de formation.pdf"

| Degré | Intitulé | Description |
|-------|----------|-------------|
| **1** | Repères structurants | Compétences permettant de se repérer dans l'univers de l'écrit |
| **2** | Compétences fonctionnelles | Compétences pour la vie courante |
| **3** | Compétences facilitant l'action | Autonomie dans les démarches |
| **4** | Compétences renforçant l'autonomie | Maîtrise approfondie |

### 11.2 Correspondance Profils ↔ Degrés

| Domaine | Degré 1 | Degré 2 | Degré 3 | Degré 4 |
|---------|---------|---------|---------|---------|
| Communication orale (FLE) | A1 | A2 | A3 | - |
| Communication orale (Illettrisme) | B1 | B2 | BA | - |
| Lecture | GD, PD | D | PLNS | LPS |
| Écriture | GD, PD | D | PLNS | LPS |
| Mathématiques | M0, M1 | M2 | M3 | M4 |
| Bureautique | Niveau 0 | Niveau 1 | Niveau 2A | Niveau 2B |
| Internet | Niveau 0 | Niveau 1 | Niveau 2 | Niveau 3 |

### 11.3 Liste des Compétences par Domaine

*À compléter avec le détail des 84+ compétences existantes dans le système*

**Lecture - 34 compétences** :
- Catégorie "Acquisition" : XX compétences
- Catégorie "Textes de référence" : XX compétences
- Catégorie "Suite" : XX compétences

**Écriture - 26 compétences** :
- ...

**Mathématiques - 24 compétences** :
- ...

---

## Validation du Cahier des Charges

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Rédacteur | Claude (IA) | 07/01/2026 | - |
| Validation métier | | | |
| Validation technique | | | |

---

*Document généré pour le projet ACLEF Pédagogie*
