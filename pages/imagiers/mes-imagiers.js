import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MesImagiers() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imagiers, setImagiers] = useState([])
    const [selectedImagier, setSelectedImagier] = useState(null)
    const [mode, setMode] = useState('list') // 'list', 'view', 'edit'
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showDetails, setShowDetails] = useState(false)
    const [autoPlay, setAutoPlay] = useState(true)
    const [availableVoices, setAvailableVoices] = useState([
        { name: 'Paul', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7' },
        { name: 'Julie', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw' }
    ])
    const [selectedVoice, setSelectedVoice] = useState('Paul')
    const router = useRouter()

    // Système audio intelligent (ElevenLabs + Web Speech fallback)
    const speakText = async (text) => {
        if (!text.trim()) return

        const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice)
        if (!selectedVoiceObj) return

        // Créer clé de cache
        const cacheKey = `voice_${selectedVoice}_${btoa(text).replace(/[^a-zA-Z0-9]/g, '')}`

        // Vérifier le cache ElevenLabs
        const cachedAudio = localStorage.getItem(cacheKey)
        if (cachedAudio) {
            try {
                const audio = new Audio(cachedAudio)
                audio.play()
                return
            } catch (error) {
                localStorage.removeItem(cacheKey)
            }
        }

        // Essayer ElevenLabs en premier
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: selectedVoiceObj.id
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Sauvegarder en cache permanent
                try {
                    localStorage.setItem(cacheKey, data.audio)
                } catch (storageError) {
                    // Nettoyer les anciens caches si plein
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('voice_')) {
                            localStorage.removeItem(key)
                        }
                    })
                }

                const audio = new Audio(data.audio)
                audio.play()
                return
            }
        } catch (error) {
            // Fallback silencieux vers Web Speech API
        }

        // Utiliser Web Speech API en fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            window.speechSynthesis.speak(utterance)
        }
    }

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
            loadImagiers()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    // Lecture automatique quand on change d'image
    useEffect(() => {
        if (mode === 'view' && selectedImagier && selectedImagier.elements && autoPlay && selectedImagier.elements[currentIndex]) {
            const element = selectedImagier.elements[currentIndex]
            setTimeout(() => speakText(element.mot), 500)
        }
    }, [currentIndex, mode, selectedImagier, autoPlay])

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
                setImagiers(data.imagiers || [])
            } else {
                console.error('Erreur chargement imagiers')
            }
        } catch (error) {
            console.error('Erreur chargement imagiers:', error)
        }
    }

    const loadImagierWithElements = async (imagierId) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/imagiers/${imagierId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                return data.imagier
            } else {
                console.error('Erreur chargement imagier')
                return null
            }
        } catch (error) {
            console.error('Erreur chargement imagier:', error)
            return null
        }
    }

    const openViewer = async (imagier) => {
        const imagierWithElements = await loadImagierWithElements(imagier.id)
        if (imagierWithElements) {
            setSelectedImagier(imagierWithElements)
            setCurrentIndex(0)
            setShowDetails(false)
            setMode('view')
        }
    }

    const openEditor = async (imagier) => {
        const imagierWithElements = await loadImagierWithElements(imagier.id)
        if (imagierWithElements) {
            setSelectedImagier(imagierWithElements)
            setMode('edit')
        }
    }

    const nextImage = () => {
        if (selectedImagier && selectedImagier.elements && currentIndex < selectedImagier.elements.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setShowDetails(false)
        }
    }

    const prevImage = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
            setShowDetails(false)
        }
    }

    const deleteImagier = async (imagierId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet imagier ?')) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/imagiers/delete/${imagierId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                alert('✅ Imagier supprimé avec succès')
                loadImagiers()
                if (selectedImagier?.id === imagierId) {
                    setMode('list')
                    setSelectedImagier(null)
                }
            } else {
                alert('❌ Erreur lors de la suppression')
            }
        } catch (error) {
            console.error('Erreur suppression:', error)
            alert('❌ Erreur lors de la suppression')
        }
    }

    const duplicateImagier = async (imagier) => {
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
                    nouveau_titre: `${imagier.titre} (Copie)`
                })
            })

            if (response.ok) {
                alert('✅ Imagier dupliqué avec succès')
                loadImagiers()
            } else {
                alert('❌ Erreur lors de la duplication')
            }
        } catch (error) {
            console.error('Erreur duplication:', error)
            alert('❌ Erreur lors de la duplication')
        }
    }

    const regenerateImages = async (imagier) => {
        if (!confirm(`Régénérer les images de l'imagier "${imagier.titre}" ?\n\nCela remplacera toutes les images actuelles par de nouvelles images cohérentes.`)) {
            return
        }

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/imagiers/regenerate-images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imagierId: imagier.id
                })
            })

            if (response.ok) {
                const data = await response.json()
                alert(`✅ ${data.elements_updated} images régénérées avec succès !`)

                // Recharger l'imagier si on est en mode vue
                if (mode === 'view' && selectedImagier?.id === imagier.id) {
                    const updatedImagier = await loadImagierWithElements(imagier.id)
                    if (updatedImagier) {
                        setSelectedImagier(updatedImagier)
                    }
                }
            } else {
                const error = await response.json()
                alert(`❌ Erreur lors de la régénération: ${error.message}`)
            }
        } catch (error) {
            console.error('Erreur régénération images:', error)
            alert('❌ Erreur lors de la régénération des images')
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
                <div style={{ color: '#3b82f6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    // Mode Liste - Affichage des imagiers
    if (mode === 'list') {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        📚 Mes Imagiers
                    </h1>

                    {imagiers.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: '#f8f9fa',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📖</div>
                            <h3 style={{ marginBottom: '15px', color: '#333' }}>
                                Aucun imagier créé
                            </h3>
                            <p style={{ color: '#666', marginBottom: '25px' }}>
                                Commencez par créer votre premier imagier
                            </p>
                            <button
                                onClick={() => router.push('/imagiers/creer')}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '12px 25px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✨ Créer un imagier
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '20px',
                                marginBottom: '40px'
                            }}>
                                {imagiers.map(imagier => (
                                    <div key={imagier.id} style={{
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {/* En-tête */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '15px'
                                        }}>
                                            <div>
                                                <h3 style={{
                                                    margin: '0 0 5px 0',
                                                    color: '#333',
                                                    fontSize: '18px'
                                                }}>
                                                    {imagier.titre}
                                                </h3>
                                                <span style={{
                                                    backgroundColor: '#e0f2fe',
                                                    color: '#0369a1',
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {imagier.theme}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    onClick={() => duplicateImagier(imagier)}
                                                    style={{
                                                        backgroundColor: '#f59e0b',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Dupliquer"
                                                >
                                                    📋
                                                </button>
                                                <button
                                                    onClick={() => regenerateImages(imagier)}
                                                    style={{
                                                        backgroundColor: '#8b5cf6',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Régénérer les images"
                                                >
                                                    🖼️
                                                </button>
                                                <button
                                                    onClick={() => deleteImagier(imagier.id)}
                                                    style={{
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {imagier.description && (
                                            <p style={{
                                                color: '#666',
                                                fontSize: '14px',
                                                marginBottom: '15px',
                                                lineHeight: '1.4'
                                            }}>
                                                {imagier.description}
                                            </p>
                                        )}

                                        {/* Statistiques */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '20px',
                                            fontSize: '14px',
                                            color: '#666'
                                        }}>
                                            <span>📷 {imagier.elements?.length || 0} images</span>
                                            <span>🎵 Voix: {imagier.voix || 'Paul'}</span>
                                        </div>

                                        {/* Aperçu des premières images */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '5px',
                                            marginBottom: '20px',
                                            overflow: 'hidden'
                                        }}>
                                            {imagier.elements?.slice(0, 3).map((element, index) => (
                                                <img
                                                    key={index}
                                                    src={element.image_url}
                                                    alt={element.mot}
                                                    style={{
                                                        width: '60px',
                                                        height: '60px',
                                                        objectFit: 'cover',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e5e7eb'
                                                    }}
                                                />
                                            ))}
                                            {imagier.elements?.length > 3 && (
                                                <div style={{
                                                    width: '60px',
                                                    height: '60px',
                                                    backgroundColor: '#f3f4f6',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    color: '#666',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    +{imagier.elements.length - 3}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '10px'
                                        }}>
                                            <button
                                                onClick={() => openViewer(imagier)}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    padding: '10px 15px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                👁️ Voir
                                            </button>
                                            <button
                                                onClick={() => openEditor(imagier)}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    padding: '10px 15px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✏️ Modifier
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Bouton retour */}
                    <div style={{
                        textAlign: 'center',
                        marginTop: '40px'
                    }}>
                        <button
                            onClick={() => router.push('/imagiers')}
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
                            ← Retour aux imagiers
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Mode Visualisation - Diaporama
    if (mode === 'view' && selectedImagier && selectedImagier.elements && selectedImagier.elements.length > 0) {
        const currentElement = selectedImagier.elements[currentIndex]

        return (
            <div style={{
                minHeight: '100vh',
                background: '#1f2937',
                color: 'white',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Barre de contrôle supérieure */}
                <div style={{
                    background: 'rgba(0,0,0,0.7)',
                    padding: '15px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px' }}>{selectedImagier.titre}</h2>
                        <p style={{ margin: '2px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                            {currentIndex + 1} / {selectedImagier.elements.length}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Auto-play toggle */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={autoPlay}
                                onChange={(e) => setAutoPlay(e.target.checked)}
                            />
                            🔊 Auto
                        </label>

                        <button
                            onClick={() => setMode('list')}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: '8px 15px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕ Fermer
                        </button>
                    </div>
                </div>

                {/* Zone principale d'affichage */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    position: 'relative'
                }}>
                    {/* Bouton précédent */}
                    <button
                        onClick={prevImage}
                        disabled={currentIndex === 0}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            backgroundColor: currentIndex === 0 ? 'rgba(107,114,128,0.5)' : 'rgba(59,130,246,0.8)',
                            color: 'white',
                            padding: '15px 20px',
                            border: 'none',
                            borderRadius: '50px',
                            fontSize: '24px',
                            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                            zIndex: 10
                        }}
                    >
                        ←
                    </button>

                    {/* Image et informations */}
                    <div style={{
                        textAlign: 'center',
                        maxWidth: '600px',
                        width: '100%'
                    }}>
                        {/* Image */}
                        <img
                            src={currentElement.image_url}
                            alt={currentElement.mot}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '400px',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                            }}
                        />

                        {/* Mot principal */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <h1 style={{
                                fontSize: '36px',
                                fontWeight: 'bold',
                                margin: 0,
                                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                            }}>
                                {currentElement.mot}
                            </h1>
                            <button
                                onClick={() => speakText(currentElement.mot)}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '10px 15px',
                                    border: 'none',
                                    borderRadius: '50px',
                                    fontSize: '20px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔊
                            </button>
                        </div>

                        {/* Boutons d'informations */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {currentElement.commentaire && (
                                <button
                                    onClick={() => {
                                        setShowDetails(showDetails === 'commentaire' ? false : 'commentaire')
                                        if (showDetails !== 'commentaire') speakText(currentElement.commentaire)
                                    }}
                                    style={{
                                        backgroundColor: showDetails === 'commentaire' ? '#8b5cf6' : 'rgba(139,92,246,0.8)',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💬 Commentaire
                                </button>
                            )}

                            {currentElement.question && (
                                <button
                                    onClick={() => {
                                        setShowDetails(showDetails === 'question' ? false : 'question')
                                        if (showDetails !== 'question') speakText(currentElement.question)
                                    }}
                                    style={{
                                        backgroundColor: showDetails === 'question' ? '#f59e0b' : 'rgba(245,158,11,0.8)',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ❓ Question
                                </button>
                            )}

                            {currentElement.reponse && (
                                <button
                                    onClick={() => {
                                        setShowDetails(showDetails === 'reponse' ? false : 'reponse')
                                        if (showDetails !== 'reponse') speakText(currentElement.reponse)
                                    }}
                                    style={{
                                        backgroundColor: showDetails === 'reponse' ? '#10b981' : 'rgba(16,185,129,0.8)',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✅ Réponse
                                </button>
                            )}
                        </div>

                        {/* Affichage des détails */}
                        {showDetails && (
                            <div style={{
                                marginTop: '20px',
                                padding: '20px',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                borderRadius: '12px',
                                fontSize: '18px',
                                lineHeight: '1.5'
                            }}>
                                {showDetails === 'commentaire' && currentElement.commentaire}
                                {showDetails === 'question' && currentElement.question}
                                {showDetails === 'reponse' && currentElement.reponse}
                            </div>
                        )}
                    </div>

                    {/* Bouton suivant */}
                    <button
                        onClick={nextImage}
                        disabled={currentIndex === selectedImagier.elements.length - 1}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            backgroundColor: currentIndex === selectedImagier.elements.length - 1 ? 'rgba(107,114,128,0.5)' : 'rgba(59,130,246,0.8)',
                            color: 'white',
                            padding: '15px 20px',
                            border: 'none',
                            borderRadius: '50px',
                            fontSize: '24px',
                            cursor: currentIndex === selectedImagier.elements.length - 1 ? 'not-allowed' : 'pointer',
                            zIndex: 10
                        }}
                    >
                        →
                    </button>
                </div>

                {/* Barre de progression */}
                <div style={{
                    background: 'rgba(0,0,0,0.7)',
                    padding: '10px 20px'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        height: '4px',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: '#10b981',
                            height: '100%',
                            width: `${((currentIndex + 1) / selectedImagier.elements.length) * 100}%`,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            </div>
        )
    }

    // Mode Modification (à développer)
    if (mode === 'edit' && selectedImagier) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    textAlign: 'center',
                    padding: '60px 20px'
                }}>
                    <h1 style={{
                        fontSize: '32px',
                        marginBottom: '20px',
                        color: '#3b82f6'
                    }}>
                        ✏️ Mode Modification
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        color: '#666',
                        marginBottom: '30px'
                    }}>
                        Fonctionnalités avancées en cours de développement...
                    </p>
                    <div style={{
                        background: '#f0f9ff',
                        padding: '25px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ color: '#0369a1', marginBottom: '15px' }}>🚀 Fonctionnalités à venir :</h3>
                        <ul style={{ color: '#666', lineHeight: '1.8' }}>
                            <li>✏️ Modifier images, mots, commentaires</li>
                            <li>🎙️ Enregistrer sa propre voix</li>
                            <li>➕ Ajouter/supprimer des éléments</li>
                            <li>🤖 Génération automatique Q&R avec Gemini</li>
                            <li>📋 Duplication et organisation avancée</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => setMode('list')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour à la liste
                    </button>
                </div>
            </div>
        )
    }

    return null
}