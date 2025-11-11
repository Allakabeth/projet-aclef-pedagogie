import { useState, useEffect } from 'react'

export default function ExerciceOuEst({ selectedTextes, retourSelection }) {
    const [allMots, setAllMots] = useState([])
    const [currentMot, setCurrentMot] = useState(null)
    const [shuffledMots, setShuffledMots] = useState([])
    const [displayedMots, setDisplayedMots] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [feedback, setFeedback] = useState('')
    const [completedMots, setCompletedMots] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [availableVoices, setAvailableVoices] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })

    useEffect(() => {
        loadVoices()
        startGame()
    }, [])

    const loadVoices = () => {
        setAvailableVoices([
            { name: 'Paul (ElevenLabs)', id: 'AfbuxQ9DVtS4azaxN1W7', type: 'elevenlabs' },
            { name: 'Julie (ElevenLabs)', id: 'tMyQcCxfGDdIt7wJ2RQw', type: 'elevenlabs' },
            { name: 'Voix système (Web Speech)', id: 'webspeech', type: 'webspeech' }
        ])
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

    const playAudioAuto = async (text) => {
        if (!text) return

        // Réinitialiser complètement l'état audio
        setIsPlaying(false)
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel()
        }

        // Attendre un peu puis lancer l'audio
        setTimeout(async () => {
            setIsPlaying(true)

            // Si Web Speech est sélectionné, utiliser directement
            if (selectedVoice === 'webspeech') {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(`Trouvez le mot ${text}`)
                    utterance.lang = 'fr-FR'
                    utterance.rate = 0.8

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
                return
            }

            // Sinon, essayer ElevenLabs
            try {
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        text: `Trouvez le mot ${text}`,
                        voice_id: selectedVoice
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    const audio = new Audio(data.audio)
                    setCurrentAudio(audio)

                    audio.onended = () => {
                        setIsPlaying(false)
                        setCurrentAudio(null)
                    }

                    await audio.play()
                } else {
                    throw new Error('ElevenLabs failed')
                }
            } catch (error) {
                console.log('Fallback vers Web Speech API')
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(`Trouvez le mot ${text}`)
                    utterance.lang = 'fr-FR'
                    utterance.rate = 0.8

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
        }, 100)
    }

    const playAudio = async (text) => {
        if (!text || isPlaying) return

        setIsPlaying(true)

        // Si Web Speech est sélectionné, utiliser directement
        if (selectedVoice === 'webspeech') {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(`Trouvez le mot ${text}`)
                utterance.lang = 'fr-FR'
                utterance.rate = 0.8

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
            return
        }

        // Sinon, essayer ElevenLabs
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: `Trouvez le mot ${text}`,
                    voice_id: selectedVoice
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(false)
                    setCurrentAudio(null)
                }

                await audio.play()
            } else {
                throw new Error('ElevenLabs failed')
            }
        } catch (error) {
            console.log('Fallback vers Web Speech API')
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(`Trouvez le mot ${text}`)
                utterance.lang = 'fr-FR'
                utterance.rate = 0.8

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

                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Écoutez le mot et trouvez-le parmi les choix proposés
                </p>

                {/* Sélection de la voix */}
                <div style={{
                    background: '#fef3c7',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{
                        marginBottom: '15px',
                        color: '#92400e',
                        fontSize: '16px',
                        textAlign: 'center'
                    }}>
                        🎤 Choisissez une voix
                    </h3>
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        {availableVoices.map(voice => (
                            <button
                                key={voice.id}
                                onClick={() => setSelectedVoice(voice.id)}
                                style={{
                                    padding: '8px 16px',
                                    border: selectedVoice === voice.id ? '2px solid #d97706' : '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    background: selectedVoice === voice.id ? '#fef3c7' : 'white',
                                    color: selectedVoice === voice.id ? '#92400e' : '#374151',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: selectedVoice === voice.id ? 'bold' : 'normal'
                                }}
                            >
                                {voice.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* En-tête de jeu */}
                <div style={{
                    background: '#f0fdf4',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    <h3 style={{ color: '#166534', marginBottom: '10px' }}>
                        📊 Score : {score}/{attempts} ({attempts > 0 ? Math.round((score/attempts)*100) : 0}%)
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Mots restants : {shuffledMots.length - completedMots.length}
                    </p>
                </div>

                {/* Question */}
                {currentMot && (
                    <div style={{
                        background: '#fff7ed',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{
                            color: '#c2410c',
                            marginBottom: '20px',
                            fontSize: '24px'
                        }}>
                            🔊 Écoutez et trouvez le mot
                        </h2>
                        <button
                            onClick={() => playAudio(currentMot.contenu)}
                            disabled={isPlaying}
                            style={{
                                backgroundColor: isPlaying ? '#ccc' : '#ea580c',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: isPlaying ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isPlaying ? '🔊 Lecture...' : '🔊 Écouter'}
                        </button>
                    </div>
                )}

                {/* Options */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    {displayedMots.map((mot, index) => (
                        <button
                            key={`${mot.id}-${index}`}
                            onClick={() => handleAnswer(mot)}
                            disabled={!!feedback}
                            style={{
                                padding: '20px',
                                background: 'white',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#333',
                                cursor: feedback ? 'not-allowed' : 'pointer',
                                opacity: feedback ? 0.7 : 1,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => !feedback && (e.target.style.background = '#f0fdf4')}
                            onMouseOut={(e) => !feedback && (e.target.style.background = 'white')}
                        >
                            {mot.contenu}
                        </button>
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

                {/* Actions */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={retourSelection}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        📚 Changer de textes
                    </button>
                </div>
            </div>
        </div>
    )
}
