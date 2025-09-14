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

        // Lire le fichier audio
        const audioData = fs.readFileSync(audioFile.filepath)
        
        // Appeler l'API ElevenLabs Speech-to-Text
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
            },
            body: audioData
        })

        if (!elevenLabsResponse.ok) {
            throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`)
        }

        const result = await elevenLabsResponse.json()
        
        // Nettoyer le fichier temporaire
        fs.unlinkSync(audioFile.filepath)
        
        res.status(200).json({
            text: result.text || '',
            alignment: result.alignment || null
        })

    } catch (error) {
        console.error('Erreur Speech-to-Text ElevenLabs:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}