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
        console.log(`📊 Calcul des statistiques pour l'apprenant ${apprenantId}`)

        // D'abord récupérer les IDs des textes de l'utilisateur
        const { data: textesUser, error: errorTextesUser } = await supabase
            .from('textes_references')
            .select('id')
            .eq('apprenant_id', apprenantId)

        if (errorTextesUser) {
            console.error('❌ Erreur récupération textes user:', errorTextesUser)
            return res.status(500).json({ 
                error: 'Erreur lors du calcul des statistiques',
                details: errorTextesUser.message 
            })
        }

        const textesIds = textesUser?.map(t => t.id) || []

        // Compter le nombre total de mots différents dans tous les textes
        let motsDifferents = []
        let errorMots = null

        if (textesIds.length > 0) {
            const { data: motsData, error: motsError } = await supabase
                .from('mots_extraits')
                .select('mot_normalise')
                .in('texte_reference_id', textesIds)
            
            motsDifferents = motsData
            errorMots = motsError
        }

        if (errorMots) {
            console.error('❌ Erreur récupération mots:', errorMots)
            return res.status(500).json({ 
                error: 'Erreur lors du calcul des statistiques',
                details: errorMots.message 
            })
        }

        // Compter les mots uniques
        const motsUniques = new Set()
        if (motsDifferents) {
            motsDifferents.forEach(mot => {
                if (mot.mot_normalise) {
                    motsUniques.add(mot.mot_normalise)
                }
            })
        }

        // Le nombre de textes est déjà dans textesUser

        const stats = {
            nombre_textes: textesUser?.length || 0,
            nombre_mots_differents: motsUniques.size,
            derniere_mise_a_jour: new Date().toISOString()
        }

        console.log(`✅ Statistiques calculées:`, stats)

        return res.status(200).json({
            success: true,
            stats: stats
        })

    } catch (error) {
        console.error('💥 Erreur inattendue calcul stats:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur lors du calcul des statistiques',
            details: error.message 
        })
    }
}