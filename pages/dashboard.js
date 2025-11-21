import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    // Heartbeat pour tracker l'activité utilisateur
    useEffect(() => {
        const sendHeartbeat = async () => {
            const token = localStorage.getItem('token')
            if (!token) return

            try {
                const response = await fetch('/api/sessions/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    const data = await response.json()
                    console.error('Heartbeat failed:', data.error)
                }
            } catch (error) {
                console.error('Heartbeat error:', error)
            }
        }

        // Envoyer heartbeat immédiatement
        sendHeartbeat()

        // Puis toutes les 2 minutes
        const interval = setInterval(sendHeartbeat, 2 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        router.push('/login')
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'white', fontSize: '18px' }}>Chargement...</div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
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
                padding: 'clamp(15px, 4vw, 25px)',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    background: 'white',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Espace Pédagogique ACLEF
                </h1>

                {/* Message personnalisé */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(20px, 5vw, 35px)',
                    lineHeight: '1.4'
                }}>
                    Bonjour <strong>{user?.prenom}</strong>.<br />
                    Que voulez-vous faire aujourd'hui ?
                </p>

                {/* Grille de boutons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'clamp(10px, 3vw, 15px)',
                    marginBottom: 'clamp(15px, 4vw, 25px)'
                }}>
                    <button
                        onClick={() => router.push('/formation')}
                        style={{
                            backgroundColor: '#6366f1',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📚 Formation
                    </button>

                    <button
                        onClick={() => router.push('/exercices/mes-exercices')}
                        style={{
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📝 Mes Exercices
                    </button>

                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📖 Lire
                    </button>

                    <button
                        onClick={() => router.push('/ecrire')}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        ✏️ Écrire
                    </button>

                    <button
                        onClick={() => router.push('/compter')}
                        style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔢 Compter
                    </button>

                    <button
                        onClick={() => router.push('/code-route')}
                        style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🚗 Code de la route
                    </button>

                    <button
                        onClick={() => router.push('/quizz')}
                        style={{
                            backgroundColor: '#06b6d4',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🧠 Quizz
                    </button>

                    <button
                        onClick={() => router.push('/parler')}
                        style={{
                            backgroundColor: '#ec4899',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🗣️ Parler en français
                    </button>

                    <button
                        onClick={() => router.push('/imagiers')}
                        style={{
                            backgroundColor: '#14b8a6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🖼️ Imagiers
                    </button>

                    <button
                        onClick={() => router.push('/change-password')}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: 'clamp(14px, 3vw, 16px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔐 Changer de mot de passe
                    </button>
                </div>

                {/* Bouton Déconnexion */}
                <button
                    onClick={handleLogout}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        borderRadius: '25px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(107, 114, 128, 0.3)',
                        transition: 'all 0.3s ease',
                        marginTop: '10px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    🚪 Se déconnecter
                </button>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    Connecté en tant que : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}