import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        // Récupérer l'imagier
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .select('*')
            .eq('id', id)
            .eq('created_by', user.id)
            .single()

        if (imagierError || !imagier) {
            console.error('Erreur récupération imagier:', imagierError)
            return res.status(404).json({ message: 'Imagier non trouvé' })
        }

        // Récupérer les éléments
        const { data: elements, error: elementsError } = await supabase
            .from('imagier_elements')
            .select('*')
            .eq('imagier_id', id)
            .order('ordre', { ascending: true })

        if (elementsError) {
            console.error('Erreur récupération éléments:', elementsError)
            return res.status(500).json({ message: 'Erreur lors de la récupération des éléments' })
        }

        res.status(200).json({
            imagier: {
                ...imagier,
                elements: elements || []
            }
        })

    } catch (error) {
        console.error('Erreur récupération imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la récupération' })
    }
}