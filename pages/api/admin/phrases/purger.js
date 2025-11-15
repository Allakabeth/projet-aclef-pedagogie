import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: PURGER LES PHRASES D'UNE COMBINAISON
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { texte_ids, user_id } = req.body

        if (!texte_ids || !Array.isArray(texte_ids) || texte_ids.length === 0) {
            return res.status(400).json({ error: 'Paramètre texte_ids invalide' })
        }

        if (!user_id) {
            return res.status(400).json({ error: 'Paramètre user_id manquant' })
        }

        console.log(`🗑️ Purge phrases pour user ${user_id}, textes [${texte_ids.join(', ')}]`)

        // Normaliser les IDs (tri pour correspondre au format stocké)
        const texteIdsNormalises = [...texte_ids]
            .map(id => parseInt(id))
            .sort((a, b) => a - b)

        // Supprimer toutes les phrases de cette combinaison pour cet utilisateur
        // Note: On doit filtrer manuellement car Postgres ne compare pas directement les tableaux
        // On récupère d'abord toutes les phrases de cet user
        const { data: allPhrases, error: fetchError } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('id, texte_ids')
            .eq('user_id', user_id)

        if (fetchError) {
            console.error('❌ Erreur récupération:', fetchError)
            return res.status(500).json({
                error: 'Erreur lors de la récupération',
                details: fetchError.message
            })
        }

        // Filtrer les phrases qui correspondent exactement à cette combinaison
        const phrasesToDelete = allPhrases.filter(p => {
            if (p.texte_ids.length !== texteIdsNormalises.length) return false
            const sorted = [...p.texte_ids].sort((a, b) => a - b)
            return sorted.every((id, idx) => id === texteIdsNormalises[idx])
        })

        if (phrasesToDelete.length === 0) {
            console.log('⚠️ Aucune phrase à supprimer')
            return res.status(200).json({
                success: true,
                deleted: 0,
                message: 'Aucune phrase trouvée pour cette combinaison'
            })
        }

        // Supprimer par IDs
        const idsToDelete = phrasesToDelete.map(p => p.id)
        const { data, error } = await supabaseAdmin
            .from('phrases_pregenerees')
            .delete()
            .in('id', idsToDelete)
            .select()

        if (error) {
            console.error('❌ Erreur suppression:', error)
            return res.status(500).json({
                error: 'Erreur lors de la suppression',
                details: error.message
            })
        }

        console.log(`✅ ${data.length} phrases supprimées`)

        return res.status(200).json({
            success: true,
            deleted: data.length,
            message: `${data.length} phrases supprimées avec succès`
        })

    } catch (error) {
        console.error('💥 Erreur serveur:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
