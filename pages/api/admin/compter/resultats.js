import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

function computeStats(sessions) {
    const terminees = sessions.filter(s => s.termine)
    const total = sessions.length

    // Grouper par exercice
    const parExercice = {}
    sessions.forEach(s => {
        if (!parExercice[s.exercice]) {
            parExercice[s.exercice] = { sessions: [], par_mode: {} }
        }
        parExercice[s.exercice].sessions.push(s)
        if (!parExercice[s.exercice].par_mode[s.mode]) {
            parExercice[s.exercice].par_mode[s.mode] = []
        }
        parExercice[s.exercice].par_mode[s.mode].push(s)
    })

    const parExerciceStats = {}
    Object.keys(parExercice).forEach(exercice => {
        const exSessions = parExercice[exercice].sessions
        const exTerminees = exSessions.filter(s => s.termine)
        const parMode = {}
        Object.keys(parExercice[exercice].par_mode).forEach(mode => {
            const modeSessions = parExercice[exercice].par_mode[mode]
            parMode[mode] = {
                nombre: modeSessions.length,
                score_moyen: Math.round(modeSessions.reduce((s, m) => s + m.score, 0) / modeSessions.length * 10) / 10
            }
        })
        parExerciceStats[exercice] = {
            nombre_sessions: exSessions.length,
            score_moyen: Math.round(exSessions.reduce((s, m) => s + m.score, 0) / exSessions.length * 10) / 10,
            meilleur_score: Math.max(...exSessions.map(s => s.score)),
            meilleur_temps: exTerminees.length > 0 ? Math.min(...exTerminees.map(s => s.duree_secondes)) : null,
            par_mode: parMode
        }
    })

    return {
        nombre_sessions: total,
        temps_total_secondes: sessions.reduce((sum, s) => sum + s.duree_secondes, 0),
        score_moyen: total > 0
            ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / total * 10) / 10
            : 0,
        sessions_terminees: terminees.length,
        taux_completion: total > 0 ? Math.round((terminees.length / total) * 100) : 0,
        par_exercice: parExerciceStats
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    try {
        const { apprenant_id } = req.query

        if (apprenant_id) {
            // Détail pour un apprenant
            const { data: apprenant, error: appError } = await supabase
                .from('users')
                .select('id, prenom, nom, identifiant')
                .eq('id', apprenant_id)
                .single()

            if (appError || !apprenant) {
                return res.status(404).json({ error: 'Apprenant non trouvé' })
            }

            const { data: sessions, error: sessError } = await supabase
                .from('compter_sessions')
                .select('*')
                .eq('user_id', apprenant_id)
                .order('created_at', { ascending: false })

            if (sessError) throw sessError

            const allSessions = sessions || []
            const stats = computeStats(allSessions)

            return res.status(200).json({ apprenant, sessions: allSessions, stats })

        } else {
            // Résumé de tous les apprenants
            const { data: sessions, error } = await supabase
                .from('compter_sessions')
                .select('user_id, score, duree_secondes, termine, created_at')

            if (error) throw error

            const userIds = [...new Set((sessions || []).map(s => s.user_id))]

            if (userIds.length === 0) {
                return res.status(200).json({ apprenants: [] })
            }

            const { data: apprenants } = await supabase
                .from('users')
                .select('id, prenom, nom, identifiant')
                .in('id', userIds)
                .order('identifiant')

            const result = (apprenants || []).map(app => {
                const userSessions = (sessions || []).filter(s => s.user_id === app.id)
                const terminees = userSessions.filter(s => s.termine)
                return {
                    ...app,
                    stats: {
                        nombre_sessions: userSessions.length,
                        temps_total_secondes: userSessions.reduce((sum, s) => sum + s.duree_secondes, 0),
                        score_moyen: userSessions.length > 0
                            ? Math.round(userSessions.reduce((sum, s) => sum + s.score, 0) / userSessions.length * 10) / 10
                            : 0,
                        sessions_terminees: terminees.length,
                        derniere_session: userSessions[0]?.created_at || null
                    }
                }
            })

            return res.status(200).json({ apprenants: result })
        }

    } catch (error) {
        console.error('Erreur API compter resultats:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
