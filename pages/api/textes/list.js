import { supabase } from '../../../lib/supabaseClient'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier le token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || (!payload.apprenant_id && !payload.id)) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    const apprenantId = payload.apprenant_id || payload.id

    try {
        // Récupérer les textes de référence de l'apprenant
        const { data: textes, error } = await supabase
            .from('textes_references')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erreur récupération textes:', error)
            return res.status(500).json({ error: 'Erreur récupération des textes' })
        }

        return res.status(200).json({
            success: true,
            textes: textes || []
        })

    } catch (error) {
        console.error('Erreur liste textes:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}