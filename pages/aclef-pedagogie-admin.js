import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AclefPedagogieAdmin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/admin-quiz-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (response.ok) {
                // Stocker les informations d'authentification admin
                localStorage.setItem('quiz-admin-token', data.token)
                localStorage.setItem('quiz-admin-user', JSON.stringify(data.user))

                // Rediriger vers l'interface admin
                router.push('/admin')
            } else {
                setError(data.error || 'Erreur de connexion')
            }
        } catch (error) {
            console.error('Erreur:', error)
            setError('Erreur de connexion au serveur')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRetourAccueil = () => {
        router.push('/')
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: 'clamp(25px, 5vw, 40px)',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                {/* Logo et titre */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '10px'
                    }}>
                        🛠️
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(20px, 4vw, 24px)',
                        fontWeight: 'bold',
                        margin: '0 0 5px 0',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        ACLEF-Pédagogie-Admin
                    </h1>
                    <p style={{
                        color: '#666',
                        fontSize: '14px',
                        margin: '0'
                    }}>
                        Accès réservé aux administrateurs et salariés
                    </p>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="mathieu@aclef.fr"
                            required
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                border: '2px solid #e1e5e9',
                                borderRadius: '12px',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'border-color 0.3s ease',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                        />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="12C@millePage"
                            required
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                border: '2px solid #e1e5e9',
                                borderRadius: '12px',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'border-color 0.3s ease',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            backgroundColor: isLoading ? '#fca5a5' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '15px',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            marginBottom: '15px'
                        }}
                        onMouseOver={(e) => {
                            if (!isLoading) e.target.style.backgroundColor = '#dc2626'
                        }}
                        onMouseOut={(e) => {
                            if (!isLoading) e.target.style.backgroundColor = '#ef4444'
                        }}
                    >
                        {isLoading ? '🔄 Connexion...' : '🔓 Se connecter'}
                    </button>
                </form>

                {/* Bouton retour */}
                <button
                    onClick={handleRetourAccueil}
                    style={{
                        width: '100%',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour à l'accueil
                </button>

                {/* Info */}
                <div style={{
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#64748b',
                    textAlign: 'center'
                }}>
                    Interface d'administration ACLEF-Pédagogie
                </div>
            </div>
        </div>
    )
}