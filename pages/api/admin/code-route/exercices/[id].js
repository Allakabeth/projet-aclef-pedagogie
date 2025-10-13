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
                .from('exercices_code_route')
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
            const { categorie, type, titre, description, contenu } = req.body

            const updateData = {}
            if (categorie !== undefined) updateData.categorie = categorie
            if (type !== undefined) updateData.type = type
            if (titre !== undefined) updateData.titre = titre
            if (description !== undefined) updateData.description = description
            if (contenu !== undefined) updateData.contenu = contenu

            const { data, error } = await supabase
                .from('exercices_code_route')
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
            const { error } = await supabase
                .from('exercices_code_route')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Exercice supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercice Code de la Route:', error)
        return res.status(500).json({ error: error.message })
    }
}
