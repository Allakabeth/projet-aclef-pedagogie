import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: LISTE DES APPRENANTS AVEC PHRASES PRÉ-GÉNÉRÉES
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // 1. Récupérer toutes les phrases avec leurs user_id
        const { data: phrases, error: errorPhrases } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('user_id, texte_ids')

        if (errorPhrases) {
            console.error('Erreur récupération phrases:', errorPhrases)
            return res.status(500).json({ error: 'Erreur récupération phrases' })
        }

        // 2. Grouper par user_id
        const statsParApprenant = {}

        phrases.forEach(phrase => {
            const userId = phrase.user_id

            if (!statsParApprenant[userId]) {
                statsParApprenant[userId] = {
                    user_id: userId,
                    nb_phrases: 0,
                    combinaisons: new Set()
                }
            }

            statsParApprenant[userId].nb_phrases++

            // Ajouter la combinaison (normalisée en string pour le Set)
            const comboKey = JSON.stringify(phrase.texte_ids)
            statsParApprenant[userId].combinaisons.add(comboKey)
        })

        // 3. Récupérer les infos utilisateurs
        const userIds = Object.keys(statsParApprenant)

        const { data: users, error: errorUsers } = await supabaseAdmin
            .from('users')
            .select('id, identifiant, email')
            .in('id', userIds)

        if (errorUsers) {
            console.error('Erreur récupération users:', errorUsers)
            return res.status(500).json({ error: 'Erreur récupération utilisateurs' })
        }

        // 4. Créer le mapping user_id -> infos user
        const userMap = {}
        users.forEach(user => {
            userMap[user.id] = user
        })

        // 5. Formater la réponse
        const apprenants = Object.values(statsParApprenant).map(stats => {
            const user = userMap[stats.user_id] || {}

            return {
                user_id: stats.user_id,
                identifiant: user.identifiant || null,
                email: user.email || null,
                nb_phrases: stats.nb_phrases,
                nb_combinaisons: stats.combinaisons.size
            }
        })

        // Trier par nombre de phrases (décroissant)
        apprenants.sort((a, b) => b.nb_phrases - a.nb_phrases)

        return res.status(200).json({
            success: true,
            apprenants
        })

    } catch (error) {
        console.error('Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
