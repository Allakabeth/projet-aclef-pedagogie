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
            const { categorie, type } = req.query

            let query = supabase
                .from('exercices_code_route')
                .select('*')
                .order('created_at', { ascending: false })

            // Filtrer par catégorie si spécifié
            if (categorie) {
                query = query.eq('categorie', categorie)
            }

            // Filtrer par type si spécifié
            if (type) {
                query = query.eq('type', type)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ exercices: data })
        }

        if (req.method === 'POST') {
            // Créer un nouvel exercice
            const { categorie, type, titre, description, contenu } = req.body

            if (!categorie || !type || !titre) {
                return res.status(400).json({ error: 'categorie, type et titre sont requis' })
            }

            const { data, error } = await supabase
                .from('exercices_code_route')
                .insert([{
                    categorie,
                    type,
                    titre,
                    description: description || null,
                    contenu: contenu || {}
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ exercice: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercices Code de la Route:', error)
        return res.status(500).json({ error: error.message })
    }
}
