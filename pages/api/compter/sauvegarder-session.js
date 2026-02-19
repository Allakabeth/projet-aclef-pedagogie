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
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const userId = decoded.id
        const { exercice, mode, score, duree_secondes, termine, session_data } = req.body

        if (!exercice || !mode) {
            return res.status(400).json({ error: 'exercice et mode requis' })
        }

        const { data: session, error } = await supabase
            .from('compter_sessions')
            .insert({
                user_id: userId,
                exercice,
                mode,
                score: score || 0,
                duree_secondes: duree_secondes || 0,
                termine: termine || false,
                session_data: session_data || {}
            })
            .select()
            .single()

        if (error) {
            console.error('Erreur sauvegarde session compter:', error)
            return res.status(500).json({ error: 'Erreur sauvegarde session' })
        }

        res.status(200).json({ success: true, session })

    } catch (error) {
        console.error('Erreur serveur:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}
