import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        console.log('🧹 Nettoyage du cache Groq...')

        // Supprimer toutes les phrases générées par Groq
        const { data, error } = await supabaseAdmin
            .from('phrases_pregenerees')
            .delete()
            .eq('source', 'groq')
            .select()

        if (error) {
            console.error('❌ Erreur:', error)
            return res.status(500).json({ error: error.message })
        }

        console.log(`✅ ${data.length} phrases Groq supprimées du cache`)

        // Stats restantes
        const { count } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('*', { count: 'exact', head: true })

        console.log(`📊 ${count} phrases restantes en cache`)

        return res.status(200).json({
            success: true,
            deleted: data.length,
            remaining: count
        })

    } catch (error) {
        console.error('💥 Erreur:', error)
        return res.status(500).json({ error: error.message })
    }
}
