import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CreerImagier() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imagier, setImagier] = useState({
        titre: '',
        theme: '',
        description: ''
    })
    const [elements, setElements] = useState([])
    const [currentElement, setCurrentElement] = useState({
        mot: '',
        image: null,
        imagePreview: null,
        commentaire: '',
        question: '',
        reponse: ''
    })
    const [mode, setMode] = useState('manual') // 'manual' ou 'auto'
    const [isAddingElement, setIsAddingElement] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isProcessingImages, setIsProcessingImages] = useState(false)
    const [editingElementId, setEditingElementId] = useState(null)
    const [editingElementName, setEditingElementName] = useState('')
    const [isCapturing, setIsCapturing] = useState(false)
    const [capturedImage, setCapturedImage] = useState(null)
    const [isCropping, setIsCropping] = useState(false)
    const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 })
    const [isSelecting, setIsSelecting] = useState(false)
    const [availableVoices, setAvailableVoices] = useState([
        { name: 'Paul', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7' },
        { name: 'Julie', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw' }
    ])
    const [selectedVoice, setSelectedVoice] = useState('Paul')
    const [autoParams, setAutoParams] = useState({
        theme: '',
        niveau: 'debutant',
        nombreElements: 10,
        styleImages: 'realiste',
        includeQuestions: true
    })
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
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)

        // Charger les voix Web Speech comme fallback
        const loadWebSpeechVoices = () => {
            if ('speechSynthesis' in window) {
                const webVoices = speechSynthesis.getVoices()

                const paulFallback = webVoices.find(voice =>
                    voice.lang.includes('fr') &&
                    (voice.name.toLowerCase().includes('paul') ||
                     voice.name.toLowerCase().includes('thomas') ||
                     voice.name.toLowerCase().includes('male'))
                ) || webVoices.find(voice => voice.lang.includes('fr'))

                const julieFallback = webVoices.find(voice =>
                    voice.lang.includes('fr') &&
                    (voice.name.toLowerCase().includes('julie') ||
                     voice.name.toLowerCase().includes('marie') ||
                     voice.name.toLowerCase().includes('female'))
                ) || webVoices.find(voice => voice.lang.includes('fr'))

                setAvailableVoices(prev => [
                    { ...prev[0], fallback: paulFallback },
                    { ...prev[1], fallback: julieFallback }
                ])
            }
        }

        loadWebSpeechVoices()
        if ('speechSynthesis' in window) {
            speechSynthesis.addEventListener('voiceschanged', loadWebSpeechVoices)
            return () => speechSynthesis.removeEventListener('voiceschanged', loadWebSpeechVoices)
        }
    }, [router])

    // Fonction pour compresser une image
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let width = img.width
                    let height = img.height

                    // Redimensionner si trop grand
                    const maxSize = 800
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize
                            width = maxSize
                        } else {
                            width = (width / height) * maxSize
                            height = maxSize
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)

                    // Convertir en base64
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
                    resolve(compressedBase64)
                }
                img.onerror = reject
                img.src = e.target.result
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Vérifier le type de fichier
            if (!file.type.startsWith('image/')) {
                alert('Veuillez sélectionner un fichier image valide')
                return
            }

            // Vérifier la taille (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('L\'image ne doit pas dépasser 5MB')
                return
            }

            // Créer un aperçu
            const reader = new FileReader()
            reader.onload = (e) => {
                setCurrentElement(prev => ({
                    ...prev,
                    image: file,
                    imagePreview: e.target.result
                }))
            }
            reader.readAsDataURL(file)
        }
    }

    // Traiter plusieurs images à la fois
    const handleMultipleImages = async (files) => {
        setIsProcessingImages(true)

        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                return false
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} dépasse 5MB et sera ignoré`)
                return false
            }
            return true
        })

        if (validFiles.length === 0) {
            alert('Aucune image valide trouvée')
            setIsProcessingImages(false)
            return
        }

        try {
            const newElements = []

            for (const file of validFiles) {
                // Extraire le nom sans extension
                const fileName = file.name.replace(/\.[^/.]+$/, '')

                // Compresser l'image
                const compressedImage = await compressImage(file)

                // Créer un objet File à partir du base64 pour la compatibilité
                const blob = await fetch(compressedImage).then(r => r.blob())
                const newFile = new File([blob], file.name, { type: 'image/jpeg' })

                newElements.push({
                    id: Date.now() + Math.random(),
                    mot: fileName,
                    image: newFile,
                    imagePreview: compressedImage,
                    commentaire: '',
                    question: '',
                    reponse: ''
                })

                // Petit délai pour éviter de bloquer l'interface
                await new Promise(resolve => setTimeout(resolve, 50))
            }

            setElements(prev => [...prev, ...newElements])
            alert(`✅ ${newElements.length} élément(s) ajouté(s) avec succès !`)
        } catch (error) {
            console.error('Erreur traitement images:', error)
            alert('❌ Erreur lors du traitement des images')
        } finally {
            setIsProcessingImages(false)
        }
    }

    // Drag & Drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleMultipleImages(files)
        }
    }

    // Handler pour le sélecteur de fichiers multiple
    const handleFileInputChange = (e) => {
        const files = e.target.files
        if (files.length > 0) {
            handleMultipleImages(files)
        }
    }

    const addElement = () => {
        if (!currentElement.mot.trim()) {
            alert('Veuillez saisir un mot')
            return
        }

        if (!currentElement.image) {
            alert('Veuillez sélectionner une image')
            return
        }

        const newElement = {
            id: Date.now(),
            mot: currentElement.mot.trim(),
            image: currentElement.image,
            imagePreview: currentElement.imagePreview,
            commentaire: currentElement.commentaire.trim(),
            question: currentElement.question.trim(),
            reponse: currentElement.reponse.trim()
        }

        setElements(prev => [...prev, newElement])

        // Réinitialiser le formulaire
        setCurrentElement({
            mot: '',
            image: null,
            imagePreview: null,
            commentaire: '',
            question: '',
            reponse: ''
        })

        setIsAddingElement(false)
    }

    const removeElement = (elementId) => {
        setElements(prev => prev.filter(el => el.id !== elementId))
    }

    const startEditingElementName = (element) => {
        setEditingElementId(element.id)
        setEditingElementName(element.mot)
    }

    const saveElementName = (elementId) => {
        if (editingElementName.trim()) {
            setElements(prev => prev.map(el =>
                el.id === elementId ? { ...el, mot: editingElementName.trim() } : el
            ))
        }
        setEditingElementId(null)
        setEditingElementName('')
    }

    const cancelEditingElementName = () => {
        setEditingElementId(null)
        setEditingElementName('')
    }

    // Ouvrir Google Images pour rechercher
    const openGoogleImages = () => {
        const searchTerm = currentElement.mot.trim() || 'image'
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&udm=2`
        window.open(googleUrl, '_blank', 'width=1200,height=800')
    }

    // Capturer l'écran avec Screen Capture API
    const captureScreen = async () => {
        try {
            setIsCapturing(true)

            // Demander à l'utilisateur de choisir ce qu'il veut capturer
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' }
            })

            // Créer un élément vidéo temporaire
            const video = document.createElement('video')
            video.srcObject = stream
            video.play()

            // Attendre que la vidéo soit prête
            await new Promise(resolve => {
                video.onloadedmetadata = resolve
            })

            // Capturer une frame dans un canvas
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0)

            // Arrêter le stream
            stream.getTracks().forEach(track => track.stop())

            // Convertir en image
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

    // Appliquer le recadrage et ajouter l'image
    const applyCrop = async () => {
        if (!capturedImage || cropData.width === 0 || cropData.height === 0) return

        try {
            // Créer un canvas pour le recadrage
            const img = new Image()
            img.src = capturedImage

            await new Promise((resolve) => {
                img.onload = resolve
            })

            // Récupérer l'élément image affiché pour calculer le ratio
            const displayedImg = document.getElementById('cropImage')
            const scaleX = img.naturalWidth / displayedImg.offsetWidth
            const scaleY = img.naturalHeight / displayedImg.offsetHeight

            // Calculer les coordonnées réelles dans l'image originale
            const realX = cropData.x * scaleX
            const realY = cropData.y * scaleY
            const realWidth = cropData.width * scaleX
            const realHeight = cropData.height * scaleY

            const canvas = document.createElement('canvas')
            canvas.width = realWidth
            canvas.height = realHeight
            const ctx = canvas.getContext('2d')

            // Dessiner la partie recadrée
            ctx.drawImage(
                img,
                realX, realY, realWidth, realHeight,
                0, 0, realWidth, realHeight
            )

            // Compresser l'image
            const compressedImage = canvas.toDataURL('image/jpeg', 0.7)

            // Convertir en File pour compatibilité
            const blob = await fetch(compressedImage).then(r => r.blob())
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })

            // Ajouter à l'élément courant
            setCurrentElement(prev => ({
                ...prev,
                image: file,
                imagePreview: compressedImage
            }))

            // Réinitialiser
            setCapturedImage(null)
            setIsCropping(false)
            setCropData({ x: 0, y: 0, width: 0, height: 0 })
            setIsSelecting(false)

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
    }

    const resetCropSelection = () => {
        setCropData({ x: 0, y: 0, width: 0, height: 0 })
        setIsSelecting(false)
    }

    const generateWithAI = async () => {
        if (!autoParams.theme.trim()) {
            alert('Veuillez saisir un thème pour l\'imagier')
            return
        }

        setIsGenerating(true)

        try {
            const response = await fetch('/api/imagiers/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    theme: autoParams.theme,
                    niveau: autoParams.niveau,
                    nombreElements: autoParams.nombreElements,
                    styleImages: autoParams.styleImages,
                    includeQuestions: autoParams.includeQuestions,
                    voix: selectedVoice
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Remplir automatiquement les données générées
                setImagier({
                    titre: data.titre,
                    theme: data.theme,
                    description: data.description
                })

                setElements(data.elements)

                alert('✅ Imagier généré avec succès ! Vous pouvez maintenant le modifier si nécessaire.')
            } else {
                const error = await response.text()
                alert('❌ Erreur lors de la génération : ' + error)
            }
        } catch (error) {
            console.error('Erreur génération IA:', error)
            alert('❌ Erreur lors de la génération automatique')
        } finally {
            setIsGenerating(false)
        }
    }

    const saveImagier = async () => {
        if (!imagier.titre.trim()) {
            alert('Veuillez saisir un titre pour l\'imagier')
            return
        }

        if (!imagier.theme.trim()) {
            alert('Veuillez saisir un thème pour l\'imagier')
            return
        }

        if (elements.length === 0) {
            alert('Veuillez ajouter au moins un élément à l\'imagier')
            return
        }

        setIsSaving(true)

        try {
            const formData = new FormData()
            formData.append('titre', imagier.titre)
            formData.append('theme', imagier.theme)
            formData.append('description', imagier.description)
            formData.append('voix', selectedVoice)

            // Ajouter les éléments
            elements.forEach((element, index) => {
                formData.append(`elements[${index}][mot]`, element.mot)
                formData.append(`elements[${index}][commentaire]`, element.commentaire)
                formData.append(`elements[${index}][question]`, element.question)
                formData.append(`elements[${index}][reponse]`, element.reponse)
                formData.append(`elements[${index}][image]`, element.image)
            })

            const response = await fetch('/api/imagiers/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                alert('✅ Imagier créé avec succès !')
                router.push('/imagiers/mes-imagiers')
            } else {
                const error = await response.text()
                alert('❌ Erreur lors de la création : ' + error)
            }
        } catch (error) {
            console.error('Erreur création imagier:', error)
            alert('❌ Erreur lors de la création de l\'imagier')
        } finally {
            setIsSaving(false)
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
                maxWidth: '900px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    ✨ Créer un Imagier
                </h1>

                {/* Choix du mode de création */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '25px',
                    marginBottom: '40px'
                }}>
                    {/* Création manuelle */}
                    <button
                        onClick={() => setMode('manual')}
                        style={{
                            background: mode === 'manual' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                            color: mode === 'manual' ? 'white' : '#374151',
                            padding: '30px 25px',
                            borderRadius: '16px',
                            border: mode === 'manual' ? '3px solid #059669' : '3px solid transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: mode === 'manual' ? '0 8px 25px rgba(16, 185, 129, 0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛠️</div>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>
                            Créer soi-même
                        </h3>
                        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                            Ajoutez vos propres images, mots et commentaires
                        </p>
                    </button>

                    {/* Génération automatique */}
                    <button
                        onClick={() => setMode('auto')}
                        style={{
                            background: mode === 'auto' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                            color: mode === 'auto' ? 'white' : '#374151',
                            padding: '30px 25px',
                            borderRadius: '16px',
                            border: mode === 'auto' ? '3px solid #7c3aed' : '3px solid transparent',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: mode === 'auto' ? '0 8px 25px rgba(139, 92, 246, 0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤖</div>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>
                            Générer automatiquement
                        </h3>
                        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                            L'IA crée l'imagier complet avec images et textes
                        </p>
                    </button>
                </div>

                {/* Interface Mode Manuel */}
                {mode === 'manual' && (
                    <div style={{
                        background: '#f8f9fa',
                        padding: '25px',
                        borderRadius: '12px',
                        marginBottom: '25px'
                    }}>
                        <h2 style={{ marginBottom: '20px', color: '#333' }}>📝 Informations de base</h2>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Titre de l'imagier *
                        </label>
                        <input
                            type="text"
                            value={imagier.titre}
                            onChange={(e) => setImagier(prev => ({ ...prev, titre: e.target.value }))}
                            placeholder="Ex: Les ustensiles de cuisine"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Thème *
                        </label>
                        <input
                            type="text"
                            value={imagier.theme}
                            onChange={(e) => setImagier(prev => ({ ...prev, theme: e.target.value }))}
                            placeholder="Ex: Cuisine, Animaux, Transport..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Description (optionnelle)
                        </label>
                        <textarea
                            value={imagier.description}
                            onChange={(e) => setImagier(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Décrivez votre imagier..."
                            rows="3"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '16px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Sélection de voix */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#333'
                        }}>
                            Voix pour la prononciation
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #ddd',
                                    fontSize: '14px'
                                }}
                            >
                                {availableVoices.map(voice => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => speakText('Bonjour, ceci est un test de la voix sélectionnée')}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                🎵 Tester
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {/* Interface Mode Automatique */}
                {mode === 'auto' && (
                    <div style={{
                        background: '#f0f9ff',
                        padding: '25px',
                        borderRadius: '12px',
                        marginBottom: '25px',
                        border: '2px solid #8b5cf6'
                    }}>
                        <h2 style={{ marginBottom: '20px', color: '#7c3aed' }}>🤖 Génération automatique avec l'IA</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                color: '#333'
                            }}>
                                Thème de l'imagier *
                            </label>
                            <input
                                type="text"
                                value={autoParams.theme}
                                onChange={(e) => setAutoParams(prev => ({ ...prev, theme: e.target.value }))}
                                placeholder="Ex: Cuisine, Animaux, Transport, École..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#333'
                                }}>
                                    Niveau
                                </label>
                                <select
                                    value={autoParams.niveau}
                                    onChange={(e) => setAutoParams(prev => ({ ...prev, niveau: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="debutant">🟢 Débutant</option>
                                    <option value="intermediaire">🟡 Intermédiaire</option>
                                    <option value="avance">🔴 Avancé</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#333'
                                }}>
                                    Nombre d'éléments
                                </label>
                                <select
                                    value={autoParams.nombreElements}
                                    onChange={(e) => setAutoParams(prev => ({ ...prev, nombreElements: parseInt(e.target.value) }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value={5}>5 éléments</option>
                                    <option value={10}>10 éléments</option>
                                    <option value={15}>15 éléments</option>
                                    <option value={20}>20 éléments</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#333'
                                }}>
                                    Style d'images
                                </label>
                                <select
                                    value={autoParams.styleImages}
                                    onChange={(e) => setAutoParams(prev => ({ ...prev, styleImages: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="realiste">📷 Réaliste</option>
                                    <option value="cartoon">🎨 Cartoon</option>
                                    <option value="schematique">📐 Schématique</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={autoParams.includeQuestions}
                                    onChange={(e) => setAutoParams(prev => ({ ...prev, includeQuestions: e.target.checked }))}
                                    style={{ transform: 'scale(1.2)' }}
                                />
                                <span>Générer automatiquement les questions et réponses</span>
                            </label>
                        </div>

                        {/* Sélection de voix */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                color: '#333'
                            }}>
                                Voix pour la prononciation
                            </label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    {availableVoices.map(voice => (
                                        <option key={voice.name} value={voice.name}>
                                            {voice.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => speakText('Bonjour, ceci est un test de la voix sélectionnée')}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🎵 Tester
                                </button>
                            </div>
                        </div>

                        {/* Bouton de génération */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={generateWithAI}
                                disabled={isGenerating || !autoParams.theme.trim()}
                                style={{
                                    backgroundColor: isGenerating || !autoParams.theme.trim() ? '#ccc' : '#8b5cf6',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: isGenerating || !autoParams.theme.trim() ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                                }}
                            >
                                {isGenerating ? '🤖 Génération en cours...' : '🚀 Générer l\'imagier avec l\'IA'}
                            </button>
                        </div>

                        {elements.length > 0 && (
                            <div style={{
                                marginTop: '20px',
                                padding: '15px',
                                background: '#d1fae5',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <p style={{ margin: 0, color: '#065f46', fontWeight: 'bold' }}>
                                    ✅ Imagier généré avec succès ! {elements.length} éléments créés.
                                </p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#10b981' }}>
                                    Vous pouvez maintenant visualiser, modifier ou sauvegarder votre imagier.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Liste des éléments */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '25px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                    }}>
                        <h2 style={{ margin: 0, color: '#333' }}>🖼️ Éléments de l'imagier ({elements.length})</h2>
                        <button
                            onClick={() => setIsAddingElement(true)}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ Ajouter un élément
                        </button>
                    </div>

                    {/* Zone de drag & drop pour plusieurs images */}
                    <div
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            background: isDragging ? '#d1fae5' : 'white',
                            border: isDragging ? '3px dashed #10b981' : '3px dashed #ddd',
                            borderRadius: '12px',
                            padding: '30px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                            {isProcessingImages ? '⏳' : isDragging ? '📥' : '📁'}
                        </div>
                        <h3 style={{
                            marginBottom: '10px',
                            color: isDragging ? '#10b981' : '#333',
                            fontSize: '18px',
                            fontWeight: 'bold'
                        }}>
                            {isProcessingImages ? 'Traitement des images...' : isDragging ? 'Déposez vos images ici' : '🚀 Import rapide de plusieurs images'}
                        </h3>
                        <p style={{
                            color: '#666',
                            marginBottom: '15px',
                            fontSize: '14px'
                        }}>
                            Glissez-déposez plusieurs images ici ou cliquez pour sélectionner
                        </p>
                        <p style={{
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            marginBottom: '15px'
                        }}>
                            ✨ Le nom de chaque fichier deviendra automatiquement le mot de l'élément
                        </p>
                        <label style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            cursor: isProcessingImages ? 'not-allowed' : 'pointer',
                            display: 'inline-block',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            opacity: isProcessingImages ? 0.6 : 1
                        }}>
                            📂 Sélectionner plusieurs images
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileInputChange}
                                disabled={isProcessingImages}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    {/* Formulaire d'ajout d'élément */}
                    {isAddingElement && (
                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '2px solid #10b981'
                        }}>
                            <h3 style={{ marginBottom: '15px', color: '#10b981' }}>Nouvel élément</h3>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold'
                                }}>
                                    Mot *
                                </label>
                                <input
                                    type="text"
                                    value={currentElement.mot}
                                    onChange={(e) => setCurrentElement(prev => ({ ...prev, mot: e.target.value }))}
                                    placeholder="Ex: casserole"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold'
                                }}>
                                    Image *
                                </label>

                                {/* Boutons de recherche et capture */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={openGoogleImages}
                                        disabled={!currentElement.mot.trim()}
                                        style={{
                                            flex: 1,
                                            backgroundColor: currentElement.mot.trim() ? '#3b82f6' : '#ccc',
                                            color: 'white',
                                            padding: '10px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: currentElement.mot.trim() ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        🔍 Chercher sur Google Images
                                    </button>
                                    <button
                                        type="button"
                                        onClick={captureScreen}
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

                                <p style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    marginBottom: '10px',
                                    fontStyle: 'italic'
                                }}>
                                    💡 Astuce : Saisissez d'abord le mot, puis cliquez sur "Chercher" pour ouvrir Google Images. Ensuite, cliquez sur "Capturer" et sélectionnez l'onglet Google.
                                </p>

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                                {currentElement.imagePreview && (
                                    <img
                                        src={currentElement.imagePreview}
                                        alt="Aperçu"
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            marginTop: '10px'
                                        }}
                                    />
                                )}
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold'
                                }}>
                                    Commentaire (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={currentElement.commentaire}
                                    onChange={(e) => setCurrentElement(prev => ({ ...prev, commentaire: e.target.value }))}
                                    placeholder="Ex: sert à faire bouillir de l'eau"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold'
                                }}>
                                    Question (optionnelle)
                                </label>
                                <input
                                    type="text"
                                    value={currentElement.question}
                                    onChange={(e) => setCurrentElement(prev => ({ ...prev, question: e.target.value }))}
                                    placeholder="Ex: À quoi sert cet objet ?"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold'
                                }}>
                                    Réponse (optionnelle)
                                </label>
                                <input
                                    type="text"
                                    value={currentElement.reponse}
                                    onChange={(e) => setCurrentElement(prev => ({ ...prev, reponse: e.target.value }))}
                                    placeholder="Ex: À faire bouillir de l'eau"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={addElement}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✅ Ajouter
                                </button>
                                <button
                                    onClick={() => setIsAddingElement(false)}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ❌ Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Liste des éléments ajoutés */}
                    {elements.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                            Aucun élément ajouté. Cliquez sur "Ajouter un élément" pour commencer.
                        </p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '15px'
                        }}>
                            {elements.map(element => (
                                <div key={element.id} style={{
                                    background: 'white',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '10px'
                                    }}>
                                        {editingElementId === element.id ? (
                                            <div style={{ flex: 1, marginRight: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={editingElementName}
                                                    onChange={(e) => setEditingElementName(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            saveElementName(element.id)
                                                        }
                                                    }}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        padding: '5px 8px',
                                                        borderRadius: '4px',
                                                        border: '2px solid #10b981',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                    <button
                                                        onClick={() => saveElementName(element.id)}
                                                        style={{
                                                            backgroundColor: '#10b981',
                                                            color: 'white',
                                                            padding: '3px 8px',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={cancelEditingElementName}
                                                        style={{
                                                            backgroundColor: '#6b7280',
                                                            color: 'white',
                                                            padding: '3px 8px',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✗
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <h4
                                                onClick={() => startEditingElementName(element)}
                                                style={{
                                                    margin: 0,
                                                    color: '#333',
                                                    cursor: 'pointer',
                                                    flex: 1,
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e) => e.target.style.background = '#f0f0f0'}
                                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                                                title="Cliquer pour modifier"
                                            >
                                                {element.mot} ✏️
                                            </h4>
                                        )}
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => speakText(element.mot)}
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔊
                                            </button>
                                            <button
                                                onClick={() => removeElement(element.id)}
                                                style={{
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <img
                                        src={element.imagePreview}
                                        alt={element.mot}
                                        style={{
                                            width: '100%',
                                            height: '120px',
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            marginBottom: '10px'
                                        }}
                                    />
                                    {element.commentaire && (
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#666',
                                            margin: '0 0 8px 0',
                                            fontStyle: 'italic'
                                        }}>
                                            💬 {element.commentaire}
                                        </p>
                                    )}
                                    {element.question && (
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#3b82f6',
                                            margin: '0 0 4px 0',
                                            fontWeight: 'bold'
                                        }}>
                                            ❓ {element.question}
                                        </p>
                                    )}
                                    {element.reponse && (
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#10b981',
                                            margin: 0,
                                            fontWeight: 'bold'
                                        }}>
                                            ✅ {element.reponse}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    marginBottom: '40px'
                }}>
                    <button
                        onClick={saveImagier}
                        disabled={isSaving || elements.length === 0}
                        style={{
                            backgroundColor: isSaving || elements.length === 0 ? '#ccc' : '#10b981',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isSaving || elements.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSaving ? '💾 Sauvegarde...' : '💾 Sauvegarder l\'imagier'}
                    </button>

                    <button
                        onClick={() => router.push('/imagiers')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>
                </div>
            </div>

            {/* Modal de recadrage */}
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
        </div>
    )
}