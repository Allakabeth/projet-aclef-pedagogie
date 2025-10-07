import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { vocabulaire_id, apprenant_id, ma_definition, mon_exemple, audio_url } = req.body

        // Validation
        if (!vocabulaire_id || !apprenant_id) {
            return res.status(400).json({ error: 'Données manquantes' })
        }

        // Vérifier si une définition existe déjà
        const { data: existing, error: checkError } = await supabase
            .from('definitions_personnalisees_code_route')
            .select('id')
            .eq('vocabulaire_id', vocabulaire_id)
            .eq('apprenant_id', apprenant_id)
            .single()

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = no rows found (c'est OK)
            console.error('Erreur vérification définition:', checkError)
            return res.status(500).json({ error: 'Erreur lors de la vérification' })
        }

        let result

        if (existing) {
            // Mettre à jour la définition existante
            const { data, error } = await supabase
                .from('definitions_personnalisees_code_route')
                .update({
                    ma_definition,
                    mon_exemple,
                    audio_url,
                    date_modification: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Erreur mise à jour définition:', error)
                return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
            }

            result = data
        } else {
            // Créer une nouvelle définition
            const { data, error } = await supabase
                .from('definitions_personnalisees_code_route')
                .insert({
                    vocabulaire_id,
                    apprenant_id,
                    ma_definition,
                    mon_exemple,
                    audio_url
                })
                .select()
                .single()

            if (error) {
                console.error('Erreur création définition:', error)
                return res.status(500).json({ error: 'Erreur lors de la création' })
            }

            result = data
        }

        // Mettre à jour la progression
        const { error: progressError } = await supabase
            .from('progression_vocabulaire_code_route')
            .upsert({
                apprenant_id,
                vocabulaire_id,
                statut: 'en_cours',
                nombre_revisions: 1,
                derniere_revision: new Date().toISOString()
            }, {
                onConflict: 'apprenant_id,vocabulaire_id'
            })

        if (progressError) {
            console.error('Erreur mise à jour progression:', progressError)
            // Continue quand même, c'est pas critique
        }

        return res.status(200).json({
            success: true,
            definition: result,
            message: existing ? 'Définition mise à jour' : 'Définition créée'
        })

    } catch (error) {
        console.error('Erreur API sauvegarder-definition:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
