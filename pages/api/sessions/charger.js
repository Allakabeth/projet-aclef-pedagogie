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
        // TEMPORAIRE : Pas d'auth, utiliser Nina comme test
        const apprenantId = 'ef45f2ec-77e5-4df6-b73b-221fa56deb50' // ID de Nina

        console.log(`📂 Chargement session pour apprenant ${apprenantId}`)

        // Récupérer la dernière session
        const { data: sessionData, error } = await supabase
            .from('sessions_syllabes')
            .select('*')
            .eq('apprenant_id', apprenantId)
            .order('date_sauvegarde', { ascending: false })
            .limit(1)

        if (error) {
            console.error('Erreur chargement session:', error)
            return res.status(500).json({ error: 'Erreur chargement session' })
        }

        if (!sessionData || sessionData.length === 0) {
            return res.status(200).json({
                success: true,
                hasSession: false,
                message: 'Aucune session sauvegardée'
            })
        }

        const session = sessionData[0]
        
        console.log(`✅ Session trouvée du ${new Date(session.date_sauvegarde).toLocaleString()}`)
        console.log(`📍 Position: mot ${session.mot_actuel_index}, syllabe ${session.syllabe_actuelle_index}`)

        res.status(200).json({
            success: true,
            hasSession: true,
            session: {
                textesIds: session.textes_ids,
                motActuelIndex: session.mot_actuel_index,
                syllabeActuelleIndex: session.syllabe_actuelle_index,
                motsTraites: session.mots_traites || [],
                dateSauvegarde: session.date_sauvegarde
            }
        })

    } catch (error) {
        console.error('Erreur chargement session:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}