import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: RÉCUPÉRER LES MOTS DISPONIBLES POUR UNE COMBINAISON
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { user_id, texte_ids } = req.query

        if (!user_id) {
            return res.status(400).json({ error: 'Paramètre user_id manquant' })
        }

        if (!texte_ids) {
            return res.status(400).json({ error: 'Paramètre texte_ids manquant' })
        }

        // Parser les texte_ids (format: "1,2,3")
        const texteIdsArray = texte_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))

        if (texteIdsArray.length === 0) {
            return res.status(400).json({ error: 'texte_ids invalide' })
        }

        // Récupérer les mots de la table mots_classifies
        const { data: motsData, error } = await supabaseAdmin
            .from('mots_classifies')
            .select('mot, classification')
            .in('texte_reference_id', texteIdsArray)
            .eq('apprenant_id', user_id)

        if (error) {
            console.error('Erreur récupération mots:', error)
            return res.status(500).json({ error: 'Erreur récupération mots' })
        }

        // Éliminer les doublons et trier
        const motsUniques = [...new Set((motsData || []).map(m => m.mot.toLowerCase()))]
            .sort((a, b) => a.localeCompare(b, 'fr'))

        return res.status(200).json({
            success: true,
            mots: motsUniques,
            total: motsUniques.length
        })

    } catch (error) {
        console.error('Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
