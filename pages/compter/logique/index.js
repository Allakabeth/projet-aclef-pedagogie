import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LogiqueAccueil() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Configuration des 5 activités de logique
    const activites = [
        {
            id: 'ranger',
            nom: 'Ranger',
            emoji: '↕️',
            couleur: '#8b5cf6',
            description: 'Mettre dans l\'ordre',
            route: '/compter/logique/ranger'
        },
        {
            id: 'trier',
            nom: 'Trier',
            emoji: '📁',
            couleur: '#22c55e',
            description: 'Classer par catégorie',
            route: '/compter/logique/trier'
        },
        {
            id: 'associer',
            nom: 'Associer',
            emoji: '🔗',
            couleur: '#3b82f6',
            description: 'Relier ce qui va ensemble',
            route: '/compter/logique/associer'
        },
        {
            id: 'compter',
            nom: 'Compter',
            emoji: '🔢',
            couleur: '#f59e0b',
            description: 'Comprendre les quantités',
            route: '/compter/logique/compter'
        },
        {
            id: 'memoriser',
            nom: 'Mémoriser',
            emoji: '🧠',
            couleur: '#ec4899',
            description: 'Retenir et retrouver',
            route: '/compter/logique/memoriser'
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
                        onClick={() => router.push('/compter')}
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
                    <span>🧩</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        LOGIQUE
                    </span>
                </h1>

                <p style={{
                    fontSize: 'clamp(14px, 3vw, 16px)',
                    color: '#6b7280',
                    marginBottom: '25px'
                }}>
                    Choisissez une activité :
                </p>

                {/* Grille des 5 activités */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '15px',
                    marginBottom: '25px'
                }}>
                    {activites.map((activite) => (
                        <button
                            key={activite.id}
                            onClick={() => router.push(activite.route)}
                            style={{
                                backgroundColor: activite.couleur,
                                color: 'white',
                                padding: '20px 15px',
                                borderRadius: '15px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: `0 4px 15px ${activite.couleur}40`,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: '120px',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)'
                                e.currentTarget.style.boxShadow = `0 8px 25px ${activite.couleur}50`
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = `0 4px 15px ${activite.couleur}40`
                            }}
                        >
                            <span style={{ fontSize: '36px' }}>{activite.emoji}</span>
                            <span style={{
                                fontSize: 'clamp(14px, 3vw, 18px)',
                                fontWeight: 'bold'
                            }}>
                                {activite.nom}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                opacity: 0.9
                            }}>
                                {activite.description}
                            </span>
                        </button>
                    ))}
                </div>

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
