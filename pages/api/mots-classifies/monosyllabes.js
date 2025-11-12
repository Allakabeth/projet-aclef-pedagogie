import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        const { texteId } = req.query

        if (!texteId) {
            return res.status(400).json({ error: 'texteId manquant' })
        }

        console.log(`Récupération monosyllabes validés pour texte ${texteId}`)

        // 1. D'ABORD : Récupérer les monosyllabes VALIDÉS PAR ADMIN (priorité absolue)
        // FILTRÉ PAR TEXTE : On ne prend que les mots centralisés qui sont dans CE texte
        const { data: monosyllabesValides, error: validesError } = await supabase
            .from('mots_classifies')
            .select('mot')
            .eq('texte_reference_id', texteId)
            .eq('classification', 'mono')
            .eq('valide_par_admin', true)

        let monosyllabesCentralises = []
        if (!validesError && monosyllabesValides) {
            monosyllabesCentralises = monosyllabesValides.map(m => m.mot)
            console.log(`✅ ${monosyllabesCentralises.length} monosyllabes centralisés (validés admin) trouvés`)
        }

        // 2. ENSUITE : Récupérer les mots classifiés comme monosyllabes pour ce texte  
        const { data: motsValidesData, error: texteError } = await supabase
            .from('mots_classifies')
            .select('mot')
            .eq('texte_reference_id', texteId)
            .eq('classification', 'mono')
            .eq('valide_par_admin', false)

        if (texteError) {
            console.error('Erreur récupération mots texte:', texteError)
        }

        const motsTexte = motsValidesData?.map(row => row.mot) || []
        console.log(`${motsTexte.length} monosyllabes du texte trouvés`)

        // FUSIONNER : Corrections centralisées + mots du texte (centralisées en priorité)
        // ❌ AUCUN FALLBACK - L'admin a tranché sur la classification mono/multi
        let monosyllabes = [...monosyllabesCentralises, ...motsTexte]

        // Éliminer les doublons et trier
        const monosyllabesUniques = [...new Set(monosyllabes)].sort()

        console.log(`✅ ${monosyllabesUniques.length} monosyllabes uniques retournés`)
        
        res.status(200).json({
            success: true,
            monosyllabes: monosyllabesUniques,
            total: monosyllabesUniques.length,
            stats: {
                centralises: monosyllabesCentralises.length,
                texte: motsTexte.length,  
                total_recupere: monosyllabes.length,
                uniques: monosyllabesUniques.length
            }
        })

    } catch (error) {
        console.error('Erreur récupération monosyllabes:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}