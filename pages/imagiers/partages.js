import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ImagiersPartages() {
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
            loadSharedImagiers()
        }
    }, [])

    const loadSharedImagiers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/imagiers/shared-list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setImagiers(data.imagiers)
            }
        } catch (error) {
            console.error('Erreur chargement imagiers partagés:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const importImagier = async (imagier) => {
        if (!confirm(`📥 Importer "${imagier.titre}" dans vos imagiers ?`)) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/imagiers/duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imagier_id: imagier.id,
                    nouveau_titre: imagier.titre
                })
            })

            if (response.ok) {
                alert('✅ Imagier importé avec succès dans "Mes imagiers"')
            } else {
                alert('❌ Erreur lors de l\'importation')
            }
        } catch (error) {
            console.error('Erreur importation:', error)
            alert('❌ Erreur lors de l\'importation')
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
                        📚 Imagiers Partagés
                    </h1>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '18px'
                    }}>
                        Découvrez et importez les imagiers partagés par d'autres utilisateurs
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

                {/* Liste des imagiers partagés */}
                {imagiers.length === 0 ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '60px 40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
                        <h3 style={{ color: '#333', marginBottom: '10px' }}>
                            Aucun imagier partagé pour le moment
                        </h3>
                        <p style={{ color: '#666' }}>
                            Les imagiers partagés par d'autres utilisateurs apparaîtront ici
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

                                {/* Créateur */}
                                <div style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    marginBottom: '12px'
                                }}>
                                    Créé par <strong>{imagier.creator_name}</strong>
                                </div>

                                {/* Thème */}
                                {imagier.theme && (
                                    <span style={{
                                        display: 'inline-block',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
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

                                {/* Bouton importer */}
                                <button
                                    onClick={() => importImagier(imagier)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                >
                                    📥 Importer cet imagier
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
