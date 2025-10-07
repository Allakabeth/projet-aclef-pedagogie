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

    const { quizId, apprenantIds, dueDate } = req.body

    // Validation
    if (!quizId) {
      return res.status(400).json({ error: 'ID du quiz requis' })
    }

    if (!apprenantIds || !Array.isArray(apprenantIds)) {
      return res.status(400).json({ error: 'Liste des apprenants requise' })
    }

    if (apprenantIds.length === 0) {
      // Si la liste est vide, supprimer toutes les attributions pour ce quiz
      const { error: deleteError } = await supabase
        .from('quiz_assignments')
        .delete()
        .eq('quiz_id', quizId)

      if (deleteError) {
        console.error('Erreur suppression attributions:', deleteError)
        return res.status(500).json({
          error: 'Erreur lors de la suppression des attributions',
          details: deleteError.message
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Toutes les attributions ont été supprimées'
      })
    }

    // 1. Supprimer les anciennes attributions pour ce quiz
    const { error: deleteError } = await supabase
      .from('quiz_assignments')
      .delete()
      .eq('quiz_id', quizId)

    if (deleteError) {
      console.error('Erreur suppression attributions:', deleteError)
      return res.status(500).json({
        error: 'Erreur lors de la suppression des anciennes attributions',
        details: deleteError.message
      })
    }

    // 2. Créer les nouvelles attributions
    const assignments = apprenantIds.map(apprenantId => ({
      quiz_id: quizId,
      user_id: apprenantId,
      assigned_by: userData.id,
      due_date: dueDate || null,
      is_completed: false
    }))

    const { data, error: insertError } = await supabase
      .from('quiz_assignments')
      .insert(assignments)
      .select()

    if (insertError) {
      console.error('Erreur insertion attributions:', insertError)
      return res.status(500).json({
        error: 'Erreur lors de la création des attributions',
        details: insertError.message
      })
    }

    return res.status(200).json({
      success: true,
      message: `Quiz attribué à ${apprenantIds.length} apprenant(s)`,
      assignments: data
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
