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
        console.log(`📊 Récupération enregistrements mots pour apprenant ${apprenantId}`)

        // ====================================================================
        // 2. RÉCUPÉRER TOUS LES ENREGISTREMENTS DE L'APPRENANT
        // ====================================================================

        const { data: enregistrements, error } = await supabaseAdmin
            .from('enregistrements_mots')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('mot', { ascending: true })

        if (error) {
            console.error('❌ Erreur récupération enregistrements:', error)
            return res.status(500).json({
                error: 'Erreur lors de la récupération des enregistrements',
                details: error.message
            })
        }

        console.log(`✅ ${enregistrements?.length || 0} enregistrement(s) trouvé(s)`)

        // ====================================================================
        // 3. GÉNÉRER DES URLs SIGNÉES FRAÎCHES (expire dans 1 heure)
        // ====================================================================

        const enregistrementsWithSignedUrls = await Promise.all(
            (enregistrements || []).map(async (enreg) => {
                // Reconstruire le chemin avec le même sanitization que l'upload
                const motSanitized = enreg.mot
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
                    .replace(/[^a-z0-9]/g, '_') // Remplacer caractères spéciaux par underscore

                const pathWithoutBucket = `mots/apprenant_${apprenantId}/${motSanitized}.webm`

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
            })
        )

        // ====================================================================
        // 4. CRÉER UN INDEX PAR MOT POUR ACCÈS RAPIDE
        // ====================================================================

        const enregistrementsMap = {}
        enregistrementsWithSignedUrls.forEach(enreg => {
            enregistrementsMap[enreg.mot] = enreg
        })

        // ====================================================================
        // 5. RETOURNER LA LISTE
        // ====================================================================

        return res.status(200).json({
            success: true,
            enregistrements: enregistrementsWithSignedUrls,
            enregistrementsMap: enregistrementsMap, // Pour accès rapide côté client
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
