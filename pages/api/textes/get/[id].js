import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken } from '../../../../lib/jwt'

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
    const { id } = req.query

    try {
        // Récupérer le texte de référence
        const { data: texte, error: texteError } = await supabase
            .from('textes_references')
            .select('*')
            .eq('id', id)
            .eq('apprenant_id', apprenantId)
            .single()

        if (texteError || !texte) {
            return res.status(404).json({ error: 'Texte non trouvé' })
        }

        // Récupérer les groupes de sens
        const { data: groupes_sens, error: groupesError } = await supabase
            .from('groupes_sens')
            .select('*')
            .eq('texte_reference_id', id)
            .order('ordre_groupe')

        if (groupesError) {
            console.error('Erreur récupération groupes:', groupesError)
            return res.status(500).json({ error: 'Erreur récupération des groupes' })
        }

        return res.status(200).json({
            success: true,
            texte: texte,
            groupes_sens: groupes_sens || []
        })

    } catch (error) {
        console.error('Erreur récupération texte:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}