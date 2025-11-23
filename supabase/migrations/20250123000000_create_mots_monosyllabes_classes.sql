-- Table pour sauvegarder les mots monosyllabes classés par lettre (A-Z + 🗑️)
CREATE TABLE IF NOT EXISTS mots_monosyllabes_classes (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    lettre_panier VARCHAR(10) NOT NULL,
    mots TEXT[] NOT NULL,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_mots_mono_apprenant ON mots_monosyllabes_classes(apprenant_id);
CREATE INDEX idx_mots_mono_texte ON mots_monosyllabes_classes(texte_id);
CREATE INDEX idx_mots_mono_lettre ON mots_monosyllabes_classes(lettre_panier);

-- Commentaires
COMMENT ON TABLE mots_monosyllabes_classes IS 'Stockage des mots monosyllabes classés par première lettre dans l''exercice Classement';
COMMENT ON COLUMN mots_monosyllabes_classes.lettre_panier IS 'Lettre du panier (A-Z) ou 🗑️ pour caractères spéciaux';
COMMENT ON COLUMN mots_monosyllabes_classes.mots IS 'Array des mots monosyllabes classés dans ce panier';
