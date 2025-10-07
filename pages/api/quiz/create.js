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

    // Vérification du rôle
    if (userData.role !== 'admin' && userData.role !== 'salarié') {
      return res.status(403).json({ error: 'Accès refusé. Réservé aux administrateurs.' })
    }

    const { title, description, quizType, questions, categoryId } = req.body

    // Validation des données
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' })
    }

    if (!quizType) {
      return res.status(400).json({ error: 'Le type de quiz est requis' })
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Au moins une question est requise' })
    }

    // Validation selon le type de quiz
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]

      if (quizType === 'qcm' || quizType === 'multiple') {
        if (!question.text || !question.text.trim()) {
          return res.status(400).json({
            error: `La question ${i + 1} doit avoir un texte`
          })
        }
        if (!question.answers || question.answers.length < 2) {
          return res.status(400).json({
            error: `La question ${i + 1} doit avoir au moins 2 réponses`
          })
        }
        const hasCorrectAnswer = question.answers.some(a => a.correct)
        if (!hasCorrectAnswer) {
          return res.status(400).json({
            error: `La question ${i + 1} doit avoir au moins une réponse correcte`
          })
        }
      }

      if (quizType === 'matching') {
        if (!question.leftColumn || question.leftColumn.length === 0) {
          return res.status(400).json({
            error: `La question ${i + 1} doit avoir des éléments dans la colonne A`
          })
        }
        if (!question.rightColumn || question.rightColumn.length === 0) {
          return res.status(400).json({
            error: `La question ${i + 1} doit avoir des éléments dans la colonne B`
          })
        }
      }
    }

    // Structure des données pour Supabase
    const quizData = {
      type: quizType,
      questions: questions.map((q, index) => ({
        id: index + 1,
        ...q
      })),
      settings: {
        shuffle: false,
        showFeedback: true,
        allowRetry: true
      }
    }

    // Insertion dans Supabase
    const { data, error } = await supabase
      .from('quiz')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: userData.id,
        quiz_data: quizData,
        category_id: categoryId || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur Supabase:', error)
      return res.status(500).json({
        error: 'Erreur lors de la sauvegarde du quiz',
        details: error.message
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Quiz créé avec succès',
      quiz: data
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
