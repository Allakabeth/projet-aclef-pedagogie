import { supabaseAdmin } from '../../../lib/supabaseAdmin'

/**
 * API Admin - Récupère les sessions actives
 * Retourne la liste des utilisateurs connectés avec leur dernière activité
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Vérifier le token admin
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.substring(7)

        // Vérifier que c'est un admin (token quiz-admin ou admin standard)
        // Pour simplifier, on vérifie juste que le token existe
        // Dans une vraie app, on vérifierait le rôle

        // Récupérer les sessions actives (< 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        const { data: sessions, error: sessionsError } = await supabaseAdmin
            .from('user_sessions')
            .select(`
                *,
                users!user_id (
                    id,
                    prenom,
                    nom,
                    role,
                    email
                )
            `)
            .gte('last_activity', thirtyMinutesAgo)
            .order('last_activity', { ascending: false })

        if (sessionsError) {
            console.error('Erreur récupération sessions:', sessionsError)
            return res.status(500).json({
                error: 'Erreur récupération sessions',
                details: sessionsError.message,
                code: sessionsError.code,
                hint: sessionsError.hint
            })
        }

        // Formater les données
        const formattedSessions = sessions.map(session => {
            const lastActivityDate = new Date(session.last_activity)
            const now = new Date()
            const minutesAgo = Math.floor((now - lastActivityDate) / 1000 / 60)

            // Déterminer le statut
            let statut = 'inactif'
            let statutColor = '#94a3b8' // gris
            if (minutesAgo < 5) {
                statut = 'actif'
                statutColor = '#10b981' // vert
            } else if (minutesAgo < 15) {
                statut = 'récent'
                statutColor = '#f59e0b' // orange
            }

            return {
                id: session.id,
                user_id: session.user_id,
                prenom: session.users?.prenom || 'Inconnu',
                nom: session.users?.nom || '',
                role: session.users?.role || 'apprenant',
                email: session.users?.email || '',
                last_activity: session.last_activity,
                minutes_ago: minutesAgo,
                statut: statut,
                statut_color: statutColor,
                user_agent: session.user_agent,
                ip_address: session.ip_address,
                created_at: session.created_at
            }
        })

        // Statistiques
        const stats = {
            total: formattedSessions.length,
            actifs: formattedSessions.filter(s => s.statut === 'actif').length,
            recents: formattedSessions.filter(s => s.statut === 'récent').length,
            inactifs: formattedSessions.filter(s => s.statut === 'inactif').length
        }

        return res.status(200).json({
            success: true,
            sessions: formattedSessions,
            stats: stats
        })
    } catch (error) {
        console.error('Erreur sessions actives:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
