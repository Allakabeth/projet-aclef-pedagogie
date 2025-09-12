import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MesTextesReferences() {
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

    const handleRetourLire = () => {
        router.push('/lire')
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
                    <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(20px, 5vw, 26px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    📚 Mes textes références
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(25px, 6vw, 40px)',
                    lineHeight: '1.4'
                }}>
                    Que voulez-vous faire ?
                </p>

                {/* Menu réorganisé pour non-lecteurs */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(15px, 4vw, 20px)',
                    marginBottom: 'clamp(20px, 5vw, 30px)'
                }}>
                    <button
                        onClick={() => router.push('/lire/voir-mes-textes')}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: 'clamp(20px, 5vw, 25px)',
                            border: 'none',
                            fontSize: 'clamp(16px, 4vw, 18px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            width: '100%'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📖 Voir mes textes
                    </button>

                    <button
                        onClick={() => router.push('/lire/creer-texte-manuel')}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: 'clamp(20px, 5vw, 25px)',
                            border: 'none',
                            fontSize: 'clamp(16px, 4vw, 18px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            width: '100%'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        ✍️ Créer un texte
                    </button>

                    <button
                        onClick={() => router.push('/lire/importer-texte')}
                        style={{
                            backgroundColor: '#0284c7',
                            color: 'white',
                            padding: 'clamp(20px, 5vw, 25px)',
                            border: 'none',
                            fontSize: 'clamp(16px, 4vw, 18px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            width: '100%'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        📂 Importer un texte
                    </button>

                    <button
                        onClick={() => router.push('/lire/enregistrer-texte')}
                        style={{
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: 'clamp(20px, 5vw, 25px)',
                            border: 'none',
                            fontSize: 'clamp(16px, 4vw, 18px)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            width: '100%'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        🎤 Enregistrer un texte
                    </button>



                </div>

                {/* Bouton Retour */}
                <button
                    onClick={handleRetourLire}
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
                    ← Retour à Lire
                </button>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f0fdf4',
                    fontSize: '12px',
                    color: '#166534'
                }}>
                    Textes références - <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}