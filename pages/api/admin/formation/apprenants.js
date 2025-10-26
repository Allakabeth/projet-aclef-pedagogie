import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    // Vérifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    try {
        // Récupérer UNIQUEMENT les apprenants (pas les formateurs ni admins)
        const { data, error } = await supabase
            .from('users')
            .select('id, prenom, nom, email, identifiant, archive')
            .eq('role', 'apprenant')
            .order('nom', { ascending: true })

        if (error) throw error

        return res.status(200).json({ apprenants: data })
    } catch (error) {
        console.error('Erreur API apprenants:', error)
        return res.status(500).json({ error: error.message })
    }
}
