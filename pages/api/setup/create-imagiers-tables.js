import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        console.log('Création des tables imagiers...')

        // Test de connexion d'abord
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('id')
            .limit(1)

        if (testError) {
            console.error('Erreur connexion Supabase:', testError)
            return res.status(500).json({ error: 'Erreur connexion base de données' })
        }

        // Essayer de créer les tables avec une requête simple
        try {
            // Créer d'abord la table imagiers
            await supabase.from('imagiers').select('*').limit(1)
        } catch {
            // La table n'existe pas, essayons de la créer via une insertion test
            console.log('Table imagiers n\'existe pas encore')
        }

        res.status(200).json({
            message: 'Vérification des tables imagiers terminée. Utilisez l\'interface Supabase pour créer les tables manuellement.',
            sql: `
-- Table imagiers
CREATE TABLE IF NOT EXISTS imagiers (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    theme VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table imagier_elements
CREATE TABLE IF NOT EXISTS imagier_elements (
    id SERIAL PRIMARY KEY,
    imagier_id INTEGER NOT NULL REFERENCES imagiers(id) ON DELETE CASCADE,
    mot VARCHAR(255) NOT NULL,
    image_url TEXT,
    commentaire TEXT,
    question TEXT,
    reponse TEXT,
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_imagiers_created_by ON imagiers(created_by);
CREATE INDEX IF NOT EXISTS idx_imagiers_theme ON imagiers(theme);
CREATE INDEX IF NOT EXISTS idx_imagier_elements_imagier_id ON imagier_elements(imagier_id);
CREATE INDEX IF NOT EXISTS idx_imagier_elements_ordre ON imagier_elements(imagier_id, ordre);
            `
        })

    } catch (error) {
        console.error('Erreur:', error)
        res.status(500).json({ error: 'Erreur serveur', details: error.message })
    }
}