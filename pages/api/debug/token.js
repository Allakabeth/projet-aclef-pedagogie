import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.substring(7)
    
    console.log('🔍 Token reçu:', token.substring(0, 50) + '...')
    console.log('🔍 JWT_SECRET défini:', !!process.env.JWT_SECRET)
    console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET?.substring(0, 20) + '...')
    
    try {
        const payload = verifyToken(token)
        console.log('🔍 Payload décodé:', payload)
        
        return res.status(200).json({
            success: true,
            hasToken: true,
            hasSecret: !!process.env.JWT_SECRET,
            payload: payload,
            tokenPreview: token.substring(0, 50) + '...'
        })
    } catch (error) {
        console.log('🔍 Erreur décodage token:', error.message)
        return res.status(401).json({
            error: 'Erreur décodage token',
            details: error.message,
            hasSecret: !!process.env.JWT_SECRET
        })
    }
}