import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Récupérer tous les quiz actifs avec leurs catégories
    const { data: quizzes, error } = await supabase
      .from('quiz')
      .select(`
        *,
        category:quiz_categories(name, icon, color)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur Supabase:', error)
      throw error
    }

    // Pour chaque quiz, compter le nombre de questions
    const quizzesWithCount = (quizzes || []).map(quiz => ({
      ...quiz,
      questionCount: quiz.quiz_data?.questions?.length || 0,
      category: quiz.category?.name || null
    }))

    res.status(200).json({
      success: true,
      quizzes: quizzesWithCount
    })

  } catch (error) {
    console.error('Erreur API list quiz:', error)
    res.status(500).json({
      error: 'Erreur lors du chargement des quiz',
      details: error.message
    })
  }
}