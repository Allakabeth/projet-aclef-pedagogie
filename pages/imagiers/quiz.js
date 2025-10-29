import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function QuizSelection() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imagiers, setImagiers] = useState([])
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
            loadImagiers()
        }
    }, [])

    const loadImagiers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/imagiers/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                // Filtrer pour ne garder que les imagiers avec au moins 4 éléments
                const imagiersFiltered = data.imagiers.filter(img => img.elements_count >= 4)
                setImagiers(imagiersFiltered)
            }
        } catch (error) {
            console.error('Erreur chargement imagiers:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const startQuiz = (imagierId, mode) => {
        router.push(`/imagiers/quiz-jeu?imagier=${imagierId}&mode=${mode}`)
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: 'white', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '40px'
                }}>
                    <h1 style={{
                        color: 'white',
                        fontSize: 'clamp(28px, 5vw, 42px)',
                        marginBottom: '10px',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        🎯 Quiz
                    </h1>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '18px'
                    }}>
                        Testez vos connaissances avec un quiz
                    </p>
                </div>

                {/* Bouton retour */}
                <button
                    onClick={() => router.push('/imagiers')}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '12px 24px',
                        border: '2px solid white',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginBottom: '30px'
                    }}
                >
                    ← Retour au menu
                </button>

                {/* Message si pas d'imagiers */}
                {imagiers.length === 0 ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '60px 40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
                        <h3 style={{ color: '#333', marginBottom: '10px' }}>
                            Aucun imagier disponible pour le quiz
                        </h3>
                        <p style={{ color: '#666', marginBottom: '20px' }}>
                            Pour jouer au quiz, vous devez avoir au moins un imagier avec 4 éléments minimum
                        </p>
                        <button
                            onClick={() => router.push('/imagiers/creer')}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Créer un imagier
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Instructions */}
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '30px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>
                                📖 Comment jouer ?
                            </h3>
                            <p style={{ margin: '0', color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                                Choisissez un imagier ci-dessous et sélectionnez le mode de jeu (4 ou 12 réponses possibles).
                                Une image s'affichera avec plusieurs propositions. Trouvez la bonne réponse !
                            </p>
                        </div>

                        {/* Liste des imagiers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '20px'
                        }}>
                            {imagiers.map(imagier => (
                                <div key={imagier.id} style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {/* Titre */}
                                    <h3 style={{
                                        margin: '0 0 8px 0',
                                        color: '#333',
                                        fontSize: '20px'
                                    }}>
                                        {imagier.titre}
                                    </h3>

                                    {/* Thème */}
                                    {imagier.theme && (
                                        <span style={{
                                            display: 'inline-block',
                                            backgroundColor: '#fee2e2',
                                            color: '#dc2626',
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            marginBottom: '12px'
                                        }}>
                                            {imagier.theme}
                                        </span>
                                    )}

                                    {/* Description */}
                                    {imagier.description && (
                                        <p style={{
                                            color: '#666',
                                            fontSize: '14px',
                                            marginBottom: '16px',
                                            lineHeight: '1.5'
                                        }}>
                                            {imagier.description}
                                        </p>
                                    )}

                                    {/* Statistiques */}
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        marginBottom: '20px'
                                    }}>
                                        📸 {imagier.elements_count} {imagier.elements_count > 1 ? 'éléments' : 'élément'}
                                    </div>

                                    {/* Boutons de mode */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {/* Mode 4 réponses - toujours disponible */}
                                        <button
                                            onClick={() => startQuiz(imagier.id, 4)}
                                            style={{
                                                flex: '1',
                                                minWidth: '120px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                padding: '12px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '15px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                        >
                                            🎯 Quiz 4 réponses
                                        </button>

                                        {/* Mode 12 réponses - seulement si >= 12 éléments */}
                                        {imagier.elements_count >= 12 && (
                                            <button
                                                onClick={() => startQuiz(imagier.id, 12)}
                                                style={{
                                                    flex: '1',
                                                    minWidth: '120px',
                                                    backgroundColor: '#f97316',
                                                    color: 'white',
                                                    padding: '12px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '15px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                                            >
                                                🔥 Quiz 12 réponses
                                            </button>
                                        )}
                                    </div>

                                    {/* Info pour le mode 12 */}
                                    {imagier.elements_count >= 4 && imagier.elements_count < 12 && (
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#9ca3af',
                                            margin: '10px 0 0 0',
                                            fontStyle: 'italic'
                                        }}>
                                            Mode 12 réponses disponible à partir de 12 éléments
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
