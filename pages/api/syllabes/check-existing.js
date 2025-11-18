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

    try {
        const { syllabes } = req.body

        if (!Array.isArray(syllabes)) {
            return res.status(400).json({ error: 'syllabes doit être un array' })
        }

        // Normaliser les syllabes
        const syllabesNormalisees = syllabes.map(syl =>
            syl.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )

        console.log(`🔍 Vérification de ${syllabesNormalisees.length} syllabe(s) pour apprenant ${apprenantId}`)

        // Chercher les syllabes existantes
        const { data: existingSyllabes, error } = await supabaseAdmin
            .from('syllabes_enregistrees')
            .select('syllabe, syllabe_affichee, audio_url')
            .eq('apprenant_id', apprenantId)
            .in('syllabe', syllabesNormalisees)

        if (error) {
            console.error('❌ Erreur recherche syllabes:', error)
            return res.status(500).json({ error: 'Erreur recherche', details: error.message })
        }

        // Créer un map pour accès rapide
        const existingMap = {}
        existingSyllabes.forEach(syl => {
            existingMap[syl.syllabe] = {
                syllabe_affichee: syl.syllabe_affichee,
                audio_url: syl.audio_url
            }
        })

        // Construire le résultat
        const result = syllabes.map((sylOriginal, index) => {
            const sylNormalisee = syllabesNormalisees[index]
            const existing = existingMap[sylNormalisee]

            return {
                syllabe: sylOriginal,
                syllabe_normalisee: sylNormalisee,
                exists: !!existing,
                audio_url: existing?.audio_url || null
            }
        })

        const countExisting = result.filter(r => r.exists).length
        console.log(`✅ ${countExisting}/${syllabes.length} syllabe(s) déjà enregistrée(s)`)

        return res.status(200).json({
            success: true,
            syllabes: result,
            stats: {
                total: syllabes.length,
                existing: countExisting,
                toRecord: syllabes.length - countExisting
            }
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({ error: 'Erreur serveur', details: error.message })
    }
}
