import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesTranquille() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoadingAudio, setIsLoadingAudio] = useState(false)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [tokenStatus, setTokenStatus] = useState('unknown')
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [phrasesReussies, setPhrasesReussies] = useState([])
    const [phrasesARevoir, setPhrasesARevoir] = useState([])
    const [texteIds, setTexteIds] = useState('')
    const [loadingError, setLoadingError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [loadingStep, setLoadingStep] = useState('') // Étape de chargement
    const [loadingTimeout, setLoadingTimeout] = useState(false) // Timeout dépassé

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // États pour le mode karaoké
    const [modeKaraoke, setModeKaraoke] = useState(false)
    const [motIllumineIndex, setMotIllumineIndex] = useState(-1)
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [karaokeTermine, setKaraokeTermine] = useState(false)

    // Détection mobile
    const [isMobile, setIsMobile] = useState(false)

    const router = useRouter()

    // Détection mobile avec listener de redimensionnement
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
                setTexteIds(router.query.texte_ids)

                // Timeout de sécurité 30 secondes
                const timeoutId = setTimeout(() => {
                    setLoadingTimeout(true)
                    console.warn('⏱️ Timeout chargement dépassé (30s)')
                }, 30000)

                try {
                    setLoadingStep('Chargement des phrases...')
                    await chargerPhrases(router.query.texte_ids)

                    setLoadingStep('Chargement des enregistrements...')
                    await loadEnregistrements()

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
                setLoadingError(null)  // Réinitialiser l'erreur

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

                // Logger les stats OpenRouter dans la console
                if (data.openrouter_stats) {
                    const { remaining, limit } = data.openrouter_stats
                    console.log(`📊 Stats OpenRouter: ${remaining}/${limit} requêtes restantes`)
                }
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
            setLoadingError('Erreur de connexion. Veuillez réessayer.')
            setEtape('intro')
        }
    }

    // Charger les enregistrements vocaux personnalisés
    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-mots/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log(`🎤 ${data.count} enregistrement(s) vocal(aux) chargé(s)`)

                // ⚠️ IMPORTANT: Normaliser les clés pour correspondre à playAudio()
                const mapNormalise = {}
                Object.entries(data.enregistrementsMap || {}).forEach(([mot, enreg]) => {
                    const motNormalise = mot
                        .toLowerCase()
                        .trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    mapNormalise[motNormalise] = enreg
                })

                console.log('📋 Enregistrements normalisés:', Object.keys(mapNormalise))
                setEnregistrementsMap(mapNormalise)
            } else {
                console.error('Erreur chargement enregistrements vocaux')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
    }

    // ========================================================
    // SYSTÈME AUDIO AVEC CACHE ET PRIORITÉS
    // ========================================================

    // Gestion du cache ElevenLabs dans localStorage
    const getCachedAudio = (text, voiceId) => {
        const normalizedText = text.trim().toLowerCase().replace(/[^\w\s]/g, '')
        const key = `elevenlabs_${voiceId}_${btoa(normalizedText).substring(0, 50)}`
        return localStorage.getItem(key)
    }

    const setCachedAudio = (text, voiceId, audioData) => {
        try {
            const normalizedText = text.trim().toLowerCase().replace(/[^\w\s]/g, '')
            const key = `elevenlabs_${voiceId}_${btoa(normalizedText).substring(0, 50)}`
            localStorage.setItem(key, audioData)
        } catch (error) {
            cleanOldCache()
        }
    }

    const cleanOldCache = () => {
        try {
            const keys = Object.keys(localStorage)
            const elevenLabsKeys = keys.filter(key => key.startsWith('elevenlabs_'))
            if (elevenLabsKeys.length > 100) {
                elevenLabsKeys.slice(0, 20).forEach(key => {
                    localStorage.removeItem(key)
                })
            }
        } catch (error) {
            console.error('Erreur nettoyage cache:', error)
        }
    }

    // PRIORITÉ 3 : Web Speech API (Paul/Julie, PAS Hortense)
    const fallbackToWebSpeech = (texte, onEnded = null) => {
        try {
            const utterance = new SpeechSynthesisUtterance(`Le mot est : ${texte}`)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6

            const voices = window.speechSynthesis.getVoices()
            // Exclure explicitement Hortense et chercher une voix masculine
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense')
            )

            if (voixMasculine) {
                utterance.voice = voixMasculine
            }

            utterance.onend = () => {
                setIsPlaying(false)
                setIsLoadingAudio(false)
                if (onEnded) onEnded()
            }

            utterance.onerror = () => {
                setIsPlaying(false)
                setIsLoadingAudio(false)
            }

            window.speechSynthesis.speak(utterance)
        } catch (error) {
            setIsPlaying(false)
            setIsLoadingAudio(false)
        }
    }

    // PRIORITÉ 1 : Enregistrement personnel
    const playEnregistrement = async (enregistrement, onEnded = null) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('⚠️ Enregistrement invalide')
            setIsLoadingAudio(false)
            return false
        }

        try {
            console.log('🎵 Lecture enregistrement personnel:', enregistrement.mot)
            const audio = new Audio(enregistrement.audio_url)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setIsLoadingAudio(false)
                setCurrentAudio(null)
                if (onEnded) onEnded()
            }

            audio.onerror = (err) => {
                console.error('Erreur lecture audio:', err)
                setIsPlaying(false)
                setIsLoadingAudio(false)
                setCurrentAudio(null)
                return false
            }

            await audio.play()
            return true
        } catch (error) {
            console.error('Erreur playEnregistrement:', error)
            setIsLoadingAudio(false)
            return false
        }
    }

    // Fonction principale de lecture audio avec verrou et priorités
    const playAudio = async (texte, onEnded = null) => {
        // ⭐ VERROU - Empêcher appels multiples pendant chargement
        if (isLoadingAudio) {
            console.log('⏸️ Audio déjà en cours de chargement, requête ignorée')
            return
        }

        setIsLoadingAudio(true)

        // ⭐ NETTOYAGE INCONDITIONNEL - Arrêter TOUT son en cours
        if (currentAudio) {
            currentAudio.pause()
            currentAudio.currentTime = 0
            setCurrentAudio(null)
        }
        window.speechSynthesis.cancel()

        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            setIsLoadingAudio(false)
            return
        }

        setIsPlaying(true)

        try {
            // Normaliser le mot pour chercher dans enregistrementsMap (garder apostrophes internes)
            const motNormalise = texte
                .toLowerCase()
                .trim()
                .replace(/^[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+/, '')
                .replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+$/, '')

            console.log(`🔍 Recherche enregistrement pour "${motNormalise}"`)

            // ========================================================
            // PRIORITÉ 1 : VOIX PERSONNALISÉE
            // ========================================================
            if (enregistrementsMap[motNormalise]) {
                console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
                const success = await playEnregistrement(enregistrementsMap[motNormalise], onEnded)
                if (success) {
                    return
                }
                console.log('⚠️ Échec enregistrement personnel, fallback ElevenLabs')
            }

            // ========================================================
            // PRIORITÉ 2 : ELEVENLABS AVEC CACHE
            // ========================================================
            const cachedAudio = getCachedAudio(texte, selectedVoice)
            let audioData = null

            if (cachedAudio) {
                audioData = cachedAudio
            } else if (tokenStatus !== 'exhausted') {
                try {
                    const token = localStorage.getItem('token')
                    const response = await fetch('/api/speech/elevenlabs', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text: `Le mot est : ${texte}`,
                            voice_id: selectedVoice
                        })
                    })

                    if (response.ok) {
                        const data = await response.json()
                        audioData = data.audio
                        setCachedAudio(texte, selectedVoice, audioData)
                        setTokenStatus('available')
                    } else {
                        setTokenStatus('exhausted')
                        fallbackToWebSpeech(texte, onEnded)
                        return
                    }
                } catch (error) {
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte, onEnded)
                    return
                }
            } else {
                // ========================================================
                // PRIORITÉ 3 : WEB SPEECH API (Paul/Julie, PAS Hortense)
                // ========================================================
                fallbackToWebSpeech(texte, onEnded)
                return
            }

            // Lecture audio ElevenLabs
            if (audioData) {
                const audio = new Audio(audioData)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(false)
                    setIsLoadingAudio(false)
                    setCurrentAudio(null)
                    if (onEnded) onEnded()
                }

                audio.onerror = () => {
                    setIsPlaying(false)
                    setIsLoadingAudio(false)
                    setCurrentAudio(null)
                    fallbackToWebSpeech(texte, onEnded)
                }

                await audio.play()
            }
        } catch (error) {
            console.error('Erreur playAudio:', error)
            setIsPlaying(false)
            setIsLoadingAudio(false)
            fallbackToWebSpeech(texte, onEnded)
        }
    }

    // Mode karaoké : lecture séquentielle avec illumination
    const demarrerKaraoke = () => {
        if (!phraseActuelle) return

        setModeKaraoke(true)
        setKaraokeTermine(false)

        // Filtrer les mots (supprimer ponctuation isolée)
        const mots = phraseActuelle.texte
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) {
                // Fin du karaoké
                setMotIllumineIndex(-1)

                // Gestion selon type d'appareil
                if (isMobile) {
                    // Mobile : passage automatique après 3 secondes
                    setTimeout(() => {
                        setModeKaraoke(false)
                        setKaraokeTermine(false)
                        passerPhrase() // Passe à la phrase suivante (phrase à revoir)
                    }, 3000)
                } else {
                    // Desktop : afficher l'icône flèche pour passer à la phrase suivante
                    setModeKaraoke(false)
                    setKaraokeTermine(true)
                }
                return
            }

            setMotIllumineIndex(index)

            const onAudioEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300) // Délai entre mots
            }

            playAudio(mots[index], onAudioEnded)
        }

        lireMotSuivant()
    }

    const phraseReussie = () => {
        setScore(score + 1)
        setPhrasesReussies([...phrasesReussies, phraseActuelle.texte])

        // Passer à la phrase suivante
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setModeKaraoke(false)
            setKaraokeTermine(false)
        } else {
            // Fin du jeu
            setEtape('resultats')
        }
    }

    const passerPhrase = () => {
        // Passer à la phrase suivante sans compter le point
        setPhrasesARevoir([...phrasesARevoir, phraseActuelle.texte])

        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setModeKaraoke(false)
            setKaraokeTermine(false)
        } else {
            // Fin du jeu
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
                            color: '#10b981',
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
                                backgroundColor: '#10b981',
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
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Titre + icônes de navigation */}
                    <h1 style={{
                        fontSize: isMobile ? '20px' : '28px',
                        fontWeight: 'bold',
                        color: '#14b8a6',
                        textAlign: 'center',
                        marginBottom: isMobile ? '10px' : '15px'
                    }}>
                        📊 Résultats
                    </h1>

                    {/* Barre d'icônes */}
                    <div style={{
                        display: 'flex',
                        gap: isMobile ? '8px' : '10px',
                        justifyContent: 'center',
                        marginBottom: isMobile ? '15px' : '20px'
                    }}>
                        <button
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${texteIds}`)}
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
                                const token = localStorage.getItem('token')
                                const texteIdsArray = texteIds.split(',').map(Number)

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

                                    if (data.openrouter_stats) {
                                        const { remaining, limit } = data.openrouter_stats
                                        console.log(`📊 Stats OpenRouter: ${remaining}/${limit} requêtes restantes`)
                                    }

                                    setPhrases(data.phrases)
                                    setPhraseActuelle(data.phrases[0])
                                    setScore(0)
                                    setPhraseIndex(0)
                                    setPhrasesReussies([])
                                    setPhrasesARevoir([])
                                    setEtape('exercice')
                                }
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #14b8a6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                            title="Recommencer"
                        >
                            🔄
                        </button>
                    </div>

                    {/* Score */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            fontSize: isMobile ? '24px' : '32px',
                            fontWeight: 'bold',
                            color: '#14b8a6'
                        }}>
                            {score}/{phrases.length} phrases lues
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
                                            padding: '8px 12px',
                                            background: '#f0fdf4',
                                            border: '2px solid #10b981',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '13px' : '15px',
                                            color: '#333',
                                            textAlign: 'center',
                                            maxWidth: '600px',
                                            width: '100%'
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
                        <div style={{ marginBottom: '20px' }}>
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
                                            padding: '8px 12px',
                                            background: '#fffbeb',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '13px' : '15px',
                                            color: '#333',
                                            textAlign: 'center',
                                            maxWidth: '600px',
                                            width: '100%'
                                        }}
                                    >
                                        {idx + 1}. {phrase}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Canvas confettis si score parfait */}
                    {showConfetti && score === phrases.length && (
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
                                width: '100vw',
                                height: '100vh',
                                pointerEvents: 'none',
                                zIndex: 9999,
                                overflow: 'hidden'
                            }}>
                                {[...Array(50)].map((_, i) => {
                                    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
                                    const duration = 2 + Math.random() * 2
                                    const delay = Math.random() * 0.5
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                left: `${Math.random() * 100}%`,
                                                width: '10px',
                                                height: '10px',
                                                backgroundColor: colors[Math.floor(Math.random() * 6)],
                                                opacity: 0.8,
                                                borderRadius: '50%',
                                                animation: `confetti-fall ${duration}s linear forwards`,
                                                animationDelay: `${delay}s`
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: isMobile ? '20px' : '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    textAlign: 'center',
                    marginBottom: '15px'
                }}>
                    😌 Mode Tranquille
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

                {/* Phrase et Score */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '12px' : '15px',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 'bold',
                    color: '#64748b'
                }}>
                    <div>Phrase {phraseIndex + 1}/{phrases.length}</div>
                    <div>Score: {score}</div>
                </div>

                {/* Barre d'icônes de navigation */}
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '10px',
                    justifyContent: 'center',
                    marginBottom: isMobile ? '12px' : '20px'
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
                        onClick={() => router.push(`/lire/reconnaitre-les-mots?etape=selection`)}
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
                    {karaokeTermine && !isMobile && (
                        <button
                            onClick={() => {
                                setKaraokeTermine(false)
                                passerPhrase()
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #f59e0b',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Phrase suivante"
                        >
                            →
                        </button>
                    )}
                </div>

                {/* Consigne */}
                <p style={{
                    marginTop: '20px',
                    marginBottom: '20px',
                    color: '#666',
                    fontSize: isMobile ? '14px' : '16px',
                    opacity: 0.8,
                    textAlign: 'center',
                    maxWidth: '800px',
                    margin: '20px auto'
                }}>
                    Lisez la phrase, écoutez-la, puis cliquez "J'ai réussi !" ou "C'est difficile !"
                </p>

                {/* La phrase */}
                <div style={{
                    fontSize: isMobile ? '24px' : '32px',
                    fontWeight: 'bold',
                    color: '#333',
                    lineHeight: '1.5',
                    padding: '30px',
                    background: '#f0fdf4',
                    borderRadius: '15px',
                    border: '3px solid #10b981',
                    maxWidth: '800px',
                    margin: '60px auto 40px auto',
                    textAlign: 'center'
                }}>
                    {modeKaraoke ? (
                        // Mode karaoké : affichage mot par mot avec illumination
                        phraseActuelle.texte
                            .trim()
                            .split(/\s+/)
                            .filter(mot => mot && mot.trim().length > 0)
                            .map((mot, index) => (
                                <span
                                    key={index}
                                    style={{
                                        backgroundColor: motIllumineIndex === index ? '#fef08a' : 'transparent',
                                        transform: motIllumineIndex === index ? 'scale(1.2)' : 'scale(1)',
                                        fontWeight: motIllumineIndex === index ? 'bold' : 'normal',
                                        display: 'inline-block',
                                        marginRight: '8px',
                                        transition: 'all 0.2s',
                                        padding: '2px 4px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {mot}
                                </span>
                            ))
                    ) : (
                        // Mode normal : affichage simple
                        phraseActuelle.texte
                    )}
                </div>

                {/* Boutons d'action */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '20px',
                    maxWidth: '800px',
                    margin: '0 auto 20px auto'
                }}>
                    <button
                        onClick={phraseReussie}
                        style={{
                            backgroundColor: 'white',
                            color: '#10b981',
                            padding: isMobile ? '12px 24px' : '15px 30px',
                            border: '3px solid #10b981',
                            borderRadius: '8px',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flex: isMobile ? '1 1 100%' : '1 1 45%'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f0fdf4'
                            e.target.style.transform = 'scale(1.05)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white'
                            e.target.style.transform = 'scale(1)'
                        }}
                    >
                        J'ai réussi à lire !
                    </button>

                    <button
                        onClick={demarrerKaraoke}
                        style={{
                            backgroundColor: 'white',
                            color: '#f97316',
                            padding: isMobile ? '12px 24px' : '15px 30px',
                            border: '3px solid #f97316',
                            borderRadius: '8px',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flex: isMobile ? '1 1 100%' : '1 1 45%'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#fff7ed'
                            e.target.style.transform = 'scale(1.05)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white'
                            e.target.style.transform = 'scale(1)'
                        }}
                    >
                        C'est difficile
                    </button>
                </div>
            </div>
        </div>
    )
}
