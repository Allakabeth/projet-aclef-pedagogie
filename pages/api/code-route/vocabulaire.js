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
        const { categorie, apprenant_id } = req.query

        let query = supabase
            .from('vocabulaire_code_route')
            .select('*')
            .order('ordre_categorie', { ascending: true })

        // Filtrer par catégorie si spécifié
        if (categorie) {
            query = query.eq('categorie', categorie)
        }

        const { data: vocabulaire, error: vocabError } = await query

        if (vocabError) {
            console.error('Erreur récupération vocabulaire:', vocabError)
            return res.status(500).json({ error: 'Erreur lors de la récupération du vocabulaire' })
        }

        // Si un apprenant_id est fourni, récupérer aussi ses définitions personnalisées
        if (apprenant_id) {
            const vocabulaireIds = vocabulaire.map(v => v.id)

            const { data: definitions, error: defError } = await supabase
                .from('definitions_personnalisees_code_route')
                .select('*')
                .eq('apprenant_id', apprenant_id)
                .in('vocabulaire_id', vocabulaireIds)

            if (defError) {
                console.error('Erreur récupération définitions:', defError)
                // Continue quand même, juste sans les définitions personnalisées
            }

            // Fusionner les définitions personnalisées avec le vocabulaire
            const vocabulaireAvecDefinitions = vocabulaire.map(v => {
                const def = definitions?.find(d => d.vocabulaire_id === v.id)
                return {
                    ...v,
                    ma_definition: def?.ma_definition || null,
                    mon_exemple: def?.mon_exemple || null,
                    audio_url: def?.audio_url || null,
                    date_definition: def?.date_modification || null
                }
            })

            return res.status(200).json({ vocabulaire: vocabulaireAvecDefinitions })
        }

        return res.status(200).json({ vocabulaire })

    } catch (error) {
        console.error('Erreur API vocabulaire:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
