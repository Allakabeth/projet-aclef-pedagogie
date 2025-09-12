import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken } from '../../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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
    const { id: texteId } = req.query

    console.log(`🗑️ Suppression simple texte ${texteId} pour apprenant ${apprenantId}`)

    try {
        // Vérifier que le texte appartient à l'utilisateur
        const { data: texte, error: fetchError } = await supabase
            .from('textes_references')
            .select('id, titre')
            .eq('id', texteId)
            .eq('apprenant_id', apprenantId)
            .single()

        if (fetchError || !texte) {
            return res.status(404).json({ error: 'Texte non trouvé' })
        }

        console.log(`📝 Texte trouvé: "${texte.titre}"`)

        // Supprimer directement le texte - les CASCADE devraient s'occuper du reste
        const { error: deleteError } = await supabase
            .from('textes_references')
            .delete()
            .eq('id', texteId)
            .eq('apprenant_id', apprenantId)

        if (deleteError) {
            console.error('❌ Erreur suppression:', deleteError)
            return res.status(500).json({ 
                error: 'Erreur lors de la suppression',
                details: deleteError.message 
            })
        }

        console.log(`✅ Texte "${texte.titre}" supprimé`)

        return res.status(200).json({
            success: true,
            message: `Texte "${texte.titre}" supprimé avec succès`
        })

    } catch (error) {
        console.error('💥 Erreur suppression:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur',
            details: error.message 
        })
    }
}