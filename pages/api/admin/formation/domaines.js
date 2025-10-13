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
            // Récupérer tous les domaines (actifs ET archivés pour l'admin)
            const { include_archived } = req.query

            let query = supabase
                .from('formation_domaines')
                .select('*')
                .order('ordre', { ascending: true })

            // Par défaut, inclure tous les domaines pour l'admin
            // Filtrer seulement si explicitement demandé
            if (include_archived === 'false') {
                query = query.eq('actif', true)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ domaines: data })
        }

        if (req.method === 'POST') {
            // Créer un nouveau domaine
            const { nom, emoji, description, ordre, actif } = req.body

            if (!nom) {
                return res.status(400).json({ error: 'Le nom est requis' })
            }

            const { data, error } = await supabase
                .from('formation_domaines')
                .insert([{
                    nom,
                    emoji,
                    description,
                    ordre: ordre || 1,
                    actif: actif !== undefined ? actif : true
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ domaine: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API domaines:', error)
        return res.status(500).json({ error: error.message })
    }
}
