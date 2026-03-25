import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload || (!payload.apprenant_id && !payload.id)) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    const apprenantId = payload.apprenant_id || payload.id
    const { syllabes } = req.body

    if (!Array.isArray(syllabes) || syllabes.length === 0) {
        return res.status(400).json({ error: 'Array de syllabes requis' })
    }

    try {
        // Normaliser les syllabes pour la recherche (garder les accents : "te" ≠ "té")
        const syllabesNormalisees = syllabes.map(s =>
            s.toLowerCase().trim()
        )

        const { data, error } = await supabaseAdmin
            .from('syllabes_enregistrees')
            .select('syllabe, syllabe_affichee, audio_url')
            .eq('apprenant_id', apprenantId)
            .in('syllabe', syllabesNormalisees)

        if (error) {
            return res.status(500).json({ error: 'Erreur recherche', details: error.message })
        }

        // Créer un map syllabe normalisée → audio_url
        const existingMap = {}
        ;(data || []).forEach(row => {
            existingMap[row.syllabe] = row.audio_url
        })

        return res.status(200).json({ success: true, existing: existingMap })

    } catch (error) {
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
