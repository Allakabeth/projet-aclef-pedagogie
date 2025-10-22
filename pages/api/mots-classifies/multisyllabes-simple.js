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

        // Déterminer les IDs de textes à traiter
        let textesIds = []
        
        if (req.method === 'GET') {
            const { texteId } = req.query
            if (!texteId) {
                return res.status(400).json({ error: 'texteId manquant' })
            }
            textesIds = [texteId]
        } else { // POST
            const { textesIds: bodyTextesIds } = req.body
            if (!bodyTextesIds || !Array.isArray(bodyTextesIds) || bodyTextesIds.length === 0) {
                return res.status(400).json({ error: 'textesIds manquant ou vide' })
            }
            textesIds = bodyTextesIds
        }

        console.log(`🔍 Récupération multisyllabes SIMPLES pour textes ${textesIds.join(', ')} (apprenant ${decoded.id})`)

        // REQUÊTE UNIQUE ET SIMPLE : Tous les multisyllabes de l'apprenant pour ces textes
        const { data: multisyllabesData, error } = await supabase
            .from('mots_classifies')
            .select('mot, valide_par_admin')
            .eq('classification', 'multi')
            .eq('apprenant_id', decoded.id)
            .in('texte_reference_id', textesIds)

        if (error) {
            console.error('Erreur récupération multisyllabes:', error)
            return res.status(500).json({ error: 'Erreur récupération mots' })
        }

        // Extraire mots uniques et les formater comme l'ancienne API
        const motsUniques = [...new Set(multisyllabesData?.map(m => m.mot) || [])].sort()
        const nbValides = multisyllabesData?.filter(m => m.valide_par_admin).length || 0
        
        // Formater les mots comme l'ancienne API pour compatibilité
        const motsFormattes = motsUniques.map(mot => ({ contenu: mot }))
        
        console.log(`✅ ${motsUniques.length} multisyllabes trouvés (dont ${nbValides} corrections validées admin)`)

        res.status(200).json({
            success: true,
            mots: motsFormattes
        })

    } catch (error) {
        console.error('Erreur multisyllabes:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}
