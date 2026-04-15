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

    // Auth
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
        const form = formidable({
            maxFileSize: 5 * 1024 * 1024, // 5 MB
            keepExtensions: true,
        })
        const [fields, files] = await form.parse(req)

        const syllabe = fields.syllabe?.[0]
        const motSource = fields.mot_source?.[0] || null
        const sonG = fields.son_g?.[0] || null
        const audioFile = files.audio?.[0]

        if (!syllabe || !audioFile) {
            return res.status(400).json({ error: 'Syllabe et fichier audio requis' })
        }

        const syllabeNorm = syllabe.toLowerCase().trim()

        // Vérifier existence
        const { data: existing } = await supabaseAdmin
            .from('enregistrements_sons_g')
            .select('id, audio_url')
            .eq('apprenant_id', apprenantId)
            .eq('syllabe', syllabeNorm)
            .single()

        // Supprimer ancien fichier
        if (existing && existing.audio_url) {
            const parts = existing.audio_url.split('/storage/v1/object/')
            if (parts.length > 1) {
                const storagePath = parts[1].split('?')[0]
                const pathNoBucket = storagePath.replace(/^(public|sign)\//,'').replace('enregistrements-audio/', '')
                await supabaseAdmin.storage
                    .from('enregistrements-audio')
                    .remove([pathNoBucket])
            }
        }

        // Upload
        const fileBuffer = fs.readFileSync(audioFile.filepath)
        const fileExt = audioFile.originalFilename?.split('.').pop() || 'webm'
        const syllabeSan = syllabeNorm
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
        const fileName = `sons-g/apprenant_${apprenantId}/${syllabeSan}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .upload(fileName, fileBuffer, {
                contentType: audioFile.mimetype || 'audio/webm',
                upsert: true
            })

        if (uploadError) {
            return res.status(500).json({ error: 'Erreur upload', details: uploadError.message })
        }

        // URL signée (1 an)
        const { data: urlData } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .createSignedUrl(uploadData.path, 31536000)

        const audioUrl = urlData?.signedUrl ||
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/enregistrements-audio/${uploadData.path}`

        // Sauver en DB
        if (existing) {
            const { data, error } = await supabaseAdmin
                .from('enregistrements_sons_g')
                .update({
                    audio_url: audioUrl,
                    mot_source: motSource,
                    son_g: sonG,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single()
            if (error) return res.status(500).json({ error: error.message })
            return res.status(200).json({ success: true, enregistrement: data })
        } else {
            const { data, error } = await supabaseAdmin
                .from('enregistrements_sons_g')
                .insert({
                    apprenant_id: apprenantId,
                    syllabe: syllabeNorm,
                    mot_source: motSource,
                    son_g: sonG,
                    audio_url: audioUrl
                })
                .select()
                .single()
            if (error) return res.status(500).json({ error: error.message })
            return res.status(201).json({ success: true, enregistrement: data })
        }

    } catch (error) {
        console.error('Erreur upload sons-g:', error)
        return res.status(500).json({ error: 'Erreur serveur', details: error.message })
    }
}
