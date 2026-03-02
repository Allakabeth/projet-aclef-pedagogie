import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // Verifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifie' })
    }

    const { id } = req.query

    // Validation basique de l'ID
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID invalide' })
    }

    try {
        // --- GET : Recuperer des coordonnees PDF par ID ---
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('formation_pdf_coordonnees')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Coordonnees non trouvees' })
                }
                throw error
            }

            if (!data) {
                return res.status(404).json({ error: 'Coordonnees non trouvees' })
            }

            return res.status(200).json({ coordonnees: data })
        }

        // --- DELETE : Supprimer des coordonnees PDF ---
        if (req.method === 'DELETE') {
            // Verifier que l'enregistrement existe
            const { data: existing, error: checkError } = await supabase
                .from('formation_pdf_coordonnees')
                .select('id')
                .eq('id', id)
                .single()

            if (checkError || !existing) {
                return res.status(404).json({ error: 'Coordonnees non trouvees' })
            }

            const { error } = await supabase
                .from('formation_pdf_coordonnees')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ message: 'Coordonnees supprimees avec succes' })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API pdf-coordonnees/[id]:', error)
        return res.status(500).json({ error: error.message })
    }
}
