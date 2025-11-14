import { verifyToken } from '../../../lib/jwt'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// ====================================================================
// API DE RÉCUPÉRATION DES PHRASES PRÉ-GÉNÉRÉES
// ====================================================================
//
// Cette API récupère les phrases stockées dans la table phrases_pregenerees
// au lieu de les générer à la volée. Les phrases sont pré-générées via
// /api/phrases/generer-toutes-combinaisons lors de la création d'un texte.
//
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // 1. Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const userId = decoded.userId

        // 2. Récupérer les texte_ids depuis le corps de la requête
        //    Note: le frontend devrait envoyer texte_ids maintenant
        const { texte_ids } = req.body

        if (!texte_ids || !Array.isArray(texte_ids) || texte_ids.length === 0) {
            return res.status(400).json({
                error: 'Paramètre texte_ids manquant',
                message: 'Veuillez fournir un tableau d\'IDs de textes (ex: [1,2,3])'
            })
        }

        console.log(`📚 Récupération de phrases pour user ${userId}, textes: ${texte_ids.join(', ')}`)

        // 3. Normaliser les texte_ids (trier pour correspondre au format stocké)
        const texteIdsNormalises = [...texte_ids]
            .map(id => parseInt(id))
            .sort((a, b) => a - b)

        console.log(`🔄 IDs normalisés: [${texteIdsNormalises.join(',')}]`)

        // 4. Chercher les phrases pré-générées
        const { data: phrases, error } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('*')
            .eq('user_id', userId)
            .contains('texte_ids', texteIdsNormalises)

        if (error) {
            console.error('❌ Erreur récupération phrases:', error)
            return res.status(500).json({
                error: 'Erreur base de données',
                details: error.message
            })
        }

        // 5. Vérifier si des phrases ont été trouvées
        if (!phrases || phrases.length === 0) {
            console.log(`⚠️ Aucune phrase trouvée pour [${texteIdsNormalises.join(',')}]`)

            return res.status(400).json({
                error: 'Phrases non générées',
                message: `Aucune phrase n'a été générée pour cette combinaison de textes.

Que faire ?
1. Créez un nouveau texte (cela déclenchera la génération automatique)
2. Essayez une autre sélection de textes
3. Contactez votre formateur si le problème persiste`,
                texte_ids: texteIdsNormalises,
                nb_phrases_trouvees: 0
            })
        }

        console.log(`✅ ${phrases.length} phrases trouvées`)

        // 6. Mélanger les phrases (Fisher-Yates shuffle)
        const shuffled = [...phrases]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        // 7. Sélectionner 10 phrases aléatoires
        const selectedPhrases = shuffled.slice(0, Math.min(10, shuffled.length))

        // 8. Formater la réponse (compatibilité avec l'ancien format)
        const formattedPhrases = selectedPhrases.map(p => ({
            texte: p.phrase,
            mots: p.mots
        }))

        console.log(`📊 Retour de ${formattedPhrases.length} phrases`)

        return res.status(200).json({
            success: true,
            phrases: formattedPhrases,
            total_disponibles: phrases.length,
            texte_ids: texteIdsNormalises,
            source: 'pregenerees'
        })

    } catch (error) {
        console.error('💥 Erreur serveur:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
