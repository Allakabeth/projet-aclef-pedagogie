import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        console.log('🔧 Application de la migration syllabes_enregistrees...')

        // Vérifier si la table existe déjà
        const { data: tableExists } = await supabaseAdmin
            .from('syllabes_enregistrees')
            .select('id')
            .limit(1)
            .maybeSingle()

        console.log('📋 Table existe déjà:', tableExists !== null)

        // Si la table n'existe pas, on doit la créer manuellement via le SQL editor de Supabase
        // ou en utilisant une autre approche

        // Migrer les données existantes depuis enregistrements_syllabes
        const { data: existingRecords } = await supabaseAdmin
            .from('enregistrements_syllabes')
            .select('apprenant_id, segmentation_personnalisee, audio_urls')
            .not('segmentation_personnalisee', 'is', null)
            .not('audio_urls', 'is', null)

        console.log(`📊 ${existingRecords?.length || 0} enregistrement(s) à migrer`)

        let syllabesToInsert = []
        const syllablesSet = new Map() // Pour éviter doublons

        for (const record of existingRecords || []) {
            const { apprenant_id, segmentation_personnalisee, audio_urls } = record

            for (let i = 0; i < segmentation_personnalisee.length; i++) {
                const syllabe = segmentation_personnalisee[i]
                const audioUrl = audio_urls[i]

                if (!syllabe || !audioUrl) continue

                // Normaliser
                const syllabeNormalisee = syllabe
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')

                const key = `${apprenant_id}:${syllabeNormalisee}`

                // Éviter doublons
                if (!syllablesSet.has(key)) {
                    syllablesSet.set(key, {
                        apprenant_id,
                        syllabe: syllabeNormalisee,
                        syllabe_affichee: syllabe,
                        audio_url: audioUrl
                    })
                }
            }
        }

        syllabesToInsert = Array.from(syllablesSet.values())

        console.log(`📦 ${syllabesToInsert.length} syllabe(s) unique(s) à insérer`)

        // Insérer par batch de 100
        const batchSize = 100
        let inserted = 0

        for (let i = 0; i < syllabesToInsert.length; i += batchSize) {
            const batch = syllabesToInsert.slice(i, i + batchSize)

            const { error: insertError } = await supabaseAdmin
                .from('syllabes_enregistrees')
                .upsert(batch, {
                    onConflict: 'apprenant_id,syllabe',
                    ignoreDuplicates: true
                })

            if (insertError) {
                console.error(`❌ Erreur insertion batch ${i}:`, insertError)
            } else {
                inserted += batch.length
                console.log(`✅ Batch ${i / batchSize + 1} inséré (${batch.length} syllabes)`)
            }
        }

        console.log('✅ Migration terminée')

        return res.status(200).json({
            success: true,
            message: 'Migration appliquée avec succès',
            stats: {
                recordsMigrated: existingRecords?.length || 0,
                uniqueSyllables: syllabesToInsert.length,
                inserted
            }
        })

    } catch (error) {
        console.error('💥 Erreur migration:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
