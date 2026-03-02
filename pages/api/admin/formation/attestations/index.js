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

    try {
        if (req.method === 'GET') {
            const { apprenant_id, statut } = req.query

            let query = supabase
                .from('formation_attestations')
                .select(`
                    *,
                    apprenant:users!formation_attestations_apprenant_id_fkey(id, prenom, nom),
                    bilan:formation_bilans(id, date_bilan, type)
                `)
                .order('date_delivrance', { ascending: false })

            // Filtres optionnels
            if (apprenant_id) query = query.eq('apprenant_id', apprenant_id)
            if (statut) query = query.eq('statut', statut)

            const { data, error } = await query

            if (error) throw error

            // Compter les competences pour chaque attestation
            if (data && data.length > 0) {
                const attestationIds = data.map(a => a.id)

                const { data: compCounts, error: countError } = await supabase
                    .from('formation_attestation_competences')
                    .select('attestation_id')
                    .in('attestation_id', attestationIds)

                if (!countError && compCounts) {
                    // Compter par attestation_id
                    const countMap = {}
                    compCounts.forEach(row => {
                        countMap[row.attestation_id] = (countMap[row.attestation_id] || 0) + 1
                    })

                    // Ajouter le compteur a chaque attestation
                    data.forEach(attestation => {
                        attestation.nb_competences = countMap[attestation.id] || 0
                    })
                }
            }

            return res.status(200).json({ attestations: data })
        }

        if (req.method === 'POST') {
            const {
                apprenant_id,
                numero,
                date_delivrance,
                bilan_id,
                lieu_delivrance,
                signataire_nom,
                signataire_fonction,
                fichier_pdf,
                statut,
                competences
            } = req.body

            if (!apprenant_id || !numero || !date_delivrance) {
                return res.status(400).json({ error: 'apprenant_id, numero et date_delivrance sont requis' })
            }

            // Construire l'objet d'insertion
            const insertData = {
                apprenant_id,
                numero,
                date_delivrance,
                statut: statut || 'brouillon'
            }

            if (bilan_id !== undefined) insertData.bilan_id = bilan_id
            if (lieu_delivrance !== undefined) insertData.lieu_delivrance = lieu_delivrance
            if (signataire_nom !== undefined) insertData.signataire_nom = signataire_nom
            if (signataire_fonction !== undefined) insertData.signataire_fonction = signataire_fonction
            if (fichier_pdf !== undefined) insertData.fichier_pdf = fichier_pdf

            const { data, error } = await supabase
                .from('formation_attestations')
                .insert([insertData])
                .select()
                .single()

            if (error) throw error

            // Si des competences sont fournies, les inserer aussi
            if (competences && Array.isArray(competences) && competences.length > 0) {
                const attestationCompetences = competences.map(comp => ({
                    attestation_id: data.id,
                    competence_id: comp.competence_id,
                    domaine_nom: comp.domaine_nom || null,
                    niveau_atteint: comp.niveau_atteint || null
                }))

                const { error: compError } = await supabase
                    .from('formation_attestation_competences')
                    .insert(attestationCompetences)

                if (compError) {
                    console.error('Erreur insertion competences attestation:', compError)
                    // L'attestation a ete creee, on retourne avec un avertissement
                    return res.status(201).json({
                        attestation: data,
                        warning: 'Attestation creee mais erreur lors de l\'insertion des competences: ' + compError.message
                    })
                }
            }

            return res.status(201).json({ attestation: data })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API attestations:', error)
        return res.status(500).json({ error: error.message })
    }
}
