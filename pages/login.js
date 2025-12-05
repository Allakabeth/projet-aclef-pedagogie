import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LoginApprenant() {
    const router = useRouter()
    const [identifiant, setIdentifiant] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('error')
    const [suggestion, setSuggestion] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!identifiant || !password) {
            setMessage('Veuillez remplir tous les champs')
            setMessageType('error')
            return
        }

        setIsLoading(true)
        setMessage('')
        setSuggestion(null)

        try {
            const response = await fetch('/api/auth/apprenant/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifiant,
                    password
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                // Connexion réussie
                localStorage.setItem('token', data.tokens.accessToken)
                localStorage.setItem('refreshToken', data.tokens.refreshToken)
                localStorage.setItem('user', JSON.stringify(data.user))

                setMessage('Connexion réussie ! Redirection...')
                setMessageType('success')

                // Rediriger vers le dashboard ou page de changement de mot de passe
                setTimeout(() => {
                    if (data.user.mustChangePassword) {
                        router.push('/change-password')
                    } else {
                        router.push('/dashboard')
                    }
                }, 1500)
            } else {
                // Distinguer erreur serveur vs erreur identifiants
                if (response.status >= 500) {
                    // Erreur serveur (Supabase down, etc.)
                    setMessage('Service temporairement indisponible. Réessayez dans quelques minutes.')
                    setMessageType('warning')
                } else {
                    // Erreur avec aide intelligente (identifiants incorrects, etc.)
                    setMessage(data.error || 'Erreur de connexion')
                    setMessageType('error')

                    if (data.help && data.suggestion) {
                        setSuggestion({
                            message: data.message,
                            text: data.suggestion.text,
                            identifiant: data.suggestion.identifiant,
                            hint: data.suggestion.hint
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Erreur connexion:', error)
            // Erreur réseau ou serveur inaccessible
            setMessage('Service temporairement indisponible. Vérifiez votre connexion ou réessayez dans quelques minutes.')
            setMessageType('warning')
        } finally {
            setIsLoading(false)
        }
    }

    // Auto-remplir l'identifiant si suggéré
    const applySuggestion = () => {
        if (suggestion && suggestion.identifiant) {
            setIdentifiant(suggestion.identifiant)
            setSuggestion(null)
            setMessage('')
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                maxWidth: '450px',
                width: '100%',
                margin: '0 auto'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: 'clamp(24px, 5vw, 32px)',
                        fontWeight: 'bold',
                        background: 'white',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        Espace Pédagogique
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                        Connexion Apprenant
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Identifiant
                        </label>
                        <input
                            type="text"
                            value={identifiant}
                            onChange={(e) => setIdentifiant(e.target.value)}
                            placeholder="Votre prénom"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '10px',
                                fontSize: '16px',
                                transition: 'border-color 0.2s',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Votre nom de famille"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    paddingRight: '45px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    transition: 'border-color 0.2s',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            backgroundColor: messageType === 'success' ? '#d1fae5' :
                                           messageType === 'warning' ? '#fef3c7' : '#fee2e2',
                            color: messageType === 'success' ? '#065f46' :
                                  messageType === 'warning' ? '#92400e' : '#991b1b',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {messageType === 'warning' && '⚠️ '}
                            {message}
                        </div>
                    )}

                    {suggestion && (
                        <div style={{
                            padding: '15px',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            backgroundColor: '#fef3c7',
                            border: '2px solid #f59e0b'
                        }}>
                            <div style={{ color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
                                💡 Aide à la connexion
                            </div>
                            <div style={{ color: '#78350f', fontSize: '14px', marginBottom: '8px' }}>
                                {suggestion.message}
                            </div>
                            <div style={{ 
                                color: '#451a03', 
                                fontSize: '14px', 
                                fontWeight: '600',
                                marginBottom: '8px'
                            }}>
                                {suggestion.text}
                            </div>
                            {suggestion.identifiant && (
                                <button
                                    type="button"
                                    onClick={applySuggestion}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        marginTop: '8px'
                                    }}
                                >
                                    Utiliser cet identifiant
                                </button>
                            )}
                            <div style={{ 
                                color: '#78350f', 
                                fontSize: '12px', 
                                fontStyle: 'italic',
                                marginTop: '8px'
                            }}>
                                {suggestion.hint}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.2s',
                            marginBottom: '15px'
                        }}
                        onMouseOver={(e) => !isLoading && (e.target.style.transform = 'scale(1.02)')}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        {isLoading ? 'Connexion...' : 'Se connecter'}
                    </button>

                    <div style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                            Première connexion ?
                        </div>
                        <div>
                            Utilisez votre prénom comme identifiant
                        </div>
                        <div>
                            et votre nom de famille comme mot de passe
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}