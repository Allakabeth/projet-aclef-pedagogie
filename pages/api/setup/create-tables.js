import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        console.log('🔧 Création des tables pour les textes de référence...')

        // 1. Créer la table textes_references
        const createTextesReferencesQuery = `
            CREATE TABLE IF NOT EXISTS textes_references (
                id SERIAL PRIMARY KEY,
                titre VARCHAR(255) NOT NULL,
                apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                nombre_groupes INTEGER DEFAULT 0,
                nombre_mots_total INTEGER DEFAULT 0,
                nombre_mots_multi_syllabes INTEGER DEFAULT 0
            );
        `

        const { error: error1 } = await supabase.rpc('exec_sql', { 
            query: createTextesReferencesQuery 
        })

        if (error1) {
            console.log('Tentative alternative pour textes_references...')
            // Méthode alternative si RPC n'existe pas
            await supabase.from('textes_references').select('id').limit(1)
        }

        // 2. Créer la table groupes_sens  
        const createGroupeSensQuery = `
            CREATE TABLE IF NOT EXISTS groupes_sens (
                id SERIAL PRIMARY KEY,
                texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
                ordre_groupe INTEGER NOT NULL,
                contenu TEXT NOT NULL,
                type_groupe VARCHAR(20) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        const { error: error2 } = await supabase.rpc('exec_sql', { 
            query: createGroupeSensQuery 
        })

        // 3. Créer la table mots_extraits
        const createMotsExtraitsQuery = `
            CREATE TABLE IF NOT EXISTS mots_extraits (
                id SERIAL PRIMARY KEY,
                texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
                groupe_sens_id INTEGER REFERENCES groupes_sens(id) ON DELETE CASCADE,
                mot VARCHAR(100) NOT NULL,
                mot_normalise VARCHAR(100) NOT NULL,
                nombre_syllabes INTEGER NOT NULL,
                position_dans_groupe INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        const { error: error3 } = await supabase.rpc('exec_sql', { 
            query: createMotsExtraitsQuery 
        })

        // 4. Créer la table syllabes_mots (monosyllabes complets)
        const createSyllabesMotsQuery = `
            CREATE TABLE IF NOT EXISTS syllabes_mots (
                id SERIAL PRIMARY KEY,
                texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
                mot_complet VARCHAR(50) NOT NULL,
                mot_normalise VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        const { error: error4 } = await supabase.rpc('exec_sql', { 
            query: createSyllabesMotsQuery 
        })

        // 5. Créer la table syllabes (morceaux des polysyllabes)
        const createSyllabesQuery = `
            CREATE TABLE IF NOT EXISTS syllabes (
                id SERIAL PRIMARY KEY,
                mot_extrait_id INTEGER REFERENCES mots_extraits(id) ON DELETE CASCADE,
                syllabe VARCHAR(50) NOT NULL,
                position_syllabe INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `

        const { error: error5 } = await supabase.rpc('exec_sql', { 
            query: createSyllabesQuery 
        })

        // 6. Créer les index
        const createIndexQuery = `
            CREATE INDEX IF NOT EXISTS idx_textes_references_apprenant ON textes_references(apprenant_id);
            CREATE INDEX IF NOT EXISTS idx_groupes_sens_texte ON groupes_sens(texte_reference_id, ordre_groupe);
            CREATE INDEX IF NOT EXISTS idx_mots_extraits_texte ON mots_extraits(texte_reference_id);
            CREATE INDEX IF NOT EXISTS idx_mots_extraits_mot ON mots_extraits(mot_normalise);
            CREATE INDEX IF NOT EXISTS idx_syllabes_mots_texte ON syllabes_mots(texte_reference_id);
            CREATE INDEX IF NOT EXISTS idx_syllabes_mot ON syllabes(mot_extrait_id, position_syllabe);
        `

        const { error: error6 } = await supabase.rpc('exec_sql', { 
            query: createIndexQuery 
        })

        console.log('✅ Tables créées avec succès !')

        return res.status(200).json({
            success: true,
            message: 'Tables créées avec succès !',
            tables: [
                'textes_references',
                'groupes_sens', 
                'mots_extraits',
                'syllabes_mots',
                'syllabes'
            ]
        })

    } catch (error) {
        console.error('❌ Erreur création tables:', error)
        
        // Instructions manuelles si l'API échoue
        const sqlScript = `
-- Tables pour les textes de référence
CREATE TABLE IF NOT EXISTS textes_references (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    nombre_groupes INTEGER DEFAULT 0,
    nombre_mots_total INTEGER DEFAULT 0,
    nombre_mots_multi_syllabes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS groupes_sens (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    ordre_groupe INTEGER NOT NULL,
    contenu TEXT NOT NULL,
    type_groupe VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mots_extraits (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    groupe_sens_id INTEGER REFERENCES groupes_sens(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL,
    nombre_syllabes INTEGER NOT NULL,
    position_dans_groupe INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des syllabes-mots (mots monosyllabiques complets)
CREATE TABLE IF NOT EXISTS syllabes_mots (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    mot_complet VARCHAR(50) NOT NULL,
    mot_normalise VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des syllabes (morceaux des mots polysyllabiques)
CREATE TABLE IF NOT EXISTS syllabes (
    id SERIAL PRIMARY KEY,
    mot_extrait_id INTEGER REFERENCES mots_extraits(id) ON DELETE CASCADE,
    syllabe VARCHAR(50) NOT NULL,
    position_syllabe INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_textes_references_apprenant ON textes_references(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_groupes_sens_texte ON groupes_sens(texte_reference_id, ordre_groupe);
CREATE INDEX IF NOT EXISTS idx_mots_extraits_texte ON mots_extraits(texte_reference_id);
CREATE INDEX IF NOT EXISTS idx_mots_extraits_mot ON mots_extraits(mot_normalise);
CREATE INDEX IF NOT EXISTS idx_syllabes_mots_texte ON syllabes_mots(texte_reference_id);
CREATE INDEX IF NOT EXISTS idx_syllabes_mot ON syllabes(mot_extrait_id, position_syllabe);
        `

        return res.status(500).json({
            error: 'Impossible de créer les tables automatiquement',
            message: 'Veuillez exécuter ce script SQL manuellement dans Supabase',
            sqlScript: sqlScript,
            instructions: [
                '1. Allez dans votre dashboard Supabase',
                '2. Cliquez sur "SQL Editor"', 
                '3. Collez le script SQL fourni',
                '4. Cliquez sur "Run" pour exécuter'
            ]
        })
    }
}