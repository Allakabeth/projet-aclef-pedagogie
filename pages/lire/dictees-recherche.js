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

export default function DicteesRecherche() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState(new Set())
    const [selectedModeForMobile, setSelectedModeForMobile] = useState(null)
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

    // Fonction TTS pour lire les descriptions des modes
    const speakModeDescription = async (mode) => {
        let textToSpeak = ''

        if (mode === 'auto-evaluation') {
            textToSpeak = 'Mode Tranquille. Lisez la phrase créée. Écoutez-la si besoin. Dites j\'ai réussi ! Pas de pression.'
        } else if (mode === 'evaluation') {
            textToSpeak = 'Mode Défi. Écoutez la phrase créée. Répétez-la de mémoire. Vérifiez avec le texte. Plus dur !'
        }

        if (!textToSpeak) return

        // Essayer ElevenLabs en premier
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7' // Paul (voix d'homme)
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible, utilisation Web Speech API')
        }

        // Fallback vers Web Speech API avec voix masculine
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak)
            utterance.lang = 'fr-FR'
            utterance.rate = 1.0

            // Chercher une voix masculine française
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme'))
            ) || voices.find(voice => voice.lang.includes('fr'))

            if (maleVoice) {
                utterance.voice = maleVoice
            }

            window.speechSynthesis.speak(utterance)
        }
    }

    const startMode = (mode) => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }

        // Lire la description du mode
        speakModeDescription(mode)

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
            <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
            <div style={{
                maxWidth: window.innerWidth <= 768 ? '800px' : '100%',
                margin: '0 auto',
                padding: window.innerWidth <= 768 ? '0' : '0 20px'
            }}>
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>🔍</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Dictées Recherche
                    </span>
                </h1>

                {window.innerWidth > 768 && (
                    <p style={{
                        textAlign: 'center',
                        marginBottom: '20px',
                        color: '#666',
                        fontSize: '16px'
                    }}>
                        Créer des nouvelles phrases avec vos groupes de sens !
                    </p>
                )}

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '40px'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
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
                    {window.innerWidth <= 768 && (
                        <>
                            <button
                                onClick={() => {
                                    if (selectedTextes.size === 0) {
                                        alert('Sélectionnez au moins un texte avant de commencer')
                                        return
                                    }
                                    startMode('auto-evaluation')
                                }}
                                style={{
                                    width: '55px',
                                    height: '55px',
                                    backgroundColor: 'white',
                                    color: '#10b981',
                                    border: '2px solid #10b981',
                                    borderRadius: '12px',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                😌
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedTextes.size === 0) {
                                        alert('Sélectionnez au moins un texte avant de commencer')
                                        return
                                    }
                                    startMode('evaluation')
                                }}
                                style={{
                                    width: '55px',
                                    height: '55px',
                                    backgroundColor: 'white',
                                    color: '#3b82f6',
                                    border: '2px solid #3b82f6',
                                    borderRadius: '12px',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🎤
                            </button>
                        </>
                    )}
                </div>

{textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        border: '1px solid #ffeaa7',
                        marginBottom: '40px'
                    }}>
                        <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            Créez d'abord un texte de référence dans "📚 Mes textes références"
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: window.innerWidth <= 768 ? 'block' : 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '300px 1fr 300px',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        {/* COLONNE GAUCHE - Mode Tranquille (Desktop only) */}
                        <div className="desktop-only" style={{
                            background: 'white',
                            padding: '25px',
                            borderRadius: '12px',
                            border: '2px solid #10b981',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>😌</div>
                            <h3 style={{
                                color: '#10b981',
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                Mode Tranquille
                            </h3>

                            <p style={{
                                color: '#666',
                                marginBottom: '20px',
                                lineHeight: '1.5',
                                fontSize: '14px'
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
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: selectedTextes.size === 0 ? 'not-allowed' : 'pointer',
                                    width: '100%'
                                }}
                            >
                                ✅ Commencer
                            </button>
                        </div>

                        {/* COLONNE CENTRE - Liste des textes */}
                        <div style={{
                            background: window.innerWidth <= 768 ? 'transparent' : '#f8f9fa',
                            padding: window.innerWidth <= 768 ? '0' : '30px',
                            borderRadius: window.innerWidth <= 768 ? '0' : '12px'
                        }}>
                            <h2 className="desktop-only" style={{
                                marginBottom: '20px',
                                color: '#333',
                                fontSize: '20px',
                                textAlign: 'center'
                            }}>
                                📚 Choisissez vos textes ({selectedTextes.size} sélectionné{selectedTextes.size > 1 ? 's' : ''})
                            </h2>

                            <div style={{ display: 'grid', gap: '15px' }}>
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
                                            onClick={() => toggleTexteSelection(texte.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                padding: '15px',
                                                background: couleur.bg,
                                                borderRadius: '12px',
                                                border: selectedTextes.has(texte.id) ? '3px solid #10b981' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: selectedTextes.has(texte.id)
                                                    ? `0 8px 24px ${couleur.shadow}, 0 0 0 3px rgba(16, 185, 129, 0.2)`
                                                    : `0 4px 12px ${couleur.shadow}`
                                            }}
                                        >
                                            {window.innerWidth > 768 && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTextes.has(texte.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation()
                                                        toggleTexteSelection(texte.id)
                                                    }}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                        accentColor: '#10b981',
                                                        flexShrink: 0,
                                                        margin: 0
                                                    }}
                                                />
                                            )}
                                            <div style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '15px'
                                            }}>
                                                <div style={{
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    {texte.titre}
                                                </div>
                                                {window.innerWidth > 768 && (
                                                    <div style={{
                                                        fontSize: '14px',
                                                        color: 'white',
                                                        whiteSpace: 'nowrap',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                    }}>
                                                        {texte.nombre_mots_total} mots • {texte.nombre_groupes} groupes de sens
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* COLONNE DROITE - Mode Défi (Desktop only) */}
                        <div className="desktop-only" style={{
                            background: 'white',
                            padding: '25px',
                            borderRadius: '12px',
                            border: '2px solid #3b82f6',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎤</div>
                            <h3 style={{
                                color: '#3b82f6',
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                Mode Défi
                            </h3>

                            <p style={{
                                color: '#666',
                                marginBottom: '20px',
                                lineHeight: '1.5',
                                fontSize: '14px'
                            }}>
                                • Écoutez la phrase créée<br/>
                                • Répétez-la de mémoire<br/>
                                • Vérifiez avec le texte<br/>
                                • Plus de défi !
                            </p>

                            <button
                                onClick={() => startMode('evaluation')}
                                disabled={selectedTextes.size === 0}
                                style={{
                                    backgroundColor: selectedTextes.size === 0 ? '#ccc' : '#3b82f6',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: selectedTextes.size === 0 ? 'not-allowed' : 'pointer',
                                    width: '100%'
                                }}
                            >
                                🎤 Commencer
                            </button>
                        </div>
                    </div>
                )}


            </div>
        </div>
    )
}