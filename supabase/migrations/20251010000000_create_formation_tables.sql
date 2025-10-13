-- ============================================================================
-- MIGRATION: Module Gestion de la Formation
-- Date: 2025-10-10
-- Projet: ACLEF-Pédagogie
-- Description: Système complet de gestion pédagogique (positionnement, plans,
--              suivi, bilans) basé sur les référentiels de compétences ACLEF
-- ============================================================================

-- ============================================================================
-- DOMAINES DE FORMATION (Lecture, Écriture, Mathématiques)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_domaines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL UNIQUE, -- Ex: "Lecture", "Écriture", "Mathématiques"
    emoji VARCHAR(10), -- Ex: "📖", "✍️", "🔢"
    description TEXT,
    ordre INTEGER NOT NULL, -- Ordre d'affichage
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_domaines IS 'Domaines de formation principaux (Lecture, Écriture, Mathématiques)';
COMMENT ON COLUMN formation_domaines.ordre IS 'Ordre d''affichage dans les interfaces';

-- ============================================================================
-- CATÉGORIES DE COMPÉTENCES (regroupements au sein d'un domaine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_categories_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domaine_id UUID NOT NULL REFERENCES formation_domaines(id) ON DELETE CASCADE,
    nom VARCHAR(200) NOT NULL, -- Ex: "Acquisition", "Textes références", "Suite"
    description TEXT,
    ordre INTEGER NOT NULL, -- Ordre au sein du domaine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_categories_competences IS 'Catégories de compétences au sein d''un domaine (ex: Acquisition, Textes références)';

-- ============================================================================
-- COMPÉTENCES (granularité fine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorie_id UUID NOT NULL REFERENCES formation_categories_competences(id) ON DELETE CASCADE,

    code VARCHAR(50), -- Ex: "LECT-ACQ-01", "ECR-DICT-03"
    intitule TEXT NOT NULL, -- Ex: "Connaissance lettres alphabet"
    description TEXT, -- Description détaillée de la compétence
    contexte TEXT, -- Contexte d'évaluation: "avec ses outils", "sans ses outils", etc.

    ordre INTEGER NOT NULL, -- Ordre au sein de la catégorie

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_competences IS 'Compétences détaillées à évaluer (granularité fine basée sur référentiels ACLEF)';
COMMENT ON COLUMN formation_competences.code IS 'Code unique de la compétence (optionnel)';
COMMENT ON COLUMN formation_competences.contexte IS 'Contexte d''évaluation: "avec outils", "sans outils", etc.';

-- ============================================================================
-- POSITIONNEMENTS (évaluations initiales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_positionnements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    formateur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Dates
    date_positionnement DATE DEFAULT CURRENT_DATE,

    -- Statut
    statut VARCHAR(20) DEFAULT 'en_cours', -- 'en_cours', 'termine', 'valide'

    -- Observations générales
    commentaires_generaux TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_positionnements IS 'Positionnements initiaux des apprenants (évaluation manuelle formateur)';
COMMENT ON COLUMN formation_positionnements.statut IS 'en_cours: en cours d''évaluation, termine: évaluation terminée, valide: validé par admin';

-- ============================================================================
-- ÉVALUATIONS POSITIONNEMENT (détail par compétence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_evaluations_positionnement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    positionnement_id UUID NOT NULL REFERENCES formation_positionnements(id) ON DELETE CASCADE,
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,

    -- Évaluation
    evaluation VARCHAR(20) NOT NULL, -- 'oui', 'non', 'en_cours', 'non_evalue'
    date_evaluation DATE,
    observations TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Une compétence ne peut être évaluée qu'une fois par positionnement
    UNIQUE(positionnement_id, competence_id)
);

COMMENT ON TABLE formation_evaluations_positionnement IS 'Évaluations détaillées des compétences lors d''un positionnement';
COMMENT ON COLUMN formation_evaluations_positionnement.evaluation IS 'oui: acquis, non: non acquis, en_cours: en cours d''acquisition, non_evalue: pas encore évalué';

-- ============================================================================
-- PLANS DE FORMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    formateur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    positionnement_id UUID REFERENCES formation_positionnements(id) ON DELETE SET NULL,

    -- Informations du plan
    objectif_principal TEXT NOT NULL,
    date_debut DATE DEFAULT CURRENT_DATE,
    date_fin_prevue DATE,

    -- Statut
    statut VARCHAR(20) DEFAULT 'en_cours', -- 'en_cours', 'termine', 'abandonne'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_plans IS 'Plans de formation individualisés pour chaque apprenant';
COMMENT ON COLUMN formation_plans.objectif_principal IS 'Objectif principal du plan (ex: "Atteindre autonomie en lecture")';
COMMENT ON COLUMN formation_plans.statut IS 'en_cours: actif, termine: objectifs atteints, abandonne: abandonné';

-- ============================================================================
-- COMPÉTENCES CIBLÉES DU PLAN
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_plan_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    plan_id UUID NOT NULL REFERENCES formation_plans(id) ON DELETE CASCADE,
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,

    -- Priorisation
    priorite INTEGER DEFAULT 2, -- 1=haute, 2=moyenne, 3=basse

    -- Statut
    statut VARCHAR(20) DEFAULT 'a_travailler', -- 'a_travailler', 'en_cours', 'acquis'

    -- Dates
    date_cible DATE, -- Date cible d'acquisition
    date_acquis DATE, -- Date effective d'acquisition

    -- Observations
    observations TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Une compétence ne peut être ajoutée qu'une fois par plan
    UNIQUE(plan_id, competence_id)
);

COMMENT ON TABLE formation_plan_competences IS 'Compétences ciblées à travailler dans un plan de formation';
COMMENT ON COLUMN formation_plan_competences.priorite IS '1=haute priorité, 2=moyenne, 3=basse';
COMMENT ON COLUMN formation_plan_competences.statut IS 'a_travailler: pas encore travaillé, en_cours: en cours de travail, acquis: maîtrisé';

-- ============================================================================
-- ATTRIBUTIONS EXERCICES (liaison exercices modules ↔ plan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_attributions_exercices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références plan et apprenant
    plan_id UUID NOT NULL REFERENCES formation_plans(id) ON DELETE CASCADE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type d'exercice et référence polymorphe
    type_exercice VARCHAR(50) NOT NULL, -- 'quiz', 'lire_texte', 'code_route_vocabulaire', 'imagier', etc.

    -- IDs référence selon type (un seul sera rempli)
    quiz_id UUID REFERENCES quiz(id) ON DELETE CASCADE, -- Si type='quiz'
    texte_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE, -- Si type='lire_texte'
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE, -- Si type='code_route_vocabulaire'
    -- Note: texte_id et vocabulaire_id sont INTEGER car tables existantes utilisent SERIAL

    -- Métadonnées de l'exercice
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    consignes TEXT,

    -- Compétence cible (optionnel)
    competence_cible_id UUID REFERENCES formation_competences(id) ON DELETE SET NULL,

    -- Attribution
    date_attribution TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    date_limite DATE,
    obligatoire BOOLEAN DEFAULT true,
    ordre INTEGER, -- Ordre dans le parcours

    -- Statut
    statut VARCHAR(20) DEFAULT 'attribue', -- 'attribue', 'commence', 'termine'

    -- Créé par
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_attributions_exercices IS 'Attribution d''exercices des modules existants aux apprenants dans le cadre d''un plan de formation';
COMMENT ON COLUMN formation_attributions_exercices.type_exercice IS 'Type: quiz, lire_texte, code_route_vocabulaire, imagier, etc.';
COMMENT ON COLUMN formation_attributions_exercices.quiz_id IS 'Référence vers table quiz (si type=quiz)';
COMMENT ON COLUMN formation_attributions_exercices.texte_id IS 'Référence vers textes_references (si type=lire_texte)';
COMMENT ON COLUMN formation_attributions_exercices.vocabulaire_id IS 'Référence vers vocabulaire_code_route (si type=code_route_vocabulaire)';
COMMENT ON COLUMN formation_attributions_exercices.statut IS 'attribue: pas encore commencé, commence: en cours, termine: terminé';

-- ============================================================================
-- RÉSULTATS EXERCICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_resultats_exercices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    attribution_id UUID NOT NULL REFERENCES formation_attributions_exercices(id) ON DELETE CASCADE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Dates
    date_debut TIMESTAMP WITH TIME ZONE,
    date_fin TIMESTAMP WITH TIME ZONE,

    -- Résultats
    score DECIMAL(5,2), -- Sur 100
    reussi BOOLEAN,
    temps_passe INTEGER, -- En secondes
    nombre_tentatives INTEGER DEFAULT 1,

    -- Détails (structure flexible selon type d'exercice)
    details JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_resultats_exercices IS 'Résultats des exercices effectués par les apprenants';
COMMENT ON COLUMN formation_resultats_exercices.score IS 'Score sur 100';
COMMENT ON COLUMN formation_resultats_exercices.temps_passe IS 'Temps passé en secondes';
COMMENT ON COLUMN formation_resultats_exercices.details IS 'Détails des réponses (structure JSONB flexible selon type d''exercice)';

-- ============================================================================
-- SUIVIS PÉDAGOGIQUES (observations formateur)
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_suivis_pedagogiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES formation_plans(id) ON DELETE CASCADE,
    formateur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Date et type
    date_suivi TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    type VARCHAR(50), -- 'entretien', 'observation', 'evaluation'

    -- Observations
    observations TEXT,
    points_forts TEXT,
    points_amelioration TEXT,
    actions_prevues TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_suivis_pedagogiques IS 'Suivis pédagogiques et observations des formateurs';
COMMENT ON COLUMN formation_suivis_pedagogiques.type IS 'Type de suivi: entretien, observation, evaluation';

-- ============================================================================
-- BILANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_bilans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES formation_plans(id) ON DELETE CASCADE,
    formateur_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Informations du bilan
    date_bilan DATE DEFAULT CURRENT_DATE,
    type VARCHAR(20) NOT NULL, -- 'intermediaire', 'final'

    -- Période couverte
    periode_debut DATE,
    periode_fin DATE,

    -- Synthèse
    synthese TEXT,
    competences_acquises TEXT[], -- Codes ou IDs des compétences acquises
    competences_en_cours TEXT[], -- Codes ou IDs des compétences en cours
    recommandations TEXT,

    -- Fichiers générés
    fichier_pdf TEXT, -- Chemin ou URL du PDF généré
    fichier_word TEXT, -- Chemin ou URL du Word modifiable

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE formation_bilans IS 'Bilans de formation (intermédiaires ou finaux)';
COMMENT ON COLUMN formation_bilans.type IS 'intermediaire: bilan en cours de formation, final: bilan de fin de formation';
COMMENT ON COLUMN formation_bilans.fichier_pdf IS 'Chemin ou URL du fichier PDF généré (lecture seule)';
COMMENT ON COLUMN formation_bilans.fichier_word IS 'Chemin ou URL du fichier Word modifiable (avec commentaires)';

-- ============================================================================
-- INDEX POUR PERFORMANCES
-- ============================================================================

-- Domaines
CREATE INDEX IF NOT EXISTS idx_formation_domaines_actif ON formation_domaines(actif);
CREATE INDEX IF NOT EXISTS idx_formation_domaines_ordre ON formation_domaines(ordre);

-- Catégories
CREATE INDEX IF NOT EXISTS idx_formation_categories_domaine ON formation_categories_competences(domaine_id);
CREATE INDEX IF NOT EXISTS idx_formation_categories_ordre ON formation_categories_competences(domaine_id, ordre);

-- Compétences
CREATE INDEX IF NOT EXISTS idx_formation_competences_categorie ON formation_competences(categorie_id);
CREATE INDEX IF NOT EXISTS idx_formation_competences_code ON formation_competences(code);
CREATE INDEX IF NOT EXISTS idx_formation_competences_ordre ON formation_competences(categorie_id, ordre);

-- Positionnements
CREATE INDEX IF NOT EXISTS idx_formation_positionnements_apprenant ON formation_positionnements(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_positionnements_formateur ON formation_positionnements(formateur_id);
CREATE INDEX IF NOT EXISTS idx_formation_positionnements_statut ON formation_positionnements(statut);
CREATE INDEX IF NOT EXISTS idx_formation_positionnements_date ON formation_positionnements(date_positionnement);

-- Évaluations positionnement
CREATE INDEX IF NOT EXISTS idx_formation_evaluations_positionnement ON formation_evaluations_positionnement(positionnement_id);
CREATE INDEX IF NOT EXISTS idx_formation_evaluations_competence ON formation_evaluations_positionnement(competence_id);
CREATE INDEX IF NOT EXISTS idx_formation_evaluations_eval ON formation_evaluations_positionnement(evaluation);

-- Plans
CREATE INDEX IF NOT EXISTS idx_formation_plans_apprenant ON formation_plans(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_plans_formateur ON formation_plans(formateur_id);
CREATE INDEX IF NOT EXISTS idx_formation_plans_positionnement ON formation_plans(positionnement_id);
CREATE INDEX IF NOT EXISTS idx_formation_plans_statut ON formation_plans(statut);
CREATE INDEX IF NOT EXISTS idx_formation_plans_dates ON formation_plans(date_debut, date_fin_prevue);

-- Plan compétences
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_plan ON formation_plan_competences(plan_id);
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_competence ON formation_plan_competences(competence_id);
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_statut ON formation_plan_competences(statut);
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_priorite ON formation_plan_competences(priorite);

-- Attributions exercices
CREATE INDEX IF NOT EXISTS idx_formation_attributions_plan ON formation_attributions_exercices(plan_id);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_apprenant ON formation_attributions_exercices(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_type ON formation_attributions_exercices(type_exercice);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_statut ON formation_attributions_exercices(statut);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_competence ON formation_attributions_exercices(competence_cible_id);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_quiz ON formation_attributions_exercices(quiz_id);
CREATE INDEX IF NOT EXISTS idx_formation_attributions_texte ON formation_attributions_exercices(texte_id);

-- Résultats exercices
CREATE INDEX IF NOT EXISTS idx_formation_resultats_attribution ON formation_resultats_exercices(attribution_id);
CREATE INDEX IF NOT EXISTS idx_formation_resultats_apprenant ON formation_resultats_exercices(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_resultats_dates ON formation_resultats_exercices(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_formation_resultats_reussi ON formation_resultats_exercices(reussi);

-- Suivis pédagogiques
CREATE INDEX IF NOT EXISTS idx_formation_suivis_apprenant ON formation_suivis_pedagogiques(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_suivis_plan ON formation_suivis_pedagogiques(plan_id);
CREATE INDEX IF NOT EXISTS idx_formation_suivis_formateur ON formation_suivis_pedagogiques(formateur_id);
CREATE INDEX IF NOT EXISTS idx_formation_suivis_date ON formation_suivis_pedagogiques(date_suivi);
CREATE INDEX IF NOT EXISTS idx_formation_suivis_type ON formation_suivis_pedagogiques(type);

-- Bilans
CREATE INDEX IF NOT EXISTS idx_formation_bilans_apprenant ON formation_bilans(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_bilans_plan ON formation_bilans(plan_id);
CREATE INDEX IF NOT EXISTS idx_formation_bilans_formateur ON formation_bilans(formateur_id);
CREATE INDEX IF NOT EXISTS idx_formation_bilans_type ON formation_bilans(type);
CREATE INDEX IF NOT EXISTS idx_formation_bilans_date ON formation_bilans(date_bilan);

-- ============================================================================
-- TRIGGERS POUR UPDATED_AT
-- ============================================================================

-- Function pour update automatique de updated_at
CREATE OR REPLACE FUNCTION update_formation_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour toutes les tables avec updated_at

-- Domaines
DROP TRIGGER IF EXISTS update_formation_domaines_updated_at ON formation_domaines;
CREATE TRIGGER update_formation_domaines_updated_at
    BEFORE UPDATE ON formation_domaines
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Catégories
DROP TRIGGER IF EXISTS update_formation_categories_updated_at ON formation_categories_competences;
CREATE TRIGGER update_formation_categories_updated_at
    BEFORE UPDATE ON formation_categories_competences
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Compétences
DROP TRIGGER IF EXISTS update_formation_competences_updated_at ON formation_competences;
CREATE TRIGGER update_formation_competences_updated_at
    BEFORE UPDATE ON formation_competences
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Positionnements
DROP TRIGGER IF EXISTS update_formation_positionnements_updated_at ON formation_positionnements;
CREATE TRIGGER update_formation_positionnements_updated_at
    BEFORE UPDATE ON formation_positionnements
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Évaluations positionnement
DROP TRIGGER IF EXISTS update_formation_evaluations_updated_at ON formation_evaluations_positionnement;
CREATE TRIGGER update_formation_evaluations_updated_at
    BEFORE UPDATE ON formation_evaluations_positionnement
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Plans
DROP TRIGGER IF EXISTS update_formation_plans_updated_at ON formation_plans;
CREATE TRIGGER update_formation_plans_updated_at
    BEFORE UPDATE ON formation_plans
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Plan compétences
DROP TRIGGER IF EXISTS update_formation_plan_competences_updated_at ON formation_plan_competences;
CREATE TRIGGER update_formation_plan_competences_updated_at
    BEFORE UPDATE ON formation_plan_competences
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Attributions exercices
DROP TRIGGER IF EXISTS update_formation_attributions_updated_at ON formation_attributions_exercices;
CREATE TRIGGER update_formation_attributions_updated_at
    BEFORE UPDATE ON formation_attributions_exercices
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- Bilans
DROP TRIGGER IF EXISTS update_formation_bilans_updated_at ON formation_bilans;
CREATE TRIGGER update_formation_bilans_updated_at
    BEFORE UPDATE ON formation_bilans
    FOR EACH ROW EXECUTE FUNCTION update_formation_updated_at_column();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

-- Confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration 20251010000000_create_formation_tables.sql appliquée avec succès';
    RAISE NOTICE '11 tables créées avec préfixe formation_';
    RAISE NOTICE 'Index de performance créés';
    RAISE NOTICE 'Triggers updated_at configurés';
END $$;
