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

    const { id } = req.query // plan_id

    try {
        if (req.method === 'GET') {
            // Récupérer toutes les compétences d'un plan
            const { data, error } = await supabase
                .from('formation_plan_competences')
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
                .eq('plan_id', id)
                .order('created_at', { ascending: true }) // Utiliser created_at au lieu de 'ordre'

            if (error) throw error

            return res.status(200).json({ competences: data })
        }

        if (req.method === 'POST') {
            // Ajouter ou mettre à jour les compétences en batch
            const { competences } = req.body

            if (!competences || !Array.isArray(competences)) {
                return res.status(400).json({ error: 'Le champ competences doit être un tableau' })
            }

            // Vérifier que le plan existe
            const { data: plan, error: planError } = await supabase
                .from('formation_plans')
                .select('id')
                .eq('id', id)
                .single()

            if (planError || !plan) {
                return res.status(404).json({ error: 'Plan non trouvé' })
            }

            const results = []
            const errors = []

            // Fonction de conversion priorité texte → nombre
            const convertPriorite = (p) => {
                if (p === 'haute') return 1
                if (p === 'faible') return 3
                return 2 // 'moyenne' par défaut
            }

            // Fonction de conversion statut
            const convertStatut = (s) => {
                if (s === 'a_faire') return 'a_travailler'
                if (s === 'valide') return 'acquis'
                return s || 'a_travailler'
            }

            for (const comp of competences) {
                const {
                    competence_id,
                    priorite,
                    statut
                } = comp
                // Note: ordre et objectif_specifique ignorés (colonnes inexistantes)

                if (!competence_id) {
                    errors.push({ error: 'competence_id manquant', data: comp })
                    continue
                }

                // Vérifier si la compétence existe déjà dans le plan
                const { data: existing } = await supabase
                    .from('formation_plan_competences')
                    .select('id')
                    .eq('plan_id', id)
                    .eq('competence_id', competence_id)
                    .single()

                if (existing) {
                    // Mise à jour
                    const updateData = {}
                    if (priorite !== undefined) updateData.priorite = convertPriorite(priorite)
                    if (statut !== undefined) updateData.statut = convertStatut(statut)

                    const { data, error } = await supabase
                        .from('formation_plan_competences')
                        .update(updateData)
                        .eq('id', existing.id)
                        .select()
                        .single()

                    if (error) {
                        errors.push({ error: error.message, data: comp })
                    } else {
                        results.push(data)
                    }
                } else {
                    // Insertion
                    const { data, error } = await supabase
                        .from('formation_plan_competences')
                        .insert([{
                            plan_id: id,
                            competence_id,
                            priorite: convertPriorite(priorite),
                            statut: convertStatut(statut)
                        }])
                        .select()
                        .single()

                    if (error) {
                        errors.push({ error: error.message, data: comp })
                    } else {
                        results.push(data)
                    }
                }
            }

            return res.status(200).json({
                success: results.length,
                errors: errors.length,
                competences: results,
                failed: errors
            })
        }

        if (req.method === 'DELETE') {
            // Supprimer une compétence spécifique du plan
            const { competence_id } = req.query

            if (!competence_id) {
                return res.status(400).json({ error: 'competence_id requis' })
            }

            const { error } = await supabase
                .from('formation_plan_competences')
                .delete()
                .eq('plan_id', id)
                .eq('competence_id', competence_id)

            if (error) throw error

            return res.status(200).json({ message: 'Compétence retirée du plan' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API compétences plan:', error)
        return res.status(500).json({ error: error.message })
    }
}
