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

    const { id } = req.query

    try {
        if (req.method === 'GET') {
            // Recuperer un bilan avec toutes ses donnees
            const { data, error } = await supabase
                .from('formation_bilans')
                .select(`
                    *,
                    apprenant:users!formation_bilans_apprenant_id_fkey(id, prenom, nom),
                    formateur:users!formation_bilans_formateur_id_fkey(id, prenom, nom),
                    plan:formation_plans(id, objectif_principal, statut),
                    competences:formation_bilan_competences(
                        *,
                        competence:formation_competences(
                            *,
                            categorie:formation_categories_competences(
                                *,
                                domaine:formation_domaines(*)
                            )
                        )
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Bilan non trouve' })
            }

            return res.status(200).json({ bilan: data })
        }

        if (req.method === 'PUT') {
            const {
                plan_id,
                date_bilan,
                type,
                periode_debut,
                periode_fin,
                synthese,
                competences_acquises,
                competences_en_cours,
                recommandations,
                domaine_comments,
                fichier_pdf,
                fichier_word,
                statut,
                duree_realisee
            } = req.body

            const updateData = {}
            if (plan_id !== undefined) updateData.plan_id = plan_id
            if (date_bilan !== undefined) updateData.date_bilan = date_bilan
            if (type !== undefined) updateData.type = type
            if (periode_debut !== undefined) updateData.periode_debut = periode_debut
            if (periode_fin !== undefined) updateData.periode_fin = periode_fin
            if (synthese !== undefined) updateData.synthese = synthese
            if (competences_acquises !== undefined) updateData.competences_acquises = competences_acquises
            if (competences_en_cours !== undefined) updateData.competences_en_cours = competences_en_cours
            if (recommandations !== undefined) updateData.recommandations = recommandations
            if (domaine_comments !== undefined) updateData.domaine_comments = domaine_comments
            if (fichier_pdf !== undefined) updateData.fichier_pdf = fichier_pdf
            if (fichier_word !== undefined) updateData.fichier_word = fichier_word
            if (statut !== undefined) updateData.statut = statut
            if (duree_realisee !== undefined) updateData.duree_realisee = duree_realisee

            const { data, error } = await supabase
                .from('formation_bilans')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Bilan non trouve' })
            }

            return res.status(200).json({ bilan: data })
        }

        if (req.method === 'DELETE') {
            // Verifier si le bilan existe
            const { data: existing, error: checkError } = await supabase
                .from('formation_bilans')
                .select('id')
                .eq('id', id)
                .single()

            if (checkError || !existing) {
                return res.status(404).json({ error: 'Bilan non trouve' })
            }

            // Supprimer les competences associees d'abord (CASCADE devrait le faire, mais par securite)
            const { error: deleteCompError } = await supabase
                .from('formation_bilan_competences')
                .delete()
                .eq('bilan_id', id)

            if (deleteCompError) throw deleteCompError

            // Supprimer le bilan
            const { error } = await supabase
                .from('formation_bilans')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Bilan supprime avec succes' })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API bilan:', error)
        return res.status(500).json({ error: error.message })
    }
}
