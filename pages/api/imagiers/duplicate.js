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

        const { imagier_id, nouveau_titre } = req.body

        if (!imagier_id) {
            return res.status(400).json({ message: 'ID de l\'imagier manquant' })
        }

        // Récupérer l'imagier source
        const { data: imagierSource, error: imagierError } = await supabase
            .from('imagiers')
            .select('*')
            .eq('id', imagier_id)
            .eq('created_by', user.id)
            .single()

        if (imagierError || !imagierSource) {
            console.error('Erreur récupération imagier source:', imagierError)
            return res.status(404).json({ message: 'Imagier source non trouvé' })
        }

        // Récupérer les éléments de l'imagier source
        const { data: elementsSource, error: elementsError } = await supabase
            .from('imagier_elements')
            .select('*')
            .eq('imagier_id', imagier_id)
            .order('ordre', { ascending: true })

        if (elementsError) {
            console.error('Erreur récupération éléments:', elementsError)
            return res.status(500).json({ message: 'Erreur lors de la récupération des éléments' })
        }

        // Créer le nouvel imagier (copie)
        const { data: nouvelImagier, error: createError } = await supabase
            .from('imagiers')
            .insert({
                titre: nouveau_titre || `${imagierSource.titre} (Copie)`,
                description: imagierSource.description,
                theme: imagierSource.theme,
                voix: imagierSource.voix,
                created_by: user.id
            })
            .select()
            .single()

        if (createError || !nouvelImagier) {
            console.error('Erreur création nouvel imagier:', createError)
            return res.status(500).json({ message: 'Erreur lors de la création de l\'imagier dupliqué' })
        }

        // Dupliquer tous les éléments
        if (elementsSource && elementsSource.length > 0) {
            const nouveauxElements = elementsSource.map(element => ({
                imagier_id: nouvelImagier.id,
                mot: element.mot,
                image_url: element.image_url,
                commentaire: element.commentaire,
                ordre: element.ordre
            }))

            const { error: elementsCreateError } = await supabase
                .from('imagier_elements')
                .insert(nouveauxElements)

            if (elementsCreateError) {
                console.error('Erreur duplication éléments:', elementsCreateError)
                // Supprimer l'imagier créé en cas d'erreur
                await supabase.from('imagiers').delete().eq('id', nouvelImagier.id)
                return res.status(500).json({ message: 'Erreur lors de la duplication des éléments' })
            }
        }

        res.status(200).json({
            message: 'Imagier dupliqué avec succès',
            imagier: nouvelImagier
        })

    } catch (error) {
        console.error('Erreur duplication imagier:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la duplication' })
    }
}
