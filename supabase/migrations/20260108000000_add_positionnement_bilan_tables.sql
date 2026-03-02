-- ============================================================================
-- MIGRATION: Extension Positionnement, Bilans et Attestations
-- Date: 2026-01-08
-- Projet: ACLEF-Pédagogie
-- ============================================================================

-- 1. TABLE PROFILS DE RÉFÉRENCE
CREATE TABLE IF NOT EXISTS formation_profils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    type_public VARCHAR(50) NOT NULL,
    domaine_id UUID REFERENCES formation_domaines(id) ON DELETE SET NULL,
    degre_anlci INTEGER,
    description TEXT,
    caracteristiques TEXT,
    besoins_formation TEXT,
    ordre INTEGER DEFAULT 0,
    couleur VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(type_public, code)
);

-- 2. TABLE MODULES DU PLAN
CREATE TABLE IF NOT EXISTS formation_plan_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES formation_plans(id) ON DELETE CASCADE,
    domaine_id UUID NOT NULL REFERENCES formation_domaines(id) ON DELETE CASCADE,
    profil_initial_id UUID REFERENCES formation_profils(id) ON DELETE SET NULL,
    profil_cible_id UUID REFERENCES formation_profils(id) ON DELETE SET NULL,
    profil_atteint_id UUID REFERENCES formation_profils(id) ON DELETE SET NULL,
    duree_estimee DECIMAL(6,1),
    duree_realisee DECIMAL(6,1) DEFAULT 0,
    priorite INTEGER DEFAULT 2,
    statut VARCHAR(20) DEFAULT 'a_travailler',
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(plan_id, domaine_id)
);

-- 3. TABLE DÉTAIL BILAN PAR COMPÉTENCE
CREATE TABLE IF NOT EXISTS formation_bilan_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bilan_id UUID NOT NULL REFERENCES formation_bilans(id) ON DELETE CASCADE,
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,
    statut_debut VARCHAR(20),
    statut_fin VARCHAR(20),
    score_moyen DECIMAL(5,2),
    nombre_exercices INTEGER DEFAULT 0,
    commentaire TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(bilan_id, competence_id)
);

-- 4. TABLE ATTESTATIONS
CREATE TABLE IF NOT EXISTS formation_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL UNIQUE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bilan_id UUID REFERENCES formation_bilans(id) ON DELETE SET NULL,
    date_delivrance DATE NOT NULL DEFAULT CURRENT_DATE,
    lieu_delivrance VARCHAR(100),
    signataire_nom VARCHAR(200),
    signataire_fonction VARCHAR(100),
    fichier_pdf TEXT,
    statut VARCHAR(20) DEFAULT 'brouillon',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. TABLE COMPÉTENCES ATTESTÉES
CREATE TABLE IF NOT EXISTS formation_attestation_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attestation_id UUID NOT NULL REFERENCES formation_attestations(id) ON DELETE CASCADE,
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,
    domaine_nom VARCHAR(100),
    niveau_atteint VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(attestation_id, competence_id)
);

-- 6. TABLE OUTILS D'ÉVALUATION
CREATE TABLE IF NOT EXISTS formation_outils_evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    domaine_id UUID REFERENCES formation_domaines(id) ON DELETE SET NULL,
    degre INTEGER,
    profils_cibles TEXT[],
    description TEXT,
    consignes TEXT,
    fichier_url TEXT,
    quiz_id UUID REFERENCES quiz(id) ON DELETE SET NULL,
    duree_estimee INTEGER,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. AJOUT COLONNES À formation_competences
ALTER TABLE formation_competences
ADD COLUMN IF NOT EXISTS degre_anlci INTEGER,
ADD COLUMN IF NOT EXISTS profil_minimum_id UUID REFERENCES formation_profils(id) ON DELETE SET NULL;

-- 8. AJOUT COLONNE À formation_positionnements
ALTER TABLE formation_positionnements
ADD COLUMN IF NOT EXISTS profils_detectes JSONB DEFAULT '{}';

-- 9. AJOUT COLONNES À formation_bilans
ALTER TABLE formation_bilans
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'brouillon',
ADD COLUMN IF NOT EXISTS duree_realisee DECIMAL(6,1);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_formation_profils_type ON formation_profils(type_public);
CREATE INDEX IF NOT EXISTS idx_formation_profils_degre ON formation_profils(degre_anlci);
CREATE INDEX IF NOT EXISTS idx_formation_plan_modules_plan ON formation_plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_formation_bilan_comp_bilan ON formation_bilan_competences(bilan_id);
CREATE INDEX IF NOT EXISTS idx_formation_attestations_apprenant ON formation_attestations(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_attestation_comp_att ON formation_attestation_competences(attestation_id);
CREATE INDEX IF NOT EXISTS idx_formation_outils_eval_type ON formation_outils_evaluation(type);
