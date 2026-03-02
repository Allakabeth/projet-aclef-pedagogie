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

    if (!id) {
        return res.status(400).json({ error: 'ID du profil requis' })
    }

    try {
        if (req.method === 'GET') {
            // Récupérer un profil avec ses étapes et ses compétences associées
            const { data: profil, error: profilError } = await supabase
                .from('formation_profils')
                .select(`
                    *,
                    domaine:formation_domaines(id, nom, emoji, description)
                `)
                .eq('id', id)
                .single()

            if (profilError) throw profilError

            if (!profil) {
                return res.status(404).json({ error: 'Profil non trouvé' })
            }

            // Récupérer les étapes du profil
            const { data: etapes, error: etapesError } = await supabase
                .from('formation_etapes')
                .select('*')
                .eq('profil_id', id)
                .order('numero', { ascending: true })

            if (etapesError) throw etapesError

            // Récupérer les compétences du même degré ANLCI
            let competences = []
            if (profil.degre_anlci && profil.domaine_id) {
                const { data: comps, error: compsError } = await supabase
                    .from('formation_competences')
                    .select(`
                        *,
                        categorie:formation_categories_competences(id, nom, description)
                    `)
                    .eq('degre_anlci', profil.degre_anlci)
                    .order('ordre', { ascending: true })

                if (compsError) throw compsError
                competences = comps || []
            }

            return res.status(200).json({
                profil: {
                    ...profil,
                    etapes: etapes || [],
                    competences
                }
            })
        }

        if (req.method === 'PUT') {
            // Mettre à jour un profil
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

            const updateData = {}
            if (code !== undefined) updateData.code = code
            if (nom !== undefined) updateData.nom = nom
            if (type_public !== undefined) updateData.type_public = type_public
            if (domaine_id !== undefined) updateData.domaine_id = domaine_id
            if (degre_anlci !== undefined) updateData.degre_anlci = degre_anlci
            if (description !== undefined) updateData.description = description
            if (caracteristiques !== undefined) updateData.caracteristiques = caracteristiques
            if (besoins_formation !== undefined) updateData.besoins_formation = besoins_formation
            if (ordre !== undefined) updateData.ordre = ordre
            if (couleur !== undefined) updateData.couleur = couleur

            const { data, error } = await supabase
                .from('formation_profils')
                .update(updateData)
                .eq('id', id)
                .select(`
                    *,
                    domaine:formation_domaines(id, nom, emoji)
                `)
                .single()

            if (error) throw error

            return res.status(200).json({ profil: data })
        }

        if (req.method === 'DELETE') {
            // Supprimer un profil (et ses étapes en cascade)
            const { error } = await supabase
                .from('formation_profils')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ success: true, message: 'Profil supprimé' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API profil:', error)
        return res.status(500).json({ error: error.message })
    }
}
