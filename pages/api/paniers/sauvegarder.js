import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // TEMPORAIRE : Pas d'auth, utiliser Nina comme test
        const apprenantId = 'ef45f2ec-77e5-4df6-b73b-221fa56deb50' // ID de Nina

        const { paniers, progression, motsTraites } = req.body

        if (!paniers) {
            return res.status(400).json({ error: 'Données paniers manquantes' })
        }

        console.log(`💾 Sauvegarde paniers pour apprenant ${apprenantId}`)

        // Supprimer tous les anciens paniers de l'apprenant
        const { error: deleteError } = await supabase
            .from('paniers_syllabes')
            .delete()
            .eq('apprenant_id', apprenantId)

        if (deleteError) {
            console.error('Erreur suppression anciens paniers:', deleteError)
        }

        // Fonction pour encoder les lettres spéciales en 1 caractère
        const encoderLettre = (lettre) => {
            if (lettre === 'SONS_COMPLEXES') return '§'
            if (lettre === 'RESEGMENTATION') return '®'
            if (lettre === 'AUTRES') return '*'
            return lettre.charAt(0) // Prendre seulement le premier caractère
        }

        // Préparer les nouvelles données à insérer
        const paniersToInsert = []

        Object.keys(paniers).forEach(lettre => {
            Object.keys(paniers[lettre]).forEach(nomPanier => {
                const syllabes = paniers[lettre][nomPanier]
                if (syllabes && syllabes.length > 0) {
                    // Créer un seul enregistrement par panier, sans lien aux textes
                    paniersToInsert.push({
                        apprenant_id: apprenantId,
                        texte_id: null, // Pas de lien à un texte spécifique
                        lettre_panier: encoderLettre(lettre),
                        nom_panier: nomPanier,
                        syllabes: syllabes
                    })
                }
            })
        })

        if (paniersToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('paniers_syllabes')
                .insert(paniersToInsert)

            if (insertError) {
                console.error('Erreur insertion paniers:', insertError)
                return res.status(500).json({ error: 'Erreur sauvegarde paniers' })
            }

            console.log(`✅ ${paniersToInsert.length} paniers sauvegardés`)
        }

        // Sauvegarder les mots traités s'ils sont fournis
        if (motsTraites && motsTraites.length > 0) {
            // Créer un enregistrement spécial pour les mots traités
            const motsTraitesRecord = {
                apprenant_id: apprenantId,
                texte_id: null,
                lettre_panier: 'T', // T pour "Traités"
                nom_panier: 'MOTS_TRAITES',
                syllabes: motsTraites
            }

            const { error: insertMotsError } = await supabase
                .from('paniers_syllabes')
                .insert([motsTraitesRecord])

            if (insertMotsError) {
                console.error('Erreur sauvegarde mots traités:', insertMotsError)
            } else {
                console.log(`✅ ${motsTraites.length} mots traités sauvegardés`)
            }
        }

        res.status(200).json({
            success: true,
            message: `${paniersToInsert.length} paniers et ${motsTraites?.length || 0} mots traités sauvegardés`
        })

    } catch (error) {
        console.error('Erreur sauvegarde paniers:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}