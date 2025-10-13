import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        // Récupérer l'ID de l'apprenant depuis le token
        const apprenantId = decoded.apprenant_id || decoded.id

        // Déterminer les IDs de textes à traiter
        let textesIds = []
        
        if (req.method === 'GET') {
            const { texteId, sansCorrections } = req.query
            if (!texteId) {
                return res.status(400).json({ error: 'texteId manquant' })
            }
            textesIds = [texteId]
            
            // Option pour exclure les corrections centralisées
            if (sansCorrections === 'true') {
                console.log(`🚫 Mode SANS corrections centralisées pour texte ${texteId}`)
                
                // Récupérer SEULEMENT les mots classifiés par l'apprenant pour ce texte
                const { data: motsTexte, error: texteError } = await supabase
                    .from('mots_classifies')
                    .select('mot')
                    .eq('classification', 'multi')
                    .eq('texte_reference_id', texteId)
                    .eq('apprenant_id', apprenantId)
                    .eq('valide_par_admin', false)
                
                if (texteError) {
                    console.error('Erreur récupération mots du texte:', texteError)
                    return res.status(500).json({ error: 'Erreur récupération mots' })
                }
                
                const motsUniques = [...new Set(motsTexte?.map(m => m.mot) || [])]
                console.log(`✅ ${motsUniques.length} multisyllabes UNIQUEMENT du texte ${texteId} (sans corrections)`)
                
                return res.status(200).json({
                    success: true,
                    mots: motsUniques
                })
            }
        } else { // POST
            const { textesIds: bodyTextesIds } = req.body
            if (!bodyTextesIds || !Array.isArray(bodyTextesIds) || bodyTextesIds.length === 0) {
                return res.status(400).json({ error: 'textesIds manquant ou vide' })
            }
            textesIds = bodyTextesIds
        }

        console.log(`Récupération multisyllabes validés pour textes ${textesIds.join(', ')}`)

        // 1. D'ABORD : Récupérer les multisyllabes VALIDÉS PAR ADMIN (priorité absolue)
        const { data: multisyllabesValides, error: validesError } = await supabase
            .from('mots_classifies')
            .select('mot')
            .eq('classification', 'multi')
            .eq('valide_par_admin', true)

        let multisyllabesCentralises = []
        if (!validesError && multisyllabesValides) {
            multisyllabesCentralises = multisyllabesValides.map(m => m.mot)
            console.log(`✅ ${multisyllabesCentralises.length} multisyllabes centralisés (validés admin) trouvés`)
        }

        // 2. ENSUITE : Récupérer les mots classifiés comme multisyllabes pour ces textes
        const { data: motsValidesData, error: texteError } = await supabase
            .from('mots_classifies')
            .select('mot')
            .in('texte_reference_id', textesIds)
            .eq('classification', 'multi')
            .eq('valide_par_admin', false)
            .eq('apprenant_id', apprenantId)

        if (texteError) {
            console.error('Erreur récupération mots textes:', texteError)
        }

        const motsTextes = motsValidesData?.map(row => row.mot) || []
        console.log(`${motsTextes.length} multisyllabes des textes trouvés`)

        // FUSIONNER : Corrections centralisées + mots des textes (centralisées en priorité)
        let multisyllabes = [...multisyllabesCentralises, ...motsTextes]
        
        if (multisyllabes.length < 10) {
            console.log('Peu de mots validés, récupération des mots non validés...')
            
            // Récupérer les mots classifiés comme multi mais pas encore validés
            const { data: motsNonValidesData, error: nonValidesError } = await supabase
                .from('mots_classifies')
                .select('mot')
                .in('texte_reference_id', textesIds)
                .eq('classification', 'multi')
                .eq('valide_par_admin', false)
                .eq('apprenant_id', apprenantId)

            if (nonValidesError) {
                console.error('Erreur récupération mots non validés:', nonValidesError)
            } else {
                const motsNonValides = motsNonValidesData?.map(row => row.mot) || []
                console.log(`${motsNonValides.length} multisyllabes non validés trouvés`)
                
                // Ajouter les mots non validés qui ne sont pas déjà dans la liste
                motsNonValides.forEach(mot => {
                    if (!multisyllabes.includes(mot)) {
                        multisyllabes.push(mot)
                    }
                })
            }
        }

        // PAS DE FALLBACK ! Si pas assez de mots, c'est qu'il faut travailler sur les textes d'abord

        // Éliminer les doublons et trier
        const multisyllabesUniques = [...new Set(multisyllabes)].sort()

        console.log(`✅ ${multisyllabesUniques.length} multisyllabes uniques retournés`)
        
        // Format compatible avec l'interface mes-syllabes
        const motsFormatted = multisyllabesUniques.map((mot, index) => ({
            id: index,
            contenu: mot
        }))
        
        res.status(200).json({
            success: true,
            mots: motsFormatted,
            multisyllabes: multisyllabesUniques, // Compatibilité backward
            total: multisyllabesUniques.length,
            stats: {
                centralises: multisyllabesCentralises.length,
                textes: motsTextes.length,
                total_recupere: multisyllabes.length,
                uniques: multisyllabesUniques.length
            }
        })

    } catch (error) {
        console.error('Erreur récupération multisyllabes:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}