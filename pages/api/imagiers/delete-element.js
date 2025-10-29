import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

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

        const { element_id } = req.body

        if (!element_id) {
            return res.status(400).json({ message: 'ID de l\'élément manquant' })
        }

        // Récupérer l'élément et vérifier que l'imagier appartient à l'utilisateur
        const { data: element, error: elementError } = await supabase
            .from('imagier_elements')
            .select('id, imagier_id')
            .eq('id', element_id)
            .single()

        if (elementError || !element) {
            console.error('Erreur récupération élément:', elementError)
            return res.status(404).json({ message: 'Élément non trouvé' })
        }

        // Vérifier que l'imagier appartient à l'utilisateur
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .select('id, created_by')
            .eq('id', element.imagier_id)
            .single()

        if (imagierError || !imagier) {
            console.error('Erreur vérification imagier:', imagierError)
            return res.status(404).json({ message: 'Imagier non trouvé' })
        }

        if (imagier.created_by !== user.id) {
            return res.status(403).json({ message: 'Non autorisé à supprimer cet élément' })
        }

        // Supprimer l'élément
        const { error: deleteError } = await supabase
            .from('imagier_elements')
            .delete()
            .eq('id', element_id)

        if (deleteError) {
            console.error('Erreur suppression élément:', deleteError)
            return res.status(500).json({ message: 'Erreur lors de la suppression de l\'élément' })
        }

        res.status(200).json({
            message: 'Élément supprimé avec succès',
            element_id: element_id
        })

    } catch (error) {
        console.error('Erreur suppression élément:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la suppression' })
    }
}
