import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyToken } from '../../../lib/jwt'

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
            // Essayer d'abord Gemini
            console.log('Tentative avec Gemini...')
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
            const result = await model.generateContent(prompt)
            const response = result.response
            const text = response.text()

            // Extraire le JSON de la réponse Gemini
            let jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('Impossible de parser la réponse de Gemini')
            }

            aiResponse = JSON.parse(jsonMatch[0])
            console.log('Gemini: succès')

        } catch (geminiError) {
            console.log('Gemini échoué, utilisation du fallback simple:', geminiError.message)
            
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
        console.error('Gemini API Key présente:', !!process.env.GOOGLE_AI_API_KEY)
        console.error('Groupes reçus:', JSON.stringify(req.body.groupes_sens || [], null, 2))
        console.error('==============================')
        
        res.status(500).json({ 
            error: 'Erreur lors de la génération de phrase',
            details: error.message,
            debug: {
                hasGeminiKey: !!process.env.GOOGLE_AI_API_KEY,
                groupesCount: req.body.groupes_sens?.length || 0
            }
        })
    }
}