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

        const { mot, texteId, actionType } = req.body
        // actionType: 'mono_vers_multi' ou 'multi_vers_mono'

        if (!mot || !texteId || !actionType) {
            return res.status(400).json({ error: 'Paramètres manquants' })
        }

        console.log(`Correction: ${mot} (${actionType}) pour texte ${texteId}`)

        if (actionType === 'mono_vers_multi') {
            // Supprimer le mot de syllabes_mots (il était classé mono par erreur)
            const { error } = await supabase
                .from('syllabes_mots')
                .delete()
                .eq('texte_reference_id', texteId)
                .eq('mot_complet', mot)

            if (error) {
                console.error('Erreur suppression:', error)
                return res.status(500).json({ error: 'Erreur suppression du mot' })
            }

            console.log(`Mot "${mot}" supprimé de syllabes_mots (maintenant multisyllabe)`)

        } else if (actionType === 'multi_vers_mono') {
            // Ajouter le mot dans syllabes_mots (il était classé multi par erreur)
            const { error } = await supabase
                .from('syllabes_mots')
                .insert({
                    texte_reference_id: texteId,
                    mot_complet: mot,
                    mot_normalise: normalizeText(mot)
                })

            if (error) {
                console.error('Erreur insertion:', error)
                return res.status(500).json({ error: 'Erreur ajout du mot' })
            }

            console.log(`Mot "${mot}" ajouté à syllabes_mots (maintenant monosyllabe)`)
        }

        res.status(200).json({
            success: true,
            message: `Mot "${mot}" reclassé avec succès`,
            action: actionType
        })

    } catch (error) {
        console.error('Erreur correction mot:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}