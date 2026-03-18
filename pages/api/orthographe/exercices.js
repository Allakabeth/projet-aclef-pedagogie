import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Non authentifié' })

    let userId
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt')
        userId = decoded.userId || decoded.id
    } catch {
        return res.status(401).json({ error: 'Token invalide' })
    }

    try {
        const { theme, niveau } = req.query

        let query = supabase
            .from('orthographe_exercices')
            .select('id, theme_grammatical, sous_theme, type, titre, consigne, niveau, numero_boite, difficulte')
            .eq('actif', true)
            .order('niveau').order('ordre')

        if (theme) query = query.eq('theme_grammatical', theme)
        if (niveau) query = query.eq('niveau', niveau)

        const { data: exercices, error } = await query

        if (error) throw error

        // Récupérer les sessions de l'apprenant pour marquer la progression
        const { data: sessions } = await supabase
            .from('orthographe_sessions')
            .select('exercice_id, score')
            .eq('user_id', userId)

        // Calculer le meilleur score par exercice
        const bestScores = {}
        ;(sessions || []).forEach(s => {
            if (!bestScores[s.exercice_id] || s.score > bestScores[s.exercice_id]) {
                bestScores[s.exercice_id] = s.score
            }
        })

        // Ajouter l'info de progression à chaque exercice
        const result = (exercices || []).map(ex => ({
            ...ex,
            meilleur_score: bestScores[ex.id] ?? null,
            deja_fait: bestScores[ex.id] !== undefined
        }))

        return res.status(200).json({ exercices: result })
    } catch (error) {
        console.error('Erreur API orthographe exercices:', error)
        return res.status(500).json({ error: error.message })
    }
}
