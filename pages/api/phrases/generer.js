import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyToken } from '../../../lib/jwt'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

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

        const { mots } = req.body

        if (!mots || !Array.isArray(mots) || mots.length === 0) {
            return res.status(400).json({ error: 'Au moins un mot requis' })
        }

        console.log('📚 Génération de phrases avec', mots.length, 'mots')

        // Les mots sont déjà fournis, pas besoin de requête DB
        const motsUniques = [...new Set(mots)]
        console.log(`📝 ${motsUniques.length} mots uniques trouvés`)

        if (motsUniques.length < 4) {
            return res.status(400).json({ error: 'Pas assez de mots (minimum 4)' })
        }

        // ====================================================================
        // 2. GÉNÉRER 10 PHRASES AVEC GEMINI
        // ====================================================================

        const randomSeed = Math.random().toString(36).substring(7)
        const timestamp = Date.now()

        const prompt = `Tu es un expert en pédagogie de la lecture française. [Seed: ${randomSeed}-${timestamp}]

CONSIGNE : Crée exactement 10 phrases SIMPLES et TRÈS VARIÉES ayant du SENS en français.

MOTS DISPONIBLES (${motsUniques.length} mots) :
${motsUniques.join(', ')}

RÈGLES ABSOLUES :
1. Chaque phrase doit contenir entre 4 et 7 mots
2. Utilise UNIQUEMENT les mots de la liste ci-dessus (PAS d'autres mots, même pas de mots de liaison)
3. Les phrases DOIVENT avoir du SENS en français dans la mesure du possible
4. IMPÉRATIF : Varie BEAUCOUP les structures et les thèmes (déclaratives, interrogatives, exclamatives, affirmatives, négatives)
5. N'utilise JAMAIS deux fois les mêmes mots dans le même ordre
6. Varie les sujets, les verbes, les compléments et les contextes
7. Majuscule en début, ponctuation en fin (. ! ?)
8. Si les mots disponibles ne permettent pas de faire une phrase parfaite, fais de ton mieux avec ce que tu as

THÈMES À VARIER :
- Actions quotidiennes
- Descriptions
- Questions
- Lieux et déplacements
- Émotions et ressentis
- Nature et animaux
- Relations et interactions

EXEMPLES (adapter selon les mots disponibles) :
- "Chat mange poisson." (si 'chat', 'mange', 'poisson' disponibles)
- "Marie court vite !" (si 'Marie', 'court', 'vite' disponibles)
- Utilise SEULEMENT les mots fournis, même si cela rend les phrases moins fluides

Réponds UNIQUEMENT avec le JSON suivant (pas de texte avant ou après) :
{
  "phrases": [
    {"texte": "phrase 1", "mots": ["mot1", "mot2", ...]},
    {"texte": "phrase 2", "mots": ["mot1", "mot2", ...]},
    ...10 phrases au total...
  ]
}`

        let phrases = []

        try {
            // Essayer Gemini avec température élevée pour plus de variété
            console.log('🤖 Tentative avec Gemini...')
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 1.2,  // Plus de créativité et variété
                    topP: 0.95,
                    topK: 64
                }
            })
            const result = await model.generateContent(prompt)
            const response = result.response
            const text = response.text()

            console.log('Réponse Gemini brute:', text.substring(0, 200))

            // Nettoyer la réponse (retirer markdown si présent)
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const parsed = JSON.parse(cleanedText)

            if (parsed.phrases && Array.isArray(parsed.phrases)) {
                phrases = parsed.phrases.filter(p =>
                    p.texte &&
                    p.mots &&
                    Array.isArray(p.mots) &&
                    p.mots.length >= 3 &&  // Moins strict : 3 mots minimum
                    p.mots.length <= 10    // Plus tolérant : jusqu'à 10 mots
                )
                console.log(`✅ ${phrases.length} phrases générées par Gemini`)
            }
        } catch (aiError) {
            console.error('❌ Erreur Gemini:', aiError)
            console.error('Message:', aiError.message)
            console.log('🔄 Tentative avec Groq...')

            // Fallback vers Groq
            try {
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        temperature: 1.2  // Plus de variété
                    })
                })

                if (groqResponse.ok) {
                    const groqData = await groqResponse.json()
                    const groqText = groqData.choices[0].message.content
                    console.log('Réponse Groq brute:', groqText.substring(0, 200))

                    const cleanedText = groqText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                    const parsed = JSON.parse(cleanedText)

                    if (parsed.phrases && Array.isArray(parsed.phrases)) {
                        phrases = parsed.phrases.filter(p =>
                            p.texte &&
                            p.mots &&
                            Array.isArray(p.mots) &&
                            p.mots.length >= 3 &&
                            p.mots.length <= 10
                        )
                        console.log(`✅ ${phrases.length} phrases générées par Groq`)
                    }
                } else {
                    console.error('❌ Groq a aussi échoué')
                }
            } catch (groqError) {
                console.error('❌ Erreur Groq:', groqError)
                return res.status(500).json({
                    error: 'Gemini et Groq ont tous les deux échoué',
                    details: aiError.message
                })
            }
        }

        // Vérifier qu'on a bien des phrases
        if (phrases.length === 0) {
            return res.status(500).json({
                error: 'Aucune IA n\'a généré de phrases valides'
            })
        }

        // Mélanger aléatoirement les phrases pour plus de variété (Fisher-Yates shuffle)
        const shuffledPhrases = [...phrases].slice(0, 10)
        for (let i = shuffledPhrases.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPhrases[i], shuffledPhrases[j]] = [shuffledPhrases[j], shuffledPhrases[i]]
        }

        // Retourner les phrases générées et mélangées
        const source = phrases.length > 0 && phrases[0].source ? phrases[0].source : 'ai'
        return res.status(200).json({
            success: true,
            phrases: shuffledPhrases, // Phrases mélangées
            total_mots: motsUniques.length,
            source: source
        })

    } catch (error) {
        console.error('💥 Erreur génération phrases:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
