import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyToken } from '../../../lib/jwt'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// Utiliser la nouvelle clé API Gemini (Default Gemini Project)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY_NEW || process.env.GOOGLE_AI_API_KEY)

// ====================================================================
// API DE GÉNÉRATION DE PHRASES À LA DEMANDE
// ====================================================================
//
// Cette API vérifie si des phrases existent pour une combinaison de textes.
// Si OUI → retourne depuis la BDD (cache)
// Si NON → génère avec IA + stocke + retourne
//
// Avantages : Simple, fiable, génère seulement ce qui est utilisé
//
// ====================================================================

// ====================================================================
// FONCTIONS UTILITAIRES
// ====================================================================

/**
 * Normalise un mot pour comparaison
 */
function normalizeWord(word) {
    return word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
}

/**
 * Valide qu'une phrase contient UNIQUEMENT des mots autorisés
 */
function validatePhrase(phrase, motsAutorisesNormalises) {
    const motsPhrase = phrase.texte
        .replace(/[.!?,;:]/g, '')
        .split(/\s+/)
        .filter(m => m.length > 0)

    for (const mot of motsPhrase) {
        const motNorm = normalizeWord(mot)
        if (!motsAutorisesNormalises.includes(motNorm)) {
            return false
        }
    }
    return true
}

/**
 * Récupère les stats OpenRouter (requêtes restantes)
 */
async function getOpenRouterStats() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
        })

        if (!response.ok) {
            console.warn('⚠️ Impossible de récupérer les stats OpenRouter')
            return null
        }

        const data = await response.json()
        return {
            limit: data.data?.limit || 1000,
            usage: data.data?.usage || 0,
            remaining: (data.data?.limit || 1000) - (data.data?.usage || 0)
        }
    } catch (error) {
        console.warn('⚠️ Erreur récupération stats OpenRouter:', error.message)
        return null
    }
}

/**
 * Génère des phrases avec retry automatique en cas de rate-limit
 */
