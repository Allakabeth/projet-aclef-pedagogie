import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu9() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
    const [currentRound, setCurrentRound] = useState(null)
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [maxPossibleScore, setMaxPossibleScore] = useState(0)
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [correctAnswer, setCorrectAnswer] = useState(null)
    const router = useRouter()

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
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
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
        if (allWords.length < 5) {
            alert('Vous devez avoir au moins 5 mots multisyllabiques dans vos paniers pour jouer !')
            return
        }

        // Créer 12 rounds de jeu
        const rounds = []
        const maxRounds = 12

        // Collecter toutes les syllabes disponibles
        const allSyllables = []
        allWords.forEach(word => {
            word.segmentation.forEach(syllabe => {
                allSyllables.push({
                    syllabe: syllabe,
                    sourceWord: word.mot
                })
            })
        })

        // Grouper les syllabes par mot d'origine
        const syllablesByWord = {}
        allWords.forEach(word => {
            syllablesByWord[word.mot] = word.segmentation
        })

        for (let i = 0; i < maxRounds; i++) {
            // Choisir un mot au hasard comme base
            const baseWord = allWords[Math.floor(Math.random() * allWords.length)]

            // Adapter selon le nombre de syllabes du mot
            let selectedSyllables = []
            let intruders = []

            if (baseWord.segmentation.length === 2) {
                // Pour un mot de 2 syllabes : prendre les 2 syllabes + 2 intrus
                selectedSyllables = [baseWord.segmentation[0], baseWord.segmentation[1]]

                // Trouver 2 syllabes intruses
                const otherSyllables = allSyllables
                    .filter(s => s.sourceWord !== baseWord.mot)
                    .map(s => s.syllabe)

                if (otherSyllables.length < 2) continue

                const shuffledIntruders = otherSyllables.sort(() => 0.5 - Math.random())
                intruders = [shuffledIntruders[0], shuffledIntruders[1]]

            } else if (baseWord.segmentation.length >= 3) {
                // Pour un mot de 3+ syllabes : prendre 3 + 1 intrus
                selectedSyllables = baseWord.segmentation
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)

                const otherSyllables = allSyllables
                    .filter(s => s.sourceWord !== baseWord.mot)
                    .map(s => s.syllabe)

                if (otherSyllables.length === 0) continue

                intruders = [otherSyllables[Math.floor(Math.random() * otherSyllables.length)]]
            } else {
                continue // Skip si moins de 2 syllabes
            }

            // Créer les 4 options
            const options = [...selectedSyllables, ...intruders].sort(() => 0.5 - Math.random())

            rounds.push({
                id: i,
                baseWord: baseWord.mot,
                baseSegmentation: baseWord.segmentation,
                options: options,
                intruders: intruders, // Peut être 1 ou 2 intrus selon le mot
                correctSyllables: selectedSyllables
            })
        }

        if (rounds.length < 8) {
            alert('Pas assez de variété dans vos syllabes pour créer ce jeu !\nOrganisez plus de mots différents.')
            return
        }

        // Prendre les 10 premiers rounds
        const finalRounds = rounds.slice(0, 10)

        setGameWords(finalRounds)
        setMaxPossibleScore(finalRounds.length * 10)
        console.log('Rounds préparés:', finalRounds)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentRoundIndex(0)
        setIsGameComplete(false)
        startNewRound()
    }

    const startNewRound = (roundIndex = currentRoundIndex) => {
        if (roundIndex >= gameWords.length) {
            setIsGameComplete(true)
            return
        }

        const round = gameWords[roundIndex]
        setCurrentRound(round)
        setCorrectAnswer(round.intruders) // Maintenant c'est un array
        setSelectedAnswer(null)
        setIsRoundComplete(false)

        console.log(`Round ${roundIndex + 1}: mot "${round.baseWord}", intrus: "${round.intruders.join(', ')}")`)
    }

    const handleAnswerClick = (syllable) => {
        if (isRoundComplete) return

        setSelectedAnswer(syllable)

        if (correctAnswer.includes(syllable)) {
            setScore(score + 10)
        } else {
            setScore(Math.max(0, score - 3))
        }

        setIsRoundComplete(true)

        setTimeout(() => {
            const nextIndex = currentRoundIndex + 1
            setCurrentRoundIndex(nextIndex)
            startNewRound(nextIndex)
        }, 3000)
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentRoundIndex(0)
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
                        🕵️ Jeu 9 - Syllabe intruse
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '16px',
                        opacity: 0.9
                    }}>
                        Trouvez la syllabe qui ne fait pas partie du mot !
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
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🕵️</div>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px',
                            lineHeight: '1.6'
                        }}>
                            On vous présente un mot et 4 syllabes. 3 syllabes font partie du mot, mais 1 syllabe est une intruse !<br/>
                            Fonctionne avec des mots de 2 syllabes et plus. Votre mission : trouver l'intruse !
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
                            🎮 Commencer l'enquête
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
                            Bravo détective ! Enquête terminée !
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px'
                        }}>
                            Vous avez résolu {Math.round((score / maxPossibleScore) * 100)}% des affaires !<br/>
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
                                🔄 Nouvelle enquête
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
                            <div>Affaire {currentRoundIndex + 1}/{gameWords.length}</div>
                            <div>Score: {score}/{maxPossibleScore}</div>
                        </div>

                        {/* Mot de référence */}
                        {currentRound && (
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '40px'
                            }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '15px',
                                    padding: '25px',
                                    marginBottom: '20px'
                                }}>
                                    <p style={{
                                        color: 'white',
                                        fontSize: '16px',
                                        marginBottom: '15px',
                                        opacity: 0.9
                                    }}>
                                        Le mot de référence est :
                                    </p>
                                    <div style={{
                                        fontSize: 'clamp(28px, 6vw, 40px)',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        marginBottom: '15px',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {currentRound.baseWord}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: 'white',
                                        opacity: 0.8
                                    }}>
                                        Syllabes : {currentRound.baseSegmentation.join(' - ')}
                                    </div>
                                </div>

                                <p style={{
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                }}>
                                    {currentRound.baseSegmentation.length === 2 ?
                                        'Quelles 2 syllabes ne font PAS partie de ce mot ?' :
                                        'Quelle syllabe ne fait PAS partie de ce mot ?'
                                    }
                                </p>
                            </div>
                        )}

                        {/* Options de syllabes */}
                        {currentRound && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                                gap: '15px',
                                marginBottom: '30px',
                                maxWidth: '500px',
                                margin: '0 auto 30px auto'
                            }}>
                                {currentRound.options.map((syllable, index) => {
                                    let backgroundColor = 'rgba(255,255,255,0.2)'
                                    let borderColor = 'transparent'

                                    if (isRoundComplete && selectedAnswer === syllable) {
                                        if (correctAnswer.includes(syllable)) {
                                            backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                            borderColor = '#26de81'
                                        } else {
                                            backgroundColor = 'rgba(255, 107, 107, 0.8)'
                                            borderColor = '#ff6b6b'
                                        }
                                    } else if (isRoundComplete && correctAnswer.includes(syllable)) {
                                        backgroundColor = 'rgba(38, 222, 129, 0.8)'
                                        borderColor = '#26de81'
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswerClick(syllable)}
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
                                                opacity: isRoundComplete && !correctAnswer.includes(syllable) && selectedAnswer !== syllable ? 0.5 : 1
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
                                            {syllable}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Feedback */}
                        {isRoundComplete && currentRound && (
                            <div style={{
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '16px',
                                padding: '20px',
                                borderRadius: '10px',
                                backgroundColor: correctAnswer.includes(selectedAnswer) ? 'rgba(38, 222, 129, 0.3)' : 'rgba(255, 107, 107, 0.3)'
                            }}>
                                {correctAnswer.includes(selectedAnswer) ? (
                                    <div>
                                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🎯 Excellent !</div>
                                        <div>"{selectedAnswer}" était bien {correctAnswer.length > 1 ? 'une des intruses' : 'l\'intruse'} ! Elle ne fait pas partie du mot "{currentRound.baseWord}".</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🔍 Pas tout à fait...</div>
                                        <div>{correctAnswer.length > 1 ? 'Les intruses étaient' : 'L\'intruse était'} "{correctAnswer.join(', ')}". La syllabe "{selectedAnswer}" fait bien partie du mot "{currentRound.baseWord}".</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}