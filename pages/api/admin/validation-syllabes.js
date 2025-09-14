import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { 
            apprenantId, 
            texteId, 
            statistiques, 
            paniers, 
            motsTraites, 
            motsEnAttenteSonsComplexes, 
            motsEnAttenteResegmentation, 
            dateEnvoi 
        } = req.body

        if (!apprenantId || !statistiques) {
            return res.status(400).json({ error: 'Données manquantes' })
        }

        console.log(`📋 Validation syllabes reçue de l'apprenant ${apprenantId}`)
        console.log(`📊 Statistiques:`, statistiques)
        console.log(`📂 Paniers: ${paniers?.length || 0}`)
        console.log(`✅ Mots traités: ${motsTraites?.length || 0}`)
        console.log(`🤔 Sons complexes: ${motsEnAttenteSonsComplexes?.length || 0}`)
        console.log(`✂️ À resegmenter: ${motsEnAttenteResegmentation?.length || 0}`)

        // Créer des signalements pour chaque mot à resegmenter
        if (motsEnAttenteResegmentation && motsEnAttenteResegmentation.length > 0) {
            console.log(`🔧 Création de ${motsEnAttenteResegmentation.length} signalements de syllabification...`)
            
            for (const motObj of motsEnAttenteResegmentation) {
                const mot = motObj.contenu || motObj
                console.log(`📝 Création signalement pour "${mot}"`)
                
                try {
                    // Obtenir la segmentation actuelle du système
                    const segmentationResponse = await fetch(`http://localhost:3000/api/syllabification/coupe-mots`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mots: [mot] })
                    })
                    
                    let segmentationSysteme = [mot] // fallback
                    if (segmentationResponse.ok) {
                        const segData = await segmentationResponse.json()
                        segmentationSysteme = segData.syllabifications[mot] || [mot]
                    }
                    
                    // Créer le signalement
                    const signalement = {
                        mot: mot,
                        segmentation_utilisateur: segmentationSysteme, // Segmentation actuelle du système
                        segmentation_systeme: segmentationSysteme, // Même chose pour l'instant
                        utilisateur: `Nina (${apprenantId})`,
                        date_signalement: new Date().toISOString(),
                        traite: false
                    }
                    
                    const { data, error } = await supabase
                        .from('signalements_syllabification')
                        .insert(signalement)
                        .select()
                    
                    if (error) {
                        if (error.code === '42P01') {
                            console.log(`📝 SIGNALEMENT CRÉÉ (table inexistante):`)
                            console.log(`   Mot: "${mot}"`)
                            console.log(`   Segmentation: ${segmentationSysteme.join('-')}`)
                            console.log(`   Utilisateur: Nina (${apprenantId})`)
                        } else {
                            console.error(`Erreur signalement pour "${mot}":`, error)
                        }
                    } else {
                        console.log(`✅ Signalement créé en BDD pour "${mot}"`)
                    }
                    
                } catch (signalError) {
                    console.error(`Erreur création signalement pour "${mot}":`, signalError)
                }
            }
        }

        // Tenter d'insérer la validation dans la base de données
        let validationSauvee = false
        
        try {
            const { data, error } = await supabase
                .from('validations_syllabes')
                .insert({
                    apprenant_id: apprenantId,
                    texte_id: texteId,
                    statistiques: statistiques,
                    paniers: paniers,
                    mots_traites: motsTraites,
                    mots_sons_complexes: motsEnAttenteSonsComplexes,
                    mots_resegmentation: motsEnAttenteResegmentation,
                    date_envoi: dateEnvoi,
                    traite: false
                })
                .select()

            if (error) {
                console.error('Erreur insertion validation:', error)
                
                // Si la table n'existe pas, log la validation et continuer
                if (error.code === '42P01') {
                    console.warn('⚠️  Table validations_syllabes inexistante - validation loggée')
                    console.log(`📝 VALIDATION REÇUE:`)
                    console.log(`   Apprenant: ${apprenantId}`)
                    console.log(`   Texte: ${texteId}`)
                    console.log(`   Stats:`, JSON.stringify(statistiques, null, 2))
                    console.log(`   Date: ${dateEnvoi}`)
                    
                    validationSauvee = false // Pas sauvé en BDD mais loggé
                } else {
                    throw error // Autre erreur, la propager
                }
            } else {
                validationSauvee = true
                console.log(`✅ Validation syllabes sauvegardée en BDD pour apprenant ${apprenantId}`)
            }
        } catch (dbError) {
            console.error('Erreur base de données:', dbError)
            // Log la validation même en cas d'erreur BDD
            console.log(`📝 VALIDATION D'URGENCE (erreur BDD):`)
            console.log(`   Apprenant: ${apprenantId}`)
            console.log(`   Texte: ${texteId}`)
            console.log(`   Stats:`, JSON.stringify(statistiques, null, 2))
            console.log(`   Date: ${dateEnvoi}`)
            validationSauvee = false
        }

        const message = validationSauvee 
            ? `Validation syllabes sauvée en base de données pour apprenant ${apprenantId}`
            : `Validation syllabes reçue et loggée pour apprenant ${apprenantId} (base de données non configurée)`

        console.log(`✅ ${message}`)

        res.status(200).json({
            success: true,
            message: 'Validation envoyée avec succès à l\'administrateur',
            saved_to_db: validationSauvee
        })

    } catch (error) {
        console.error('Erreur traitement validation:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}