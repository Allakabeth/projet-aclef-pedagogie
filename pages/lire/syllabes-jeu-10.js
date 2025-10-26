import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu10() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentWord, setCurrentWord] = useState(null)
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [maxPossibleScore, setMaxPossibleScore] = useState(0)
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [userTaps, setUserTaps] = useState([])
    const [expectedTaps, setExpectedTaps] = useState([])
    const [showRhythm, setShowRhythm] = useState(false)
    const [rhythmStartTime, setRhythmStartTime] = useState(null)
    const [feedback, setFeedback] = useState(null)
    const rhythmTimeoutRef = useRef()
    const router = useRouter()

    // Système audio intelligent (ElevenLabs + Web Speech fallback)
    const lireTexte = async (text) => {
        if (!text.trim()) return

        // Vérifier le cache ElevenLabs
        const cacheKey = `voice_Paul_${btoa(text).replace(/[^a-zA-Z0-9]/g, '')}`
        const cachedAudio = localStorage.getItem(cacheKey)

        if (cachedAudio) {
            const audio = new Audio(cachedAudio)
            audio.play()
            return
        }

        // Essayer ElevenLabs si pas en cache
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7'
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Sauvegarder en cache
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
            utterance.pitch = 0.6

            // Essayer de trouver une voix masculine
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('paul'))
            )

            if (maleVoice) {
                utterance.voice = maleVoice
            } else {
                utterance.pitch = 0.4
            }

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
        loadUserWords()
    }, [router])

    const loadUserWords = async () => {
        try {
            const token = localStorage.getItem('token')

            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const allWords = []

                Object.keys(data.paniers || {}).forEach(lettre => {
                    Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                        const mots = data.paniers[lettre][nomPanier] || []
                        mots.forEach(motData => {
                            if (typeof motData === 'object' && motData.segmentation) {
                                const motComplet = motData.segmentation.join('')
                                if (motData.segmentation.length >= 2 && motData.segmentation.length <= 5) {
                                    allWords.push({
                                        mot: motComplet,
                                        segmentation: motData.segmentation,
                                        panier: nomPanier,
                                        lettre: lettre
                                    })
                                }
                            }
                        })
                    })
                })

                prepareGame(allWords)
            } else {
                console.error('Erreur chargement paniers')
            }
        } catch (error) {
            console.error('Erreur chargement paniers:', error)
        }
    }

    const prepareGame = (allWords) => {
        if (allWords.length < 10) {
            alert('Vous devez avoir au moins 10 mots multisyllabiques dans vos paniers pour jouer !')
            return
        }

        // Sélectionner 12 mots au hasard
        const shuffledWords = [...allWords].sort(() => 0.5 - Math.random())
        const selectedWords = []
        const usedWords = new Set()

        for (const word of shuffledWords) {
            if (selectedWords.length >= 12) break

            if (!usedWords.has(word.mot.toLowerCase())) {
                usedWords.add(word.mot.toLowerCase())
                selectedWords.push({
                    id: selectedWords.length,
                    original: word.mot,
                    segmentation: word.segmentation,
                    syllableCount: word.segmentation.length,
                    panier: word.panier,
                    lettre: word.lettre
                })
            }
        }

        setGameWords(selectedWords)
        setMaxPossibleScore(selectedWords.length * 10)
        console.log('Mots sélectionnés:', selectedWords)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentWordIndex(0)
        setIsGameComplete(false)
        startNewRound()
    }

    const startNewRound = (wordIndex = currentWordIndex) => {
        if (wordIndex >= gameWords.length) {
            setIsGameComplete(true)
            return
        }

        const word = gameWords[wordIndex]
        setCurrentWord(word)
        setUserTaps([])
        setExpectedTaps([])
        setIsRoundComplete(false)
        setShowRhythm(false)
        setFeedback(null)

        // Lecture automatique du mot avec un petit délai
        setTimeout(() => {
            lireTexte(word.original)
        }, 500)

        console.log(`Round ${wordIndex + 1}: mot "${word.original}" avec ${word.syllableCount} syllabes`)
    }

    const demonstrateRhythm = () => {
        if (!currentWord || showRhythm) return

        setShowRhythm(true)
        setRhythmStartTime(Date.now())

        // Créer le rythme attendu (une pulsation par syllabe)
        const syllableDuration = 800 // 800ms par syllabe
        const expectedRhythm = []

        currentWord.segmentation.forEach((_, index) => {
            expectedRhythm.push(index * syllableDuration)
        })

        setExpectedTaps(expectedRhythm)

        // Jouer le rythme visuellement
        currentWord.segmentation.forEach((syllable, index) => {
            setTimeout(() => {
                // Effet visuel pour chaque syllabe
                const syllableElements = document.querySelectorAll(`[data-syllable-index="${index}"]`)
                syllableElements.forEach(el => {
                    if (el) {
                        el.style.transform = 'scale(1.2)'
                        el.style.backgroundColor = '#ff6b6b'
                        setTimeout(() => {
                            el.style.transform = 'scale(1)'
                            el.style.backgroundColor = 'rgba(255,255,255,0.2)'
                        }, 300)
                    }
                })
            }, index * syllableDuration)
        })

        // Arrêter la démonstration après le dernier battement
        rhythmTimeoutRef.current = setTimeout(() => {
            setShowRhythm(false)
        }, expectedRhythm[expectedRhythm.length - 1] + 1000)
    }

    const handleTap = () => {
        if (showRhythm || isRoundComplete || !currentWord) return

        const now = Date.now()
        if (!rhythmStartTime) {
            setRhythmStartTime(now)
            setUserTaps([0])
        } else {
            const timeSinceStart = now - rhythmStartTime
            setUserTaps(prev => [...prev, timeSinceStart])
        }

        // Vérifier si on a assez de taps
        const newTapCount = userTaps.length + 1
        if (newTapCount >= currentWord.syllableCount) {
            // Évaluer la performance après un court délai
            setTimeout(() => {
                evaluateRhythm()
            }, 500)
        }
    }

    const evaluateRhythm = () => {
        if (!currentWord || userTaps.length === 0) return

        const tolerance = 400 // Tolérance de 400ms
        let correctTaps = 0
        let points = 0

        // Vérifier le nombre de taps
        if (userTaps.length === currentWord.syllableCount) {
            correctTaps++
            points += 5 // Points pour le bon nombre de taps
        }

        // Vérifier la régularité du rythme
        if (userTaps.length >= 2) {
            const intervals = []
            for (let i = 1; i < userTaps.length; i++) {
                intervals.push(userTaps[i] - userTaps[i - 1])
            }

            // Calculer la moyenne des intervalles
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

            // Vérifier si les intervalles sont réguliers
            const isRegular = intervals.every(interval =>
                Math.abs(interval - avgInterval) <= tolerance
            )

            if (isRegular) {
                correctTaps++
                points += 5 // Points pour la régularité
            }
        }

        setScore(score + points)

        // Feedback visuel
        let feedbackMessage = ''
        if (points >= 8) {
            feedbackMessage = '🎵 Parfait ! Excellent rythme !'
        } else if (points >= 5) {
            feedbackMessage = '👍 Bien ! Bon rythme !'
        } else if (userTaps.length === currentWord.syllableCount) {
            feedbackMessage = '✋ Bon nombre de taps, mais travaillez la régularité'
        } else {
            feedbackMessage = `❌ Il fallait taper ${currentWord.syllableCount} fois (vous: ${userTaps.length})`
        }

        setFeedback(feedbackMessage)
        setIsRoundComplete(true)

        setTimeout(() => {
            const nextIndex = currentWordIndex + 1
            setCurrentWordIndex(nextIndex)
            startNewRound(nextIndex)
        }, 3000)
    }

    const resetGame = () => {
        if (rhythmTimeoutRef.current) {
            clearTimeout(rhythmTimeoutRef.current)
        }
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentWordIndex(0)
        setUserTaps([])
        setExpectedTaps([])
        setIsRoundComplete(false)
        setIsGameComplete(false)
        setShowRhythm(false)
        setFeedback(null)
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '700px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '30px'
                }}>
                    <h1 style={{
                        fontSize: 'clamp(24px, 5vw, 32px)',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        marginBottom: '10px'
                    }}>
                        🥁 Jeu 10 - Rythme des syllabes
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '16px',
                        opacity: 0.9
                    }}>
                        Tapez le rythme des syllabes !
                    </p>
                </div>

                {!gameStarted ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🥁</div>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px',
                            lineHeight: '1.6'
                        }}>
                            Écoutez le mot, regardez la démonstration du rythme, puis tapez sur le tambour<br/>
                            une fois par syllabe avec un rythme régulier !
                        </p>
                        <button
                            onClick={startGame}
                            style={{
                                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '15px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎮 Commencer
                        </button>
                    </div>
                ) : isGameComplete ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '40px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏆</div>
                        <h2 style={{
                            color: 'white',
                            fontSize: '24px',
                            marginBottom: '20px'
                        }}>
                            Bravo ! Concert terminé !
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px'
                        }}>
                            Vous avez un sens du rythme de {Math.round((score / maxPossibleScore) * 100)}% !<br/>
                            Score final : {score}/{maxPossibleScore} points
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    background: 'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Nouveau concert
                            </button>
                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: '2px solid white',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Retour au menu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '30px'
                    }}>
                        {/* Progression et score */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '30px',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            <div>Mot {currentWordIndex + 1}/{gameWords.length}</div>
                            <div>Score: {score}/{maxPossibleScore}</div>
                        </div>

                        {/* Mot et syllabes */}
                        {currentWord && (
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '30px'
                            }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '15px',
                                    padding: '25px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{
                                        fontSize: 'clamp(28px, 6vw, 40px)',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        marginBottom: '20px',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {currentWord.original}
                                    </div>

                                    {/* Syllabes avec effet visuel */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        marginBottom: '20px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {currentWord.segmentation.map((syllable, index) => (
                                            <div
                                                key={index}
                                                data-syllable-index={index}
                                                style={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    padding: '10px 15px',
                                                    borderRadius: '10px',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {syllable}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => lireTexte(currentWord.original)}
                                            style={{
                                                background: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
                                                color: 'white',
                                                padding: '10px 20px',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔊 Écouter
                                        </button>
                                        <button
                                            onClick={demonstrateRhythm}
                                            disabled={showRhythm}
                                            style={{
                                                background: showRhythm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #a55eea 0%, #8854d0 100%)',
                                                color: 'white',
                                                padding: '10px 20px',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: showRhythm ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {showRhythm ? '🎵 Démonstration...' : '👀 Voir le rythme'}
                                        </button>
                                    </div>
                                </div>

                                <p style={{
                                    color: 'white',
                                    fontSize: '16px',
                                    marginBottom: '20px'
                                }}>
                                    Tapez {currentWord.syllableCount} fois avec un rythme régulier
                                    {userTaps.length > 0 && ` (${userTaps.length}/${currentWord.syllableCount})`}
                                </p>
                            </div>
                        )}

                        {/* Tambour */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '30px'
                        }}>
                            <button
                                onClick={handleTap}
                                disabled={showRhythm || isRoundComplete}
                                style={{
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: showRhythm || isRoundComplete ?
                                        'rgba(255,255,255,0.1)' :
                                        'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                                    color: 'white',
                                    fontSize: '48px',
                                    cursor: showRhythm || isRoundComplete ? 'not-allowed' : 'pointer',
                                    boxShadow: showRhythm || isRoundComplete ?
                                        'none' :
                                        '0 10px 30px rgba(255, 107, 107, 0.3)',
                                    transition: 'all 0.1s ease',
                                    userSelect: 'none'
                                }}
                                onMouseDown={(e) => {
                                    if (!showRhythm && !isRoundComplete) {
                                        e.target.style.transform = 'scale(0.95)'
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!showRhythm && !isRoundComplete) {
                                        e.target.style.transform = 'scale(1)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showRhythm && !isRoundComplete) {
                                        e.target.style.transform = 'scale(1)'
                                    }
                                }}
                            >
                                🥁
                            </button>
                        </div>

                        {/* Instructions */}
                        <div style={{
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '14px',
                            opacity: 0.8,
                            marginBottom: '20px'
                        }}>
                            {showRhythm ?
                                'Regardez bien le rythme...' :
                                isRoundComplete ?
                                'Rond terminé !' :
                                'Cliquez sur le tambour pour taper le rythme'
                            }
                        </div>

                        {/* Feedback */}
                        {feedback && (
                            <div style={{
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '16px',
                                padding: '15px',
                                borderRadius: '10px',
                                backgroundColor: feedback.includes('Parfait') || feedback.includes('Bien') ?
                                    'rgba(38, 222, 129, 0.3)' : 'rgba(255, 107, 107, 0.3)'
                            }}>
                                {feedback}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}