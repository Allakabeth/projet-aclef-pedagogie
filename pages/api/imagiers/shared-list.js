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

        // Récupérer tous les imagiers partagés SAUF ceux de l'utilisateur
        const { data: imagiers, error: imagiersError } = await supabase
            .from('imagiers')
            .select('*')
            .eq('shared', true)
            .neq('created_by', user.id)  // Exclure ses propres imagiers
            .order('created_at', { ascending: false })

        if (imagiersError) {
            console.error('Erreur récupération imagiers partagés:', imagiersError)
            return res.status(500).json({ message: 'Erreur lors de la récupération des imagiers partagés' })
        }

        // Pour chaque imagier, compter le nombre d'éléments et récupérer l'info du créateur
        const imagiersAvecDetails = await Promise.all(
            imagiers.map(async (imagier) => {
                // Compter les éléments
                const { count, error: countError } = await supabase
                    .from('imagier_elements')
                    .select('*', { count: 'exact', head: true })
                    .eq('imagier_id', imagier.id)

                // Récupérer le créateur
                const { data: creator, error: creatorError } = await supabase
                    .from('users')
                    .select('prenom, nom')
                    .eq('id', imagier.created_by)
                    .single()

                return {
                    ...imagier,
                    elements_count: count || 0,
                    creator_name: creator ? `${creator.prenom} ${creator.nom}` : 'Inconnu'
                }
            })
        )

        res.status(200).json({
            imagiers: imagiersAvecDetails
        })

    } catch (error) {
        console.error('Erreur récupération imagiers partagés:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la récupération' })
    }
}
