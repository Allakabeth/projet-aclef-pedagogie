import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier le token
        const token = req.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            return res.status(401).json({ error: 'Non authentifié' })
        }

        // Décoder le token pour obtenir l'ID de l'apprenant
        let userId
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt')
            userId = decoded.userId || decoded.id
        } catch (err) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        // Récupérer les exercices assignés à cet apprenant
        const { data, error } = await supabase
            .from('formation_exercices_assignations')
            .select(`
                *,
                exercice:formation_exercices(
                    id,
                    titre,
                    description,
                    type,
                    difficulte,
                    contenu,
                    competence:formation_competences(
                        id,
                        code,
                        intitule
                    )
                )
            `)
            .eq('apprenant_id', userId)
            .order('date_assignation', { ascending: false })

        if (error) throw error

        return res.status(200).json({ exercices: data })
    } catch (error) {
        console.error('Erreur API mes-exercices:', error)
        return res.status(500).json({ error: error.message })
    }
}
