import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Récupérer toutes les catégories uniques avec leur emoji et le nombre de mots
        const { data, error } = await supabase
            .from('vocabulaire_code_route')
            .select('categorie, emoji')

        if (error) {
            console.error('Erreur récupération catégories:', error)
            return res.status(500).json({ error: 'Erreur lors de la récupération des catégories' })
        }

        // Regrouper par catégorie et compter les mots
        const categoriesMap = {}
        data.forEach(item => {
            if (!categoriesMap[item.categorie]) {
                categoriesMap[item.categorie] = {
                    nom: item.categorie,
                    emoji: item.emoji,
                    count: 0
                }
            }
            categoriesMap[item.categorie].count++
        })

        const categories = Object.values(categoriesMap)

        return res.status(200).json({ categories })

    } catch (error) {
        console.error('Erreur API catégories:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
