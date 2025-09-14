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

        const { mots, type = 'both' } = req.body

        if (!mots || !Array.isArray(mots)) {
            return res.status(400).json({ error: 'Liste de mots manquante' })
        }

        console.log(`Récupération des corrections pour ${mots.length} mots`)

        const corrections = {
            syllabification: {},
            mono_multi: {},
            stats: { corrections_appliquees: 0, mots_corriges: 0 }
        }

        // Récupérer les corrections de syllabification
        if (type === 'both' || type === 'syllabification') {
            try {
                const { data: correctionsSyllab, error: errorSyllab } = await supabase
                    .from('corrections_syllabification')
                    .select('mot, segmentation_correcte')
                    .in('mot', mots)
                    .eq('statut', 'actif')

                if (!errorSyllab && correctionsSyllab) {
                    correctionsSyllab.forEach(correction => {
                        corrections.syllabification[correction.mot] = correction.segmentation_correcte
                        corrections.stats.corrections_appliquees++
                    })
                    console.log(`✅ ${correctionsSyllab.length} corrections de syllabification trouvées`)
                }
            } catch (error) {
                console.warn('Table corrections_syllabification non disponible:', error.message)
            }
        }

        // Récupérer les corrections mono/multi
        if (type === 'both' || type === 'mono_multi') {
            try {
                const { data: correctionsMonoMulti, error: errorMonoMulti } = await supabase
                    .from('corrections_mono_multi')
                    .select('mot, classification_correcte')
                    .in('mot', mots)

                if (!errorMonoMulti && correctionsMonoMulti) {
                    correctionsMonoMulti.forEach(correction => {
                        corrections.mono_multi[correction.mot] = correction.classification_correcte
                        corrections.stats.corrections_appliquees++
                    })
                    console.log(`✅ ${correctionsMonoMulti.length} corrections mono/multi trouvées`)
                }
            } catch (error) {
                console.warn('Table corrections_mono_multi non disponible:', error.message)
            }
        }

        // Incrémenter les compteurs d'application pour les corrections utilisées
        const motsAvecCorrection = [
            ...Object.keys(corrections.syllabification),
            ...Object.keys(corrections.mono_multi)
        ]
        
        if (motsAvecCorrection.length > 0) {
            corrections.stats.mots_corriges = new Set(motsAvecCorrection).size
            console.log(`📊 ${corrections.stats.mots_corriges} mots uniques avec corrections`)
            
            // Incrémenter les compteurs (sans attendre pour ne pas ralentir la réponse)
            incrementerCompteursCorrections(motsAvecCorrection).catch(error => {
                console.error('Erreur incrémentation compteurs:', error)
            })
        }

        res.status(200).json({
            success: true,
            corrections: corrections.syllabification,
            mono_multi: corrections.mono_multi,
            stats: corrections.stats
        })

    } catch (error) {
        console.error('Erreur récupération corrections:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}

async function incrementerCompteursCorrections(mots) {
    try {
        // Incrémenter compteurs syllabification
        const { error: errorSyllab } = await supabase
            .from('corrections_syllabification')
            .update({ 
                nombre_applications: supabase.raw('nombre_applications + 1'),
                date_modification: new Date().toISOString()
            })
            .in('mot', mots)
            .eq('statut', 'actif')

        if (errorSyllab) {
            console.warn('Erreur incrémentation syllabification:', errorSyllab.message)
        }

        // Incrémenter compteurs mono/multi
        const { error: errorMonoMulti } = await supabase
            .from('corrections_mono_multi')
            .update({ 
                nombre_applications: supabase.raw('nombre_applications + 1'),
                date_modification: new Date().toISOString()
            })
            .in('mot', mots)

        if (errorMonoMulti) {
            console.warn('Erreur incrémentation mono/multi:', errorMonoMulti.message)
        }

    } catch (error) {
        console.error('Erreur incrémentation générale:', error)
    }
}