import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { verifyToken } from '../../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

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
        // Récupérer l'enregistrement pour vérifier qu'il appartient à l'apprenant
        const { data: record, error: fetchError } = await supabaseAdmin
            .from('enregistrements_syllabes')
            .select('id, apprenant_id, audio_urls')
            .eq('id', id)
            .eq('apprenant_id', apprenantId)
            .single()

        if (fetchError || !record) {
            return res.status(404).json({ error: 'Enregistrement non trouvé' })
        }

        // Supprimer les fichiers audio du Storage
        if (record.audio_urls) {
            for (const audioUrl of record.audio_urls) {
                if (!audioUrl) continue
                const urlParts = audioUrl.split('/storage/v1/object/')
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1].split('?')[0]
                    const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')
                    await supabaseAdmin.storage
                        .from('enregistrements-audio')
                        .remove([pathWithoutBucket])
                }
            }
        }

        // Supprimer l'enregistrement en base
        const { error: deleteError } = await supabaseAdmin
            .from('enregistrements_syllabes')
            .delete()
            .eq('id', id)

        if (deleteError) {
            return res.status(500).json({ error: 'Erreur suppression', details: deleteError.message })
        }

        return res.status(200).json({ success: true })

    } catch (error) {
        console.error('Erreur suppression enregistrement syllabe:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
