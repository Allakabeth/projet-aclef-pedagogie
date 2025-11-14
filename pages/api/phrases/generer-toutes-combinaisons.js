import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyToken } from '../../../lib/jwt'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

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
 * Génère toutes les combinaisons possibles d'un tableau
 * Ex: [1,2,3] → [[1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
 */
function getAllCombinations(arr) {
    const combinations = []
    const n = arr.length

    // Générer 2^n - 1 combinaisons (en excluant le set vide)
    for (let i = 1; i < (1 << n); i++) {
        const combo = []
        for (let j = 0; j < n; j++) {
            if (i & (1 << j)) {
                combo.push(arr[j])
            }
        }
        // Toujours trier pour normalisation
        combinations.push(combo.sort((a, b) => a - b))
    }

    return combinations
}

// ====================================================================
// GÉNÉRATION DE PHRASES PAR L'IA
// ====================================================================

/**
 * Génère un ensemble de phrases variées avec Gemini ou Groq
 */
async function genererPhrasesIA(motsUniques) {
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

CONSIGNE : Crée exactement ${nbPhrasesCible} phrases SIMPLES et TRÈS VARIÉES ayant du SENS en français.

MOTS DISPONIBLES (${nbMots} mots) :
${motsUniques.join(', ')}

RÈGLES IMPORTANTES :
1. Utilise UNIQUEMENT les mots de la liste ci-dessus
2. Génère des phrases de toutes longueurs (3, 4, 5, 6, 7 mots MAXIMUM)
3. VARIÉTÉ ABSOLUE : débuts différents, structures différentes
4. Les phrases doivent avoir du SENS en français
5. Pas de doublons
6. Majuscule en début, ponctuation en fin (. ! ?)

DISTRIBUTION SOUHAITÉE :
${nbMots < 10 ? '- ~10 phrases de chaque longueur (3,4,5)' : ''}
${nbMots >= 10 && nbMots < 30 ? '- ~20 phrases de 3 mots\n- ~25 phrases de 4 mots\n- ~25 phrases de 5 mots\n- ~20 phrases de 6 mots\n- ~10 phrases de 7 mots' : ''}
${nbMots >= 30 ? '- ~30 phrases de 3 mots\n- ~40 phrases de 4 mots\n- ~40 phrases de 5 mots\n- ~25 phrases de 6 mots\n- ~15 phrases de 7 mots' : ''}

VARIÉTÉ OBLIGATOIRE - EXEMPLES DE STRUCTURES :
- Sujet + Verbe + Complément
- Questions
- Exclamations
- Complément en début de phrase

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

    // TENTATIVE 1: Gemini
    try {
        console.log('🤖 Génération avec Gemini...')
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash-latest',
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 50
            }
        })

        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
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

            source = 'gemini'
            console.log(`✅ ${phrases.length} phrases validées depuis Gemini`)
        }
    } catch (geminiError) {
        console.error('❌ Erreur Gemini:', geminiError.message)

        // TENTATIVE 2: Groq
        try {
            console.log('🔄 Génération avec Groq...')
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.9
                })
            })

            if (groqResponse.ok) {
                const groqData = await groqResponse.json()
                const groqText = groqData.choices[0].message.content

                const cleanedText = groqText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
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

                    source = 'groq'
                    console.log(`✅ ${phrases.length} phrases validées depuis Groq`)
                }
            } else {
                throw new Error(`Groq API error: ${groqResponse.status}`)
            }
        } catch (groqError) {
            console.error('❌ Erreur Groq:', groqError.message)
            throw new Error('Gemini et Groq ont tous les deux échoué')
        }
    }

    if (phrases.length === 0) {
        throw new Error('Aucune phrase valide générée')
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

        const userId = decoded.userId
        const { nouveau_texte_id } = req.body

        if (!nouveau_texte_id) {
            return res.status(400).json({ error: 'nouveau_texte_id requis' })
        }

        console.log(`📚 Génération de toutes les combinaisons pour user ${userId}, nouveau texte ${nouveau_texte_id}`)

        // 1. Récupérer TOUS les textes de cet apprenant
        const { data: textes, error: textesError } = await supabaseAdmin
            .from('textes_references')
            .select('id')
            .eq('user_id', userId)
            .order('id', { ascending: true })

        if (textesError) {
            console.error('Erreur récupération textes:', textesError)
            return res.status(500).json({ error: 'Erreur récupération textes' })
        }

        if (!textes || textes.length === 0) {
            return res.status(400).json({ error: 'Aucun texte trouvé pour cet apprenant' })
        }

        const texteIds = textes.map(t => t.id)
        console.log(`📖 ${texteIds.length} textes trouvés: ${texteIds.join(', ')}`)

        // 2. Générer toutes les combinaisons possibles
        const toutesCombinaisons = getAllCombinations(texteIds)
        console.log(`🔢 ${toutesCombinaisons.length} combinaisons possibles`)

        // 3. Filtrer: garder seulement celles qui incluent le nouveau texte
        const combinaisonsAvecNouveauTexte = toutesCombinaisons.filter(combo =>
            combo.includes(parseInt(nouveau_texte_id))
        )
        console.log(`🎯 ${combinaisonsAvecNouveauTexte.length} combinaisons incluant le texte ${nouveau_texte_id}`)

        let nbCombiGenerees = 0
        let nbPhrasesTotales = 0
        const resultats = []

        // 4. Pour chaque combinaison, vérifier si déjà générée, sinon générer
        for (const combo of combinaisonsAvecNouveauTexte) {
            console.log(`\n📝 Traitement combinaison [${combo.join(',')}]`)

            // Vérifier si déjà générée
            const { data: existantes, error: checkError } = await supabaseAdmin
                .from('phrases_pregenerees')
                .select('id')
                .eq('user_id', userId)
                .contains('texte_ids', combo)
                .limit(1)

            if (checkError) {
                console.error('Erreur vérification:', checkError)
                continue
            }

            if (existantes && existantes.length > 0) {
                console.log(`✓ Combinaison [${combo.join(',')}] déjà générée, skip`)
                continue
            }

            // Récupérer les mots uniques pour cette combinaison
            const { data: groupes, error: groupesError } = await supabaseAdmin
                .from('groupes_sens')
                .select('contenu')
                .in('texte_reference_id', combo)

            if (groupesError || !groupes) {
                console.error('Erreur récupération groupes:', groupesError)
                continue
            }

            // Extraire mots uniques
            const motsSet = new Set()
            groupes.forEach(groupe => {
                if (groupe.contenu) {
                    const mots = groupe.contenu
                        .split(/\s+/)
                        .map(mot => mot.trim())
                        .filter(mot => mot.length > 0)
                        .filter(mot => !/^[.,;:!?¡¿'"«»\-—]+$/.test(mot))

                    mots.forEach(mot => {
                        const motNettoye = mot
                            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                            .toLowerCase()

                        if (motNettoye.length > 0) {
                            motsSet.add(motNettoye)
                        }
                    })
                }
            })

            const motsUniques = Array.from(motsSet)
            console.log(`📚 ${motsUniques.length} mots uniques pour [${combo.join(',')}]`)

            if (motsUniques.length < 3) {
                console.log(`⚠️ Pas assez de mots (<3), skip`)
                continue
            }

            // Générer les phrases avec l'IA
            try {
                const { phrases, source } = await genererPhrasesIA(motsUniques)

                if (phrases.length === 0) {
                    console.log(`⚠️ Aucune phrase générée, skip`)
                    continue
                }

                // Insérer en base de données
                const phrasesAInserer = phrases.map(p => ({
                    texte_ids: combo,
                    phrase: p.texte,
                    mots: p.mots,
                    longueur_mots: p.mots.length,
                    user_id: userId,
                    source: source
                }))

                const { data: inserted, error: insertError } = await supabaseAdmin
                    .from('phrases_pregenerees')
                    .insert(phrasesAInserer)
                    .select()

                if (insertError) {
                    console.error(`❌ Erreur insertion:`, insertError)
                } else {
                    nbCombiGenerees++
                    nbPhrasesTotales += inserted.length
                    console.log(`✅ ${inserted.length} phrases insérées pour [${combo.join(',')}]`)

                    resultats.push({
                        combinaison: combo,
                        nb_phrases: inserted.length,
                        nb_mots: motsUniques.length,
                        source
                    })
                }
            } catch (genError) {
                console.error(`❌ Erreur génération pour [${combo.join(',')}]:`, genError.message)
            }
        }

        console.log(`\n✅ TERMINÉ: ${nbCombiGenerees} combinaisons générées, ${nbPhrasesTotales} phrases au total`)

        return res.status(200).json({
            success: true,
            nb_combinaisons_generees: nbCombiGenerees,
            nb_phrases_totales: nbPhrasesTotales,
            resultats
        })

    } catch (error) {
        console.error('💥 Erreur génération:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
