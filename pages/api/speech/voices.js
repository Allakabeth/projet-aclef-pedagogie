export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Voix ElevenLabs sélectionnées (2 voix uniquement)
    const voixElevenLabs = [
        {
            voice_id: 'AfbuxQ9DVtS4azaxN1W7',
            name: 'Paul (ElevenLabs)',
            description: 'Voix masculine française premium',
            gender: 'male',
            recommended: true
        },
        {
            voice_id: 'tMyQcCxfGDdIt7wJ2RQw',
            name: 'Julie (ElevenLabs)',
            description: 'Voix féminine française premium',
            gender: 'female',
            recommended: true
        }
    ]

    return res.status(200).json({
        success: true,
        voices: voixElevenLabs
    })
}