import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'
import formidable from 'formidable'
import { promises as fs } from 'fs'

export const config = {
    api: {
        bodyParser: false,
    },
}

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

        // Parser les données FormData
        const form = formidable({ multiples: true })
        const [fields, files] = await form.parse(req)

        // Extraire les données de base
        const titre = Array.isArray(fields.titre) ? fields.titre[0] : fields.titre
        const theme = Array.isArray(fields.theme) ? fields.theme[0] : fields.theme
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description

        // Reconstruire le tableau des éléments
        const elements = []
        const elementKeys = Object.keys(fields).filter(key => key.startsWith('elements['))

        // Grouper par index
        const elementsByIndex = {}
        elementKeys.forEach(key => {
            const match = key.match(/elements\[(\d+)\]\[(\w+)\]/)
            if (match) {
                const index = parseInt(match[1])
                const field = match[2]
                const value = Array.isArray(fields[key]) ? fields[key][0] : fields[key]

                if (!elementsByIndex[index]) {
                    elementsByIndex[index] = {}
                }
                elementsByIndex[index][field] = value
            }
        })

        // Convertir en tableau
        Object.keys(elementsByIndex).forEach(index => {
            elements.push(elementsByIndex[index])
        })

        // Debug des données reçues
        console.log('Données reçues:', {
            titre,
            theme,
            description,
            elements_count: elements.length,
            user_id: user.id
        })

        // Validation des données
        if (!titre || !theme || !elements || elements.length === 0) {
            return res.status(400).json({ message: 'Données manquantes ou invalides' })
        }

        // Sauvegarder l'imagier
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .insert({
                titre,
                theme,
                description,
                created_by: user.id,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (imagierError) {
            console.error('Erreur création imagier:', imagierError)
            return res.status(500).json({ message: 'Erreur lors de la création de l\'imagier' })
        }

        // Sauvegarder les éléments avec upload des images
        const elementsData = []

        for (let index = 0; index < elements.length; index++) {
            const element = elements[index]
            let imageUrl = ''

            if (element.image_url) {
                // Élément généré par IA - il a déjà une URL
                imageUrl = element.image_url
            } else {
                // Élément manuel - convertir l'image en base64
                const imageKey = `elements[${index}][image]`
                const imageFile = files[imageKey]?.[0] || files[imageKey]

                if (imageFile && imageFile.filepath) {
                    try {
                        console.log(`📤 Conversion image ${index}:`, imageFile.originalFilename)

                        // Lire le fichier
                        const fileBuffer = await fs.readFile(imageFile.filepath)

                        // Convertir en base64
                        const base64 = fileBuffer.toString('base64')
                        const mimeType = imageFile.mimetype || 'image/jpeg'
                        imageUrl = `data:${mimeType};base64,${base64}`

                        console.log(`✅ Image ${index} convertie en base64 (${Math.round(base64.length / 1024)}KB)`)

                        // Nettoyer le fichier temporaire
                        try {
                            await fs.unlink(imageFile.filepath)
                        } catch (unlinkError) {
                            console.error('⚠️ Erreur suppression fichier temp:', unlinkError)
                        }

                    } catch (error) {
                        console.error('❌ Erreur traitement image:', error)
                        imageUrl = `https://via.placeholder.com/400x300?text=Erreur`
                    }
                } else {
                    console.warn(`⚠️ Pas d'image pour l'élément ${index}`)
                    imageUrl = `https://via.placeholder.com/400x300?text=Pas+d%27image`
                }
            }

            elementsData.push({
                imagier_id: imagier.id,
                mot: element.mot || '',
                image_url: imageUrl,
                commentaire: element.commentaire || '',
                question: element.question || '',
                reponse: element.reponse || '',
                ordre: index
            })
        }

        console.log('Premier élément brut:', elements[0])
        console.log('Éléments à sauvegarder:', elementsData.slice(0, 2))

        const { error: elementsError } = await supabase
            .from('imagier_elements')
            .insert(elementsData)

        if (elementsError) {
            console.error('Erreur création éléments:', elementsError)
            // Supprimer l'imagier créé en cas d'erreur
            await supabase.from('imagiers').delete().eq('id', imagier.id)
            return res.status(500).json({ message: 'Erreur lors de la création des éléments' })
        }

        res.status(200).json({
            message: 'Imagier créé avec succès',
            imagier: {
                id: imagier.id,
                titre: imagier.titre,
                theme: imagier.theme,
                description: imagier.description,
                nombre_elements: elements.length
            }
        })

    } catch (error) {
        console.error('Erreur sauvegarde imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde' })
    }
}