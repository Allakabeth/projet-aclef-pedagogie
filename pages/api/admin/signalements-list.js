import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification admin
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        // Pour l'instant, permettre à tous les utilisateurs connectés de voir les signalements
        // TODO: Ajouter une vérification de rôle admin si nécessaire

        // Tenter de récupérer les signalements depuis la BDD
        const { data: signalements, error } = await supabase
            .from('signalements_syllabification')
            .select('*')
            .order('date_signalement', { ascending: false })

        if (error) {
            console.error('Erreur récupération signalements:', error)
            
            if (error.code === '42P01') {
                // Table n'existe pas
                return res.status(200).json({
                    success: true,
                    signalements: [],
                    message: 'Base de données non configurée - Les signalements sont disponibles dans les logs du serveur',
                    db_configured: false
                })
            } else {
                return res.status(500).json({ error: 'Erreur accès base de données' })
            }
        }

        console.log(`📋 ${signalements?.length || 0} signalements récupérés`)

        res.status(200).json({
            success: true,
            signalements: signalements || [],
            db_configured: true
        })

    } catch (error) {
        console.error('Erreur récupération signalements:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}