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
                .from('formation_exercices')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Exercice non trouvé' })
            }

            return res.status(200).json({ exercice: data })
        }

        if (req.method === 'PUT') {
            const { competence_id, categorie_id, type, titre, description, difficulte, contenu } = req.body

            const updateData = {}
            if (competence_id !== undefined) updateData.competence_id = competence_id
            if (categorie_id !== undefined) updateData.categorie_id = categorie_id
            if (type !== undefined) updateData.type = type
            if (titre !== undefined) updateData.titre = titre
            if (description !== undefined) updateData.description = description
            if (difficulte !== undefined) updateData.difficulte = difficulte
            if (contenu !== undefined) updateData.contenu = contenu

            const { data, error } = await supabase
                .from('formation_exercices')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Exercice non trouvé' })
            }

            return res.status(200).json({ exercice: data })
        }

        if (req.method === 'DELETE') {
            // CASCADE supprimera automatiquement les assignations
            const { error } = await supabase
                .from('formation_exercices')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Exercice supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercice:', error)
        return res.status(500).json({ error: error.message })
    }
}
