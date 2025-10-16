import { supabase } from '../../../lib/supabaseClient'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        // Récupérer l'ID du texte depuis les query params
        const { texte_id } = req.query

        if (!texte_id) {
            return res.status(400).json({
                error: 'texte_id requis'
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

        // Récupérer tous les enregistrements pour ce texte
        const { data: enregistrements, error } = await supabase
            .from('audio_enregistrements')
            .select('id, groupe_sens_id, audio_data, duree_secondes, created_at, updated_at')
            .eq('apprenant_id', apprenantId)
            .eq('texte_id', texte_id)
            .order('created_at', { ascending: true })

        if (error) throw error

        return res.status(200).json({
            success: true,
            enregistrements: enregistrements || [],
            count: enregistrements?.length || 0
        })

    } catch (error) {
        console.error('Erreur get-recordings:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
