import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Imagiers() {
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

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#14b8a6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🖼️ Imagiers
                </h1>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '40px',
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    Créez et utilisez des imagiers pour apprendre le vocabulaire français
                </p>

                {/* Grille de menus */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginBottom: '40px'
                }}>
                    {/* Créer un imagier */}
                    <button
                        onClick={() => router.push('/imagiers/creer')}
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            padding: '30px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-5px)'
                            e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.4)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>✨</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                            Créer un imagier
                        </h3>
                        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                            Créez votre propre imagier avec images et mots
                        </p>
                    </button>

                    {/* Mes imagiers */}
                    <button
                        onClick={() => router.push('/imagiers/mes-imagiers')}
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white',
                            padding: '30px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-5px)'
                            e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📚</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                            Mes imagiers
                        </h3>
                        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                            Gérez et consultez vos imagiers créés
                        </p>
                    </button>

                    {/* Où est-ce ? */}
                    <button
                        onClick={() => router.push('/imagiers/ou-est-ce')}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            padding: '30px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-5px)'
                            e.target.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.4)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                            Où est-ce ?
                        </h3>
                        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                            Jeu de localisation d'objets dans l'imagier
                        </p>
                    </button>

                    {/* Qu'est-ce ? */}
                    <button
                        onClick={() => router.push('/imagiers/quest-ce')}
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            padding: '30px 20px',
                            borderRadius: '16px',
                            border: 'none',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-5px)'
                            e.target.style.boxShadow = '0 12px 35px rgba(139, 92, 246, 0.4)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>❓</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                            Qu'est-ce ?
                        </h3>
                        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                            Jeu d'identification d'objets dans l'imagier
                        </p>
                    </button>
                </div>

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '40px'
                }}>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour au tableau de bord
                    </button>
                </div>
            </div>
        </div>
    )
}