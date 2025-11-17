import { useState, useEffect, useRef } from 'react'

export default function ExerciceOuEst({ selectedTextes, retourSelection }) {
    const [allMots, setAllMots] = useState([])
    const [currentMot, setCurrentMot] = useState(null)
    const [shuffledMots, setShuffledMots] = useState([])
    const [displayedMots, setDisplayedMots] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [completedMots, setCompletedMots] = useState([])
    const [selectedMotId, setSelectedMotId] = useState(null)
    const [isCorrect, setIsCorrect] = useState(null)
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })

    // Cascade de voix : perso → ElevenLabs → Web Speech
    const enregistrementsMapRef = useRef({}) // Ref pour accès synchrone
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // State pour re-render
    const [elevenLabsTokens, setElevenLabsTokens] = useState(0)

    // Ref pour éviter double initialisation (React Strict Mode)
    const gameStartedRef = useRef(false)

    useEffect(() => {
        // Charger les données puis démarrer le jeu
        const init = async () => {
            await Promise.all([
                loadEnregistrements(),
                loadElevenLabsTokens()
            ])

            // Empêcher double appel startGame() en React Strict Mode
            if (!gameStartedRef.current) {
                gameStartedRef.current = true
                startGame()
            }
        }

        init()
    }, [])

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-mots/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()

                // L'API retourne déjà un enregistrementsMap formaté
                // Mais on doit normaliser les clés pour le matching
                const map = {}
                const enregistrements = data.enregistrements || []

                enregistrements.forEach(enr => {
                    const motNormalise = enr.mot
                        .toLowerCase()
                        .trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    map[motNormalise] = enr
                })

                // Mettre à jour à la fois le ref (synchrone) et le state
                enregistrementsMapRef.current = map
                setEnregistrementsMap(map)
                console.log(`✅ ${Object.keys(map).length} enregistrements chargés`)
            }
        } catch (err) {
            console.error('Erreur chargement enregistrements:', err)
        }
    }

    const loadElevenLabsTokens = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setElevenLabsTokens(data.remaining || 0)
                console.log(`✅ ${data.remaining || 0} tokens ElevenLabs disponibles`)
            } else {
                // Si l'API n'existe pas ou erreur, on reste à 0 tokens (Web Speech sera utilisé)
                console.log('ℹ️ API tokens ElevenLabs non disponible, utilisation Web Speech uniquement')
            }
        } catch (err) {
            // Erreur silencieuse - on continuera avec Web Speech
            console.log('ℹ️ Tokens ElevenLabs non disponibles, utilisation Web Speech uniquement')
        }
    }

    const startGame = async () => {
        try {
            const token = localStorage.getItem('token')
            let tousLesMonosyllabes = []

            for (const texteId of selectedTextes) {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    tousLesMonosyllabes.push(...(data.monosyllabes || []))
                }
            }

            const monosyllabesUniques = [...new Set(tousLesMonosyllabes)]

            if (monosyllabesUniques.length === 0) {
                alert('Aucun monosyllabe trouvé pour les textes sélectionnés')
                return
            }

            const motsAvecIndex = monosyllabesUniques.map((mot, index) => ({
                id: index,
                contenu: mot
            }))

            setAllMots(motsAvecIndex)
            const shuffled = [...motsAvecIndex].sort(() => Math.random() - 0.5)
            setShuffledMots(shuffled)
            setCompletedMots([])
            setScore(0)
            setAttempts(0)
            setGameFinished(false)

            nextRoundWithAllMots(shuffled, [], motsAvecIndex)
        } catch (error) {
            console.error('Erreur démarrage jeu:', error)
            alert('Erreur lors du démarrage du jeu')
        }
    }

    const nextRoundWithAllMots = (remainingMots, completed, tousLesMots) => {
        if (remainingMots.length === 0) {
            finishGame()
            return
        }

        const currentMot = remainingMots[0]
        setCurrentMot(currentMot)

        // Créer 8 options (le bon + 7 distracteurs aléatoires parmi tous les mots)
        const wrongOptions = tousLesMots
            .filter(m => m.id !== currentMot.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 7)

        const allOptions = [currentMot, ...wrongOptions]

        // Utiliser Fisher-Yates pour un vrai mélange aléatoire
        const shuffledOptions = [...allOptions]
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]]
        }

        setDisplayedMots(shuffledOptions)

        // Lecture automatique du mot
        setTimeout(() => {
            playAudioAuto(currentMot.contenu)
        }, 500)
    }

    const nextRound = (remainingMots, completed) => {
        nextRoundWithAllMots(remainingMots, completed, allMots)
    }

    const handleAnswer = async (selectedMot) => {
        setSelectedMotId(selectedMot.id)
        setAttempts(attempts + 1)

        if (selectedMot.id === currentMot.id) {
            // Bonne réponse
            setIsCorrect(true)
            setScore(score + 1)

            const newCompleted = [...completedMots, currentMot]
            setCompletedMots(newCompleted)

            const remaining = shuffledMots.filter(m => !newCompleted.find(c => c.id === m.id))

            setTimeout(() => {
                setSelectedMotId(null)
                setIsCorrect(null)
                nextRound(remaining, newCompleted)
            }, 3000)
        } else {
            // Mauvaise réponse
            setIsCorrect(false)
            // Pas de setTimeout automatique, on attend le clic sur la flèche
        }
    }

    const handleNextAfterError = () => {
        setSelectedMotId(null)
        setIsCorrect(null)
        const remaining = shuffledMots.filter(m => m.id !== currentMot.id)
        setShuffledMots(remaining)
        nextRound(remaining, completedMots)
    }

    const finishGame = () => {
        const percentage = attempts > 0 ? Math.round((score / attempts) * 100) : 0
        setFinalScore({ correct: score, total: attempts, percentage })
        setGameFinished(true)
    }

    const resetGame = () => {
        setAllMots([])
        setCurrentMot(null)
        setDisplayedMots([])
        setScore(0)
        setAttempts(0)
        setGameFinished(false)
        setCompletedMots([])
        startGame()
    }

    const playAudioAuto = async (text) => {
        if (!text || isPlaying) return

        // Bloquer immédiatement les autres appels
        setIsPlaying(true)

        // Réinitialiser complètement l'état audio
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel()
        }

        // Normaliser le mot pour vérifier les enregistrements
        const motNormalise = text
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // Utiliser le ref pour accès synchrone à la map
        const map = enregistrementsMapRef.current

        console.log(`🔍 Recherche "${motNormalise}" dans`, Object.keys(map).length, 'enregistrements')
        console.log(`📋 Premiers enregistrements disponibles:`, Object.keys(map).slice(0, 5))

        // PRIORITÉ 1 : ENREGISTREMENT PERSONNEL
        if (map[motNormalise]) {
            console.log(`🎵 Enregistrement personnel trouvé pour "${text}"`)
            try {
                const audio = new Audio(map[motNormalise].audio_url)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(false)
                    setCurrentAudio(null)
                }

                audio.onerror = () => {
                    console.error('❌ Erreur lecture enregistrement, fallback ElevenLabs')
                    playElevenLabsOrFallback(text)
                }

                await audio.play()
                return
            } catch (error) {
                console.error('❌ Erreur playback enregistrement, fallback ElevenLabs')
                playElevenLabsOrFallback(text)
                return
            }
        }

        // PRIORITÉ 2 : ELEVENLABS (si tokens disponibles)
        playElevenLabsOrFallback(text)
    }

    const playElevenLabsOrFallback = async (text) => {
        // Si pas de tokens, directement Web Speech
        if (elevenLabsTokens <= 0) {
            console.warn('⚠️ Pas de tokens ElevenLabs, fallback Web Speech')
            playWebSpeech(text)
            return
        }

        // Essayer ElevenLabs
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ text: `Trouvez le mot ${text}` })
            })

            if (response.ok) {
                const data = await response.json()
                console.log(`🎙️ ElevenLabs utilisé pour "${text}"`)

                // Mettre à jour les tokens restants
                if (data.remaining !== undefined) {
                    setElevenLabsTokens(data.remaining)
                    console.log(`📊 Tokens restants: ${data.remaining}`)
                }

                const audio = new Audio(data.audio)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(false)
                    setCurrentAudio(null)
                }

                audio.onerror = () => {
                    console.error('❌ Erreur lecture ElevenLabs, fallback Web Speech')
                    playWebSpeech(text)
                }

                await audio.play()
            } else {
                const errorData = await response.json()
                if (response.status === 429 || errorData.error === 'QUOTA_EXCEEDED') {
                    console.warn('⚠️ Quota ElevenLabs dépassé, fallback Web Speech')
                    setElevenLabsTokens(0)
                }
                playWebSpeech(text)
            }
        } catch (error) {
            console.error('❌ Erreur appel ElevenLabs, fallback Web Speech')
            playWebSpeech(text)
        }
    }

    const playWebSpeech = (text) => {
        console.log(`🔊 Web Speech API pour "${text}"`)

        if ('speechSynthesis' in window) {
            speechSynthesis.cancel()

            const voices = speechSynthesis.getVoices()
            const utterance = new SpeechSynthesisUtterance(`Trouvez le mot ${text}`)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6

            // Sélectionner voix française SANS Hortense
            const frenchVoices = voices.filter(v =>
                v.lang.startsWith('fr') &&
                !v.name.toLowerCase().includes('hortense')
            )

            if (frenchVoices.length > 0) {
                const preferredVoice = frenchVoices.find(v =>
                    v.name.toLowerCase().includes('thomas') ||
                    v.name.toLowerCase().includes('daniel')
                ) || frenchVoices[0]

                utterance.voice = preferredVoice
                console.log(`🎤 Voix sélectionnée: ${preferredVoice.name}`)
            }

            utterance.onend = () => {
                setIsPlaying(false)
            }

            utterance.onerror = () => {
                setIsPlaying(false)
            }

            speechSynthesis.speak(utterance)
        } else {
            setIsPlaying(false)
        }
    }

    const playAudio = async (text) => {
        // Réutiliser la même cascade de priorité que playAudioAuto
        await playAudioAuto(text)
    }

    if (gameFinished) {
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
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        🔍 Où est ce mot ?
                    </h1>

                    <div style={{
                        background: '#f0fdf4',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ color: '#166534', marginBottom: '20px' }}>
                            🎉 Exercice terminé !
                        </h2>
                        <div style={{ fontSize: '24px', marginBottom: '20px' }}>
                            Score : <strong>{finalScore.correct}/{finalScore.total}</strong>
                        </div>
                        <div style={{ fontSize: '18px', color: '#15803d', marginBottom: '30px' }}>
                            Pourcentage : <strong>{finalScore.percentage}%</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '12px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Recommencer
                            </button>
                            <button
                                onClick={retourSelection}
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
                                📚 Changer de textes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textAlign: 'center',
                    color: '#06B6D4'
                }}>
                    🔍 Où est ce mot ?
                </h1>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={retourSelection}
                        disabled={isPlaying}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: isPlaying ? 'not-allowed' : 'pointer',
                            opacity: isPlaying ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={() => window.location.href = '/lire'}
                        disabled={isPlaying}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: isPlaying ? 'not-allowed' : 'pointer',
                            opacity: isPlaying ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        disabled={isPlaying}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: isPlaying ? 'not-allowed' : 'pointer',
                            opacity: isPlaying ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                    <button
                        onClick={() => currentMot && playAudio(currentMot.contenu)}
                        disabled={!currentMot || isPlaying}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: (!currentMot || isPlaying) ? 'not-allowed' : 'pointer',
                            opacity: (!currentMot || isPlaying) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🔊
                    </button>
                    <button
                        onClick={handleNextAfterError}
                        disabled={isCorrect !== false}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: isCorrect === false ? 'pointer' : 'not-allowed',
                            opacity: isCorrect === false ? 1 : 0.3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        →
                    </button>
                </div>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Écoutez le mot et trouvez-le parmi les choix proposés
                </p>

                {/* Options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    {displayedMots.map((mot, index) => {
                        // Fonction pour déterminer la bordure dynamique
                        const getBorder = () => {
                            if (selectedMotId === mot.id && isCorrect === true) {
                                return '4px solid #10b981' // Bonne réponse cliquée : VERT GRAS
                            }
                            if (selectedMotId === mot.id && isCorrect === false) {
                                return '4px solid #ef4444' // Mauvaise réponse cliquée : ROUGE GRAS
                            }
                            if (mot.id === currentMot?.id && isCorrect === false) {
                                return '4px solid #10b981' // Bonne réponse affichée après erreur : VERT GRAS
                            }
                            return '2px solid #06B6D4' // Normal : TURQUOISE
                        }

                        return (
                            <button
                                key={`${mot.id}-${index}`}
                                onClick={() => handleAnswer(mot)}
                                disabled={isCorrect !== null || isPlaying}
                                style={{
                                    padding: '20px',
                                    background: 'white',
                                    border: getBorder(),
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    cursor: (isCorrect !== null || isPlaying) ? 'not-allowed' : 'pointer',
                                    opacity: (isCorrect !== null || isPlaying) ? 0.7 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => !(isCorrect !== null || isPlaying) && (e.target.style.background = '#f0fdf4')}
                                onMouseOut={(e) => !(isCorrect !== null || isPlaying) && (e.target.style.background = 'white')}
                            >
                                {mot.contenu}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
