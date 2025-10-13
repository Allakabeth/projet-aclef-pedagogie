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
                .from('formation_competences')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Compétence non trouvée' })
            }

            return res.status(200).json({ competence: data })
        }

        if (req.method === 'PUT') {
            const { categorie_id, code, intitule, description, contexte, ordre } = req.body

            const updateData = {}
            if (categorie_id !== undefined) updateData.categorie_id = categorie_id
            if (code !== undefined) updateData.code = code
            if (intitule !== undefined) updateData.intitule = intitule
            if (description !== undefined) updateData.description = description
            if (contexte !== undefined) updateData.contexte = contexte
            if (ordre !== undefined) updateData.ordre = ordre

            const { data, error } = await supabase
                .from('formation_competences')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Compétence non trouvée' })
            }

            return res.status(200).json({ competence: data })
        }

        if (req.method === 'DELETE') {
            // CASCADE supprimera automatiquement les associations aux plans
            const { error } = await supabase
                .from('formation_competences')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Compétence supprimée avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API compétence:', error)
        return res.status(500).json({ error: error.message })
    }
}
