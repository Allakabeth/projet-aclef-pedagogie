import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
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

        console.log(`📂 Chargement paniers pour apprenant ${apprenantId}`)

        // Récupérer tous les paniers de l'apprenant (pas liés aux textes)
        const { data: paniersData, error } = await supabase
            .from('paniers_syllabes')
            .select('lettre_panier, nom_panier, syllabes')
            .eq('apprenant_id', apprenantId)
            .is('texte_id', null)
            .order('lettre_panier, nom_panier')

        if (error) {
            console.error('Erreur chargement paniers:', error)
            return res.status(500).json({ error: 'Erreur chargement paniers' })
        }

        // Fonction pour décoder les lettres spéciales
        const decoderLettre = (lettreEncodee) => {
            if (lettreEncodee === '§') return 'SONS_COMPLEXES'
            if (lettreEncodee === '®') return 'RESEGMENTATION'
            if (lettreEncodee === '*') return 'AUTRES'
            return lettreEncodee
        }

        // Reconstruire la structure des paniers et extraire les mots traités
        const paniers = {}
        let motsTraites = []

        paniersData?.forEach(panier => {
            const { lettre_panier, nom_panier, syllabes } = panier
            
            // Traitement spécial pour les mots traités
            if (lettre_panier === 'T' && nom_panier === 'MOTS_TRAITES') {
                motsTraites = syllabes || []
                console.log(`📖 ${motsTraites.length} mots traités chargés:`, motsTraites)
                return
            }
            
            const lettreDecodee = decoderLettre(lettre_panier)

            if (!paniers[lettreDecodee]) {
                paniers[lettreDecodee] = {}
            }

            if (!paniers[lettreDecodee][nom_panier]) {
                paniers[lettreDecodee][nom_panier] = []
            }

            // Fusionner les syllabes (éviter les doublons)
            syllabes.forEach(syllabe => {
                if (!paniers[lettreDecodee][nom_panier].includes(syllabe)) {
                    paniers[lettreDecodee][nom_panier].push(syllabe)
                }
            })
        })

        console.log(`✅ ${paniersData?.length || 0} enregistrements de paniers chargés`)

        res.status(200).json({
            success: true,
            paniers: paniers,
            motsTraites: motsTraites
        })

    } catch (error) {
        console.error('Erreur chargement paniers:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}