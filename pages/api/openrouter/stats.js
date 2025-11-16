/**
 * API pour récupérer les statistiques OpenRouter
 * Retourne : { success, stats: { limit, usage, remaining } }
 */

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
        })

        if (!response.ok) {
            console.warn('⚠️ Impossible de récupérer les stats OpenRouter')
            return res.status(200).json({
                success: false,
                stats: null
            })
        }

        const data = await response.json()

        // Debug: Logger la réponse complète
        console.log('🔍 Réponse OpenRouter complète:', JSON.stringify(data, null, 2))

        // Récupérer les données depuis data.data (format OpenRouter)
        const apiData = data.data || data

        const stats = {
            limit: apiData.limit,
            limit_remaining: apiData.limit_remaining,
            usage: apiData.usage || 0,
            usage_daily: apiData.usage_daily || 0,
            usage_weekly: apiData.usage_weekly || 0,
            usage_monthly: apiData.usage_monthly || 0,
            is_free_tier: apiData.is_free_tier || false
        }

        // Ajouter le compteur de requêtes quotidiennes (géré côté client)
        // L'API retourne juste les stats OpenRouter, le compteur est géré en localStorage

        console.log('📊 Stats calculées:', stats)

        return res.status(200).json({
            success: true,
            stats,
            daily_limit: 1000  // Limite quotidienne pour affichage
        })
    } catch (error) {
        console.error('⚠️ Erreur récupération stats OpenRouter:', error.message)
        return res.status(200).json({
            success: false,
            stats: null
        })
    }
}
