import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// Styles pour masquer les éléments sur mobile
const mobileStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }
`

export default function ReconnaitreLesMotsNew() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const router = useRouter()
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

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
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
        setIsLoadingTextes(true)
        try {
            const token = localStorage.getItem('token')

            const response = await fetch('/api/textes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setTextes(data.textes || [])
            } else {
                const errorData = await response.json()
                console.error('Erreur chargement textes:', errorData)
                alert(`Erreur: ${errorData.error || 'Impossible de charger les textes'}`)
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
            alert('Erreur de connexion au serveur')
        } finally {
            setIsLoadingTextes(false)
        }
    }

    const startExercices = () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        // Redirection vers la page d'exercices avec les IDs des textes sélectionnés
        const textesIds = selectedTextes.join(',')
        router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${textesIds}`)
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white'
            }}>
                <p>Chargement...</p>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>🎯</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Reconnaître les mots
                    </span>
                </h1>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#0ea5e9',
                            border: '2px solid #0ea5e9',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#8b5cf6',
                            border: '2px solid #8b5cf6',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                </div>

                {/* Sélection des textes */}
                {!isMobile && <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>📚 Sélectionner les textes</h3>}

                {isLoadingTextes ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        fontSize: '16px',
                        color: '#666'
                    }}>
                        Chargement des textes...
                    </div>
                ) : textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '20px',
                        border: '2px dashed #0ea5e9',
                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.1)'
                    }}>
                        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                            Aucun texte disponible
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '15px',
                        marginBottom: '20px'
                    }}>
                        {textes.map((texte, index) => {
                            const couleurs = [
                                { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
                                { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(240, 147, 251, 0.3)' },
                                { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79, 172, 254, 0.3)' },
                                { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.3)' },
                                { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', shadow: 'rgba(250, 112, 154, 0.3)' },
                                { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', shadow: 'rgba(168, 237, 234, 0.3)' },
                                { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', shadow: 'rgba(255, 154, 158, 0.3)' },
                                { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', shadow: 'rgba(255, 236, 210, 0.3)' }
                            ]
                            const couleur = couleurs[index % couleurs.length]

                            return (
                                <div
                                    key={texte.id}
                                    onClick={() => {
                                        if (selectedTextes.includes(texte.id)) {
                                            setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                        } else {
                                            setSelectedTextes([...selectedTextes, texte.id])
                                        }
                                    }}
                                    style={{
                                        background: couleur.bg,
                                        border: selectedTextes.includes(texte.id) ? '3px solid #0ea5e9' : 'none',
                                        borderRadius: '20px',
                                        padding: isMobile ? '10px 15px' : '15px',
                                        boxShadow: selectedTextes.includes(texte.id)
                                            ? `0 8px 25px ${couleur.shadow}, 0 0 0 3px #0ea5e9`
                                            : `0 4px 15px ${couleur.shadow}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        transform: selectedTextes.includes(texte.id) ? 'scale(1.02)' : 'scale(1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {/* Checkbox PC uniquement */}
                                    {!isMobile && (
                                        <input
                                            type="checkbox"
                                            checked={selectedTextes.includes(texte.id)}
                                            onChange={(e) => {
                                                e.stopPropagation()
                                                if (e.target.checked) {
                                                    setSelectedTextes([...selectedTextes, texte.id])
                                                } else {
                                                    setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                                }
                                            }}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#0ea5e9'
                                            }}
                                        />
                                    )}

                                    {/* Contenu : titre + stats (PC) ou titre seul (mobile) */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: isMobile ? 'center' : 'space-between',
                                        alignItems: 'center',
                                        width: '100%',
                                        gap: '10px'
                                    }}>
                                        <div style={{
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            flex: '1',
                                            textAlign: isMobile ? 'center' : 'left',
                                            whiteSpace: isMobile ? 'nowrap' : 'normal',
                                            overflow: isMobile ? 'hidden' : 'visible',
                                            textOverflow: isMobile ? 'ellipsis' : 'clip'
                                        }}>
                                            {texte.titre}
                                        </div>
                                        {!isMobile && (
                                            <div style={{
                                                color: 'rgba(255,255,255,0.9)',
                                                fontSize: '12px',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                📊 {texte.nombre_groupes} groupes de sens
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Bouton Commencer */}
                <button
                    onClick={startExercices}
                    disabled={selectedTextes.length === 0}
                    style={{
                        background: 'white',
                        color: selectedTextes.length > 0 ? '#0ea5e9' : '#ccc',
                        padding: '15px 30px',
                        border: selectedTextes.length > 0 ? '2px solid #0ea5e9' : '2px solid #ccc',
                        borderRadius: '20px',
                        fontSize: '18px',
                        fontWeight: 'normal',
                        cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
                        marginTop: '20px',
                        width: '100%',
                        transition: 'all 0.3s ease'
                    }}
                >
                    Commencer
                </button>
            </div>
        </div>
    )
}
