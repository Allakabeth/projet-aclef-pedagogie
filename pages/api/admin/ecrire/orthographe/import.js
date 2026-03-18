import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Types d'exercices valides
const TYPES_VALIDES = ['fill_blank', 'binary_choice', 'ordering', 'matching', 'classification', 'transformation']
const NIVEAUX_VALIDES = ['A', 'B', 'C']
const DIFFICULTES_VALIDES = ['facile', 'moyen', 'difficile']

function validerExercice(ex, index) {
    const erreurs = []
    if (!ex.theme_grammatical) erreurs.push(`[${index}] theme_grammatical manquant`)
    if (!ex.type || !TYPES_VALIDES.includes(ex.type)) erreurs.push(`[${index}] type invalide: ${ex.type}`)
    if (!ex.titre) erreurs.push(`[${index}] titre manquant`)
    if (ex.niveau && !NIVEAUX_VALIDES.includes(ex.niveau)) erreurs.push(`[${index}] niveau invalide: ${ex.niveau}`)
    if (ex.difficulte && !DIFFICULTES_VALIDES.includes(ex.difficulte)) erreurs.push(`[${index}] difficulte invalide: ${ex.difficulte}`)
    if (!ex.contenu || typeof ex.contenu !== 'object') erreurs.push(`[${index}] contenu manquant ou invalide`)
    return erreurs
}

export default async function handler(req, res) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { exercices, dry_run } = req.body

        if (!Array.isArray(exercices) || exercices.length === 0) {
            return res.status(400).json({ error: 'Le champ "exercices" doit être un tableau non vide' })
        }

        // Valider tous les exercices
        const toutesErreurs = []
        exercices.forEach((ex, i) => {
            toutesErreurs.push(...validerExercice(ex, i))
        })

        if (toutesErreurs.length > 0) {
            return res.status(400).json({
                error: 'Erreurs de validation',
                details: toutesErreurs,
                total_erreurs: toutesErreurs.length
            })
        }

        // Résoudre les codes compétence → IDs
        const codesCompetence = [...new Set(
            exercices.map(ex => ex.competence_code).filter(Boolean)
        )]

        let mapCodesIds = {}
        if (codesCompetence.length > 0) {
            const { data: competences, error: compError } = await supabase
                .from('formation_competences')
                .select('id, code')
                .in('code', codesCompetence)

            if (compError) throw compError

            mapCodesIds = Object.fromEntries(
                (competences || []).map(c => [c.code, c.id])
            )

            // Vérifier que tous les codes existent
            const codesManquants = codesCompetence.filter(c => !mapCodesIds[c])
            if (codesManquants.length > 0) {
                return res.status(400).json({
                    error: 'Codes compétence non trouvés en base',
                    codes_manquants: codesManquants
                })
            }
        }

        // Mode dry_run : on valide sans insérer
        if (dry_run) {
            return res.status(200).json({
                message: 'Validation réussie (dry_run)',
                total: exercices.length,
                themes: [...new Set(exercices.map(ex => ex.theme_grammatical))],
                types: [...new Set(exercices.map(ex => ex.type))],
                niveaux: [...new Set(exercices.map(ex => ex.niveau || 'A'))]
            })
        }

        // Préparer les données pour insertion
        const rows = exercices.map(ex => ({
            theme_grammatical: ex.theme_grammatical,
            sous_theme: ex.sous_theme || null,
            type: ex.type,
            titre: ex.titre,
            consigne: ex.consigne || null,
            niveau: ex.niveau || 'A',
            numero_boite: ex.numero_boite || null,
            ordre: ex.ordre || 0,
            difficulte: ex.difficulte || 'moyen',
            contenu: ex.contenu,
            competence_id: ex.competence_code ? mapCodesIds[ex.competence_code] : (ex.competence_id || null)
        }))

        // Insertion batch
        const { data, error } = await supabase
            .from('orthographe_exercices')
            .insert(rows)
            .select('id, titre, type, theme_grammatical, niveau')

        if (error) throw error

        return res.status(201).json({
            message: `${data.length} exercices importés avec succès`,
            total: data.length,
            exercices: data
        })

    } catch (error) {
        console.error('Erreur API import orthographe:', error)
        return res.status(500).json({ error: error.message })
    }
}
