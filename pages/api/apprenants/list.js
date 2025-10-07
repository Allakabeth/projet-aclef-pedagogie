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

    // Récupérer tous les apprenants (role = 'apprenant' ou pas de role)
    const { data: apprenants, error } = await supabase
      .from('users')
      .select('id, prenom, nom, email, created_at')
      .or('role.eq.apprenant,role.is.null')
      .order('prenom', { ascending: true })
      .order('nom', { ascending: true })

    if (error) {
      console.error('Erreur Supabase:', error)
      return res.status(500).json({
        error: 'Erreur lors de la récupération des apprenants',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      apprenants: apprenants || [],
      total: apprenants?.length || 0
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
