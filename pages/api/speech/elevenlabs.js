import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Vérifier l'authentification
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    const { text, voice_id = 'AfbuxQ9DVtS4azaxN1W7' } = req.body // Voix Paul par défaut

    if (!text) {
        return res.status(400).json({ error: 'Texte requis' })
    }

    // Limitation de longueur pour éviter de dépasser les quotas
    if (text.length > 1000) {
        return res.status(400).json({ error: 'Texte trop long (max 1000 caractères)' })
    }

    try {
        console.log('🎤 Génération audio ElevenLabs pour:', text.substring(0, 50) + '...')
        console.log('📢 Voice ID utilisé:', voice_id)

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': 'sk_a0fdc9669145881dbf4c7e35db662f295e8089cf29ba28e0'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('Erreur ElevenLabs:', response.status, errorData)
            
            // Détection du dépassement de quota
            if (response.status === 401 || response.status === 429 || errorData.includes('quota') || errorData.includes('limit')) {
                return res.status(429).json({ 
                    error: 'QUOTA_EXCEEDED',
                    message: 'Quota ElevenLabs dépassé, fallback vers Web Speech API'
                })
            }
            
            return res.status(response.status).json({ 
                error: `Erreur ElevenLabs: ${response.status}` 
            })
        }

        const audioBuffer = await response.arrayBuffer()
        const audioBase64 = Buffer.from(audioBuffer).toString('base64')

        return res.status(200).json({
            success: true,
            audio: `data:audio/mpeg;base64,${audioBase64}`,
            message: 'Audio généré avec succès'
        })

    } catch (error) {
        console.error('Erreur génération audio:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la génération audio' 
        })
    }
}