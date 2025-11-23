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

        const { paniers, selectedTextes } = req.body

        if (!paniers) {
            return res.status(400).json({ error: 'Données paniers manquantes' })
        }

        console.log(`💾 Sauvegarde paniers mots pour apprenant ${apprenantId}`)

        // Supprimer tous les anciens paniers de l'apprenant pour ces textes
        const { error: deleteError } = await supabase
            .from('mots_monosyllabes_classes')
            .delete()
            .eq('apprenant_id', apprenantId)
            .in('texte_id', selectedTextes || [])

        if (deleteError) {
            console.error('Erreur suppression anciens paniers:', deleteError)
        }

        // Préparer les nouvelles données à insérer
        const paniersToInsert = []

        Object.keys(paniers).forEach(lettre => {
            const mots = paniers[lettre]
            if (mots && mots.length > 0) {
                // Créer un enregistrement par lettre et par texte
                selectedTextes?.forEach(texteId => {
                    paniersToInsert.push({
                        apprenant_id: apprenantId,
                        texte_id: texteId,
                        lettre_panier: lettre,
                        mots: mots
                    })
                })
            }
        })

        if (paniersToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('mots_monosyllabes_classes')
                .insert(paniersToInsert)

            if (insertError) {
                console.error('Erreur insertion paniers:', insertError)
                return res.status(500).json({ error: 'Erreur sauvegarde paniers' })
            }

            console.log(`✅ ${paniersToInsert.length} paniers de mots sauvegardés`)
        }

        res.status(200).json({
            success: true,
            message: `${paniersToInsert.length} paniers de mots sauvegardés`
        })

    } catch (error) {
        console.error('Erreur sauvegarde paniers mots:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}
