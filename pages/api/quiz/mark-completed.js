import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { quizId, score, totalQuestions, percentage, answers } = req.body

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    // Mettre à jour l'assignment
    const { data: assignment, error: updateError } = await supabase
      .from('quiz_assignments')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('quiz_id', quizId)
      .eq('user_id', userData.id)
      .select()
      .single()

    if (updateError) {
      console.error('Erreur mise à jour assignment:', updateError)
      return res.status(500).json({
        error: 'Erreur lors de la sauvegarde',
        details: updateError.message
      })
    }

    // Enregistrer les résultats dans quiz_sessions
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        user_id: userData.id,
        score: score || 0,
        total_questions: totalQuestions || 0,
        completed: true,
        session_data: {
          percentage: percentage || 0,
          answers: answers || [],
          completedAt: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Erreur création session:', sessionError)
      // Ne pas faire échouer la requête si la session n'est pas créée
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz marqué comme complété',
      assignment,
      session
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
