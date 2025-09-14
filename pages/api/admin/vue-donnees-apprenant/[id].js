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
        // TEMPORAIRE : Pas de vérification admin pour le moment
        // const authHeader = req.headers.authorization
        // if (!authHeader?.startsWith('Bearer ')) {
        //     return res.status(401).json({ error: 'Token manquant' })
        // }

        // const token = authHeader.split(' ')[1]
        // const decoded = verifyToken(token)
        // if (!decoded || decoded.role !== 'admin') {
        //     return res.status(401).json({ error: 'Accès non autorisé' })
        // }

        const { id: apprenantId } = req.query

        if (!apprenantId) {
            return res.status(400).json({ error: 'ID apprenant manquant' })
        }

        console.log(`🔍 REQUÊTE SQL DIRECTE pour apprenant ${apprenantId}`)

        // REQUÊTE DIRECTE SUPABASE SANS ABSTRACTIONS SUPPLÉMENTAIRES
        console.log('📡 Requête directe Supabase avec requêtes séparées mais optimisées')
        
        // 1. Apprenant
        const { data: apprenant, error: appErr } = await supabase
            .from('users')
            .select('id, identifiant, prenom, nom, email')
            .eq('id', apprenantId)
            .single()

        if (appErr || !apprenant) {
            console.error('Erreur apprenant:', appErr)
            return res.status(404).json({ error: 'Apprenant non trouvé' })
        }

        // 2. Textes simples (sans description qui n'existe pas)
        const { data: textesData, error: texErr } = await supabase
            .from('textes_references')
            .select('id, titre, created_at')
            .eq('apprenant_id', apprenantId)
            .order('created_at')

        if (texErr) {
            console.error('Erreur textes:', texErr)
            return res.status(500).json({ error: 'Erreur récupération textes' })
        }

        // 3. Groupes de sens pour tous les textes
        const textesIds = textesData?.map(t => t.id) || []
        console.log(`📋 Recherche groupes de sens pour textes:`, textesIds)
        
        const { data: groupesSens, error: grErr } = await supabase
            .from('groupes_sens')
            .select('texte_reference_id, contenu')
            .in('texte_reference_id', textesIds)
            .order('texte_reference_id')
            
        console.log(`📋 Groupes de sens trouvés:`, groupesSens?.length || 0, groupesSens)
        if (grErr) console.error('Erreur groupes de sens:', grErr)

        // 4. Mots classifiés pour tous les textes d'un coup
        const { data: motsClassifies, error: motsErr } = await supabase
            .from('mots_classifies')
            .select('texte_reference_id, mot, classification, valide_par_admin, score_utilisateur')
            .eq('apprenant_id', apprenantId)
            .in('texte_reference_id', textesIds)
            .order('texte_reference_id, classification, mot')

        // 5. Corrections centralisées
        const { data: corrections, error: corrErr } = await supabase
            .from('mots_classifies')
            .select('mot, classification')
            .eq('valide_par_admin', true)
            .order('mot')

        // 6. Organiser par texte
        const groupesByTexte = {}
        groupesSens?.forEach(g => {
            if (!groupesByTexte[g.texte_reference_id]) groupesByTexte[g.texte_reference_id] = []
            groupesByTexte[g.texte_reference_id].push(g)
        })

        const motsByTexte = {}
        motsClassifies?.forEach(mot => {
            if (!motsByTexte[mot.texte_reference_id]) {
                motsByTexte[mot.texte_reference_id] = { mono: [], multi: [] }
            }
            motsByTexte[mot.texte_reference_id][mot.classification].push(mot)
        })

        // 7. Construire la structure finale
        const textesComplets = textesData?.map(texte => ({
            id: texte.id,
            titre: texte.titre,
            created_at: texte.created_at,
            groupes_sens: groupesByTexte[texte.id] || [],
            mots_mono: motsByTexte[texte.id]?.mono || [],
            mots_multi: motsByTexte[texte.id]?.multi || []
        })) || []

        const finalResult = {
            apprenant,
            textes: textesComplets,
            corrections_centralisees: corrections || []
        }

        console.log(`✅ Données récupérées directement:`)
        console.log(`   - Apprenant: ${apprenant.identifiant}`)
        console.log(`   - Textes: ${textesComplets.length}`)
        console.log(`   - Groupes de sens: ${groupesSens?.length || 0}`)
        console.log(`   - Mots classifiés: ${motsClassifies?.length || 0}`)
        console.log(`   - Corrections centralisées: ${corrections?.length || 0}`)

        res.status(200).json(finalResult)

    } catch (error) {
        console.error('Erreur récupération vue données apprenant:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}