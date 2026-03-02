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
        return res.status(400).json({ error: 'ID de l\'étape requis' })
    }

    try {
        if (req.method === 'GET') {
            // Récupérer une étape spécifique
            const { data, error } = await supabase
                .from('formation_etapes')
                .select(`
                    *,
                    profil:formation_profils(id, code, nom, type_public, couleur)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            if (!data) {
                return res.status(404).json({ error: 'Étape non trouvée' })
            }

            return res.status(200).json({ etape: data })
        }

        if (req.method === 'PUT') {
            // Mettre à jour une étape
            const {
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

            const updateData = {}
            if (numero !== undefined) updateData.numero = numero
            if (nom !== undefined) updateData.nom = nom
            if (objectifs_lecture !== undefined) updateData.objectifs_lecture = objectifs_lecture
            if (objectifs_ecriture !== undefined) updateData.objectifs_ecriture = objectifs_ecriture
            if (duree_min !== undefined) updateData.duree_min = duree_min
            if (duree_max !== undefined) updateData.duree_max = duree_max
            if (indicateurs_reussite !== undefined) updateData.indicateurs_reussite = indicateurs_reussite
            if (outils_recommandes !== undefined) updateData.outils_recommandes = outils_recommandes
            if (ordre !== undefined) updateData.ordre = ordre

            const { data, error } = await supabase
                .from('formation_etapes')
                .update(updateData)
                .eq('id', id)
                .select(`
                    *,
                    profil:formation_profils(id, code, nom, type_public)
                `)
                .single()

            if (error) throw error

            return res.status(200).json({ etape: data })
        }

        if (req.method === 'DELETE') {
            // Supprimer une étape
            const { error } = await supabase
                .from('formation_etapes')
                .delete()
                .eq('id', id)

            if (error) throw error

            return res.status(200).json({ success: true, message: 'Étape supprimée' })
        }

        return res.status(405).json({ error: 'Méthode non autorisée' })
    } catch (error) {
        console.error('Erreur API étape:', error)
        return res.status(500).json({ error: error.message })
    }
}
