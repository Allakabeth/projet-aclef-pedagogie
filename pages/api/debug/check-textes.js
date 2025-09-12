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

    if (!payload) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    const apprenantId = payload.apprenant_id || payload.id

    try {
        console.log('🔍 Debug - Recherche des textes pour apprenant_id:', apprenantId)
        console.log('🔍 Debug - Type de apprenant_id:', typeof apprenantId)

        // Récupérer TOUS les textes pour debug
        const { data: allTextes, error: allError } = await supabase
            .from('textes_references')
            .select('*')

        if (allError) {
            console.error('Erreur récupération tous les textes:', allError)
        } else {
            console.log('📚 Tous les textes dans la base:', allTextes)
        }

        // Récupérer les textes de cet apprenant
        const { data: userTextes, error: userError } = await supabase
            .from('textes_references')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('created_at', { ascending: false })

        if (userError) {
            console.error('Erreur récupération textes utilisateur:', userError)
            return res.status(500).json({ 
                error: 'Erreur récupération des textes',
                details: userError 
            })
        }

        return res.status(200).json({
            success: true,
            debug: {
                apprenant_id: apprenantId,
                apprenant_id_type: typeof apprenantId,
                nombre_textes_total: allTextes ? allTextes.length : 0,
                nombre_textes_utilisateur: userTextes ? userTextes.length : 0,
                tous_les_textes: allTextes || [],
                textes_utilisateur: userTextes || []
            }
        })

    } catch (error) {
        console.error('Erreur debug textes:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur',
            details: error.message
        })
    }
}