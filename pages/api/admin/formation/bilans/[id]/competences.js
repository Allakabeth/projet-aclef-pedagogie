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

    const { id } = req.query // bilan_id

    try {
        if (req.method === 'GET') {
            // Recuperer toutes les evaluations de competences d'un bilan
            const { data, error } = await supabase
                .from('formation_bilan_competences')
                .select(`
                    *,
                    competence:formation_competences(
                        *,
                        categorie:formation_categories_competences(
                            *,
                            domaine:formation_domaines(*)
                        )
                    )
                `)
                .eq('bilan_id', id)
                .order('created_at', { ascending: true })

            if (error) throw error

            return res.status(200).json({ competences: data })
        }

        if (req.method === 'POST') {
            // Upsert des evaluations de competences en batch
            const { competences } = req.body

            if (!competences || !Array.isArray(competences)) {
                return res.status(400).json({ error: 'Le champ competences doit etre un tableau' })
            }

            // Verifier que le bilan existe
            const { data: bilan, error: bilanError } = await supabase
                .from('formation_bilans')
                .select('id')
                .eq('id', id)
                .single()

            if (bilanError || !bilan) {
                return res.status(404).json({ error: 'Bilan non trouve' })
            }

            // Preparer les donnees pour upsert
            const upsertData = competences.map(comp => ({
                bilan_id: id,
                competence_id: comp.competence_id,
                statut_debut: comp.statut_debut || null,
                statut_fin: comp.statut_fin || null,
                score_moyen: comp.score_moyen || null,
                nombre_exercices: comp.nombre_exercices || 0,
                commentaire: comp.commentaire || null
            }))

            const { data, error } = await supabase
                .from('formation_bilan_competences')
                .upsert(upsertData, {
                    onConflict: 'bilan_id,competence_id'
                })
                .select()

            if (error) throw error

            return res.status(200).json({
                success: data.length,
                competences: data
            })
        }

        if (req.method === 'DELETE') {
            // Supprimer une competence specifique du bilan
            const { competence_id } = req.query

            if (!competence_id) {
                return res.status(400).json({ error: 'competence_id requis' })
            }

            const { error } = await supabase
                .from('formation_bilan_competences')
                .delete()
                .eq('bilan_id', id)
                .eq('competence_id', competence_id)

            if (error) throw error

            return res.status(200).json({ message: 'Competence retiree du bilan' })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API competences bilan:', error)
        return res.status(500).json({ error: error.message })
    }
}
