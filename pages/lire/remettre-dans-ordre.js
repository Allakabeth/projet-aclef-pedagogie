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
    const [selectedTextes, setSelectedTextes] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [gameFinished, setGameFinished] = useState(false)
    const [originalOrder, setOriginalOrder] = useState([])
    const [currentOrder, setCurrentOrder] = useState([])
    const [draggedItem, setDraggedItem] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [attempts, setAttempts] = useState(0)
    const [isCorrect, setIsCorrect] = useState(false)
    const [showSolution, setShowSolution] = useState(false)
    const [enregistrements, setEnregistrements] = useState({})
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7') // Paul par défaut
    const [availableVoices, setAvailableVoices] = useState([])
    const [isPlaying, setIsPlaying] = useState(null)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [tokenStatus, setTokenStatus] = useState('unknown')
    const [showConfetti, setShowConfetti] = useState(false)
    const [feedback, setFeedback] = useState('')
    const router = useRouter()
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        loadVoices()

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
                console.error('Erreur chargement textes')
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        } finally {
            setIsLoadingTextes(false)
        }
    }

    const loadGroupesForTextes = async (texteIds) => {
        try {
            const token = localStorage.getItem('token')
            const allGroupesTemp = []
            const allEnregistrementsTemp = {}

            for (const texteId of texteIds) {
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

                    groupesValides.forEach(groupe => {
                        allGroupesTemp.push({
                            ...groupe,
                            texte_titre: data.texte.titre,
                            texte_id: texteId
                        })
                    })

                    // Charger les enregistrements pour ce texte
                    try {
                        const enregResponse = await fetch(`/api/enregistrements/list?texte_id=${texteId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })

                        if (enregResponse.ok) {
                            const enregData = await enregResponse.json()
                            if (enregData.enregistrements) {
                                enregData.enregistrements.forEach(enreg => {
                                    allEnregistrementsTemp[enreg.groupe_sens_id] = enreg
                                })
                            }
                        }
                    } catch (enregError) {
                        console.warn('Erreur chargement enregistrements:', enregError)
                    }
                }
            }

            // Trier par ordre pour avoir l'ordre original
            const sortedGroupes = allGroupesTemp.sort((a, b) => {
                if (a.texte_id === b.texte_id) {
                    return a.ordre_groupe - b.ordre_groupe
                }
                return 0
            })

            setOriginalOrder(sortedGroupes)
            setEnregistrements(allEnregistrementsTemp)

            // Mélanger pour le jeu
            const shuffledGroupes = [...sortedGroupes].sort(() => Math.random() - 0.5)
            setCurrentOrder(shuffledGroupes)

            setGameStarted(true)
            setGameFinished(false)
            setAttempts(0)
            setIsCorrect(false)
            setShowSolution(false)
            setShowConfetti(false)
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            alert('Erreur lors du chargement des textes')
        }
    }

    const startGame = () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }
        loadGroupesForTextes(selectedTextes)
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

        newOrder.splice(draggedItem, 1)
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
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        const isOrderCorrect = currentOrder.every((groupe, index) =>
            groupe.id === originalOrder[index].id
        )

        if (isOrderCorrect) {
            setIsCorrect(true)
            setGameFinished(true)
            setFeedback('')

            // Confettis uniquement si réussite au 1er essai
            if (newAttempts === 1) {
                setShowConfetti(true)
                // Masquer confettis après 3 secondes
                setTimeout(() => {
                    setShowConfetti(false)
                }, 3000)
            }
        } else {
            setFeedback(`Essaye encore une fois! Tentative: ${newAttempts}`)
        }
    }

    const restartGame = () => {
        setGameStarted(false)
        setGameFinished(false)
        setSelectedTextes([])
        setOriginalOrder([])
        setCurrentOrder([])
        setAttempts(0)
        setIsCorrect(false)
        setShowSolution(false)
        setShowConfetti(false)
        setFeedback('')
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

    const fallbackToWebSpeech = (texte) => {
        const voices = window.speechSynthesis.getVoices()

        // Chercher voix masculine française (JAMAIS Hortense)
        const voixMasculine = voices.find(voice =>
            voice.lang.includes('fr') &&
            !voice.name.toLowerCase().includes('hortense') &&
            (voice.name.toLowerCase().includes('male') ||
             voice.name.toLowerCase().includes('homme') ||
             voice.name.toLowerCase().includes('thomas') ||
             voice.name.toLowerCase().includes('paul'))
        )

        const utterance = new SpeechSynthesisUtterance(texte)
        utterance.lang = 'fr-FR'
        utterance.rate = 0.8
        utterance.voice = voixMasculine || voices.find(v => v.lang.includes('fr'))

        utterance.onend = () => {
            setIsPlaying(null)
        }

        window.speechSynthesis.speak(utterance)
    }

    const playAudio = async (groupe, enregistrementsData = null) => {
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

        // 1. PRIORITÉ : Enregistrement utilisateur
        const enregToUse = enregistrementsData || enregistrements
        if (enregToUse[groupe.id]) {
            console.log('🎵 Enregistrement trouvé pour groupe', groupe.id)
            const success = await playEnregistrement(enregToUse[groupe.id])
            if (success) return
            console.log('⚠️ Échec lecture enregistrement, passage à ElevenLabs')
        }

        // 2. ElevenLabs (voix Paul)
        if (tokenStatus !== 'exhausted') {
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
                const voiceId = selectedVoice === 'VOIX_PERSONNALISEE' ? 'AfbuxQ9DVtS4azaxN1W7' : selectedVoice
                const cachedAudio = getCachedAudio(groupe.contenu, voiceId)
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
                            voice_id: voiceId
                        })
                    })

                    if (!response.ok) {
                        if (response.status === 429) {
                            setTokenStatus('exhausted')
                        }
                        fallbackToWebSpeech(groupe.contenu)
                        return
                    }

                    const data = await response.json()
                    audioData = data.audio
                    setCachedAudio(groupe.contenu, voiceId, audioData)
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
                console.error('Erreur ElevenLabs:', error)
                fallbackToWebSpeech(groupe.contenu)
            }
        } else {
            // 3. Fallback Web Speech API (jamais Hortense)
            fallbackToWebSpeech(groupe.contenu)
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

    // PAGE RÉSULTATS
    if (gameFinished) {
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
                        <span style={{ marginRight: '8px' }}>🔀</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Remettre dans l'ordre
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
                        <button
                            onClick={restartGame}
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
                            🔄
                        </button>
                    </div>

                    {/* Message de félicitations */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '10px'
                        }}>
                            🎉
                        </div>
                        <h2 style={{
                            fontSize: '24px',
                            color: '#10b981',
                            marginBottom: '10px'
                        }}>
                            Parfait !
                        </h2>
                        <p style={{
                            fontSize: '16px',
                            color: '#666'
                        }}>
                            Vous avez remis tous les groupes dans le bon ordre en {attempts} essai{attempts > 1 ? 's' : ''}.
                        </p>
                    </div>

                    {/* Ordre correct */}
                    <div style={{
                        background: '#f0fdf4',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid #10b981'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#10b981',
                            marginBottom: '15px',
                            textAlign: 'center'
                        }}>
                            ✅ Ordre correct
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            {originalOrder.map((groupe, index) => (
                                <div
                                    key={groupe.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '15px',
                                        background: '#dcfce7',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        gap: '15px'
                                    }}
                                >
                                    {/* Numéro */}
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

                                    {/* Contenu */}
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

                    {/* Confettis de célébration */}
                    {showConfetti && (
                        <>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                    @keyframes confetti-fall {
                                        0% {
                                            transform: translateY(0) rotate(0deg);
                                            opacity: 1;
                                        }
                                        100% {
                                            transform: translateY(100vh) rotate(720deg);
                                            opacity: 0;
                                        }
                                    }
                                `
                            }} />
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                zIndex: 9999,
                                overflow: 'hidden'
                            }}>
                                {[...Array(50)].map((_, i) => {
                                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
                                    const duration = 3 + Math.random() * 2
                                    const delay = Math.random() * 0.5
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                top: '-20px',
                                                left: `${Math.random() * 100}%`,
                                                width: '15px',
                                                height: '15px',
                                                backgroundColor: colors[Math.floor(Math.random() * 6)],
                                                opacity: 1,
                                                borderRadius: '50%',
                                                animation: `confetti-fall ${duration}s linear forwards`,
                                                animationDelay: `${delay}s`,
                                                zIndex: 10000
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    // PAGE PRINCIPALE (sélection textes ou jeu)
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
                    <span style={{ marginRight: '8px' }}>🔀</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Remettre dans l'ordre
                    </span>
                </h1>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    {gameStarted && (
                        <button
                            onClick={() => {
                                setGameStarted(false)
                                setGameFinished(false)
                            }}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#64748b',
                                border: '2px solid #64748b',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ←
                        </button>
                    )}
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
                </div>

                {!gameStarted ? (
                    <>
                        {/* Options de jeu - masquées mais fonctionnelles */}
                        <div style={{ display: 'none' }}>
                            <div>
                                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                    Voix:
                                </label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
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
                                                border: selectedTextes.includes(texte.id) ? '3px solid #10b981' : 'none',
                                                borderRadius: '20px',
                                                padding: isMobile ? '10px 15px' : '15px',
                                                boxShadow: selectedTextes.includes(texte.id)
                                                    ? `0 8px 25px ${couleur.shadow}, 0 0 0 3px #10b981`
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
                                                        accentColor: '#10b981',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            )}

                                            {/* Titre */}
                                            <div style={{
                                                flex: isMobile ? '1' : 'initial',
                                                color: 'white',
                                                fontSize: isMobile ? '14px' : '16px',
                                                fontWeight: 'bold',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                overflow: isMobile ? 'hidden' : 'visible',
                                                textOverflow: isMobile ? 'ellipsis' : 'clip',
                                                whiteSpace: isMobile ? 'nowrap' : 'normal'
                                            }}>
                                                {texte.titre}
                                            </div>

                                            {/* Stats PC uniquement */}
                                            {!isMobile && (
                                                <div style={{
                                                    marginLeft: 'auto',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0
                                                }}>
                                                    📊 {texte.nombre_groupes} groupes de sens
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Bouton Commencer */}
                        <button
                            onClick={startGame}
                            disabled={selectedTextes.length === 0}
                            style={{
                                background: 'white',
                                color: selectedTextes.length > 0 ? '#10b981' : '#ccc',
                                border: selectedTextes.length > 0 ? '2px solid #10b981' : '2px solid #ccc',
                                padding: '12px 30px',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'normal',
                                cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
                                width: '100%',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Commencer
                        </button>
                    </>
                ) : (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
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

                            {/* Message de feedback */}
                            {feedback && (
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    background: '#fee2e2',
                                    color: '#991b1b'
                                }}>
                                    {feedback}
                                </div>
                            )}

                            {/* Étiquettes à organiser */}
                            <div style={{
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
