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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { positionnement_id } = req.body

        if (!positionnement_id) {
            return res.status(400).json({ error: 'positionnement_id requis' })
        }

        // 1. Récupérer le positionnement avec toutes ses évaluations
        const { data: positionnement, error: positError } = await supabase
            .from('formation_positionnements')
            .select(`
                *,
                apprenant:users!formation_positionnements_apprenant_id_fkey(id, prenom, nom),
                formateur:users!formation_positionnements_formateur_id_fkey(id, prenom, nom),
                evaluations:formation_evaluations_positionnement(
                    *,
                    competence:formation_competences(
                        id,
                        intitule,
                        ordre,
                        categorie:formation_categories_competences(
                            id,
                            nom,
                            ordre,
                            domaine:formation_domaines(id, nom, ordre)
                        )
                    )
                )
            `)
            .eq('id', positionnement_id)
            .single()

        if (positError || !positionnement) {
            return res.status(404).json({ error: 'Positionnement non trouvé' })
        }

        // 2. Analyser les évaluations et extraire les compétences à travailler
        const competencesATravailler = []

        positionnement.evaluations.forEach(evaluation => {
            const { niveau_atteint, competence } = evaluation

            // Sélectionner seulement "non_acquis" et "en_cours"
            if (niveau_atteint === 'non_acquis' || niveau_atteint === 'en_cours') {
                // Conversion priorité : 'haute'→1, 'moyenne'→2, 'faible'→3
                // Conversion statut : 'a_faire'→'a_travailler'
                competencesATravailler.push({
                    competence_id: competence.id,
                    priorite: niveau_atteint === 'non_acquis' ? 1 : 2, // haute=1, moyenne=2
                    statut: 'a_travailler', // 'a_faire' → 'a_travailler'
                    // Note: ordre et objectif_specifique omis (colonnes inexistantes)
                    // Métadonnées pour tri
                    _domaine_ordre: competence.categorie.domaine.ordre,
                    _categorie_ordre: competence.categorie.ordre,
                    _competence_ordre: competence.ordre
                })
            }
        })

        // 3. Trier les compétences par domaine > catégorie > compétence (ordre pédagogique)
        competencesATravailler.sort((a, b) => {
            if (a._domaine_ordre !== b._domaine_ordre) {
                return a._domaine_ordre - b._domaine_ordre
            }
            if (a._categorie_ordre !== b._categorie_ordre) {
                return a._categorie_ordre - b._categorie_ordre
            }
            return a._competence_ordre - b._competence_ordre
        })

        // Supprimer les métadonnées de tri
        competencesATravailler.forEach((comp) => {
            delete comp._domaine_ordre
            delete comp._categorie_ordre
            delete comp._competence_ordre
        })

        // 4. Créer le plan de formation
        const { data: plan, error: planError } = await supabase
            .from('formation_plans')
            .insert([{
                apprenant_id: positionnement.apprenant_id,
                formateur_id: positionnement.formateur_id,
                positionnement_id: positionnement.id,
                date_debut: new Date().toISOString().split('T')[0],
                objectif_principal: `Plan généré depuis positionnement (${new Date(positionnement.date_positionnement).toLocaleDateString('fr-FR')}) - ${competencesATravailler.length} compétence(s)`,
                statut: 'en_cours' // 'brouillon' → 'en_cours' (correspond au schéma actuel)
            }])
            .select()
            .single()

        if (planError) throw planError

        // 5. Ajouter les compétences au plan
        if (competencesATravailler.length > 0) {
            const competencesToInsert = competencesATravailler.map(comp => ({
                plan_id: plan.id,
                ...comp
            }))

            const { error: compError } = await supabase
                .from('formation_plan_competences')
                .insert(competencesToInsert)

            if (compError) throw compError
        }

        // 6. Retourner le plan créé avec statistiques
        return res.status(201).json({
            plan,
            statistiques: {
                total_competences: competencesATravailler.length,
                priorite_haute: competencesATravailler.filter(c => c.priorite === 1).length, // 1 = haute
                priorite_moyenne: competencesATravailler.filter(c => c.priorite === 2).length // 2 = moyenne
            },
            message: `Plan créé avec ${competencesATravailler.length} compétence(s)`
        })

    } catch (error) {
        console.error('Erreur génération plan:', error)
        return res.status(500).json({ error: error.message })
    }
}
