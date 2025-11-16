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

        // Ajouter un élément aléatoire pour forcer la variation
        const randomSeed = Math.random().toString(36).substring(7)
        
        const prompt = `Tu es un expert en pédagogie de la lecture française. [Seed: ${randomSeed}]

CONSIGNE ABSOLUE : Tu dois créer une phrase cohérente en utilisant EXACTEMENT ces groupes de sens, SANS LES MODIFIER :

Groupes disponibles :
${groupesTexte.map((groupe, index) => `${index + 1}. "${groupe}"`).join('\n')}

RÈGLES STRICTES :
- Utilise EXACTEMENT 2 ou 3 groupes maximum parmi ceux listés (JAMAIS plus de 3)
- Choisis des groupes DIFFÉRENTS à chaque fois pour créer de la VARIÉTÉ
- Ne modifie JAMAIS le contenu des groupes (pas d'ajout, suppression, changement de mots)
- Arrange-les dans un ordre qui crée une phrase qui a du sens
- Ajoute uniquement la ponctuation nécessaire et des mots de liaison courts si absolument nécessaire (et, le, la, les, dans, sur, avec, etc.)

IMPÉRATIF : Crée une combinaison DIFFÉRENTE des précédentes pour surprendre l'apprenant !

OBJECTIF : Créer une phrase simple et naturelle pour un apprenant non-lecteur.

Réponds au format JSON :
{
  "phrase_generee": "La phrase complète créée",
  "groupes_utilises": ["groupe 1", "groupe 2", "groupe 3"],
  "mots_ajoutes": ["mots de liaison ajoutés"]
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
            console.log('✅ OpenRouter (Gemini 2.0): succès')

        } catch (openrouterError) {
            console.log('OpenRouter échoué, utilisation du fallback simple:', openrouterError.message)

            // Fallback simple : génération sans IA
            const groupesChoisis = []

            // Choisir 2-3 groupes aléatoirement
            const nombreGroupes = Math.min(3, Math.max(2, groupesTexte.length))
            while (groupesChoisis.length < nombreGroupes && groupesChoisis.length < groupesTexte.length) {
                const index = Math.floor(Math.random() * groupesTexte.length)
                const groupe = groupesTexte[index]
                if (!groupesChoisis.includes(groupe)) {
                    groupesChoisis.push(groupe)
                }
            }

            // Créer une phrase simple en combinant les groupes
            const phrase = groupesChoisis.join(' ')

            aiResponse = {
                phrase_generee: phrase,
                groupes_utilises: groupesChoisis,
                mots_ajoutes: []
            }
            console.log('Fallback simple: succès')
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