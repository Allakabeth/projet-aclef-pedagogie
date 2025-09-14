import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Lire() {
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

    const handleRetourDashboard = () => {
        router.push('/dashboard')
    }

    if (isLoading) {
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
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement...</div>
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
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    📖 Module Lire
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(20px, 5vw, 35px)',
                    lineHeight: '1.4'
                }}>
                    Choisissez une activité de lecture :
                </p>

                {/* Grille de boutons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'clamp(10px, 3vw, 15px)',
                    marginBottom: 'clamp(15px, 4vw, 25px)'
                }}>
                    <button
                        onClick={() => router.push('/lire/mes-textes-references')}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📚 Mes textes références
                    </button>

                    <button
                        onClick={() => router.push('/lire/ou-est-ce')}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📍 Où est-ce ?
                    </button>

                    <button
                        onClick={() => router.push('/lire/quest-ce')}
                        style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🤔 Qu'est-ce ?
                    </button>

                    <button
                        onClick={() => router.push('/lire/remettre-dans-ordre')}
                        style={{
                            backgroundColor: '#ec4899',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔀 Remettre dans l'ordre
                    </button>

                    <button
                        onClick={() => router.push('/lire/monosyllabes-multisyllabes')}
                        style={{
                            backgroundColor: '#14b8a6',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔤 Mono/Multi syllabes
                    </button>

                    <button
                        onClick={() => router.push('/lire/segmentation-choix')}
                        style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        ✂️ Segmentation des Syllabes
                    </button>

                    <button
                        onClick={() => router.push('/lire/dictees-recherche')}
                        style={{
                            backgroundColor: '#a855f7',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔍 Dictées recherche
                    </button>

                    <button
                        onClick={() => router.push('/lire/mes-syllabes-mots')}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔤 Mes Syllabes-Mots
                    </button>

                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            backgroundColor: '#84cc16',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📝 Mes syllabes
                    </button>

                    <button
                        onClick={() => router.push('/lire/je-joue-syllabes')}
                        style={{
                            backgroundColor: '#ec4899',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🎮 Je joue avec mes syllabes
                    </button>

                    <button
                        onClick={() => router.push('/lire/lectures-decouverte')}
                        style={{
                            backgroundColor: '#6366f1',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🔍 Lectures découverte
                    </button>

                    <button
                        onClick={() => router.push('/lire/statistiques')}
                        style={{
                            backgroundColor: '#64748b',
                            color: 'white',
                            padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                            border: 'none',
                            fontSize: 'clamp(13px, 3vw, 15px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📊 Statistiques
                    </button>
                </div>

                {/* Bouton Retour */}
                <button
                    onClick={handleRetourDashboard}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginTop: '10px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour au menu principal
                </button>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f8fafc',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    Module Lire - Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}