async function genererPhrasesIA(motsUniques, maxRetries = 5, tentativeActuelle = 1) {
    const nbMots = motsUniques.length

    // Adapter le nombre de phrases selon le vocabulaire
    let nbPhrasesCible
    if (nbMots < 10) {
        nbPhrasesCible = 50
    } else if (nbMots < 30) {
        nbPhrasesCible = 100
    } else {
        nbPhrasesCible = 150
    }

    const randomSeed = Math.random().toString(36).substring(7)
    const timestamp = Date.now()

    const prompt = `Tu es un expert en pédagogie de la lecture française. [Seed: ${randomSeed}-${timestamp}]

CONSIGNE : Crée exactement ${nbPhrasesCible} phrases SIMPLES, COMPLÈTES et TRÈS VARIÉES ayant du SENS en français.

MOTS DISPONIBLES (${nbMots} mots) :
${motsUniques.join(', ')}

RÈGLES STRICTES - PHRASES COMPLÈTES OBLIGATOIRES :
1. Utilise UNIQUEMENT les mots de la liste ci-dessus
2. Génère des phrases de toutes longueurs (3, 4, 5, 6, 7 mots MAXIMUM)
3. VARIÉTÉ ABSOLUE : débuts différents, structures différentes
4. PHRASES COMPLÈTES UNIQUEMENT : sujet + verbe + complément (pas de phrases qui se terminent par "pour", "sur", "si", "de", "à", etc.)
5. Chaque phrase doit avoir du SENS COMPLET en français (pas de phrases inachevées)
6. Pas de doublons
7. Majuscule en début, ponctuation en fin (. ! ?)

EXEMPLES DE BONNES PHRASES :
✅ "Le chat mange la souris." (phrase complète)
✅ "Je vais au marché." (phrase complète)
✅ "Un éléphant dort sous l'arbre." (phrase complète)

EXEMPLES DE MAUVAISES PHRASES À ÉVITER :
❌ "Je marche sur." (incomplète - se termine par "sur")
❌ "Pour voir si." (incomplète - pas de sujet)
❌ "Un éléphant va au marché pour." (incomplète - se termine par "pour")

DISTRIBUTION SOUHAITÉE :
${nbMots < 10 ? '- ~10 phrases de chaque longueur (3,4,5)' : ''}
${nbMots >= 10 && nbMots < 30 ? '- ~20 phrases de 3 mots\n- ~25 phrases de 4 mots\n- ~25 phrases de 5 mots\n- ~20 phrases de 6 mots\n- ~10 phrases de 7 mots' : ''}
${nbMots >= 30 ? '- ~30 phrases de 3 mots\n- ~40 phrases de 4 mots\n- ~40 phrases de 5 mots\n- ~25 phrases de 6 mots\n- ~15 phrases de 7 mots' : ''}

VARIÉTÉ OBLIGATOIRE - EXEMPLES DE STRUCTURES :
- Sujet + Verbe + Complément (ex: "Le chat mange du poisson.")
- Questions complètes (ex: "Où est le chat ?")
- Exclamations complètes (ex: "Quel beau chat !")
- Complément en début de phrase (ex: "Au marché, je vois un chat.")

Réponds UNIQUEMENT avec le JSON suivant (pas de texte avant ou après) :
{
  "phrases": [
    {"texte": "phrase 1", "mots": ["mot1", "mot2", ...]},
    {"texte": "phrase 2", "mots": ["mot1", "mot2", ...]},
    ...${nbPhrasesCible} phrases au total...
  ]
}`

    let phrases = []
    let source = 'unknown'

    // TENTATIVE 1: OpenRouter (Gemini 2.0 Flash Exp - gratuit, fonctionne bien)
    if (process.env.OPENROUTER_API_KEY) {
        try {
            console.log(`🌐 Génération avec OpenRouter (Gemini 2.0 Flash Exp) - Tentative ${tentativeActuelle}/${maxRetries}...`)

            const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://projet-aclef-pedagogie.vercel.app',
                    'X-Title': 'ACLEF Pédagogie - Génération Phrases',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-exp:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu es un expert en pédagogie de la lecture française. Tu génères des phrases simples, complètes et variées pour l\'apprentissage. JAMAIS de phrases incomplètes.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.9,
                    max_tokens: 8000
                })
            })

            if (!openrouterResponse.ok) {
                const errorData = await openrouterResponse.json().catch(() => ({}))
                console.error('❌ Erreur OpenRouter:', openrouterResponse.status, errorData)

                // Détection quota dépassé - retry automatique
                if (openrouterResponse.status === 429) {
                    if (tentativeActuelle < maxRetries) {
                        const delai = tentativeActuelle * 2000 // 2s, 4s, 6s, 8s, 10s
                        console.log(`⏳ Rate-limit atteint, nouvelle tentative dans ${delai/1000}s...`)
                        await new Promise(resolve => setTimeout(resolve, delai))
                        return genererPhrasesIA(motsUniques, maxRetries, tentativeActuelle + 1)
                    }
                    throw new Error('QUOTA_EXCEEDED')
                }
                throw new Error(`OpenRouter API error: ${openrouterResponse.status}`)
            }

            const openrouterData = await openrouterResponse.json()
            const openrouterText = openrouterData.choices[0]?.message?.content || ''

            const cleanedText = openrouterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const parsed = JSON.parse(cleanedText)

            if (parsed.phrases && Array.isArray(parsed.phrases)) {
                const motsAutorisesNormalises = motsUniques.map(normalizeWord)

                phrases = parsed.phrases.filter(p => {
                    if (!p.texte || !p.mots || !Array.isArray(p.mots)) return false
                    if (p.mots.length < 3 || p.mots.length > 7) return false
                    return validatePhrase(p, motsAutorisesNormalises)
                })

                // Anti-duplication
                const textesVus = new Set()
                phrases = phrases.filter(p => {
                    const texteNorm = p.texte.toLowerCase().replace(/[.!?,;:]/g, '').trim()
                    if (textesVus.has(texteNorm)) return false
                    textesVus.add(texteNorm)
                    return true
                })

                source = 'openrouter-gemini'
                console.log(`✅ ${phrases.length} phrases validées depuis OpenRouter (Gemini 2.0)`)
            }
        } catch (openrouterError) {
            console.error('❌ Erreur OpenRouter:', openrouterError.message)
        }
    }

    if (phrases.length === 0) {
        throw new Error('NO_PHRASES_GENERATED')
    }

    return { phrases, source }
}

