import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DicteesRecherche() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState(new Set())
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
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
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
                console.error('Erreur chargement textes')
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const toggleTexteSelection = (texteId) => {
        const newSelected = new Set(selectedTextes)
        if (newSelected.has(texteId)) {
            newSelected.delete(texteId)
        } else {
            newSelected.add(texteId)
        }
        setSelectedTextes(newSelected)
    }

    const startMode = (mode) => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }

        // Sauvegarder la sélection de textes
        localStorage.setItem('dictee-recherche-textes', JSON.stringify(Array.from(selectedTextes)))
        
        // Rediriger vers la page du mode choisi
        if (mode === 'evaluation') {
            router.push('/lire/dictees-recherche/evaluation')
        } else {
            router.push('/lire/dictees-recherche/auto-evaluation')
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
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
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🔍 Dictées Recherche
                </h1>

                <p style={{ 
                    textAlign: 'center', 
                    marginBottom: '40px', 
                    color: '#666',
                    fontSize: '18px'
                }}>
                    L'intelligence artificielle va créer une nouvelle phrase avec vos groupes de sens !
                </p>

                {/* Sélection des textes */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '30px',
                    borderRadius: '12px',
                    marginBottom: '40px'
                }}>
                    <h2 style={{ 
                        marginBottom: '20px', 
                        color: '#333',
                        fontSize: '20px'
                    }}>
                        📚 Choisissez vos textes ({selectedTextes.size} sélectionné{selectedTextes.size > 1 ? 's' : ''})
                    </h2>
                    
                    {textes.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            background: '#fff3cd',
                            borderRadius: '8px',
                            border: '1px solid #ffeaa7'
                        }}>
                            <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                            <p style={{ fontSize: '14px', color: '#666' }}>
                                Créez d'abord un texte de référence dans "📚 Mes textes références"
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {textes.map(texte => (
                                <label key={texte.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    padding: '20px',
                                    background: selectedTextes.has(texte.id) ? '#e8f5e8' : 'white',
                                    borderRadius: '8px',
                                    border: selectedTextes.has(texte.id) ? '3px solid #10b981' : '2px solid #ddd',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTextes.has(texte.id)}
                                        onChange={() => toggleTexteSelection(texte.id)}
                                        style={{
                                            transform: 'scale(1.5)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div>
                                        <div style={{ 
                                            fontSize: '18px', 
                                            fontWeight: 'bold',
                                            marginBottom: '5px'
                                        }}>
                                            {texte.titre}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#666' }}>
                                            {texte.nombre_mots_total} mots • {texte.nombre_groupes} groupes de sens
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Choix du mode */}
                {textes.length > 0 && (
                    <div style={{
                        background: '#f0f9ff',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '30px'
                    }}>
                        <h2 style={{ 
                            marginBottom: '25px', 
                            color: '#0369a1',
                            fontSize: '20px',
                            textAlign: 'center'
                        }}>
                            🎯 Comment voulez-vous vous entraîner ?
                        </h2>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {/* Mode Auto-évaluation */}
                            <div style={{
                                background: 'white',
                                padding: '25px',
                                borderRadius: '12px',
                                border: '2px solid #10b981',
                                textAlign: 'center'
                            }}>
                                <div style={{ 
                                    fontSize: '48px', 
                                    marginBottom: '15px'
                                }}>
                                    😌
                                </div>
                                <h3 style={{ 
                                    color: '#10b981', 
                                    marginBottom: '15px',
                                    fontSize: '20px'
                                }}>
                                    Mode Tranquille
                                </h3>
                                <p style={{ 
                                    color: '#666', 
                                    marginBottom: '20px',
                                    lineHeight: '1.5'
                                }}>
                                    • Lisez la phrase créée<br/>
                                    • Écoutez-la si besoin<br/>
                                    • Dites "J'ai réussi !"<br/>
                                    • Pas de pression
                                </p>
                                <button
                                    onClick={() => startMode('auto-evaluation')}
                                    disabled={selectedTextes.size === 0}
                                    style={{
                                        backgroundColor: selectedTextes.size === 0 ? '#ccc' : '#10b981',
                                        color: 'white',
                                        padding: '15px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: selectedTextes.size === 0 ? 'not-allowed' : 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    ✅ Je choisis le mode tranquille
                                </button>
                            </div>

                            {/* Mode Évaluation */}
                            <div style={{
                                background: 'white',
                                padding: '25px',
                                borderRadius: '12px',
                                border: '2px solid #3b82f6',
                                textAlign: 'center'
                            }}>
                                <div style={{ 
                                    fontSize: '48px', 
                                    marginBottom: '15px'
                                }}>
                                    🎤
                                </div>
                                <h3 style={{ 
                                    color: '#3b82f6', 
                                    marginBottom: '15px',
                                    fontSize: '20px'
                                }}>
                                    Mode Défi
                                </h3>
                                <p style={{ 
                                    color: '#666', 
                                    marginBottom: '20px',
                                    lineHeight: '1.5'
                                }}>
                                    • Lisez la phrase créée<br/>
                                    • Répétez-la au microphone<br/>
                                    • Voyez votre score détaillé<br/>
                                    • Perfectionnez-vous !
                                </p>
                                <button
                                    onClick={() => startMode('evaluation')}
                                    disabled={selectedTextes.size === 0}
                                    style={{
                                        backgroundColor: selectedTextes.size === 0 ? '#ccc' : '#3b82f6',
                                        color: 'white',
                                        padding: '15px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: selectedTextes.size === 0 ? 'not-allowed' : 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    🚀 Je choisis le mode défi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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