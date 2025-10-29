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

    // États pour le mode édition
    const [editedTitre, setEditedTitre] = useState('')
    const [editedDescription, setEditedDescription] = useState('')
    const [editedTheme, setEditedTheme] = useState('')
    const [editedVoix, setEditedVoix] = useState('Paul')
    const [editedElements, setEditedElements] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [isAddingElement, setIsAddingElement] = useState(false)
    const [newElement, setNewElement] = useState({
        mot: '',
        image_url: '',
        commentaire: '',
        question: '',
        reponse: ''
    })

    // États pour la capture d'écran
    const [isCapturing, setIsCapturing] = useState(false)
    const [capturedImage, setCapturedImage] = useState(null)
    const [isCropping, setIsCropping] = useState(false)
    const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 })
    const [isSelecting, setIsSelecting] = useState(false)
    const [captureContext, setCaptureContext] = useState(null) // 'new' ou index

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
            // Initialiser les états d'édition
            setEditedTitre(imagierWithElements.titre)
            setEditedDescription(imagierWithElements.description || '')
            setEditedTheme(imagierWithElements.theme || '')
            setEditedVoix(imagierWithElements.voix || 'Paul')
            setEditedElements(imagierWithElements.elements || [])
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

    // Fonctions de capture d'écran Google Images
    const openGoogleImages = (mot) => {
        const searchTerm = mot?.trim() || 'image'
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&udm=2`
        window.open(googleUrl, '_blank', 'width=1200,height=800')
    }

    const captureScreen = async (context) => {
        try {
            setIsCapturing(true)
            setCaptureContext(context)

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' }
            })

            const video = document.createElement('video')
            video.srcObject = stream
            video.play()

            await new Promise(resolve => {
                video.onloadedmetadata = resolve
            })

            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0)

            stream.getTracks().forEach(track => track.stop())

            const imageData = canvas.toDataURL('image/png')
            setCapturedImage(imageData)
            setIsCropping(true)
            setIsCapturing(false)

        } catch (error) {
            console.error('Erreur capture:', error)
            if (error.name === 'NotAllowedError') {
                alert('❌ Vous devez autoriser la capture d\'écran pour utiliser cette fonctionnalité')
            } else {
                alert('❌ Erreur lors de la capture d\'écran')
            }
            setIsCapturing(false)
        }
    }

    const applyCrop = async () => {
        if (!capturedImage || cropData.width === 0 || cropData.height === 0) return

        try {
            const img = new Image()
            img.src = capturedImage

            await new Promise((resolve) => {
                img.onload = resolve
            })

            const displayedImg = document.getElementById('cropImage')
            const scaleX = img.naturalWidth / displayedImg.offsetWidth
            const scaleY = img.naturalHeight / displayedImg.offsetHeight

            const realX = cropData.x * scaleX
            const realY = cropData.y * scaleY
            const realWidth = cropData.width * scaleX
            const realHeight = cropData.height * scaleY

            const canvas = document.createElement('canvas')
            canvas.width = realWidth
            canvas.height = realHeight
            const ctx = canvas.getContext('2d')

            ctx.drawImage(
                img,
                realX, realY, realWidth, realHeight,
                0, 0, realWidth, realHeight
            )

            const compressedImage = canvas.toDataURL('image/jpeg', 0.7)

            // Assignation conditionnelle selon le contexte
            if (captureContext === 'new') {
                // Nouvel élément
                setNewElement(prev => ({
                    ...prev,
                    image_url: compressedImage
                }))
            } else {
                // Modification d'élément existant (captureContext = index)
                const newElements = [...editedElements]
                newElements[captureContext].image_url = compressedImage
                setEditedElements(newElements)
            }

            // Réinitialiser
            setCapturedImage(null)
            setIsCropping(false)
            setCropData({ x: 0, y: 0, width: 0, height: 0 })
            setIsSelecting(false)
            setCaptureContext(null)

        } catch (error) {
            console.error('Erreur recadrage:', error)
            alert('❌ Erreur lors du recadrage')
        }
    }

    const cancelCrop = () => {
        setCapturedImage(null)
        setIsCropping(false)
        setCropData({ x: 0, y: 0, width: 0, height: 0 })
        setIsSelecting(false)
        setCaptureContext(null)
    }

    const resetCropSelection = () => {
        setCropData({ x: 0, y: 0, width: 0, height: 0 })
        setIsSelecting(false)
    }

    // Variable pour stocker le contenu principal
    let mainContent = null

    if (isLoading) {
        mainContent = (
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
    } else if (!user) {
        mainContent = null
    } else if (mode === 'list') {
        mainContent = (
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
                                            <span>📷 {imagier.nombre_elements || 0} {imagier.nombre_elements > 1 ? 'images' : 'image'}</span>
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
    } else if (mode === 'view' && selectedImagier && selectedImagier.elements && selectedImagier.elements.length > 0) {
        const currentElement = selectedImagier.elements[currentIndex]

        mainContent = (
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
    } else if (mode === 'edit' && selectedImagier) {
        const handleUpdateElement = (index, field, value) => {
            const newElements = [...editedElements]
            newElements[index][field] = value
            setEditedElements(newElements)
        }

        const handleDeleteElement = async (elementId, index) => {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return

            try {
                const token = localStorage.getItem('token')
                const response = await fetch('/api/imagiers/delete-element', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ element_id: elementId })
                })

                if (response.ok) {
                    const newElements = editedElements.filter((_, i) => i !== index)
                    setEditedElements(newElements)
                    alert('✅ Élément supprimé')
                } else {
                    alert('❌ Erreur lors de la suppression')
                }
            } catch (error) {
                console.error('Erreur suppression élément:', error)
                alert('❌ Erreur lors de la suppression')
            }
        }

        const handleAddElement = async () => {
            if (!newElement.mot.trim()) {
                alert('❌ Le mot est obligatoire')
                return
            }
            if (!newElement.image_url) {
                alert('❌ L\'image est obligatoire')
                return
            }

            try {
                const token = localStorage.getItem('token')

                // Créer le nouvel élément via API
                const response = await fetch('/api/imagiers/add-element', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        imagier_id: selectedImagier.id,
                        mot: newElement.mot,
                        image_url: newElement.image_url,
                        commentaire: newElement.commentaire,
                        question: newElement.question,
                        reponse: newElement.reponse,
                        ordre: editedElements.length
                    })
                })

                if (!response.ok) {
                    throw new Error('Erreur ajout élément')
                }

                const data = await response.json()

                // Ajouter à la liste locale
                setEditedElements([...editedElements, data.element])

                // Réinitialiser le formulaire
                setNewElement({
                    mot: '',
                    image_url: '',
                    commentaire: '',
                    question: '',
                    reponse: ''
                })
                setIsAddingElement(false)

                alert('✅ Élément ajouté avec succès !')

            } catch (error) {
                console.error('Erreur ajout élément:', error)
                alert('❌ Erreur lors de l\'ajout de l\'élément')
            }
        }

        const handleSave = async () => {
            setIsSaving(true)

            try {
                const token = localStorage.getItem('token')

                // 1. Mettre à jour l'imagier
                const imagierResponse = await fetch('/api/imagiers/update', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        imagier_id: selectedImagier.id,
                        titre: editedTitre,
                        description: editedDescription,
                        theme: editedTheme,
                        voix: editedVoix
                    })
                })

                if (!imagierResponse.ok) {
                    throw new Error('Erreur mise à jour imagier')
                }

                // 2. Mettre à jour les éléments
                for (const element of editedElements) {
                    // Préparer les données - n'envoyer image_url QUE si c'est une nouvelle image (base64)
                    const updateData = {
                        element_id: element.id,
                        mot: element.mot,
                        commentaire: element.commentaire,
                        question: element.question,
                        reponse: element.reponse
                    }

                    // Envoyer l'image seulement si elle a été changée (commence par data:image)
                    if (element.image_url && element.image_url.startsWith('data:image')) {
                        updateData.image_url = element.image_url
                    }

                    const elementResponse = await fetch('/api/imagiers/update-element', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(updateData)
                    })

                    if (!elementResponse.ok) {
                        throw new Error(`Erreur mise à jour élément ${element.mot}`)
                    }
                }

                alert('✅ Imagier mis à jour avec succès !')
                setMode('list')
                loadImagiers()

            } catch (error) {
                console.error('Erreur sauvegarde:', error)
                alert('❌ Erreur lors de la sauvegarde')
            } finally {
                setIsSaving(false)
            }
        }

        mainContent = (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(24px, 5vw, 32px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        ✏️ Modifier l'imagier
                    </h1>

                    {/* Formulaire imagier */}
                    <div style={{
                        background: '#f9fafb',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>📝 Informations générales</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>
                                Titre *
                            </label>
                            <input
                                type="text"
                                value={editedTitre}
                                onChange={(e) => setEditedTitre(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>
                                Description
                            </label>
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>
                                    Thème
                                </label>
                                <input
                                    type="text"
                                    value={editedTheme}
                                    onChange={(e) => setEditedTheme(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#4b5563' }}>
                                    Voix
                                </label>
                                <select
                                    value={editedVoix}
                                    onChange={(e) => setEditedVoix(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '16px'
                                    }}
                                >
                                    <option value="Paul">Paul</option>
                                    <option value="Julie">Julie</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Liste des éléments */}
                    <div style={{
                        background: '#f9fafb',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#1f2937' }}>🖼️ Éléments ({editedElements.length})</h3>
                            <button
                                onClick={() => setIsAddingElement(true)}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ➕ Ajouter un élément
                            </button>
                        </div>

                        {/* Formulaire ajout élément */}
                        {isAddingElement && (
                            <div style={{
                                background: '#ecfdf5',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '15px'
                            }}>
                                <h4 style={{ marginBottom: '12px', color: '#10b981' }}>Nouvel élément</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                                            Mot *
                                        </label>
                                        <input
                                            type="text"
                                            value={newElement.mot}
                                            onChange={(e) => setNewElement({ ...newElement, mot: e.target.value })}
                                            placeholder="Ex: aspirateur"
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                                            Image *
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0]
                                                if (file) {
                                                    const img = new Image()
                                                    const reader = new FileReader()
                                                    reader.onload = (event) => { img.src = event.target.result }
                                                    img.onload = () => {
                                                        const maxWidth = 800
                                                        const maxHeight = 600
                                                        let width = img.width
                                                        let height = img.height
                                                        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth }
                                                        if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight }
                                                        const canvas = document.createElement('canvas')
                                                        canvas.width = width
                                                        canvas.height = height
                                                        const ctx = canvas.getContext('2d')
                                                        ctx.drawImage(img, 0, 0, width, height)
                                                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
                                                        setNewElement({ ...newElement, image_url: compressedBase64 })
                                                    }
                                                    reader.readAsDataURL(file)
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Boutons de capture d'écran */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <button
                                        type="button"
                                        onClick={() => openGoogleImages(newElement.mot)}
                                        disabled={!newElement.mot.trim()}
                                        style={{
                                            flex: 1,
                                            backgroundColor: newElement.mot.trim() ? '#3b82f6' : '#ccc',
                                            color: 'white',
                                            padding: '10px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: newElement.mot.trim() ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        🔍 Chercher sur Google Images
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => captureScreen('new')}
                                        disabled={isCapturing}
                                        style={{
                                            flex: 1,
                                            backgroundColor: isCapturing ? '#ccc' : '#10b981',
                                            color: 'white',
                                            padding: '10px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: isCapturing ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isCapturing ? '⏳ Capture...' : '📸 Capturer l\'image'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', textAlign: 'center' }}>
                                    💡 Astuce : Saisissez d'abord le mot, puis cherchez et capturez l'image depuis Google Images
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                                            Commentaire
                                        </label>
                                        <input
                                            type="text"
                                            value={newElement.commentaire}
                                            onChange={(e) => setNewElement({ ...newElement, commentaire: e.target.value })}
                                            placeholder="Description..."
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                                            Question
                                        </label>
                                        <input
                                            type="text"
                                            value={newElement.question}
                                            onChange={(e) => setNewElement({ ...newElement, question: e.target.value })}
                                            placeholder="Ex: À quoi sert cet objet ?"
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                                        Réponse
                                    </label>
                                    <input
                                        type="text"
                                        value={newElement.reponse}
                                        onChange={(e) => setNewElement({ ...newElement, reponse: e.target.value })}
                                        placeholder="Ex: À nettoyer le sol"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {newElement.image_url && (
                                    <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                                        <img
                                            src={newElement.image_url}
                                            alt="Aperçu"
                                            style={{
                                                width: '150px',
                                                height: '150px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '2px solid #10b981'
                                            }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={handleAddElement}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            padding: '10px 20px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✅ Ajouter
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAddingElement(false)
                                            setNewElement({ mot: '', image_url: '', commentaire: '', question: '', reponse: '' })
                                        }}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '10px 20px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ❌ Annuler
                                    </button>
                                </div>
                            </div>
                        )}

                        {editedElements.length === 0 ? (
                            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                                Aucun élément dans cet imagier
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {editedElements.map((element, index) => (
                                    <div
                                        key={element.id || index}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '15px',
                                            display: 'grid',
                                            gridTemplateColumns: '100px 1fr',
                                            gap: '15px',
                                            alignItems: 'start'
                                        }}
                                    >
                                        {/* Image + Bouton supprimer */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteElement(element.id, index)}
                                                title="Supprimer cet élément"
                                                style={{
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    padding: '6px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '16px',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                            <img
                                                src={element.image_url}
                                                alt={element.mot}
                                                style={{
                                                    width: '100px',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb'
                                                }}
                                            />
                                        </div>

                                        {/* Champs de modification */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
                                                    Mot *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={element.mot}
                                                    onChange={(e) => handleUpdateElement(index, 'mot', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
                                                    Commentaire
                                                </label>
                                                <input
                                                    type="text"
                                                    value={element.commentaire || ''}
                                                    onChange={(e) => handleUpdateElement(index, 'commentaire', e.target.value)}
                                                    placeholder="Description de l'image..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
                                                    Question
                                                </label>
                                                <input
                                                    type="text"
                                                    value={element.question || ''}
                                                    onChange={(e) => handleUpdateElement(index, 'question', e.target.value)}
                                                    placeholder="Ex: À quoi sert cet objet ?"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
                                                    Réponse
                                                </label>
                                                <input
                                                    type="text"
                                                    value={element.reponse || ''}
                                                    onChange={(e) => handleUpdateElement(index, 'reponse', e.target.value)}
                                                    placeholder="Ex: À nettoyer le sol"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>

                                            {/* Boutons de capture d'écran pour cet élément */}
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openGoogleImages(element.mot)}
                                                        disabled={!element.mot?.trim()}
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: element.mot?.trim() ? '#3b82f6' : '#ccc',
                                                            color: 'white',
                                                            padding: '8px',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            cursor: element.mot?.trim() ? 'pointer' : 'not-allowed'
                                                        }}
                                                    >
                                                        🔍 Chercher sur Google Images
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => captureScreen(index)}
                                                        disabled={isCapturing}
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: isCapturing ? '#ccc' : '#10b981',
                                                            color: 'white',
                                                            padding: '8px',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            cursor: isCapturing ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        {isCapturing ? '⏳ Capture...' : '📸 Capturer'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
                                                    Changer l'image
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0]
                                                        if (file) {
                                                            // Compresser l'image avant de l'envoyer
                                                            const img = new Image()
                                                            const reader = new FileReader()

                                                            reader.onload = (event) => {
                                                                img.src = event.target.result
                                                            }

                                                            img.onload = () => {
                                                                // Redimensionner max 800x600
                                                                const maxWidth = 800
                                                                const maxHeight = 600
                                                                let width = img.width
                                                                let height = img.height

                                                                if (width > maxWidth) {
                                                                    height = (height * maxWidth) / width
                                                                    width = maxWidth
                                                                }
                                                                if (height > maxHeight) {
                                                                    width = (width * maxHeight) / height
                                                                    height = maxHeight
                                                                }

                                                                const canvas = document.createElement('canvas')
                                                                canvas.width = width
                                                                canvas.height = height
                                                                const ctx = canvas.getContext('2d')
                                                                ctx.drawImage(img, 0, 0, width, height)

                                                                // Compresser en JPEG qualité 0.7
                                                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
                                                                handleUpdateElement(index, 'image_url', compressedBase64)
                                                            }

                                                            reader.readAsDataURL(file)
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Boutons d'action */}
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !editedTitre.trim()}
                            style={{
                                backgroundColor: isSaving || !editedTitre.trim() ? '#9ca3af' : '#10b981',
                                color: 'white',
                                padding: '15px 40px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: isSaving || !editedTitre.trim() ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSaving ? '💾 Sauvegarde...' : '💾 Sauvegarder'}
                        </button>

                        <button
                            onClick={() => setMode('list')}
                            disabled={isSaving}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '15px 40px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ❌ Annuler
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Rendu final : contenu principal + modal de recadrage
    return (
        <>
            {mainContent}

            {/* Modal de recadrage (s'affiche par-dessus tout) */}
            {isCropping && capturedImage && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                    }}>
                        <h3 style={{ margin: 0, color: '#333', textAlign: 'center' }}>
                            ✂️ Recadrer l'image
                        </h3>

                        <p style={{ margin: 0, color: '#666', fontSize: '14px', textAlign: 'center' }}>
                            {isSelecting && cropData.width > 0 && cropData.height > 0
                                ? '✅ Zone sélectionnée ! Cliquez sur "Utiliser cette zone" ou "Recommencer"'
                                : 'Cliquez et glissez pour sélectionner la zone à garder'}
                        </p>

                        <div style={{
                            position: 'relative',
                            maxWidth: '800px',
                            maxHeight: '600px',
                            overflow: 'auto',
                            border: '2px solid #ddd',
                            borderRadius: '8px'
                        }}>
                            <img
                                src={capturedImage}
                                alt="Capture"
                                id="cropImage"
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    userSelect: 'none',
                                    cursor: isSelecting ? 'default' : 'crosshair'
                                }}
                                onMouseDown={(e) => {
                                    // Ne pas créer de nouvelle zone si une zone existe déjà
                                    if (isSelecting) return

                                    setIsSelecting(true)
                                    const rect = e.target.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const y = e.clientY - rect.top
                                    setCropData({ x, y, width: 0, height: 0 })

                                    const handleMouseMove = (moveEvent) => {
                                        const newWidth = moveEvent.clientX - rect.left - x
                                        const newHeight = moveEvent.clientY - rect.top - y
                                        setCropData({ x, y, width: Math.abs(newWidth), height: Math.abs(newHeight) })
                                    }

                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove)
                                        document.removeEventListener('mouseup', handleMouseUp)
                                    }

                                    document.addEventListener('mousemove', handleMouseMove)
                                    document.addEventListener('mouseup', handleMouseUp)
                                }}
                            />
                            {cropData.width > 0 && cropData.height > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    left: cropData.x,
                                    top: cropData.y,
                                    width: cropData.width,
                                    height: cropData.height,
                                    border: '3px dashed #10b981',
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    pointerEvents: 'none'
                                }} />
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={applyCrop}
                                disabled={cropData.width === 0 || cropData.height === 0}
                                style={{
                                    backgroundColor: (cropData.width === 0 || cropData.height === 0) ? '#ccc' : '#10b981',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: (cropData.width === 0 || cropData.height === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                ✅ Utiliser cette zone
                            </button>
                            <button
                                onClick={resetCropSelection}
                                disabled={!isSelecting}
                                style={{
                                    backgroundColor: !isSelecting ? '#ccc' : '#f59e0b',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: !isSelecting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                🔄 Recommencer
                            </button>
                            <button
                                onClick={cancelCrop}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ❌ Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}