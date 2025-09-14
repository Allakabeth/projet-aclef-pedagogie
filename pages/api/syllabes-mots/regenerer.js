import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '../../../lib/jwt'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Fonction pour compter les syllabes (copiée du système de création)
const countSyllables = (word) => {
    if (!word || word.length === 0) return 0
    
    word = word.toLowerCase()
    let syllables = 0
    let previousWasVowel = false
    
    for (let i = 0; i < word.length; i++) {
        const char = word[i]
        const isVowel = 'aeiouy'.includes(char)
        
        if (isVowel && !previousWasVowel) {
            syllables++
        }
        
        previousWasVowel = isVowel
    }
    
    // Règle du 'e' muet en français
    if (word.endsWith('e') && syllables > 1) {
        syllables--
    }
    
    return Math.max(1, syllables)
}

const normalizeText = (text) => {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '')
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide' })
        }

        const { texteIds } = req.body // Optionnel: spécifier des textes, sinon tous

        // 1. Récupérer tous les textes (ou ceux spécifiés)
        let query = supabase
            .from('textes_references')
            .select('id, titre')
            .eq('apprenant_id', decoded.id)

        if (texteIds && texteIds.length > 0) {
            query = query.in('id', texteIds)
        }

        const { data: textes, error: textesError } = await query

        if (textesError) {
            return res.status(500).json({ error: 'Erreur récupération textes' })
        }

        let totalGeneres = 0
        let totalSupprimes = 0
        const resultats = []

        // 2. Pour chaque texte
        for (const texte of textes) {
            console.log(`Traitement du texte: ${texte.titre}`)
            
            // Supprimer les anciens monosyllabes de ce texte
            const { error: deleteError } = await supabase
                .from('syllabes_mots')
                .delete()
                .eq('texte_reference_id', texte.id)

            if (deleteError) {
                console.error(`Erreur suppression pour texte ${texte.id}:`, deleteError)
                continue
            }

            // Récupérer les groupes de sens de ce texte
            const { data: groupes, error: groupesError } = await supabase
                .from('groupes_sens')
                .select('contenu')
                .eq('texte_reference_id', texte.id)
                .eq('type_groupe', 'text')

            if (groupesError) {
                console.error(`Erreur groupes pour texte ${texte.id}:`, groupesError)
                continue
            }

            // Extraire et analyser tous les mots
            const tousMots = groupes
                .map(g => g.contenu)
                .join(' ')
                .split(/\s+/)
                .map(mot => mot.replace(/[^\w\u00C0-\u017F]/g, ''))
                .filter(mot => mot.length > 0)

            // Identifier les monosyllabes
            const monosyllabes = []
            const motsVus = new Set()

            for (const mot of tousMots) {
                const motClean = mot.trim()
                if (motClean && !motsVus.has(motClean.toLowerCase())) {
                    motsVus.add(motClean.toLowerCase())
                    
                    if (countSyllables(motClean) === 1) {
                        monosyllabes.push({
                            texte_reference_id: texte.id,
                            mot_complet: motClean,
                            mot_normalise: normalizeText(motClean)
                        })
                    }
                }
            }

            // Insérer les nouveaux monosyllabes
            if (monosyllabes.length > 0) {
                const { error: insertError } = await supabase
                    .from('syllabes_mots')
                    .insert(monosyllabes)

                if (insertError) {
                    console.error(`Erreur insertion pour texte ${texte.id}:`, insertError)
                } else {
                    totalGeneres += monosyllabes.length
                }
            }

            resultats.push({
                texte_id: texte.id,
                titre: texte.titre,
                monosyllabes_generes: monosyllabes.length,
                mots_examines: motsVus.size
            })
        }

        res.status(200).json({
            success: true,
            message: `Régénération terminée pour ${textes.length} texte(s)`,
            total_monosyllabes_generes: totalGeneres,
            resultats: resultats
        })

    } catch (error) {
        console.error('Erreur régénération syllabes-mots:', error)
        res.status(500).json({ error: 'Erreur serveur' })
    }
}