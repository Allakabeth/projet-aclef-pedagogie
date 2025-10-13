import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // Vérifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    const { id } = req.query

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('categories_outils_pedagogiques')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Catégorie non trouvée' })
            }

            return res.status(200).json({ categorie: data })
        }

        if (req.method === 'PUT') {
            const { nom, description, emoji, couleur, ordre, actif } = req.body

            const updateData = {}
            if (nom !== undefined) updateData.nom = nom
            if (description !== undefined) updateData.description = description
            if (emoji !== undefined) updateData.emoji = emoji
            if (couleur !== undefined) updateData.couleur = couleur
            if (ordre !== undefined) updateData.ordre = ordre
            if (actif !== undefined) updateData.actif = actif

            const { data, error } = await supabase
                .from('categories_outils_pedagogiques')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            return res.status(200).json({ categorie: data })
        }

        if (req.method === 'DELETE') {
            // Vérifier si des exercices utilisent cette catégorie
            const { data: exercices, error: checkError } = await supabase
                .from('formation_exercices')
                .select('id')
                .eq('categorie_id', id)
                .limit(1)

            if (checkError) throw checkError

            if (exercices && exercices.length > 0) {
                return res.status(400).json({
                    error: 'Impossible de supprimer cette catégorie car elle est utilisée par des exercices'
                })
            }

            const { error } = await supabase
                .from('categories_outils_pedagogiques')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Catégorie supprimée avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API categorie-outil:', error)
        return res.status(500).json({ error: error.message })
    }
}
