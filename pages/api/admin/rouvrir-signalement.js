import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const { signalement_id } = req.body

        if (!signalement_id) {
            return res.status(400).json({ error: 'ID de signalement requis' })
        }

        const adminUser = decoded.identifiant || decoded.email || 'admin'
        console.log(`Réouverture de signalement ${signalement_id} par ${adminUser}`)

        // Remettre le signalement en statut "non traité"
        const { data: updateData, error: signalementError } = await supabase
            .from('signalements_syllabification')
            .update({
                traite: false,
                commentaire_admin: `Signalement réouvert par ${adminUser} - Remis en attente`,
                updated_at: new Date().toISOString(),
                date_modification: new Date().toISOString()
            })
            .eq('id', signalement_id)
            .select()

        if (signalementError) {
            console.error('❌ Erreur réouverture signalement:', signalementError)
            return res.status(500).json({ error: 'Erreur lors de la réouverture du signalement' })
        }

        if (!updateData || updateData.length === 0) {
            console.warn(`⚠️ Aucun signalement trouvé avec l'ID ${signalement_id}`)
            return res.status(404).json({ error: 'Signalement non trouvé' })
        }

        console.log(`✅ Signalement ${signalement_id} réouvert avec succès`)

        res.status(200).json({
            success: true,
            message: 'Signalement réouvert avec succès',
            signalement: updateData[0]
        })

    } catch (error) {
        console.error('Erreur réouverture signalement:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}