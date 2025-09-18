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

        // Récupérer les imagiers de l'utilisateur
        const { data: imagiers, error: imagiersError } = await supabase
            .from('imagiers')
            .select(`
                id,
                titre,
                theme,
                description,
                created_at,
                updated_at
            `)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })

        if (imagiersError) {
            console.error('Erreur récupération imagiers:', imagiersError)
            return res.status(500).json({ message: 'Erreur lors de la récupération des imagiers' })
        }

        // Pour chaque imagier, compter le nombre d'éléments
        const imagiersWithCounts = await Promise.all(
            imagiers.map(async (imagier) => {
                const { count, error: countError } = await supabase
                    .from('imagier_elements')
                    .select('*', { count: 'exact', head: true })
                    .eq('imagier_id', imagier.id)

                if (countError) {
                    console.error('Erreur comptage éléments:', countError)
                    return { ...imagier, nombre_elements: 0 }
                }

                return {
                    ...imagier,
                    nombre_elements: count || 0
                }
            })
        )

        res.status(200).json({
            imagiers: imagiersWithCounts
        })

    } catch (error) {
        console.error('Erreur récupération imagiers:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la récupération' })
    }
}