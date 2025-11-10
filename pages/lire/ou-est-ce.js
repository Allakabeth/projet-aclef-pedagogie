import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// Styles pour masquer les éléments sur mobile
const mobileStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }
`

export default function OuEstCe() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [allGroupes, setAllGroupes] = useState([])
    const [currentGroupe, setCurrentGroupe] = useState(null)
    const [shuffledGroupes, setShuffledGroupes] = useState([])
    const [displayedGroupes, setDisplayedGroupes] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [orderMode, setOrderMode] = useState('random') // 'random' ou 'sequential'
    const [displayMode, setDisplayMode] = useState('random') // 'random' ou 'sequential' pour l'affichage des étiquettes
    const [feedback, setFeedback] = useState('')
    const [completedGroupes, setCompletedGroupes] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [availableVoices, setAvailableVoices] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
    const [tokenStatus, setTokenStatus] = useState('unknown') // 'available', 'exhausted', 'unknown'
    const [enregistrements, setEnregistrements] = useState({}) // Enregistrements par groupe_sens_id
    const [wrongGroupeId, setWrongGroupeId] = useState(null) // Groupe cliqué en erreur
    const [showNextButton, setShowNextButton] = useState(false) // Afficher bouton Suivant
    const [showConfetti, setShowConfetti] = useState(false) // Confettis de célébration
    const [successGroupes, setSuccessGroupes] = useState([]) // Groupes réussis
    const [failedGroupes, setFailedGroupes] = useState([]) // Groupes ratés
    const router = useRouter()
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        // Charger les voix disponibles
        loadVoices()
        
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadVoices = async () => {
        try {
            const response = await fetch('/api/speech/voices')
            if (response.ok) {
                const data = await response.json()
                setAvailableVoices(data.voices || [])
            }
        } catch (error) {
            console.error('Erreur chargement voix:', error)
        }
    }

    const loadTextes = async () => {
        setIsLoadingTextes(true)
        try {
            const token = localStorage.getItem('token')
            console.log('🔍 Token présent:', !!token)
            
            const response = await fetch('/api/textes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            console.log('📡 Réponse status:', response.status)
            
            if (response.ok) {
                const data = await response.json()
                console.log('📚 Textes reçus:', data.textes)
                setTextes(data.textes || [])
            } else {
                const errorData = await response.json()
                console.error('Erreur chargement textes:', errorData)
                alert(`Erreur: ${errorData.error || 'Impossible de charger les textes'}`)
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
            alert('Erreur de connexion au serveur')
        } finally {
            setIsLoadingTextes(false)
        }
    }

    const loadGroupesForTextes = async (texteIds) => {
        try {
            const token = localStorage.getItem('token')
            const allGroupesTemp = []
            const allEnregistrementsTemp = {}

            for (const texteId of texteIds) {
                const response = await fetch(`/api/textes/get/${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    const groupes = data.groupes_sens || []
                    // Filtrer pour exclure les sauts de lignes et groupes vides
                    const groupesValides = groupes.filter(groupe =>
                        groupe.type_groupe !== 'linebreak' &&
                        groupe.contenu &&
                        groupe.contenu.trim() !== ''
                    )
                    groupesValides.forEach(groupe => {
                        allGroupesTemp.push({
                            ...groupe,
                            texte_titre: data.texte.titre,
                            texte_id: texteId
                        })
                    })

                    // Charger les enregistrements pour ce texte
                    try {
                        const enregResponse = await fetch(`/api/enregistrements/list?texte_id=${texteId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })

                        if (enregResponse.ok) {
                            const enregData = await enregResponse.json()
                            console.log(`📼 ${enregData.count || 0} enregistrement(s) chargé(s) pour texte ${texteId}`)
                            enregData.enregistrements?.forEach(enreg => {
                                allEnregistrementsTemp[enreg.groupe_sens_id] = enreg
                            })
                        }
                    } catch (enregError) {
                        console.warn('Erreur chargement enregistrements:', enregError)
                    }
                }
            }

            setEnregistrements(allEnregistrementsTemp)
            console.log(`🎵 Total enregistrements disponibles: ${Object.keys(allEnregistrementsTemp).length}`)
            return { groupes: allGroupesTemp, enregistrements: allEnregistrementsTemp }
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            return { groupes: [], enregistrements: {} }
        }
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        setIsLoadingTextes(true)
        const { groupes, enregistrements: loadedEnreg } = await loadGroupesForTextes(selectedTextes)

        if (groupes.length === 0) {
            alert('Aucun groupe de sens trouvé dans les textes sélectionnés')
            setIsLoadingTextes(false)
            return
        }

        setAllGroupes(groupes)
        
        // Mélanger les groupes si mode aléatoire
        const shuffled = orderMode === 'random' 
            ? [...groupes].sort(() => Math.random() - 0.5)
            : [...groupes]
        
        setShuffledGroupes(shuffled)
        setCurrentGroupe(shuffled[0])
        
        // Afficher les étiquettes
        const displayed = displayMode === 'random'
            ? [...groupes].sort(() => Math.random() - 0.5)
            : [...groupes]
        setDisplayedGroupes(displayed)
        
        setScore(0)
        setAttempts(0)
        setCompletedGroupes([])
        setGameStarted(true)
        setGameFinished(false)
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
        setIsLoadingTextes(false)
        
        // Lire automatiquement le premier groupe (passer les enregistrements chargés directement)
        setTimeout(() => playAudio(shuffled[0].contenu, shuffled[0], loadedEnreg), 500)
    }

    const restartGame = () => {
        setGameFinished(false)
        setGameStarted(false)
        setScore(0)
        setAttempts(0)
        setCompletedGroupes([])
        setFeedback('')
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
    }

    // Fonctions de cache optimisées
    const getCachedAudio = (text, voiceId) => {
        // Normaliser le texte pour éviter les doublons dus aux espaces/ponctuation
        const normalizedText = text.trim().toLowerCase().replace(/[^\w\s]/g, '')
        const key = `elevenlabs_${voiceId}_${btoa(normalizedText).substring(0, 50)}`
        return localStorage.getItem(key)
    }

    const setCachedAudio = (text, voiceId, audioData) => {
        try {
            const normalizedText = text.trim().toLowerCase().replace(/[^\w\s]/g, '')
            const key = `elevenlabs_${voiceId}_${btoa(normalizedText).substring(0, 50)}`
            localStorage.setItem(key, audioData)
            // Mise en cache silencieuse
        } catch (error) {
            // Erreur cache silencieuse - tenter de libérer de l'espace
            cleanOldCache()
        }
    }

    // Nettoyer le cache ancien pour libérer de l'espace
    const cleanOldCache = () => {
        try {
            const keys = Object.keys(localStorage)
            const elevenLabsKeys = keys.filter(key => key.startsWith('elevenlabs_'))

            // Supprimer les plus anciens si trop nombreux
            if (elevenLabsKeys.length > 100) {
                elevenLabsKeys.slice(0, 20).forEach(key => {
                    localStorage.removeItem(key)
                })
                // Cache nettoyé silencieusement
            }
        } catch (error) {
            // Erreur nettoyage silencieuse
        }
    }

    // Compter les audios en cache (pour debug silencieux)
    const getCacheCount = () => {
        try {
            const keys = Object.keys(localStorage)
            return keys.filter(key => key.startsWith('elevenlabs_')).length
        } catch (error) {
            return 0
        }
    }

    // Jouer un enregistrement personnel
    const playEnregistrement = async (enregistrement) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('Pas d\'enregistrement valide')
            return false
        }

        try {
            const audio = new Audio(enregistrement.audio_url)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            audio.onerror = () => {
                console.error('Erreur lecture enregistrement')
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            await audio.play()
            return true
        } catch (error) {
            console.error('Erreur playback enregistrement:', error)
            return false
        }
    }

    const playAudio = async (texte, groupe = null, enregistrementsData = null) => {
        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            return
        }

        setIsPlaying(true)

        // 1. PRIORITÉ : Enregistrement utilisateur
        const grp = groupe || shuffledGroupes.find(g => g.contenu === texte)
        const enregToUse = enregistrementsData || enregistrements
        if (grp && enregToUse[grp.id]) {
            console.log('🎵 Lecture enregistrement personnel pour groupe', grp.id)
            const success = await playEnregistrement(enregToUse[grp.id])
            if (success) return
        }

        // 2. ElevenLabs (si token disponible)
        const paulVoiceId = 'AfbuxQ9DVtS4azaxN1W7'

        try {
            const cachedAudio = getCachedAudio(texte, paulVoiceId)
            let audioData = null

            if (cachedAudio) {
                audioData = cachedAudio
            } else if (tokenStatus !== 'exhausted') {
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        text: texte,
                        voice_id: paulVoiceId
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    audioData = data.audio
                    setCachedAudio(texte, paulVoiceId, audioData)
                    setTokenStatus('available')
                } else {
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte)
                    return
                }
            } else {
                fallbackToWebSpeech(texte)
                return
            }

            const audio = new Audio(audioData)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            audio.onerror = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
                fallbackToWebSpeech(texte)
            }

            await audio.play()
            return
        } catch (error) {
            fallbackToWebSpeech(texte)
            return
        }
    }

    // Fonction fallback Web Speech optimisée
    const fallbackToWebSpeech = (texte) => {
        try {
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6 // Plus grave pour ressembler aux voix masculines

            // Chercher une voix masculine française (JAMAIS Hortense)
            const voices = window.speechSynthesis.getVoices()
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice => voice.lang.includes('fr') && !voice.name.toLowerCase().includes('hortense'))

            if (voixMasculine) {
                utterance.voice = voixMasculine
            }

            utterance.onend = () => {
                setIsPlaying(false)
            }

            utterance.onerror = () => {
                setIsPlaying(false)
            }

            window.speechSynthesis.speak(utterance)
        } catch (error) {
            // Erreur Web Speech silencieuse - juste arrêter
            setIsPlaying(false)
        }
    }

    const handleGroupeClick = (groupe) => {
        if (showNextButton || isPlaying) return // Bloquer les clics si bouton Suivant affiché ou audio en cours

        setAttempts(attempts + 1)

        if (groupe.id === currentGroupe.id) {
            // Bonne réponse
            setScore(score + 1)
            setFeedback('✅ Correct !')
            setCompletedGroupes([...completedGroupes, groupe.id])
            setSuccessGroupes([...successGroupes, currentGroupe])

            // Passer au groupe suivant après 2 secondes
            setTimeout(() => {
                setCompletedGroupes([]) // Retirer le vert
                const currentIndex = shuffledGroupes.findIndex(g => g.id === currentGroupe.id)
                if (currentIndex < shuffledGroupes.length - 1) {
                    const nextGroupe = shuffledGroupes[currentIndex + 1]
                    setCurrentGroupe(nextGroupe)
                    playAudio(nextGroupe.contenu, nextGroupe)
                    setFeedback('')
                } else {
                    // Fin du jeu
                    const finalCorrect = score + 1
                    const finalTotal = shuffledGroupes.length
                    const percentage = Math.round((finalCorrect / finalTotal) * 100)

                    setFinalScore({
                        correct: finalCorrect,
                        total: finalTotal,
                        percentage: percentage
                    })
                    setGameStarted(false)
                    setGameFinished(true)
                    setFeedback('')

                    // Confettis si score parfait (100%)
                    if (percentage === 100) {
                        setShowConfetti(true)
                        setTimeout(() => setShowConfetti(false), 5000)
                    }
                }
            }, 2000)
        } else {
            // Mauvaise réponse
            setWrongGroupeId(groupe.id) // Marquer en rouge

            // Ajouter aux groupes ratés (seulement si pas déjà présent)
            if (!failedGroupes.find(g => g.id === currentGroupe.id)) {
                setFailedGroupes([...failedGroupes, currentGroupe])
            }

            if (isMobile) {
                // Mobile : passage automatique après 5 secondes
                setTimeout(() => {
                    handleNext()
                }, 5000)
            } else {
                // Desktop : afficher bouton Suivant
                setShowNextButton(true)
            }
        }
    }

    const handleNext = () => {
        setWrongGroupeId(null)
        setShowNextButton(false)
        setFeedback('')

        const currentIndex = shuffledGroupes.findIndex(g => g.id === currentGroupe.id)
        if (currentIndex < shuffledGroupes.length - 1) {
            const nextGroupe = shuffledGroupes[currentIndex + 1]
            setCurrentGroupe(nextGroupe)
            playAudio(nextGroupe.contenu, nextGroupe)
        } else {
            // Fin du jeu
            const finalTotal = shuffledGroupes.length
            const percentage = Math.round((score / finalTotal) * 100)

            setFinalScore({
                correct: score,
                total: finalTotal,
                percentage: percentage
            })
            setGameStarted(false)
            setGameFinished(true)

            // Confettis si score parfait (100%)
            if (percentage === 100) {
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 5000)
            }
        }
    }

    const resetGame = () => {
        setGameStarted(false)
        setSelectedTextes([])
        setAllGroupes([])
        setCurrentGroupe(null)
        setShuffledGroupes([])
        setDisplayedGroupes([])
        setScore(0)
        setAttempts(0)
        setFeedback('')
        setCompletedGroupes([])
        setSuccessGroupes([])
        setFailedGroupes([])
        setWrongGroupeId(null)
        setShowNextButton(false)
        setShowConfetti(false)
        setGameFinished(false)
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }
        setIsPlaying(false)
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

    // ÉCRAN DE RÉSULTATS (page séparée)
    if (gameFinished) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        textAlign: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>
                            {finalScore.percentage === 100 ? '🎉' :
                             finalScore.percentage >= 80 ? '😊' :
                             finalScore.percentage >= 60 ? '👏' : '💪'}
                        </span>
                        <span style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Résultats
                        </span>
                    </h1>

                    {/* Navigation icônes */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            📖
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#8b5cf6',
                                border: '2px solid #8b5cf6',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            🏠
                        </button>
                        <button
                            onClick={restartGame}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            🔄
                        </button>
                    </div>

                    {/* Score */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
                            {finalScore.correct}/{finalScore.total}
                        </div>
                    </div>

                    {/* Groupes réussis */}
                    {successGroupes.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '15px'
                            }}>
                                {successGroupes.map((groupe, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '12px 20px',
                                            background: '#d1fae5',
                                            border: '2px solid #10b981',
                                            borderRadius: '12px',
                                            color: '#10b981',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {groupe.contenu}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Groupes ratés */}
                    {failedGroupes.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#ef4444',
                                marginBottom: '15px',
                                textAlign: 'center'
                            }}>
                                Groupes à revoir ({failedGroupes.length})
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '15px'
                            }}>
                                {failedGroupes.map((groupe, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '12px 20px',
                                            background: '#fee2e2',
                                            border: '2px solid #ef4444',
                                            borderRadius: '12px',
                                            color: '#ef4444',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {groupe.contenu}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confettis de célébration */}
                    {showConfetti && (
                        <>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                    @keyframes confetti-fall {
                                        0% {
                                            transform: translateY(0) rotate(0deg);
                                            opacity: 1;
                                        }
                                        100% {
                                            transform: translateY(100vh) rotate(720deg);
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
                                    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
                                    const duration = 3 + Math.random() * 2
                                    const delay = Math.random() * 0.5
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                top: '-20px',
                                                left: `${Math.random() * 100}%`,
                                                width: '15px',
                                                height: '15px',
                                                backgroundColor: colors[Math.floor(Math.random() * 6)],
                                                opacity: 1,
                                                borderRadius: '50%',
                                                animation: `confetti-fall ${duration}s linear forwards`,
                                                animationDelay: `${delay}s`,
                                                zIndex: 10000
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    // PAGE PRINCIPALE (sélection textes ou jeu)
    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>🎯</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Où est-ce ?
                    </span>
                </h1>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    {gameStarted && (
                        <button
                            onClick={() => {
                                setSelectedTexte(null)
                                setGameStarted(false)
                                setGameFinished(false)
                            }}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: '#64748b',
                                border: '2px solid #64748b',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ←
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#8b5cf6',
                            border: '2px solid #8b5cf6',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                    {gameStarted && currentGroupe && (
                        <button
                            onClick={() => playAudio(currentGroupe.contenu, currentGroupe)}
                            disabled={isPlaying}
                            style={{
                                width: '55px',
                                height: '55px',
                                backgroundColor: 'white',
                                color: isPlaying ? '#f59e0b' : '#3b82f6',
                                border: `2px solid ${isPlaying ? '#f59e0b' : '#3b82f6'}`,
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: isPlaying ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isPlaying ? 0.7 : 1
                            }}
                        >
                            🔊
                        </button>
                    )}
                </div>

                {!gameStarted ? (
                    <>
                        {/* Options de jeu - masquées mais fonctionnelles */}
                        <div style={{ display: 'none' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                    Ordre de lecture:
                                </label>
                                <select
                                    value={orderMode}
                                    onChange={(e) => setOrderMode(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
                                    }}
                                >
                                    <option value="random">Aléatoire</option>
                                    <option value="sequential">Séquentiel</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                    Affichage étiquettes:
                                </label>
                                <select
                                    value={displayMode}
                                    onChange={(e) => setDisplayMode(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
                                    }}
                                >
                                    <option value="random">Mélangé</option>
                                    <option value="sequential">Dans l'ordre</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                    Voix:
                                </label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd'
                                    }}
                                >
                                    <option value="VOIX_PERSONNALISEE">🎵 Voix personnalisée ⭐</option>
                                    {availableVoices.map(voice => (
                                        <option key={voice.voice_id} value={voice.voice_id}>
                                            {voice.name} {voice.recommended ? '⭐' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sélection des textes */}
                        {!isMobile && <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>📚 Sélectionner les textes</h3>}

                        {isLoadingTextes ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                fontSize: '16px',
                                color: '#666'
                            }}>
                                Chargement des textes...
                            </div>
                        ) : textes.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                borderRadius: '20px',
                                border: '2px dashed #0ea5e9',
                                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.1)'
                            }}>
                                <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                                    Aucun texte disponible
                                </p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gap: '15px',
                                marginBottom: '20px'
                            }}>
                                {textes.map((texte, index) => {
                                    const couleurs = [
                                        { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(240, 147, 251, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79, 172, 254, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', shadow: 'rgba(250, 112, 154, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', shadow: 'rgba(168, 237, 234, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', shadow: 'rgba(255, 154, 158, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', shadow: 'rgba(255, 236, 210, 0.3)' }
                                    ]
                                    const couleur = couleurs[index % couleurs.length]

                                    return (
                                        <div
                                            key={texte.id}
                                            onClick={() => {
                                                if (selectedTextes.includes(texte.id)) {
                                                    setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                                } else {
                                                    setSelectedTextes([...selectedTextes, texte.id])
                                                }
                                            }}
                                            style={{
                                                background: couleur.bg,
                                                border: selectedTextes.includes(texte.id) ? '3px solid #10b981' : 'none',
                                                borderRadius: '20px',
                                                padding: isMobile ? '10px 15px' : '15px',
                                                boxShadow: selectedTextes.includes(texte.id)
                                                    ? `0 8px 25px ${couleur.shadow}, 0 0 0 3px #10b981`
                                                    : `0 4px 15px ${couleur.shadow}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                transform: selectedTextes.includes(texte.id) ? 'scale(1.02)' : 'scale(1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            {/* Checkbox PC uniquement */}
                                            {!isMobile && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTextes.includes(texte.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation()
                                                        if (e.target.checked) {
                                                            setSelectedTextes([...selectedTextes, texte.id])
                                                        } else {
                                                            setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                                        }
                                                    }}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                        accentColor: '#10b981'
                                                    }}
                                                />
                                            )}

                                            {/* Contenu : titre + stats (PC) ou titre seul (mobile) */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: isMobile ? 'center' : 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                                gap: '10px'
                                            }}>
                                                <div style={{
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '16px',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    flex: '1',
                                                    textAlign: isMobile ? 'center' : 'left',
                                                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                                                    overflow: isMobile ? 'hidden' : 'visible',
                                                    textOverflow: isMobile ? 'ellipsis' : 'clip'
                                                }}>
                                                    {texte.titre}
                                                </div>
                                                {!isMobile && (
                                                    <div style={{
                                                        color: 'rgba(255,255,255,0.9)',
                                                        fontSize: '12px',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        📊 {texte.nombre_groupes} groupes de sens
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Bouton démarrer */}
                        <button
                            onClick={startGame}
                            disabled={selectedTextes.length === 0}
                            style={{
                                background: 'white',
                                color: selectedTextes.length > 0 ? '#10b981' : '#ccc',
                                padding: '15px 30px',
                                border: selectedTextes.length > 0 ? '2px solid #10b981' : '2px solid #ccc',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'normal',
                                cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
                                marginTop: '20px',
                                width: '100%',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Commencer
                        </button>
                    </>
                ) : (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
                            marginBottom: '20px'
                        }}>
                            {/* Score et progression - masqué sur mobile */}
                            <div className="desktop-only" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                                fontSize: '16px'
                            }}>
                                <span>📊 Score: {score}/{attempts}</span>
                                <span>📝 Progression: {completedGroupes.length}/{shuffledGroupes.length}</span>
                            </div>

                            {/* Feedback */}
                            {feedback && (
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    color: feedback.includes('✅') ? '#10b981' :
                                           feedback.includes('🎉') ? '#8b5cf6' : '#ef4444'
                                }}>
                                    {feedback}
                                </div>
                            )}

                            {/* Étiquettes des groupes de sens */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '15px',
                                marginTop: '20px'
                            }}>
                                {displayedGroupes.map(groupe => (
                                    <button
                                        key={groupe.id}
                                        onClick={() => handleGroupeClick(groupe)}
                                        disabled={completedGroupes.includes(groupe.id) || isPlaying}
                                        style={{
                                            padding: '12px 20px',
                                            background: wrongGroupeId === groupe.id ? '#fee2e2' :
                                                        (completedGroupes.includes(groupe.id) || (wrongGroupeId && groupe.id === currentGroupe.id)) ? '#d1fae5' : 'white',
                                            border: '2px solid',
                                            borderColor: wrongGroupeId === groupe.id ? '#ef4444' :
                                                         (completedGroupes.includes(groupe.id) || (wrongGroupeId && groupe.id === currentGroupe.id)) ? '#10b981' : '#06b6d4',
                                            borderRadius: '12px',
                                            color: wrongGroupeId === groupe.id ? '#ef4444' :
                                                   (completedGroupes.includes(groupe.id) || (wrongGroupeId && groupe.id === currentGroupe.id)) ? '#10b981' : '#06b6d4',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            cursor: completedGroupes.includes(groupe.id) || showNextButton || isPlaying ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s',
                                            opacity: completedGroupes.includes(groupe.id) || isPlaying ? 0.6 : 1,
                                            textAlign: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!completedGroupes.includes(groupe.id) && !showNextButton && !isPlaying) {
                                                e.target.style.transform = 'scale(1.05)'
                                                e.target.style.boxShadow = '0 4px 6px rgba(6, 182, 212, 0.3)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'scale(1)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    >
                                        {groupe.contenu}
                                    </button>
                                ))}
                            </div>

                            {/* Bouton Suivant en dessous des groupes (Desktop uniquement) */}
                            {!isMobile && showNextButton && (
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                    <button
                                        onClick={handleNext}
                                        style={{
                                            backgroundColor: 'white',
                                            color: '#3b82f6',
                                            padding: '12px 30px',
                                            border: '2px solid #3b82f6',
                                            borderRadius: '12px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                        }}
                                    >
                                        Suivant →
                                    </button>
                                </div>
                            )}
                        </div>

                    </>
                )}

                {/* Confettis de célébration */}
                {showConfetti && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @keyframes confetti-fall {
                                    0% {
                                        transform: translateY(0) rotate(0deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translateY(100vh) rotate(720deg);
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
                                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
                                const duration = 3 + Math.random() * 2
                                const delay = Math.random() * 0.5
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            top: '-20px',
                                            left: `${Math.random() * 100}%`,
                                            width: '15px',
                                            height: '15px',
                                            backgroundColor: colors[Math.floor(Math.random() * 6)],
                                            opacity: 1,
                                            borderRadius: '50%',
                                            animation: `confetti-fall ${duration}s linear forwards`,
                                            animationDelay: `${delay}s`,
                                            zIndex: 10000
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
