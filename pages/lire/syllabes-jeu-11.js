import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SyllabesJeu11() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [userSyllables, setUserSyllables] = useState([])
    const [userExistingWords, setUserExistingWords] = useState([])
    const [newDiscoverableWords, setNewDiscoverableWords] = useState([])
    const [currentWord, setCurrentWord] = useState(null)
    const [selectedSyllables, setSelectedSyllables] = useState([])
    const [score, setScore] = useState(0)
    const [gameStarted, setGameStarted] = useState(false)
    const [isRoundComplete, setIsRoundComplete] = useState(false)
    const [isGameComplete, setIsGameComplete] = useState(false)
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [maxWords] = useState(10)
    const [showWordHelp, setShowWordHelp] = useState(false)
    const [gamePhase, setGamePhase] = useState('listening') // 'listening' ou 'constructing'
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
                const audio = new Audio(data.audio)
                audio.play()

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
                return
            }
        } catch (error) {
            console.log('ElevenLabs indisponible, utilisation Web Speech API')
        }

        // Fallback sur Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8

            // Chercher une voix masculine française
            const voices = window.speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.startsWith('fr') &&
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
        loadGameData()
    }, [router])

    const loadGameData = async () => {
        try {
            // 1. Charger mes syllabes et mes mots existants
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                const userSyllabes = extractUserSyllables(data.paniers)
                const userWords = extractUserWords(data.paniers)

                setUserSyllables(userSyllabes)
                setUserExistingWords(userWords)

                // 2. Charger tous les mots segmentés de tous les apprenants
                const allWordsResponse = await fetch('/api/mots/tous-segmentes')
                const allWordsData = await allWordsResponse.json()

                if (allWordsData.success) {
                    // 3. Trouver les nouveaux mots découvrables
                    const nouveauxMots = findNewDiscoverableWords(
                        userSyllabes,
                        userWords,
                        allWordsData.mots
                    )

                    setNewDiscoverableWords(nouveauxMots)

                    console.log('Mes syllabes:', userSyllabes.length)
                    console.log('Mes mots existants:', userWords.length)
                    console.log('Nouveaux mots découvrables:', nouveauxMots.length)
                } else {
                    console.error('Erreur chargement dictionnaire dynamique')
                }
            } else {
                console.error('Erreur chargement paniers')
            }
        } catch (error) {
            console.error('Erreur chargement données:', error)
        }
    }

    const extractUserSyllables = (paniers) => {
        const syllables = new Set()

        Object.keys(paniers || {}).forEach(lettre => {
            Object.keys(paniers[lettre] || {}).forEach(nomPanier => {
                const mots = paniers[lettre][nomPanier] || []
                mots.forEach(motData => {
                    if (typeof motData === 'object' && motData.segmentation) {
                        motData.segmentation.forEach(syllabe => {
                            syllables.add(syllabe.toLowerCase())
                        })
                    }
                })
            })
        })

        return Array.from(syllables)
    }

    const extractUserWords = (paniers) => {
        const words = new Set()

        Object.keys(paniers || {}).forEach(lettre => {
            Object.keys(paniers[lettre] || {}).forEach(nomPanier => {
                const mots = paniers[lettre][nomPanier] || []
                mots.forEach(motData => {
                    if (typeof motData === 'object' && motData.mot) {
                        words.add(motData.mot.toLowerCase())
                    }
                })
            })
        })

        return Array.from(words)
    }

    const findNewDiscoverableWords = (userSyllabes, userExistingWords, allSegmentedWords) => {
        console.log('🔍 Debug filtrage:')
        console.log('- Mes syllabes:', userSyllabes.slice(0, 10), `... (${userSyllabes.length} total)`)
        console.log('- Mes mots existants:', userExistingWords)
        console.log('- Mots à analyser:', allSegmentedWords.length)

        const nouveaux = allSegmentedWords.filter(motData => {
            // 1. Exclure mes mots existants
            if (userExistingWords.includes(motData.mot.toLowerCase())) {
                console.log(`❌ ${motData.mot} - déjà dans mes mots`)
                return false
            }

            // 2. Vérifier si je peux construire ce mot avec mes syllabes
            const peutConstruire = motData.segmentation.every(syllabe =>
                userSyllabes.includes(syllabe.toLowerCase())
            )

            if (peutConstruire) {
                console.log(`✅ ${motData.mot} - DÉCOUVRABLE ! (${motData.segmentation.join('-')})`)
            } else {
                const syllabesManquantes = motData.segmentation.filter(syllabe =>
                    !userSyllabes.includes(syllabe.toLowerCase())
                )
                console.log(`❌ ${motData.mot} - syllabes manquantes: ${syllabesManquantes.join(', ')}`)
            }

            return peutConstruire
        }).sort(() => 0.5 - Math.random()) // Mélanger tous les mots découvrables

        console.log(`🎯 Résultat: ${nouveaux.length} mots découvrables`)
        return nouveaux
    }

    const startGame = () => {
        if (newDiscoverableWords.length < 1) {
            alert('Vous n\'avez pas de nouveaux mots découvrables ! Essayez d\'enrichir votre collection de syllabes.')
            return
        }

        setGameStarted(true)
        setScore(0)
        setCurrentWordIndex(0)
        setIsGameComplete(false)

        // Démarrer le premier round avec index 0 explicite
        const word = newDiscoverableWords[0]
        setCurrentWord(word)
        setSelectedSyllables([])
        setIsRoundComplete(false)
        setShowWordHelp(false)

        console.log(`Round 1: découvrir "${word.mot}"`)

        // Prononcer le mot automatiquement après 1 seconde
        setTimeout(() => {
            lireTexte(word.mot)
        }, 1000)
    }

    const startNewRound = () => {
        if (currentWordIndex >= Math.min(newDiscoverableWords.length, maxWords)) {
            setIsGameComplete(true)
            return
        }

        const word = newDiscoverableWords[currentWordIndex]
        setCurrentWord(word)
        setSelectedSyllables([])
        setIsRoundComplete(false)
        setShowWordHelp(false)
        setGamePhase('constructing') // Permettre les clics de syllabes dès le début

        console.log(`Round ${currentWordIndex + 1}: découvrir "${word.mot}"`)

        // Prononcer le mot automatiquement après 1 seconde
        setTimeout(() => {
            lireTexte(word.mot)
        }, 1000)
    }

    const handleSyllableClick = (syllable) => {
        if (isRoundComplete) return

        const newSelected = [...selectedSyllables, syllable]
        setSelectedSyllables(newSelected)

        // Vérifier si le mot est complété
        if (newSelected.length === currentWord.segmentation.length) {
            checkWordCompletion(newSelected)
        }
    }

    const checkWordCompletion = (selected) => {
        const isCorrect = selected.length === currentWord.segmentation.length &&
                         selected.every((syllabe, index) =>
                             syllabe.toLowerCase() === currentWord.segmentation[index].toLowerCase()
                         )

        if (isCorrect) {
            const points = currentWord.longueur * 15 // Plus de points pour la découverte
            setScore(score + points)
            setIsRoundComplete(true)

            setTimeout(() => {
                const nextIndex = currentWordIndex + 1
                setCurrentWordIndex(nextIndex)

                // Démarrer le prochain round avec le nouvel index
                if (nextIndex >= Math.min(newDiscoverableWords.length, maxWords)) {
                    setIsGameComplete(true)
                    return
                }

                const word = newDiscoverableWords[nextIndex]
                setCurrentWord(word)
                setSelectedSyllables([])
                setIsRoundComplete(false)
                setShowWordHelp(false)

                console.log(`Round ${nextIndex + 1}: découvrir "${word.mot}"`)

                // Prononcer le mot automatiquement après 1 seconde
                setTimeout(() => {
                    lireTexte(word.mot)
                }, 1000)
            }, 3000)
        } else {
            // Mauvaise combinaison, remettre à zéro
            setTimeout(() => {
                setSelectedSyllables([])
            }, 1000)
        }
    }

    const showWordHelpAndConstruct = () => {
        setShowWordHelp(true)
        setSelectedSyllables([])
    }

    const repeatWord = () => {
        if (currentWord) {
            lireTexte(currentWord.mot)
        }
    }

    const removeSyllable = (index) => {
        if (isRoundComplete) return
        const newSelected = selectedSyllables.filter((_, i) => i !== index)
        setSelectedSyllables(newSelected)
    }

    const resetGame = () => {
        setGameStarted(false)
        setScore(0)
        setCurrentWordIndex(0)
        setSelectedSyllables([])
        setIsRoundComplete(false)
        setIsGameComplete(false)
        loadGameData()
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
                        🧩 Jeu 11 - Mots cachés
                    </h1>
                    <p style={{
                        color: 'white',
                        fontSize: '16px',
                        opacity: 0.9
                    }}>
                        Construisez de nouveaux mots avec vos syllabes !
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
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🧩</div>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '20px',
                            lineHeight: '1.6'
                        }}>
                            Découvrez les mots cachés que vous pouvez former avec vos syllabes !<br/>
                            Cliquez sur les syllabes dans le bon ordre pour reconstituer les mots.
                        </p>
                        <p style={{
                            color: 'white',
                            fontSize: '14px',
                            marginBottom: '30px',
                            opacity: 0.8
                        }}>
                            Nouveaux mots découvrables : {newDiscoverableWords.length}<br/>
                            Cette partie : 10 mots maximum<br/>
                            Vos syllabes : {userSyllables.length} • Vos mots existants : {userExistingWords.length}
                        </p>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <button
                                onClick={startGame}
                                disabled={newDiscoverableWords.length < 1}
                                style={{
                                    background: newDiscoverableWords.length >= 1 ?
                                        'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' :
                                        'gray',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '15px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: newDiscoverableWords.length >= 1 ? 'pointer' : 'not-allowed',
                                    boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    if (newDiscoverableWords.length >= 1) {
                                        e.target.style.transform = 'translateY(-2px)'
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (newDiscoverableWords.length >= 1) {
                                        e.target.style.transform = 'translateY(0)'
                                    }
                                }}
                            >
                                🎮 Commencer la découverte
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
                            Bravo explorateur ! Mission accomplie !
                        </h2>
                        <p style={{
                            color: 'white',
                            fontSize: '18px',
                            marginBottom: '30px'
                        }}>
                            Vous avez découvert {currentWordIndex} mots cachés !<br/>
                            Score final : {score} points<br/>
                            <span style={{ fontSize: '14px', opacity: 0.8 }}>
                                ({newDiscoverableWords.length} mots découvrables au total)
                            </span>
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
                                🔄 Nouvelle exploration
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
                            <div>Découverte {currentWordIndex + 1}/{Math.min(newDiscoverableWords.length, maxWords)}</div>
                            <div>Score: {score}</div>
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

                        {/* Zone de découverte */}
                        {currentWord && (
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '30px'
                            }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '15px',
                                    padding: '20px',
                                    marginBottom: '15px'
                                }}>
                                    <>
                                        {/* Affichage du titre selon la phase */}
                                        <div style={{
                                            color: 'white',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            marginBottom: '15px'
                                        }}>
                                            {!showWordHelp ? (
                                                <>🎧 Écoutez bien ce nouveau mot...</>
                                            ) : (
                                                <>Le mot à construire : <span style={{ color: '#fdcb6e' }}>{currentWord.mot}</span></>
                                            )}
                                        </div>

                                        {/* Zone de construction - toujours visible */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            marginBottom: '15px',
                                            flexWrap: 'wrap'
                                        }}>
                                            {Array.from({ length: currentWord.segmentation.length }).map((_, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => removeSyllable(index)}
                                                    style={{
                                                        width: '80px',
                                                        height: '50px',
                                                        border: '2px dashed white',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: selectedSyllables[index] ?
                                                            'rgba(255,255,255,0.3)' : 'transparent',
                                                        color: 'white',
                                                        fontSize: '16px',
                                                        fontWeight: 'bold',
                                                        cursor: selectedSyllables[index] ? 'pointer' : 'default',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    {selectedSyllables[index] || '?'}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Boutons d'action - toujours visibles */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '15px',
                                            flexWrap: 'wrap',
                                            marginBottom: '15px'
                                        }}>
                                            <button
                                                onClick={repeatWord}
                                                style={{
                                                    background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                                    color: 'white',
                                                    padding: '12px 20px',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔊 Réécouter
                                            </button>

                                            {!showWordHelp && (
                                                <button
                                                    onClick={showWordHelpAndConstruct}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                                                        color: 'white',
                                                        padding: '12px 20px',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '16px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    💡 Voir le mot
                                                </button>
                                            )}
                                        </div>

                                        <p style={{
                                            color: 'white',
                                            fontSize: '12px',
                                            opacity: 0.7
                                        }}>
                                            {!showWordHelp ?
                                                'Écoutez et construisez le mot avec vos syllabes !' :
                                                'Cliquez sur vos syllabes pour reconstituer ce mot !'
                                            }
                                        </p>
                                    </>

                                    {isRoundComplete && (
                                        <div style={{
                                            color: '#26de81',
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            marginTop: '15px'
                                        }}>
                                            🎉 Bravo ! Vous avez découvert : {currentWord.mot}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Syllabes disponibles */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                marginBottom: '15px'
                            }}>
                                Vos syllabes disponibles :
                            </p>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '8px',
                                flexWrap: 'wrap',
                                padding: '10px'
                            }}>
                                {userSyllables.sort().map((syllable, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSyllableClick(syllable)}
                                        disabled={selectedSyllables.length >= currentWord?.segmentation.length}
                                        style={{
                                            background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: (selectedSyllables.length < currentWord?.segmentation.length) ? 'pointer' : 'not-allowed',
                                            opacity: (selectedSyllables.length < currentWord?.segmentation.length) ? 1 : 0.5,
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (selectedSyllables.length < currentWord?.segmentation.length) {
                                                e.target.style.transform = 'scale(1.05)'
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            e.target.style.transform = 'scale(1)'
                                        }}
                                    >
                                        {syllable}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div style={{
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '12px',
                            opacity: 0.8
                        }}>
                            {!showWordHelp ?
                                'Écoutez bien et construisez le mot avec vos syllabes' :
                                'Cliquez sur les syllabes dans le bon ordre • Cliquez sur une syllabe placée pour la retirer'
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}