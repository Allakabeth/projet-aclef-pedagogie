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
            const { domaine_id } = req.query

            let query = supabase
                .from('formation_categories_competences')
                .select('*')
                .order('ordre', { ascending: true })

            // Filtrer par domaine si spécifié
            if (domaine_id) {
                query = query.eq('domaine_id', domaine_id)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ categories: data })
        }

        if (req.method === 'POST') {
            // Créer une nouvelle catégorie
            const { domaine_id, nom, description, ordre } = req.body

            if (!domaine_id || !nom) {
                return res.status(400).json({ error: 'domaine_id et nom sont requis' })
            }

            const { data, error } = await supabase
                .from('formation_categories_competences')
                .insert([{
                    domaine_id,
                    nom,
                    description,
                    ordre: ordre || 1
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ categorie: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API catégories:', error)
        return res.status(500).json({ error: error.message })
    }
}
