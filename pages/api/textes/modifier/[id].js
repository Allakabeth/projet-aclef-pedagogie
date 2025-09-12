import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken } from '../../../../lib/jwt'
import { analyzeWordsFromGroups } from '../../../../lib/wordAnalyzer'

const normalizeText = (text) => {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier le token
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
    const { id } = req.query
    const { titre, groupes_sens, mots_extraits } = req.body

    if (!titre || !groupes_sens || !Array.isArray(groupes_sens) || groupes_sens.length === 0) {
        return res.status(400).json({ 
            error: 'Titre et groupes de sens requis' 
        })
    }

    try {
        console.log('🔧 Modification du texte ID:', id)

        // 1. Vérifier que le texte appartient à l'apprenant
        const { data: texteExistant, error: checkError } = await supabase
            .from('textes_references')
            .select('id')
            .eq('id', id)
            .eq('apprenant_id', apprenantId)
            .single()

        if (checkError || !texteExistant) {
            return res.status(404).json({ error: 'Texte non trouvé ou non autorisé' })
        }

        // Analyser les mots avec la fonction centralisée
        const wordAnalysis = analyzeWordsFromGroups(groupes_sens)
        
        // 2. Mettre à jour le texte principal
        const { error: updateTexteError } = await supabase
            .from('textes_references')
            .update({
                titre: titre,
                nombre_groupes: groupes_sens.length,
                nombre_mots_total: wordAnalysis.totalUniqueWords,
                nombre_mots_multi_syllabes: wordAnalysis.totalMultisyllabes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateTexteError) {
            console.error('Erreur mise à jour texte:', updateTexteError)
            return res.status(500).json({ error: 'Erreur mise à jour texte' })
        }

        // 3. Supprimer les anciens groupes de sens et données liées
        await supabase.from('groupes_sens').delete().eq('texte_reference_id', id)
        await supabase.from('mots_extraits').delete().eq('texte_reference_id', id)
        await supabase.from('syllabes_mots').delete().eq('texte_reference_id', id)

        // 4. Insérer les nouveaux groupes de sens
        const groupesData = groupes_sens.map(groupe => ({
            texte_reference_id: parseInt(id),
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

        // 5. Insérer les nouveaux mots analysés
        // Insérer les monosyllabes
        for (const motData of wordAnalysis.monosyllabes) {
            const { error: syllabeMoteError } = await supabase
                .from('syllabes_mots')
                .insert({
                    texte_reference_id: parseInt(id),
                    mot_complet: motData.clean,
                    mot_normalise: normalizeText(motData.clean)
                })

            if (syllabeMoteError) {
                console.error('Erreur création syllabe-mot:', syllabeMoteError)
            }
        }

        // Insérer les multisyllabes
        for (const motData of wordAnalysis.multisyllabes) {
            // Utiliser le premier groupe pour simplifier
            const groupeId = groupesCreated[0].id

            const { data: motCreated, error: motError } = await supabase
                .from('mots_extraits')
                .insert({
                    texte_reference_id: parseInt(id),
                    groupe_sens_id: groupeId,
                    mot: motData.clean,
                    mot_normalise: normalizeText(motData.clean),
                    nombre_syllabes: motData.syllables.length,
                    position_dans_groupe: 1
                })
                .select()
                .single()

            if (motError) {
                console.error('Erreur création mot:', motError)
                continue
            }

            // Insérer les syllabes
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
            message: `Texte "${titre}" modifié avec succès`
        })

    } catch (error) {
        console.error('Erreur modification texte:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}