import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification (optionnel pour setup)
        const authHeader = req.headers.authorization
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const decoded = verifyToken(token)
            if (!decoded) {
                return res.status(401).json({ error: 'Token invalide' })
            }
        }

        console.log('Création des nouvelles tables...')

        // Créer la table mots_classifies
        const { error: motsClaError } = await supabase.rpc('execute_sql', {
            sql: `
            CREATE TABLE IF NOT EXISTS mots_classifies (
                id SERIAL PRIMARY KEY,
                texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
                apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                mot VARCHAR(100) NOT NULL,
                mot_normalise VARCHAR(100) NOT NULL,
                classification VARCHAR(10) NOT NULL,
                valide_par_admin BOOLEAN DEFAULT FALSE,
                score_utilisateur INTEGER DEFAULT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                validated_at TIMESTAMP DEFAULT NULL,
                validated_by INTEGER REFERENCES users(id)
            );`
        })

        if (motsClaError) {
            console.error('Erreur création table mots_classifies:', motsClaError)
        } else {
            console.log('✅ Table mots_classifies créée')
        }

        // Créer la table corrections_demandees
        const { error: corrDemError } = await supabase.rpc('execute_sql', {
            sql: `
            CREATE TABLE IF NOT EXISTS corrections_demandees (
                id SERIAL PRIMARY KEY,
                mot_classifie_id INTEGER REFERENCES mots_classifies(id) ON DELETE CASCADE,
                demandeur_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                classification_actuelle VARCHAR(10) NOT NULL,
                correction_proposee VARCHAR(10) NOT NULL,
                raison TEXT,
                statut VARCHAR(20) DEFAULT 'en_attente',
                created_at TIMESTAMP DEFAULT NOW(),
                traite_at TIMESTAMP DEFAULT NULL,
                traite_by INTEGER REFERENCES users(id),
                commentaire_admin TEXT
            );`
        })

        if (corrDemError) {
            console.error('Erreur création table corrections_demandees:', corrDemError)
        } else {
            console.log('✅ Table corrections_demandees créée')
        }

        // Créer les index
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_mots_classifies_texte ON mots_classifies(texte_reference_id);',
            'CREATE INDEX IF NOT EXISTS idx_mots_classifies_apprenant ON mots_classifies(apprenant_id);',
            'CREATE INDEX IF NOT EXISTS idx_mots_classifies_valide ON mots_classifies(valide_par_admin);',
            'CREATE INDEX IF NOT EXISTS idx_corrections_statut ON corrections_demandees(statut);',
            'CREATE INDEX IF NOT EXISTS idx_corrections_demandeur ON corrections_demandees(demandeur_id);'
        ]

        for (const indexSql of indexes) {
            const { error: indexError } = await supabase.rpc('execute_sql', { sql: indexSql })
            if (indexError) {
                console.error('Erreur création index:', indexError)
            }
        }

        console.log('✅ Index créés')

        res.status(200).json({
            success: true,
            message: 'Nouvelles tables créées avec succès',
            tables: ['mots_classifies', 'corrections_demandees']
        })

    } catch (error) {
        console.error('Erreur création tables:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}