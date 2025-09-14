import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MesSyllabesMots() {
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
                <div style={{ color: '#ef4444', fontSize: '18px' }}>Chargement...</div>
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
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🔤 Mes Syllabes-Mots
                </h1>

                <p style={{ 
                    textAlign: 'center', 
                    marginBottom: '40px', 
                    color: '#666',
                    fontSize: '18px'
                }}>
                    Choisissez un exercice avec vos syllabes et mots :
                </p>

                {/* Grille d'exercices */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    marginBottom: '40px'
                }}>
                    {/* Exercice 1 - Classement */}
                    <div style={{
                        background: '#fee2e2',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '3px solid #ef4444',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                    }}
                    onClick={() => router.push('/lire/mes-syllabes-mots/classement')}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏷️</div>
                        <h3 style={{ 
                            color: '#ef4444', 
                            marginBottom: '15px',
                            fontSize: '20px'
                        }}>
                            Exercice 1
                        </h3>
                        <h4 style={{ 
                            color: '#dc2626', 
                            marginBottom: '15px',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }}>
                            Classement par initiale
                        </h4>
                        <p style={{ 
                            color: '#666', 
                            lineHeight: '1.5',
                            fontSize: '14px'
                        }}>
                            Glissez et déposez les mots dans les bonnes lettres selon leur première lettre
                        </p>
                    </div>

                    {/* Exercice 2 - Où est ? */}
                    <div style={{
                        background: '#ecfdf5',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '3px solid #10b981',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                    }}
                    onClick={() => router.push('/lire/mes-syllabes-mots/ou-est')}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                        <h3 style={{ 
                            color: '#10b981', 
                            marginBottom: '15px',
                            fontSize: '20px'
                        }}>
                            Exercice 2
                        </h3>
                        <h4 style={{ 
                            color: '#059669', 
                            marginBottom: '15px',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }}>
                            Où est ?
                        </h4>
                        <p style={{ 
                            color: '#666', 
                            lineHeight: '1.5',
                            fontSize: '14px'
                        }}>
                            Écoutez le mot et trouvez-le parmi les choix proposés
                        </p>
                    </div>

                    {/* Exercice 3 - Qu'est-ce que c'est ? */}
                    <div style={{
                        background: '#f0f9ff',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '3px solid #3b82f6',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                    }}
                    onClick={() => router.push('/lire/mes-syllabes-mots/quest-ce')}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤔</div>
                        <h3 style={{ 
                            color: '#3b82f6', 
                            marginBottom: '15px',
                            fontSize: '20px'
                        }}>
                            Exercice 3
                        </h3>
                        <h4 style={{ 
                            color: '#1d4ed8', 
                            marginBottom: '15px',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }}>
                            Qu'est-ce que c'est ?
                        </h4>
                        <p style={{ 
                            color: '#666', 
                            lineHeight: '1.5',
                            fontSize: '14px'
                        }}>
                            Regardez le mot écrit et écoutez les propositions
                        </p>
                    </div>
                </div>

                {/* Bouton retour */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/lire')}
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
                        ← Retour au menu Lire
                    </button>
                </div>
            </div>
        </div>
    )
}