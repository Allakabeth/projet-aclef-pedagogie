import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

function normaliser(str) {
    return (str || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
}

function calculerScore(type, contenu, reponses) {
    let total = 0, bonnes = 0, details = []

    switch (type) {
        case 'fill_blank': {
            const phrases = contenu.phrases || []
            total = phrases.length
            phrases.forEach((phrase, i) => {
                const correct = normaliser(phrase.reponse) === normaliser(reponses[i])
                if (correct) bonnes++
                details.push({ index: i, correct, attendu: phrase.reponse, donne: reponses[i] || '' })
            })
            break
        }

        case 'binary_choice': {
            const phrases = contenu.phrases || []
            phrases.forEach((phrase, pi) => {
                ;(phrase.segments || []).forEach((seg, si) => {
                    if (seg.type === 'choice') {
                        total++
                        const correct = normaliser(seg.correct) === normaliser(reponses[`${pi}_${si}`])
                        if (correct) bonnes++
                        details.push({ phrase: pi, segment: si, correct, attendu: seg.correct, donne: reponses[`${pi}_${si}`] || '' })
                    }
                })
            })
            break
        }

        case 'ordering': {
            const phrases = contenu.phrases || []
            phrases.forEach((phrase, pi) => {
                const mots = phrase.mots || []
                const ordreCorrect = phrase.ordre_correct || mots.map((_, i) => i)
                const rep = reponses[pi] || []
                mots.forEach((_, mi) => {
                    total++
                    const correct = rep[mi] === ordreCorrect[mi]
                    if (correct) bonnes++
                })
                details.push({ phrase: pi, correct: bonnes === total, ordre_donne: rep })
            })
            break
        }

        case 'matching': {
            const pairs = contenu.pairs || []
            total = pairs.length
            pairs.forEach((pair, i) => {
                const correct = normaliser(pair.right) === normaliser(reponses[pair.left])
                if (correct) bonnes++
                details.push({ index: i, correct, attendu: pair.right, donne: reponses[pair.left] || '' })
            })
            break
        }

        case 'classification': {
            const items = contenu.items || []
            total = items.length
            items.forEach((item, i) => {
                const correct = normaliser(item.categorie) === normaliser(reponses[item.text])
                if (correct) bonnes++
                details.push({ index: i, item: item.text, correct, attendu: item.categorie, donne: reponses[item.text] || '' })
            })
            break
        }

        case 'transformation': {
            const phrases = contenu.phrases || []
            total = phrases.length
            phrases.forEach((phrase, i) => {
                const correct = normaliser(phrase.reponse) === normaliser(reponses[i])
                if (correct) bonnes++
                details.push({ index: i, correct, attendu: phrase.reponse, donne: reponses[i] || '' })
            })
            break
        }
    }

    const score = total > 0 ? Math.round((bonnes / total) * 100) : 0
    return { score, total, bonnes, details }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Non authentifié' })

    let userId
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt')
        userId = decoded.userId || decoded.id
    } catch {
        return res.status(401).json({ error: 'Token invalide' })
    }

    try {
        const { exercice_id, reponses, duree_secondes } = req.body

        if (!exercice_id || !reponses) {
            return res.status(400).json({ error: 'exercice_id et reponses requis' })
        }

        // Charger l'exercice
        const { data: exercice, error: exErr } = await supabase
            .from('orthographe_exercices')
            .select('*')
            .eq('id', exercice_id)
            .single()

        if (exErr || !exercice) {
            return res.status(404).json({ error: 'Exercice introuvable' })
        }

        // Calculer le score
        const resultat = calculerScore(exercice.type, exercice.contenu, reponses)

        // Enregistrer la session
        const { error: sessErr } = await supabase
            .from('orthographe_sessions')
            .insert({
                user_id: userId,
                exercice_id,
                score: resultat.score,
                total_questions: resultat.total,
                bonnes_reponses: resultat.bonnes,
                duree_secondes: duree_secondes || 0,
                reponses
            })

        if (sessErr) throw sessErr

        return res.status(200).json({
            score: resultat.score,
            total: resultat.total,
            bonnes: resultat.bonnes,
            details: resultat.details
        })
    } catch (error) {
        console.error('Erreur API orthographe soumettre:', error)
        return res.status(500).json({ error: error.message })
    }
}
