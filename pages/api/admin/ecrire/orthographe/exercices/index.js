import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    try {
        if (req.method === 'GET') {
            const { theme_grammatical, sous_theme, type, niveau, competence_id, actif } = req.query

            let query = supabase
                .from('orthographe_exercices')
                .select('*, formation_competences(id, code, intitule)')
                .order('niveau', { ascending: true })
                .order('ordre', { ascending: true })

            if (theme_grammatical) query = query.eq('theme_grammatical', theme_grammatical)
            if (sous_theme) query = query.eq('sous_theme', sous_theme)
            if (type) query = query.eq('type', type)
            if (niveau) query = query.eq('niveau', niveau)
            if (competence_id) query = query.eq('competence_id', competence_id)
            if (actif !== undefined) query = query.eq('actif', actif === 'true')

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ exercices: data })
        }

        if (req.method === 'POST') {
            const {
                theme_grammatical, sous_theme, type, titre, consigne,
                niveau, numero_boite, ordre, difficulte, contenu, competence_id
            } = req.body

            if (!theme_grammatical || !type || !titre) {
                return res.status(400).json({ error: 'theme_grammatical, type et titre sont requis' })
            }

            const { data, error } = await supabase
                .from('orthographe_exercices')
                .insert([{
                    theme_grammatical,
                    sous_theme: sous_theme || null,
                    type,
                    titre,
                    consigne: consigne || null,
                    niveau: niveau || 'A',
                    numero_boite: numero_boite || null,
                    ordre: ordre || 0,
                    difficulte: difficulte || 'moyen',
                    contenu: contenu || {},
                    competence_id: competence_id || null
                }])
                .select('*, formation_competences(id, code, intitule)')
                .single()

            if (error) throw error

            return res.status(201).json({ exercice: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API exercices orthographe:', error)
        return res.status(500).json({ error: error.message })
    }
}
