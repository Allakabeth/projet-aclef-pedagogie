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

    try {
        if (req.method === 'GET') {
            // Récupérer les profils avec filtres optionnels
            const { type_public, domaine_id, degre_anlci } = req.query

            let query = supabase
                .from('formation_profils')
                .select(`
                    *,
                    domaine:formation_domaines(id, nom, emoji)
                `)
                .order('type_public', { ascending: true })
                .order('ordre', { ascending: true })

            // Filtres optionnels
            if (type_public) {
                query = query.eq('type_public', type_public)
            }
            if (domaine_id) {
                query = query.eq('domaine_id', domaine_id)
            }
            if (degre_anlci) {
                query = query.eq('degre_anlci', parseInt(degre_anlci))
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ profils: data })
        }

        if (req.method === 'POST') {
            // Créer un nouveau profil
            const {
                code,
                nom,
                type_public,
                domaine_id,
                degre_anlci,
                description,
                caracteristiques,
                besoins_formation,
                ordre,
                couleur
            } = req.body

            if (!code || !nom || !type_public) {
                return res.status(400).json({
                    error: 'Le code, le nom et le type de public sont requis'
                })
            }

            const { data, error } = await supabase
                .from('formation_profils')
                .insert([{
                    code,
                    nom,
                    type_public,
                    domaine_id,
                    degre_anlci,
                    description,
                    caracteristiques,
                    besoins_formation,
                    ordre: ordre || 0,
                    couleur
                }])
                .select(`
                    *,
                    domaine:formation_domaines(id, nom, emoji)
                `)
                .single()

            if (error) throw error

            return res.status(201).json({ profil: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API profils:', error)
        return res.status(500).json({ error: error.message })
    }
}
