import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const { texteId } = req.query

        // Récupérer les monosyllabes de ce texte
        const { data: syllabesMots, error } = await supabase
            .from('syllabes_mots')
            .select('mot_complet, mot_normalise')
            .eq('texte_reference_id', texteId)
            .order('mot_complet')

        if (error) {
            console.error('Erreur récupération syllabes-mots:', error)
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        // Enlever les doublons et ne garder que les mots complets
        const motsUniques = [...new Set(syllabesMots.map(s => s.mot_complet))]

        res.status(200).json({
            success: true,
            monosyllabes: motsUniques,
            count: motsUniques.length
        })

    } catch (error) {
        console.error('Erreur API syllabes-mots:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}