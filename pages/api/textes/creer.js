import { supabase } from '../../../lib/supabaseClient'
import { verifyToken } from '../../../lib/jwt'
import { analyzeWordsFromGroups } from '../../../lib/wordAnalyzer'

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier le token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    console.log('🔑 Payload du token:', payload)

    if (!payload || (!payload.apprenant_id && !payload.id)) {
        return res.status(401).json({ 
            error: 'Token invalide',
            debug: {
                hasPayload: !!payload,
                hasApprenantId: !!(payload?.apprenant_id),
                hasId: !!(payload?.id),
                payload: payload
            }
        })
    }

    const apprenantId = payload.apprenant_id || payload.id

    const { titre, groupes_sens, mots_extraits } = req.body

    if (!titre || !groupes_sens || !Array.isArray(groupes_sens) || groupes_sens.length === 0) {
        return res.status(400).json({ 
            error: 'Titre et groupes de sens requis' 
        })
    }

    try {
        // Analyser les mots avec la fonction centralisée
        const wordAnalysis = analyzeWordsFromGroups(groupes_sens)
        
        // 1. Créer le texte de référence principal
        const { data: texteRef, error: texteError } = await supabase
            .from('textes_references')
            .insert({
                titre: titre,
                apprenant_id: apprenantId,
                nombre_groupes: groupes_sens.length,
                nombre_mots_total: wordAnalysis.totalUniqueWords,
                nombre_mots_multi_syllabes: wordAnalysis.totalMultisyllabes
            })
            .select()
            .single()

        if (texteError) {
            console.error('Erreur création texte:', texteError)
            return res.status(500).json({ 
                error: `Erreur création texte de référence: ${texteError.message}`,
                details: texteError
            })
        }

        console.log('Texte créé:', texteRef)

        // 2. Insérer les groupes de sens
        const groupesData = groupes_sens.map(groupe => ({
            texte_reference_id: texteRef.id,
            ordre_groupe: groupe.ordre_groupe,
            contenu: groupe.contenu,
            type_groupe: groupe.type_groupe || 'text'
        }))

        const { data: groupesCreated, error: groupesError } = await supabase
            .from('groupes_sens')
            .insert(groupesData)
            .select()

        if (groupesError) {
            console.error('Erreur création groupes:', groupesError)
            return res.status(500).json({ error: 'Erreur création groupes de sens' })
        }

        console.log('Groupes créés:', groupesCreated)

        // 3. Insérer les mots analysés dans les tables appropriées
        // Insérer les monosyllabes
        for (const motData of wordAnalysis.monosyllabes) {
            const { error: syllabeMoteError } = await supabase
                .from('syllabes_mots')
                .insert({
                    texte_reference_id: texteRef.id,
                    mot_complet: motData.clean,
                    mot_normalise: normalizeText(motData.clean)
                })

            if (syllabeMoteError) {
                console.error('Erreur création syllabe-mot:', syllabeMoteError)
            }
        }

        // Insérer les multisyllabes
        for (const motData of wordAnalysis.multisyllabes) {
            // Trouver le groupe correspondant (utilise le premier pour simplifier)
            const groupeId = groupesCreated[0].id

            // Insérer le mot dans mots_extraits
            const { data: motCreated, error: motError } = await supabase
                .from('mots_extraits')
                .insert({
                    texte_reference_id: texteRef.id,
                    groupe_sens_id: groupeId,
                    mot: motData.clean,
                    mot_normalise: normalizeText(motData.clean),
                    nombre_syllabes: motData.syllables.length,
                    position_dans_groupe: 1 // À améliorer
                })
                .select()
                .single()

            if (motError) {
                console.error('Erreur création mot:', motError)
                continue
            }

            // Insérer les syllabes dans la table syllabes
            const syllabesToInsert = motData.syllables.map((syllabe, index) => ({
                mot_extrait_id: motCreated.id,
                syllabe: syllabe,
                position_syllabe: index + 1
            }))

            const { error: syllabesError } = await supabase
                .from('syllabes')
                .insert(syllabesToInsert)

            if (syllabesError) {
                console.error('Erreur création syllabes:', syllabesError)
            }
        }

        return res.status(200).json({
            success: true,
            texte_id: texteRef.id,
            message: `Texte "${titre}" créé avec succès`
        })

    } catch (error) {
        console.error('Erreur création texte de référence:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}