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
        // TEMPORAIRE : Pas de vérification admin pour le moment
        // const authHeader = req.headers.authorization
        // if (!authHeader?.startsWith('Bearer ')) {
        //     return res.status(401).json({ error: 'Token manquant' })
        // }

        // const token = authHeader.split(' ')[1]
        // const decoded = verifyToken(token)
        // if (!decoded || decoded.role !== 'admin') {
        //     return res.status(401).json({ error: 'Accès non autorisé' })
        // }

        // Récupérer la liste des apprenants
        const { data: apprenants, error } = await supabase
            .from('users')
            .select('id, identifiant, prenom, nom, email, created_at, password_hash')
            .eq('role', 'apprenant')
            .order('identifiant')

        if (error) {
            console.error('Erreur récupération apprenants:', error)
            return res.status(500).json({ error: 'Erreur récupération des apprenants' })
        }

        res.status(200).json({
            success: true,
            apprenants: apprenants || []
        })

    } catch (error) {
        console.error('Erreur liste apprenants:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}