import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérification authentification
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
        const { mot, raison } = req.body

        if (!mot) {
            return res.status(400).json({ error: 'Mot requis' })
        }

        // Normaliser le mot
        const motNormalized = mot
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        console.log(`📦 Ajout mot son complexe: "${mot}" - apprenant ${apprenantId}`)

        // Insérer ou mettre à jour (upsert)
        const { data, error } = await supabaseAdmin
            .from('mots_sons_complexes')
            .upsert({
                apprenant_id: apprenantId,
                mot: mot.trim(),
                mot_normalise: motNormalized,
                raison: raison || null,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'apprenant_id,mot_normalise'
            })
            .select()
            .single()

        if (error) {
            console.error('❌ Erreur ajout mot complexe:', error)
            return res.status(500).json({
                error: 'Erreur lors de l\'ajout',
                details: error.message
            })
        }

        console.log('✅ Mot ajouté au panier sons complexes:', data.id)

        return res.status(201).json({
            success: true,
            message: 'Mot ajouté au panier sons complexes',
            mot_complexe: data
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
