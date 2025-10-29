import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
}

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

        const { imagier_id, mot, image_url, commentaire, question, reponse, ordre } = req.body

        if (!imagier_id || !mot || !image_url) {
            return res.status(400).json({ message: 'Données manquantes (imagier_id, mot, image_url requis)' })
        }

        // Vérifier que l'imagier appartient à l'utilisateur
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

        // Ajouter l'élément
        const { data: newElement, error: insertError } = await supabase
            .from('imagier_elements')
            .insert({
                imagier_id: imagier_id,
                mot: mot,
                image_url: image_url,
                commentaire: commentaire || '',
                question: question || '',
                reponse: reponse || '',
                ordre: ordre || 0
            })
            .select()
            .single()

        if (insertError) {
            console.error('Erreur ajout élément:', insertError)
            return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'élément' })
        }

        res.status(200).json({
            message: 'Élément ajouté avec succès',
            element: newElement
        })

    } catch (error) {
        console.error('Erreur ajout élément:', error)
        res.status(500).json({ message: 'Erreur serveur lors de l\'ajout' })
    }
}
