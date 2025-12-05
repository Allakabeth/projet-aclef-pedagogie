import { verifyToken } from '../../../lib/jwt'

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

        const { groupes_sens } = req.body

        if (!groupes_sens || !Array.isArray(groupes_sens) || groupes_sens.length < 2) {
            return res.status(400).json({ error: 'Au moins 2 groupes de sens requis' })
        }

        // Préparer les groupes de sens
        const tousLesGroupes = groupes_sens
            .filter(g => g.type_groupe === 'text' && g.contenu && g.contenu.trim())
            .map(g => g.contenu.trim())

        if (tousLesGroupes.length < 2) {
            return res.status(400).json({ error: 'Pas assez de groupes de sens valides' })
        }

        // Limiter à 6 groupes maximum et mélanger pour la variété
        const groupesMelanges = [...tousLesGroupes].sort(() => Math.random() - 0.5)
        const groupesTexte = groupesMelanges.slice(0, Math.min(6, tousLesGroupes.length))

        const prompt = `Tu es un expert en pédagogie de la lecture française.

Voici des groupes de sens extraits de textes d'apprenants :
${groupesTexte.map((groupe, index) => `${index + 1}. "${groupe}"`).join('\n')}

OBJECTIF : Créer UNE phrase simple et naturelle qui A DU SENS pour un apprenant adulte non-lecteur.

RÈGLES :
1. Choisis 2 ou 3 groupes qui VONT BIEN ENSEMBLE sémantiquement
2. La phrase doit être grammaticalement correcte et compréhensible
3. Tu peux ajouter des mots de liaison (le, la, les, un, une, et, dans, sur, avec, pour, qui, etc.)
4. Ne modifie PAS les groupes eux-mêmes

IMPORTANT : Si aucune combinaison ne permet de faire une phrase sensée, réponds avec "impossible": true

Réponds au format JSON :
{
  "phrase_generee": "La phrase complète",
  "groupes_utilises": ["groupe 1", "groupe 2"],
  "mots_ajoutes": ["mots ajoutés"],
  "impossible": false
}`

        let aiResponse

        try {
            // Utiliser OpenRouter (Gemini 2.0 Flash Exp - gratuit)
            console.log('Tentative avec OpenRouter (Gemini 2.0 Flash Exp)...')

            const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://projet-aclef-pedagogie.vercel.app',
                    'X-Title': 'ACLEF Pédagogie - Dictées Recherche',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-exp:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu es un expert en pédagogie de la lecture française. Tu combines des groupes de sens pour créer des phrases cohérentes.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.9,
                    max_tokens: 500
                })
            })

            if (!openrouterResponse.ok) {
                const errorData = await openrouterResponse.json().catch(() => ({}))
                console.error('❌ Erreur OpenRouter:', openrouterResponse.status, errorData)
                throw new Error(`OpenRouter API error: ${openrouterResponse.status}`)
            }

            const openrouterData = await openrouterResponse.json()
            const openrouterText = openrouterData.choices[0]?.message?.content || ''

            // Nettoyer et parser la réponse
            const cleanedText = openrouterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

            // Extraire le JSON de la réponse
            let jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('Impossible de parser la réponse de OpenRouter')
            }

            aiResponse = JSON.parse(jsonMatch[0])

            // Vérifier si l'IA n'a pas pu créer de phrase sensée
            if (aiResponse.impossible) {
                return res.status(400).json({
                    error: 'Impossible de créer une phrase cohérente avec ces groupes de sens. Essayez avec d\'autres textes.',
                    groupes_recus: groupesTexte
                })
            }

            console.log('✅ OpenRouter (Gemini 2.0): succès')

        } catch (openrouterError) {
            console.error('❌ OpenRouter échoué:', openrouterError.message)

            // Déterminer le type d'erreur pour un message clair
            const isTokenError = openrouterError.message.includes('401') ||
                                 openrouterError.message.includes('429') ||
                                 openrouterError.message.includes('quota')

            return res.status(503).json({
                error: isTokenError
                    ? 'Service IA temporairement indisponible (quota épuisé). Réessayez plus tard.'
                    : 'Impossible de générer la phrase. Réessayez plus tard.',
                details: openrouterError.message
            })
        }

        res.status(200).json({
            success: true,
            ...aiResponse
        })

    } catch (error) {
        console.error('=== ERREUR DÉTAILLÉE IA ===')
        console.error('Message:', error.message)
        console.error('Stack:', error.stack)
        console.error('OpenRouter API Key présente:', !!process.env.OPENROUTER_API_KEY)
        console.error('Groupes reçus:', JSON.stringify(req.body.groupes_sens || [], null, 2))
        console.error('==============================')

        res.status(500).json({
            error: 'Erreur lors de la génération de phrase',
            details: error.message,
            debug: {
                hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
                groupesCount: req.body.groupes_sens?.length || 0
            }
        })
    }
}