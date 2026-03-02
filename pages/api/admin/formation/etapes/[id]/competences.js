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

    const { id: etapeId } = req.query

    try {
        if (req.method === 'GET') {
            // Récupérer les compétences liées à une étape
            const { data, error } = await supabase
                .from('formation_etape_competences')
                .select(`
                    id,
                    etape_id,
                    competence_id,
                    created_at,
                    competence:formation_competences(
                        id,
                        code,
                        intitule,
                        categorie:formation_categories_competences(
                            id,
                            nom,
                            domaine:formation_domaines(id, nom, emoji)
                        )
                    )
                `)
                .eq('etape_id', etapeId)
                .order('created_at', { ascending: true })

            if (error) throw error

            return res.status(200).json({ competences: data })
        }

        if (req.method === 'POST') {
            // Ajouter des compétences à une étape
            // Accepte: { competence_ids: [uuid, uuid, ...] }
            const { competence_ids } = req.body

            if (!competence_ids || !Array.isArray(competence_ids) || competence_ids.length === 0) {
                return res.status(400).json({
                    error: 'competence_ids (tableau) est requis'
                })
            }

            // Vérifier que l'étape existe
            const { data: etape, error: etapeError } = await supabase
                .from('formation_etapes')
                .select('id')
                .eq('id', etapeId)
                .single()

            if (etapeError || !etape) {
                return res.status(404).json({ error: 'Étape non trouvée' })
            }

            // Insérer les liens (ignorer les doublons grâce à onConflict)
            const rows = competence_ids.map(cid => ({
                etape_id: etapeId,
                competence_id: cid
            }))

            const { data, error } = await supabase
                .from('formation_etape_competences')
                .upsert(rows, { onConflict: 'etape_id,competence_id' })
                .select(`
                    id,
                    etape_id,
                    competence_id,
                    created_at,
                    competence:formation_competences(
                        id,
                        code,
                        intitule
                    )
                `)

            if (error) throw error

            return res.status(201).json({ competences: data })
        }

        if (req.method === 'DELETE') {
            // Supprimer des compétences d'une étape
            // Accepte: { competence_ids: [uuid, uuid, ...] } ou query ?competence_id=uuid
            const competenceId = req.query.competence_id
            const competenceIds = req.body?.competence_ids

            if (competenceId) {
                // Supprimer un seul lien
                const { error } = await supabase
                    .from('formation_etape_competences')
                    .delete()
                    .eq('etape_id', etapeId)
                    .eq('competence_id', competenceId)

                if (error) throw error

                return res.status(200).json({ message: 'Compétence retirée de l\'étape' })
            }

            if (competenceIds && Array.isArray(competenceIds) && competenceIds.length > 0) {
                // Supprimer plusieurs liens
                const { error } = await supabase
                    .from('formation_etape_competences')
                    .delete()
                    .eq('etape_id', etapeId)
                    .in('competence_id', competenceIds)

                if (error) throw error

                return res.status(200).json({
                    message: `${competenceIds.length} compétence(s) retirée(s) de l'étape`
                })
            }

            return res.status(400).json({
                error: 'competence_id (query) ou competence_ids (body) requis'
            })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API étape-compétences:', error)
        return res.status(500).json({ error: error.message })
    }
}
