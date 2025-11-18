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

    try {
        console.log(`📊 Récupération segmentations syllabes pour apprenant ${apprenantId}`)

        // ====================================================================
        // 2. RÉCUPÉRER TOUTES LES SEGMENTATIONS DE L'APPRENANT
        // ====================================================================

        const { data: segmentations, error } = await supabaseAdmin
            .from('enregistrements_syllabes')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('mot', { ascending: true })

        if (error) {
            console.error('❌ Erreur récupération segmentations:', error)
            return res.status(500).json({
                error: 'Erreur lors de la récupération des segmentations',
                details: error.message
            })
        }

        console.log(`✅ ${segmentations?.length || 0} segmentation(s) trouvée(s)`)

        // ====================================================================
        // 3. GÉNÉRER DES URLs SIGNÉES FRAÎCHES POUR TOUS LES AUDIOS
        // ====================================================================

        const segmentationsWithSignedUrls = await Promise.all(
            (segmentations || []).map(async (seg) => {
                // Régénérer URLs signées pour chaque syllabe
                const freshAudioUrls = await Promise.all(
                    (seg.audio_urls || []).map(async (audioUrl, index) => {
                        // Extraire le chemin depuis l'URL
                        const urlParts = audioUrl.split('/storage/v1/object/')
                        if (urlParts.length < 2) {
                            console.warn('⚠️ Format URL invalide:', audioUrl)
                            return audioUrl // Retourner l'URL originale
                        }

                        const storagePath = urlParts[1].split('?')[0]
                        const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

                        // Générer nouvelle URL signée (expire dans 1 heure)
                        const { data: urlData, error: urlError } = await supabaseAdmin.storage
                            .from('enregistrements-audio')
                            .createSignedUrl(pathWithoutBucket, 3600) // 1 heure

                        if (urlError) {
                            console.error(`⚠️ Erreur génération URL syllabe ${index + 1}:`, urlError)
                            return audioUrl // Retourner l'ancienne URL
                        }

                        return urlData.signedUrl
                    })
                )

                return {
                    ...seg,
                    audio_urls: freshAudioUrls
                }
            })
        )

        // ====================================================================
        // 4. CRÉER UN INDEX PAR MOT_NORMALISE POUR ACCÈS RAPIDE
        // ====================================================================

        const segmentationsMap = {}
        segmentationsWithSignedUrls.forEach(seg => {
            segmentationsMap[seg.mot_normalise] = {
                mot: seg.mot,
                segmentation: seg.segmentation_personnalisee,
                audio_urls: seg.audio_urls,
                id: seg.id,
                created_at: seg.created_at,
                updated_at: seg.updated_at
            }
        })

        // ====================================================================
        // 5. RETOURNER LA LISTE
        // ====================================================================

        return res.status(200).json({
            success: true,
            segmentations: segmentationsWithSignedUrls,
            segmentationsMap: segmentationsMap, // Pour accès rapide côté client
            count: segmentationsWithSignedUrls.length
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
