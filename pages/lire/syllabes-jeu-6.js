import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu6() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([]) // 10 mots sélectionnés
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(0) // Quelle syllabe du mot actuel on attend
    const [allGameSyllables, setAllGameSyllables] = useState([]) // Toutes les syllabes des 10 mots
    const [fallingSyllables, setFallingSyllables] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [gameHeight, setGameHeight] = useState(400)
    const [lives, setLives] = useState(3)
    const animationRef = useRef()
    const gameAreaRef = useRef()
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

    useEffect(() => {
        // Adapter la hauteur du jeu selon l'écran
        const updateGameHeight = () => {
            if (window.innerWidth <= 768) {
                setGameHeight(Math.min(400, window.innerHeight * 0.5))
            } else {
                setGameHeight(500)
            }
        }

        updateGameHeight()
        window.addEventListener('resize', updateGameHeight)
        return () => window.removeEventListener('resize', updateGameHeight)
    }, [])

    useEffect(() => {
        let intervalId
        if (gameStarted && !isGameComplete) {
            intervalId = setInterval(() => {
                addFallingSyllable()
            }, 2000) // Vérification toutes les 2 secondes
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [gameStarted, isGameComplete, allGameSyllables])

    useEffect(() => {
        if (gameStarted && !isGameComplete) {
            animationRef.current = requestAnimationFrame(animateFallingSyllables)
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [gameStarted, fallingSyllables, isGameComplete])

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
            alert('Vous devez avoir au moins 10 mots multisyllabiques dans vos paniers pour jouer !')
            return
        }

        // Sélectionner 10 mots au hasard
        const shuffledWords = [...allWords].sort(() => 0.5 - Math.random())
        const selectedWords = []
        const usedWords = new Set()

        for (const word of shuffledWords) {
            if (selectedWords.length >= 10) break

            if (!usedWords.has(word.mot.toLowerCase())) {
                usedWords.add(word.mot.toLowerCase())
                selectedWords.push({
                    id: selectedWords.length,
                    original: word.mot,
                    segmentation: word.segmentation,
                    panier: word.panier,
                    lettre: word.lettre
                })
            }
        }

        // Créer la liste de toutes les syllabes des 10 mots
        const allSyllables = []
        selectedWords.forEach(word => {
            word.segmentation.forEach(syllabe => {
                allSyllables.push(syllabe)
            })
        })

        setGameWords(selectedWords)
        setAllGameSyllables(allSyllables)
        console.log('10 mots sélectionnés:', selectedWords)
        console.log('Toutes les syllabes:', allSyllables)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentWordIndex(0)
        setCurrentSyllableIndex(0)
        setFallingSyllables([])
        setIsGameComplete(false)
        setLives(3)
    }

    const addFallingSyllable = () => {
        if (!gameStarted || isGameComplete || allGameSyllables.length === 0) return

        // Maximum 4 syllabes à l'écran
        if (fallingSyllables.length >= 4) return

        const currentWord = gameWords[currentWordIndex]
        const expectedSyllable = currentWord?.segmentation[currentSyllableIndex]

        let selectedSyllable

        // 60% de chance que ce soit la syllabe attendue, 40% une autre
        if (Math.random() < 0.6 && expectedSyllable) {
            selectedSyllable = expectedSyllable
        } else {
            // Choisir une syllabe aléatoire parmi toutes les syllabes des 10 mots
            selectedSyllable = allGameSyllables[Math.floor(Math.random() * allGameSyllables.length)]
        }

        // Vérifier s'il y a déjà cette syllabe qui tombe (jamais deux fois la même en même temps)
        const hasThisSyllableFalling = fallingSyllables.some(s => s.text === selectedSyllable)
        if (hasThisSyllableFalling) return

        const gameWidth = gameAreaRef.current?.offsetWidth || 400

        const newSyllable = {
            id: Date.now() + Math.random(),
            text: selectedSyllable,
            x: Math.random() * (gameWidth - 80),
            y: -50,
            speed: 1.0 + Math.random() * 0.5
        }

        setFallingSyllables(prev => [...prev, newSyllable])
    }

    const animateFallingSyllables = () => {
        setFallingSyllables(prev => {
            const updated = prev.map(syllable => ({
                ...syllable,
                y: syllable.y + syllable.speed
            })).filter(syllable => {
                // Supprimer les syllabes qui sont tombées trop bas
                if (syllable.y > gameHeight + 50) {
                    // Vérifier si c'était la syllabe qu'on attendait
                    const currentWord = gameWords[currentWordIndex]
                    const expectedSyllable = currentWord?.segmentation[currentSyllableIndex]

                    if (syllable.text === expectedSyllable) {
                        // Perte d'une vie si c'est la syllabe qu'on attendait
                        setLives(currentLives => {
                            const newLives = currentLives - 1
                            if (newLives <= 0) {
                                setIsGameComplete(true)
                            }
                            return newLives
                        })
                    }
                    return false
                }
                return true
            })

            return updated
        })

        if (gameStarted && !isGameComplete) {
            animationRef.current = requestAnimationFrame(animateFallingSyllables)
        }
    }

    const handleSyllableClick = (syllable) => {
        if (isGameComplete) return

        const currentWord = gameWords[currentWordIndex]
        const expectedSyllable = currentWord?.segmentation[currentSyllableIndex]

        if (syllable.text === expectedSyllable) {
            // Bonne syllabe !
            setScore(score + 10)

            // Supprimer cette syllabe de l'écran
            setFallingSyllables(prev => prev.filter(s => s.id !== syllable.id))

            // Passer à la syllabe suivante
            if (currentSyllableIndex + 1 < currentWord.segmentation.length) {
                // Syllabe suivante du même mot
                setCurrentSyllableIndex(currentSyllableIndex + 1)
            } else {
                // Mot terminé, passer au mot suivant
                if (currentWordIndex + 1 < gameWords.length) {
                    setCurrentWordIndex(currentWordIndex + 1)
                    setCurrentSyllableIndex(0)
                } else {
                    // Tous les mots terminés !
                    setIsGameComplete(true)
                }
            }
        } else {
            // Mauvaise syllabe
            setScore(Math.max(0, score - 5))
            setFallingSyllables(prev => prev.filter(s => s.id !== syllable.id))
        }
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setCurrentWordIndex(0)
        setCurrentSyllableIndex(0)
        setFallingSyllables([])
        setIsGameComplete(false)
        setLives(3)
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
                    marginBottom: '20px'
                }}>
                    <h1 style={{
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        marginBottom: '10px'
                    }}>
                        🏃 Jeu 6 - Course de syllabes
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '14px',
                        opacity: 0.9
                    }}>
                        Attrapez les syllabes dans le bon ordre !
                    </p>
                </div>

                {!gameStarted ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '30px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏃</div>
                        <p style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '25px',
                            lineHeight: '1.6'
                        }}>
                            <strong>Comment jouer :</strong><br/>
                            1️⃣ Un mot s'affiche à l'écran<br/>
                            2️⃣ Cliquez sur sa 1ère syllabe quand elle tombe<br/>
                            3️⃣ Puis sur la 2ème, 3ème... dans l'ordre<br/>
                            4️⃣ Une fois le mot fini, passez au suivant<br/>
                            ⚠️ Ratez la bonne syllabe = perdez une vie ! Max 4 syllabes à l'écran
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
                                    boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)'
                                }}
                            >
                                🎮 Commencer
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
                                    boxShadow: '0 10px 30px rgba(107, 114, 128, 0.3)'
                                }}
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
                        padding: '30px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                            {lives <= 0 ? '💔' : '🏆'}
                        </div>
                        <h2 style={{
                            color: 'white',
                            fontSize: '20px',
                            marginBottom: '15px'
                        }}>
                            {lives <= 0 ? 'Game Over !' : 'Bravo ! Jeu terminé !'}
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '25px'
                        }}>
                            Score final : {score} points
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
                                🔄 Rejouer
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
                                ← Menu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '20px'
                    }}>
                        {/* Stats */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div>Mot {currentWordIndex + 1}/10</div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div>❤️ {lives}</div>
                                <div>Score: {score}</div>
                            </div>
                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    padding: window.innerWidth <= 768 ? '6px 12px' : '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: window.innerWidth <= 768 ? '12px' : '14px',
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

                        {/* Mot actuel et progression */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '15px',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                                Mot actuel : {gameWords[currentWordIndex]?.original}
                            </div>

                            {/* Progression des syllabes */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '5px',
                                flexWrap: 'wrap',
                                marginBottom: '10px'
                            }}>
                                {gameWords[currentWordIndex]?.segmentation.map((syllabe, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            background: index < currentSyllableIndex ? '#26de81' :
                                                       index === currentSyllableIndex ? '#ff6b6b' : 'rgba(255,255,255,0.3)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            border: index === currentSyllableIndex ? '2px solid #fff' : 'none'
                                        }}
                                    >
                                        {syllabe}
                                    </span>
                                ))}
                            </div>

                            {/* Instruction */}
                            <div style={{
                                textAlign: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                🎯 Cliquez sur : <span style={{ color: '#ff6b6b', fontSize: '16px' }}>
                                    {gameWords[currentWordIndex]?.segmentation[currentSyllableIndex]}
                                </span><br/>
                                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                                    Maximum 4 syllabes à l'écran - Ratez la bonne = -1 vie
                                </span>
                            </div>
                        </div>

                        {/* Zone de jeu */}
                        <div
                            ref={gameAreaRef}
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: `${gameHeight}px`,
                                background: 'linear-gradient(180deg, rgba(135,206,235,0.3) 0%, rgba(0,100,200,0.3) 100%)',
                                borderRadius: '15px',
                                border: '3px solid rgba(255,255,255,0.3)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Syllabes qui tombent */}
                            {fallingSyllables.map(syllable => {
                                const currentWord = gameWords[currentWordIndex]
                                const expectedSyllable = currentWord?.segmentation[currentSyllableIndex]
                                const isExpected = syllable.text === expectedSyllable

                                return (
                                    <button
                                        key={syllable.id}
                                        onClick={() => handleSyllableClick(syllable)}
                                        style={{
                                            position: 'absolute',
                                            left: `${syllable.x}px`,
                                            top: `${syllable.y}px`,
                                            background: isExpected ?
                                                'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' :
                                                'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            padding: '8px 12px',
                                            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            boxShadow: isExpected ? '0 5px 15px rgba(255,107,107,0.5)' : '0 5px 15px rgba(0,0,0,0.2)',
                                            transition: 'transform 0.1s',
                                            zIndex: 10,
                                            border: isExpected ? '2px solid #fff' : 'none'
                                        }}
                                        onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    >
                                        {syllable.text}
                                    </button>
                                )
                            })}

                            {/* Instructions au centre quand aucune syllabe */}
                            {fallingSyllables.length === 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    color: 'white',
                                    textAlign: 'center',
                                    opacity: 0.7
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>☁️</div>
                                    <div style={{ fontSize: '14px' }}>Attendez les syllabes...</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}