import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const user = verifyToken(token)
        if (!user) {
            return res.status(401).json({ message: 'Token invalide' })
        }

        const { imagier_id, titre, description, theme, voix } = req.body

        if (!imagier_id) {
            return res.status(400).json({ message: 'ID de l\'imagier manquant' })
        }

        // Vérifier que l'imagier existe et appartient à l'utilisateur
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .select('id, created_by')
            .eq('id', imagier_id)
            .single()

        if (imagierError || !imagier) {
            console.error('Erreur vérification imagier:', imagierError)
            return res.status(404).json({ message: 'Imagier non trouvé' })
        }

        if (imagier.created_by !== user.id) {
            return res.status(403).json({ message: 'Non autorisé à modifier cet imagier' })
        }

        // Mettre à jour l'imagier
        const updateData = {}
        if (titre !== undefined) updateData.titre = titre
        if (description !== undefined) updateData.description = description
        if (theme !== undefined) updateData.theme = theme
        if (voix !== undefined) updateData.voix = voix

        const { data: updatedImagier, error: updateError } = await supabase
            .from('imagiers')
            .update(updateData)
            .eq('id', imagier_id)
            .select()
            .single()

        if (updateError) {
            console.error('Erreur mise à jour imagier:', updateError)
            return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'imagier' })
        }

        res.status(200).json({
            message: 'Imagier mis à jour avec succès',
            imagier: updatedImagier
        })

    } catch (error) {
        console.error('Erreur mise à jour imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' })
    }
}
