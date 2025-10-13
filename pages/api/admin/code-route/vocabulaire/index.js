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
            const { categorie, search } = req.query

            let query = supabase
                .from('vocabulaire_code_route')
                .select('*')
                .order('categorie', { ascending: true })
                .order('ordre_categorie', { ascending: true })

            // Filtrer par catégorie si spécifié
            if (categorie) {
                query = query.eq('categorie', categorie)
            }

            // Recherche textuelle si spécifié
            if (search) {
                query = query.or(`mot.ilike.%${search}%,definition_simple.ilike.%${search}%`)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ vocabulaire: data })
        }

        if (req.method === 'POST') {
            // Créer un nouveau terme de vocabulaire
            const { categorie, emoji, mot, definition_simple, ordre_categorie } = req.body

            if (!categorie || !mot || !definition_simple) {
                return res.status(400).json({ error: 'categorie, mot et definition_simple sont requis' })
            }

            // Trouver le prochain numéro d'ordre si non spécifié
            let ordre = ordre_categorie
            if (!ordre) {
                const { data: existingTerms } = await supabase
                    .from('vocabulaire_code_route')
                    .select('ordre_categorie')
                    .eq('categorie', categorie)
                    .order('ordre_categorie', { ascending: false })
                    .limit(1)

                ordre = (existingTerms && existingTerms.length > 0) ? existingTerms[0].ordre_categorie + 1 : 1
            }

            const { data, error } = await supabase
                .from('vocabulaire_code_route')
                .insert([{
                    categorie,
                    emoji: emoji || '📝',
                    mot,
                    definition_simple,
                    ordre_categorie: ordre
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ vocabulaire: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API vocabulaire Code de la Route:', error)
        return res.status(500).json({ error: error.message })
    }
}
