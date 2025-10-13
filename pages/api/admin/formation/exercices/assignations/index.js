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
            // Récupérer toutes les assignations avec les infos des exercices et apprenants
            const { data, error } = await supabase
                .from('formation_exercices_assignations')
                .select(`
                    *,
                    exercice:formation_exercices(id, titre, type),
                    apprenant:users(id, prenom, nom)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            return res.status(200).json({ assignations: data })
        }

        if (req.method === 'POST') {
            // Créer des assignations (peut assigner à plusieurs apprenants d'un coup)
            const { exercice_id, apprenant_ids, date_limite } = req.body

            if (!exercice_id || !apprenant_ids || !Array.isArray(apprenant_ids) || apprenant_ids.length === 0) {
                return res.status(400).json({ error: 'exercice_id et apprenant_ids (array) sont requis' })
            }

            // Créer une assignation pour chaque apprenant
            const assignations = apprenant_ids.map(apprenant_id => ({
                exercice_id,
                apprenant_id,
                date_limite: date_limite || null,
                statut: 'a_faire',
                tentatives: 0
            }))

            const { data, error } = await supabase
                .from('formation_exercices_assignations')
                .insert(assignations)
                .select()

            if (error) {
                // Gérer le cas d'une assignation déjà existante
                if (error.code === '23505') { // Violation de contrainte unique
                    return res.status(400).json({
                        error: 'Une ou plusieurs assignations existent déjà pour ces apprenants'
                    })
                }
                throw error
            }

            return res.status(201).json({ assignations: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API assignations:', error)
        return res.status(500).json({ error: error.message })
    }
}
