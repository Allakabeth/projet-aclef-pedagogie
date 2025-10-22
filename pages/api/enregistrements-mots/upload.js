import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
    api: {
        bodyParser: false,
    },
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
            maxFileSize: 10 * 1024 * 1024, // 10 MB max
            keepExtensions: true,
        })

        const [fields, files] = await form.parse(req)

        const mot = fields.mot?.[0]
        const texteId = fields.texte_id?.[0] ? parseInt(fields.texte_id[0]) : null
        const audioFile = files.audio?.[0]

        console.log(`📤 Upload enregistrement mot: "${mot}" - apprenant ${apprenantId}`)

        if (!mot || !audioFile) {
            return res.status(400).json({ error: 'Mot et fichier audio requis' })
        }

        // Normaliser le mot (minuscules)
        const motNormalized = mot.toLowerCase().trim()

        // ====================================================================
        // 3. VÉRIFIER SI UN ENREGISTREMENT EXISTE DÉJÀ
        // ====================================================================

        const { data: existingRecord } = await supabaseAdmin
            .from('enregistrements_mots')
            .select('id, audio_url')
            .eq('apprenant_id', apprenantId)
            .eq('mot', motNormalized)
            .single()

        // Si existe, supprimer l'ancien fichier du Storage
        if (existingRecord && existingRecord.audio_url) {
            const urlParts = existingRecord.audio_url.split('/storage/v1/object/')
            if (urlParts.length > 1) {
                const storagePath = urlParts[1].split('?')[0]
                const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

                console.log('🗑️ Suppression ancien fichier:', pathWithoutBucket)

                await supabaseAdmin.storage
                    .from('enregistrements-audio')
                    .remove([pathWithoutBucket])
            }
        }

        // ====================================================================
        // 4. UPLOAD DU FICHIER VERS SUPABASE STORAGE
        // ====================================================================

        const fileBuffer = fs.readFileSync(audioFile.filepath)
        const fileExt = audioFile.originalFilename?.split('.').pop() || 'webm'
        const fileName = `mots/apprenant_${apprenantId}/${motNormalized}.${fileExt}`

        console.log('📁 Upload vers Storage:', fileName)

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .upload(fileName, fileBuffer, {
                contentType: audioFile.mimetype || 'audio/webm',
                upsert: true // Remplacer si existe déjà
            })

        if (uploadError) {
            console.error('❌ Erreur upload Storage:', uploadError)
            return res.status(500).json({
                error: 'Erreur lors de l\'upload du fichier',
                details: uploadError.message
            })
        }

        console.log('✅ Fichier uploadé:', uploadData.path)

        // ====================================================================
        // 5. GÉNÉRER URL PUBLIQUE (SIGNÉE)
        // ====================================================================

        const { data: urlData, error: urlError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .createSignedUrl(uploadData.path, 31536000) // 1 an

        if (urlError) {
            console.error('⚠️ Erreur génération URL:', urlError)
            // Continuer avec URL publique de base
        }

        const audioUrl = urlData?.signedUrl ||
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/enregistrements-audio/${uploadData.path}`

        // ====================================================================
        // 6. SAUVEGARDER/METTRE À JOUR L'ENTRÉE EN BASE DE DONNÉES
        // ====================================================================

        if (existingRecord) {
            // Mise à jour
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('enregistrements_mots')
                .update({
                    audio_url: audioUrl,
                    texte_id: texteId,
                    updated_at: new Date().toISOString()
                })
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

            console.log('✅ Enregistrement mis à jour:', updateData.id)

            return res.status(200).json({
                success: true,
                message: 'Enregistrement mis à jour avec succès',
                enregistrement: updateData
            })

        } else {
            // Création
            const { data: insertData, error: insertError } = await supabaseAdmin
                .from('enregistrements_mots')
                .insert({
                    apprenant_id: apprenantId,
                    mot: motNormalized,
                    audio_url: audioUrl,
                    texte_id: texteId
                })
                .select()
                .single()

            if (insertError) {
                console.error('❌ Erreur insertion BDD:', insertError)
                return res.status(500).json({
                    error: 'Erreur lors de la sauvegarde',
                    details: insertError.message
                })
            }

            console.log('✅ Nouvel enregistrement créé:', insertData.id)

            return res.status(201).json({
                success: true,
                message: 'Enregistrement créé avec succès',
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
