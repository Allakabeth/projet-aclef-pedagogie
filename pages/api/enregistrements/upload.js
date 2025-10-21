import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { supabase } from '../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { verifyToken } from '../../../lib/jwt'

// Désactiver le body parser de Next.js pour gérer multipart/form-data
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
        // 2. PARSER LE FICHIER MULTIPART
        // ====================================================================

        const form = new IncomingForm({
            maxFileSize: 10 * 1024 * 1024, // 10 MB max
            keepExtensions: true,
        })

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err)
                else resolve({ fields, files })
            })
        })

        // Extraire les données
        const groupeSensId = parseInt(fields.groupe_sens_id?.[0] || fields.groupe_sens_id)
        const audioFile = files.audio?.[0] || files.audio

        // ====================================================================
        // 3. VALIDATIONS
        // ====================================================================

        if (!groupeSensId || isNaN(groupeSensId)) {
            return res.status(400).json({ error: 'groupe_sens_id requis' })
        }

        if (!audioFile) {
            return res.status(400).json({ error: 'Fichier audio requis' })
        }

        // Valider le type MIME
        const allowedMimeTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg', 'audio/x-m4a']
        if (!allowedMimeTypes.includes(audioFile.mimetype)) {
            return res.status(400).json({
                error: `Type de fichier non autorisé: ${audioFile.mimetype}. Formats acceptés: WebM, WAV, MP3, OGG, M4A`
            })
        }

        // Valider la taille
        if (audioFile.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'Fichier trop volumineux (max 10 MB)' })
        }

        console.log('📁 Fichier reçu:', {
            name: audioFile.originalFilename,
            size: audioFile.size,
            type: audioFile.mimetype
        })

        // ====================================================================
        // 4. RÉCUPÉRER LE TEXTE_ID DEPUIS GROUPE_SENS
        // ====================================================================

        const { data: groupeSens, error: groupeError } = await supabase
            .from('groupes_sens')
            .select('texte_reference_id')
            .eq('id', groupeSensId)
            .single()

        if (groupeError || !groupeSens) {
            console.error('Erreur récupération groupe:', groupeError)
            return res.status(404).json({ error: 'Groupe de sens non trouvé' })
        }

        const texteId = groupeSens.texte_reference_id

        console.log('📝 Texte ID:', texteId, '| Groupe ID:', groupeSensId)

        // ====================================================================
        // 5. VÉRIFIER SI ENREGISTREMENT EXISTE DÉJÀ
        // ====================================================================

        const { data: existingEnreg, error: existingError } = await supabaseAdmin
            .from('enregistrements_groupes')
            .select('*')
            .eq('groupe_sens_id', groupeSensId)
            .eq('apprenant_id', apprenantId)
            .maybeSingle()

        if (existingError) {
            console.error('Erreur vérification enregistrement existant:', existingError)
        }

        // Si un enregistrement existe, supprimer l'ancien fichier Storage
        if (existingEnreg) {
            console.log('🗑️ Suppression de l\'ancien enregistrement:', existingEnreg.audio_url)

            // Extraire le chemin du fichier depuis l'URL
            const urlParts = existingEnreg.audio_url.split('/storage/v1/object/')
            if (urlParts.length > 1) {
                const storagePath = urlParts[1].split('?')[0] // Enlever query params
                const pathWithoutBucket = storagePath.replace('enregistrements-audio/', '')

                const { error: deleteStorageError } = await supabaseAdmin.storage
                    .from('enregistrements-audio')
                    .remove([pathWithoutBucket])

                if (deleteStorageError) {
                    console.error('⚠️ Erreur suppression ancien fichier Storage:', deleteStorageError)
                } else {
                    console.log('✅ Ancien fichier Storage supprimé')
                }
            }

            // Supprimer l'entrée BDD
            const { error: deleteDbError } = await supabaseAdmin
                .from('enregistrements_groupes')
                .delete()
                .eq('id', existingEnreg.id)

            if (deleteDbError) {
                console.error('⚠️ Erreur suppression ancienne entrée BDD:', deleteDbError)
            } else {
                console.log('✅ Ancienne entrée BDD supprimée')
            }
        }

        // ====================================================================
        // 6. UPLOADER LE NOUVEAU FICHIER DANS SUPABASE STORAGE
        // ====================================================================

        // Construire le chemin : [apprenant_id]/[texte_id]/groupe_[groupe_id].webm
        const fileExtension = audioFile.originalFilename?.split('.').pop() || 'webm'
        const storagePath = `${apprenantId}/${texteId}/groupe_${groupeSensId}.${fileExtension}`

        console.log('📤 Upload vers:', storagePath)

        // Lire le fichier
        const fileBuffer = await fs.readFile(audioFile.filepath)

        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .upload(storagePath, fileBuffer, {
                contentType: audioFile.mimetype,
                upsert: true, // Écraser si existe
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
        // 7. GÉNÉRER URL SIGNÉE (expire dans 1 an)
        // ====================================================================

        const { data: urlData, error: urlError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .createSignedUrl(storagePath, 31536000) // 1 an

        if (urlError) {
            console.error('⚠️ Erreur génération URL signée:', urlError)
        }

        const audioUrl = urlData?.signedUrl || uploadData.path

        // ====================================================================
        // 8. SAUVEGARDER DANS LA TABLE enregistrements_groupes
        // ====================================================================

        const { data: enregistrement, error: insertError } = await supabaseAdmin
            .from('enregistrements_groupes')
            .insert({
                groupe_sens_id: groupeSensId,
                apprenant_id: apprenantId,
                audio_url: audioUrl,
                duree_secondes: parseFloat(fields.duree_secondes?.[0]) || null,
                taille_bytes: audioFile.size,
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ Erreur insertion BDD:', insertError)
            return res.status(500).json({
                error: 'Erreur lors de la sauvegarde en base de données',
                details: insertError.message
            })
        }

        console.log('✅ Enregistrement sauvegardé en BDD:', enregistrement.id)

        // ====================================================================
        // 9. NETTOYER LE FICHIER TEMPORAIRE
        // ====================================================================

        try {
            await fs.unlink(audioFile.filepath)
            console.log('🧹 Fichier temporaire supprimé')
        } catch (unlinkError) {
            console.error('⚠️ Erreur suppression fichier temporaire:', unlinkError)
        }

        // ====================================================================
        // 10. RETOURNER LE RÉSULTAT
        // ====================================================================

        return res.status(200).json({
            success: true,
            message: 'Enregistrement sauvegardé avec succès',
            enregistrement: {
                id: enregistrement.id,
                groupe_sens_id: enregistrement.groupe_sens_id,
                audio_url: enregistrement.audio_url,
                duree_secondes: enregistrement.duree_secondes,
                taille_bytes: enregistrement.taille_bytes,
                created_at: enregistrement.created_at,
            }
        })

    } catch (error) {
        console.error('💥 Erreur inattendue:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
