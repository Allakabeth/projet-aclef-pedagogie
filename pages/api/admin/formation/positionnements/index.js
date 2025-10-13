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
            const { apprenant_id, formateur_id, statut } = req.query

            let query = supabase
                .from('formation_positionnements')
                .select(`
                    *,
                    apprenant:users!formation_positionnements_apprenant_id_fkey(id, prenom, nom, email),
                    formateur:users!formation_positionnements_formateur_id_fkey(id, prenom, nom, email)
                `)
                .order('created_at', { ascending: false })

            // Filtres optionnels
            if (apprenant_id) query = query.eq('apprenant_id', apprenant_id)
            if (formateur_id) query = query.eq('formateur_id', formateur_id)
            if (statut) query = query.eq('statut', statut)

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ positionnements: data })
        }

        if (req.method === 'POST') {
            const { apprenant_id, formateur_id, date_positionnement, commentaires_generaux } = req.body

            if (!apprenant_id || !formateur_id) {
                return res.status(400).json({ error: 'apprenant_id et formateur_id sont requis' })
            }

            const { data, error } = await supabase
                .from('formation_positionnements')
                .insert([{
                    apprenant_id,
                    formateur_id,
                    date_positionnement: date_positionnement || new Date().toISOString().split('T')[0],
                    commentaires_generaux,
                    statut: 'en_cours'
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ positionnement: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API positionnements:', error)
        return res.status(500).json({ error: error.message })
    }
}
