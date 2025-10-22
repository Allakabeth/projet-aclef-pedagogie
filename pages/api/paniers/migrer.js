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

        const apprenantId = decoded.id

        console.log(`🔄 Migration des paniers pour apprenant ${apprenantId}`)

        // 1. Récupérer tous les paniers existants avec texte_id NOT NULL
        const { data: anciensPartiers, error: selectError } = await supabase
            .from('paniers_syllabes')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .not('texte_id', 'is', null)

        if (selectError) {
            console.error('Erreur récupération anciens paniers:', selectError)
            return res.status(500).json({ error: 'Erreur récupération' })
        }

        console.log(`📦 ${anciensPartiers?.length || 0} anciens paniers trouvés`)

        if (!anciensPartiers || anciensPartiers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Aucun ancien panier à migrer'
            })
        }

        // 2. Fusionner les paniers par lettre/nom
        const paniersFusionnes = {}
        
        anciensPartiers.forEach(panier => {
            const { lettre_panier, nom_panier, syllabes } = panier
            
            if (!paniersFusionnes[lettre_panier]) {
                paniersFusionnes[lettre_panier] = {}
            }
            
            if (!paniersFusionnes[lettre_panier][nom_panier]) {
                paniersFusionnes[lettre_panier][nom_panier] = []
            }
            
            // Fusionner les syllabes (éviter doublons)
            syllabes.forEach(syllabe => {
                if (!paniersFusionnes[lettre_panier][nom_panier].includes(syllabe)) {
                    paniersFusionnes[lettre_panier][nom_panier].push(syllabe)
                }
            })
        })

        // 3. Créer les nouveaux paniers avec texte_id: null
        const nouveauxPaniers = []
        
        Object.keys(paniersFusionnes).forEach(lettre => {
            Object.keys(paniersFusionnes[lettre]).forEach(nomPanier => {
                const syllabes = paniersFusionnes[lettre][nomPanier]
                if (syllabes && syllabes.length > 0) {
                    nouveauxPaniers.push({
                        apprenant_id: apprenantId,
                        texte_id: null,
                        lettre_panier: lettre,
                        nom_panier: nomPanier,
                        syllabes: syllabes
                    })
                }
            })
        })

        // 4. Insérer les nouveaux paniers
        if (nouveauxPaniers.length > 0) {
            const { error: insertError } = await supabase
                .from('paniers_syllabes')
                .insert(nouveauxPaniers)

            if (insertError) {
                console.error('Erreur insertion nouveaux paniers:', insertError)
                return res.status(500).json({ error: 'Erreur insertion' })
            }

            console.log(`✅ ${nouveauxPaniers.length} nouveaux paniers créés`)
        }

        // 5. Supprimer les anciens paniers
        const { error: deleteError } = await supabase
            .from('paniers_syllabes')
            .delete()
            .eq('apprenant_id', apprenantId)
            .not('texte_id', 'is', null)

        if (deleteError) {
            console.error('Erreur suppression anciens paniers:', deleteError)
            // On continue malgré l'erreur car les nouveaux sont créés
        } else {
            console.log(`🗑️ ${anciensPartiers.length} anciens paniers supprimés`)
        }

        res.status(200).json({
            success: true,
            message: `Migration réussie: ${nouveauxPaniers.length} paniers migrés`,
            details: {
                anciens: anciensPartiers.length,
                nouveaux: nouveauxPaniers.length
            }
        })

    } catch (error) {
        console.error('Erreur migration paniers:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}