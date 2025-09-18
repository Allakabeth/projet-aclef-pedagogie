import { verifyToken } from '../../../lib/jwt'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const user = verifyToken(token)
        if (!user) {
            return res.status(401).json({ message: 'Token invalide' })
        }

        const { theme, niveau, nombreElements, styleImages, includeQuestions, voix } = req.body

        // Validation des paramètres
        if (!theme || !theme.trim()) {
            return res.status(400).json({ message: 'Le thème est obligatoire' })
        }

        // Générer le contenu avec une simulation (en attendant Gemini)
        const imagierGenere = await generateImagierWithAI({
            theme: theme.trim(),
            niveau,
            nombreElements: parseInt(nombreElements) || 10,
            styleImages,
            includeQuestions: includeQuestions !== false,
            voix
        })

        res.status(200).json(imagierGenere)

    } catch (error) {
        console.error('Erreur génération imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la génération' })
    }
}

// Fonction de génération d'imagier avec Gemini
async function generateImagierWithAI(params) {
    const { theme, niveau, nombreElements, styleImages, includeQuestions } = params

    try {
        console.log('Initialisation Gemini avec clé:', process.env.GEMINI_API_KEY ? 'Présente' : 'MANQUANTE')

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        console.log('Génération pour:', { theme, niveau, nombreElements, includeQuestions })

        const prompt = `Génère un imagier éducatif en français pour apprendre le vocabulaire.

CONSIGNES STRICTES :
- Thème demandé : "${theme}"
- Niveau : ${niveau}
- Nombre exact d'éléments : ${nombreElements}
- Inclure questions/réponses : ${includeQuestions ? 'OUI' : 'NON'}

Pour chaque mot, fournir :
1. Le mot en français (simple, adapté au niveau ${niveau})
2. Un commentaire court et éducatif (10-15 mots max)
3. ${includeQuestions ? 'Une question simple et sa réponse' : 'Pas de question'}

Répondre uniquement en JSON valide avec cette structure exacte :
{
  "titre": "Imagier [Thème]",
  "theme": "${theme}",
  "description": "Description courte",
  "elements": [
    {
      "mot": "exemple",
      "commentaire": "explication courte et claire",
      ${includeQuestions ? '"question": "Question simple ?", "reponse": "Réponse claire"' : '"question": "", "reponse": ""'}
    }
  ]
}

IMPORTANT :
- Exactement ${nombreElements} éléments dans le tableau
- Vocabulaire adapté au niveau ${niveau}
- Réponse en JSON pur sans formatage markdown`

        console.log('Envoi du prompt à Gemini...')
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        console.log('Réponse brute de Gemini:', text.substring(0, 500) + '...')

        // Parser la réponse JSON
        let generatedData
        try {
            // Nettoyer le texte si nécessaire (supprimer les ```json)
            const cleanText = text.replace(/```json|```/g, '').trim()
            console.log('Texte nettoyé:', cleanText.substring(0, 200) + '...')
            generatedData = JSON.parse(cleanText)
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError)
            console.error('Texte qui a causé l\'erreur:', text)
            throw new Error('Réponse IA invalide')
        }

        // Ajouter les images et IDs
        const elements = await Promise.all(generatedData.elements.map(async (element, index) => {
            let imageUrl = `https://picsum.photos/400/300?random=${Date.now() + index}` // Fallback

            // Essayer de trouver une vraie image correspondant au mot
            try {
                const searchTerm = element.mot.toLowerCase()
                console.log(`🔍 Recherche image pour: "${searchTerm}"`)

                // Utiliser Lorem Picsum avec des mots-clés thématiques pour plus de cohérence
                const themeKeywords = {
                    'outil': ['tools', 'hammer', 'screwdriver'],
                    'paysage': ['garden', 'nature', 'plants'],
                    'cuisine': ['kitchen', 'food', 'cooking'],
                    'animal': ['animals', 'pets', 'wildlife'],
                    'transport': ['car', 'transport', 'vehicle']
                }

                // Associer chaque mot à une image thématique basée sur l'ID
                const wordHash = searchTerm.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
                const imageId = 100 + (wordHash % 900) // IDs entre 100-999 pour de meilleures images

                imageUrl = `https://picsum.photos/id/${imageId}/400/300`
                console.log(`✅ Image thématique pour "${searchTerm}": ID ${imageId}`)

            } catch (error) {
                console.error(`Erreur génération image pour "${element.mot}":`, error)
                // Garder l'URL de fallback
            }

            return {
                id: Date.now() + index,
                mot: element.mot,
                image_url: imageUrl,
                commentaire: element.commentaire,
                question: element.question || '',
                reponse: element.reponse || ''
            }
        }))

        return {
            titre: generatedData.titre,
            theme: generatedData.theme,
            description: generatedData.description,
            elements
        }

    } catch (error) {
        console.error('Erreur Gemini:', error)
        throw new Error('Erreur lors de la génération avec l\'IA')
    }
}