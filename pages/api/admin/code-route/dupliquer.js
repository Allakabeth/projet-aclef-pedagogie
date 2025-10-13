import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    const { id } = req.body

    if (!id) {
        return res.status(400).json({ error: 'ID du mot manquant' })
    }

    try {
        // Récupérer le mot original
        const { data: original, error: fetchError } = await supabase
            .from('vocabulaire_code_route')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !original) {
            console.error('Erreur récupération mot original:', fetchError)
            return res.status(404).json({ error: 'Mot non trouvé' })
        }

        // Trouver le prochain ordre disponible dans la même catégorie
        const { data: maxOrdre } = await supabase
            .from('vocabulaire_code_route')
            .select('ordre_categorie')
            .eq('categorie', original.categorie)
            .order('ordre_categorie', { ascending: false })
            .limit(1)
            .single()

        const nouvelOrdre = (maxOrdre?.ordre_categorie || 0) + 1

        // Créer la copie avec "(copie)" dans le nom
        const { data: copie, error: insertError } = await supabase
            .from('vocabulaire_code_route')
            .insert([{
                mot: `${original.mot} (copie)`,
                definition_simple: original.definition_simple,
                categorie: original.categorie,
                emoji: original.emoji,
                ordre_categorie: nouvelOrdre
            }])
            .select()
            .single()

        if (insertError) {
            console.error('Erreur création copie:', insertError)
            return res.status(500).json({ error: 'Erreur lors de la duplication' })
        }

        return res.status(201).json({
            success: true,
            vocabulaire: copie,
            message: 'Mot dupliqué avec succès'
        })

    } catch (error) {
        console.error('Erreur duplication vocabulaire:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
