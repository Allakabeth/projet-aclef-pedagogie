import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // Verifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifie' })
    }

    try {
        // --- GET : Lister les coordonnees PDF ---
        if (req.method === 'GET') {
            const { positionnement_id, apprenant_id, limit, offset } = req.query

            let query = supabase
                .from('formation_pdf_coordonnees')
                .select('*')
                .order('created_at', { ascending: false })

            // Filtres optionnels
            if (positionnement_id) {
                query = query.eq('positionnement_id', positionnement_id)
            }
            if (apprenant_id) {
                query = query.eq('apprenant_id', apprenant_id)
            }

            // Pagination
            if (limit) {
                const lim = parseInt(limit, 10) || 50
                const off = parseInt(offset, 10) || 0
                query = query.range(off, off + lim - 1)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ coordonnees: data })
        }

        // --- POST : Sauvegarder de nouvelles coordonnees PDF ---
        if (req.method === 'POST') {
            const {
                positionnement_id,
                apprenant_id,
                formateur,
                date_positionnement,
                dispositif,
                domaines_ids,
                json_data
            } = req.body

            // Validation
            if (!json_data) {
                return res.status(400).json({ error: 'json_data est requis' })
            }

            // Verifier que json_data contient les cles obligatoires
            if (!json_data.page_size || !json_data.markers || !json_data.cases) {
                return res.status(400).json({
                    error: 'json_data doit contenir page_size, markers et cases'
                })
            }

            if (!json_data.cases || json_data.cases.length === 0) {
                return res.status(400).json({
                    error: 'json_data.cases ne peut pas etre vide'
                })
            }

            // Si un positionnement_id est fourni, verifier qu'il existe
            if (positionnement_id) {
                const { data: posCheck, error: posError } = await supabase
                    .from('formation_positionnements')
                    .select('id')
                    .eq('id', positionnement_id)
                    .single()

                if (posError || !posCheck) {
                    return res.status(404).json({
                        error: 'Positionnement non trouve avec l\'ID fourni'
                    })
                }
            }

            // Inserer les coordonnees
            const insertData = {
                json_data
            }

            // Champs optionnels
            if (positionnement_id) insertData.positionnement_id = positionnement_id
            if (apprenant_id) insertData.apprenant_id = apprenant_id
            if (formateur !== undefined) insertData.formateur = formateur
            if (date_positionnement !== undefined) insertData.date_positionnement = date_positionnement
            if (dispositif !== undefined) insertData.dispositif = dispositif
            if (domaines_ids && Array.isArray(domaines_ids)) insertData.domaines_ids = domaines_ids

            const { data, error } = await supabase
                .from('formation_pdf_coordonnees')
                .insert([insertData])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json({ coordonnees: data })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API pdf-coordonnees:', error)
        return res.status(500).json({ error: error.message })
    }
}
