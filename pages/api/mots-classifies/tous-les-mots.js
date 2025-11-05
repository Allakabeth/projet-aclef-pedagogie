import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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
        console.log(`🔍 [TOUS-LES-MOTS] Apprenant ID: ${apprenantId}`)

        // Récupérer les IDs de textes depuis le body
        const { textesIds } = req.body
        if (!textesIds || !Array.isArray(textesIds) || textesIds.length === 0) {
            return res.status(400).json({ error: 'textesIds manquant ou vide' })
        }

        console.log(`🔍 [TOUS-LES-MOTS] Récupération pour textes ${textesIds.join(', ')}`)

        // Récupérer TOUS les mots (mono + multi) pour ces textes et cet apprenant
        const { data: motsData, error: motsError } = await supabase
            .from('mots_classifies')
            .select(`
                id,
                mot,
                classification,
                texte_reference_id,
                textes_references (
                    titre
                )
            `)
            .in('texte_reference_id', textesIds)
            .eq('apprenant_id', apprenantId)

        if (motsError) {
            console.error('❌ [TOUS-LES-MOTS] Erreur récupération mots:', motsError)
            return res.status(500).json({ error: 'Erreur récupération mots' })
        }

        console.log(`✅ [TOUS-LES-MOTS] ${motsData?.length || 0} mots récupérés`)

        // Formater les données pour l'interface
        const motsFormatted = (motsData || []).map(row => ({
            id: row.id,
            mot: row.mot,
            classification: row.classification,
            texte_id: row.texte_reference_id,
            texte_titre: row.textes_references?.titre || 'Sans titre'
        }))

        // Éliminer les doublons de mots (même mot peut apparaître plusieurs fois)
        const motsUniques = []
        const motsVus = new Set()

        motsFormatted.forEach(mot => {
            const key = mot.mot.toLowerCase()
            if (!motsVus.has(key)) {
                motsVus.add(key)
                motsUniques.push(mot)
            }
        })

        console.log(`📊 [TOUS-LES-MOTS] ${motsUniques.length} mots uniques retournés`)
        console.log(`📊 [TOUS-LES-MOTS] Mono: ${motsUniques.filter(m => m.classification === 'mono').length}, Multi: ${motsUniques.filter(m => m.classification === 'multi').length}`)

        res.status(200).json({
            success: true,
            mots: motsUniques,
            total: motsUniques.length,
            stats: {
                total_brut: motsData?.length || 0,
                uniques: motsUniques.length,
                mono: motsUniques.filter(m => m.classification === 'mono').length,
                multi: motsUniques.filter(m => m.classification === 'multi').length
            }
        })

    } catch (error) {
        console.error('❌ [TOUS-LES-MOTS] Erreur serveur:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}
