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

        const { mot, segmentationUtilisateur, segmentationCorrecte, utilisateur } = req.body

        if (!mot || !segmentationUtilisateur || !segmentationCorrecte) {
            return res.status(400).json({ error: 'Données manquantes' })
        }

        console.log(`Signalement reçu de ${utilisateur} pour le mot "${mot}"`)
        console.log(`Segmentation utilisateur: ${segmentationUtilisateur.join('-')}`)
        console.log(`Segmentation système: ${segmentationCorrecte.join('-')}`)

        // Tenter d'insérer le signalement dans la base de données
        let signalementSauve = false
        
        try {
            const { data, error } = await supabase
                .from('signalements_syllabification')
                .insert({
                    mot: mot,
                    segmentation_utilisateur: segmentationUtilisateur,
                    segmentation_systeme: segmentationCorrecte,
                    utilisateur: utilisateur,
                    date_signalement: new Date().toISOString(),
                    traite: false
                })
                .select()

            if (error) {
                console.error('Erreur insertion signalement:', error)
                
                // Si la table n'existe pas, log le signalement et continuer
                if (error.code === '42P01') {
                    console.warn('⚠️  Table signalements_syllabification inexistante - signalement loggé')
                    console.log(`📝 SIGNALEMENT REÇU:`)
                    console.log(`   Mot: "${mot}"`)
                    console.log(`   Utilisateur: ${segmentationUtilisateur.join('-')}`)
                    console.log(`   Système: ${segmentationCorrecte.join('-')}`)
                    console.log(`   Par: ${utilisateur}`)
                    console.log(`   Date: ${new Date().toISOString()}`)
                    
                    signalementSauve = false // Pas sauvé en BDD mais loggé
                } else {
                    throw error // Autre erreur, la propager
                }
            } else {
                signalementSauve = true
                console.log(`✅ Signalement sauvegardé en BDD pour "${mot}"`)
            }
        } catch (dbError) {
            console.error('Erreur base de données:', dbError)
            // Log le signalement même en cas d'erreur BDD
            console.log(`📝 SIGNALEMENT D'URGENCE (erreur BDD):`)
            console.log(`   Mot: "${mot}"`)
            console.log(`   Utilisateur: ${segmentationUtilisateur.join('-')}`)
            console.log(`   Système: ${segmentationCorrecte.join('-')}`)
            console.log(`   Par: ${utilisateur}`)
            signalementSauve = false
        }

        const message = signalementSauve 
            ? `Signalement sauvé en base de données pour "${mot}"`
            : `Signalement reçu et loggé pour "${mot}" (base de données non configurée)`

        console.log(`✅ ${message}`)

        res.status(200).json({
            success: true,
            message: 'Signalement envoyé avec succès',
            saved_to_db: signalementSauve
        })

    } catch (error) {
        console.error('Erreur traitement signalement:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}