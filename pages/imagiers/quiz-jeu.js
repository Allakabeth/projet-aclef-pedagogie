import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function QuizJeu() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imagier, setImagier] = useState(null)
    const [elements, setElements] = useState([])
    const [mode, setMode] = useState(4)
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [score, setScore] = useState(0)
    const [questionsOrder, setQuestionsOrder] = useState([])
    const [currentOptions, setCurrentOptions] = useState([])
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [quizFinished, setQuizFinished] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        }

        const { imagier: imagierId, mode: quizMode } = router.query
        if (imagierId && quizMode) {
            setMode(parseInt(quizMode))
            loadImagierAndElements(imagierId)
        }
    }, [router.query])

    const loadImagierAndElements = async (imagierId) => {
        try {
            const token = localStorage.getItem('token')

            // Charger l'imagier avec ses éléments (API [id] retourne tout en un seul appel)
            const response = await fetch(`/api/imagiers/${imagierId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                alert('Erreur lors du chargement de l\'imagier')
                router.push('/imagiers/quiz')
                return
            }

            const data = await response.json()
            const loadedImagier = data.imagier
            const loadedElements = loadedImagier.elements || []

            if (loadedElements.length < 4) {
                alert('Cet imagier n\'a pas assez d\'éléments pour jouer')
                router.push('/imagiers/quiz')
                return
            }

            setImagier(loadedImagier)
            setElements(loadedElements)

            // Mélanger l'ordre des questions
            const shuffled = [...loadedElements].sort(() => Math.random() - 0.5)
            setQuestionsOrder(shuffled)

            // Préparer la première question
            prepareQuestion(0, shuffled, loadedElements)

            setIsLoading(false)
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors du chargement')
            router.push('/imagiers/quiz')
        }
    }

    const prepareQuestion = (questionIndex, questionsArray, allElements) => {
        const currentElement = questionsArray[questionIndex]
        const correctAnswer = currentElement

        // Générer les distracteurs (mauvaises réponses)
        const otherElements = allElements.filter(el => el.id !== correctAnswer.id)
        const shuffledOthers = [...otherElements].sort(() => Math.random() - 0.5)
        const distractors = shuffledOthers.slice(0, mode - 1)

        // Créer toutes les options et les mélanger
        const allOptions = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5)

        setCurrentOptions(allOptions)
        setSelectedAnswer(null)
        setShowFeedback(false)
        setIsCorrect(false)
    }

    const handleAnswerClick = (selectedElement) => {
        if (showFeedback) return // Déjà répondu

        const currentElement = questionsOrder[currentQuestion]
        const correct = selectedElement.id === currentElement.id

        setSelectedAnswer(selectedElement.id)
        setIsCorrect(correct)
        setShowFeedback(true)

        if (correct) {
            setScore(score + 1)
        }
    }

    const handleNextQuestion = () => {
        const nextIndex = currentQuestion + 1

        if (nextIndex >= questionsOrder.length) {
            // Quiz terminé
            setQuizFinished(true)
        } else {
            setCurrentQuestion(nextIndex)
            prepareQuestion(nextIndex, questionsOrder, elements)
        }
    }

    const restartQuiz = () => {
        setCurrentQuestion(0)
        setScore(0)
        setQuizFinished(false)

        // Mélanger à nouveau
        const shuffled = [...elements].sort(() => Math.random() - 0.5)
        setQuestionsOrder(shuffled)
        prepareQuestion(0, shuffled, elements)
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: 'white', fontSize: '18px' }}>Chargement du quiz...</div>
            </div>
        )
    }

    if (!user || !imagier) return null

    // Écran de fin
    if (quizFinished) {
        const percentage = Math.round((score / questionsOrder.length) * 100)

        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    maxWidth: '500px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                        {percentage >= 80 ? '🎉' : percentage >= 50 ? '👏' : '💪'}
                    </div>

                    <h2 style={{
                        fontSize: '32px',
                        color: '#333',
                        marginBottom: '20px'
                    }}>
                        Quiz terminé !
                    </h2>

                    <div style={{
                        backgroundColor: '#fee2e2',
                        borderRadius: '16px',
                        padding: '30px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#dc2626',
                            marginBottom: '10px'
                        }}>
                            {score} / {questionsOrder.length}
                        </div>
                        <div style={{
                            fontSize: '24px',
                            color: '#991b1b'
                        }}>
                            {percentage}%
                        </div>
                    </div>

                    <p style={{
                        fontSize: '18px',
                        color: '#666',
                        marginBottom: '30px'
                    }}>
                        {percentage >= 80 ? 'Excellent travail ! Vous maîtrisez ce vocabulaire !' :
                         percentage >= 50 ? 'Bon travail ! Continuez à vous entraîner !' :
                         'Continuez à pratiquer, vous allez progresser !'}
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={restartQuiz}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Recommencer
                        </button>

                        <button
                            onClick={() => router.push('/imagiers/quiz')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Choisir un autre imagier
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const currentElement = questionsOrder[currentQuestion]

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto'
            }}>
                {/* En-tête avec score */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <button
                        onClick={() => {
                            if (confirm('Voulez-vous vraiment quitter le quiz ? Votre progression sera perdue.')) {
                                router.push('/imagiers/quiz')
                            }
                        }}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '10px 20px',
                            border: '2px solid white',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Quitter
                    </button>

                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>
                            Question {currentQuestion + 1} / {questionsOrder.length}
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#ef4444' }}>
                            Score: {score}
                        </div>
                    </div>
                </div>

                {/* Titre de l'imagier */}
                <h2 style={{
                    color: 'white',
                    textAlign: 'center',
                    fontSize: '24px',
                    marginBottom: '30px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    {imagier.titre}
                </h2>

                {/* Zone de question */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    marginBottom: '30px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }}>
                    {/* Image */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <img
                            src={currentElement.image_url}
                            alt="Question"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        />
                    </div>

                    {/* Question */}
                    <h3 style={{
                        textAlign: 'center',
                        fontSize: '24px',
                        color: '#333',
                        marginBottom: '30px'
                    }}>
                        {currentElement.question || "Qu'est-ce que c'est ?"}
                    </h3>

                    {/* Options de réponse */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: mode === 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                        gap: '15px'
                    }}>
                        {currentOptions.map((option) => {
                            let buttonStyle = {
                                padding: '20px',
                                border: '3px solid #e5e7eb',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: showFeedback ? 'default' : 'pointer',
                                backgroundColor: 'white',
                                color: '#333',
                                transition: 'all 0.2s ease',
                                textAlign: 'center'
                            }

                            // Feedback visuel après réponse
                            if (showFeedback) {
                                if (option.id === currentElement.id) {
                                    // Bonne réponse
                                    buttonStyle = {
                                        ...buttonStyle,
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderColor: '#059669'
                                    }
                                } else if (option.id === selectedAnswer) {
                                    // Mauvaise réponse sélectionnée
                                    buttonStyle = {
                                        ...buttonStyle,
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        borderColor: '#dc2626'
                                    }
                                } else {
                                    // Autres options
                                    buttonStyle = {
                                        ...buttonStyle,
                                        opacity: 0.5
                                    }
                                }
                            }

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleAnswerClick(option)}
                                    style={buttonStyle}
                                    onMouseOver={(e) => {
                                        if (!showFeedback) {
                                            e.currentTarget.style.borderColor = '#ef4444'
                                            e.currentTarget.style.transform = 'scale(1.02)'
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!showFeedback) {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.transform = 'scale(1)'
                                        }
                                    }}
                                >
                                    {option.mot}
                                </button>
                            )
                        })}
                    </div>

                    {/* Feedback et bouton suivant */}
                    {showFeedback && (
                        <div style={{
                            marginTop: '30px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: isCorrect ? '#10b981' : '#ef4444',
                                marginBottom: '20px'
                            }}>
                                {isCorrect ? '✅ Bonne réponse !' : '❌ Mauvaise réponse'}
                            </div>

                            <button
                                onClick={handleNextQuestion}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    padding: '15px 40px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                {currentQuestion + 1 >= questionsOrder.length ? '🏁 Voir le résultat' : '➡️ Question suivante'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
