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
            // Récupérer un domaine spécifique
            const { data, error } = await supabase
                .from('formation_domaines')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Domaine non trouvé' })
            }

            return res.status(200).json({ domaine: data })
        }

        if (req.method === 'PUT') {
            // Modifier un domaine
            const { nom, emoji, description, ordre, actif } = req.body

            const updateData = {}
            if (nom !== undefined) updateData.nom = nom
            if (emoji !== undefined) updateData.emoji = emoji
            if (description !== undefined) updateData.description = description
            if (ordre !== undefined) updateData.ordre = ordre
            if (actif !== undefined) updateData.actif = actif

            const { data, error } = await supabase
                .from('formation_domaines')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Domaine non trouvé' })
            }

            return res.status(200).json({ domaine: data })
        }

        if (req.method === 'DELETE') {
            // Supprimer un domaine
            // Note: CASCADE supprimera automatiquement les catégories et compétences associées
            const { error } = await supabase
                .from('formation_domaines')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Domaine supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API domaine:', error)
        return res.status(500).json({ error: error.message })
    }
}
