import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
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

    const { quizId, title, description, quizData } = req.body

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' })
    }

    // Préparer les données à mettre à jour
    const updateData = {
      title: title.trim(),
      description: description?.trim() || null
    }

    // Ajouter quiz_data si fourni
    if (quizData) {
      updateData.quiz_data = quizData
    }

    // Mise à jour dans Supabase
    const { data, error } = await supabase
      .from('quiz')
      .update(updateData)
      .eq('id', quizId)
      .select()
      .single()

    if (error) {
      console.error('Erreur Supabase:', error)
      return res.status(500).json({
        error: 'Erreur lors de la mise à jour du quiz',
        details: error.message
      })
    }

    if (!data) {
      return res.status(404).json({ error: 'Quiz non trouvé' })
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz mis à jour avec succès',
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
