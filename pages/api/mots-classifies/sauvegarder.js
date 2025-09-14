import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const normalizeText = (text) => {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '')
}

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

        const { texteId, resultats } = req.body
        // resultats = [{ mot: "chat", classification: "mono", score: 1 }, ...]

        if (!texteId || !Array.isArray(resultats)) {
            return res.status(400).json({ error: 'Paramètres manquants' })
        }

        console.log(`Sauvegarde de ${resultats.length} mots pour texte ${texteId}`)

        // Supprimer les anciens résultats de cet utilisateur pour ce texte
        const { error: deleteError } = await supabase
            .from('mots_classifies')
            .delete()
            .eq('texte_reference_id', texteId)
            .eq('apprenant_id', decoded.id)

        if (deleteError) {
            console.error('Erreur suppression anciens résultats:', deleteError)
        }

        // Préparer les données à insérer
        const motsAInserer = resultats.map(resultat => ({
            texte_reference_id: texteId,
            apprenant_id: decoded.id,
            mot: resultat.mot,
            mot_normalise: normalizeText(resultat.mot),
            classification: resultat.classification, // 'mono' ou 'multi'
            score_utilisateur: resultat.score, // 1 si correct, 0 si incorrect
            valide_par_admin: false // Par défaut non validé
        }))

        // Insérer les nouveaux résultats
        const { error: insertError } = await supabase
            .from('mots_classifies')
            .insert(motsAInserer)

        if (insertError) {
            console.error('Erreur insertion résultats:', insertError)
            return res.status(500).json({ error: 'Erreur sauvegarde des résultats' })
        }

        console.log(`✅ ${motsAInserer.length} mots sauvegardés`)

        res.status(200).json({
            success: true,
            message: `${motsAInserer.length} classifications sauvegardées`,
            mots_sauvegardes: motsAInserer.length
        })

    } catch (error) {
        console.error('Erreur sauvegarde classifications:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}