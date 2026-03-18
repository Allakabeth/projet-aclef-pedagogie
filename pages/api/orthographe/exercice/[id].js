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

    try {
        jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt')
    } catch {
        return res.status(401).json({ error: 'Token invalide' })
    }

    try {
        const { id } = req.query

        const { data: exercice, error } = await supabase
            .from('orthographe_exercices')
            .select('*')
            .eq('id', id)
            .eq('actif', true)
            .single()

        if (error || !exercice) {
            return res.status(404).json({ error: 'Exercice introuvable' })
        }

        return res.status(200).json({ exercice })
    } catch (error) {
        console.error('Erreur API orthographe exercice:', error)
        return res.status(500).json({ error: error.message })
    }
}
