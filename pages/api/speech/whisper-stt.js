import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const form = formidable({
            uploadDir: '/tmp',
            keepExtensions: true,
        })

        const [fields, files] = await form.parse(req)
        const audioFile = files.audio?.[0]

        if (!audioFile) {
            return res.status(400).json({ error: 'No audio file provided' })
        }

        // Créer FormData pour OpenAI
        const formData = new FormData()
        formData.append('file', fs.createReadStream(audioFile.filepath))
        formData.append('model', 'whisper-1')
        formData.append('language', 'fr')
        
        // Appeler l'API OpenAI Whisper
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                ...formData.getHeaders()
            },
            body: formData
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('OpenAI API error:', response.status, errorText)
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const result = await response.json()
        
        // Nettoyer le fichier temporaire
        fs.unlinkSync(audioFile.filepath)
        
        console.log('Whisper result:', result)
        
        res.status(200).json({
            text: result.text?.trim() || '',
            language: result.language || 'fr'
        })

    } catch (error) {
        console.error('Erreur Speech-to-Text Whisper:', error)
        res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}