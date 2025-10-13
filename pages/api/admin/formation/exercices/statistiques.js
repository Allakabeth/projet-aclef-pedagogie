import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    // Vérifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' })
    }

    try {
        // Récupérer toutes les assignations
        const { data: assignations, error } = await supabase
            .from('formation_exercices_assignations')
            .select('*')

        if (error) throw error

        // Calculer les statistiques
        const total = assignations.length
        const aFaire = assignations.filter(a => a.statut === 'a_faire').length
        const enCours = assignations.filter(a => a.statut === 'en_cours').length
        const termine = assignations.filter(a => a.statut === 'termine').length

        // Calculer le score moyen (seulement pour les exercices terminés)
        const assignationsTerminees = assignations.filter(a => a.statut === 'termine' && a.score !== null)
        const moyenneScore = assignationsTerminees.length > 0
            ? Math.round(assignationsTerminees.reduce((sum, a) => sum + parseFloat(a.score), 0) / assignationsTerminees.length)
            : null

        // Taux de complétion
        const tauxCompletion = total > 0
            ? Math.round((termine / total) * 100)
            : null

        return res.status(200).json({
            total_assignations: total,
            a_faire: aFaire,
            en_cours: enCours,
            termine: termine,
            moyenne_score: moyenneScore,
            taux_completion: tauxCompletion
        })
    } catch (error) {
        console.error('Erreur API statistiques:', error)
        return res.status(500).json({ error: error.message })
    }
}
