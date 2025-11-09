import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesIndex() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isMobile, setIsMobile] = useState(false)
    const [nbMotsIntrus, setNbMotsIntrus] = useState(8)
    const router = useRouter()

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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

        // Vérifier qu'il y a des mots
        const mots = JSON.parse(localStorage.getItem('construis-phrases-mots') || '[]')
        if (mots.length === 0) {
            alert('Aucun mot disponible. Retournez au menu des exercices.')
            router.push('/lire/reconnaitre-les-mots')
            return
        }

        setIsLoading(false)
    }, [router])

    const startMode = (mode) => {
        // Sauvegarder le nombre de mots intrus dans localStorage pour le mode défi
        if (mode === 'defi') {
            localStorage.setItem('construis-phrases-nb-intrus', nbMotsIntrus.toString())
            router.push('/lire/construis-phrases/defi')
        } else if (mode === 'difficile') {
            router.push('/lire/construis-phrases/difficile')
        } else {
            router.push('/lire/construis-phrases/tranquille')
        }
    }

    if (isLoading || !user) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '40px'
                }}>
                    <button
                        onClick={() => router.push('/lire/reconnaitre-les-mots')}
                        style={{
                            background: 'transparent',
                            border: '2px solid white',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        ← Retour
                    </button>
                    <h1 style={{
                        fontSize: isMobile ? '24px' : '36px',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '10px'
                    }}>
                        📝 Construis des phrases
                    </h1>
                    <p style={{
                        fontSize: isMobile ? '14px' : '18px',
                        color: 'rgba(255,255,255,0.9)'
                    }}>
                        Crée des phrases avec tes mots
                    </p>
                </div>

                {/* Choix du mode */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '20px'
                }}>
                    {/* Mode Tranquille */}
                    <div
                        onClick={() => startMode('tranquille')}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: isMobile ? '30px' : '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#10b981'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = 'transparent'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '20px' }}>😌</div>
                        <h2 style={{
                            fontSize: isMobile ? '20px' : '24px',
                            fontWeight: 'bold',
                            color: '#10b981',
                            marginBottom: '15px'
                        }}>
                            Mode Tranquille
                        </h2>
                        <p style={{
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#666',
                            lineHeight: '1.5'
                        }}>
                            Lis la phrase à ton rythme
                        </p>
                    </div>

                    {/* Mode Défi */}
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: isMobile ? '30px' : '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#8b5cf6'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = 'transparent'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '20px' }}>🎯</div>
                        <h2 style={{
                            fontSize: isMobile ? '20px' : '24px',
                            fontWeight: 'bold',
                            color: '#8b5cf6',
                            marginBottom: '15px'
                        }}>
                            Mode Défi
                        </h2>
                        <p style={{
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#666',
                            lineHeight: '1.5',
                            marginBottom: '20px'
                        }}>
                            Écoute et reconstruis la phrase
                        </p>

                        {/* Curseur nombre de mots intrus */}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                marginTop: '20px',
                                padding: '15px',
                                background: '#f3f4f6',
                                borderRadius: '12px'
                            }}
                        >
                            <label style={{
                                fontSize: isMobile ? '13px' : '15px',
                                fontWeight: 'bold',
                                color: '#8b5cf6',
                                display: 'block',
                                marginBottom: '10px'
                            }}>
                                Mots intrus: {nbMotsIntrus}
                            </label>
                            <input
                                type="range"
                                min="8"
                                max="16"
                                value={nbMotsIntrus}
                                onChange={(e) => setNbMotsIntrus(parseInt(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    cursor: 'pointer',
                                    accentColor: '#8b5cf6'
                                }}
                            />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '11px',
                                color: '#9ca3af',
                                marginTop: '5px'
                            }}>
                                <span>8</span>
                                <span>16</span>
                            </div>
                        </div>

                        {/* Bouton de lancement */}
                        <button
                            onClick={() => startMode('defi')}
                            style={{
                                marginTop: '20px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: isMobile ? '14px' : '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                width: '100%',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                        >
                            Commencer 🎯
                        </button>
                    </div>

                    {/* Mode Difficile */}
                    <div
                        onClick={() => startMode('difficile')}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: isMobile ? '30px' : '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#dc2626'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = 'transparent'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '20px' }}>🔥</div>
                        <h2 style={{
                            fontSize: isMobile ? '20px' : '24px',
                            fontWeight: 'bold',
                            color: '#dc2626',
                            marginBottom: '15px'
                        }}>
                            Mode Difficile
                        </h2>
                        <p style={{
                            fontSize: isMobile ? '14px' : '16px',
                            color: '#666',
                            lineHeight: '1.5'
                        }}>
                            Lis la phrase à voix haute
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
