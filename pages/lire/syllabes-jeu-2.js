import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function JeJoueSyllabes2() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [shuffledSyllables, setShuffledSyllables] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [draggedSyllable, setDraggedSyllable] = useState(null)
    const [score, setScore] = useState(0)
    const [completedWords, setCompletedWords] = useState(new Set())
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

        // Sélectionner 10 mots au hasard avec des dernières syllabes différentes
        const selectedWords = []
        const usedLastSyllables = new Set()
        const usedWords = new Set()

        // Mélanger les mots
        const shuffledWords = [...allWords].sort(() => 0.5 - Math.random())

        for (const word of shuffledWords) {
            if (selectedWords.length >= 10) break

            const syllables = word.segmentation
            if (syllables.length < 2) continue

            const lastSyllable = syllables[syllables.length - 1].toLowerCase()
            const wordLower = word.mot.toLowerCase()

            // Vérifier que ce mot n'est pas déjà utilisé et que cette dernière syllabe n'est pas déjà utilisée
            if (!usedWords.has(wordLower) && !usedLastSyllables.has(lastSyllable)) {
                usedWords.add(wordLower)
                usedLastSyllables.add(lastSyllable)
                selectedWords.push({
                    original: word.mot,
                    syllables: syllables,
                    lastSyllable: syllables[syllables.length - 1],
                    firstSyllables: syllables.slice(0, -1).join(''),
                    panier: word.panier,
                    lettre: word.lettre,
                    isCompleted: false,
                    droppedSyllable: null
                })
            }
        }

        if (selectedWords.length < 10) {
            alert('Pas assez de mots uniques avec des dernières syllabes différentes.\nOrganisez plus de mots différents dans vos paniers !')
            return
        }

        // Mélanger l'ordre des mots pour que ce ne soit pas dans l'ordre de sélection
        const shuffledSelectedWords = [...selectedWords].sort(() => 0.5 - Math.random())

        // Créer un tableau des syllabes mélangées une seule fois
        const syllablesArray = shuffledSelectedWords.map(word => word.lastSyllable)
        const shuffledSyllablesArray = [...syllablesArray].sort(() => 0.5 - Math.random())

        setGameWords(shuffledSelectedWords)
        setShuffledSyllables(shuffledSyllablesArray)
    }

    const startGame = () => {
        setGameStarted(true)
        setScore(0)
        setCompletedWords(new Set())
        setIsGameComplete(false)
    }

    const handleDragStart = (e, syllable) => {
        setDraggedSyllable(syllable)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e, wordIndex) => {
        e.preventDefault()

        if (!draggedSyllable) return

        const newGameWords = [...gameWords]
        const word = newGameWords[wordIndex]

        // Vérifier si c'est la bonne syllabe
        if (draggedSyllable === word.lastSyllable) {
            // Bonne réponse
            word.isCompleted = true
            word.droppedSyllable = draggedSyllable

            const newCompletedWords = new Set(completedWords)
            newCompletedWords.add(wordIndex)
            setCompletedWords(newCompletedWords)
            setScore(score + 10)

            // Vérifier si le jeu est terminé
            if (newCompletedWords.size === 10) {
                setIsGameComplete(true)
            }
        } else {
            // Mauvaise réponse
            word.droppedSyllable = draggedSyllable
            setTimeout(() => {
                word.droppedSyllable = null
                setGameWords([...newGameWords])
            }, 1000)
        }

        setGameWords(newGameWords)
        setDraggedSyllable(null)
    }

    const resetGame = () => {
        loadUserWords()
        setGameStarted(false)
        setScore(0)
        setCompletedWords(new Set())
        setIsGameComplete(false)
        setShuffledSyllables([])
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
                        🎮 Je joue avec les syllabes - Jeu 2
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
                            Reconstituez les mots !
                        </h2>

                        <p style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            marginBottom: '30px',
                            color: '#666'
                        }}>
                            Dans ce jeu, vous devez replacer la <strong>dernière syllabe</strong> de 10 mots issus de vos textes personnels.
                            <br />
                            <strong>Glissez-déposez</strong> chaque syllabe à sa place pour reconstituer le mot complet !
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
                        {/* Score et progression */}
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
                                Score: {score} points
                            </div>
                            <div style={{ color: 'white', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>
                                Progression: {completedWords.size}/10
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

                        {/* Zone des syllabes à glisser */}
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: window.innerWidth <= 768 ? '12px' : '20px',
                            padding: window.innerWidth <= 768 ? '10px' : '25px',
                            marginBottom: window.innerWidth <= 768 ? '10px' : '30px',
                            backdropFilter: 'blur(10px)',
                            height: window.innerWidth <= 768 ? '20%' : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: window.innerWidth <= 768 ? '0 0 auto' : 'none'
                        }}>
                            {window.innerWidth > 768 && (
                                <h3 style={{
                                    color: 'white',
                                    fontSize: '20px',
                                    marginBottom: '20px',
                                    textAlign: 'center',
                                    margin: '0 0 20px 0'
                                }}>
                                    📝 Syllabes disponibles (glissez-déposez)
                                </h3>
                            )}

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: window.innerWidth <= 768 ? '5px' : '15px',
                                justifyContent: 'center',
                                flex: 1,
                                alignItems: 'flex-start',
                                overflowY: 'visible'
                            }}>
                                {shuffledSyllables
                                    .filter(syllable => {
                                        // Afficher seulement les syllabes des mots non complétés
                                        return gameWords.some(word =>
                                            word.lastSyllable === syllable && !word.isCompleted
                                        )
                                    })
                                    .map((syllable, index) => (
                                        <div
                                            key={`syllable-${syllable}-${index}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, syllable)}
                                            style={{
                                                backgroundColor: '#ff6b6b',
                                                color: 'white',
                                                padding: window.innerWidth <= 768 ? '6px 10px' : '12px 20px',
                                                borderRadius: window.innerWidth <= 768 ? '15px' : '25px',
                                                fontSize: window.innerWidth <= 768 ? '14px' : '18px',
                                                fontWeight: 'bold',
                                                cursor: 'grab',
                                                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                                                transition: 'transform 0.2s ease',
                                                userSelect: 'none'
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            {syllable}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Zone des mots à compléter */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: window.innerWidth <= 768
                                ? 'repeat(2, 1fr)'
                                : 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: window.innerWidth <= 768 ? '3px' : '20px',
                            flex: window.innerWidth <= 768 ? '1' : 'none',
                            overflowY: 'visible'
                        }}>
                            {gameWords.map((word, index) => (
                                <div
                                    key={`word-${index}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    style={{
                                        backgroundColor: word.isCompleted ? '#10b981' : 'white',
                                        borderRadius: window.innerWidth <= 768 ? '10px' : '15px',
                                        padding: window.innerWidth <= 768 ? '3px' : '20px',
                                        minHeight: window.innerWidth <= 768 ? '35px' : '90px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                        border: word.droppedSyllable && !word.isCompleted ? '3px dashed #ff6b6b' : '3px dashed #ddd',
                                        transition: 'all 0.3s ease',
                                        cursor: word.isCompleted ? 'default' : 'pointer'
                                    }}
                                >
                                    <div style={{
                                        fontSize: window.innerWidth <= 768 ? '14px' : '24px',
                                        fontWeight: 'bold',
                                        color: word.isCompleted ? 'white' : '#333',
                                        textAlign: 'center',
                                        marginBottom: window.innerWidth <= 768 ? '5px' : '10px'
                                    }}>
                                        {word.isCompleted ? (
                                            <>
                                                <span style={{ color: '#fff' }}>
                                                    {word.firstSyllables}
                                                </span>
                                                <span style={{ color: '#fff' }}>
                                                    {word.lastSyllable}
                                                </span>
                                                <div style={{
                                                    fontSize: window.innerWidth <= 768 ? '12px' : '16px',
                                                    marginTop: '5px'
                                                }}>
                                                    ✅ Bravo !
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span>{word.firstSyllables}</span>
                                                <span style={{
                                                    backgroundColor: word.droppedSyllable ? '#ff6b6b' : '#f0f0f0',
                                                    color: word.droppedSyllable ? 'white' : '#999',
                                                    padding: '4px 12px',
                                                    borderRadius: '8px',
                                                    marginLeft: '5px'
                                                }}>
                                                    {word.droppedSyllable || '___'}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {word.droppedSyllable && !word.isCompleted && (
                                        <div style={{
                                            fontSize: window.innerWidth <= 768 ? '10px' : '14px',
                                            color: '#ff6b6b',
                                            fontWeight: 'bold'
                                        }}>
                                            ❌ Essayez encore
                                        </div>
                                    )}
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
                                        Vous avez terminé le jeu avec <strong>{score} points</strong> !
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