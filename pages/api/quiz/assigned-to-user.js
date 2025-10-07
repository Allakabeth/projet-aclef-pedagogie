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

    // Récupérer les quiz attribués à cet apprenant
    const { data: assignments, error: assignError } = await supabase
      .from('quiz_assignments')
      .select(`
        id,
        quiz_id,
        assigned_at,
        due_date,
        is_completed,
        completed_at,
        quiz:quiz_id (
          id,
          title,
          description,
          quiz_data,
          is_active,
          created_at
        )
      `)
      .eq('user_id', userData.id)
      .eq('quiz.is_active', true)
      .order('assigned_at', { ascending: false })

    if (assignError) {
      console.error('Erreur Supabase:', assignError)
      return res.status(500).json({
        error: 'Erreur lors de la récupération des quiz',
        details: assignError.message
      })
    }

    // Transformer les données pour l'affichage
    const quizzes = (assignments || [])
      .filter(a => a.quiz) // Filtrer les assignments sans quiz (au cas où)
      .map(assignment => ({
        assignmentId: assignment.id,
        id: assignment.quiz.id,
        title: assignment.quiz.title,
        description: assignment.quiz.description,
        quiz_data: assignment.quiz.quiz_data,
        assignedAt: assignment.assigned_at,
        dueDate: assignment.due_date,
        isCompleted: assignment.is_completed,
        completedAt: assignment.completed_at,
        questionsCount: assignment.quiz.quiz_data?.questions?.length || 0,
        type: assignment.quiz.quiz_data?.type || 'unknown'
      }))

    return res.status(200).json({
      success: true,
      quizzes,
      total: quizzes.length
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
