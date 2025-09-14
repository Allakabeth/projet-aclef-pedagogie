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
            mot, 
            type_correction, // 'syllabification' ou 'mono_multi'
            correction_syllabification, // Array pour syllabification
            correction_mono_multi, // String pour mono_multi
            signalement_id,
            commentaire
        } = req.body

        if (!mot || !type_correction) {
            return res.status(400).json({ error: 'Mot et type de correction requis' })
        }

        const adminUser = decoded.identifiant || decoded.email || 'admin'
        console.log(`Application de correction par ${adminUser}: "${mot}" (${type_correction})`)
        console.log(`Signalement ID reçu: ${signalement_id}`)

        let result = null

        if (type_correction === 'syllabification') {
            if (!correction_syllabification || !Array.isArray(correction_syllabification)) {
                return res.status(400).json({ error: 'Correction de syllabification invalide' })
            }

            // Insérer ou mettre à jour la correction de syllabification
            const { data, error } = await supabase
                .from('corrections_syllabification')
                .upsert({
                    mot: mot.toLowerCase(),
                    segmentation_correcte: correction_syllabification,
                    source: 'admin',
                    admin_correcteur: adminUser,
                    signalement_origine_id: signalement_id,
                    commentaire: commentaire || `Correction appliquée depuis l'interface admin`,
                    statut: 'actif',
                    date_modification: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mot',
                    ignoreDuplicates: false
                })
                .select()

            if (error) {
                console.error('Erreur insertion correction syllabification:', error)
                return res.status(500).json({ error: 'Erreur sauvegarde correction' })
            }

            result = data[0]
            console.log(`✅ Correction syllabification sauvée: "${mot}" → [${correction_syllabification.join(' | ')}]`)

        } else if (type_correction === 'mono_multi') {
            if (!correction_mono_multi || !['monosyllabe', 'multisyllabe'].includes(correction_mono_multi)) {
                return res.status(400).json({ error: 'Correction mono/multi invalide' })
            }

            // Insérer ou mettre à jour la correction mono/multi
            const { data, error } = await supabase
                .from('corrections_mono_multi')
                .upsert({
                    mot: mot.toLowerCase(),
                    classification_correcte: correction_mono_multi,
                    source: 'admin',
                    admin_correcteur: adminUser,
                    commentaire: commentaire || `Correction appliquée depuis l'interface admin`,
                    date_modification: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mot',
                    ignoreDuplicates: false
                })
                .select()

            if (error) {
                console.error('Erreur insertion correction mono/multi:', error)
                return res.status(500).json({ error: 'Erreur sauvegarde correction' })
            }

            result = data[0]
            console.log(`✅ Correction mono/multi sauvée: "${mot}" → ${correction_mono_multi}`)
        } else {
            return res.status(400).json({ error: 'Type de correction inconnu' })
        }

        // Marquer le signalement comme traité si fourni
        if (signalement_id) {
            console.log(`🔍 Tentative marquage signalement ${signalement_id} comme traité`)
            
            const { data: updateData, error: signalementError } = await supabase
                .from('signalements_syllabification')
                .update({
                    traite: true,
                    commentaire_admin: `Correction appliquée: ${type_correction === 'syllabification' 
                        ? correction_syllabification.join(' - ') 
                        : correction_mono_multi}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', signalement_id)
                .select()

            if (signalementError) {
                console.error('❌ Erreur mise à jour signalement:', signalementError)
                // Ne pas faire échouer la requête pour autant
            } else if (updateData && updateData.length > 0) {
                console.log(`✅ Signalement ${signalement_id} marqué comme traité avec succès`)
                console.log('Données mises à jour:', updateData[0])
            } else {
                console.warn(`⚠️ Aucun signalement trouvé avec l'ID ${signalement_id}`)
            }
        } else {
            console.warn('⚠️ Aucun signalement_id fourni pour marquer comme traité')
        }

        // Remettre le mot dans "Mots à traiter" pour tous les apprenants concernés
        if (signalement_id) {
            console.log(`🔄 Remise du mot "${mot}" dans "Mots à traiter"...`)
            
            // Récupérer le signalement pour obtenir l'utilisateur
            const { data: signalementData, error: getSignalementError } = await supabase
                .from('signalements_syllabification')
                .select('utilisateur')
                .eq('id', signalement_id)
                .single()
            
            if (getSignalementError) {
                console.error('Erreur récupération signalement:', getSignalementError)
            } else if (signalementData) {
                // Extraire l'ID apprenant du champ utilisateur (format: "Nina (ef45f2ec-77e5-4df6-b73b-221fa56deb50)")
                const utilisateur = signalementData.utilisateur
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
                            // Chercher le mot dans "À resegmenter" et le déplacer
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
                                console.log(`💡 L'apprenant pourra maintenant retraiter ce mot avec la nouvelle segmentation`)
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
            }
        }

        res.status(200).json({
            success: true,
            message: `Correction ${type_correction} appliquée avec succès`,
            correction: result,
            mot: mot,
            type: type_correction
        })

    } catch (error) {
        console.error('Erreur application correction:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}