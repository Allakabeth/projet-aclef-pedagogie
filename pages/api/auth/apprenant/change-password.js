import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken } from '../../../../lib/jwt'
import bcrypt from 'bcryptjs'

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier le token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || (!payload.apprenant_id && !payload.id)) {
        return res.status(401).json({ error: 'Token invalide' })
    }
    
    // Utiliser id si apprenant_id n'existe pas (compatibilité)
    const apprenantId = payload.apprenant_id || payload.id

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            error: 'Mot de passe actuel et nouveau mot de passe requis' 
        })
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ 
            error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
        })
    }

    try {
        // Récupérer l'apprenant
        const { data: apprenant, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', apprenantId)
            .eq('role', 'apprenant')
            .single()

        if (fetchError || !apprenant) {
            return res.status(404).json({ error: 'Apprenant non trouvé' })
        }

        // Vérifier le mot de passe actuel
        let currentPasswordValid = false

        if (apprenant.password_hash) {
            // Si un hash existe, vérifier avec bcrypt
            currentPasswordValid = await bcrypt.compare(currentPassword, apprenant.password_hash)
        } else {
            // Sinon vérifier avec le nom (première connexion)
            const nomNormalized = normalizeText(apprenant.nom)
            const currentPasswordNormalized = normalizeText(currentPassword)
            currentPasswordValid = (currentPasswordNormalized === nomNormalized)
        }

        if (!currentPasswordValid) {
            return res.status(401).json({ 
                error: 'Mot de passe actuel incorrect' 
            })
        }

        // Hasher le nouveau mot de passe
        const saltRounds = 10
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

        // Mettre à jour dans la base de données
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                password_hash: newPasswordHash
            })
            .eq('id', apprenantId)

        if (updateError) {
            console.error('Erreur mise à jour mot de passe:', updateError)
            return res.status(500).json({ 
                error: 'Erreur lors de la mise à jour du mot de passe' 
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Mot de passe modifié avec succès'
        })

    } catch (error) {
        console.error('Erreur changement mot de passe:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}