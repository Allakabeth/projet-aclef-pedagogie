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

    const { id } = req.query

    try {
        if (req.method === 'GET') {
            // Récupérer un positionnement avec toutes ses données
            const { data, error } = await supabase
                .from('formation_positionnements')
                .select(`
                    *,
                    apprenant:users!formation_positionnements_apprenant_id_fkey(id, prenom, nom, email),
                    formateur:users!formation_positionnements_formateur_id_fkey(id, prenom, nom, email),
                    evaluations:formation_evaluations_positionnement(
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
                return res.status(404).json({ error: 'Positionnement non trouvé' })
            }

            return res.status(200).json({ positionnement: data })
        }

        if (req.method === 'PUT') {
            const { date_positionnement, commentaires_generaux, statut } = req.body

            const updateData = {}
            if (date_positionnement !== undefined) updateData.date_positionnement = date_positionnement
            if (commentaires_generaux !== undefined) updateData.commentaires_generaux = commentaires_generaux
            if (statut !== undefined) updateData.statut = statut

            const { data, error } = await supabase
                .from('formation_positionnements')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Positionnement non trouvé' })
            }

            return res.status(200).json({ positionnement: data })
        }

        if (req.method === 'DELETE') {
            // Vérifier si le positionnement existe
            const { data: existing, error: checkError } = await supabase
                .from('formation_positionnements')
                .select('id')
                .eq('id', id)
                .single()

            if (checkError || !existing) {
                return res.status(404).json({ error: 'Positionnement non trouvé' })
            }

            // Supprimer les évaluations associées d'abord
            const { error: deleteEvalError } = await supabase
                .from('formation_evaluations_positionnement')
                .delete()
                .eq('positionnement_id', id)

            if (deleteEvalError) throw deleteEvalError

            // Supprimer le positionnement
            const { error } = await supabase
                .from('formation_positionnements')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Positionnement supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API positionnement:', error)
        return res.status(500).json({ error: error.message })
    }
}
