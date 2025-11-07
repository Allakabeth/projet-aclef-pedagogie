import { verifyToken } from '../../../../lib/jwt'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
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

        const { id } = req.query

        // Vérifier que l'imagier existe et appartient à l'utilisateur
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .select('id, created_by')
            .eq('id', id)
            .single()

        if (imagierError || !imagier) {
            console.error('Erreur vérification imagier:', imagierError)
            return res.status(404).json({ message: 'Imagier non trouvé' })
        }

        // Vérifier que l'imagier appartient bien à l'utilisateur
        if (imagier.created_by !== user.id) {
            return res.status(403).json({ message: 'Non autorisé à supprimer cet imagier' })
        }

        // Supprimer d'abord tous les éléments de l'imagier
        const { error: elementsDeleteError } = await supabase
            .from('imagier_elements')
            .delete()
            .eq('imagier_id', id)

        if (elementsDeleteError) {
            console.error('Erreur suppression éléments:', elementsDeleteError)
            return res.status(500).json({ message: 'Erreur lors de la suppression des éléments' })
        }

        // Supprimer l'imagier
        const { error: imagierDeleteError } = await supabase
            .from('imagiers')
            .delete()
            .eq('id', id)

        if (imagierDeleteError) {
            console.error('Erreur suppression imagier:', imagierDeleteError)
            return res.status(500).json({ message: 'Erreur lors de la suppression de l\'imagier' })
        }

        res.status(200).json({
            message: 'Imagier supprimé avec succès',
            imagier_id: id
        })

    } catch (error) {
        console.error('Erreur suppression imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la suppression' })
    }
}
