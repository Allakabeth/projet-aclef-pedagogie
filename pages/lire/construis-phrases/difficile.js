import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesDifficile() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [gameFinished, setGameFinished] = useState(false)

    // États pour l'enregistrement vocal
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })

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
        chargerPhrases()
    }, [router])

    const chargerPhrases = async () => {
        try {
            const mots = JSON.parse(localStorage.getItem('construis-phrases-mots') || '[]')

            if (mots.length === 0) {
                alert('Aucun mot disponible')
                router.push('/lire/construis-phrases')
                return
            }

            const token = localStorage.getItem('token')
            const response = await fetch('/api/phrases/generer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mots: mots })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Phrases chargées:', data.phrases.length)
                setPhrases(data.phrases)
                setPhraseActuelle(data.phrases[0])
            } else {
                const error = await response.json()
                alert(error.error || 'Erreur lors du chargement des phrases')
                router.push('/lire/construis-phrases')
            }
        } catch (error) {
            console.error('Erreur chargement phrases:', error)
            alert('Erreur lors du chargement des phrases')
            router.push('/lire/construis-phrases')
        }
    }

    // Fonction d'enregistrement vocal
    const toggleRecording = async () => {
        if (isRecording) {
            // Arrêter l'enregistrement
            if (mediaRecorder) {
                mediaRecorder.stop()
            }
        } else {
            // Démarrer l'enregistrement
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const recorder = new MediaRecorder(stream)
                const audioChunks = []

                recorder.ondataavailable = (event) => {
                    audioChunks.push(event.data)
                }

                recorder.onstop = async () => {
                    setIsRecording(false)
                    setIsTranscribing(true)

                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

                    // Arrêter le stream audio
                    stream.getTracks().forEach(track => track.stop())

                    // Envoyer à l'API pour transcription
                    await transcribeAudio(audioBlob)
                }

                recorder.start()
                setMediaRecorder(recorder)
                setIsRecording(true)
            } catch (error) {
                console.error('Erreur accès microphone:', error)
                alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.')
            }
        }
    }

    const transcribeAudio = async (audioBlob) => {
        try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')

            const response = await fetch('/api/speech/groq-whisper', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                console.log('Transcription:', data.text)

                // Vérifier la phrase transcrite
                verifierPhraseVocale(data.text)
            } else {
                const error = await response.json()
                console.error('Erreur transcription:', error)
                alert('Erreur lors de la transcription. Réessayez.')
            }
        } catch (error) {
            console.error('Erreur transcription:', error)
            alert('Erreur lors de la transcription.')
        } finally {
            setIsTranscribing(false)
        }
    }

    const verifierPhraseVocale = (texteTranscrit) => {
        // Normaliser les textes (enlever ponctuation, minuscules)
        const normaliser = (text) => {
            return text
                .toLowerCase()
                .replace(/[.,;:!?'"«»\-—]/g, '')
                .trim()
        }

        const phraseTranscrite = normaliser(texteTranscrit)
        const phraseAttendue = normaliser(phraseActuelle.texte)

        console.log('Transcrit:', phraseTranscrite)
        console.log('Attendu:', phraseAttendue)

        const isCorrect = phraseTranscrite === phraseAttendue

        if (isCorrect) {
            setScore(score + 1)
            setVisualFeedback({ correct: true, incorrect: false })

            // Passer à la phrase suivante après 3 secondes
            setTimeout(() => {
                const nextIndex = phraseIndex + 1
                if (nextIndex < phrases.length) {
                    setPhraseIndex(nextIndex)
                    setPhraseActuelle(phrases[nextIndex])
                    setVisualFeedback({ correct: false, incorrect: false })
                } else {
                    setGameFinished(true)
                }
            }, 3000)
        } else {
            setVisualFeedback({ correct: false, incorrect: true })

            // Réinitialiser après 3 secondes
            setTimeout(() => {
                setVisualFeedback({ correct: false, incorrect: false })
            }, 3000)
        }
    }

    const passerPhrase = () => {
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
        } else {
            setGameFinished(true)
        }
    }

    if (isLoading || !phraseActuelle) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#dc2626', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    if (gameFinished) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔥</div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        marginBottom: '20px'
                    }}>
                        Bravo !
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        color: '#666',
                        marginBottom: '30px'
                    }}>
                        Vous avez lu {score} phrase{score > 1 ? 's' : ''} sur {phrases.length} !
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => router.push('/lire/construis-phrases')}
                            style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Recommencer
                        </button>
                        <button
                            onClick={() => router.push('/lire/reconnaitre-les-mots?etape=exercices')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour aux exercices
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.8;
                        transform: scale(1.05);
                    }
                }
            `}</style>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                padding: '20px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    {/* En-tête */}
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
                        <div>Phrase {phraseIndex + 1}/{phrases.length}</div>
                        <div>Score: {score}</div>
                        <button
                            onClick={() => router.push('/lire/construis-phrases')}
                            style={{
                                backgroundColor: '#7f1d1d',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🚪 Quitter
                        </button>
                    </div>

                    {/* Zone phrase */}
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '40px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#dc2626',
                            marginBottom: '30px'
                        }}>
                            🔥 Mode Difficile
                        </div>

                        {/* La phrase */}
                        <div style={{
                            fontSize: window.innerWidth <= 768 ? '24px' : '32px',
                            fontWeight: 'bold',
                            color: '#333',
                            marginBottom: '40px',
                            lineHeight: '1.5',
                            padding: '30px',
                            background: visualFeedback.correct
                                ? '#dcfce7'
                                : visualFeedback.incorrect
                                ? '#fee2e2'
                                : '#fef2f2',
                            borderRadius: '15px',
                            border: `3px solid ${
                                visualFeedback.correct
                                ? '#10b981'
                                : visualFeedback.incorrect
                                ? '#ef4444'
                                : '#dc2626'
                            }`
                        }}>
                            {phraseActuelle.texte}
                        </div>

                        {/* Feedback visuel */}
                        {visualFeedback.correct && (
                            <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>
                                ✅ Parfait ! Vous avez bien lu la phrase !
                            </p>
                        )}

                        {visualFeedback.incorrect && (
                            <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>
                                ❌ Essayez encore !
                            </p>
                        )}

                        {/* Boutons d'action */}
                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            marginBottom: '30px'
                        }}>
                            <button
                                onClick={toggleRecording}
                                disabled={isTranscribing || visualFeedback.correct}
                                style={{
                                    background: isRecording
                                        ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
                                        : isTranscribing
                                        ? '#9ca3af'
                                        : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: (isTranscribing || visualFeedback.correct) ? 'not-allowed' : 'pointer',
                                    transition: 'transform 0.2s',
                                    animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
                                }}
                                onMouseOver={(e) => !isRecording && !isTranscribing && !visualFeedback.correct && (e.target.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => !isRecording && !isTranscribing && !visualFeedback.correct && (e.target.style.transform = 'scale(1)')}
                            >
                                {isRecording ? '⏹️ Arrêter l\'enregistrement' : isTranscribing ? '⏳ Analyse en cours...' : '🎤 Lire la phrase à haute voix'}
                            </button>
                        </div>

                        <button
                            onClick={passerPhrase}
                            style={{
                                background: 'transparent',
                                color: '#6b7280',
                                padding: '10px 20px',
                                border: '2px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ⏭️ Passer cette phrase
                        </button>

                        <p style={{
                            marginTop: '30px',
                            color: '#666',
                            fontSize: '14px',
                            opacity: 0.8
                        }}>
                            Lisez la phrase à voix haute, puis cliquez sur le bouton microphone
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
