import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken } from '../../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier le token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    console.log('🔑 Suppression - Payload du token:', payload)

    if (!payload || (!payload.apprenant_id && !payload.id)) {
        return res.status(401).json({ 
            error: 'Token invalide',
            debug: {
                hasPayload: !!payload,
                hasApprenantId: !!(payload?.apprenant_id),
                hasId: !!(payload?.id)
            }
        })
    }

    const apprenantId = payload.apprenant_id || payload.id
    const { id: texteId } = req.query

    if (!texteId) {
        return res.status(400).json({ error: 'ID du texte requis' })
    }

    console.log(`🗑️ Tentative suppression texte ${texteId} pour apprenant ${apprenantId}`)

    try {
        // Démarrer une transaction (ou au moins essayer de supprimer dans le bon ordre)
        // Vérifier d'abord que le texte appartient bien à l'utilisateur
        const { data: texte, error: fetchError } = await supabase
            .from('textes_references')
            .select('id, titre, apprenant_id')
            .eq('id', texteId)
            .eq('apprenant_id', apprenantId)
            .single()

        if (fetchError) {
            console.error('❌ Erreur récupération texte:', fetchError)
            return res.status(404).json({ 
                error: 'Texte non trouvé ou non autorisé',
                details: fetchError.message 
            })
        }

        if (!texte) {
            return res.status(404).json({ error: 'Texte non trouvé ou vous n\'êtes pas autorisé à le supprimer' })
        }

        console.log(`📝 Texte trouvé: "${texte.titre}"`)

        // Supprimer d'abord les groupes de sens associés
        const { error: deleteGroupesError } = await supabase
            .from('groupes_sens')
            .delete()
            .eq('texte_reference_id', texteId)

        if (deleteGroupesError) {
            console.error('❌ Erreur suppression groupes de sens:', deleteGroupesError)
            return res.status(500).json({ 
                error: 'Erreur lors de la suppression des groupes de sens',
                details: deleteGroupesError.message,
                debug: {
                    texteId,
                    table: 'groupes_sens',
                    column: 'texte_reference_id'
                }
            })
        }

        console.log('✅ Groupes de sens supprimés')

        // Supprimer les syllabes-mots associés
        const { error: deleteSyllabesMotsError } = await supabase
            .from('syllabes_mots')
            .delete()
            .eq('texte_reference_id', texteId)

        if (deleteSyllabesMotsError) {
            console.error('❌ Erreur suppression syllabes-mots:', deleteSyllabesMotsError)
            // On continue même si ça échoue car ce n'est pas critique
        } else {
            console.log('✅ Syllabes-mots supprimées')
        }

        // Supprimer ensuite les mots extraits associés
        const { error: deleteMotsError } = await supabase
            .from('mots_extraits')
            .delete()
            .eq('texte_reference_id', texteId)

        if (deleteMotsError) {
            console.error('❌ Erreur suppression mots extraits:', deleteMotsError)
            // On continue même si ça échoue car ce n'est pas critique
            console.log('⚠️ Continuons malgré l\'erreur mots extraits')
        } else {
            console.log('✅ Mots extraits supprimés')
        }

        // Enfin, supprimer le texte de référence
        const { error: deleteTexteError } = await supabase
            .from('textes_references')
            .delete()
            .eq('id', texteId)
            .eq('apprenant_id', apprenantId)

        if (deleteTexteError) {
            console.error('❌ Erreur suppression texte:', deleteTexteError)
            return res.status(500).json({ 
                error: 'Erreur lors de la suppression du texte',
                details: deleteTexteError.message 
            })
        }

        console.log(`🗑️✅ Texte "${texte.titre}" supprimé avec succès`)

        return res.status(200).json({
            success: true,
            message: `Texte "${texte.titre}" supprimé avec succès`
        })

    } catch (error) {
        console.error('💥 Erreur inattendue suppression:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la suppression',
            details: error.message 
        })
    }
}