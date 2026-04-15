import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { verifyToken } from '../../../../lib/jwt'
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

    // Auth admin (JWT)
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    try {
        const form = formidable({
            maxFileSize: 5 * 1024 * 1024,
            keepExtensions: true,
        })
        const [fields, files] = await form.parse(req)

        const syllabe = fields.syllabe?.[0]
        const audioFile = files.audio?.[0]

        if (!syllabe || !audioFile) {
            return res.status(400).json({ error: 'Syllabe et fichier audio requis' })
        }

        const syllabeNorm = syllabe.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        // Existant ?
        const { data: existing } = await supabaseAdmin
            .from('sons_reference_g')
            .select('id, audio_url')
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
        const fileName = `sons-reference/${syllabeNorm}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .upload(fileName, fileBuffer, {
                contentType: audioFile.mimetype || 'audio/webm',
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return res.status(500).json({ error: 'Erreur upload', details: uploadError.message })
        }

        const { data: urlData } = await supabaseAdmin.storage
            .from('enregistrements-audio')
            .createSignedUrl(uploadData.path, 31536000)

        const audioUrl = urlData?.signedUrl ||
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/enregistrements-audio/${uploadData.path}`

        if (existing) {
            const { data, error } = await supabaseAdmin
                .from('sons_reference_g')
                .update({ audio_url: audioUrl, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single()
            if (error) return res.status(500).json({ error: error.message })
            return res.status(200).json({ success: true, enregistrement: data })
        } else {
            const { data, error } = await supabaseAdmin
                .from('sons_reference_g')
                .insert({ syllabe: syllabeNorm, audio_url: audioUrl })
                .select()
                .single()
            if (error) return res.status(500).json({ error: error.message })
            return res.status(201).json({ success: true, enregistrement: data })
        }
    } catch (e) {
        console.error('Upload error:', e)
        return res.status(500).json({ error: 'Erreur serveur', details: e.message })
    }
}
