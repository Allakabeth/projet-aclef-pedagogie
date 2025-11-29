import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CompterAccueil() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Configuration des catégories principales
    const categories = [
        {
            id: 'logique',
            nom: 'Logique',
            emoji: '🧩',
            couleur: '#8b5cf6',
            description: 'Ranger, Trier, Associer, Compter, Mémoriser',
            route: '/compter/logique'
        }
    ]

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
                justifyContent: 'center',
                padding: '15px'
            }}>
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
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
                {/* Bouton retour */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '15px'
                }}>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        ← Retour
                    </button>
                </div>

                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(24px, 6vw, 32px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                }}>
                    <span>🔢</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        COMPTER
                    </span>
                </h1>

                <p style={{
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    color: '#6b7280',
                    marginBottom: '25px'
                }}>
                    Choisissez une catégorie :
                </p>

                {/* Grille des catégories */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '25px'
                }}>
                    {categories.map((categorie) => (
                        <button
                            key={categorie.id}
                            onClick={() => router.push(categorie.route)}
                            style={{
                                backgroundColor: categorie.couleur,
                                color: 'white',
                                padding: '25px 20px',
                                borderRadius: '15px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: `0 4px 15px ${categorie.couleur}40`,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                minHeight: '140px',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)'
                                e.currentTarget.style.boxShadow = `0 8px 25px ${categorie.couleur}50`
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = `0 4px 15px ${categorie.couleur}40`
                            }}
                        >
                            <span style={{ fontSize: '48px' }}>{categorie.emoji}</span>
                            <span style={{
                                fontSize: 'clamp(18px, 4vw, 24px)',
                                fontWeight: 'bold'
                            }}>
                                {categorie.nom}
                            </span>
                            <span style={{
                                fontSize: '13px',
                                opacity: 0.9,
                                textAlign: 'center'
                            }}>
                                {categorie.description}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Bouton progression */}
                <button
                    onClick={() => router.push('/compter/progression')}
                    style={{
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        padding: '15px 30px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        maxWidth: '300px',
                        margin: '0 auto'
                    }}
                >
                    <span>📊</span>
                    Ma progression
                </button>

                {/* Info utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '10px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    Connecté : <strong>{user.prenom}</strong>
                </div>
            </div>
        </div>
    )
}
