import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        console.log('📚 Récupération de tous les mots segmentés...')

        // Récupérer tous les paniers de tous les apprenants
        const { data: paniersData, error } = await supabase
            .from('paniers_syllabes')
            .select('apprenant_id, lettre_panier, nom_panier, syllabes')
            .is('texte_id', null) // Pas liés aux textes
            .order('apprenant_id, lettre_panier, nom_panier')

        if (error) {
            console.error('Erreur récupération paniers:', error)
            return res.status(500).json({ error: 'Erreur récupération paniers' })
        }

        // Extraire tous les mots segmentés de 2-4 syllabes
        const motsSegmentes = new Set() // Pour éviter les doublons

        paniersData?.forEach(panier => {
            const { syllabes } = panier

            if (Array.isArray(syllabes)) {
                syllabes.forEach(motData => {
                    if (typeof motData === 'object' && motData.segmentation && motData.mot) {
                        const nbSyllabes = motData.segmentation.length

                        // Garder seulement les mots de 2-4 syllabes
                        if (nbSyllabes >= 2 && nbSyllabes <= 4) {
                            motsSegmentes.add(JSON.stringify({
                                mot: motData.mot.toLowerCase(),
                                segmentation: motData.segmentation.map(s => s.toLowerCase()),
                                longueur: nbSyllabes
                            }))
                        }
                    }
                })
            }
        })

        // Convertir le Set en array d'objets
        const dictionnaireDynamique = Array.from(motsSegmentes).map(motStr => {
            return JSON.parse(motStr)
        })

        // Charger le dictionnaire de 1500 mots pour enrichir le contenu
        const fs = require('fs')
        const path = require('path')

        let motsDictionnaire = []
        try {
            const dictionnaireData = fs.readFileSync(
                path.join(process.cwd(), 'public', 'dictionnaire-syllabes.json'),
                'utf8'
            )
            const dictionnaire = JSON.parse(dictionnaireData)

            // Convertir le format du dictionnaire pour correspondre à notre structure
            motsDictionnaire = dictionnaire.mots.map(motDict => ({
                mot: motDict.mot,
                segmentation: motDict.syllabes,
                longueur: motDict.syllabes.length
            })).filter(mot => mot.longueur >= 2 && mot.longueur <= 4) // Garder 2-4 syllabes

            console.log(`📖 Dictionnaire chargé: ${motsDictionnaire.length} mots`)
        } catch (error) {
            console.error('Erreur chargement dictionnaire:', error)
            motsDictionnaire = []
        }

        // Combiner les mots des apprenants avec le dictionnaire
        const dictionnaireFinal = [...dictionnaireDynamique, ...motsDictionnaire]

        // Dédupliquer par mot
        const motsUniques = new Map()
        dictionnaireFinal.forEach(mot => {
            motsUniques.set(mot.mot.toLowerCase(), mot)
        })

        const resultatFinal = Array.from(motsUniques.values())

        console.log(`✅ ${resultatFinal.length} mots uniques trouvés (${dictionnaireDynamique.length} apprenants + ${motsDictionnaire.length} dictionnaire)`)

        res.status(200).json({
            success: true,
            mots: resultatFinal,
            total: resultatFinal.length
        })

    } catch (error) {
        console.error('Erreur traitement mots segmentés:', error)
        res.status(500).json({
            error: 'Erreur traitement mots segmentés',
            details: error.message
        })
    }
}