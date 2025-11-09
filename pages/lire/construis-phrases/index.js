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
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: isMobile ? '20px' : '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    textAlign: 'center',
                    marginBottom: isMobile ? '10px' : '15px'
                }}>
                    📝 Construis des phrases
                </h1>

                {/* Barre d'icônes de navigation */}
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '10px',
                    justifyContent: 'center',
                    marginBottom: isMobile ? '12px' : '20px'
                }}>
                    <button
                        onClick={() => {
                            const mots = JSON.parse(localStorage.getItem('construis-phrases-mots') || '[]')
                            if (mots.length > 0 && mots[0]?.texte_ids) {
                                const texteIds = mots[0].texte_ids.join(',')
                                router.push(`/lire/reconnaitre-les-mots?etape=exercices&texte_ids=${texteIds}`)
                            } else {
                                router.push('/lire/reconnaitre-les-mots')
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #64748b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Menu exercices"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => router.push('/lire/reconnaitre-les-mots')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Sélection des textes"
                    >
                        👁️
                    </button>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #10b981',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Menu Lire"
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #8b5cf6',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Accueil"
                    >
                        🏠
                    </button>
                </div>

                {/* Choix du mode */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: isMobile ? '10px' : '15px'
                }}>
                    {/* Mode Tranquille */}
                    <div
                        onClick={() => startMode('tranquille')}
                        style={{
                            background: 'white',
                            borderRadius: isMobile ? '10px' : '12px',
                            padding: isMobile ? '15px' : '25px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid #e5e7eb',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#10b981'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = '#e5e7eb'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: isMobile ? '8px' : '12px' }}>😌</div>
                        <h2 style={{
                            fontSize: isMobile ? '16px' : '20px',
                            fontWeight: 'bold',
                            color: '#10b981',
                            marginBottom: isMobile ? '0' : '8px'
                        }}>
                            Mode Tranquille
                        </h2>
                        {!isMobile && (
                            <p style={{
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: '1.3'
                            }}>
                                Lis la phrase à ton rythme
                            </p>
                        )}
                    </div>

                    {/* Mode Défi */}
                    <div
                        style={{
                            background: 'white',
                            borderRadius: isMobile ? '10px' : '12px',
                            padding: isMobile ? '15px' : '25px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid #e5e7eb',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#8b5cf6'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = '#e5e7eb'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: isMobile ? '8px' : '12px' }}>🎯</div>
                        <h2 style={{
                            fontSize: isMobile ? '16px' : '20px',
                            fontWeight: 'bold',
                            color: '#8b5cf6',
                            marginBottom: isMobile ? '8px' : '8px'
                        }}>
                            Mode Défi
                        </h2>
                        {!isMobile && (
                            <p style={{
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: '1.3',
                                marginBottom: '12px'
                            }}>
                                Écoute et reconstruis la phrase
                            </p>
                        )}

                        {/* Curseur nombre de mots intrus */}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                marginTop: isMobile ? '8px' : '12px',
                                padding: isMobile ? '8px' : '12px',
                                background: '#f3f4f6',
                                borderRadius: '6px'
                            }}
                        >
                            <label style={{
                                fontSize: isMobile ? '11px' : '13px',
                                fontWeight: 'bold',
                                color: '#8b5cf6',
                                display: 'block',
                                marginBottom: isMobile ? '5px' : '8px'
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
                                fontSize: '9px',
                                color: '#9ca3af',
                                marginTop: '3px'
                            }}>
                                <span>8</span>
                                <span>16</span>
                            </div>
                        </div>

                        {/* Bouton de lancement */}
                        <button
                            onClick={() => startMode('defi')}
                            style={{
                                marginTop: isMobile ? '8px' : '12px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: isMobile ? '8px 16px' : '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: isMobile ? '12px' : '14px',
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
                            borderRadius: isMobile ? '10px' : '12px',
                            padding: isMobile ? '15px' : '25px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            border: '3px solid #e5e7eb',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)'
                            e.currentTarget.style.borderColor = '#dc2626'
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.borderColor = '#e5e7eb'
                        }}
                    >
                        <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: isMobile ? '8px' : '12px' }}>🔥</div>
                        <h2 style={{
                            fontSize: isMobile ? '16px' : '20px',
                            fontWeight: 'bold',
                            color: '#dc2626',
                            marginBottom: isMobile ? '0' : '8px'
                        }}>
                            Mode Difficile
                        </h2>
                        {!isMobile && (
                            <p style={{
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: '1.3'
                            }}>
                                Lis la phrase à voix haute
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
