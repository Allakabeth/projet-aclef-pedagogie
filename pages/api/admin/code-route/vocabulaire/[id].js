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
                .from('vocabulaire_code_route')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Terme non trouvé' })
            }

            return res.status(200).json({ vocabulaire: data })
        }

        if (req.method === 'PUT') {
            const { categorie, emoji, mot, definition_simple, ordre_categorie } = req.body

            const updateData = {}
            if (categorie !== undefined) updateData.categorie = categorie
            if (emoji !== undefined) updateData.emoji = emoji
            if (mot !== undefined) updateData.mot = mot
            if (definition_simple !== undefined) updateData.definition_simple = definition_simple
            if (ordre_categorie !== undefined) updateData.ordre_categorie = ordre_categorie

            const { data, error } = await supabase
                .from('vocabulaire_code_route')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Terme non trouvé' })
            }

            return res.status(200).json({ vocabulaire: data })
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase
                .from('vocabulaire_code_route')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Terme supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API vocabulaire Code de la Route:', error)
        return res.status(500).json({ error: error.message })
    }
}
