import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesDifficile() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)

    // États pour l'enregistrement vocal
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })
    const [motsStatuts, setMotsStatuts] = useState([])

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // Détection mobile
    const [isMobile, setIsMobile] = useState(false)

    const router = useRouter()

    // Détection mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (router.isReady) {
            checkAuth()
        }
    }, [router.isReady, router.query])

    const checkAuth = async () => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)

            // Charger les données via texte_ids
            if (router.query.texte_ids) {
                await chargerPhrases(router.query.texte_ids)
            } else {
                alert('Aucun texte sélectionné. Retournez au menu des exercices.')
                router.push('/lire/reconnaitre-les-mots/exercices2')
                return
            }
        } catch (error) {
            console.error('Erreur:', error)
            router.push('/login')
            return
        }
    }

    const chargerPhrases = async (texteIds) => {
        try {
            // Charger les mots
            const motsResponse = await fetch(`/api/syllabes-mots/list?texte_ids=${texteIds}`)
            const motsData = await motsResponse.json()

            if (!motsData.success || !motsData.mots || motsData.mots.length === 0) {
                alert('Aucun mot trouvé pour ces textes.')
                router.push('/lire/reconnaitre-les-mots/exercices2?textes=' + texteIds)
                return
            }

            const mots = motsData.mots

            // Générer les phrases
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
                setEtape('exercice')
            } else {
                const error = await response.json()
                alert(error.error || 'Erreur lors du chargement des phrases')
                router.push('/lire/reconnaitre-les-mots/construis-phrases-intro?texte_ids=' + texteIds)
            }
        } catch (error) {
            console.error('Erreur chargement phrases:', error)
            alert('Erreur lors du chargement des phrases')
            router.push('/lire/reconnaitre-les-mots/construis-phrases-intro?texte_ids=' + texteIds)
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
        // Normaliser les textes
        const normaliser = (text) => {
            return text
                .toLowerCase()
                .replace(/[.,;:!?'"«»\-—\s]/g, '')  // Enlever TOUT (espaces inclus)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')    // Enlever accents
        }

        const phraseTranscriteNormalisee = normaliser(texteTranscrit)
        const phraseAttendueNormalisee = normaliser(phraseActuelle.texte)

        console.log('Phrase transcrite (normalisée):', phraseTranscriteNormalisee)
        console.log('Phrase attendue (normalisée):', phraseAttendueNormalisee)

        // Calculer la distance de Levenshtein (similarité)
        const calculerSimilarite = (s1, s2) => {
            const longueurMax = Math.max(s1.length, s2.length)
            if (longueurMax === 0) return 100

            const distance = levenshtein(s1, s2)
            return Math.round(((longueurMax - distance) / longueurMax) * 100)
        }

        // Distance de Levenshtein
        const levenshtein = (s1, s2) => {
            const matrix = []

            for (let i = 0; i <= s2.length; i++) {
                matrix[i] = [i]
            }

            for (let j = 0; j <= s1.length; j++) {
                matrix[0][j] = j
            }

            for (let i = 1; i <= s2.length; i++) {
                for (let j = 1; j <= s1.length; j++) {
                    if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1]
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        )
                    }
                }
            }

            return matrix[s2.length][s1.length]
        }

        const similarite = calculerSimilarite(phraseTranscriteNormalisee, phraseAttendueNormalisee)
        console.log('Similarité:', similarite + '%')

        // Si similarité >= 80% → CORRECT
        const toutCorrect = similarite >= 80

        // Pour l'affichage, découper les mots attendus
        const motsAttendus = phraseActuelle.texte
            .toLowerCase()
            .replace(/[.,;:!?'"«»\-—]/g, '')
            .split(/\s+/)
            .filter(m => m.length > 0)

        // Si correct, tout en vert. Sinon, tout en rouge
        const statuts = motsAttendus.map(mot => ({
            mot: mot,
            correct: toutCorrect
        }))

        setMotsStatuts(statuts)

        if (toutCorrect) {
            setScore(score + 1)
            setVisualFeedback({ correct: true, incorrect: false })

            // Passer à la phrase suivante après 3 secondes
            setTimeout(() => {
                const nextIndex = phraseIndex + 1
                if (nextIndex < phrases.length) {
                    setPhraseIndex(nextIndex)
                    setPhraseActuelle(phrases[nextIndex])
                    setVisualFeedback({ correct: false, incorrect: false })
                    setMotsStatuts([])
                } else {
                    setEtape('resultats')
                }
            }, 3000)
        } else {
            setVisualFeedback({ correct: false, incorrect: true })
        }
    }

    const passerPhrase = () => {
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setMotsStatuts([])
            setVisualFeedback({ correct: false, incorrect: false })
        } else {
            setEtape('resultats')
        }
    }

    // Confettis sur la page de résultats si score parfait
    useEffect(() => {
        if (etape === 'resultats' && score === phrases.length && phrases.length > 0) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
        }
    }, [etape])

    if (etape === 'chargement' || !phraseActuelle) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#f97316', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    if (etape === 'resultats') {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                {showConfetti && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @keyframes confettiFall {
                                    0% {
                                        transform: translateY(-50px) rotate(0deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translateY(100vh) rotate(360deg);
                                        opacity: 0;
                                    }
                                }
                            `
                        }} />
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            overflow: 'hidden'
                        }}>
                            {[...Array(50)].map((_, i) => {
                                const emojis = ['🎉', '🎊', '✨', '🌟', '⭐']
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                                const randomLeft = Math.random() * 100
                                const randomDuration = 2 + Math.random() * 2
                                const randomDelay = Math.random() * 0.5

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${randomLeft}%`,
                                            top: '-50px',
                                            fontSize: '40px',
                                            animation: `confettiFall ${randomDuration}s linear ${randomDelay}s forwards`
                                        }}
                                    >
                                        {randomEmoji}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                        {score === phrases.length ? '🎉' : '🔥'}
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        marginBottom: '20px'
                    }}>
                        {score === phrases.length ? 'Parfait !' : 'Bravo !'}
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
                            onClick={() => {
                                setScore(0)
                                setPhraseIndex(0)
                                setPhraseActuelle(phrases[0])
                                setMotsStatuts([])
                                setVisualFeedback({ correct: false, incorrect: false })
                                setEtape('exercice')
                            }}
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
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
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
                background: 'white',
                padding: '5px 15px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    {/* LIGNE 1 : Titre */}
                    <h1 style={{
                        fontSize: isMobile ? '24px' : '28px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        textAlign: 'center',
                        margin: '0 0 10px 0'
                    }}>
                        🔥 Mode Difficile
                    </h1>

                    {/* LIGNE 2 : Phrase + Score */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px',
                        fontSize: isMobile ? '14px' : '16px',
                        fontWeight: 'bold'
                    }}>
                        <div style={{ color: '#666' }}>
                            Phrase {phraseIndex + 1}/{phrases.length}
                        </div>
                        <div style={{ color: '#dc2626' }}>
                            Score: {score}
                        </div>
                    </div>

                    {/* LIGNE 3 : Icônes de navigation */}
                    <div style={{
                        display: 'flex',
                        gap: isMobile ? '8px' : '10px',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <button
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #64748b',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Menu exercices"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/lire/reconnaitre-les-mots?etape=selection')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #3b82f6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Sélection des textes"
                        >
                            👁️
                        </button>
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Menu Lire"
                        >
                            📖
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #8b5cf6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Accueil"
                        >
                            🏠
                        </button>
                    </div>

                    {/* Zone de contenu (sans cadre blanc) */}
                    <div style={{ textAlign: 'center' }}>

                        {/* La phrase avec mots colorés */}
                        <div style={{
                            marginBottom: '30px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '80px'
                        }}>
                            {motsStatuts.length > 0 ? (
                                // Afficher mots avec statuts
                                motsStatuts.map((statut, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            fontSize: isMobile ? '20px' : '28px',
                                            fontWeight: 'bold',
                                            color: '#333',
                                            padding: '10px 20px',
                                            background: statut.correct ? '#dcfce7' : '#fee2e2',
                                            border: `3px solid ${statut.correct ? '#10b981' : '#ef4444'}`,
                                            borderRadius: '12px'
                                        }}
                                    >
                                        {statut.mot}
                                    </div>
                                ))
                            ) : (
                                // Afficher phrase normale
                                <div style={{
                                    fontSize: isMobile ? '20px' : '28px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    padding: '20px',
                                    background: '#fee2e2',
                                    borderRadius: '12px',
                                    border: '3px solid #dc2626',
                                    lineHeight: '1.5'
                                }}>
                                    {phraseActuelle.texte}
                                </div>
                            )}
                        </div>

                        {/* Feedback visuel */}
                        {visualFeedback.correct && (
                            <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>
                                ✅ Parfait ! Vous avez bien lu la phrase !
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
                                        ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)'
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
