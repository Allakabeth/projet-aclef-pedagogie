import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res)
            case 'POST':
                return await handlePost(req, res)
            case 'PUT':
                return await handlePut(req, res)
            case 'DELETE':
                return await handleDelete(req, res)
            default:
                return res.status(405).json({ error: 'Méthode non autorisée' })
        }
    } catch (error) {
        console.error('Erreur API catégories:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// GET - Récupérer toutes les catégories avec nombre de mots
async function handleGet(req, res) {
    try {
        const { data, error } = await supabase
            .from('vocabulaire_code_route')
            .select('categorie, emoji')

        if (error) {
            console.error('Erreur récupération catégories:', error)
            return res.status(500).json({ error: 'Erreur récupération catégories' })
        }

        // Regrouper par catégorie et compter
        const categoriesMap = {}
        data.forEach(item => {
            if (!categoriesMap[item.categorie]) {
                categoriesMap[item.categorie] = {
                    nom: item.categorie,
                    emoji: item.emoji || '📝',
                    count: 0
                }
            }
            categoriesMap[item.categorie].count++
        })

        const categories = Object.values(categoriesMap).sort((a, b) =>
            a.nom.localeCompare(b.nom)
        )

        return res.status(200).json({
            success: true,
            categories
        })

    } catch (error) {
        console.error('Erreur GET catégories:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// POST - Créer une nouvelle catégorie
async function handlePost(req, res) {
    const { nom, emoji } = req.body

    if (!nom) {
        return res.status(400).json({ error: 'Nom de catégorie manquant' })
    }

    try {
        // Vérifier si la catégorie existe déjà
        const { data: existing } = await supabase
            .from('vocabulaire_code_route')
            .select('categorie')
            .eq('categorie', nom)
            .limit(1)

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Cette catégorie existe déjà' })
        }

        // Créer un mot placeholder pour initialiser la catégorie
        // (sera supprimé quand l'admin ajoutera de vrais mots)
        const { data, error } = await supabase
            .from('vocabulaire_code_route')
            .insert([{
                categorie: nom,
                mot: '_placeholder_',
                definition_simple: 'Catégorie vide - ajoutez des mots',
                emoji: emoji || '📝',
                ordre_categorie: 0
            }])
            .select()

        if (error) {
            console.error('Erreur création catégorie:', error)
            return res.status(500).json({ error: 'Erreur lors de la création' })
        }

        return res.status(201).json({
            success: true,
            categorie: {
                nom,
                emoji: emoji || '📝',
                count: 1
            }
        })

    } catch (error) {
        console.error('Erreur POST catégorie:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// PUT - Renommer une catégorie
async function handlePut(req, res) {
    const { ancien_nom, nouveau_nom, emoji } = req.body

    if (!ancien_nom || !nouveau_nom) {
        return res.status(400).json({ error: 'Noms manquants' })
    }

    try {
        // Vérifier si le nouveau nom existe déjà
        const { data: existing } = await supabase
            .from('vocabulaire_code_route')
            .select('categorie')
            .eq('categorie', nouveau_nom)
            .limit(1)

        if (existing && existing.length > 0 && ancien_nom !== nouveau_nom) {
            return res.status(400).json({ error: 'Ce nom de catégorie existe déjà' })
        }

        // Mettre à jour tous les mots de la catégorie
        const updates = { categorie: nouveau_nom }
        if (emoji !== undefined) updates.emoji = emoji

        const { data, error } = await supabase
            .from('vocabulaire_code_route')
            .update(updates)
            .eq('categorie', ancien_nom)
            .select()

        if (error) {
            console.error('Erreur renommage catégorie:', error)
            return res.status(500).json({ error: 'Erreur lors du renommage' })
        }

        return res.status(200).json({
            success: true,
            nb_mots_modifies: data.length,
            categorie: {
                nom: nouveau_nom,
                emoji: emoji || data[0]?.emoji || '📝',
                count: data.length
            }
        })

    } catch (error) {
        console.error('Erreur PUT catégorie:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// DELETE - Supprimer une catégorie
async function handleDelete(req, res) {
    const { nom } = req.query

    if (!nom) {
        return res.status(400).json({ error: 'Nom de catégorie manquant' })
    }

    try {
        // Compter les mots dans la catégorie
        const { data: mots, error: countError } = await supabase
            .from('vocabulaire_code_route')
            .select('id')
            .eq('categorie', nom)

        if (countError) {
            console.error('Erreur comptage mots:', countError)
        }

        const nbMots = mots?.length || 0

        // Supprimer tous les mots de la catégorie
        const { error } = await supabase
            .from('vocabulaire_code_route')
            .delete()
            .eq('categorie', nom)

        if (error) {
            console.error('Erreur suppression catégorie:', error)
            return res.status(500).json({ error: 'Erreur lors de la suppression' })
        }

        return res.status(200).json({
            success: true,
            message: 'Catégorie supprimée avec succès',
            nb_mots_supprimes: nbMots
        })

    } catch (error) {
        console.error('Erreur DELETE catégorie:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
