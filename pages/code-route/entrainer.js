import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function EntrainerCodeRoute() {
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
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#666', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '800px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(24px, 5vw, 32px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#10b981'
                }}>
                    🏋️ S'entraîner au Code de la Route
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(25px, 5vw, 40px)',
                    lineHeight: '1.4'
                }}>
                    Pratiquez et testez vos connaissances
                </p>

                {/* Zone de contenu */}
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: 'clamp(20px, 4vw, 30px)',
                    borderRadius: '15px',
                    marginBottom: 'clamp(20px, 4vw, 30px)',
                    textAlign: 'left'
                }}>
                    <p style={{
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#475569',
                        textAlign: 'center',
                        margin: '20px 0'
                    }}>
                        Cette page proposera des exercices d'entraînement.<br />
                        Contenu à venir...
                    </p>
                </div>

                {/* Bouton Retour */}
                <button
                    onClick={() => router.push('/code-route')}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        borderRadius: '25px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(107, 114, 128, 0.3)',
                        transition: 'all 0.3s ease',
                        marginTop: '10px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ↩️ Retour au menu Code de la route
                </button>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    Connecté en tant que : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}
