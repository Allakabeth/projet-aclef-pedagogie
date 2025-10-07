import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    const { quizId } = req.body

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    // Suppression dans Supabase (CASCADE supprimera automatiquement les assignments et sessions)
    const { error } = await supabase
      .from('quiz')
      .delete()
      .eq('id', quizId)

    if (error) {
      console.error('Erreur Supabase:', error)
      return res.status(500).json({
        error: 'Erreur lors de la suppression du quiz',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
