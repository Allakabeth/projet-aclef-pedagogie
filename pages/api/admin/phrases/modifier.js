import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// ====================================================================
// API ADMIN: MODIFIER UNE PHRASE PRÉ-GÉNÉRÉE
// ====================================================================

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        const { id, phrase, mots } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Paramètre id manquant' })
        }

        if (!phrase || !phrase.trim()) {
            return res.status(400).json({ error: 'La phrase ne peut pas être vide' })
        }

        if (!mots || !Array.isArray(mots) || mots.length === 0) {
            return res.status(400).json({ error: 'Les mots doivent être un tableau non vide' })
        }

        // Nettoyer les mots (enlever les vides)
        const motsNettoyes = mots.filter(m => m && m.trim()).map(m => m.trim().toLowerCase())

        if (motsNettoyes.length < 3 || motsNettoyes.length > 7) {
            return res.status(400).json({ error: 'La phrase doit contenir entre 3 et 7 mots' })
        }

        // Mettre à jour la phrase
        const { data, error } = await supabaseAdmin
            .from('phrases_pregenerees')
            .update({
                phrase: phrase.trim(),
                mots: motsNettoyes,
                longueur_mots: motsNettoyes.length
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Erreur modification phrase:', error)
            return res.status(500).json({ error: 'Erreur lors de la modification' })
        }

        return res.status(200).json({
            success: true,
            phrase: data
        })

    } catch (error) {
        console.error('Erreur serveur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
