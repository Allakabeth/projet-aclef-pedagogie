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
            const { competence_id, type, difficulte } = req.query

            let query = supabase
                .from('formation_exercices')
                .select('*')
                .order('created_at', { ascending: false })

            // Filtrer par compétence si spécifié
            if (competence_id) {
                query = query.eq('competence_id', competence_id)
            }

            // Filtrer par type si spécifié
            if (type) {
                query = query.eq('type', type)
            }

            // Filtrer par difficulté si spécifié
            if (difficulte) {
                query = query.eq('difficulte', difficulte)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ exercices: data })
        }

        if (req.method === 'POST') {
            // Créer un nouvel exercice
            const { competence_id, categorie_id, type, titre, description, difficulte, contenu } = req.body

            if (!competence_id || !type || !titre) {
                return res.status(400).json({ error: 'competence_id, type et titre sont requis' })
            }

            const { data, error} = await supabase
                .from('formation_exercices')
                .insert([{
                    competence_id,
                    categorie_id: categorie_id || null,
                    type,
                    titre,
                    description,
                    difficulte: difficulte || 'moyen',
                    contenu: contenu || {}
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ exercice: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercices:', error)
        return res.status(500).json({ error: error.message })
    }
}
