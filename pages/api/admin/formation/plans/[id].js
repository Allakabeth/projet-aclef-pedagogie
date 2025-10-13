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
            // Récupérer un plan avec toutes ses données
            const { data, error } = await supabase
                .from('formation_plans')
                .select(`
                    *,
                    apprenant:users!formation_plans_apprenant_id_fkey(id, prenom, nom, email),
                    formateur:users!formation_plans_formateur_id_fkey(id, prenom, nom, email),
                    positionnement:formation_positionnements(id, date_positionnement, statut),
                    competences:formation_plan_competences(
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
                return res.status(404).json({ error: 'Plan non trouvé' })
            }

            return res.status(200).json({ plan: data })
        }

        if (req.method === 'PUT') {
            const {
                date_debut,
                date_fin_prevue,
                objectifs_generaux,
                statut
            } = req.body

            const updateData = {}
            if (date_debut !== undefined) updateData.date_debut = date_debut
            if (date_fin_prevue !== undefined) updateData.date_fin_prevue = date_fin_prevue
            // Utiliser objectif_principal au lieu de objectifs_generaux
            if (objectifs_generaux !== undefined) updateData.objectif_principal = objectifs_generaux
            // Convertir les statuts si nécessaire
            if (statut !== undefined) {
                // Mapper les statuts frontend vers les statuts BDD
                const statutMap = {
                    'brouillon': 'en_cours',
                    'actif': 'en_cours',
                    'termine': 'termine',
                    'archive': 'abandonne'
                }
                updateData.statut = statutMap[statut] || statut
            }

            const { data, error } = await supabase
                .from('formation_plans')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Plan non trouvé' })
            }

            return res.status(200).json({ plan: data })
        }

        if (req.method === 'DELETE') {
            // Vérifier si le plan existe
            const { data: existing, error: checkError } = await supabase
                .from('formation_plans')
                .select('id')
                .eq('id', id)
                .single()

            if (checkError || !existing) {
                return res.status(404).json({ error: 'Plan non trouvé' })
            }

            // Supprimer les compétences associées d'abord
            const { error: deleteCompError } = await supabase
                .from('formation_plan_competences')
                .delete()
                .eq('plan_id', id)

            if (deleteCompError) throw deleteCompError

            // Supprimer le plan
            const { error } = await supabase
                .from('formation_plans')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Plan supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API plan:', error)
        return res.status(500).json({ error: error.message })
    }
}
