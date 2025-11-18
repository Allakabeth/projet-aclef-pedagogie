import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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
        // ====================================================================
        // 2. VALIDATION DES DONNÉES
        // ====================================================================

        const { mot, segmentation_proposee, message_doute } = req.body

        if (!mot || !segmentation_proposee) {
            return res.status(400).json({ error: 'Mot et segmentation requis' })
        }

        if (!Array.isArray(segmentation_proposee) || segmentation_proposee.length === 0) {
            return res.status(400).json({ error: 'Segmentation doit être un array non vide' })
        }

        // Normaliser le mot
        const motNormalized = mot
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        console.log(`❓ Demande de doute - apprenant ${apprenantId} - mot: "${mot}"`)
        console.log(`   Segmentation proposée: ${segmentation_proposee.join('-')}`)

        // ====================================================================
        // 3. VÉRIFIER SI UNE DEMANDE EXISTE DÉJÀ EN ATTENTE
        // ====================================================================

        const { data: existingDemande } = await supabaseAdmin
            .from('demandes_validation_syllabes')
            .select('id, statut')
            .eq('apprenant_id', apprenantId)
            .eq('mot_normalise', motNormalized)
            .eq('statut', 'en_attente')
            .single()

        if (existingDemande) {
            return res.status(409).json({
                error: 'Une demande pour ce mot est déjà en attente de validation',
                demande_id: existingDemande.id
            })
        }

        // ====================================================================
        // 4. CRÉER LA DEMANDE
        // ====================================================================

        const { data, error } = await supabaseAdmin
            .from('demandes_validation_syllabes')
            .insert({
                apprenant_id: apprenantId,
                mot: mot.trim(),
                mot_normalise: motNormalized,
                segmentation_proposee: segmentation_proposee,
                message_doute: message_doute || null,
                statut: 'en_attente'
            })
            .select()
            .single()

        if (error) {
            console.error('❌ Erreur création demande:', error)
            return res.status(500).json({
                error: 'Erreur lors de la création de la demande',
                details: error.message
            })
        }

        console.log('✅ Demande de doute créée:', data.id)

        return res.status(201).json({
            success: true,
            message: 'Demande envoyée à l\'admin avec succès',
            demande: data
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
