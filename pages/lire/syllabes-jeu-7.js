import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu7() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameCards, setGameCards] = useState([])
    const [flippedCards, setFlippedCards] = useState([])
    const [matchedPairs, setMatchedPairs] = useState(new Set())
    const [gameStarted, setGameStarted] = useState(false)
    const [score, setScore] = useState(0)
    const [moves, setMoves] = useState(0)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [canFlip, setCanFlip] = useState(true)
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
        // Filtrer pour avoir seulement les mots à 2 syllabes
        const twoSyllableWords = allWords.filter(word => word.segmentation.length === 2)

        if (twoSyllableWords.length < 10) {
            alert('Vous devez avoir au moins 10 mots à 2 syllabes dans vos paniers pour jouer !')
            return
        }

        // Éliminer les doublons de mots (même mot écrit différemment)
        const uniqueWords = []
        const usedWords = new Set()

        for (const word of twoSyllableWords) {
            const normalizedWord = word.mot.toLowerCase()
            if (!usedWords.has(normalizedWord)) {
                usedWords.add(normalizedWord)
                uniqueWords.push(word)
            }
        }

        if (uniqueWords.length < 10) {
            alert('Vous devez avoir au moins 10 mots différents à 2 syllabes dans vos paniers pour jouer !')
            return
        }

        // Prendre 10 mots uniques à 2 syllabes
        const selectedWords = uniqueWords
            .sort(() => 0.5 - Math.random())
            .slice(0, 10)

        // Créer les paires (1ère syllabe + 2ème syllabe du même mot)
        const cards = []
        selectedWords.forEach((word, index) => {
            const [syllabe1, syllabe2] = word.segmentation
            // Première carte (1ère syllabe)
            cards.push({
                id: index * 2,
                syllabe: syllabe1,
                pairId: index,
                word: word.mot,
                isFirstSyllable: true,
                isFlipped: false,
                isMatched: false
            })
            // Deuxième carte (2ème syllabe)
            cards.push({
                id: index * 2 + 1,
                syllabe: syllabe2,
                pairId: index,
                word: word.mot,
                isFirstSyllable: false,
                isFlipped: false,
                isMatched: false
            })
        })

        // Mélanger les cartes
        const shuffledCards = cards.sort(() => 0.5 - Math.random())

        setGameCards(shuffledCards)
        console.log('Cartes préparées:', shuffledCards)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(1000) // Score de départ élevé qui diminue avec les erreurs
        setMoves(0)
        setFlippedCards([])
        setMatchedPairs(new Set())
        setIsGameComplete(false)
        setCanFlip(true)

        // Réinitialiser l'état des cartes
        setGameCards(prev => prev.map(card => ({
            ...card,
            isFlipped: false,
            isMatched: false
        })))
    }

    const handleCardClick = (cardId) => {
        if (!canFlip || !gameStarted || isGameComplete) return

        const card = gameCards.find(c => c.id === cardId)
        if (!card || card.isFlipped || card.isMatched) return

        // Retourner la carte
        setGameCards(prev => prev.map(c =>
            c.id === cardId ? { ...c, isFlipped: true } : c
        ))

        const newFlippedCards = [...flippedCards, card]

        if (newFlippedCards.length === 2) {
            setCanFlip(false)
            setMoves(moves + 1)

            // Vérifier si c'est une paire dans le bon ordre
            const [firstCard, secondCard] = newFlippedCards

            if (firstCard.pairId === secondCard.pairId && firstCard.isFirstSyllable && !secondCard.isFirstSyllable) {
                // C'est une paire dans le bon ordre !
                setTimeout(() => {
                    setGameCards(prev => prev.map(c =>
                        c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
                    ))

                    const newMatchedPairs = new Set(matchedPairs)
                    newMatchedPairs.add(firstCard.pairId)
                    setMatchedPairs(newMatchedPairs)

                    // Bonus pour trouver rapidement
                    if (moves === 0) setScore(score + 100) // Premier coup parfait
                    else setScore(score + 50)

                    setFlippedCards([])
                    setCanFlip(true)

                    // Vérifier si le jeu est terminé
                    if (newMatchedPairs.size === 10) {
                        setIsGameComplete(true)
                    }
                }, 1000)
            } else {
                // Pas une paire ou mauvais ordre
                let penaltyMessage = ''
                if (firstCard.pairId === secondCard.pairId) {
                    penaltyMessage = 'Mauvais ordre ! Il faut cliquer d\'abord sur la 1ère syllabe'
                }

                setScore(Math.max(0, score - 25)) // Pénalité pour erreur

                setTimeout(() => {
                    setGameCards(prev => prev.map(c =>
                        newFlippedCards.some(fc => fc.id === c.id) ?
                        { ...c, isFlipped: false } : c
                    ))
                    setFlippedCards([])
                    setCanFlip(true)
                }, 1500)
            }
        } else {
            setFlippedCards(newFlippedCards)
        }
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setMoves(0)
        setFlippedCards([])
        setMatchedPairs(new Set())
        setIsGameComplete(false)
        setCanFlip(true)
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

    const cardSize = window.innerWidth <= 768 ? '70px' : '90px'

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '600px',
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
                        🧩 Jeu 7 - Syllabes complices
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '14px',
                        opacity: 0.9
                    }}>
                        Associez les syllabes qui forment des mots !
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
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧩</div>
                        <p style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '25px',
                            lineHeight: '1.6'
                        }}>
                            Trouvez les paires de syllabes qui se complètent pour former des mots !<br/>
                            Exemple : CHA + TEAU = CHÂTEAU. ATTENTION : cliquez d'abord sur la 1ère syllabe !
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
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏆</div>
                        <h2 style={{
                            color: 'white',
                            fontSize: '20px',
                            marginBottom: '15px'
                        }}>
                            Félicitations ! Toutes les paires trouvées !
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '16px',
                            marginBottom: '25px'
                        }}>
                            Score final : {score} points en {moves} coups
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
                            marginBottom: '20px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div>Paires: {matchedPairs.size}/10</div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div>Coups: {moves}</div>
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

                        {/* Grille de cartes */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '10px',
                            justifyContent: 'center',
                            maxWidth: '400px',
                            margin: '0 auto'
                        }}>
                            {gameCards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => handleCardClick(card.id)}
                                    disabled={!canFlip || card.isFlipped || card.isMatched}
                                    style={{
                                        width: cardSize,
                                        height: cardSize,
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                        fontWeight: 'bold',
                                        cursor: canFlip && !card.isFlipped && !card.isMatched ? 'pointer' : 'default',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        background: card.isMatched ?
                                            'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)' :
                                            card.isFlipped ?
                                            'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)' :
                                            'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                        color: 'white',
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                                        transform: card.isMatched ? 'scale(0.95)' : 'scale(1)'
                                    }}
                                    onMouseOver={(e) => {
                                        if (canFlip && !card.isFlipped && !card.isMatched) {
                                            e.target.style.transform = 'scale(1.05)'
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!card.isMatched) {
                                            e.target.style.transform = 'scale(1)'
                                        }
                                    }}
                                >
                                    {card.isFlipped || card.isMatched ? (
                                        // Face visible avec la syllabe
                                        <span>{card.syllabe}</span>
                                    ) : (
                                        // Face cachée
                                        <span style={{ fontSize: '20px' }}>?</span>
                                    )}

                                    {card.isMatched && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            fontSize: '12px'
                                        }}>
                                            ✅
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Instructions */}
                        <div style={{
                            textAlign: 'center',
                            marginTop: '20px',
                            color: 'white',
                            fontSize: '12px',
                            opacity: 0.8
                        }}>
                            {flippedCards.length === 1 ?
                                'Choisissez une deuxième carte...' :
                                'Cliquez sur une carte pour la retourner'
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}