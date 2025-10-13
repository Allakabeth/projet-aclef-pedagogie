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

    const { id } = req.query // positionnement_id

    try {
        if (req.method === 'GET') {
            // Récupérer toutes les évaluations d'un positionnement
            const { data, error } = await supabase
                .from('formation_evaluations_positionnement')
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
                .eq('positionnement_id', id)
                .order('created_at', { ascending: true })

            if (error) throw error

            return res.status(200).json({ evaluations: data })
        }

        if (req.method === 'POST') {
            // Sauvegarder ou mettre à jour les évaluations en batch
            const { evaluations } = req.body

            if (!evaluations || !Array.isArray(evaluations)) {
                return res.status(400).json({ error: 'Le champ evaluations doit être un tableau' })
            }

            // Vérifier que le positionnement existe
            const { data: positionnement, error: posError } = await supabase
                .from('formation_positionnements')
                .select('id')
                .eq('id', id)
                .single()

            if (posError || !positionnement) {
                return res.status(404).json({ error: 'Positionnement non trouvé' })
            }

            const results = []
            const errors = []

            for (const evaluation of evaluations) {
                const { competence_id, niveau_atteint, commentaire } = evaluation

                if (!competence_id) {
                    errors.push({ error: 'competence_id manquant', data: evaluation })
                    continue
                }

                // Vérifier si l'évaluation existe déjà
                const { data: existing } = await supabase
                    .from('formation_evaluations_positionnement')
                    .select('id')
                    .eq('positionnement_id', id)
                    .eq('competence_id', competence_id)
                    .single()

                if (existing) {
                    // Mise à jour
                    const { data, error } = await supabase
                        .from('formation_evaluations_positionnement')
                        .update({
                            niveau_atteint,
                            commentaire
                        })
                        .eq('id', existing.id)
                        .select()
                        .single()

                    if (error) {
                        errors.push({ error: error.message, data: evaluation })
                    } else {
                        results.push(data)
                    }
                } else {
                    // Insertion
                    const { data, error } = await supabase
                        .from('formation_evaluations_positionnement')
                        .insert([{
                            positionnement_id: id,
                            competence_id,
                            niveau_atteint,
                            commentaire
                        }])
                        .select()
                        .single()

                    if (error) {
                        errors.push({ error: error.message, data: evaluation })
                    } else {
                        results.push(data)
                    }
                }
            }

            return res.status(200).json({
                success: results.length,
                errors: errors.length,
                evaluations: results,
                failed: errors
            })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API évaluations:', error)
        return res.status(500).json({ error: error.message })
    }
}
