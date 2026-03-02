import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
    // Verifier authentification admin
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
        return res.status(401).json({ error: 'Non authentifie' })
    }

    try {
        if (req.method === 'GET') {
            const year = new Date().getFullYear()
            const prefix = `ACA-${year}-`

            // Recuperer le dernier numero de l'annee en cours
            const { data, error } = await supabase
                .from('formation_attestations')
                .select('numero')
                .like('numero', `${prefix}%`)
                .order('numero', { ascending: false })
                .limit(1)

            if (error) throw error

            let nextSequence = 1

            if (data && data.length > 0) {
                // Extraire le numero de sequence du dernier numero
                // Format: ACA-2026-001
                const lastNumero = data[0].numero
                const parts = lastNumero.split('-')
                if (parts.length === 3) {
                    const lastSequence = parseInt(parts[2], 10)
                    if (!isNaN(lastSequence)) {
                        nextSequence = lastSequence + 1
                    }
                }
            }

            // Formater avec zero-padding sur 3 chiffres
            const numero = `${prefix}${String(nextSequence).padStart(3, '0')}`

            return res.status(200).json({ numero })
        }

        return res.status(405).json({ error: 'Methode non autorisee' })
    } catch (error) {
        console.error('Erreur API numero attestation:', error)
        return res.status(500).json({ error: error.message })
    }
}
