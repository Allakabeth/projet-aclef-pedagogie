import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
    api: {
        bodyParser: false,
    },
}

/**
 * Fonction pour sauvegarder chaque syllabe unique dans syllabes_enregistrees
 * Permet la réutilisation des syllabes déjà enregistrées
 */
async function sauvegarderSyllabesUniques(apprenantId, segmentation, audioUrls, actions) {
    try {
        const syllabesToSave = []

        for (let i = 0; i < segmentation.length; i++) {
            const syllabe = segmentation[i]
            const audioUrl = audioUrls[i]
            const action = actions[i]

            // Ignorer les syllabes jetées (pas d'audio)
            if (action === 'jeter' || !audioUrl) {
                continue
            }

            // Normaliser la syllabe
            const syllabeNormalisee = syllabe
                .toLowerCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')

            syllabesToSave.push({
                apprenant_id: apprenantId,
                syllabe: syllabeNormalisee,
                syllabe_affichee: syllabe,
                audio_url: audioUrl
            })
        }

        if (syllabesToSave.length === 0) {
            console.log('⏭️ Aucune syllabe à sauvegarder (toutes jetées)')
            return
        }

        console.log(`💾 Sauvegarde de ${syllabesToSave.length} syllabe(s) unique(s)...`)

        // Upsert (insert ou update si existe déjà)
        const { data, error } = await supabaseAdmin
            .from('syllabes_enregistrees')
            .upsert(syllabesToSave, {
                onConflict: 'apprenant_id,syllabe'
            })

        if (error) {
            console.error('⚠️ Erreur sauvegarde syllabes uniques:', error)
            // Ne pas bloquer le processus principal
        } else {
            console.log(`✅ ${syllabesToSave.length} syllabe(s) unique(s) sauvegardée(s)`)
        }

    } catch (error) {
        console.error('⚠️ Erreur sauvegarde syllabes uniques:', error)
        // Ne pas bloquer le processus principal
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // ========================================================================
    // 1. VÉRIFICATION AUTHENTIFICATION
    // ========================================================================

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
        // ====================================================================
        // 2. PARSER LE FORMULAIRE (multipart/form-data)
        // ====================================================================

        const form = formidable({
            maxFileSize: 50 * 1024 * 1024, // 50 MB max (plusieurs syllabes)
            keepExtensions: true,
            multiples: true, // Accepter plusieurs fichiers
        })

        const [fields, files] = await form.parse(req)

        const mot = fields.mot?.[0]
        const segmentationJson = fields.segmentation?.[0]
        const syllabesModifieesJson = fields.syllabesModifiees?.[0] // NOUVEAU: syllabes modifiées
        const actionsJson = fields.actions?.[0] // NOUVEAU: actions ['enregistrer'|'jeter'|'modifier']

        console.log(`📤 Upload segmentation syllabes: "${mot}" - apprenant ${apprenantId}`)

        if (!mot || !segmentationJson) {
            return res.status(400).json({ error: 'Mot et segmentation requis' })
        }

        // Parser la segmentation (array de syllabes)
        let segmentation
        try {
            segmentation = JSON.parse(segmentationJson)
        } catch (e) {
            return res.status(400).json({ error: 'Format segmentation invalide' })
        }

        if (!Array.isArray(segmentation) || segmentation.length === 0) {
            return res.status(400).json({ error: 'Segmentation doit être un array non vide' })
        }

        // Parser les syllabes modifiées (array avec null si pas modifié)
        let syllabesModifiees = []
        if (syllabesModifieesJson) {
            try {
                syllabesModifiees = JSON.parse(syllabesModifieesJson)
            } catch (e) {
                return res.status(400).json({ error: 'Format syllabes modifiées invalide' })
            }

            // Vérifier cohérence
            if (syllabesModifiees.length !== segmentation.length) {
                return res.status(400).json({
                    error: `Nombre de syllabes modifiées (${syllabesModifiees.length}) ne correspond pas au nombre de syllabes (${segmentation.length})`
                })
            }
        } else {
            // Rétrocompatibilité
            syllabesModifiees = segmentation.map(() => null)
        }

        // Parser les actions (array de 'enregistrer' ou 'jeter' ou 'modifier')
        let actions = []
        if (actionsJson) {
            try {
                actions = JSON.parse(actionsJson)
            } catch (e) {
                return res.status(400).json({ error: 'Format actions invalide' })
            }

            // Vérifier cohérence
            if (actions.length !== segmentation.length) {
                return res.status(400).json({
                    error: `Nombre d'actions (${actions.length}) ne correspond pas au nombre de syllabes (${segmentation.length})`
                })
            }
        } else {
            // Si pas d'actions, toutes les syllabes sont enregistrées (rétrocompatibilité)
            actions = segmentation.map(() => 'enregistrer')
        }

        // Compter combien de syllabes doivent être enregistrées (enregistrer OU modifier)
        const syllabesToRecord = actions.filter(a => a === 'enregistrer' || a === 'modifier').length

        console.log(`📊 Syllabes: ${segmentation.length} total, ${syllabesToRecord} à enregistrer`)

        // Log des modifications
        const modificationsCount = syllabesModifiees.filter(s => s !== null).length
        if (modificationsCount > 0) {
            console.log(`✏️ ${modificationsCount} syllabe(s) modifiée(s)`);
        }

        // Vérifier qu'on a autant de fichiers audio que de syllabes À ENREGISTRER
        const audioFiles = files.audio

        if (syllabesToRecord > 0 && !audioFiles) {
            return res.status(400).json({ error: 'Fichiers audio requis pour les syllabes à enregistrer' })
        }

        const audioArray = audioFiles ? (Array.isArray(audioFiles) ? audioFiles : [audioFiles]) : []

        if (audioArray.length !== syllabesToRecord) {
            return res.status(400).json({
                error: `Nombre d'audios (${audioArray.length}) ne correspond pas au nombre de syllabes à enregistrer (${syllabesToRecord})`
            })
        }

        // Normaliser le mot (minuscules, sans accents pour la clé)
        const motNormalized = mot
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer accents

        // ====================================================================
        // 3. VÉRIFIER SI UNE SEGMENTATION EXISTE DÉJÀ
        // ====================================================================

        const { data: existingRecord } = await supabaseAdmin
            .from('enregistrements_syllabes')
            .select('id, audio_urls')
            .eq('apprenant_id', apprenantId)
            .eq('mot_normalise', motNormalized)
            .single()

        // Si existe, supprimer les anciens fichiers du Storage
        if (existingRecord && existingRecord.audio_urls) {
            for (const audioUrl of existingRecord.audio_urls) {
                const urlParts = audioUrl.split('/storage/v1/object/')
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1].split('?')[0]
                    const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

                    console.log('🗑️ Suppression ancien fichier syllabe:', pathWithoutBucket)

                    await supabaseAdmin.storage
                        .from('enregistrements-audio')
                        .remove([pathWithoutBucket])
                }
            }
        }

        // ====================================================================
        // 4. RÉCUPÉRER LES URLs DES SYLLABES EXISTANTES
        // ====================================================================

        // Récupérer toutes les syllabes marquées comme 'existing'
        const syllabesToFetch = []
        for (let i = 0; i < segmentation.length; i++) {
            if (actions[i] === 'existing') {
                const syllabeNormalisee = segmentation[i]
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                syllabesToFetch.push(syllabeNormalisee)
            }
        }

        // Map pour stocker les URLs des syllabes existantes
        const existingSyllabesMap = {}

        if (syllabesToFetch.length > 0) {
            console.log(`🔍 Récupération de ${syllabesToFetch.length} syllabe(s) existante(s)...`)

            const { data: existingData, error: existingError } = await supabaseAdmin
                .from('syllabes_enregistrees')
                .select('syllabe, audio_url')
                .eq('apprenant_id', apprenantId)
                .in('syllabe', syllabesToFetch)

            if (existingError) {
                console.error('❌ Erreur récupération syllabes existantes:', existingError)
                return res.status(500).json({
                    error: 'Erreur lors de la récupération des syllabes existantes',
                    details: existingError.message
                })
            }

            // Créer le map syllabe → audio_url
            existingData.forEach(syl => {
                existingSyllabesMap[syl.syllabe] = syl.audio_url
            })

            console.log(`✅ ${existingData.length} syllabe(s) existante(s) récupérée(s)`)
        }

        // ====================================================================
        // 5. UPLOAD DES FICHIERS VERS SUPABASE STORAGE
        // ====================================================================

        const audioUrls = []

        // Sanitize le mot pour le nom de fichier
        const motSanitized = motNormalized.replace(/[^a-z0-9]/g, '_')

        let audioIndex = 0 // Index dans audioArray (fichiers uploadés)

        for (let i = 0; i < segmentation.length; i++) {
            const syllabe = segmentation[i]
            const action = actions[i]

            // Si syllabe jetée, insérer null dans audioUrls
            if (action === 'jeter') {
                console.log(`🗑️ Syllabe ${i + 1}/${segmentation.length} jetée: "${syllabe}" (pas d'enregistrement)`)
                audioUrls.push(null)
                continue
            }

            // Si syllabe existante (déjà enregistrée), récupérer l'URL depuis le map
            if (action === 'existing') {
                const syllabeNormalisee = syllabe
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')

                const existingUrl = existingSyllabesMap[syllabeNormalisee]

                if (!existingUrl) {
                    console.error(`❌ URL manquante pour syllabe existante: "${syllabe}"`)
                    return res.status(500).json({
                        error: `URL audio manquante pour la syllabe existante "${syllabe}"`,
                        details: 'La syllabe devrait exister dans syllabes_enregistrees'
                    })
                }

                console.log(`♻️ Syllabe ${i + 1}/${segmentation.length} existante: "${syllabe}" (réutilisation)`)
                audioUrls.push(existingUrl)
                continue
            }

            // Sinon, uploader le fichier audio
            const audioFile = audioArray[audioIndex]
            audioIndex++

            const fileBuffer = fs.readFileSync(audioFile.filepath)
            const fileExt = audioFile.originalFilename?.split('.').pop() || 'webm'

            // Nom de fichier : syllabes/apprenant_{id}/{mot}_{index}_{syllabe}.webm
            const syllabeSanitized = syllabe
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '_')

            const fileName = `syllabes/apprenant_${apprenantId}/${motSanitized}_${i}_${syllabeSanitized}.${fileExt}`

            console.log(`📁 Upload syllabe ${i + 1}/${segmentation.length}: "${syllabe}" -> ${fileName}`)

            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('enregistrements-audio')
                .upload(fileName, fileBuffer, {
                    contentType: audioFile.mimetype || 'audio/webm',
                    upsert: true
                })

            if (uploadError) {
                console.error(`❌ Erreur upload syllabe ${i + 1}:`, uploadError)
                return res.status(500).json({
                    error: `Erreur lors de l'upload de la syllabe ${i + 1}`,
                    details: uploadError.message
                })
            }

            console.log(`✅ Syllabe ${i + 1} uploadée:`, uploadData.path)

            // Générer URL signée
            const { data: urlData } = await supabaseAdmin.storage
                .from('enregistrements-audio')
                .createSignedUrl(uploadData.path, 31536000) // 1 an

            const audioUrl = urlData?.signedUrl ||
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/enregistrements-audio/${uploadData.path}`

            audioUrls.push(audioUrl)
        }

        // ====================================================================
        // 6. SAUVEGARDER/METTRE À JOUR L'ENTRÉE EN BASE DE DONNÉES
        // ====================================================================

        const dataToSave = {
            apprenant_id: apprenantId,
            mot: mot.trim(),
            mot_normalise: motNormalized,
            segmentation_personnalisee: segmentation,
            syllabes_modifiees: syllabesModifiees, // NOUVEAU
            audio_urls: audioUrls,
            updated_at: new Date().toISOString()
        }

        if (existingRecord) {
            // Mise à jour
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('enregistrements_syllabes')
                .update(dataToSave)
                .eq('id', existingRecord.id)
                .select()
                .single()

            if (updateError) {
                console.error('❌ Erreur mise à jour BDD:', updateError)
                return res.status(500).json({
                    error: 'Erreur lors de la mise à jour',
                    details: updateError.message
                })
            }

            console.log('✅ Segmentation mise à jour:', updateData.id)

            // ================================================================
            // 7. SAUVEGARDER CHAQUE SYLLABE UNIQUE DANS syllabes_enregistrees
            // ================================================================
            await sauvegarderSyllabesUniques(apprenantId, segmentation, audioUrls, actions)

            return res.status(200).json({
                success: true,
                message: 'Segmentation mise à jour avec succès',
                enregistrement: updateData
            })

        } else {
            // Création
            const { data: insertData, error: insertError } = await supabaseAdmin
                .from('enregistrements_syllabes')
                .insert(dataToSave)
                .select()
                .single()

            if (insertError) {
                console.error('❌ Erreur insertion BDD:', insertError)
                return res.status(500).json({
                    error: 'Erreur lors de la sauvegarde',
                    details: insertError.message
                })
            }

            console.log('✅ Nouvelle segmentation créée:', insertData.id)

            // ================================================================
            // 7. SAUVEGARDER CHAQUE SYLLABE UNIQUE DANS syllabes_enregistrees
            // ================================================================
            await sauvegarderSyllabesUniques(apprenantId, segmentation, audioUrls, actions)

            return res.status(201).json({
                success: true,
                message: 'Segmentation créée avec succès',
                enregistrement: insertData
            })
        }

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
