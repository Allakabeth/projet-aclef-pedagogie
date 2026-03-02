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
            // Recuperer une attestation avec toutes ses donnees
            const { data, error } = await supabase
                .from('formation_attestations')
                .select(`
                    *,
                    apprenant:users!formation_attestations_apprenant_id_fkey(id, prenom, nom),
                    bilan:formation_bilans(id, date_bilan, type),
                    competences:formation_attestation_competences(
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
                return res.status(404).json({ error: 'Attestation non trouvee' })
            }

            return res.status(200).json({ attestation: data })
        }

        if (req.method === 'PUT') {
            const {
                numero,
                bilan_id,
                date_delivrance,
                lieu_delivrance,
                signataire_nom,
                signataire_fonction,
                fichier_pdf,
                statut
            } = req.body

            const updateData = {}
            if (numero !== undefined) updateData.numero = numero
            if (bilan_id !== undefined) updateData.bilan_id = bilan_id
            if (date_delivrance !== undefined) updateData.date_delivrance = date_delivrance
            if (lieu_delivrance !== undefined) updateData.lieu_delivrance = lieu_delivrance
            if (signataire_nom !== undefined) updateData.signataire_nom = signataire_nom
            if (signataire_fonction !== undefined) updateData.signataire_fonction = signataire_fonction
            if (fichier_pdf !== undefined) updateData.fichier_pdf = fichier_pdf
            if (statut !== undefined) updateData.statut = statut

            const { data, error } = await supabase
                .from('formation_attestations')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Attestation non trouvee' })
            }

            return res.status(200).json({ attestation: data })
        }

        if (req.method === 'DELETE') {
            // Verifier si l'attestation existe
            const { data: existing, error: checkError } = await supabase
                .from('formation_attestations')
                .select('id')
                .eq('id', id)
                .single()

            if (checkError || !existing) {
                return res.status(404).json({ error: 'Attestation non trouvee' })
            }

            // Supprimer les competences associees d'abord (CASCADE devrait le faire, mais par securite)
            const { error: deleteCompError } = await supabase
                .from('formation_attestation_competences')
                .delete()
                .eq('attestation_id', id)

            if (deleteCompError) throw deleteCompError

            // Supprimer l'attestation
            const { error } = await supabase
                .from('formation_attestations')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Attestation supprimee avec succes' })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API attestation:', error)
        return res.status(500).json({ error: error.message })
    }
}