// ====================================================================
// HANDLER PRINCIPAL
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

        const userId = decoded.id || decoded.apprenant_id || decoded.userId

        // 2. Récupérer les texte_ids depuis le corps de la requête
        const { texte_ids } = req.body

        if (!texte_ids || !Array.isArray(texte_ids) || texte_ids.length === 0) {
            return res.status(400).json({
                error: 'Paramètre texte_ids manquant',
                message: 'Veuillez fournir un tableau d\'IDs de textes (ex: [1,2,3])'
            })
        }

        console.log(`📚 Récupération/Génération de phrases pour user ${userId}, textes: ${texte_ids.join(', ')}`)

        // 3. Normaliser les texte_ids (trier pour correspondre au format stocké)
        const texteIdsNormalises = [...texte_ids]
            .map(id => parseInt(id))
            .sort((a, b) => a - b)

        console.log(`🔄 IDs normalisés: [${texteIdsNormalises.join(',')}]`)

        // 4. Chercher les phrases en cache (BDD)
        const { data: phrasesExistantes, error: errorRecherche } = await supabaseAdmin
            .from('phrases_pregenerees')
            .select('*')
            .eq('user_id', userId)
            .contains('texte_ids', texteIdsNormalises)

        if (errorRecherche) {
            console.error('❌ Erreur recherche phrases:', errorRecherche)
            return res.status(500).json({
                error: 'Erreur base de données',
                details: errorRecherche.message
            })
        }

        // 5. Si phrases existent → retourner depuis le cache
        if (phrasesExistantes && phrasesExistantes.length > 0) {
            console.log(`✅ ${phrasesExistantes.length} phrases trouvées en cache`)

            // Mélanger les phrases (Fisher-Yates shuffle)
            const shuffled = [...phrasesExistantes]
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }

            // Sélectionner 10 phrases aléatoires
            const selectedPhrases = shuffled.slice(0, Math.min(10, shuffled.length))

            // Formater la réponse
            const formattedPhrases = selectedPhrases.map(p => ({
                texte: p.phrase,
                mots: p.mots
            }))

            console.log(`📊 Retour de ${formattedPhrases.length} phrases (depuis cache)`)

            // Récupérer les stats OpenRouter
            const stats = await getOpenRouterStats()

            return res.status(200).json({
                success: true,
                phrases: formattedPhrases,
                total_disponibles: phrasesExistantes.length,
                texte_ids: texteIdsNormalises,
                source: 'cache',
                openrouter_stats: stats
            })
        }

        // 6. Phrases n'existent pas → GÉNÉRER
        console.log(`⚠️ Aucune phrase en cache pour [${texteIdsNormalises.join(',')}] → Génération...`)

        // 6a. Récupérer les textes originaux pour éviter de générer leurs phrases
        const { data: textesOriginaux, error: textesError } = await supabaseAdmin
            .from('textes_references')
            .select('contenu')
            .in('id', texteIdsNormalises)

        // Extraire toutes les phrases des textes originaux (à exclure)
        const phrasesOriginalesSet = new Set()
        if (textesOriginaux) {
            textesOriginaux.forEach(texte => {
                if (texte.contenu) {
                    // Découper le texte en phrases (par . ! ?)
                    const phrases = texte.contenu
                        .split(/[.!?]+/)
                        .map(p => p.trim())
                        .filter(p => p.length > 0)

                    phrases.forEach(phrase => {
                        // Normaliser ULTRA-STRICTEMENT : minuscules, sans ponctuation, sans espaces multiples
                        const phraseNorm = phrase
                            .toLowerCase()
                            .normalize("NFD")                           // Décomposer les accents
                            .replace(/[\u0300-\u036f]/g, "")            // Supprimer les accents
                            .replace(/[.,;:!?¡¿'\"«»\-—()]/g, '')       // Supprimer ponctuation
                            .replace(/\s+/g, ' ')                       // Normaliser espaces multiples en un seul
                            .trim()
                        if (phraseNorm.length > 0) {
                            phrasesOriginalesSet.add(phraseNorm)
                        }
                    })
                }
            })
            console.log(`🚫 ${phrasesOriginalesSet.size} phrases originales à exclure`)
        }

        // 6b. Récupérer les groupes_sens pour extraire les mots
        const { data: groupes, error: groupesError } = await supabaseAdmin
            .from('groupes_sens')
            .select('contenu')
            .in('texte_reference_id', texteIdsNormalises)

        if (groupesError || !groupes || groupes.length === 0) {
            console.error('❌ Erreur récupération groupes:', groupesError)
            return res.status(400).json({
                error: 'Aucun contenu trouvé',
                message: 'Impossible de générer des phrases : aucun groupe de sens trouvé pour ces textes.'
            })
        }

        // 6c. Extraire mots uniques
        const motsSet = new Set()
        groupes.forEach(groupe => {
            if (groupe.contenu) {
                const mots = groupe.contenu
                    .split(/\s+/)
                    .map(mot => mot.trim())
                    .filter(mot => mot.length > 0)
                    .filter(mot => !/^[.,;:!?¡¿'\"«»\-—]+$/.test(mot))

                mots.forEach(mot => {
                    const motNettoye = mot
                        .replace(/^[.,;:!?¡¿'\"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'\"«»\-—]+$/, '')
                        .toLowerCase()

                    if (motNettoye.length > 0) {
                        motsSet.add(motNettoye)
                    }
                })
            }
        })

        const motsUniques = Array.from(motsSet)
        console.log(`📚 ${motsUniques.length} mots uniques extraits`)

        if (motsUniques.length < 3) {
            return res.status(400).json({
                error: 'Vocabulaire insuffisant',
                message: 'Impossible de générer des phrases : moins de 3 mots disponibles.'
            })
        }

        // 6d. Générer les phrases avec l'IA
        const { phrases: phrasesGenerees, source: sourceIA } = await genererPhrasesIA(motsUniques)

        console.log(`✅ ${phrasesGenerees.length} phrases générées avec ${sourceIA}`)

        // 6e. Filtrer les phrases qui sont identiques aux phrases originales
        const phrasesFiltrees = phrasesGenerees.filter(p => {
            // Appliquer la MÊME normalisation ultra-stricte que pour les originales
            const phraseNorm = p.texte
                .toLowerCase()
                .normalize("NFD")                           // Décomposer les accents
                .replace(/[\u0300-\u036f]/g, "")            // Supprimer les accents
                .replace(/[.,;:!?¡¿'\"«»\-—()]/g, '')       // Supprimer ponctuation
                .replace(/\s+/g, ' ')                       // Normaliser espaces multiples en un seul
                .trim()
            const estOriginale = phrasesOriginalesSet.has(phraseNorm)
            if (estOriginale) {
                console.log(`🚫 Phrase originale exclue: "${p.texte}"`)
            }
            return !estOriginale
        })

        console.log(`📊 ${phrasesFiltrees.length} phrases après filtrage des originales (${phrasesGenerees.length - phrasesFiltrees.length} exclues)`)

        // 6f. Stocker en BDD pour réutilisation future
        const phrasesAInserer = phrasesFiltrees.map(p => ({
            texte_ids: texteIdsNormalises,
            phrase: p.texte,
            mots: p.mots,
            longueur_mots: p.mots.length,
            user_id: userId,
            source: sourceIA
        }))

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('phrases_pregenerees')
            .insert(phrasesAInserer)
            .select()

        if (insertError) {
            console.error(`⚠️ Erreur stockage en cache:`, insertError)
            // Continuer quand même - on a les phrases, juste pas en cache
        } else {
            console.log(`💾 ${inserted.length} phrases stockées en cache`)
        }

        // 6g. Mélanger et sélectionner 10 phrases
        const shuffled = [...phrasesFiltrees]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const selectedPhrases = shuffled.slice(0, Math.min(10, shuffled.length))

        // Formater la réponse
        const formattedPhrases = selectedPhrases.map(p => ({
            texte: p.texte,
            mots: p.mots
        }))

        console.log(`📊 Retour de ${formattedPhrases.length} phrases (nouvellement générées)`)

        // Récupérer les stats OpenRouter
        const stats = await getOpenRouterStats()

        return res.status(200).json({
            success: true,
            phrases: formattedPhrases,
            total_disponibles: phrasesFiltrees.length,
            texte_ids: texteIdsNormalises,
            source: 'generated',
            ia_source: sourceIA,
            openrouter_stats: stats
        })

    } catch (error) {
        console.error('💥 Erreur serveur:', error)

        // Message personnalisé selon le type d'erreur
        if (error.message === 'QUOTA_EXCEEDED') {
            return res.status(503).json({
                error: 'Quota quotidien dépassé',
                message: 'Le quota gratuit de génération de phrases est dépassé (50 générations/jour). Veuillez réessayer demain ou contacter l\'administrateur.'
            })
        }

        if (error.message === 'NO_PHRASES_GENERATED') {
            return res.status(503).json({
                error: 'Quota quotidien dépassé',
                message: 'Le quota gratuit de génération de phrases est dépassé. Les tentatives automatiques n\'ont pas réussi. Réessayez demain.'
            })
        }

        // Erreur générique
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
