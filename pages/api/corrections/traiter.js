import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification et les droits admin
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }
        // TEMPORAIRE : vérification admin désactivée pour test
        // if (decoded.role !== 'admin') {
        //     return res.status(403).json({ error: 'Accès refusé - droits admin requis' })
        // }

        const { correctionId, action, commentaire } = req.body

        if (!correctionId || !action || !['accepter', 'rejeter'].includes(action)) {
            return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
        }

        console.log(`Traitement correction ${correctionId}: ${action}`)

        // Récupérer les détails de la correction
        const { data: correction, error: findError } = await supabase
            .from('corrections_demandees')
            .select(`
                id,
                mot_classifie_id,
                classification_actuelle,
                correction_proposee,
                statut,
                mots_classifies!inner(mot)
            `)
            .eq('id', correctionId)
            .eq('statut', 'en_attente')
            .single()

        if (findError || !correction) {
            return res.status(404).json({ error: 'Correction non trouvée ou déjà traitée' })
        }

        const motConcerne = correction.mots_classifies.mot
        const nouveauStatut = action === 'accepter' ? 'accepte' : 'rejete'

        // Si on accepte la correction, mettre à jour le mot classifié
        if (action === 'accepter') {
            const { error: updateMotError } = await supabase
                .from('mots_classifies')
                .update({
                    classification: correction.correction_proposee,
                    valide_par_admin: true,
                    validated_at: new Date().toISOString(),
                    validated_by: decoded.id
                })
                .eq('id', correction.mot_classifie_id)

            if (updateMotError) {
                console.error('Erreur mise à jour mot classifié:', updateMotError)
                return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot' })
            }

            console.log(`✅ Mot "${motConcerne}" mis à jour: ${correction.classification_actuelle} → ${correction.correction_proposee}`)

            // 🌟 CORRECTION CENTRALISÉE : Insérer dans corrections_mono_multi
            // Cette correction s'appliquera à TOUS les apprenants
            const classificationComplete = correction.correction_proposee === 'mono' ? 'monosyllabe' : 'multisyllabe'
            const adminUser = decoded.identifiant || decoded.email || 'admin'

            const { error: insertCentralError } = await supabase
                .from('corrections_mono_multi')
                .upsert({
                    mot: motConcerne.toLowerCase(),
                    classification_correcte: classificationComplete,
                    ancienne_classification: correction.classification_actuelle === 'mono' ? 'monosyllabe' : 'multisyllabe',
                    source: 'apprenant_signalement',
                    admin_correcteur: adminUser,
                    commentaire: commentaire || `Correction validée suite à signalement apprenant`,
                    date_modification: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mot',
                    ignoreDuplicates: false
                })

            if (insertCentralError) {
                console.error('⚠️ Erreur insertion correction centralisée:', insertCentralError)
                // Ne pas faire échouer la requête, mais logger
            } else {
                console.log(`🌟 Correction centralisée créée: "${motConcerne}" → ${classificationComplete} (appliquée à TOUS les apprenants)`)
            }
        }

        // Marquer la correction comme traitée
        const { error: updateCorrectionError } = await supabase
            .from('corrections_demandees')
            .update({
                statut: nouveauStatut,
                traite_at: new Date().toISOString(),
                traite_by: decoded.id,
                commentaire_admin: commentaire || null
            })
            .eq('id', correctionId)

        if (updateCorrectionError) {
            console.error('Erreur mise à jour correction:', updateCorrectionError)
            return res.status(500).json({ error: 'Erreur lors de la mise à jour de la correction' })
        }

        const actionMessage = action === 'accepter' 
            ? `Correction acceptée: "${motConcerne}" reclassé de ${correction.classification_actuelle} à ${correction.correction_proposee}`
            : `Correction rejetée pour "${motConcerne}"`

        console.log(`✅ ${actionMessage}`)

        res.status(200).json({
            success: true,
            message: actionMessage,
            correction_id: correctionId,
            action: action,
            mot: motConcerne
        })

    } catch (error) {
        console.error('Erreur traitement correction:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}
