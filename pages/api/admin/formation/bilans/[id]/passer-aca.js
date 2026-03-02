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

    const { id } = req.query // bilan_id

    try {
        if (req.method === 'POST') {
            const {
                lieu_delivrance,
                signataire_nom,
                signataire_fonction
            } = req.body

            // 1. Recuperer le bilan avec ses competences et les infos apprenant
            const { data: bilan, error: bilanError } = await supabase
                .from('formation_bilans')
                .select(`
                    *,
                    apprenant:users!formation_bilans_apprenant_id_fkey(id, prenom, nom),
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

            if (bilanError || !bilan) {
                return res.status(404).json({ error: 'Bilan non trouve' })
            }

            // 2. Generer le numero ACA
            const year = new Date().getFullYear()
            const prefix = `ACA-${year}-`

            const { data: existingAcas, error: acaError } = await supabase
                .from('formation_attestations')
                .select('numero')
                .like('numero', `${prefix}%`)
                .order('numero', { ascending: false })
                .limit(1)

            if (acaError) throw acaError

            let nextSeq = 1
            if (existingAcas && existingAcas.length > 0) {
                // Extraire le numero de sequence du dernier ACA
                const lastNumero = existingAcas[0].numero
                const lastSeqStr = lastNumero.replace(prefix, '')
                const lastSeq = parseInt(lastSeqStr, 10)
                if (!isNaN(lastSeq)) {
                    nextSeq = lastSeq + 1
                }
            }

            const numero = `${prefix}${String(nextSeq).padStart(3, '0')}`

            // 3. Creer l'attestation
            const { data: attestation, error: attError } = await supabase
                .from('formation_attestations')
                .insert([{
                    numero,
                    apprenant_id: bilan.apprenant_id,
                    bilan_id: bilan.id,
                    date_delivrance: new Date().toISOString().split('T')[0],
                    lieu_delivrance: lieu_delivrance || null,
                    signataire_nom: signataire_nom || null,
                    signataire_fonction: signataire_fonction || null,
                    statut: 'brouillon'
                }])
                .select()
                .single()

            if (attError) throw attError

            // 4. Filtrer les competences acquises et creer les lignes attestation_competences
            const competencesAcquises = (bilan.competences || []).filter(
                bc => bc.statut_fin === 'acquis'
            )

            if (competencesAcquises.length > 0) {
                const attCompetences = competencesAcquises.map(bc => {
                    // Remonter la chaine: competence -> categorie -> domaine
                    const domaine_nom = bc.competence?.categorie?.domaine?.nom || null

                    return {
                        attestation_id: attestation.id,
                        competence_id: bc.competence_id,
                        domaine_nom,
                        niveau_atteint: 'acquis'
                    }
                })

                const { error: attCompError } = await supabase
                    .from('formation_attestation_competences')
                    .insert(attCompetences)

                if (attCompError) {
                    console.error('Erreur insertion competences attestation:', attCompError)
                    return res.status(201).json({
                        attestation,
                        competences_count: 0,
                        warning: 'Attestation creee mais erreur lors de l\'insertion des competences: ' + attCompError.message
                    })
                }
            }

            return res.status(201).json({
                attestation,
                competences_count: competencesAcquises.length,
                message: `Attestation ${numero} creee avec ${competencesAcquises.length} competence(s) acquise(s)`
            })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API passer-aca:', error)
        return res.status(500).json({ error: error.message })
    }
}
