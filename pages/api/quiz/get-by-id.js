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

    const { quizId } = req.query

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    // Récupérer le quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quiz')
      .select('*')
      .eq('id', quizId)
      .eq('is_active', true)
      .single()

    if (quizError || !quiz) {
      console.error('Erreur Supabase:', quizError)
      return res.status(404).json({ error: 'Quiz non trouvé' })
    }

    // Vérifier que le quiz est attribué à cet apprenant
    const { data: assignment, error: assignError } = await supabase
      .from('quiz_assignments')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', userData.id)
      .single()

    if (assignError || !assignment) {
      return res.status(403).json({ error: 'Ce quiz ne vous est pas attribué' })
    }

    return res.status(200).json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        quiz_data: quiz.quiz_data,
        assignment: {
          id: assignment.id,
          assignedAt: assignment.assigned_at,
          dueDate: assignment.due_date,
          isCompleted: assignment.is_completed,
          completedAt: assignment.completed_at
        }
      }
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
