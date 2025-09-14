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
        // Vérifier l'authentification admin
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Accès administrateur requis' })
        }

        console.log('Initialisation de la table signalements_syllabification...')

        // Créer la table
        const { error: createError } = await supabase
            .from('signalements_syllabification')
            .select('id')
            .limit(1)

        if (createError && createError.code === '42P01') {
            // La table n'existe pas, on doit la créer via SQL brut
            console.log('Table inexistante, tentative de création via SQL...')
            
            // Note: Cette méthode nécessite des permissions spéciales sur Supabase
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS signalements_syllabification (
                    id SERIAL PRIMARY KEY,
                    mot TEXT NOT NULL,
                    segmentation_utilisateur TEXT[] NOT NULL,
                    segmentation_systeme TEXT[] NOT NULL,
                    utilisateur TEXT,
                    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    traite BOOLEAN DEFAULT FALSE,
                    commentaire_admin TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_signalements_mot ON signalements_syllabification(mot);
                CREATE INDEX IF NOT EXISTS idx_signalements_traite ON signalements_syllabification(traite);
                CREATE INDEX IF NOT EXISTS idx_signalements_date ON signalements_syllabification(date_signalement);
            `

            // Tenter de créer via une fonction RPC personnalisée (nécessite configuration côté Supabase)
            const { error: rpcError } = await supabase.rpc('execute_sql', { 
                sql: createTableSQL 
            })

            if (rpcError) {
                console.error('Erreur création via RPC:', rpcError)
                return res.status(500).json({ 
                    error: 'Impossible de créer la table automatiquement. Exécutez manuellement le script SQL fourni dans create-signalements-table.sql',
                    sql: createTableSQL
                })
            }
        }

        // Vérifier que la table existe maintenant
        const { data, error: verifyError } = await supabase
            .from('signalements_syllabification')
            .select('count(*)')
            .limit(1)

        if (verifyError) {
            console.error('Erreur vérification table:', verifyError)
            return res.status(500).json({ 
                error: 'Table non accessible après création',
                details: verifyError.message
            })
        }

        console.log('✅ Table signalements_syllabification opérationnelle')

        res.status(200).json({
            success: true,
            message: 'Table de signalements initialisée avec succès'
        })

    } catch (error) {
        console.error('Erreur initialisation signalements:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}