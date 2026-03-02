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
            const { apprenant_id, type, statut } = req.query

            let query = supabase
                .from('formation_bilans')
                .select(`
                    *,
                    apprenant:users!formation_bilans_apprenant_id_fkey(id, prenom, nom),
                    formateur:users!formation_bilans_formateur_id_fkey(id, prenom, nom),
                    plan:formation_plans(id, objectif_principal, statut)
                `)
                .order('date_bilan', { ascending: false })

            // Filtres optionnels
            if (apprenant_id) query = query.eq('apprenant_id', apprenant_id)
            if (type) query = query.eq('type', type)
            if (statut) query = query.eq('statut', statut)

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ bilans: data })
        }

        if (req.method === 'POST') {
            const {
                apprenant_id,
                formateur_id,
                plan_id,
                type,
                date_bilan,
                periode_debut,
                periode_fin,
                synthese,
                competences_acquises,
                competences_en_cours,
                recommandations,
                domaine_comments,
                fichier_pdf,
                fichier_word,
                statut,
                duree_realisee,
                competences
            } = req.body

            if (!apprenant_id || !formateur_id || !type) {
                return res.status(400).json({ error: 'apprenant_id, formateur_id et type sont requis' })
            }

            // Construire l'objet d'insertion
            const insertData = {
                apprenant_id,
                formateur_id,
                type,
                date_bilan: date_bilan || new Date().toISOString().split('T')[0],
                statut: statut || 'brouillon'
            }

            if (plan_id !== undefined) insertData.plan_id = plan_id
            if (periode_debut !== undefined) insertData.periode_debut = periode_debut
            if (periode_fin !== undefined) insertData.periode_fin = periode_fin
            if (synthese !== undefined) insertData.synthese = synthese
            if (competences_acquises !== undefined) insertData.competences_acquises = competences_acquises
            if (competences_en_cours !== undefined) insertData.competences_en_cours = competences_en_cours
            if (recommandations !== undefined) insertData.recommandations = recommandations
            if (domaine_comments !== undefined) insertData.domaine_comments = domaine_comments
            if (fichier_pdf !== undefined) insertData.fichier_pdf = fichier_pdf
            if (fichier_word !== undefined) insertData.fichier_word = fichier_word
            if (duree_realisee !== undefined) insertData.duree_realisee = duree_realisee

            const { data, error } = await supabase
                .from('formation_bilans')
                .insert([insertData])
                .select()
                .single()

            if (error) throw error

            // Si des competences sont fournies, les inserer aussi
            if (competences && Array.isArray(competences) && competences.length > 0) {
                const bilanCompetences = competences.map(comp => ({
                    bilan_id: data.id,
                    competence_id: comp.competence_id,
                    statut_debut: comp.statut_debut || null,
                    statut_fin: comp.statut_fin || null,
                    score_moyen: comp.score_moyen || null,
                    nombre_exercices: comp.nombre_exercices || 0,
                    commentaire: comp.commentaire || null
                }))

                const { error: compError } = await supabase
                    .from('formation_bilan_competences')
                    .insert(bilanCompetences)

                if (compError) {
                    console.error('Erreur insertion competences bilan:', compError)
                    // Le bilan a ete cree, on retourne avec un avertissement
                    return res.status(201).json({
                        bilan: data,
                        warning: 'Bilan cree mais erreur lors de l\'insertion des competences: ' + compError.message
                    })
                }
            }

            return res.status(201).json({ bilan: data })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API bilans:', error)
        return res.status(500).json({ error: error.message })
    }
}
