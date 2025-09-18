import { verifyToken } from '../../../lib/jwt'
import { supabase } from '../../../lib/supabaseClient'

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

        const { imagierId } = req.body

        // Vérifier que l'imagier appartient à l'utilisateur
        const { data: imagier, error: imagierError } = await supabase
            .from('imagiers')
            .select('id')
            .eq('id', imagierId)
            .eq('created_by', user.id)
            .single()

        if (imagierError || !imagier) {
            return res.status(404).json({ message: 'Imagier non trouvé' })
        }

        // Récupérer tous les éléments de l'imagier
        const { data: elements, error: elementsError } = await supabase
            .from('imagier_elements')
            .select('id, mot')
            .eq('imagier_id', imagierId)

        if (elementsError) {
            console.error('Erreur récupération éléments:', elementsError)
            return res.status(500).json({ message: 'Erreur lors de la récupération des éléments' })
        }

        console.log(`🔄 Régénération des images pour ${elements.length} éléments...`)

        // Mettre à jour chaque élément avec une vraie image correspondante
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i]
            const searchTerm = element.mot.toLowerCase()
            let newImageUrl = `https://picsum.photos/400/300?random=${Date.now() + i}` // Fallback

            // Essayer de trouver une vraie image sur Unsplash
            try {
                console.log(`🔍 Recherche Unsplash pour: "${searchTerm}"`)

                const unsplashResponse = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=5&orientation=landscape&client_id=BHq5rNBkZh5aZ7c-Rfs_lFUhH9Z4aLLGPxCxcWGGqwE`
                )

                if (unsplashResponse.ok) {
                    const unsplashData = await unsplashResponse.json()

                    if (unsplashData.results && unsplashData.results.length > 0) {
                        // Prendre une image aléatoire parmi les résultats
                        const randomIndex = Math.floor(Math.random() * unsplashData.results.length)
                        newImageUrl = unsplashData.results[randomIndex].urls.regular
                        console.log(`✅ Image Unsplash trouvée pour "${searchTerm}"`)
                    } else {
                        console.log(`❌ Aucune image Unsplash pour "${searchTerm}", utilisation du fallback`)
                    }
                } else {
                    console.error(`❌ Erreur Unsplash pour "${searchTerm}":`, unsplashResponse.status)
                }
            } catch (error) {
                console.error(`Erreur recherche image pour "${searchTerm}":`, error)
            }

            const { error: updateError } = await supabase
                .from('imagier_elements')
                .update({ image_url: newImageUrl })
                .eq('id', element.id)

            if (updateError) {
                console.error('Erreur mise à jour élément:', updateError)
            }

            // Petite pause pour éviter de surcharger l'API
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        res.status(200).json({
            message: 'Images régénérées avec succès',
            elements_updated: elements.length
        })

    } catch (error) {
        console.error('Erreur régénération images:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la régénération' })
    }
}