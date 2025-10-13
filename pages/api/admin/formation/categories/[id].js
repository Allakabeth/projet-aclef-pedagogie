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
                .from('formation_categories_competences')
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
            const { domaine_id, nom, description, ordre } = req.body

            const updateData = {}
            if (domaine_id !== undefined) updateData.domaine_id = domaine_id
            if (nom !== undefined) updateData.nom = nom
            if (description !== undefined) updateData.description = description
            if (ordre !== undefined) updateData.ordre = ordre

            const { data, error } = await supabase
                .from('formation_categories_competences')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Catégorie non trouvée' })
            }

            return res.status(200).json({ categorie: data })
        }

        if (req.method === 'DELETE') {
            // CASCADE supprimera automatiquement les compétences associées
            const { error } = await supabase
                .from('formation_categories_competences')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Catégorie supprimée avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API catégorie:', error)
        return res.status(500).json({ error: error.message })
    }
}
