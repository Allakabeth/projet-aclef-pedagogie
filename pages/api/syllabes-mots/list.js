import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { texte_ids } = req.query

        if (!texte_ids) {
            return res.status(400).json({ error: 'texte_ids requis' })
        }

        // Convertir les IDs en tableau
        const idsArray = texte_ids.split(',').map(id => parseInt(id.trim()))

        console.log(`📚 Récupération des mots pour textes: ${idsArray.join(', ')}`)

        // Récupérer les groupes de sens pour ces textes
        const { data: groupes, error } = await supabase
            .from('groupes_sens')
            .select('contenu, texte_reference_id')
            .in('texte_reference_id', idsArray)

        if (error) {
            console.error('Erreur récupération groupes:', error)
            return res.status(500).json({ error: 'Erreur récupération groupes de sens' })
        }

        if (!groupes || groupes.length === 0) {
            return res.status(200).json({
                success: true,
                mots: [],
                count: 0
            })
        }

        // Extraire tous les mots des groupes de sens
        const motsSet = new Set()
        groupes.forEach(groupe => {
            if (groupe.contenu) {
                // Découper le texte en mots
                const mots = groupe.contenu
                    .split(/\s+/)
                    .map(mot => mot.trim())
                    .filter(mot => mot.length > 0)
                    .filter(mot => !/^[.,;:!?¡¿'"«»\-—]+$/.test(mot)) // Exclure la ponctuation seule

                mots.forEach(mot => {
                    // Nettoyer la ponctuation au début et à la fin
                    const motNettoye = mot
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                        .toLowerCase()

                    if (motNettoye.length > 0) {
                        motsSet.add(motNettoye)
                    }
                })
            }
        })

        const motsArray = Array.from(motsSet)

        console.log(`✅ ${motsArray.length} mots uniques trouvés`)

        res.status(200).json({
            success: true,
            mots: motsArray,
            count: motsArray.length
        })

    } catch (error) {
        console.error('Erreur traitement mots:', error)
        res.status(500).json({
            error: 'Erreur traitement mots',
            details: error.message
        })
    }
}
