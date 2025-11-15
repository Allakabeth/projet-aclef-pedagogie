import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: STATISTIQUES GLOBALES DES PHRASES PRÉ-GÉNÉRÉES
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // 1. Nombre total de combinaisons distinctes
        const { data: combinaisons, error: errorCombinaisons } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('texte_ids, user_id')
            .order('texte_ids')

        if (errorCombinaisons) {
            console.error('Erreur récupération combinaisons:', errorCombinaisons)
            return res.status(500).json({ error: 'Erreur récupération combinaisons' })
        }

        // Compter les combinaisons uniques (texte_ids + user_id)
        const combinaisonsUniques = new Set()
        combinaisons.forEach(c => {
            const key = `${c.user_id}:${JSON.stringify(c.texte_ids)}`
            combinaisonsUniques.add(key)
        })

        const totalCombinaisons = combinaisonsUniques.size

        // 2. Nombre total de phrases
        const { count: totalPhrases, error: errorCount } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('*', { count: 'exact', head: true })

        if (errorCount) {
            console.error('Erreur comptage phrases:', errorCount)
            return res.status(500).json({ error: 'Erreur comptage phrases' })
        }

        // 3. Nombre d'apprenants distincts
        const { data: apprenants, error: errorApprenants } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('user_id')

        if (errorApprenants) {
            console.error('Erreur récupération apprenants:', errorApprenants)
            return res.status(500).json({ error: 'Erreur récupération apprenants' })
        }

        const apprenantsUniques = new Set(apprenants.map(a => a.user_id))
        const nbApprenants = apprenantsUniques.size

        // 4. Moyenne de phrases par combinaison
        const moyennePhrasesParCombo = totalCombinaisons > 0
            ? totalPhrases / totalCombinaisons
            : 0

        return res.status(200).json({
            total_combinaisons: totalCombinaisons,
            total_phrases: totalPhrases,
            nb_apprenants: nbApprenants,
            moyenne_phrases_par_combo: moyennePhrasesParCombo
        })

    } catch (error) {
        console.error('Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
