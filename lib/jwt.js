import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt-aclef-2024'
const ACCESS_TOKEN_EXPIRY = '8h' // Durée plus longue pour éviter les déconnexions intempestives
const REFRESH_TOKEN_EXPIRY = '30d' // Token de rafraîchissement valide 30 jours

export function generateTokenPair(payload) {
    const accessToken = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    )
    
    const refreshToken = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    )
    
    return {
        accessToken,
        refreshToken,
        expiresIn: 28800, // 8 heures en secondes
        tokenType: 'Bearer'
    }
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (error) {
        return null
    }
}