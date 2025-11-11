import { useState, useEffect } from 'react'

export default function ExerciceQuestCe({ selectedTextes, retourSelection }) {
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
            { name: 'Julie (ElevenLabs)', id: 'tMyQcCxfGDdIt7wJ2RQw', type: 'elevenlabs' }
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

        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: selectedVoice
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
            } else {
                throw new Error('ElevenLabs failed')
            }
        } catch (error) {
            console.log('Fallback vers Web Speech API')
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = 'fr-FR'
                utterance.rate = 0.8

                utterance.onend = () => {
                    setIsPlaying(null)
                }

                speechSynthesis.speak(utterance)
            } else {
                setIsPlaying(null)
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

                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Regardez le mot écrit et écoutez les propositions
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
                    background: '#f0f9ff',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    <h3 style={{ color: '#1d4ed8', marginBottom: '10px' }}>
                        📊 Score : {score}/{attempts} ({attempts > 0 ? Math.round((score/attempts)*100) : 0}%)
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Mots restants : {shuffledMots.length - completedMots.length}
                    </p>
                </div>

                {/* Mot affiché */}
                {currentMot && (
                    <div style={{
                        background: '#fef3c7',
                        padding: '40px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{
                            color: '#92400e',
                            marginBottom: '20px',
                            fontSize: '20px'
                        }}>
                            👁️ Regardez ce mot et écoutez les propositions :
                        </h2>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#b45309',
                            padding: '20px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            {currentMot.contenu}
                        </div>
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
                                border: '2px solid #3b82f6',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#333',
                                cursor: feedback ? 'not-allowed' : 'pointer',
                                opacity: feedback ? 0.7 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseOver={(e) => !feedback && (e.target.style.background = '#f0f9ff')}
                            onMouseOut={(e) => !feedback && (e.target.style.background = 'white')}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    playAudio(mot.id, mot.contenu)
                                }}
                                disabled={isPlaying === mot.id}
                                style={{
                                    background: isPlaying === mot.id ? '#ccc' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    fontSize: '14px',
                                    cursor: isPlaying === mot.id ? 'not-allowed' : 'pointer'
                                }}
                            >
                                🔊
                            </button>
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
