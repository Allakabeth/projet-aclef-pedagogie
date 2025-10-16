import { supabase } from '../../../lib/supabaseClient'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const token = req.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            return res.status(401).json({ error: 'Non authentifié' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const apprenantId = decoded.id

        // Récupérer les données de la requête
        const { groupe_sens_id, texte_id, audio_data, duree_secondes } = req.body

        if (!groupe_sens_id || !texte_id || !audio_data) {
            return res.status(400).json({
                error: 'Données manquantes',
                details: 'groupe_sens_id, texte_id et audio_data sont requis'
            })
        }

        // Vérifier que le groupe appartient bien au texte
        const { data: groupe, error: groupeError } = await supabase
            .from('groupes_sens')
            .select('id, texte_id')
            .eq('id', groupe_sens_id)
            .eq('texte_id', texte_id)
            .single()

        if (groupeError || !groupe) {
            return res.status(404).json({
                error: 'Groupe de sens non trouvé ou ne correspond pas au texte'
            })
        }

        // Vérifier que le texte appartient à l'apprenant
        const { data: texte, error: texteError } = await supabase
            .from('textes_references')
            .select('id, apprenant_id')
            .eq('id', texte_id)
            .eq('apprenant_id', apprenantId)
            .single()

        if (texteError || !texte) {
            return res.status(403).json({
                error: 'Accès refusé : ce texte ne vous appartient pas'
            })
        }

        // Vérifier si un enregistrement existe déjà pour ce groupe
        const { data: existingRecording } = await supabase
            .from('audio_enregistrements')
            .select('id')
            .eq('apprenant_id', apprenantId)
            .eq('groupe_sens_id', groupe_sens_id)
            .single()

        let result

        if (existingRecording) {
            // Mettre à jour l'enregistrement existant
            const { data, error } = await supabase
                .from('audio_enregistrements')
                .update({
                    audio_data,
                    duree_secondes: duree_secondes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingRecording.id)
                .select()
                .single()

            if (error) throw error
            result = data
        } else {
            // Créer un nouvel enregistrement
            const { data, error } = await supabase
                .from('audio_enregistrements')
                .insert({
                    apprenant_id: apprenantId,
                    texte_id,
                    groupe_sens_id,
                    audio_data,
                    duree_secondes: duree_secondes || null
                })
                .select()
                .single()

            if (error) throw error
            result = data
        }

        return res.status(200).json({
            success: true,
            enregistrement: result,
            message: existingRecording ? 'Enregistrement mis à jour' : 'Enregistrement créé'
        })

    } catch (error) {
        console.error('Erreur save-recording:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
