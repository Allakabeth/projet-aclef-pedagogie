import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function QuestCe() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mode, setMode] = useState('select') // 'select', 'play', 'end'
    const [imagiers, setImagiers] = useState([])
    const [selectedImagier, setSelectedImagier] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [answered, setAnswered] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [numberOfOptions, setNumberOfOptions] = useState(4)
    const [availableVoices] = useState([
        { name: 'Paul', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7' },
        { name: 'Julie', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw' }
    ])
    const router = useRouter()

    // Fonction de mélange (Fisher-Yates)
    const shuffleArray = (array) => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    // Système audio (copié de mes-imagiers.js)
    const speakText = async (text, voiceName = 'Paul') => {
        if (!text.trim()) return

        const selectedVoiceObj = availableVoices.find(v => v.name === voiceName)
        if (!selectedVoiceObj) return

        const cacheKey = `voice_${voiceName}_${btoa(text).replace(/[^a-zA-Z0-9]/g, '')}`

        // Vérifier le cache
        const cachedAudio = localStorage.getItem(cacheKey)
        if (cachedAudio) {
            try {
                const audio = new Audio(cachedAudio)
                audio.play()
                return
            } catch (error) {
                localStorage.removeItem(cacheKey)
            }
        }

        // Essayer ElevenLabs
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: selectedVoiceObj.id
                })
            })

            if (response.ok) {
                const data = await response.json()

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
            // Fallback silencieux
        }

        // Fallback Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            window.speechSynthesis.speak(utterance)
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadImagiers()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadImagiers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/imagiers/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                // Filtrer les imagiers avec au moins 4 éléments
                const validImagiers = (data.imagiers || []).filter(
                    imagier => imagier.nombre_elements >= 4
                )
                setImagiers(validImagiers)
            }
        } catch (error) {
            console.error('Erreur chargement imagiers:', error)
        }
    }

    const startGame = async (imagier) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/imagiers/${imagier.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const imagierWithElements = data.imagier

                if (!imagierWithElements.elements || imagierWithElements.elements.length < 4) {
                    alert('Cet imagier n\'a pas assez d\'éléments (minimum 4)')
                    return
                }

                // Créer les questions en mélangeant l'ordre
                const shuffledElements = shuffleArray(imagierWithElements.elements)
                const questionsData = shuffledElements.map(element => {
                    // Sélectionner (numberOfOptions - 1) distracteurs différents de la bonne réponse
                    const distractors = imagierWithElements.elements
                        .filter(e => e.mot !== element.mot)
                        .sort(() => Math.random() - 0.5)
                        .slice(0, numberOfOptions - 1)

                    // Mélanger les options (1 correcte + distracteurs)
                    const options = shuffleArray([element, ...distractors])

                    return {
                        correctAnswer: element,
                        options: options
                    }
                })

                setSelectedImagier(imagierWithElements)
                setQuestions(questionsData)
                setCurrentQuestionIndex(0)
                setScore(0)
                setAnswered(false)
                setSelectedAnswer(null)
                setMode('play')
            }
        } catch (error) {
            console.error('Erreur démarrage jeu:', error)
            alert('Erreur lors du chargement de l\'imagier')
        }
    }

    const handleWordClick = (option) => {
        if (answered) return

        const isCorrect = option.mot === questions[currentQuestionIndex].correctAnswer.mot
        setSelectedAnswer(option.mot)
        setAnswered(true)

        if (isCorrect) {
            setScore(score + 1)
            // Lire le mot correct
            setTimeout(() => {
                speakText(option.mot, selectedImagier.voix || 'Paul')
            }, 300)
        }
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1
            setCurrentQuestionIndex(nextIndex)
            setAnswered(false)
            setSelectedAnswer(null)
        } else {
            // Fin du jeu
            setMode('end')
        }
    }

    const handleReplay = () => {
        startGame(selectedImagier)
    }

    const handleBackToList = () => {
        setMode('select')
        setSelectedImagier(null)
        setQuestions([])
        setCurrentQuestionIndex(0)
        setScore(0)
        setAnswered(false)
        setSelectedAnswer(null)
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: 'white', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    // MODE SÉLECTION
    if (mode === 'select') {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(24px, 5vw, 32px)',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        ❓ Qu'est-ce ?
                    </h1>

                    <p style={{
                        textAlign: 'center',
                        marginBottom: '20px',
                        color: '#666',
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        lineHeight: '1.5'
                    }}>
                        Regardez l'image et trouvez le mot correspondant
                    </p>

                    {/* Sélecteur de nombre de choix */}
                    {imagiers.length > 0 && (
                        <div style={{
                            background: '#faf5ff',
                            border: '2px solid #8b5cf6',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '10px',
                                fontSize: 'clamp(14px, 3vw, 16px)',
                                fontWeight: 'bold',
                                color: '#5b21b6'
                            }}>
                                🎯 Nombre de mots proposés par question
                            </label>
                            <select
                                value={numberOfOptions}
                                onChange={(e) => setNumberOfOptions(parseInt(e.target.value))}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '2px solid #8b5cf6',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: '#5b21b6',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                                <option value={4}>4 mots</option>
                                <option value={5}>5 mots</option>
                                <option value={6}>6 mots</option>
                                <option value={7}>7 mots</option>
                                <option value={8}>8 mots</option>
                                <option value={9}>9 mots</option>
                                <option value={10}>10 mots</option>
                                <option value={11}>11 mots</option>
                                <option value={12}>12 mots</option>
                            </select>
                        </div>
                    )}

                    {imagiers.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: '#ede9fe',
                            borderRadius: '12px',
                            border: '2px solid #c4b5fd'
                        }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🖼️</div>
                            <h3 style={{ marginBottom: '15px', color: '#5b21b6' }}>
                                Aucun imagier disponible
                            </h3>
                            <p style={{ color: '#7c3aed', marginBottom: '25px' }}>
                                Vous devez créer un imagier avec au moins 4 images pour jouer
                            </p>
                            <button
                                onClick={() => router.push('/imagiers/creer')}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    padding: '12px 25px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginRight: '10px'
                                }}
                            >
                                ✨ Créer un imagier
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '20px',
                                marginBottom: '30px'
                            }}>
                                {imagiers.map((imagier) => (
                                    <div
                                        key={imagier.id}
                                        style={{
                                            background: 'white',
                                            border: '2px solid #ddd6fe',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.1)'
                                        }}
                                    >
                                        <h3 style={{
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            marginBottom: '10px',
                                            color: '#5b21b6'
                                        }}>
                                            {imagier.titre}
                                        </h3>

                                        {imagier.description && (
                                            <p style={{
                                                color: '#666',
                                                fontSize: '14px',
                                                marginBottom: '15px',
                                                lineHeight: '1.4'
                                            }}>
                                                {imagier.description}
                                            </p>
                                        )}

                                        <div style={{
                                            color: '#7c3aed',
                                            fontSize: '14px',
                                            marginBottom: '15px'
                                        }}>
                                            📷 {imagier.nombre_elements || 0} images
                                        </div>

                                        <button
                                            onClick={() => startGame(imagier)}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#8b5cf6',
                                                color: 'white',
                                                padding: '12px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                                            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                                        >
                                            🎮 Jouer
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Bouton retour */}
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <button
                            onClick={() => router.push('/imagiers')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '12px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour aux imagiers
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // MODE JEU
    if (mode === 'play' && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex]
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100

        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    maxWidth: '700px',
                    margin: '0 auto',
                    width: '100%'
                }}>
                    {/* En-tête */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div style={{ fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 'bold', color: '#5b21b6' }}>
                                Question {currentQuestionIndex + 1} / {questions.length}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ fontSize: 'clamp(16px, 3vw, 18px)', fontWeight: 'bold', color: '#059669' }}>
                                    Score : {score} / {questions.length}
                                </div>
                                <button
                                    onClick={handleBackToList}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: 'clamp(12px, 2.5vw, 14px)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                                >
                                    ✕ Quitter
                                </button>
                            </div>
                        </div>

                        {/* Barre de progression */}
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#ddd6fe',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>

                    {/* Image */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '15px',
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <h2 style={{
                            fontSize: 'clamp(16px, 3.5vw, 20px)',
                            fontWeight: 'bold',
                            color: '#5b21b6',
                            marginBottom: '12px'
                        }}>
                            Qu'est-ce que c'est ?
                        </h2>

                        <div style={{
                            maxWidth: '200px',
                            margin: '0 auto',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #ddd6fe',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}>
                            <img
                                src={currentQuestion.correctAnswer.image_url}
                                alt="?"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    aspectRatio: '1',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                            />
                        </div>
                    </div>

                    {/* Options de mots */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(currentQuestion.options.length))}, 1fr)`,
                        gap: '10px',
                        marginBottom: '15px',
                        maxWidth: '600px',
                        margin: '0 auto 15px auto'
                    }}>
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = selectedAnswer === option.mot
                            const isCorrect = option.mot === currentQuestion.correctAnswer.mot
                            const showFeedback = answered && isSelected

                            let backgroundColor = 'white'
                            let borderColor = '#ddd6fe'
                            let borderWidth = '2px'
                            let boxShadow = '0 2px 10px rgba(0,0,0,0.1)'
                            let color = '#1f2937'

                            // Afficher la réponse sélectionnée (bonne ou mauvaise)
                            if (showFeedback) {
                                if (isCorrect) {
                                    backgroundColor = '#d1fae5'
                                    borderColor = '#10b981'
                                    borderWidth = '4px'
                                    boxShadow = '0 0 20px rgba(16, 185, 129, 0.6)'
                                    color = '#065f46'
                                } else {
                                    backgroundColor = '#fee2e2'
                                    borderColor = '#ef4444'
                                    borderWidth = '4px'
                                    boxShadow = '0 0 20px rgba(239, 68, 68, 0.6)'
                                    color = '#991b1b'
                                }
                            }
                            // Afficher aussi la bonne réponse en vert si on s'est trompé
                            else if (answered && isCorrect && !isSelected) {
                                backgroundColor = '#d1fae5'
                                borderColor = '#10b981'
                                borderWidth = '4px'
                                boxShadow = '0 0 20px rgba(16, 185, 129, 0.6)'
                                color = '#065f46'
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleWordClick(option)}
                                    style={{
                                        background: backgroundColor,
                                        border: `${borderWidth} solid ${borderColor}`,
                                        borderRadius: '8px',
                                        padding: '12px 15px',
                                        fontSize: 'clamp(14px, 3vw, 16px)',
                                        fontWeight: 'bold',
                                        color: color,
                                        cursor: answered ? 'default' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: boxShadow,
                                        opacity: answered && !isSelected && !isCorrect ? 0.5 : 1,
                                        textAlign: 'center',
                                        minHeight: '50px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!answered) {
                                            e.target.style.transform = 'translateY(-2px)'
                                            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)'
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!answered) {
                                            e.target.style.transform = 'translateY(0)'
                                            e.target.style.boxShadow = boxShadow
                                        }
                                    }}
                                >
                                    {option.mot}
                                </button>
                            )
                        })}
                    </div>

                    {/* Bouton Suivant */}
                    {answered && (
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={handleNext}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '15px 40px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: 'clamp(16px, 3vw, 20px)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                {currentQuestionIndex < questions.length - 1 ? '➜ Suivant' : '🎉 Terminer'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // MODE FIN
    if (mode === 'end') {
        const percentage = Math.round((score / questions.length) * 100)
        let message = ''
        let emoji = ''

        if (percentage === 100) {
            message = 'Parfait ! Excellent travail !'
            emoji = '🌟'
        } else if (percentage >= 80) {
            message = 'Très bien ! Continue comme ça !'
            emoji = '🎉'
        } else if (percentage >= 60) {
            message = 'Bien joué ! Tu progresses !'
            emoji = '👏'
        } else if (percentage >= 40) {
            message = 'Pas mal ! Continue de t\'entraîner !'
            emoji = '💪'
        } else {
            message = 'Continue de pratiquer, tu vas y arriver !'
            emoji = '🌱'
        }

        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '15px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px 30px',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>{emoji}</div>

                    <h2 style={{
                        fontSize: 'clamp(24px, 5vw, 32px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: '#5b21b6'
                    }}>
                        Partie terminée !
                    </h2>

                    <div style={{
                        background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                        borderRadius: '12px',
                        padding: '25px',
                        marginBottom: '25px'
                    }}>
                        <div style={{
                            fontSize: 'clamp(48px, 10vw, 64px)',
                            fontWeight: 'bold',
                            color: '#5b21b6',
                            marginBottom: '10px'
                        }}>
                            {score} / {questions.length}
                        </div>
                        <div style={{
                            fontSize: 'clamp(20px, 4vw, 28px)',
                            fontWeight: 'bold',
                            color: '#7c3aed'
                        }}>
                            {percentage}%
                        </div>
                    </div>

                    <p style={{
                        fontSize: 'clamp(16px, 3vw, 20px)',
                        color: '#666',
                        marginBottom: '30px',
                        fontWeight: '500'
                    }}>
                        {message}
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        flexDirection: 'column'
                    }}>
                        <button
                            onClick={handleReplay}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: 'clamp(16px, 3vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                        >
                            🔄 Rejouer
                        </button>

                        <button
                            onClick={handleBackToList}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: 'clamp(16px, 3vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                            ❓ Choisir un autre imagier
                        </button>

                        <button
                            onClick={() => router.push('/imagiers')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '12px 25px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: 'clamp(14px, 3vw, 16px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                        >
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
