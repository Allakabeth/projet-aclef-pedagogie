import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function ExerciceQuestCe({ selectedTextes, retourSelection }) {
    const router = useRouter()
    const [allMots, setAllMots] = useState([])
    const [currentMot, setCurrentMot] = useState(null)
    const [shuffledMots, setShuffledMots] = useState([])
    const [displayedMots, setDisplayedMots] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(null) // ID du mot en cours de lecture
    const [currentAudio, setCurrentAudio] = useState(null)
    const [feedback, setFeedback] = useState('')
    const [completedMots, setCompletedMots] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [elevenLabsTokens, setElevenLabsTokens] = useState(0)

    const enregistrementsMapRef = useRef({})

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                loadEnregistrements(),
                loadElevenLabsTokens()
            ])
            startGame()
        }
        init()
    }, [])

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-mots/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
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

                enregistrementsMapRef.current = map
                setEnregistrementsMap(map)
                console.log(`✅ ${Object.keys(map).length} enregistrements personnels chargés`)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
        }
    }

    const loadElevenLabsTokens = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/elevenlabs-tokens', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setElevenLabsTokens(data.tokens || 0)
                console.log(`✅ Tokens ElevenLabs: ${data.tokens || 0}`)
            }
        } catch (error) {
            console.error('Erreur chargement tokens:', error)
            setElevenLabsTokens(0)
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
            setFeedback('')

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

        // Créer 6 options (le bon + 5 distracteurs aléatoires parmi tous les mots)
        const wrongOptions = tousLesMots
            .filter(m => m.id !== currentMot.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 5)

        const allOptions = [currentMot, ...wrongOptions]

        // Utiliser Fisher-Yates pour un vrai mélange aléatoire
        const shuffledOptions = [...allOptions]
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]]
        }

        setDisplayedMots(shuffledOptions)
    }

    const nextRound = (remainingMots, completed) => {
        nextRoundWithAllMots(remainingMots, completed, allMots)
    }

    const handleAnswer = async (selectedMot) => {
        setAttempts(attempts + 1)

        if (selectedMot.id === currentMot.id) {
            setScore(score + 1)
            setFeedback(`✅ Correct ! "${selectedMot.contenu}"`)

            const newCompleted = [...completedMots, currentMot]
            setCompletedMots(newCompleted)

            const remaining = shuffledMots.filter(m => !newCompleted.find(c => c.id === m.id))

            setTimeout(() => {
                setFeedback('')
                nextRound(remaining, newCompleted)
            }, 1500)
        } else {
            setFeedback(`❌ Non, c'était "${currentMot.contenu}"`)
            setTimeout(() => {
                setFeedback('')
                const remaining = shuffledMots.filter(m => m.id !== currentMot.id)
                setShuffledMots(remaining)
                nextRound(remaining, completedMots)
            }, 2000)
        }
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
        setFeedback('')
        startGame()
    }

    const playAudio = async (motId, text) => {
        if (!text || isPlaying === motId) return

        setIsPlaying(motId)

        const map = enregistrementsMapRef.current
        const motNormalise = text
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // PRIORITÉ 1 : Enregistrement personnel
        if (map[motNormalise]) {
            console.log(`🎤 Lecture enregistrement personnel pour: ${text}`)
            try {
                const audio = new Audio(map[motNormalise].audio_url)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(null)
                    setCurrentAudio(null)
                }

                await audio.play()
                return
            } catch (error) {
                console.error('Erreur lecture enregistrement personnel:', error)
            }
        }

        // PRIORITÉ 2 : ElevenLabs (si tokens disponibles)
        if (elevenLabsTokens > 0) {
            console.log(`🔊 Tentative ElevenLabs (${elevenLabsTokens} tokens restants)`)
            try {
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        text: text,
                        voice_id: 'tMyQcCxfGDdIt7wJ2RQw' // Julie par défaut
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    const audio = new Audio(data.audio)
                    setCurrentAudio(audio)

                    audio.onended = () => {
                        setIsPlaying(null)
                        setCurrentAudio(null)
                    }

                    await audio.play()

                    // Recharger les tokens après utilisation
                    loadElevenLabsTokens()
                    return
                }
            } catch (error) {
                console.log('ElevenLabs échoué, fallback vers Web Speech')
            }
        }

        // PRIORITÉ 3 : Web Speech API (sans Hortense)
        console.log('🗣️ Fallback vers Web Speech API')
        playWebSpeech(motId, text)
    }

    const playWebSpeech = (motId, text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8

            // Attendre que les voix soient chargées
            const setVoice = () => {
                const voices = speechSynthesis.getVoices()
                const frenchVoices = voices.filter(v =>
                    v.lang.startsWith('fr') &&
                    !v.name.toLowerCase().includes('hortense')
                )

                // Préférer Julie, Thomas ou Daniel
                const preferredVoice = frenchVoices.find(v =>
                    v.name.toLowerCase().includes('julie') ||
                    v.name.toLowerCase().includes('thomas') ||
                    v.name.toLowerCase().includes('daniel')
                ) || frenchVoices[0]

                if (preferredVoice) {
                    utterance.voice = preferredVoice
                    console.log(`🗣️ Voix sélectionnée: ${preferredVoice.name}`)
                }
            }

            if (speechSynthesis.getVoices().length > 0) {
                setVoice()
            } else {
                speechSynthesis.onvoiceschanged = setVoice
            }

            utterance.onend = () => {
                setIsPlaying(null)
            }

            speechSynthesis.speak(utterance)
        } else {
            setIsPlaying(null)
        }
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
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        🤔 Qu'est-ce que c'est ?
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
                                    backgroundColor: '#3b82f6',
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
                    color: '#3b82f6'
                }}>
                    🤔 Qu'est-ce que c'est ?
                </h1>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '30px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={retourSelection}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Retour sélection"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => router.push('/lire/reconnaitre-les-mots')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Menu exercices"
                    >
                        👁️
                    </button>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Menu Lire"
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Dashboard"
                    >
                        🏠
                    </button>
                </div>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Regardez le mot écrit et écoutez les propositions
                </p>

                {/* Mot affiché */}
                {currentMot && (
                    <div style={{
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#3b82f6'
                        }}>
                            {currentMot.contenu}
                        </div>
                    </div>
                )}

                {/* Options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 768 ?
                        (displayedMots.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)') :
                        'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: typeof window !== 'undefined' && window.innerWidth <= 768 ? '6px' : '20px'
                }}>
                    {displayedMots.map((mot, index) => (
                        <div key={`${mot.id}-${index}`} style={{
                            background: '#fff',
                            border: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1px solid' : '2px solid',
                            borderColor: '#dee2e6',
                            borderRadius: typeof window !== 'undefined' && window.innerWidth <= 768 ? '6px' : '8px',
                            padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px' : '15px',
                            transition: 'all 0.3s'
                        }}>
                            {/* Numéro en haut */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px' : '12px'
                            }}>
                                <span style={{
                                    fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '12px' : '16px',
                                    fontWeight: 'bold',
                                    color: '#333'
                                }}>
                                    {index + 1}
                                </span>
                            </div>

                            {/* Boutons côte à côte */}
                            <div style={{
                                display: 'flex',
                                gap: typeof window !== 'undefined' && window.innerWidth <= 768 ? '6px' : '10px'
                            }}>
                                {/* Bouton écouter à gauche */}
                                <button
                                    onClick={() => playAudio(mot.id, mot.contenu)}
                                    style={{
                                        backgroundColor: isPlaying === mot.id ? '#f59e0b' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px' : '12px',
                                        fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '14px' : '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        flex: 1,
                                        minHeight: typeof window !== 'undefined' && window.innerWidth <= 768 ? '36px' : '44px'
                                    }}
                                >
                                    {isPlaying === mot.id ? '⏸️' : '🔊'}
                                </button>

                                {/* Bouton validation à droite */}
                                <button
                                    onClick={() => handleAnswer(mot)}
                                    disabled={!!feedback}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#3b82f6',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '4px',
                                        padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px' : '12px',
                                        fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '14px' : '16px',
                                        fontWeight: 'bold',
                                        cursor: feedback ? 'not-allowed' : 'pointer',
                                        opacity: feedback ? 0.7 : 1,
                                        transition: 'all 0.2s',
                                        flex: 1,
                                        minHeight: typeof window !== 'undefined' && window.innerWidth <= 768 ? '36px' : '44px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!feedback) {
                                            e.target.style.backgroundColor = '#3b82f6'
                                            e.target.style.color = 'white'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!feedback) {
                                            e.target.style.backgroundColor = 'transparent'
                                            e.target.style.color = '#3b82f6'
                                        }
                                    }}
                                >
                                    ✓
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Feedback */}
                {feedback && (
                    <div style={{
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: feedback.includes('✅') ? '#10b981' : '#ef4444',
                        marginBottom: '20px'
                    }}>
                        {feedback}
                    </div>
                )}
            </div>
        </div>
    )
}
