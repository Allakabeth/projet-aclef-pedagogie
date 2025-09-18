import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function JeJoueSyllabes3() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [currentSyllable, setCurrentSyllable] = useState('')
    const [availableSyllables, setAvailableSyllables] = useState([])
    const [currentSyllableIndex, setCurrentSyllableIndex] = useState(0)
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [maxPossibleScore, setMaxPossibleScore] = useState(0)
    const [foundSyllables, setFoundSyllables] = useState(new Set())
    const [targetPositions, setTargetPositions] = useState([])
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
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
            // Récupérer tous les paniers de syllabes de l'utilisateur
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()

                // Extraire tous les mots multisyllabiques de tous les paniers
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

        // Sélectionner 10 mots au hasard en évitant les doublons
        const shuffledWords = [...allWords].sort(() => 0.5 - Math.random())
        const selectedWords = []
        const usedWords = new Set()

        for (const word of shuffledWords) {
            if (selectedWords.length >= 10) break

            // Vérifier que ce mot n'est pas déjà sélectionné
            if (!usedWords.has(word.mot.toLowerCase())) {
                usedWords.add(word.mot.toLowerCase())
                selectedWords.push({
                    id: selectedWords.length,
                    original: word.mot,
                    segmentation: word.segmentation,
                    panier: word.panier,
                    lettre: word.lettre,
                    clickedSyllables: new Set()
                })
            }
        }

        if (selectedWords.length < 10) {
            alert('Pas assez de mots uniques dans vos paniers pour jouer !\nOrganisez plus de mots différents dans vos paniers.')
            return
        }

        // Créer la liste de toutes les syllabes uniques des 10 mots
        const allSyllables = new Set()
        selectedWords.forEach(word => {
            word.segmentation.forEach(syllabe => {
                allSyllables.add(syllabe.toLowerCase())
            })
        })

        // Mélanger et prendre exactement 10 syllabes uniques
        const allSyllablesArray = Array.from(allSyllables).sort(() => 0.5 - Math.random())

        if (allSyllablesArray.length < 10) {
            alert(`Pas assez de syllabes différentes (${allSyllablesArray.length}/10).\nOrganisez plus de mots variés dans vos paniers !`)
            return
        }

        const syllabesToPlay = allSyllablesArray.slice(0, 10)
        console.log('Syllabes sélectionnées pour le jeu:', syllabesToPlay)
        setAvailableSyllables(syllabesToPlay)

        setGameWords(selectedWords)
        setCurrentSyllableIndex(0)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentSyllableIndex(0)
        setFoundSyllables(new Set())
        setIsGameComplete(false)
        startNewRound()
    }

    const startNewRound = () => {
        if (currentSyllableIndex >= 10) {
            setIsGameComplete(true)
            return
        }

        const syllable = availableSyllables[currentSyllableIndex]
        console.log(`Round ${currentSyllableIndex + 1}: syllabe "${syllable}"`)
        setCurrentSyllable(syllable)
        setFoundSyllables(new Set())
        setIsRoundComplete(false)

        // Reset des clics des mots
        const resetWords = gameWords.map(word => ({
            ...word,
            clickedSyllables: new Set()
        }))
        setGameWords(resetWords)

        // Trouver toutes les positions où cette syllabe apparaît
        const positions = []
        resetWords.forEach((word, wordIndex) => {
            word.segmentation.forEach((syllabe, syllableIndex) => {
                if (syllabe.toLowerCase() === syllable) {
                    positions.push(`${wordIndex}-${syllableIndex}`)
                }
            })
        })
        setTargetPositions(positions)

        // Calculer le score maximum possible (seulement une fois au début)
        if (maxPossibleScore === 0) {
            let totalMaxScore = 0
            availableSyllables.forEach(syll => {
                let syllableCount = 0
                resetWords.forEach((word) => {
                    word.segmentation.forEach((syllabe) => {
                        if (syllabe.toLowerCase() === syll) {
                            syllableCount++
                        }
                    })
                })
                totalMaxScore += syllableCount * 5
            })
            setMaxPossibleScore(totalMaxScore)
        }

        // Si la syllabe n'apparaît nulle part, passer à la suivante
        if (positions.length === 0) {
            setTimeout(() => {
                const nextIndex = currentSyllableIndex + 1
                setCurrentSyllableIndex(nextIndex)
                if (nextIndex < 10) {
                    startNewRound()
                } else {
                    setIsGameComplete(true)
                }
            }, 500)
        }
    }

    const handleSyllableClick = (wordIndex, syllableIndex) => {
        const word = gameWords[wordIndex]
        const syllable = word.segmentation[syllableIndex]
        const positionKey = `${wordIndex}-${syllableIndex}`

        if (syllable.toLowerCase() === currentSyllable) {
            // Bonne syllabe cliquée
            const newFoundSyllables = new Set(foundSyllables)
            newFoundSyllables.add(positionKey)
            setFoundSyllables(newFoundSyllables)

            // Marquer cette syllabe comme cliquée dans le mot
            const newGameWords = [...gameWords]
            newGameWords[wordIndex].clickedSyllables.add(syllableIndex)
            setGameWords(newGameWords)

            setScore(score + 5)

            // Vérifier si toutes les occurrences ont été trouvées
            if (newFoundSyllables.size === targetPositions.length) {
                setIsRoundComplete(true)
                setTimeout(() => {
                    const nextIndex = currentSyllableIndex + 1
                    setCurrentSyllableIndex(nextIndex)
                    if (nextIndex < 10) {
                        startNewRound()
                    } else {
                        setIsGameComplete(true)
                    }
                }, 1500)
            }
        } else {
            // Mauvaise syllabe
            setScore(Math.max(0, score - 2))
        }
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentSyllableIndex(0)
        setFoundSyllables(new Set())
        setIsGameComplete(false)
        setIsRoundComplete(false)
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
            height: window.innerWidth <= 768 ? '100vh' : 'auto',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: window.innerWidth <= 768 ? '10px' : '20px',
            overflow: window.innerWidth <= 768 ? 'hidden' : 'auto'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                height: window.innerWidth <= 768 ? '100%' : 'auto',
                display: window.innerWidth <= 768 ? 'flex' : 'block',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
            }}>
                {/* Titre - Caché sur mobile */}
                {window.innerWidth > 768 && (
                    <h1 style={{
                        fontSize: 'clamp(18px, 4vw, 32px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: 'white',
                        textAlign: 'center',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        🎮 Je joue avec les syllabes - Jeu 3
                    </h1>
                )}

                {!gameStarted ? (
                    // Écran d'accueil
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '40px',
                        textAlign: 'center',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            marginBottom: '20px',
                            color: '#333'
                        }}>
                            Trouvez les syllabes !
                        </h2>

                        <p style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            marginBottom: '30px',
                            color: '#666'
                        }}>
                            Une syllabe vous est proposée. Vous devez <strong>cliquer sur cette syllabe</strong> dans tous les mots où elle apparaît.
                            <br />
                            <strong>Attention :</strong> La même syllabe peut être présente dans plusieurs mots !
                        </p>

                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <button
                                onClick={startGame}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                🚀 Commencer le jeu
                            </button>

                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(107, 114, 128, 0.3)',
                                    transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                ← Retour au menu
                            </button>
                        </div>
                    </div>
                ) : (
                    // Interface de jeu
                    <>
                        {/* Score et progression - Caché sur mobile */}
                        {window.innerWidth > 768 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '30px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                padding: '15px 25px',
                                borderRadius: '15px',
                                backdropFilter: 'blur(10px)',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ color: 'white', fontSize: window.innerWidth <= 768 ? '16px' : '18px', fontWeight: 'bold' }}>
                                    Score: {score}/{maxPossibleScore}
                                </div>
                                <div style={{ color: 'white', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>
                                    Syllabe: {currentSyllableIndex + 1}/10
                                </div>
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
                        )}

                        {/* Score mobile uniquement */}
                        {window.innerWidth <= 768 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                padding: '10px 15px',
                                borderRadius: '12px',
                                backdropFilter: 'blur(10px)',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                    Score: {score}/{maxPossibleScore}
                                </div>
                                <div style={{ color: 'white', fontSize: '12px' }}>
                                    Syllabe: {currentSyllableIndex + 1}/10
                                </div>
                                <button
                                    onClick={() => router.push('/lire/je-joue-syllabes')}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
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
                        )}

                        {/* Zone de la syllabe à chercher */}
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: window.innerWidth <= 768 ? '12px' : '20px',
                            padding: window.innerWidth <= 768 ? '15px' : '25px',
                            marginBottom: window.innerWidth <= 768 ? '10px' : '30px',
                            backdropFilter: 'blur(10px)',
                            height: window.innerWidth <= 768 ? '15%' : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            {window.innerWidth > 768 && (
                                <h3 style={{
                                    color: 'white',
                                    fontSize: '20px',
                                    marginBottom: '15px',
                                    textAlign: 'center',
                                    margin: '0 0 15px 0'
                                }}>
                                    🔍 Trouvez cette syllabe :
                                </h3>
                            )}

                            <div style={{
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '10px 20px' : '15px 30px',
                                borderRadius: '25px',
                                fontSize: window.innerWidth <= 768 ? '18px' : '24px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                                border: '3px solid white'
                            }}>
                                {currentSyllable}
                            </div>

                            {isRoundComplete && (
                                <div style={{
                                    color: '#10b981',
                                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                    fontWeight: 'bold',
                                    marginTop: '10px'
                                }}>
                                    ✅ Toutes les occurrences trouvées !
                                </div>
                            )}
                        </div>

                        {/* Zone des mots */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: window.innerWidth <= 768
                                ? 'repeat(2, 1fr)'
                                : 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: window.innerWidth <= 768 ? '5px' : '15px',
                            flex: window.innerWidth <= 768 ? '1' : 'none',
                            overflowY: 'visible'
                        }}>
                            {gameWords.map((word, wordIndex) => (
                                <div
                                    key={`word-${wordIndex}`}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: window.innerWidth <= 768 ? '10px' : '15px',
                                        padding: window.innerWidth <= 768 ? '8px' : '15px',
                                        minHeight: window.innerWidth <= 768 ? '80px' : '90px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                        border: '2px solid #ddd'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: '0px',
                                        lineHeight: window.innerWidth <= 768 ? '1.1' : '1.2',
                                        wordBreak: 'keep-all',
                                        overflowWrap: 'break-word',
                                        maxWidth: '100%',
                                        overflow: 'hidden'
                                    }}>
                                        {word.segmentation.map((syllable, syllableIndex) => {
                                            const isTarget = syllable.toLowerCase() === currentSyllable
                                            const isClicked = word.clickedSyllables.has(syllableIndex)
                                            const isFound = foundSyllables.has(`${wordIndex}-${syllableIndex}`)

                                            return (
                                                <span
                                                    key={`${wordIndex}-${syllableIndex}`}
                                                    onClick={() => handleSyllableClick(wordIndex, syllableIndex)}
                                                    style={{
                                                        padding: window.innerWidth <= 768 ? '4px 0px' : '4px 0px',
                                                        borderRadius: '2px',
                                                        fontSize: window.innerWidth <= 768 ? '20px' : '20px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        backgroundColor: isFound
                                                            ? '#10b981'
                                                            : isClicked && !isTarget
                                                                ? '#ff6b6b'
                                                                : 'transparent',
                                                        color: isFound || (isClicked && !isTarget) ? 'white' : '#333',
                                                        border: 'none',
                                                        letterSpacing: 'normal'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (!isFound && !isClicked) {
                                                            e.target.style.backgroundColor = '#f0f0f0'
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (!isFound && !isClicked) {
                                                            e.target.style.backgroundColor = 'transparent'
                                                        }
                                                    }}
                                                >
                                                    {syllable}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message de fin de jeu */}
                        {isGameComplete && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000
                            }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '20px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    maxWidth: '400px',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
                                    <h2 style={{
                                        fontSize: '24px',
                                        marginBottom: '15px',
                                        color: '#333'
                                    }}>
                                        Félicitations !
                                    </h2>
                                    <p style={{
                                        fontSize: '16px',
                                        marginBottom: '25px',
                                        color: '#666'
                                    }}>
                                        Vous avez terminé le jeu avec <strong>{score}/{maxPossibleScore}</strong> !
                                    </p>
                                    <button
                                        onClick={resetGame}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            marginRight: '10px'
                                        }}
                                    >
                                        🔄 Rejouer
                                    </button>
                                    <button
                                        onClick={() => router.push('/lire/je-joue-syllabes')}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🏠 Menu jeux
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Boutons d'action */}
                        <div style={{
                            textAlign: 'center',
                            marginTop: window.innerWidth <= 768 ? '10px' : '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: window.innerWidth <= 768 ? '20px' : '15px'
                        }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: window.innerWidth <= 768 ? '8px 15px' : '12px 25px',
                                    border: '2px solid white',
                                    borderRadius: '10px',
                                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                🔄 Nouveau jeu
                            </button>
                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: window.innerWidth <= 768 ? '8px 15px' : '12px 25px',
                                    border: '2px solid white',
                                    borderRadius: '10px',
                                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                ← Menu jeux
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}