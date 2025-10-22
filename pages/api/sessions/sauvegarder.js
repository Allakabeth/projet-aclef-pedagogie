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
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const apprenantId = decoded.id

        const { 
            textesIds, 
            motActuelIndex,
            syllabeActuelleIndex,
            motsTraites,
            paniers 
        } = req.body

        if (!textesIds || !Array.isArray(textesIds)) {
            return res.status(400).json({ error: 'textesIds requis' })
        }

        console.log(`💾 Sauvegarde session pour apprenant ${apprenantId}`)
        console.log(`📍 Position: mot ${motActuelIndex}, syllabe ${syllabeActuelleIndex}`)

        const sessionData = {
            apprenant_id: apprenantId,
            textes_ids: textesIds,
            mot_actuel_index: motActuelIndex || 0,
            syllabe_actuelle_index: syllabeActuelleIndex || 0,
            mots_traites: motsTraites || [],
            date_sauvegarde: new Date().toISOString()
        }

        // Supprimer l'ancienne session
        const { error: deleteError } = await supabase
            .from('sessions_syllabes')
            .delete()
            .eq('apprenant_id', apprenantId)

        if (deleteError) {
            console.error('Erreur suppression ancienne session:', deleteError)
        }

        // Insérer la nouvelle session
        const { error: insertError } = await supabase
            .from('sessions_syllabes')
            .insert([sessionData])

        if (insertError) {
            console.error('Erreur sauvegarde session:', insertError)
            return res.status(500).json({ error: 'Erreur sauvegarde session' })
        }

        // Sauvegarder aussi les paniers
        if (paniers) {
            // Supprimer les anciens paniers
            const { error: deletePaniersError } = await supabase
                .from('paniers_syllabes')
                .delete()
                .eq('apprenant_id', apprenantId)

            if (deletePaniersError) {
                console.error('Erreur suppression anciens paniers:', deletePaniersError)
            }

            // Préparer les nouveaux paniers
            const paniersToInsert = []
            Object.keys(paniers).forEach(lettre => {
                Object.keys(paniers[lettre]).forEach(nomPanier => {
                    const syllabes = paniers[lettre][nomPanier]
                    if (syllabes && syllabes.length > 0) {
                        paniersToInsert.push({
                            apprenant_id: apprenantId,
                            texte_id: null,
                            lettre_panier: lettre,
                            nom_panier: nomPanier,
                            syllabes: syllabes
                        })
                    }
                })
            })

            if (paniersToInsert.length > 0) {
                const { error: insertPaniersError } = await supabase
                    .from('paniers_syllabes')
                    .insert(paniersToInsert)

                if (insertPaniersError) {
                    console.error('Erreur sauvegarde paniers:', insertPaniersError)
                } else {
                    console.log(`✅ ${paniersToInsert.length} paniers sauvegardés`)
                }
            }
        }

        console.log(`✅ Session sauvegardée avec succès`)

        res.status(200).json({
            success: true,
            message: 'Session et paniers sauvegardés',
            position: {
                motIndex: motActuelIndex,
                syllabeIndex: syllabeActuelleIndex
            }
        })

    } catch (error) {
        console.error('Erreur sauvegarde session:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}