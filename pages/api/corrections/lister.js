import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification et les droits admin
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }
        // TEMPORAIRE : vérification admin désactivée pour test
        // if (decoded.role !== 'admin') {
        //     return res.status(403).json({ error: 'Accès refusé - droits admin requis' })
        // }

        const { statut } = req.query

        // Construire la requête avec jointures pour récupérer toutes les infos
        let query = supabase
            .from('corrections_demandees')
            .select(`
                id,
                classification_actuelle,
                correction_proposee,
                raison,
                statut,
                created_at,
                traite_at,
                commentaire_admin,
                mots_classifies!inner(mot),
                demandeur:users!corrections_demandees_demandeur_id_fkey(nom, email),
                traite_par:users!corrections_demandees_traite_by_fkey(nom, email)
            `)
            .order('created_at', { ascending: false })

        // Filtrer par statut si spécifié
        if (statut && statut !== '') {
            query = query.eq('statut', statut)
        }

        const { data: corrections, error } = await query

        if (error) {
            console.error('Erreur récupération corrections:', error)
            return res.status(500).json({ error: 'Erreur lors de la récupération des corrections' })
        }

        // Transformer les données pour les rendre plus lisibles
        const correctionsFormatees = corrections.map(correction => ({
            id: correction.id,
            mot: correction.mots_classifies.mot,
            classification_actuelle: correction.classification_actuelle,
            correction_proposee: correction.correction_proposee,
            raison: correction.raison,
            statut: correction.statut,
            created_at: correction.created_at,
            traite_at: correction.traite_at,
            commentaire_admin: correction.commentaire_admin,
            demandeur_nom: correction.demandeur?.nom || 'Inconnu',
            demandeur_email: correction.demandeur?.email || 'Inconnu',
            traite_par_nom: correction.traite_par?.nom || null
        }))

        res.status(200).json({
            success: true,
            corrections: correctionsFormatees,
            total: correctionsFormatees.length
        })

    } catch (error) {
        console.error('Erreur listage corrections:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}