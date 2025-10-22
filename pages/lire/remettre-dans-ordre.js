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

export default function RemettreEnOrdre() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTexte, setSelectedTexte] = useState('')
    const [isLoadingTexte, setIsLoadingTexte] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [originalOrder, setOriginalOrder] = useState([])
    const [currentOrder, setCurrentOrder] = useState([])
    const [draggedItem, setDraggedItem] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [attempts, setAttempts] = useState(0)
    const [isCorrect, setIsCorrect] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [showSolution, setShowSolution] = useState(false)
    const [enregistrements, setEnregistrements] = useState({}) // Enregistrements par groupe_sens_id
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7') // Paul par défaut
    const [availableVoices, setAvailableVoices] = useState([])
    const [isPlaying, setIsPlaying] = useState(null) // ID du groupe en cours de lecture
    const [currentAudio, setCurrentAudio] = useState(null)
    const router = useRouter()

    useEffect(() => {
        // Charger les voix disponibles
        loadVoices()

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

    const loadVoices = async () => {
        try {
            const response = await fetch('/api/speech/voices')
            if (response.ok) {
                const data = await response.json()
                setAvailableVoices(data.voices || [])
            }
        } catch (error) {
            console.error('Erreur chargement voix:', error)
        }
    }

    const loadTextes = async () => {
        setIsLoadingTexte(true)
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
        } finally {
            setIsLoadingTexte(false)
        }
    }

    const loadGroupesTexte = async (texteId) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/textes/get/${texteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const groupes = data.groupes_sens || []

                // Filtrer pour exclure les sauts de lignes et groupes vides
                const groupesValides = groupes.filter(groupe =>
                    groupe.type_groupe !== 'linebreak' &&
                    groupe.contenu &&
                    groupe.contenu.trim() !== ''
                )

                // Trier par ordre_groupe pour avoir l'ordre original
                const sortedGroupes = groupesValides.sort((a, b) => a.ordre_groupe - b.ordre_groupe)
                setOriginalOrder(sortedGroupes)

                // Mélanger pour le jeu
                const shuffledGroupes = [...sortedGroupes].sort(() => Math.random() - 0.5)
                setCurrentOrder(shuffledGroupes)

                // Charger les enregistrements pour ce texte
                try {
                    const enregResponse = await fetch(`/api/enregistrements/list?texte_id=${texteId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })

                    if (enregResponse.ok) {
                        const enregData = await enregResponse.json()
                        if (enregData.enregistrements) {
                            const enregMap = {}
                            enregData.enregistrements.forEach(enreg => {
                                enregMap[enreg.groupe_sens_id] = enreg
                            })
                            setEnregistrements(enregMap)
                            console.log(`🎵 ${enregData.enregistrements.length} enregistrement(s) chargé(s) pour texte ${texteId}`)
                        }
                    }
                } catch (enregError) {
                    console.warn(`⚠️ Erreur chargement enregistrements texte ${texteId}:`, enregError)
                }

                setGameStarted(true)
                setAttempts(0)
                setIsCorrect(false)
                setFeedback('')
                setShowSolution(false)
            } else {
                alert('Erreur lors du chargement du texte')
            }
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            alert('Erreur lors du chargement du texte')
        }
    }

    const startGame = () => {
        if (!selectedTexte) {
            alert('Veuillez sélectionner un texte')
            return
        }
        loadGroupesTexte(selectedTexte)
    }

    const handleDragStart = (e, index) => {
        setDraggedItem(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
    }

    const handleDragLeave = () => {
        setDragOverIndex(null)
    }

    const handleDrop = (e, dropIndex) => {
        e.preventDefault()
        
        if (draggedItem === null) return
        
        const newOrder = [...currentOrder]
        const draggedElement = newOrder[draggedItem]
        
        // Supprimer l'élément de sa position actuelle
        newOrder.splice(draggedItem, 1)
        
        // L'insérer à la nouvelle position
        newOrder.splice(dropIndex, 0, draggedElement)
        
        setCurrentOrder(newOrder)
        setDraggedItem(null)
        setDragOverIndex(null)
    }

    const handleDragEnd = () => {
        setDraggedItem(null)
        setDragOverIndex(null)
    }


    const verifyOrder = () => {
        setAttempts(attempts + 1)

        const isOrderCorrect = currentOrder.every((groupe, index) =>
            groupe.ordre_groupe === originalOrder[index].ordre_groupe
        )

        if (isOrderCorrect) {
            setIsCorrect(true)
            setFeedback('🎉 Parfait ! L\'ordre est correct !')

            // Redirection automatique après 3 secondes vers le choix du texte
            setTimeout(() => {
                resetGame()
            }, 3000)
        } else {
            setFeedback(`❌ Pas encore correct. Essai ${attempts + 1}`)
        }
    }

    const resetOrder = () => {
        const shuffledGroupes = [...originalOrder].sort(() => Math.random() - 0.5)
        setCurrentOrder(shuffledGroupes)
        setIsCorrect(false)
        setFeedback('')
        setShowSolution(false)
    }

    const resetGame = () => {
        setGameStarted(false)
        setSelectedTexte('')
        setOriginalOrder([])
        setCurrentOrder([])
        setAttempts(0)
        setIsCorrect(false)
        setFeedback('')
        setShowSolution(false)
        // Arrêter tout audio en cours
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }
        setIsPlaying(null)
    }

    const playEnregistrement = async (enregistrement) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('⚠️ Enregistrement invalide')
            return false
        }

        try {
            console.log('🎵 Lecture enregistrement personnel:', enregistrement.audio_url)
            const audio = new Audio(enregistrement.audio_url)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            audio.onerror = (error) => {
                console.error('❌ Erreur lecture enregistrement:', error)
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            await audio.play()
            console.log('✅ Enregistrement personnel lu avec succès')
            return true
        } catch (error) {
            console.error('❌ Erreur playEnregistrement:', error)
            return false
        }
    }

    const playAudio = async (groupe) => {
        // Si on clique sur le même audio qui joue, on l'arrête
        if (isPlaying === groupe.id && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(null)
            return
        }

        // Arrêter tout audio en cours
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }

        setIsPlaying(groupe.id)

        // Si mode voix personnalisée, essayer de lire l'enregistrement
        if (selectedVoice === 'VOIX_PERSONNALISEE') {
            if (enregistrements[groupe.id]) {
                console.log('🎵 Enregistrement trouvé pour groupe', groupe.id)
                const success = await playEnregistrement(enregistrements[groupe.id])
                if (success) return
                console.log('⚠️ Échec lecture enregistrement, fallback vers Paul')
            } else {
                console.log('⚠️ Aucun enregistrement pour ce groupe, fallback vers Paul')
            }
            // Pas d'enregistrement ou erreur → fallback vers Paul (AfbuxQ9DVtS4azaxN1W7)
            const fallbackVoice = 'AfbuxQ9DVtS4azaxN1W7' // Paul

            const getCachedAudio = (text, voiceId) => {
                const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
                return localStorage.getItem(key)
            }

            const setCachedAudio = (text, voiceId, audioData) => {
                try {
                    const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
                    localStorage.setItem(key, audioData)
                } catch (error) {
                    console.error('Erreur cache:', error)
                }
            }

            try {
                const cachedAudio = getCachedAudio(groupe.contenu, fallbackVoice)
                let audioData = null

                if (cachedAudio) {
                    audioData = cachedAudio
                } else {
                    const token = localStorage.getItem('token')
                    const response = await fetch('/api/speech/elevenlabs', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text: groupe.contenu,
                            voice_id: fallbackVoice
                        })
                    })

                    if (!response.ok) {
                        // Fallback vers Web Speech API
                        const utterance = new SpeechSynthesisUtterance(groupe.contenu)
                        utterance.lang = 'fr-FR'
                        utterance.rate = 0.8
                        utterance.onend = () => {
                            setIsPlaying(null)
                        }
                        window.speechSynthesis.speak(utterance)
                        return
                    }

                    const data = await response.json()
                    audioData = data.audio
                    setCachedAudio(groupe.contenu, fallbackVoice, audioData)
                }

                const audio = new Audio(audioData)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(null)
                    setCurrentAudio(null)
                }

                audio.onerror = () => {
                    setIsPlaying(null)
                    setCurrentAudio(null)
                }

                await audio.play()
            } catch (error) {
                console.error('Erreur lecture audio fallback:', error)
                setIsPlaying(null)
            }
            return
        }

        // Mode voix ElevenLabs normale
        const getCachedAudio = (text, voiceId) => {
            const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
            return localStorage.getItem(key)
        }

        const setCachedAudio = (text, voiceId, audioData) => {
            try {
                const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
                localStorage.setItem(key, audioData)
            } catch (error) {
                console.error('Erreur cache:', error)
            }
        }

        try {
            // Vérifier le cache
            const cachedAudio = getCachedAudio(groupe.contenu, selectedVoice)
            let audioData = null

            if (cachedAudio) {
                audioData = cachedAudio
            } else {
                // Générer via ElevenLabs
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        text: groupe.contenu,
                        voice_id: selectedVoice
                    })
                })

                if (!response.ok) {
                    // Fallback vers Web Speech API
                    const utterance = new SpeechSynthesisUtterance(groupe.contenu)
                    utterance.lang = 'fr-FR'
                    utterance.rate = 0.8
                    utterance.onend = () => {
                        setIsPlaying(null)
                    }
                    window.speechSynthesis.speak(utterance)
                    return
                }

                const data = await response.json()
                audioData = data.audio
                setCachedAudio(groupe.contenu, selectedVoice, audioData)
            }

            const audio = new Audio(audioData)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            audio.onerror = () => {
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            await audio.play()

        } catch (error) {
            console.error('Erreur lecture audio:', error)
            setIsPlaying(null)
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
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                {!gameStarted ? (
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        🔀 Remettre dans l'ordre
                    </h1>
                ) : (
                    /* Titre avec boutons de navigation pendant le jeu */
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        {/* Bouton mélanger à gauche */}
                        <button
                            onClick={resetOrder}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '8px' : '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                cursor: 'pointer',
                                minWidth: window.innerWidth <= 768 ? '36px' : 'auto',
                                flexShrink: 0
                            }}
                            title="Mélanger à nouveau"
                        >
                            {window.innerWidth <= 768 ? '🔄' : '🔄 Mélanger'}
                        </button>

                        {/* Titre au centre */}
                        <h1 style={{
                            fontSize: 'clamp(18px, 4vw, 24px)',
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textAlign: 'center',
                            margin: 0,
                            flex: 1
                        }}>
                            🔀 Remettre dans l'ordre
                        </h1>

                        {/* Bouton nouveau à droite */}
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '8px' : '12px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minWidth: window.innerWidth <= 768 ? '36px' : 'auto',
                                flexShrink: 0
                            }}
                            title="Retour au menu Lire"
                        >
                            {window.innerWidth <= 768 ? '←' : '← Retour'}
                        </button>
                    </div>
                )}

                {!gameStarted ? (
                    <>
                        {/* Sélection du texte */}
                        <div style={{
                            background: window.innerWidth <= 768 ? 'transparent' : '#f8f9fa',
                            padding: window.innerWidth <= 768 ? '0' : '20px',
                            borderRadius: window.innerWidth <= 768 ? '0' : '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px' }}>📚 Choisir un texte</h3>
                            
                            {isLoadingTexte ? (
                                <div>Chargement des textes...</div>
                            ) : textes.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    background: '#fff3cd',
                                    borderRadius: '8px',
                                    border: '1px solid #ffeaa7'
                                }}>
                                    <p>Aucun texte disponible</p>
                                    <p style={{ fontSize: '14px', color: '#666' }}>
                                        Créez d'abord un texte de référence
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={selectedTexte}
                                        onChange={(e) => setSelectedTexte(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '16px',
                                            marginBottom: '20px'
                                        }}
                                    >
                                        <option value="">-- Sélectionner un texte --</option>
                                        {textes.map(texte => (
                                            <option key={texte.id} value={texte.id}>
                                                {texte.titre} ({texte.nombre_groupes} groupes)
                                            </option>
                                        ))}
                                    </select>

                                    {/* Sélecteur de voix */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                                            🎵 Voix :
                                        </label>
                                        <select
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '16px'
                                            }}
                                        >
                                            <option value="VOIX_PERSONNALISEE">🎵 Voix personnalisée ⭐</option>
                                            {availableVoices.map(voice => (
                                                <option key={voice.voice_id} value={voice.voice_id}>
                                                    {voice.name} {voice.recommended ? '⭐' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={startGame}
                                        disabled={!selectedTexte}
                                        style={{
                                            backgroundColor: selectedTexte ? '#10b981' : '#ccc',
                                            color: 'white',
                                            padding: '12px 30px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTexte ? 'pointer' : 'not-allowed',
                                            width: '100%'
                                        }}
                                    >
                                        🚀 Commencer l'exercice
                                    </button>

                                    {/* Bouton retour */}
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
                                            cursor: 'pointer',
                                            width: '100%',
                                            marginTop: '10px'
                                        }}
                                    >
                                        ← Retour au menu Lire
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
                            background: window.innerWidth <= 768 ? 'transparent' : '#f8f9fa',
                            padding: window.innerWidth <= 768 ? '0' : '20px',
                            borderRadius: window.innerWidth <= 768 ? '0' : '8px',
                            marginBottom: '20px'
                        }}>
                            {/* En-tête du jeu */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div className="desktop-only">
                                    <h3 style={{ margin: 0, color: '#333' }}>
                                        Remettez les groupes dans l'ordre du texte
                                    </h3>
                                </div>
                                <div className="desktop-only" style={{ fontSize: '16px', color: '#666' }}>
                                    📊 Tentatives: {attempts}
                                </div>
                            </div>

                            {/* Feedback */}
                            {feedback && (
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    background: isCorrect ? '#d1fae5' : '#fee2e2',
                                    color: isCorrect ? '#065f46' : '#991b1b'
                                }}>
                                    {feedback}
                                </div>
                            )}

                            {/* Étiquettes à organiser */}
                            <div style={{
                                background: window.innerWidth <= 768 ? 'transparent' : 'white',
                                padding: window.innerWidth <= 768 ? '0' : '20px',
                                borderRadius: window.innerWidth <= 768 ? '0' : '8px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    {currentOrder.map((groupe, index) => (
                                        <div
                                            key={groupe.id}
                                            draggable={!isCorrect}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '15px',
                                                background: dragOverIndex === index ? '#e0f2fe' : 
                                                           draggedItem === index ? '#f1f5f9' : '#f8f9fa',
                                                border: '2px solid',
                                                borderColor: dragOverIndex === index ? '#0284c7' : '#e5e7eb',
                                                borderRadius: '8px',
                                                cursor: isCorrect ? 'default' : 'grab',
                                                transition: 'all 0.2s',
                                                gap: '15px'
                                            }}
                                        >
                                            {/* Numéro d'ordre actuel */}
                                            <div style={{
                                                minWidth: '30px',
                                                height: '30px',
                                                background: '#10b981',
                                                color: 'white',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '14px'
                                            }}>
                                                {index + 1}
                                            </div>

                                            {/* Bouton audio */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    playAudio(groupe)
                                                }}
                                                style={{
                                                    minWidth: '36px',
                                                    height: '36px',
                                                    background: isPlaying === groupe.id ? '#f59e0b' : '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Écouter ce groupe"
                                            >
                                                {isPlaying === groupe.id ? '⏸️' : '🔊'}
                                            </button>

                                            {/* Contenu du groupe */}
                                            <div style={{
                                                flex: 1,
                                                fontSize: '16px',
                                                color: '#333'
                                            }}>
                                                {groupe.contenu}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Boutons d'actions */}
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                            }}>
                                {!isCorrect && (
                                    <>
                                        <button
                                            onClick={verifyOrder}
                                            style={{
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                padding: '10px 20px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✅ Valider
                                        </button>


                                        {attempts >= 3 && (
                                            <button
                                                onClick={() => setShowSolution(true)}
                                                style={{
                                                    backgroundColor: '#8b5cf6',
                                                    color: 'white',
                                                    padding: '10px 20px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                💡 Voir la solution
                                            </button>
                                        )}
                                    </>
                                )}

                            </div>

                            {/* Affichage de la solution */}
                            {showSolution && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    background: '#e0f2fe',
                                    borderRadius: '8px'
                                }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#0284c7' }}>💡 Ordre correct :</h4>
                                    <ol style={{ margin: 0, paddingLeft: '20px' }}>
                                        {originalOrder.map((groupe) => (
                                            <li key={groupe.id} style={{ marginBottom: '5px' }}>
                                                {groupe.contenu}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}