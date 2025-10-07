-- Table pour l'attribution des quiz aux apprenants
-- Permet d'assigner un quiz à un ou plusieurs apprenants

CREATE TABLE IF NOT EXISTS quiz_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Métadonnées optionnelles
    due_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Contrainte : un apprenant ne peut avoir le même quiz assigné qu'une seule fois
    UNIQUE(quiz_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_user ON quiz_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_assigned_by ON quiz_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_completed ON quiz_assignments(is_completed);

-- Commentaires
COMMENT ON TABLE quiz_assignments IS 'Attribution des quiz aux apprenants';
COMMENT ON COLUMN quiz_assignments.quiz_id IS 'ID du quiz assigné';
COMMENT ON COLUMN quiz_assignments.user_id IS 'ID de l''apprenant qui reçoit le quiz';
COMMENT ON COLUMN quiz_assignments.assigned_by IS 'ID de l''admin/salarié qui a fait l''attribution';
COMMENT ON COLUMN quiz_assignments.due_date IS 'Date limite optionnelle pour compléter le quiz';
COMMENT ON COLUMN quiz_assignments.is_completed IS 'Indique si l''apprenant a complété le quiz';
