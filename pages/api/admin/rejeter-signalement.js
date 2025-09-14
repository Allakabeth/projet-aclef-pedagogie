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

        const { signalement_id, raison } = req.body

        if (!signalement_id) {
            return res.status(400).json({ error: 'ID de signalement requis' })
        }

        const adminUser = decoded.identifiant || decoded.email || 'admin'
        console.log(`Rejet de signalement ${signalement_id} par ${adminUser}`)

        // Marquer le signalement comme traité avec raison du rejet
        const { data: updateData, error: signalementError } = await supabase
            .from('signalements_syllabification')
            .update({
                traite: true,
                commentaire_admin: raison || 'Signalement rejeté par administrateur',
                updated_at: new Date().toISOString(),
                date_modification: new Date().toISOString()
            })
            .eq('id', signalement_id)
            .select()

        if (signalementError) {
            console.error('❌ Erreur rejet signalement:', signalementError)
            return res.status(500).json({ error: 'Erreur lors du rejet du signalement' })
        }

        if (!updateData || updateData.length === 0) {
            console.warn(`⚠️ Aucun signalement trouvé avec l'ID ${signalement_id}`)
            return res.status(404).json({ error: 'Signalement non trouvé' })
        }

        console.log(`✅ Signalement ${signalement_id} rejeté avec succès`)

        // Même si rejeté, remettre le mot dans "Mots à traiter" pour l'apprenant
        const signalementTraite = updateData[0]
        const mot = signalementTraite.mot
        const utilisateur = signalementTraite.utilisateur
        console.log(`🔄 Remise du mot "${mot}" dans "Mots à traiter" (signalement rejeté)...`)
        
        const match = utilisateur.match(/\(([^)]+)\)/)
        if (match) {
            const apprenantId = match[1]
            console.log(`🎯 ID apprenant extrait: ${apprenantId}`)
            
            try {
                const { data: paniersData, error: paniersError } = await supabase
                    .from('paniers_syllabes')
                    .select('*')
                    .eq('apprenant_id', apprenantId)
                
                if (!paniersError) {
                    const motTrouve = paniersData?.find(p => 
                        p.lettre_panier === '®' && 
                        p.nom_panier === 'RESEGMENTATION' &&
                        p.syllabes?.includes(mot)
                    )
                    
                    if (motTrouve) {
                        const nouveauxMots = motTrouve.syllabes.filter(m => m !== mot)
                        
                        if (nouveauxMots.length === 0) {
                            await supabase.from('paniers_syllabes').delete().eq('id', motTrouve.id)
                        } else {
                            await supabase.from('paniers_syllabes').update({ syllabes: nouveauxMots }).eq('id', motTrouve.id)
                        }
                        
                        console.log(`🔄 Mot "${mot}" retiré de "À resegmenter" (rejeté mais disponible pour retraitement)`)
                    }
                }
            } catch (panierError) {
                console.error('Erreur manipulation paniers:', panierError)
            }
        }

        res.status(200).json({
            success: true,
            message: 'Signalement rejeté avec succès',
            signalement: updateData[0]
        })

    } catch (error) {
        console.error('Erreur rejet signalement:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}