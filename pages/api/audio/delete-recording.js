import { supabase } from '../../../lib/supabaseClient'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
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

        // Récupérer l'ID de l'enregistrement depuis le body
        const { enregistrement_id, groupe_sens_id } = req.body

        if (!enregistrement_id && !groupe_sens_id) {
            return res.status(400).json({
                error: 'enregistrement_id ou groupe_sens_id requis'
            })
        }

        // Construire la requête de suppression
        let query = supabase
            .from('audio_enregistrements')
            .delete()
            .eq('apprenant_id', apprenantId)

        if (enregistrement_id) {
            query = query.eq('id', enregistrement_id)
        } else {
            query = query.eq('groupe_sens_id', groupe_sens_id)
        }

        const { error } = await query

        if (error) throw error

        return res.status(200).json({
            success: true,
            message: 'Enregistrement supprimé avec succès'
        })

    } catch (error) {
        console.error('Erreur delete-recording:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
