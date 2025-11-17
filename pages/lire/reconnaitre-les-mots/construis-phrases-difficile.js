import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesDifficile() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [phrasesReussies, setPhrasesReussies] = useState([])
    const [phrasesARevoir, setPhrasesARevoir] = useState([])

    // États pour l'enregistrement vocal
    const [isRecording, setIsRecording] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })
    const [motsStatuts, setMotsStatuts] = useState([])
    const [texteTranscrit, setTexteTranscrit] = useState('')

    // États pour les erreurs et compteur
    const [loadingError, setLoadingError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [loadingStep, setLoadingStep] = useState('') // Étape de chargement
    const [loadingTimeout, setLoadingTimeout] = useState(false) // Timeout dépassé

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // Anti-spam bouton recommencer
    const [isRestarting, setIsRestarting] = useState(false)

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
                // Timeout de sécurité 30 secondes
                const timeoutId = setTimeout(() => {
                    setLoadingTimeout(true)
                    console.warn('⏱️ Timeout chargement dépassé (30s)')
                }, 30000)

                try {
                    setLoadingStep('Chargement des phrases...')
                    await chargerPhrases(router.query.texte_ids)

                    clearTimeout(timeoutId)
                    setLoadingStep('')
                } catch (err) {
                    clearTimeout(timeoutId)
                    console.error('Erreur chargement:', err)
                    setLoadingError('Erreur lors du chargement. Veuillez réessayer.')
                    setEtape('intro')
                }
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
            // Convertir texte_ids en tableau de nombres
            const texteIdsArray = texteIds.split(',').map(Number)

            // Récupérer les phrases pré-générées
            const token = localStorage.getItem('token')
            const response = await fetch('/api/phrases/generer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ texte_ids: texteIdsArray })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Phrases chargées:', data.phrases.length)
                setPhrases(data.phrases)
                setPhraseActuelle(data.phrases[0])
                setEtape('exercice')

                // Incrémenter le compteur localStorage si nouvelles phrases générées
                if (data.source !== 'cache') {
                    const today = new Date().toISOString().split('T')[0]
                    const counter = JSON.parse(localStorage.getItem('openrouter_daily_counter') || '{}')

                    if (counter.date === today) {
                        counter.count = (counter.count || 0) + 1
                    } else {
                        counter.date = today
                        counter.count = 1
                    }

                    localStorage.setItem('openrouter_daily_counter', JSON.stringify(counter))
                    console.log(`📊 Compteur requêtes: ${counter.count}/1000`)
                }

                // Réinitialiser l'erreur
                setLoadingError(null)
            } else {
                const error = await response.json()

                // Afficher le message d'erreur visuel au lieu d'un popup
                if (response.status === 503) {
                    setLoadingError('⚠️ Serveur surchargé. Veuillez réessayer dans quelques instants.')
                } else if (error.error === 'Phrases non générées') {
                    setLoadingError(error.message || 'Impossible de générer les phrases.')
                } else {
                    setLoadingError(error.error || 'Erreur lors du chargement des phrases.')
                }

                setEtape('intro')
            }
        } catch (error) {
            console.error('Erreur chargement phrases:', error)
            setLoadingError('Erreur lors du chargement des phrases. Veuillez réessayer.')
            setEtape('intro')
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
        // Sauvegarder la transcription pour l'affichage
        setTexteTranscrit(texteTranscrit)

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

        // Pour l'affichage, découper les mots attendus ET transcrits
        const motsAttendus = phraseActuelle.texte
            .toLowerCase()
            .replace(/[.,;:!?'"«»\-—]/g, '')
            .split(/\s+/)
            .filter(m => m.length > 0)

        const motsTranscrits = texteTranscrit
            .toLowerCase()
            .replace(/[.,;:!?'"«»\-—]/g, '')
            .split(/\s+/)
            .filter(m => m.length > 0)

        // Normaliser chaque mot (sans accents)
        const normaliserMot = (mot) => {
            return mot
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
        }

        // Fonction de comparaison phonétique tolérante
        const motsPhonetiquesSimilaires = (mot1, mot2) => {
            const m1 = normaliserMot(mot1)
            const m2 = normaliserMot(mot2)

            // Si identiques après normalisation → OK
            if (m1 === m2) return true

            // Tolérance : e muet final
            // partie = parti, jolie = joli, finie = fini
            if (m1 === m2 + 'e' || m2 === m1 + 'e') {
                // Vérifier que c'est bien un "e" muet (pas petit/petite)
                // Les mots en -ie, -ue, -ee ont un e muet
                const racine = m1.length > m2.length ? m2 : m1
                const derniereLettre = racine[racine.length - 1]

                // e muet si le mot se termine par i, u, é, ou double consonne
                if (['i', 'u', 'e'].includes(derniereLettre)) {
                    return true
                }
            }

            // Tolérance : variations er/é/ez/ée en fin de mot
            // aller = allé = allée = allez
            const terminaisonsEquivalentes = (mot) => {
                return mot
                    .replace(/er$/, 'X')
                    .replace(/e$/, 'X')
                    .replace(/es$/, 'X')
                    .replace(/ee$/, 'X')
                    .replace(/ees$/, 'X')
                    .replace(/ez$/, 'X')
            }

            if (terminaisonsEquivalentes(m1) === terminaisonsEquivalentes(m2)) {
                return true
            }

            return false
        }

        // Comparer mot par mot (position par position)
        const statuts = motsAttendus.map((motAttendu, index) => {
            const motTranscrit = motsTranscrits[index] || '' // Mot à cette position (ou vide si absent)

            return {
                mot: motAttendu, // Afficher le mot attendu original
                correct: motsPhonetiquesSimilaires(motAttendu, motTranscrit)
            }
        })

        setMotsStatuts(statuts)

        if (toutCorrect) {
            setScore(score + 1)
            setPhrasesReussies([...phrasesReussies, phraseActuelle.texte])
            setVisualFeedback({ correct: true, incorrect: false })

            // Passer à la phrase suivante après 3 secondes
            setTimeout(() => {
                const nextIndex = phraseIndex + 1
                if (nextIndex < phrases.length) {
                    setPhraseIndex(nextIndex)
                    setPhraseActuelle(phrases[nextIndex])
                    setVisualFeedback({ correct: false, incorrect: false })
                    setMotsStatuts([])
                    setTexteTranscrit('')
                } else {
                    setEtape('resultats')
                }
            }, 3000)
        } else {
            setVisualFeedback({ correct: false, incorrect: true })
        }
    }

    const passerPhrase = () => {
        // Ajouter la phrase actuelle aux phrases à revoir
        setPhrasesARevoir([...phrasesARevoir, phraseActuelle.texte])

        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setMotsStatuts([])
            setVisualFeedback({ correct: false, incorrect: false })
            setTexteTranscrit('')
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                padding: '20px'
            }}>
                {!loadingTimeout ? (
                    <>
                        <div style={{
                            fontSize: '48px',
                            animation: 'spin 2s linear infinite'
                        }}>
                            ⏳
                        </div>
                        <div style={{
                            color: '#f97316',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}>
                            {loadingStep || 'Chargement...'}
                        </div>
                        <div style={{
                            color: '#64748b',
                            fontSize: '14px',
                            textAlign: 'center',
                            maxWidth: '400px'
                        }}>
                            Génération ou récupération des phrases en cours. Cela peut prendre quelques secondes...
                        </div>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `
                        }} />
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '48px' }}>⏱️</div>
                        <div style={{
                            color: '#f59e0b',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}>
                            Le chargement prend plus de temps que prévu...
                        </div>
                        <div style={{
                            color: '#64748b',
                            fontSize: '14px',
                            textAlign: 'center',
                            maxWidth: '400px'
                        }}>
                            Dernière étape : {loadingStep || 'En cours...'}
                        </div>
                        <button
                            onClick={() => {
                                setLoadingTimeout(false)
                                setLoadingStep('')
                                window.location.reload()
                            }}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            🔄 Réessayer
                        </button>
                        <button
                            onClick={() => router.push('/lire/reconnaitre-les-mots/exercices2')}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'white',
                                color: '#64748b',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour au menu
                        </button>
                    </>
                )}
            </div>
        )
    }

    if (!user) return null

    if (etape === 'resultats') {
        return (
            <div style={{ minHeight: '100vh', background: 'white', padding: '15px' }}>
                {/* Confettis sur score parfait */}
                {showConfetti && score === phrases.length && (
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

                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: isMobile ? '20px' : '28px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        textAlign: 'center',
                        marginBottom: isMobile ? '10px' : '15px'
                    }}>
                        🔥 Mode Difficile - Résultats
                    </h1>

                    {/* Barre d'icônes */}
                    <div style={{
                        display: 'flex',
                        gap: isMobile ? '8px' : '10px',
                        justifyContent: 'center',
                        marginBottom: isMobile ? '15px' : '20px'
                    }}>
                        <button
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #64748b',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                            title="Menu exercices"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/lire/reconnaitre-les-mots')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #3b82f6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                            title="Reconnaître les mots"
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
                                fontSize: '20px'
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
                                fontSize: '20px'
                            }}
                            title="Tableau de bord"
                        >
                            🏠
                        </button>
                        <button
                            onClick={async () => {
                                if (isRestarting) return // Bloquer si déjà en cours

                                setIsRestarting(true) // Activer le verrou

                                const token = localStorage.getItem('token')
                                const texteIdsArray = router.query.texte_ids.split(',').map(Number)

                                const response = await fetch('/api/phrases/generer', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ texte_ids: texteIdsArray })
                                })

                                if (response.ok) {
                                    const data = await response.json()
                                    console.log('✅ Nouvelles phrases tirées au sort:', data.phrases.length)

                                    setPhrases(data.phrases)
                                    setPhraseIndex(0)
                                    setScore(0)
                                    setPhrasesReussies([])
                                    setPhrasesARevoir([])
                                    setPhraseActuelle(data.phrases[0])
                                    setMotsStatuts([])
                                    setVisualFeedback({ correct: false, incorrect: false })
                                    setTexteTranscrit('')
                                    setIsRestarting(false)
                                    setEtape('exercice')
                                } else {
                                    setIsRestarting(false) // Libérer si erreur
                                }
                            }}
                            disabled={isRestarting}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: isRestarting ? '#d1d5db' : 'white',
                                border: '2px solid #f59e0b',
                                borderRadius: '8px',
                                cursor: isRestarting ? 'not-allowed' : 'pointer',
                                fontSize: '20px',
                                opacity: isRestarting ? 0.6 : 1
                            }}
                            title="Recommencer"
                        >
                            {isRestarting ? '⏳' : '🔄'}
                        </button>
                    </div>

                    {/* Score */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: isMobile ? '20px' : '30px'
                    }}>
                        <div style={{
                            display: 'inline-block',
                            backgroundColor: 'white',
                            border: '3px solid #dc2626',
                            borderRadius: '12px',
                            padding: isMobile ? '12px 24px' : '16px 32px'
                        }}>
                            <h2 style={{
                                fontSize: isMobile ? '28px' : '36px',
                                fontWeight: 'bold',
                                color: '#dc2626',
                                margin: 0
                            }}>
                                {score}/{phrases.length}
                            </h2>
                        </div>
                    </div>

                    {/* Phrases réussies */}
                    {phrasesReussies.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{
                                fontSize: isMobile ? '16px' : '20px',
                                fontWeight: 'bold',
                                color: '#10b981',
                                marginBottom: '10px',
                                textAlign: 'center'
                            }}>
                                Phrases réussies ({phrasesReussies.length})
                            </h2>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                alignItems: 'center'
                            }}>
                                {phrasesReussies.map((phrase, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            maxWidth: '600px',
                                            width: '100%',
                                            textAlign: 'center',
                                            backgroundColor: '#f0fdf4',
                                            border: '2px solid #10b981',
                                            borderRadius: '8px',
                                            padding: isMobile ? '8px 12px' : '10px 16px',
                                            fontSize: isMobile ? '14px' : '16px',
                                            color: '#333'
                                        }}
                                    >
                                        {idx + 1}. {phrase}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phrases à revoir */}
                    {phrasesARevoir.length > 0 && (
                        <div>
                            <h2 style={{
                                fontSize: isMobile ? '16px' : '20px',
                                fontWeight: 'bold',
                                color: '#f59e0b',
                                marginBottom: '10px',
                                textAlign: 'center'
                            }}>
                                Phrases à revoir ({phrasesARevoir.length})
                            </h2>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                alignItems: 'center'
                            }}>
                                {phrasesARevoir.map((phrase, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            maxWidth: '600px',
                                            width: '100%',
                                            textAlign: 'center',
                                            backgroundColor: '#fffbeb',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '8px',
                                            padding: isMobile ? '8px 12px' : '10px 16px',
                                            fontSize: isMobile ? '14px' : '16px',
                                            color: '#333'
                                        }}
                                    >
                                        {idx + 1}. {phrase}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

                    {/* Message d'erreur visuel */}
                    {loadingError && (
                        <div style={{
                            background: '#fef3c7',
                            border: '2px solid #f59e0b',
                            padding: isMobile ? '12px' : '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: isMobile ? '16px' : '18px',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                                color: '#f59e0b'
                            }}>
                                ⚠️ Serveur surchargé. Veuillez réessayer.
                            </p>
                            <p style={{
                                fontSize: isMobile ? '13px' : '14px',
                                color: '#666',
                                marginBottom: '0'
                            }}>
                                {loadingError}
                            </p>
                            {retryCount > 0 && (
                                <p style={{
                                    fontSize: isMobile ? '12px' : '13px',
                                    color: '#888',
                                    marginTop: '8px',
                                    marginBottom: '0'
                                }}>
                                    Tentative {retryCount}/5
                                </p>
                            )}
                        </div>
                    )}

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

                        {/* Affichage de ce qui a été compris par l'enregistrement */}
                        {texteTranscrit && motsStatuts.length > 0 && (
                            <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                                <p style={{
                                    color: '#6b7280',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    marginBottom: '10px'
                                }}>
                                    📝 Vous avez dit :
                                </p>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {texteTranscrit
                                        .toLowerCase()
                                        .replace(/[.,;:!?'"«»\-—]/g, '')
                                        .split(/\s+/)
                                        .filter(m => m.length > 0)
                                        .map((mot, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    background: '#f3f4f6',
                                                    color: '#4b5563',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    fontSize: isMobile ? '14px' : '16px',
                                                    fontWeight: 'bold',
                                                    border: '2px solid #d1d5db'
                                                }}
                                            >
                                                {mot}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

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
