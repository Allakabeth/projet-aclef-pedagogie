import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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

        const { imagierId } = req.body

        // Récupérer les éléments de l'imagier
        const { data: elements, error: fetchError } = await supabase
            .from('imagier_elements')
            .select('id, imagier_id')
            .eq('imagier_id', imagierId)

        if (fetchError) {
            console.error('Erreur récupération éléments:', fetchError)
            return res.status(500).json({ message: 'Erreur lors de la récupération' })
        }

        // Mettre à jour chaque élément avec une nouvelle URL d'image
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i]
            const newImageUrl = `https://picsum.photos/400/300?random=${Date.now() + i}`

            const { error: updateError } = await supabase
                .from('imagier_elements')
                .update({ image_url: newImageUrl })
                .eq('id', element.id)

            if (updateError) {
                console.error('Erreur mise à jour élément:', updateError)
            }
        }

        res.status(200).json({
            message: 'Images mises à jour avec succès',
            elements_updated: elements.length
        })

    } catch (error) {
        console.error('Erreur correction images:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la correction' })
    }
}