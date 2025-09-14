import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification admin
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded || decoded.role !== 'admin') {
            return res.status(401).json({ error: 'Accès non autorisé' })
        }

        const { id: apprenantId } = req.query

        if (!apprenantId) {
            return res.status(400).json({ error: 'ID apprenant manquant' })
        }

        // 1. Récupérer les infos de l'apprenant
        const { data: apprenant, error: apprenantError } = await supabase
            .from('users')
            .select('*')
            .eq('id', apprenantId)
            .single()

        if (apprenantError || !apprenant) {
            return res.status(404).json({ error: 'Apprenant non trouvé' })
        }

        // 2. Récupérer ses textes références
        const { data: textes, error: textesError } = await supabase
            .from('textes_references')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('created_at')

        if (textesError) {
            console.error('Erreur récupération textes:', textesError)
            return res.status(500).json({ error: 'Erreur récupération des textes' })
        }

        // 3. Pour chaque texte, récupérer ses données associées
        const textesAvecDonnees = []
        for (const texte of textes || []) {
            // Récupérer les groupes de sens
            const { data: groupesSens } = await supabase
                .from('groupes_sens')
                .select('*')
                .eq('texte_reference_id', texte.id)
                .order('ordre')

            // Récupérer les mots monosyllabes
            const { data: motsMono } = await supabase
                .from('mots_classifies')
                .select('mot, classification, valide_par_admin, score_utilisateur, created_at')
                .eq('texte_reference_id', texte.id)
                .eq('apprenant_id', apprenantId)
                .eq('classification', 'mono')
                .order('mot')

            // Récupérer les mots multisyllabes
            const { data: motsMulti } = await supabase
                .from('mots_classifies')
                .select('mot, classification, valide_par_admin, score_utilisateur, created_at')
                .eq('texte_reference_id', texte.id)
                .eq('apprenant_id', apprenantId)
                .eq('classification', 'multi')
                .order('mot')

            textesAvecDonnees.push({
                ...texte,
                groupes_sens: groupesSens || [],
                mots_mono: motsMono || [],
                mots_multi: motsMulti || []
            })
        }

        // 4. Récupérer les corrections centralisées qui s'appliquent
        const { data: correctionsCentralisees } = await supabase
            .from('mots_classifies')
            .select('mot, classification, validated_at')
            .eq('valide_par_admin', true)
            .order('mot')

        const result = {
            apprenant: {
                id: apprenant.id,
                identifiant: apprenant.identifiant,
                prenom: apprenant.prenom,
                nom: apprenant.nom,
                email: apprenant.email,
                created_at: apprenant.created_at
            },
            textes: textesAvecDonnees,
            corrections_centralisees: correctionsCentralisees || []
        }

        res.status(200).json(result)

    } catch (error) {
        console.error('Erreur récupération données apprenant:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}