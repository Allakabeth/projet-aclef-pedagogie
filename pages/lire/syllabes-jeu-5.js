import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu5() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(0)
    const [currentSyllable, setCurrentSyllable] = useState(null)
    const [options, setOptions] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [maxPossibleScore, setMaxPossibleScore] = useState(0)
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [correctAnswer, setCorrectAnswer] = useState(null)
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

            // Récupérer tous les paniers de syllabes de l'utilisateur
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
                            // Gérer les deux formats : ancien (string) et nouveau (objet)
                            if (typeof motData === 'object' && motData.segmentation) {
                                // Nouveau format avec segmentation
                                const motComplet = motData.segmentation.join('')
                                if (motData.segmentation.length >= 2) {
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
            alert('Vous devez avoir au moins 10 mots multisyllabiques dans vos paniers pour jouer !\nAllez d\'abord organiser vos syllabes.')
            return
        }

        // Collecter toutes les syllabes uniques
        const allSyllables = new Set()
        allWords.forEach(word => {
            word.segmentation.forEach(syllabe => {
                allSyllables.add(syllabe)
            })
        })

        if (allSyllables.size < 20) {
            alert('Vous devez avoir au moins 20 syllabes différentes pour jouer !\nOrganisez plus de mots dans vos paniers.')
            return
        }

        // Prendre 15 syllabes au hasard pour le jeu
        const syllablesArray = [...allSyllables]
        const selectedSyllables = syllablesArray
            .sort(() => 0.5 - Math.random())
            .slice(0, 15)
            .map((syllabe, index) => ({
                id: index,
                syllabe: syllabe,
                source: allWords.find(word => word.segmentation.includes(syllabe))
            }))

        setGameWords(selectedSyllables)
        setMaxPossibleScore(selectedSyllables.length * 5)
        console.log('Syllabes sélectionnées:', selectedSyllables)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentSyllableIndex(0)
        setIsGameComplete(false)
        startNewRound()
    }

    const startNewRound = (syllableIndex = currentSyllableIndex) => {
        if (syllableIndex >= gameWords.length) {
            setIsGameComplete(true)
            return
        }

        const syllable = gameWords[syllableIndex]
        setCurrentSyllable(syllable)

        // Créer 4 options : la bonne + 3 mauvaises
        const otherSyllables = gameWords
            .filter(s => s.syllabe !== syllable.syllabe)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)

        const allOptions = [syllable, ...otherSyllables]
            .sort(() => 0.5 - Math.random())

        setOptions(allOptions)
        setCorrectAnswer(syllable.syllabe)
        setSelectedOption(null)
        setIsRoundComplete(false)

        // Lecture automatique de la syllabe avec un petit délai
        setTimeout(() => {
            lireTexte(syllable.syllabe)
        }, 500)

        console.log(`Round ${syllableIndex + 1}: syllabe "${syllable.syllabe}"`)
    }

    const handleOptionClick = (option) => {
        if (isRoundComplete) return

        setSelectedOption(option.syllabe)

        if (option.syllabe === correctAnswer) {
            setScore(score + 5)
        } else {
            setScore(Math.max(0, score - 2))
        }

        setIsRoundComplete(true)

        setTimeout(() => {
            const nextIndex = currentSyllableIndex + 1
            setCurrentSyllableIndex(nextIndex)
            startNewRound(nextIndex)
        }, 2000)
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentSyllableIndex(0)
        setSelectedOption(null)
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
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
                        🔍 Jeu 5 - Syllabe mystère
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '16px',
                        opacity: 0.9
                    }}>
                        Écoutez la syllabe et trouvez-la parmi les choix !
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
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px',
                            lineHeight: '1.6'
                        }}>
                            Dans ce jeu, vous allez entendre une syllabe et devrez la retrouver parmi 4 choix visuels.<br/>
                            Écoutez bien et cliquez sur la bonne syllabe !
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
                            Bravo ! Jeu terminé !
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
                            <div>Syllabe {currentSyllableIndex + 1}/{gameWords.length}</div>
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

                        {/* Zone audio */}
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
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔊</div>
                                <p style={{
                                    color: 'white',
                                    fontSize: '18px',
                                    marginBottom: '20px'
                                }}>
                                    Écoutez la syllabe mystère
                                </p>
                                <button
                                    onClick={() => currentSyllable && lireTexte(currentSyllable.syllabe)}
                                    style={{
                                        background: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
                                        color: 'white',
                                        padding: '15px 30px',
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
                            </div>
                        </div>

                        {/* Options */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: window.innerWidth <= 768 ? '1fr 1fr' : 'repeat(2, 1fr)',
                            gap: '15px',
                            marginBottom: '30px'
                        }}>
                            {options.map((option, index) => {
                                let backgroundColor = 'rgba(255,255,255,0.2)'
                                let borderColor = 'transparent'

                                if (isRoundComplete && selectedOption === option.syllabe) {
                                    if (option.syllabe === correctAnswer) {
                                        backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                        borderColor = '#26de81'
                                    } else {
                                        backgroundColor = 'rgba(255, 107, 107, 0.8)'
                                        borderColor = '#ff6b6b'
                                    }
                                } else if (isRoundComplete && option.syllabe === correctAnswer) {
                                    backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                    borderColor = '#26de81'
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleOptionClick(option)}
                                        disabled={isRoundComplete}
                                        style={{
                                            background: backgroundColor,
                                            color: 'white',
                                            padding: '25px 20px',
                                            border: `3px solid ${borderColor}`,
                                            borderRadius: '15px',
                                            fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                                            fontWeight: 'bold',
                                            cursor: isRoundComplete ? 'default' : 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease',
                                            opacity: isRoundComplete && option.syllabe !== correctAnswer && selectedOption !== option.syllabe ? 0.5 : 1
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
                                        {option.syllabe}
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
                                backgroundColor: selectedOption === correctAnswer ? 'rgba(38, 222, 129, 0.3)' : 'rgba(255, 107, 107, 0.3)'
                            }}>
                                {selectedOption === correctAnswer ? '✅ Correct !' : `❌ La bonne réponse était : ${correctAnswer}`}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}