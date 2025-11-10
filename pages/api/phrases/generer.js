import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyToken } from '../../../lib/jwt'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

// ====================================================================
// VALIDATION STRICTE : Vérifier que TOUS les mots sont dans la liste
// ====================================================================

/**
 * Normalise un mot pour comparaison (minuscules, sans accents, sans ponctuation)
 */
function normalizeWord(word) {
    return word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprime accents
        .replace(/[^a-z0-9]/g, "")       // Garde seulement lettres/chiffres
}

/**
 * Valide qu'une phrase contient UNIQUEMENT des mots autorisés
 * @param {Object} phrase - { texte: "...", mots: [...] }
 * @param {Array} motsAutorisesNormalises - Liste des mots autorisés normalisés
 * @returns {boolean} - true si valide, false sinon
 */
function validatePhrase(phrase, motsAutorisesNormalises) {
    // Extraire les mots de la phrase (ignorer ponctuation)
    const motsPhrase = phrase.texte
        .replace(/[.!?,;:]/g, '') // Retirer ponctuation
        .split(/\s+/)             // Séparer par espaces
        .filter(m => m.length > 0) // Retirer vides

    // Vérifier que CHAQUE mot est dans la liste autorisée
    for (const mot of motsPhrase) {
        const motNorm = normalizeWord(mot)

        if (!motsAutorisesNormalises.includes(motNorm)) {
            console.log(`❌ Phrase rejetée - Mot non autorisé: "${mot}" (normalisé: "${motNorm}")`)
            console.log(`   Phrase: "${phrase.texte}"`)
            return false
        }
    }

    return true
}

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

CONSIGNE : Crée exactement 50 phrases SIMPLES et TRÈS VARIÉES ayant du SENS en français.

MOTS DISPONIBLES (${motsUniques.length} mots) :
${motsUniques.join(', ')}

RÈGLES IMPORTANTES :
1. Utilise UNIQUEMENT les mots de la liste ci-dessus (pas d'autres mots)
2. Chaque phrase doit contenir entre 3 et 8 mots
3. Les phrases doivent avoir du SENS en français
4. Sois CRÉATIF et VARIE au maximum :
   - Structures différentes (déclaratives, interrogatives, exclamatives)
   - Thèmes variés (actions, descriptions, émotions, lieux)
   - Combinaisons originales de mots
   - Ordre des mots différent à chaque fois
5. N'utilise JAMAIS la même phrase deux fois
6. Majuscule en début, ponctuation en fin (. ! ?)
7. Fais preuve d'imagination pour créer des phrases intéressantes et variées

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
    ...50 phrases au total...
  ]
}`

        let phrases = []

        try {
            // Essayer Gemini avec température équilibrée (créativité + respect des contraintes)
            console.log('🤖 Tentative avec Gemini...')
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.9,  // Température équilibrée pour créativité tout en respectant les contraintes
                    topP: 0.95,
                    topK: 50
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
                // Normaliser la liste des mots autorisés
                const motsAutorisesNormalises = motsUniques.map(normalizeWord)

                // Filtrer : longueur ET validation stricte des mots
                phrases = parsed.phrases.filter(p => {
                    // Vérifications basiques
                    if (!p.texte || !p.mots || !Array.isArray(p.mots)) return false
                    if (p.mots.length < 3 || p.mots.length > 10) return false

                    // ⚠️ VALIDATION STRICTE : Tous les mots doivent être autorisés
                    return validatePhrase(p, motsAutorisesNormalises)
                })

                console.log(`✅ ${phrases.length} phrases VALIDES générées par Gemini (après validation stricte)`)
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
                        temperature: 0.9  // Température équilibrée pour créativité tout en respectant les contraintes
                    })
                })

                if (groqResponse.ok) {
                    const groqData = await groqResponse.json()
                    const groqText = groqData.choices[0].message.content
                    console.log('Réponse Groq brute:', groqText.substring(0, 200))

                    const cleanedText = groqText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                    const parsed = JSON.parse(cleanedText)

                    if (parsed.phrases && Array.isArray(parsed.phrases)) {
                        // Normaliser la liste des mots autorisés
                        const motsAutorisesNormalises = motsUniques.map(normalizeWord)

                        // Filtrer : longueur ET validation stricte des mots
                        phrases = parsed.phrases.filter(p => {
                            // Vérifications basiques
                            if (!p.texte || !p.mots || !Array.isArray(p.mots)) return false
                            if (p.mots.length < 3 || p.mots.length > 10) return false

                            // ⚠️ VALIDATION STRICTE : Tous les mots doivent être autorisés
                            return validatePhrase(p, motsAutorisesNormalises)
                        })

                        console.log(`✅ ${phrases.length} phrases VALIDES générées par Groq (après validation stricte)`)
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

        console.log(`📊 ${phrases.length} phrases valides générées au total`)

        // Mélanger TOUTES les phrases valides (Fisher-Yates shuffle)
        const shuffledPhrases = [...phrases]
        for (let i = shuffledPhrases.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPhrases[i], shuffledPhrases[j]] = [shuffledPhrases[j], shuffledPhrases[i]]
        }

        // Sélectionner 10 phrases au hasard parmi les phrases mélangées
        const selectedPhrases = shuffledPhrases.slice(0, 10)
        console.log(`✅ ${selectedPhrases.length} phrases sélectionnées pour l'apprenant`)

        // Retourner les phrases sélectionnées
        const source = phrases.length > 0 && phrases[0].source ? phrases[0].source : 'ai'
        return res.status(200).json({
            success: true,
            phrases: selectedPhrases,
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
