import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu8() {
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
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [correctAnswer, setCorrectAnswer] = useState(null)
    const [voixAuto, setVoixAuto] = useState(true)
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
                                if (motData.segmentation.length >= 2 && motData.segmentation.length <= 6) {
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

        // Sélectionner 15 mots au hasard
        const shuffledWords = [...allWords].sort(() => 0.5 - Math.random())
        const selectedWords = []
        const usedWords = new Set()

        for (const word of shuffledWords) {
            if (selectedWords.length >= 15) break

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
        setCorrectAnswer(word.syllableCount)
        setSelectedAnswer(null)
        setIsRoundComplete(false)

        // Lecture automatique du mot avec un petit délai (si activée)
        setTimeout(() => {
            if (voixAuto) {
                lireTexte(word.original)
            }
        }, 500)

        console.log(`Round ${wordIndex + 1}: mot "${word.original}" avec ${word.syllableCount} syllabes`)
    }

    const handleAnswerClick = (answer) => {
        if (isRoundComplete) return

        setSelectedAnswer(answer)

        if (answer === correctAnswer) {
            setScore(score + 10)
        } else {
            setScore(Math.max(0, score - 3))
        }

        setIsRoundComplete(true)

        setTimeout(() => {
            const nextIndex = currentWordIndex + 1
            setCurrentWordIndex(nextIndex)
            startNewRound(nextIndex)
        }, 2000)
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentWordIndex(0)
        setSelectedAnswer(null)
        setIsRoundComplete(false)
        setIsGameComplete(false)
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

    // Options de réponse (2 à 6 syllabes)
    const answerOptions = [2, 3, 4, 5, 6]

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
                        🔢 Jeu 1 - Compte les syllabes
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '16px',
                        opacity: 0.9
                    }}>
                        Comptez le nombre de syllabes dans chaque mot !
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
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔢</div>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px',
                            lineHeight: '1.6'
                        }}>
                            Dans ce jeu, vous devez compter le nombre de syllabes dans chaque mot affiché.<br/>
                            Écoutez bien le mot et cliquez sur le bon nombre !
                        </p>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
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
                                🎮 Commencer le jeu
                            </button>

                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '15px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 30px rgba(107, 114, 128, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                ← Retour au menu
                            </button>
                        </div>
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
                            Excellent ! Jeu terminé !
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px'
                        }}>
                            Vous avez terminé le jeu avec {score}/{maxPossibleScore} points !
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
                                🔄 Nouveau jeu
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
                            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                            fontWeight: 'bold',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setVoixAuto(!voixAuto)}
                                style={{
                                    backgroundColor: voixAuto ? '#10b981' : '#6b7280',
                                    color: 'white',
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                title={voixAuto ? 'Désactiver la voix automatique' : 'Activer la voix automatique'}
                            >
                                {voixAuto ? '🔊 Auto' : '🔇 Auto'}
                            </button>
                            <div>Mot {currentWordIndex + 1}/{gameWords.length}</div>
                            <div>Score: {score}/{maxPossibleScore}</div>
                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                            >
                                🚪 Quitter
                            </button>
                        </div>

                        {/* Mot à analyser */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '40px'
                        }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '15px',
                                padding: '30px',
                                marginBottom: '20px'
                            }}>
                                {currentWord && (
                                    <>
                                        <div style={{
                                            fontSize: 'clamp(32px, 8vw, 48px)',
                                            fontWeight: 'bold',
                                            color: 'white',
                                            marginBottom: '20px',
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                                        }}>
                                            {currentWord.original}
                                        </div>
                                        <button
                                            onClick={() => lireTexte(currentWord.original)}
                                            style={{
                                                background: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
                                                color: 'white',
                                                padding: '12px 24px',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                boxShadow: '0 5px 15px rgba(253, 121, 168, 0.3)'
                                            }}
                                        >
                                            🔊 Écouter
                                        </button>
                                    </>
                                )}
                            </div>

                            <p style={{
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: 'bold'
                            }}>
                                Combien de syllabes contient ce mot ?
                            </p>
                        </div>

                        {/* Options de réponse */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                            gap: '15px',
                            marginBottom: '30px',
                            maxWidth: '500px',
                            margin: '0 auto 30px auto'
                        }}>
                            {answerOptions.map(number => {
                                let backgroundColor = 'rgba(255,255,255,0.2)'
                                let borderColor = 'transparent'

                                if (isRoundComplete && selectedAnswer === number) {
                                    if (number === correctAnswer) {
                                        backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                        borderColor = '#26de81'
                                    } else {
                                        backgroundColor = 'rgba(255, 107, 107, 0.8)'
                                        borderColor = '#ff6b6b'
                                    }
                                } else if (isRoundComplete && number === correctAnswer) {
                                    backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                    borderColor = '#26de81'
                                }

                                return (
                                    <button
                                        key={number}
                                        onClick={() => handleAnswerClick(number)}
                                        disabled={isRoundComplete}
                                        style={{
                                            background: backgroundColor,
                                            color: 'white',
                                            padding: '20px',
                                            border: `3px solid ${borderColor}`,
                                            borderRadius: '15px',
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            cursor: isRoundComplete ? 'default' : 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease',
                                            opacity: isRoundComplete && number !== correctAnswer && selectedAnswer !== number ? 0.5 : 1
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isRoundComplete) {
                                                e.target.style.transform = 'translateY(-2px)'
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isRoundComplete) {
                                                e.target.style.transform = 'translateY(0)'
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                                            }
                                        }}
                                    >
                                        {number}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Feedback */}
                        {isRoundComplete && (
                            <div style={{
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '16px',
                                padding: '15px',
                                borderRadius: '10px',
                                backgroundColor: selectedAnswer === correctAnswer ? 'rgba(38, 222, 129, 0.3)' : 'rgba(255, 107, 107, 0.3)'
                            }}>
                                {selectedAnswer === correctAnswer ?
                                    '✅ Correct ! Ce mot a bien ' + correctAnswer + ' syllabes.' :
                                    `❌ Non, ce mot a ${correctAnswer} syllabes : ${currentWord.segmentation.join(' - ')}`
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}