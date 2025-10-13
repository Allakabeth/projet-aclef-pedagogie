import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // Vérifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    try {
        if (req.method === 'GET') {
            // Récupérer toutes les catégories
            const { data, error } = await supabase
                .from('categories_outils_pedagogiques')
                .select('*')
                .order('ordre', { ascending: true })

            if (error) throw error

            return res.status(200).json({ categories: data })
        }

        if (req.method === 'POST') {
            // Créer une nouvelle catégorie
            const { nom, description, emoji, couleur, ordre } = req.body

            if (!nom) {
                return res.status(400).json({ error: 'Le nom est requis' })
            }

            const { data, error } = await supabase
                .from('categories_outils_pedagogiques')
                .insert([{
                    nom,
                    description: description || null,
                    emoji: emoji || '📁',
                    couleur: couleur || '#6b7280',
                    ordre: ordre || 0,
                    actif: true
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ categorie: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API categories-outils:', error)
        return res.status(500).json({ error: error.message })
    }
}
