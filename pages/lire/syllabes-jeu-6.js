import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu6() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [gameWords, setGameWords] = useState([])
    const [allGameSyllables, setAllGameSyllables] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [gameHeight, setGameHeight] = useState(400)

    // État de rendu (mis à jour depuis les refs pour déclencher le re-render)
    const [displayState, setDisplayState] = useState({
        score: 0, lives: 3, wordIndex: 0, syllableIndex: 0, falling: []
    })

    // Refs pour l'état mutable du jeu (pas de stale closures)
    const gameRef = useRef({
        score: 0, lives: 3, wordIndex: 0, syllableIndex: 0,
        falling: [], words: [], allSyllables: [],
        lastSpawnTime: 0, running: false
    })
    const animationRef = useRef(null)
    const gameAreaRef = useRef(null)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login'); return }
        setIsLoading(false)
        loadUserWords()
    }, [router])

    useEffect(() => {
        const update = () => {
            setGameHeight(window.innerWidth <= 768 ? Math.min(400, window.innerHeight * 0.5) : 500)
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    const loadUserWords = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                const allWords = []
                Object.keys(data.paniers || {}).forEach(lettre => {
                    Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                        ;(data.paniers[lettre][nomPanier] || []).forEach(motData => {
                            if (typeof motData === 'object' && motData.segmentation && motData.segmentation.length >= 2) {
                                allWords.push({
                                    mot: motData.segmentation.join(''),
                                    segmentation: motData.segmentation
                                })
                            }
                        })
                    })
                })
                prepareGame(allWords)
            }
        } catch (error) {
            console.error('Erreur chargement:', error)
        }
    }

    const prepareGame = (allWords) => {
        if (allWords.length < 10) {
            alert('Vous devez avoir au moins 10 mots multisyllabiques dans vos paniers pour jouer !')
            return
        }
        const shuffled = [...allWords].sort(() => 0.5 - Math.random())
        const selected = []
        const used = new Set()
        for (const w of shuffled) {
            if (selected.length >= 10) break
            const key = w.mot.toLowerCase()
            if (!used.has(key)) {
                used.add(key)
                selected.push({ original: w.mot, segmentation: w.segmentation })
            }
        }
        if (selected.length < 10) {
            alert('Pas assez de mots différents dans vos paniers !')
            return
        }
        const allSyl = []
        selected.forEach(w => w.segmentation.forEach(s => {
            if (!allSyl.includes(s)) allSyl.push(s)
        }))
        setGameWords(selected)
        setAllGameSyllables(allSyl)
    }

    // === Boucle de jeu principale (pas de stale closures grâce aux refs) ===

    const gameLoop = useCallback((timestamp) => {
        const g = gameRef.current
        if (!g.running) return

        const gameWidth = gameAreaRef.current?.offsetWidth || 400
        const height = window.innerWidth <= 768 ? Math.min(400, window.innerHeight * 0.5) : 500

        // 1. Faire tomber les syllabes
        g.falling = g.falling.map(s => ({ ...s, y: s.y + s.speed }))

        // 2. Vérifier les syllabes qui sortent de l'écran
        const currentWord = g.words[g.wordIndex]
        const expected = currentWord?.segmentation[g.syllableIndex]

        g.falling = g.falling.filter(s => {
            if (s.y > height + 50) {
                // La bonne syllabe est tombée sans être cliquée
                if (s.text === expected) {
                    g.lives -= 1
                    if (g.lives <= 0) {
                        g.running = false
                        setIsGameComplete(true)
                    }
                }
                return false
            }
            return true
        })

        // 3. Ajouter des syllabes (toutes les 1.5 secondes)
        if (timestamp - g.lastSpawnTime > 1500 && g.falling.length < 4 && g.running) {
            g.lastSpawnTime = timestamp

            const expectedFalling = g.falling.some(s => s.text === expected)
            let newSyllable

            if (!expectedFalling && expected) {
                // Toujours ajouter la bonne si elle n'est pas à l'écran
                newSyllable = expected
            } else {
                // Ajouter un piège (pas la bonne, pas un doublon)
                const fallingTexts = new Set(g.falling.map(s => s.text))
                const candidates = g.allSyllables.filter(s => s !== expected && !fallingTexts.has(s))
                if (candidates.length > 0) {
                    newSyllable = candidates[Math.floor(Math.random() * candidates.length)]
                }
            }

            if (newSyllable) {
                g.falling.push({
                    id: Date.now() + Math.random(),
                    text: newSyllable,
                    x: 20 + Math.random() * (gameWidth - 100),
                    y: -40,
                    speed: 1.2 + Math.random() * 0.6
                })
            }
        }

        // 4. Mettre à jour l'affichage React
        setDisplayState({
            score: g.score, lives: g.lives,
            wordIndex: g.wordIndex, syllableIndex: g.syllableIndex,
            falling: [...g.falling]
        })

        if (g.running) {
            animationRef.current = requestAnimationFrame(gameLoop)
        }
    }, [])

    const startGame = () => {
        const g = gameRef.current
        g.score = 0
        g.lives = 3
        g.wordIndex = 0
        g.syllableIndex = 0
        g.falling = []
        g.words = gameWords
        g.allSyllables = allGameSyllables
        g.lastSpawnTime = 0
        g.running = true

        setGameStarted(true)
        setIsGameComplete(false)
        setDisplayState({ score: 0, lives: 3, wordIndex: 0, syllableIndex: 0, falling: [] })

        animationRef.current = requestAnimationFrame(gameLoop)
    }

    const handleClick = (syllable) => {
        const g = gameRef.current
        if (!g.running) return

        const currentWord = g.words[g.wordIndex]
        const expected = currentWord?.segmentation[g.syllableIndex]

        // Retirer la syllabe de l'écran
        g.falling = g.falling.filter(s => s.id !== syllable.id)

        if (syllable.text === expected) {
            g.score += 10
            // Passer à la syllabe suivante
            if (g.syllableIndex + 1 < currentWord.segmentation.length) {
                g.syllableIndex += 1
            } else {
                // Mot terminé
                if (g.wordIndex + 1 < g.words.length) {
                    g.wordIndex += 1
                    g.syllableIndex = 0
                    // Vider l'écran pour le nouveau mot
                    g.falling = []
                } else {
                    g.running = false
                    setIsGameComplete(true)
                }
            }
        } else {
            g.score = Math.max(0, g.score - 5)
        }
    }

    const resetGame = () => {
        const g = gameRef.current
        g.running = false
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        loadUserWords()
        setGameStarted(false)
        setIsGameComplete(false)
        setDisplayState({ score: 0, lives: 3, wordIndex: 0, syllableIndex: 0, falling: [] })
    }

    // Cleanup
    useEffect(() => {
        return () => {
            gameRef.current.running = false
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [])

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    const { score, lives, wordIndex, syllableIndex, falling } = displayState
    const currentWord = gameWords[wordIndex]
    const expectedSyllable = currentWord?.segmentation[syllableIndex]

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* En-tête */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h1 style={{
                        fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 'bold',
                        color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.3)', marginBottom: '10px'
                    }}>
                        🏃 Jeu 8 - Chute de syllabes
                    </h1>
                    <p style={{ color: 'white', fontSize: '14px', opacity: 0.9 }}>
                        Attrapez les syllabes dans le bon ordre !
                    </p>
                </div>

                {!gameStarted ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                        borderRadius: '20px', padding: '30px', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏃</div>
                        <p style={{ color: 'white', fontSize: '16px', marginBottom: '25px', lineHeight: '1.6' }}>
                            <strong>Comment jouer :</strong><br/>
                            1️⃣ Un mot s'affiche à l'écran<br/>
                            2️⃣ Cliquez sur sa 1ère syllabe quand elle tombe<br/>
                            3️⃣ Puis sur la 2ème, 3ème... dans l'ordre<br/>
                            4️⃣ Une fois le mot fini, passez au suivant<br/>
                            ⚠️ Si la bonne syllabe tombe sans être cliquée = -1 vie !
                        </p>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <button
                                onClick={startGame}
                                disabled={gameWords.length < 10}
                                style={{
                                    background: gameWords.length < 10 ? '#9ca3af' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                                    color: 'white', padding: '15px 30px', border: 'none',
                                    borderRadius: '15px', fontSize: '18px', fontWeight: 'bold',
                                    cursor: gameWords.length < 10 ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)'
                                }}
                            >
                                🎮 Commencer
                            </button>
                            <button
                                onClick={() => router.push('/lire/je-joue-syllabes')}
                                style={{
                                    backgroundColor: '#6b7280', color: 'white', padding: '15px 30px',
                                    border: 'none', borderRadius: '15px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                ← Retour au menu
                            </button>
                        </div>
                    </div>

                ) : isGameComplete ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                        borderRadius: '20px', padding: '30px', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>{lives <= 0 ? '💔' : '🏆'}</div>
                        <h2 style={{ color: 'white', fontSize: '20px', marginBottom: '15px' }}>
                            {lives <= 0 ? 'Game Over !' : 'Bravo ! Jeu terminé !'}
                        </h2>
                        <p style={{ color: 'white', fontSize: '16px', marginBottom: '10px' }}>
                            Score final : {score} points
                        </p>
                        <p style={{ color: 'white', fontSize: '14px', marginBottom: '25px', opacity: 0.8 }}>
                            {wordIndex + (syllableIndex > 0 ? 1 : 0)}/10 mots complétés
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={resetGame} style={{
                                background: 'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)',
                                color: 'white', padding: '12px 24px', border: 'none',
                                borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                            }}>🔄 Rejouer</button>
                            <button onClick={() => router.push('/lire/je-joue-syllabes')} style={{
                                background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px',
                                border: '2px solid white', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                            }}>← Menu</button>
                        </div>
                    </div>

                ) : (
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                        borderRadius: '20px', padding: '20px'
                    }}>
                        {/* Stats */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '15px', color: 'white', fontSize: '14px', fontWeight: 'bold',
                            flexWrap: 'wrap', gap: '10px'
                        }}>
                            <div>Mot {wordIndex + 1}/10</div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</div>
                                <div>Score: {score}</div>
                            </div>
                            <button
                                onClick={() => { gameRef.current.running = false; router.push('/lire/je-joue-syllabes') }}
                                style={{
                                    backgroundColor: '#dc2626', color: 'white',
                                    padding: '6px 12px', border: 'none', borderRadius: '6px',
                                    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >🚪 Quitter</button>
                        </div>

                        {/* Mot actuel et progression */}
                        {currentWord && (
                            <div style={{ textAlign: 'center', marginBottom: '15px', color: 'white' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                                    {currentWord.original}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    {currentWord.segmentation.map((syllabe, index) => (
                                        <span key={index} style={{
                                            background: index < syllableIndex ? '#26de81' :
                                                       index === syllableIndex ? '#ff6b6b' : 'rgba(255,255,255,0.3)',
                                            color: 'white', padding: '4px 8px', borderRadius: '6px',
                                            fontSize: '14px', fontWeight: 'bold',
                                            border: index === syllableIndex ? '2px solid #fff' : 'none'
                                        }}>{syllabe}</span>
                                    ))}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                    🎯 Cliquez sur : <span style={{ color: '#ff6b6b', fontSize: '16px' }}>{expectedSyllable}</span>
                                </div>
                            </div>
                        )}

                        {/* Zone de jeu */}
                        <div
                            ref={gameAreaRef}
                            style={{
                                position: 'relative', width: '100%', height: `${gameHeight}px`,
                                background: 'linear-gradient(180deg, rgba(135,206,235,0.3) 0%, rgba(0,100,200,0.3) 100%)',
                                borderRadius: '15px', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden'
                            }}
                        >
                            {falling.map(syllable => (
                                <button
                                    key={syllable.id}
                                    onClick={() => handleClick(syllable)}
                                    style={{
                                        position: 'absolute',
                                        left: `${syllable.x}px`,
                                        top: `${syllable.y}px`,
                                        background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                        color: 'white', border: 'none', borderRadius: '10px',
                                        padding: '10px 16px', fontSize: '18px', fontWeight: 'bold',
                                        cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                                        zIndex: 10, transition: 'transform 0.1s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {syllable.text}
                                </button>
                            ))}

                            {falling.length === 0 && (
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center', opacity: 0.7
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
