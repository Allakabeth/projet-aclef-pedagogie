import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    const { assignation_id, reponses } = req.body

    if (!assignation_id || !reponses) {
        return res.status(400).json({ error: 'assignation_id et reponses sont requis' })
    }

    try {
        // Vérifier le token
        const token = req.headers.authorization?.replace('Bearer ', '')
        if (!token) {
            return res.status(401).json({ error: 'Non authentifié' })
        }

        // Décoder le token
        let userId
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt')
            userId = decoded.userId || decoded.id
        } catch (err) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        // Récupérer l'assignation avec l'exercice
        const { data: assignation, error: fetchError } = await supabase
            .from('formation_exercices_assignations')
            .select(`
                *,
                exercice:formation_exercices(*)
            `)
            .eq('id', assignation_id)
            .eq('apprenant_id', userId)
            .single()

        if (fetchError || !assignation) {
            return res.status(404).json({ error: 'Assignation non trouvée' })
        }

        // Calculer le score selon le type d'exercice
        const resultat = calculerScore(assignation.exercice, reponses)

        // Mettre à jour l'assignation
        const { data: updated, error: updateError } = await supabase
            .from('formation_exercices_assignations')
            .update({
                statut: 'termine',
                date_fin: new Date().toISOString(),
                score: resultat.score,
                reponses: reponses,
                tentatives: assignation.tentatives + 1
            })
            .eq('id', assignation_id)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json(resultat)
    } catch (error) {
        console.error('Erreur API soumettre:', error)
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Calcule le score selon le type d'exercice
 */
function calculerScore(exercice, reponses) {
    switch (exercice.type) {
        case 'qcm':
            return calculerScoreQCM(exercice.contenu, reponses)
        case 'ordering':
            return calculerScoreOrdering(exercice.contenu, reponses)
        case 'matching':
            return calculerScoreMatching(exercice.contenu, reponses)
        case 'numeric':
            return calculerScoreNumeric(exercice.contenu, reponses)
        default:
            return { score: 0, details: 'Type d\'exercice non supporté' }
    }
}

/**
 * Score QCM
 */
function calculerScoreQCM(contenu, reponses) {
    const options = contenu.options || []
    const selectedOptions = reponses.selectedOptions || []

    let correct = 0
    let total = 0

    // Compter les bonnes réponses correctement identifiées
    options.forEach((option, idx) => {
        if (option.correct) {
            total++
            if (selectedOptions.includes(idx)) {
                correct++
            }
        }
    })

    // Pénalité pour les mauvaises réponses sélectionnées
    const wrongSelected = selectedOptions.filter(idx => !options[idx]?.correct).length

    const score = total > 0
        ? Math.max(0, Math.round(((correct - wrongSelected) / total) * 100))
        : 0

    return {
        score,
        reponses,
        details: {
            correct,
            total,
            wrongSelected
        }
    }
}

/**
 * Score Ordering
 */
function calculerScoreOrdering(contenu, reponses) {
    const items = contenu.items || []
    const orderedItems = reponses.orderedItems || []

    let correct = 0

    // Vérifier si chaque item est à la bonne position
    orderedItems.forEach((itemIndex, position) => {
        const item = items[itemIndex]
        if (item && item.order === position + 1) {
            correct++
        }
    })

    const score = items.length > 0
        ? Math.round((correct / items.length) * 100)
        : 0

    return {
        score,
        reponses,
        details: {
            correct,
            total: items.length
        }
    }
}

/**
 * Score Matching
 */
function calculerScoreMatching(contenu, reponses) {
    const pairs = contenu.pairs || []
    const userPairs = reponses.pairs || {}

    let correct = 0

    pairs.forEach((pair, idx) => {
        if (userPairs[idx] === pair.right) {
            correct++
        }
    })

    const score = pairs.length > 0
        ? Math.round((correct / pairs.length) * 100)
        : 0

    return {
        score,
        reponses,
        details: {
            correct,
            total: pairs.length
        }
    }
}

/**
 * Score Numeric
 */
function calculerScoreNumeric(contenu, reponses) {
    const correctAnswer = parseFloat(contenu.answer)
    const userAnswer = parseFloat(reponses.answer)
    const tolerance = parseFloat(contenu.tolerance) || 0

    if (isNaN(userAnswer)) {
        return {
            score: 0,
            reponses,
            details: {
                correct: false,
                expected: correctAnswer,
                given: reponses.answer
            }
        }
    }

    const diff = Math.abs(correctAnswer - userAnswer)
    const isCorrect = diff <= tolerance

    return {
        score: isCorrect ? 100 : 0,
        reponses,
        details: {
            correct: isCorrect,
            expected: correctAnswer,
            given: userAnswer,
            difference: diff,
            tolerance
        }
    }
}
