import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: COMBINAISONS D'UN APPRENANT SPÉCIFIQUE
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { user_id } = req.query

        if (!user_id) {
            return res.status(400).json({ error: 'Paramètre user_id manquant' })
        }

        // 1. Récupérer toutes les phrases de cet apprenant
        const { data: phrases, error: errorPhrases } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('id, texte_ids, phrase, mots, source, created_at')
            .eq('user_id', user_id)

        if (errorPhrases) {
            console.error('Erreur récupération phrases:', errorPhrases)
            return res.status(500).json({ error: 'Erreur récupération phrases' })
        }

        // 2. Grouper par combinaison (texte_ids)
        const combinaisonsMap = {}

        phrases.forEach(phrase => {
            const comboKey = JSON.stringify(phrase.texte_ids)

            if (!combinaisonsMap[comboKey]) {
                combinaisonsMap[comboKey] = {
                    texte_ids: phrase.texte_ids,
                    nb_phrases: 0,
                    phrases: [], // Ajouter tableau de phrases
                    source: phrase.source,
                    created_at: phrase.created_at
                }
            }

            combinaisonsMap[comboKey].nb_phrases++

            // Ajouter la phrase complète avec son id
            combinaisonsMap[comboKey].phrases.push({
                id: phrase.id,
                phrase: phrase.phrase,
                mots: phrase.mots
            })

            // Garder la date de création la plus ancienne
            if (new Date(phrase.created_at) < new Date(combinaisonsMap[comboKey].created_at)) {
                combinaisonsMap[comboKey].created_at = phrase.created_at
            }
        })

        // 3. Convertir en tableau et trier par texte_ids
        const combinaisons = Object.values(combinaisonsMap).sort((a, b) => {
            const aIds = a.texte_ids.join(',')
            const bIds = b.texte_ids.join(',')
            return aIds.localeCompare(bIds)
        })

        return res.status(200).json({
            success: true,
            combinaisons,
            total: combinaisons.length
        })

    } catch (error) {
        console.error('Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
