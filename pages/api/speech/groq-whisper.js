import { verifyToken } from '../../../lib/jwt'
import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

// Désactiver le body parser de Next.js pour gérer les fichiers
export const config = {
    api: {
        bodyParser: false
    }
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

        // Parser le fichier audio avec formidable
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB max
            keepExtensions: true
        })

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err)
                else resolve([fields, files])
            })
        })

        const audioFile = files.audio?.[0] || files.audio
        if (!audioFile) {
            return res.status(400).json({ error: 'Fichier audio manquant' })
        }

        console.log('🎤 Fichier audio reçu:', audioFile.originalFilename, audioFile.size, 'bytes')

        // Préparer la requête pour Groq Whisper
        const formData = new FormData()
        formData.append('file', fs.createReadStream(audioFile.filepath), {
            filename: audioFile.originalFilename || 'audio.webm',
            contentType: audioFile.mimetype || 'audio/webm'
        })
        formData.append('model', 'whisper-large-v3-turbo')
        formData.append('language', 'fr')
        formData.append('response_format', 'json')

        // Appeler l'API Groq Whisper
        const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        })

        if (!groqResponse.ok) {
            const errorText = await groqResponse.text()
            console.error('❌ Erreur Groq Whisper:', errorText)
            return res.status(500).json({
                error: 'Erreur de transcription',
                details: errorText
            })
        }

        const transcription = await groqResponse.json()
        console.log('✅ Transcription réussie:', transcription.text)

        // Nettoyer le fichier temporaire
        try {
            fs.unlinkSync(audioFile.filepath)
        } catch (cleanupError) {
            console.warn('⚠️ Erreur nettoyage fichier temporaire:', cleanupError)
        }

        return res.status(200).json({
            success: true,
            text: transcription.text
        })

    } catch (error) {
        console.error('💥 Erreur transcription audio:', error)
        return res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        })
    }
}
