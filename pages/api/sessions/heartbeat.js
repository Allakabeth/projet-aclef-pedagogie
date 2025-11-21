import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import jwt from 'jsonwebtoken'

/**
 * API Heartbeat - Met à jour l'activité de l'utilisateur
 * Appelée toutes les 2 minutes par le client
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Récupérer le token depuis le header Authorization
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.substring(7)

        // Vérifier le token JWT
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (error) {
            return res.status(401).json({ error: 'Token invalide ou expiré' })
        }

        const userId = decoded.id || decoded.apprenant_id

        // Récupérer les infos du client
        const userAgent = req.headers['user-agent'] || null
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null

        // Upsert (insert or update) la session
        const { error: upsertError } = await supabaseAdmin
            .from('user_sessions')
            .upsert({
                user_id: userId,
                last_activity: new Date().toISOString(),
                user_agent: userAgent,
                ip_address: ipAddress,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })

        if (upsertError) {
            console.error('Erreur upsert session:', upsertError)
            return res.status(500).json({ error: 'Erreur mise à jour session' })
        }

        // Nettoyer les sessions anciennes (> 2 heures) - optionnel, toutes les 10 heartbeats
        if (Math.random() < 0.1) {
            await supabaseAdmin.rpc('cleanup_old_sessions')
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Erreur heartbeat:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
