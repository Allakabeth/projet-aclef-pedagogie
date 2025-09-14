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

        const { 
            signalement_id, 
            mot, 
            segmentation_utilisateur, 
            segmentation_systeme 
        } = req.body

        if (!signalement_id || !mot) {
            return res.status(400).json({ error: 'ID de signalement et mot requis' })
        }

        const adminUser = decoded.identifiant || decoded.email || 'admin'
        console.log(`Acceptation des deux segmentations pour "${mot}" par ${adminUser}`)
        console.log(`Utilisateur: ${Array.isArray(segmentation_utilisateur) ? segmentation_utilisateur.join('-') : segmentation_utilisateur}`)
        console.log(`Système: ${Array.isArray(segmentation_systeme) ? segmentation_systeme.join('-') : segmentation_systeme}`)

        // Marquer le signalement comme traité avec commentaire explicatif
        const commentaire = `Les deux segmentations sont acceptées comme valides:
- Utilisateur: ${Array.isArray(segmentation_utilisateur) ? segmentation_utilisateur.join(' - ') : segmentation_utilisateur}
- Système: ${Array.isArray(segmentation_systeme) ? segmentation_systeme.join(' - ') : segmentation_systeme}
Décision: Les deux versions sont correctes pour l'apprentissage.`

        const { data: updateData, error: signalementError } = await supabase
            .from('signalements_syllabification')
            .update({
                traite: true,
                commentaire_admin: commentaire,
                updated_at: new Date().toISOString(),
                date_modification: new Date().toISOString()
            })
            .eq('id', signalement_id)
            .select()

        if (signalementError) {
            console.error('❌ Erreur acceptation les deux:', signalementError)
            return res.status(500).json({ error: 'Erreur lors de l\'acceptation' })
        }

        if (!updateData || updateData.length === 0) {
            console.warn(`⚠️ Aucun signalement trouvé avec l'ID ${signalement_id}`)
            return res.status(404).json({ error: 'Signalement non trouvé' })
        }

        // Optionnel: Enregistrer dans une table de "segmentations alternatives acceptées" 
        // pour référence future (pas obligatoire pour le fonctionnement)
        try {
            const { error: alternativeError } = await supabase
                .from('segmentations_alternatives')
                .insert({
                    mot: mot.toLowerCase(),
                    segmentation_principale: segmentation_systeme,
                    segmentation_alternative: segmentation_utilisateur,
                    statut: 'acceptees_toutes_deux',
                    admin_validateur: adminUser,
                    signalement_origine_id: signalement_id,
                    date_validation: new Date().toISOString(),
                    commentaire: 'Les deux segmentations sont pédagogiquement valides'
                })
                .select()

            if (alternativeError && alternativeError.code !== '42P01') {
                // Ignorer si la table n'existe pas (code 42P01)
                console.warn('Table segmentations_alternatives non disponible:', alternativeError.message)
            }
        } catch (error) {
            console.warn('Impossible de sauver dans segmentations_alternatives:', error.message)
            // Ne pas faire échouer la requête pour autant
        }

        console.log(`✅ Signalement ${signalement_id} résolu: les deux segmentations sont acceptées`)

        // Remettre le mot dans "Mots à traiter" pour l'apprenant concerné
        console.log(`🔄 Remise du mot "${mot}" dans "Mots à traiter"...`)
        
        // Récupérer l'utilisateur du signalement traité
        const signalementTraite = updateData[0]
        const utilisateur = signalementTraite.utilisateur
        console.log(`👤 Utilisateur du signalement: ${utilisateur}`)
        
        const match = utilisateur.match(/\(([^)]+)\)/)
        if (match) {
            const apprenantId = match[1]
            console.log(`🎯 ID apprenant extrait: ${apprenantId}`)
            
            try {
                // Récupérer les paniers actuels de l'apprenant
                const { data: paniersData, error: paniersError } = await supabase
                    .from('paniers_syllabes')
                    .select('*')
                    .eq('apprenant_id', apprenantId)
                
                if (paniersError) {
                    console.error('Erreur récupération paniers:', paniersError)
                } else {
                    // Chercher le mot dans "À resegmenter" et le retirer
                    const motTrouve = paniersData?.find(p => 
                        p.lettre_panier === '®' && 
                        p.nom_panier === 'RESEGMENTATION' &&
                        p.syllabes?.includes(mot)
                    )
                    
                    if (motTrouve) {
                        console.log(`✅ Mot "${mot}" trouvé dans "À resegmenter"`)
                        
                        // Retirer le mot de "À resegmenter"
                        const nouveauxMots = motTrouve.syllabes.filter(m => m !== mot)
                        
                        if (nouveauxMots.length === 0) {
                            // Supprimer l'enregistrement s'il n'y a plus de mots
                            await supabase
                                .from('paniers_syllabes')
                                .delete()
                                .eq('id', motTrouve.id)
                        } else {
                            // Mettre à jour avec la nouvelle liste
                            await supabase
                                .from('paniers_syllabes')
                                .update({ syllabes: nouveauxMots })
                                .eq('id', motTrouve.id)
                        }
                        
                        console.log(`🔄 Mot "${mot}" retiré de "À resegmenter" pour l'apprenant ${apprenantId}`)
                        console.log(`💡 L'apprenant pourra maintenant retraiter ce mot`)
                    } else {
                        console.log(`ℹ️ Mot "${mot}" non trouvé dans "À resegmenter" (peut-être déjà traité)`)
                    }
                }
            } catch (panierError) {
                console.error('Erreur manipulation paniers:', panierError)
            }
        } else {
            console.warn(`⚠️ Impossible d'extraire l'ID apprenant de: ${utilisateur}`)
        }

        res.status(200).json({
            success: true,
            message: 'Les deux segmentations ont été acceptées comme valides',
            signalement: updateData[0],
            decision: 'acceptees_toutes_deux'
        })

    } catch (error) {
        console.error('Erreur acceptation les deux:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}