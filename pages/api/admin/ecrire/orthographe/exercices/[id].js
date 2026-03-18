import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    const { id } = req.query

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('orthographe_exercices')
                .select('*, formation_competences(id, code, intitule)')
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Exercice non trouvé' })
            }

            return res.status(200).json({ exercice: data })
        }

        if (req.method === 'PUT') {
            const {
                theme_grammatical, sous_theme, type, titre, consigne,
                niveau, numero_boite, ordre, difficulte, contenu, competence_id, actif
            } = req.body

            const updateData = {}
            if (theme_grammatical !== undefined) updateData.theme_grammatical = theme_grammatical
            if (sous_theme !== undefined) updateData.sous_theme = sous_theme
            if (type !== undefined) updateData.type = type
            if (titre !== undefined) updateData.titre = titre
            if (consigne !== undefined) updateData.consigne = consigne
            if (niveau !== undefined) updateData.niveau = niveau
            if (numero_boite !== undefined) updateData.numero_boite = numero_boite
            if (ordre !== undefined) updateData.ordre = ordre
            if (difficulte !== undefined) updateData.difficulte = difficulte
            if (contenu !== undefined) updateData.contenu = contenu
            if (competence_id !== undefined) updateData.competence_id = competence_id
            if (actif !== undefined) updateData.actif = actif

            const { data, error } = await supabase
                .from('orthographe_exercices')
                .update(updateData)
                .eq('id', id)
                .select('*, formation_competences(id, code, intitule)')
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Exercice non trouvé' })
            }

            return res.status(200).json({ exercice: data })
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase
                .from('orthographe_exercices')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Exercice supprimé avec succès' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercice orthographe:', error)
        return res.status(500).json({ error: error.message })
    }
}
