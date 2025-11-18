import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SegmentationChoix() {
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
                <div style={{ color: '#f59e0b', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

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
                maxWidth: '800px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    ✂️ Segmentation des Syllabes
                </h1>

                <p style={{
                    fontSize: '18px',
                    color: '#666',
                    marginBottom: '40px',
                    lineHeight: '1.5'
                }}>
                    Choisissez le type de texte sur lequel vous souhaitez vous entraîner à segmenter les syllabes :
                </p>

                {/* Grille des options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '30px',
                    marginBottom: '40px'
                }}>
                    {/* Textes références */}
                    <div 
                        onClick={() => router.push('/lire/segmentation-syllabes')}
                        style={{
                            background: 'white',
                            padding: '30px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            border: '2px solid #10b981',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '20px'
                        }}>
                            📚
                        </div>
                        <h3 style={{
                            fontSize: '22px',
                            fontWeight: 'bold',
                            color: '#10b981',
                            marginBottom: '15px'
                        }}>
                            Textes Références
                        </h3>
                        <p style={{
                            color: '#666',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            marginBottom: '20px'
                        }}>
                            Entraînez-vous sur des textes pédagogiques sélectionnés et adaptés à votre niveau d'apprentissage.
                        </p>
                        <div style={{
                            background: '#ecfdf5',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#047857'
                        }}>
                            ✨ Recommandé pour débuter
                        </div>
                    </div>

                    {/* Import de textes */}
                    <div 
                        onClick={() => router.push('/lire/segmentation-import')}
                        style={{
                            background: 'white',
                            padding: '30px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            border: '2px solid #f59e0b',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '20px'
                        }}>
                            📤
                        </div>
                        <h3 style={{
                            fontSize: '22px',
                            fontWeight: 'bold',
                            color: '#f59e0b',
                            marginBottom: '15px'
                        }}>
                            Import de Textes
                        </h3>
                        <p style={{
                            color: '#666',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            marginBottom: '20px'
                        }}>
                            Importez vos propres textes (Word, OpenDocument, TXT) et entraînez-vous à les segmenter.
                        </p>
                        <div style={{
                            background: '#fef3c7',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#92400e'
                        }}>
                            🚀 Pour utilisateurs avancés
                        </div>
                    </div>
                </div>

                {/* Bouton retour */}
                <button
                    onClick={() => router.push('/lire')}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour aux activités
                </button>

                {/* Info utilisateur */}
                <div style={{
                    marginTop: '30px',
                    padding: '15px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#64748b'
                }}>
                    Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}