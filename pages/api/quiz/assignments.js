import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Vérification de l'authentification
    const token = req.headers.authorization?.replace('Bearer ', '')
    const userDataHeader = req.headers['x-user-data']

    if (!token || !userDataHeader) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    let userData
    try {
      userData = JSON.parse(decodeURIComponent(userDataHeader))
    } catch (error) {
      return res.status(401).json({ error: 'Données utilisateur invalides' })
    }

    // Vérification du rôle
    if (userData.role !== 'admin' && userData.role !== 'salarié') {
      return res.status(403).json({ error: 'Accès refusé. Réservé aux administrateurs.' })
    }

    const { quizId } = req.query

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    // Récupérer les attributions pour ce quiz
    const { data: assignments, error } = await supabase
      .from('quiz_assignments')
      .select(`
        id,
        quiz_id,
        user_id,
        assigned_at,
        due_date,
        is_completed,
        completed_at,
        users:user_id (
          id,
          prenom,
          nom,
          email
        )
      `)
      .eq('quiz_id', quizId)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Erreur Supabase:', error)
      return res.status(500).json({
        error: 'Erreur lors de la récupération des attributions',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      assignments: assignments || [],
      total: assignments?.length || 0
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
