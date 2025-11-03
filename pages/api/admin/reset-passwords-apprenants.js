import { supabase } from '../../../lib/supabaseClient'

/**
 * API Admin - Réinitialiser le mot de passe d'UN apprenant
 * Remet le mot de passe initial (Nom de famille) en supprimant password_hash
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // TEMPORAIRE : Pas de vérification admin stricte pour le moment
        // (même approche que apprenants-list.js)

        const { apprenant_id } = req.body

        if (!apprenant_id) {
            return res.status(400).json({ error: 'ID de l\'apprenant manquant' })
        }

        console.log(`🔄 [RESET-PASSWORD] Réinitialisation du mot de passe pour l'apprenant ${apprenant_id}`)

        // Vérifier que l'apprenant existe
        const { data: apprenant, error: fetchError } = await supabase
            .from('users')
            .select('id, prenom, nom, password_hash')
            .eq('id', apprenant_id)
            .eq('role', 'apprenant')
            .single()

        if (fetchError || !apprenant) {
            console.error('❌ [RESET-PASSWORD] Apprenant non trouvé:', fetchError)
            return res.status(404).json({ error: 'Apprenant non trouvé' })
        }

        // Vérifier si le mot de passe est déjà initial
        if (!apprenant.password_hash) {
            return res.status(200).json({
                success: true,
                message: `${apprenant.prenom} ${apprenant.nom} utilise déjà son mot de passe initial`,
                already_reset: true
            })
        }

        // Réinitialiser le mot de passe (mettre password_hash à null)
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: null })
            .eq('id', apprenant_id)

        if (updateError) {
            console.error('❌ [RESET-PASSWORD] Erreur mise à jour:', updateError)
            return res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' })
        }

        console.log(`✅ [RESET-PASSWORD] Mot de passe de ${apprenant.prenom} ${apprenant.nom} réinitialisé avec succès`)

        return res.status(200).json({
            success: true,
            message: `Mot de passe de ${apprenant.prenom} ${apprenant.nom} réinitialisé avec succès`,
            apprenant: {
                prenom: apprenant.prenom,
                nom: apprenant.nom
            }
        })

    } catch (error) {
        console.error('❌ [RESET-PASSWORD] Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
