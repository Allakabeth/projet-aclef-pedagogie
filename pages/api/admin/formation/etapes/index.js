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
            // Récupérer les étapes avec filtres optionnels
            const { profil_id } = req.query

            let query = supabase
                .from('formation_etapes')
                .select(`
                    *,
                    profil:formation_profils(id, code, nom, type_public)
                `)
                .order('profil_id', { ascending: true })
                .order('numero', { ascending: true })

            // Filtre par profil
            if (profil_id) {
                query = query.eq('profil_id', profil_id)
            }

            const { data, error } = await query

            if (error) throw error

            return res.status(200).json({ etapes: data })
        }

        if (req.method === 'POST') {
            // Créer une nouvelle étape
            const {
                profil_id,
                numero,
                nom,
                objectifs_lecture,
                objectifs_ecriture,
                duree_min,
                duree_max,
                indicateurs_reussite,
                outils_recommandes,
                ordre
            } = req.body

            if (!profil_id || !numero) {
                return res.status(400).json({
                    error: 'Le profil et le numéro d\'étape sont requis'
                })
            }

            const { data, error } = await supabase
                .from('formation_etapes')
                .insert([{
                    profil_id,
                    numero,
                    nom: nom || `Étape ${numero}`,
                    objectifs_lecture,
                    objectifs_ecriture,
                    duree_min,
                    duree_max,
                    indicateurs_reussite,
                    outils_recommandes,
                    ordre: ordre || numero
                }])
                .select(`
                    *,
                    profil:formation_profils(id, code, nom, type_public)
                `)
                .single()

            if (error) throw error

            return res.status(201).json({ etape: data })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API étapes:', error)
        return res.status(500).json({ error: error.message })
    }
}
