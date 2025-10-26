import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function JeJoueSyllabes4() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [availableSyllables, setAvailableSyllables] = useState([])
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentWord, setCurrentWord] = useState(null)
    const [selectedSyllables, setSelectedSyllables] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [maxPossibleScore, setMaxPossibleScore] = useState(0)
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [completedWords, setCompletedWords] = useState(new Set())
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
                    lettre: word.lettre
                })
            }
        }

        if (selectedWords.length < 10) {
            alert('Pas assez de mots uniques dans vos paniers pour jouer !\nOrganisez plus de mots différents dans vos paniers.')
            return
        }

        // Créer le pool de syllabes uniques de ces 10 mots
        const uniqueSyllables = new Set()
        selectedWords.forEach(word => {
            word.segmentation.forEach(syllabe => {
                uniqueSyllables.add(syllabe)
            })
        })

        // Convertir en tableau et mélanger les syllabes
        const shuffledSyllables = [...uniqueSyllables].sort(() => 0.5 - Math.random())

        // Calculer le score maximum (10 mots * nombre de syllabes de chaque mot * 5 points)
        const maxScore = selectedWords.reduce((total, word) => total + (word.segmentation.length * 5), 0)

        setGameWords(selectedWords)
        setAvailableSyllables(shuffledSyllables)
        setMaxPossibleScore(maxScore)
        console.log('Mots sélectionnés:', selectedWords)
        console.log('Pool de syllabes:', shuffledSyllables)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCurrentWordIndex(0)
        setSelectedSyllables([])
        setIsGameComplete(false)
        setCompletedWords(new Set())
        startNewRound()
    }

    const startNewRound = (wordIndex = currentWordIndex) => {
        if (wordIndex >= 10) {
            setIsGameComplete(true)
            return
        }

        const word = gameWords[wordIndex]
        setCurrentWord(word)
        setSelectedSyllables([])
        setIsRoundComplete(false)
        console.log(`Round ${wordIndex + 1}: mot "${word.original}" avec syllabes:`, word.segmentation)
    }

    const handleSyllableClick = (syllable, syllableIndex) => {
        if (isRoundComplete) return

        const currentTargetWord = gameWords[currentWordIndex]
        const nextExpectedSyllable = currentTargetWord.segmentation[selectedSyllables.length]

        if (syllable === nextExpectedSyllable) {
            // Bonne syllabe dans le bon ordre
            const newSelectedSyllables = [...selectedSyllables, syllable]
            setSelectedSyllables(newSelectedSyllables)

            // Ne donner des points que si ce mot n'a pas encore été complété
            if (!completedWords.has(currentWordIndex)) {
                setScore(score + 5)
            }

            // Vérifier si le mot est terminé
            if (newSelectedSyllables.length === currentTargetWord.segmentation.length) {
                // Marquer ce mot comme complété
                const newCompletedWords = new Set(completedWords)
                newCompletedWords.add(currentWordIndex)
                setCompletedWords(newCompletedWords)

                setIsRoundComplete(true)
                setTimeout(() => {
                    const nextIndex = currentWordIndex + 1
                    setCurrentWordIndex(nextIndex)
                    startNewRound(nextIndex)
                }, 1500)
            }
        } else {
            // Mauvaise syllabe ou mauvais ordre
            setScore(Math.max(0, score - 2))

            // Animation d'erreur visuelle
            setTimeout(() => {
                // Réinitialiser les syllabes sélectionnées pour recommencer le mot
                setSelectedSyllables([])
            }, 1000)
        }
    }

    const resetGame = () => {
        setCompletedWords(new Set())
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMaxPossibleScore(0)
        setCurrentWordIndex(0)
        setSelectedSyllables([])
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
                        🎮 Jeu 6 - Je joue avec les syllabes - Ordonner
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
                            Décomposez les mots !
                        </h2>

                        <p style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            marginBottom: '30px',
                            color: '#666'
                        }}>
                            Un mot vous est proposé. Vous devez <strong>cliquer sur ses syllabes dans l'ordre</strong> pour le reconstituer.
                            <br />
                            <strong>Attention :</strong> L'ordre des syllabes est important !
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
                                    Mot: {currentWordIndex + 1}/10
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
                                    Mot: {currentWordIndex + 1}/10
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

                        {/* Zone du mot à décomposer */}
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: window.innerWidth <= 768 ? '12px' : '20px',
                            padding: window.innerWidth <= 768 ? '15px' : '25px',
                            marginBottom: window.innerWidth <= 768 ? '10px' : '30px',
                            backdropFilter: 'blur(10px)',
                            height: window.innerWidth <= 768 ? '25%' : 'auto',
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
                                    🔤 Décomposez ce mot :
                                </h3>
                            )}

                            {currentWord && (
                                <>
                                    <div style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: window.innerWidth <= 768 ? '15px 25px' : '20px 35px',
                                        borderRadius: '15px',
                                        fontSize: window.innerWidth <= 768 ? '20px' : '28px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                                        border: '3px solid white',
                                        marginBottom: '15px'
                                    }}>
                                        {currentWord.original}
                                    </div>

                                    {/* Affichage des syllabes sélectionnées */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '5px',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        minHeight: '30px'
                                    }}>
                                        {selectedSyllables.map((syllable, index) => (
                                            <span
                                                key={index}
                                                style={{
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    padding: '5px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {syllable}
                                            </span>
                                        ))}
                                        {selectedSyllables.length < currentWord.segmentation.length && (
                                            <span style={{
                                                backgroundColor: 'rgba(255,255,255,0.3)',
                                                color: 'white',
                                                padding: '5px 15px',
                                                borderRadius: '8px',
                                                fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                                border: '2px dashed white'
                                            }}>
                                                ?
                                            </span>
                                        )}
                                    </div>

                                    {isRoundComplete && (
                                        <div style={{
                                            color: '#10b981',
                                            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                            fontWeight: 'bold',
                                            marginTop: '10px'
                                        }}>
                                            ✅ Mot décomposé !
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Zone des syllabes disponibles */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: window.innerWidth <= 768
                                ? 'repeat(3, 1fr)'
                                : 'repeat(auto-fit, minmax(80px, 1fr))',
                            gap: window.innerWidth <= 768 ? '8px' : '12px',
                            flex: window.innerWidth <= 768 ? '1' : 'none',
                            overflowY: window.innerWidth <= 768 ? 'auto' : 'visible',
                            maxHeight: window.innerWidth <= 768 ? '75%' : 'none'
                        }}>
                            {availableSyllables.map((syllable, index) => (
                                <button
                                    key={`syllable-${index}`}
                                    onClick={() => handleSyllableClick(syllable, index)}
                                    disabled={isRoundComplete}
                                    style={{
                                        backgroundColor: '#ff6b6b',
                                        color: 'white',
                                        padding: window.innerWidth <= 768 ? '12px 8px' : '15px 12px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                                        fontWeight: 'bold',
                                        cursor: isRoundComplete ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                                        transition: 'all 0.2s ease',
                                        opacity: isRoundComplete ? 0.5 : 1,
                                        minHeight: window.innerWidth <= 768 ? '50px' : '60px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isRoundComplete) {
                                            e.target.style.transform = 'scale(1.05)'
                                            e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)'
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.transform = 'scale(1)'
                                        e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)'
                                    }}
                                >
                                    {syllable}
                                </button>
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