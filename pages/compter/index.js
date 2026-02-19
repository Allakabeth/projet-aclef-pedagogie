import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Compter() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
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
                <p>Chargement...</p>
            </div>
        )
    }

    const exercices = [
        {
            titre: 'Compléments à 10',
            description: 'Trouver des combinaisons de nombres qui font 10',
            couleur: '#0a5ad4',
            lien: '/compter/complements-a-10'
        }
    ]

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
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#8b5cf6'
                }}>
                    Module Compter
                </h1>

                <p style={{
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    color: '#666',
                    marginBottom: 'clamp(20px, 5vw, 30px)'
                }}>
                    Exercices de calcul et de numération
                </p>

                <div style={{
                    display: 'grid',
                    gap: '12px',
                    marginBottom: '25px'
                }}>
                    {exercices.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => router.push(ex.lien)}
                            style={{
                                backgroundColor: ex.couleur,
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px)',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: 'clamp(14px, 3vw, 16px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: `0 4px 15px ${ex.couleur}44`,
                                transition: 'transform 0.2s ease',
                                textAlign: 'left'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ fontSize: 'clamp(16px, 3.5vw, 18px)', marginBottom: '4px' }}>
                                {ex.titre}
                            </div>
                            <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.85, fontWeight: 600 }}>
                                {ex.description}
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour au tableau de bord
                </button>
            </div>
        </div>
    )
}
