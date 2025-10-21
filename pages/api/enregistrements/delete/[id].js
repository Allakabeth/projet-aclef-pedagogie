import { supabase } from '../../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { verifyToken } from '../../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // ========================================================================
    // 1. VÉRIFICATION AUTHENTIFICATION
    // ========================================================================

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

    // ========================================================================
    // 2. RÉCUPÉRER L'ID DEPUIS LA ROUTE
    // ========================================================================

    const { id } = req.query

    if (!id) {
        return res.status(400).json({ error: 'ID requis' })
    }

    const enregistrementId = parseInt(id)

    if (isNaN(enregistrementId)) {
        return res.status(400).json({ error: 'ID doit être un nombre' })
    }

    try {
        console.log(`🗑️ Suppression enregistrement ${enregistrementId} par apprenant ${apprenantId}`)

        // ====================================================================
        // 3. VÉRIFIER QUE L'ENREGISTREMENT EXISTE ET APPARTIENT À L'APPRENANT
        // ====================================================================

        const { data: enregistrement, error: fetchError } = await supabaseAdmin
            .from('enregistrements_groupes')
            .select('*')
            .eq('id', enregistrementId)
            .eq('apprenant_id', apprenantId)
            .single()

        if (fetchError || !enregistrement) {
            console.error('❌ Enregistrement non trouvé:', fetchError)
            return res.status(404).json({
                error: 'Enregistrement non trouvé ou accès non autorisé'
            })
        }

        console.log('✅ Enregistrement trouvé:', enregistrement.audio_url)

        // ====================================================================
        // 4. SUPPRIMER LE FICHIER DU STORAGE
        // ====================================================================

        // Extraire le chemin depuis l'URL
        const urlParts = enregistrement.audio_url.split('/storage/v1/object/')
        if (urlParts.length > 1) {
            const storagePath = urlParts[1].split('?')[0] // Enlever query params
            const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

            console.log('🗑️ Suppression fichier Storage:', pathWithoutBucket)

            const { error: deleteStorageError } = await supabaseAdmin.storage
                .from('enregistrements-audio')
                .remove([pathWithoutBucket])

            if (deleteStorageError) {
                console.error('⚠️ Erreur suppression fichier Storage:', deleteStorageError)
                // On continue quand même pour supprimer l'entrée BDD
            } else {
                console.log('✅ Fichier Storage supprimé')
            }
        }

        // ====================================================================
        // 5. SUPPRIMER L'ENTRÉE DE LA BASE DE DONNÉES
        // ====================================================================

        const { error: deleteDbError } = await supabaseAdmin
            .from('enregistrements_groupes')
            .delete()
            .eq('id', enregistrementId)
            .eq('apprenant_id', apprenantId) // Sécurité supplémentaire

        if (deleteDbError) {
            console.error('❌ Erreur suppression BDD:', deleteDbError)
            return res.status(500).json({
                error: 'Erreur lors de la suppression de l\'enregistrement',
                details: deleteDbError.message
            })
        }

        console.log('✅ Enregistrement supprimé de la BDD')

        // ====================================================================
        // 6. RETOURNER LE SUCCÈS
        // ====================================================================

        return res.status(200).json({
            success: true,
            message: 'Enregistrement supprimé avec succès',
            deleted_id: enregistrementId
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
