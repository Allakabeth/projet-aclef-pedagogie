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
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const { mot, texteId, classificationActuelle, correctionProposee, raison } = req.body

        if (!mot || !texteId || !classificationActuelle || !correctionProposee) {
            return res.status(400).json({ error: 'Paramètres manquants' })
        }

        console.log(`Demande correction: ${mot} (${classificationActuelle} → ${correctionProposee})`)

        // Trouver le mot classifié correspondant
        const { data: motClassifie, error: findError } = await supabase
            .from('mots_classifies')
            .select('id')
            .eq('mot', mot)
            .eq('texte_reference_id', texteId)
            .eq('apprenant_id', decoded.id)
            .single()

        if (findError || !motClassifie) {
            return res.status(404).json({ error: 'Mot classifié non trouvé' })
        }

        // Vérifier si une demande existe déjà pour ce mot
        const { data: demandeExistante } = await supabase
            .from('corrections_demandees')
            .select('id, statut')
            .eq('mot_classifie_id', motClassifie.id)
            .eq('demandeur_id', decoded.id)
            .eq('statut', 'en_attente')
            .single()

        if (demandeExistante) {
            return res.status(400).json({ 
                error: 'Une demande de correction est déjà en attente pour ce mot',
                demande_id: demandeExistante.id
            })
        }

        // Créer la demande de correction
        const { error: insertError } = await supabase
            .from('corrections_demandees')
            .insert({
                mot_classifie_id: motClassifie.id,
                demandeur_id: decoded.id,
                classification_actuelle: classificationActuelle,
                correction_proposee: correctionProposee,
                raison: raison || null,
                statut: 'en_attente'
            })

        if (insertError) {
            console.error('Erreur création demande:', insertError)
            return res.status(500).json({ error: 'Erreur création de la demande' })
        }

        console.log(`✅ Demande de correction créée pour "${mot}"`)

        res.status(200).json({
            success: true,
            message: `Demande de correction envoyée pour "${mot}"`,
            details: `${classificationActuelle} → ${correctionProposee}`
        })

    } catch (error) {
        console.error('Erreur demande correction:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}