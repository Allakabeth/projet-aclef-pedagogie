import { supabase } from '../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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
    // 2. RÉCUPÉRER LE TEXTE_ID DEPUIS LA QUERY
    // ========================================================================

    const { texte_id } = req.query

    if (!texte_id) {
        return res.status(400).json({ error: 'texte_id requis' })
    }

    const texteId = parseInt(texte_id)

    if (isNaN(texteId)) {
        return res.status(400).json({ error: 'texte_id doit être un nombre' })
    }

    try {
        console.log(`📊 Récupération enregistrements pour texte ${texteId} - apprenant ${apprenantId}`)

        // ====================================================================
        // 3. RÉCUPÉRER LES ENREGISTREMENTS VIA LA FONCTION SQL
        // ====================================================================

        const { data: enregistrements, error } = await supabaseAdmin
            .rpc('get_enregistrements_by_texte', {
                p_texte_id: texteId,
                p_apprenant_id: apprenantId
            })

        if (error) {
            console.error('❌ Erreur récupération enregistrements:', error)
            return res.status(500).json({
                error: 'Erreur lors de la récupération des enregistrements',
                details: error.message
            })
        }

        console.log(`✅ ${enregistrements?.length || 0} enregistrement(s) trouvé(s)`)

        // ====================================================================
        // 4. GÉNÉRER DES URLs SIGNÉES FRAÎCHES (expire dans 1 heure)
        // ====================================================================

        const enregistrementsWithSignedUrls = await Promise.all(
            (enregistrements || []).map(async (enreg) => {
                // Extraire le chemin depuis l'URL existante
                const urlParts = enreg.audio_url.split('/storage/v1/object/')
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1].split('?')[0] // Enlever query params
                    const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

                    // Générer nouvelle URL signée (expire dans 1 heure)
                    const { data: urlData, error: urlError } = await supabaseAdmin.storage
                        .from('enregistrements-audio')
                        .createSignedUrl(pathWithoutBucket, 3600) // 1 heure

                    if (urlError) {
                        console.error('⚠️ Erreur génération URL signée:', urlError)
                        return enreg // Retourner l'ancienne URL
                    }

                    return {
                        ...enreg,
                        audio_url: urlData.signedUrl
                    }
                }

                return enreg
            })
        )

        // ====================================================================
        // 5. RETOURNER LA LISTE
        // ====================================================================

        return res.status(200).json({
            success: true,
            enregistrements: enregistrementsWithSignedUrls,
            count: enregistrementsWithSignedUrls.length
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
