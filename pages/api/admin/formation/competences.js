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
            const { categorie_id } = req.query

            let query = supabase
                .from('formation_competences')
                .select('*')
                .order('ordre', { ascending: true })

            // Filtrer par catégorie si spécifié
            if (categorie_id) {
                query = query.eq('categorie_id', categorie_id)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ competences: data })
        }

        if (req.method === 'POST') {
            // Créer une nouvelle compétence
            const { categorie_id, code, intitule, description, contexte, ordre } = req.body

            if (!categorie_id || !intitule) {
                return res.status(400).json({ error: 'categorie_id et intitule sont requis' })
            }

            const { data, error } = await supabase
                .from('formation_competences')
                .insert([{
                    categorie_id,
                    code,
                    intitule,
                    description,
                    contexte,
                    ordre: ordre || 1
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ competence: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API compétences:', error)
        return res.status(500).json({ error: error.message })
    }
}
