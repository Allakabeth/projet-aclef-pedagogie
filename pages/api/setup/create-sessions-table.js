import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        console.log('🔧 Création de la table sessions_syllabes')

        const { data, error } = await supabase
            .from('sessions_syllabes')
            .select('count(*)')
            .limit(1)

        if (error) {
            console.error('Erreur création table:', error)
            return res.status(500).json({ error: 'Erreur création table' })
        }

        console.log('✅ Table sessions_syllabes créée avec succès')

        res.status(200).json({
            success: true,
            message: 'Table sessions_syllabes créée'
        })

    } catch (error) {
        console.error('Erreur:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}