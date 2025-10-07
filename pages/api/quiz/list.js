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

    // Récupérer tous les quiz avec les infos du créateur
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz')
      .select(`
        id,
        title,
        description,
        quiz_data,
        is_active,
        created_at,
        category_id,
        created_by,
        users:created_by (
          id,
          prenom,
          nom
        )
      `)
      .order('created_at', { ascending: false })

    if (quizError) {
      console.error('Erreur Supabase:', quizError)
      return res.status(500).json({
        error: 'Erreur lors de la récupération des quiz',
        details: quizError.message
      })
    }

    // Pour chaque quiz, compter le nombre d'apprenants assignés et récupérer leurs IDs
    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (quiz) => {
        // Récupérer les assignations avec les IDs des apprenants
        const { data: assignments, error: assignError } = await supabase
          .from('quiz_assignments')
          .select('user_id')
          .eq('quiz_id', quiz.id)

        if (assignError) {
          console.error('Erreur récupération assignations:', assignError)
        }

        const assignedApprenants = assignments?.map(a => a.user_id) || []
        const assignedCount = assignedApprenants.length

        // Extraire les infos du quiz_data
        // Le type peut être dans quiz_data.type OU dans la première question
        const quizType = quiz.quiz_data?.type || quiz.quiz_data?.questions?.[0]?.type || 'unknown'
        const questionsCount = quiz.quiz_data?.questions?.length || 0

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          type: quizType,
          questionsCount,
          isActive: quiz.is_active,
          createdAt: quiz.created_at,
          categoryId: quiz.category_id,
          createdBy: {
            id: quiz.created_by,
            name: quiz.users ? `${quiz.users.prenom} ${quiz.users.nom}` : 'Inconnu'
          },
          assignedCount: assignedCount,
          assignedApprenants: assignedApprenants, // IDs des apprenants assignés
          quizData: quiz.quiz_data // Ajouter les données complètes du quiz
        }
      })
    )

    return res.status(200).json({
      success: true,
      quizzes: quizzesWithCounts,
      total: quizzesWithCounts.length
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
