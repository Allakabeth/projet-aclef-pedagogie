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
                                        <h4 style={{ margin: 0, color: '#333' }}>{element.mot}</h4>
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
        </div>
    )
}