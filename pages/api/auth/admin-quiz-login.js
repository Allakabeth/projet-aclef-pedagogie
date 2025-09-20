import { supabase } from '../../../lib/supabaseClient'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  try {
    // Rechercher l'utilisateur dans la base (admin ou salarié)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .in('role', ['admin', 'salarié'])
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    // Créer le token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'quiz-admin' // Type spécial pour l'admin quiz
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    )

    // Retourner les informations utilisateur (sans le mot de passe)
    const userResponse = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      nom: user.nom,
      role: user.role
    }

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
      message: 'Connexion réussie'
    })

  } catch (error) {
    console.error('Erreur lors de la connexion admin quiz:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}