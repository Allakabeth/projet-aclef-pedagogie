import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

// Styles pour masquer les éléments sur mobile
const mobileStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }
`

export default function EcouteEtTrouve() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTexteIds, setSelectedTexteIds] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [allMots, setAllMots] = useState([])
    const [currentMot, setCurrentMot] = useState(null)
    const [shuffledMots, setShuffledMots] = useState([])
    const [displayedMots, setDisplayedMots] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [nbChoix, setNbChoix] = useState(8) // Nombre de mots affichés (4-12)
    const [visualFeedback, setVisualFeedback] = useState({
        clickedMotId: null,
        correctMotId: null,
        isCorrect: null
    })
    const [completedMots, setCompletedMots] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [availableVoices, setAvailableVoices] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
    const [tokenStatus, setTokenStatus] = useState('unknown') // 'available', 'exhausted', 'unknown'
    const [isMobile, setIsMobile] = useState(false)
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Enregistrements personnels indexés par mot
    const [resultats, setResultats] = useState({ reussis: [], rates: [] }) // Mots réussis et ratés
    const [showConfetti, setShowConfetti] = useState(false) // Effet de célébration
    const [showIntro, setShowIntro] = useState(true) // Page d'intro avant le jeu
    const router = useRouter()

    useEffect(() => {
        // Détecter si mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        checkAuth()
    }, [router.query])

    // Célébration pour score parfait
    useEffect(() => {
        if (gameFinished && finalScore.total > 0 && finalScore.correct === finalScore.total) {
            // Lancer la célébration
            setShowConfetti(true)

            // Jouer le son d'applaudissements immédiatement
            const audio = new Audio('/sounds/clapping.mp3')
            audio.play().catch(err => console.log('Erreur lecture son:', err))

            // Arrêter confettis après 3 secondes
            const timerConfetti = setTimeout(() => {
                setShowConfetti(false)
            }, 3000)

            return () => {
                clearTimeout(timerConfetti)
            }
        }
    }, [gameFinished, finalScore])

    const checkAuth = async () => {
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
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        // Récupérer les textes sélectionnés depuis les query params
        if (router.query.texte_ids) {
            const texteIds = router.query.texte_ids.split(',').map(id => parseInt(id))
            setSelectedTexteIds(texteIds)
        }

        // Charger les enregistrements personnels
        await loadEnregistrements()

        setIsLoading(false)
    }

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
                console.log('📋 Enregistrements chargés:', Object.keys(data.enregistrementsMap || {}))
                setEnregistrementsMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements vocaux')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
    }

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

    const loadMotsForTextes = async (texteIds) => {
        try {
            const { data, error: err } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', texteIds)
                .order('texte_reference_id', { ascending: true })
                .order('ordre_groupe', { ascending: true })

            if (err) {
                console.error('Erreur chargement groupes:', err)
                return []
            }

            // Fonction pour nettoyer un mot de la ponctuation (mais garder les tirets des mots composés)
            const cleanWord = (word) => {
                return word
                    .trim()
                    // Supprimer ponctuation au début et à la fin uniquement
                    .replace(/^[.,;:!?'"()\[\]{}…«»—–-]+/, '')
                    .replace(/[.,;:!?'"()\[\]{}…«»—–-]+$/, '')
                    .replace(/\s+/g, ' ') // Normalise les espaces multiples
                    .trim()
            }

            // Utiliser Map pour déduplication efficace
            const motsMap = new Map()
            let idCounter = 1;

            (data || []).forEach(groupe => {
                const motsGroupe = groupe.contenu
                    .trim()
                    .split(/\s+/)
                    .filter(mot => mot && mot.trim().length > 0)

                motsGroupe.forEach(mot => {
                    const cleaned = cleanWord(mot)
                    const cleanedLower = cleaned.toLowerCase()

                    // Ignorer si vide après nettoyage ou juste de la ponctuation
                    if (!cleanedLower || cleanedLower.length === 0) {
                        return
                    }

                    if (!motsMap.has(cleanedLower)) {
                        // Première occurrence : ajouter avec le mot nettoyé
                        motsMap.set(cleanedLower, {
                            id: idCounter++,
                            mot: cleaned, // Mot SANS ponctuation
                            texte_id: groupe.texte_reference_id
                        })
                    } else {
                        // Doublon détecté : ignorer et logger
                        console.log(`❌ Mot en double ignoré : "${mot}" (déjà présent comme "${motsMap.get(cleanedLower).mot}")`)
                    }
                })
            })

            const mots = Array.from(motsMap.values())
            console.log(`✅ ${mots.length} mots uniques chargés depuis ${data?.length || 0} groupes (après déduplication)`)
            return mots

        } catch (error) {
            console.error('Erreur chargement mots:', error)
            return []
        }
    }

    // Mélange Fisher-Yates (vrai hasard)
    const shuffleFisherYates = (array) => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    const startGame = async () => {
        if (selectedTexteIds.length === 0) {
            alert('Aucun texte sélectionné')
            return
        }

        setShowIntro(false) // Masquer la page d'intro
        setIsLoadingTextes(true)
        // Charger les mots des textes sélectionnés depuis la page précédente
        const mots = await loadMotsForTextes(selectedTexteIds)

        if (mots.length === 0) {
            alert('Aucun mot trouvé dans les textes sélectionnés')
            setIsLoadingTextes(false)
            return
        }

        // Vérifier qu'on a assez de mots pour le nombre de choix
        if (mots.length < nbChoix) {
            alert(`Pas assez de mots ! Il faut au moins ${nbChoix} mots. Vous n'avez que ${mots.length} mots.`)
            setIsLoadingTextes(false)
            return
        }

        setAllMots(mots)

        // Mélanger les mots avec Fisher-Yates (toujours aléatoire)
        const shuffled = shuffleFisherYates(mots)

        setShuffledMots(shuffled)
        setCurrentMot(shuffled[0])

        // Afficher les premiers choix
        updateDisplayedMots(shuffled[0], mots)

        setScore(0)
        setAttempts(0)
        setCompletedMots([])
        setGameStarted(true)
        setGameFinished(false)
        setFinalScore({ correct: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })
        setIsLoadingTextes(false)

        // Lire automatiquement le premier mot
        setTimeout(() => playAudio(shuffled[0].mot), 500)
    }

    const updateDisplayedMots = (motCourant, tousLesMots) => {
        // Créer un array avec le mot courant + (nbChoix - 1) autres mots aléatoires
        const autresMots = tousLesMots.filter(m => m.id !== motCourant.id)
        const autresMelanges = shuffleFisherYates(autresMots)
        const motsAleatoires = autresMelanges.slice(0, nbChoix - 1)

        // Ajouter le mot courant et mélanger (toujours en mode aléatoire)
        const choix = [motCourant, ...motsAleatoires]
        const displayed = shuffleFisherYates(choix)

        setDisplayedMots(displayed)
    }

    const restartGame = () => {
        setGameFinished(false)
        setGameStarted(false)
        setShowIntro(true) // Retourner à la page d'intro
        setScore(0)
        setAttempts(0)
        setCompletedMots([])
        setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
        setFinalScore({ correct: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })
    }

    // Fonctions de cache optimisées
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
            // Erreur nettoyage silencieuse
        }
    }

    const playAudio = async (texte) => {
        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            return
        }

        setIsPlaying(true)

        try {
            // Normaliser le mot pour chercher dans enregistrementsMap
            const motNormalise = texte
                .toLowerCase()
                .trim()
                .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')  // Ponctuation au début
                .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')  // Ponctuation à la fin

            console.log(`🔍 Recherche enregistrement pour "${motNormalise}"`)
            console.log(`🔍 Contient "${motNormalise}"?`, motNormalise in enregistrementsMap)

            // ========================================================
            // PRIORITÉ 1 : VOIX PERSONNALISÉE
            // ========================================================
            if (enregistrementsMap[motNormalise]) {
                console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
                console.log(`🎵 URL:`, enregistrementsMap[motNormalise].audio_url)
                const success = await playEnregistrement(enregistrementsMap[motNormalise])
                if (success) return // Succès, on s'arrête là
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
                            text: texte,
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
                        fallbackToWebSpeech(texte)
                        return
                    }
                } catch (error) {
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte)
                    return
                }
            } else {
                // ========================================================
                // PRIORITÉ 3 : WEB SPEECH API (Paul/Julie, PAS Hortense)
                // ========================================================
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

        } catch (error) {
            fallbackToWebSpeech(texte)
        }
    }

    const fallbackToWebSpeech = (texte) => {
        try {
            const utterance = new SpeechSynthesisUtterance(texte)
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
            }

            utterance.onerror = () => {
                setIsPlaying(false)
            }

            window.speechSynthesis.speak(utterance)
        } catch (error) {
            setIsPlaying(false)
        }
    }

    const playEnregistrement = async (enregistrement) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('⚠️ Enregistrement invalide')
            return false
        }

        try {
            console.log('🎵 Lecture enregistrement personnel:', enregistrement.mot)
            const audio = new Audio(enregistrement.audio_url)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            audio.onerror = (error) => {
                console.error('❌ Erreur lecture enregistrement:', error)
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            await audio.play()
            console.log('✅ Enregistrement personnel lu avec succès')
            return true
        } catch (error) {
            console.error('❌ Erreur playEnregistrement:', error)
            return false
        }
    }

    const handleMotClick = (mot) => {
        setAttempts(attempts + 1)

        // Calculer si c'est une bonne réponse
        const isCorrect = mot.id === currentMot.id

        if (isCorrect) {
            // Bonne réponse
            setScore(score + 1)
            // Ajouter aux mots réussis
            setResultats(prev => ({
                ...prev,
                reussis: [...prev.reussis, currentMot.mot]
            }))
        } else {
            // Mauvaise réponse - ajouter aux mots ratés
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, currentMot.mot]
            }))
        }

        // Feedback visuel
        setVisualFeedback({
            clickedMotId: mot.id,
            correctMotId: currentMot.id,
            isCorrect: isCorrect
        })

        // Marquer le mot comme terminé dans TOUS les cas
        setCompletedMots([...completedMots, currentMot.id])

        // Délai conditionnel : 1.5s si bon, 3s si mauvais
        const delai = isCorrect ? 1500 : 3000

        setTimeout(() => {
            const currentIndex = shuffledMots.findIndex(m => m.id === currentMot.id)
            if (currentIndex < shuffledMots.length - 1) {
                // Passer au mot suivant
                const nextMot = shuffledMots[currentIndex + 1]
                setCurrentMot(nextMot)
                updateDisplayedMots(nextMot, allMots)
                playAudio(nextMot.mot)
                // Reset feedback visuel
                setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
            } else {
                // Fin du jeu - calculer le score final
                const finalCorrect = isCorrect ? score + 1 : score
                const finalTotal = shuffledMots.length

                setFinalScore({
                    correct: finalCorrect,
                    total: finalTotal
                })
                setGameStarted(false)
                setGameFinished(true)
                setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
            }
        }, delai)
    }

    const resetGame = () => {
        setGameStarted(false)
        setSelectedTextes([])
        setAllMots([])
        setCurrentMot(null)
        setShuffledMots([])
        setDisplayedMots([])
        setScore(0)
        setAttempts(0)
        setVisualFeedback({ clickedMotId: null, correctMotId: null, isCorrect: null })
        setCompletedMots([])
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
                {/* Titre avec icône maison */}
                <div style={{ position: 'relative' }}>
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: isMobile && gameStarted ? '12px' : '20px',
                        color: '#06b6d4',
                        textAlign: 'center'
                    }}>
                        🎯 Écoute et trouve<span className="desktop-only"> - Reconnaissance des mots</span>
                    </h1>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            position: 'absolute',
                            top: '0',
                            right: '0',
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            opacity: '0.6',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '1'}
                        onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                        title="Retour au dashboard"
                    >
                        🏠
                    </button>
                </div>

                {/* Score/Progression et Icônes de navigation - Mobile uniquement */}
                {isMobile && gameStarted && (
                    <>
                        {/* Score et progression - sans cadre */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '14px',
                            marginBottom: '12px',
                            color: '#64748b'
                        }}>
                            <span>📊 Score: {score}/{attempts}</span>
                            <span>📝 Progression: {completedMots.length}/{shuffledMots.length}</span>
                        </div>

                        {/* Barre d'icônes - style identique à Qu'est-ce ? */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center',
                            marginBottom: '16px'
                        }}>
                            {/* Flèche retour */}
                            <button
                                onClick={() => {
                                    const texteIds = selectedTexteIds.join(',')
                                    router.push(`/lire/reconnaitre-les-mots?etape=exercices&texte_ids=${texteIds}`)
                                }}
                                style={{
                                    padding: '8px 12px',
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

                            {/* Icône œil - Sélection des textes */}
                            <button
                                onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                style={{
                                    padding: '8px 12px',
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

                            {/* Icône livre */}
                            <button
                                onClick={() => router.push('/lire')}
                                style={{
                                    padding: '8px 12px',
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

                            {/* Icône maison */}
                            <button
                                onClick={() => router.push('/dashboard')}
                                style={{
                                    padding: '8px 12px',
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

                            {/* Icône écouter */}
                            <button
                                onClick={() => currentMot && playAudio(currentMot.mot)}
                                disabled={isPlaying || !currentMot}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'white',
                                    border: '2px solid #f59e0b',
                                    borderRadius: '8px',
                                    cursor: currentMot ? 'pointer' : 'not-allowed',
                                    fontSize: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: currentMot ? 1 : 0.5
                                }}
                                title="Écouter le mot"
                            >
                                🔊
                            </button>
                        </div>
                    </>
                )}

                {/* Page d'introduction */}
                {showIntro && !gameStarted && !gameFinished && !isLoadingTextes && (
                    <div style={{
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: isMobile ? '20px' : '40px'
                    }}>
                        {/* Slider pour nombre de mots */}
                        <div style={{ marginBottom: '40px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '15px',
                                fontSize: isMobile ? '16px' : '18px',
                                fontWeight: '600',
                                color: '#1e293b'
                            }}>
                                Nombre de mots proposés :
                            </label>
                            <input
                                type="range"
                                min="4"
                                max="12"
                                value={nbChoix}
                                onChange={(e) => setNbChoix(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    borderRadius: '5px',
                                    outline: 'none',
                                    background: '#ddd'
                                }}
                            />
                            <div style={{
                                textAlign: 'center',
                                marginTop: '10px',
                                fontSize: isMobile ? '24px' : '32px',
                                fontWeight: 'bold',
                                color: '#06b6d4'
                            }}>
                                {nbChoix} mots
                            </div>
                        </div>

                        {/* Bouton démarrer */}
                        <button
                            onClick={startGame}
                            disabled={selectedTexteIds.length === 0}
                            style={{
                                width: '100%',
                                backgroundColor: selectedTexteIds.length === 0 ? '#94a3b8' : '#10b981',
                                color: 'white',
                                padding: isMobile ? '16px' : '20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: isMobile ? '18px' : '20px',
                                fontWeight: 'bold',
                                cursor: selectedTexteIds.length === 0 ? 'not-allowed' : 'pointer',
                                transition: 'transform 0.1s'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedTexteIds.length > 0 && !isMobile) {
                                    e.target.style.transform = 'scale(1.02)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isMobile) {
                                    e.target.style.transform = 'scale(1)'
                                }
                            }}
                        >
                            🚀 Démarrer l'exercice
                        </button>
                    </div>
                )}

                {/* Chargement */}
                {!showIntro && !gameStarted && !gameFinished && isLoadingTextes && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#10b981',
                        fontSize: '20px'
                    }}>
                        ⏳ Chargement...
                    </div>
                )}

                {gameStarted && (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
                            padding: '20px',
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
                                <span>📝 Progression: {completedMots.length}/{shuffledMots.length}</span>
                            </div>

                            {/* Boutons d'action - Desktop uniquement */}
                            <div className="desktop-only" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '20px',
                                marginBottom: '30px',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => playAudio(currentMot.mot)}
                                    disabled={isPlaying}
                                    style={{
                                        backgroundColor: isPlaying ? '#f59e0b' : '#3b82f6',
                                        color: 'white',
                                        padding: '15px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isPlaying ? '⏸️ Pause' : '🔊 Écouter'}
                                </button>

                                <button
                                    onClick={resetGame}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                    title="Arrêter l'exercice"
                                >
                                    ⏹️ Arrêter l'exercice
                                </button>

                                <button
                                    onClick={() => router.push('/lire')}
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
                                    title="Retour au menu Lire"
                                >
                                    ← Retour au menu Lire
                                </button>
                            </div>

                            {/* Étiquettes des mots */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: isMobile ? '12px' : '15px',
                                marginTop: '20px'
                            }}>
                                {displayedMots.map(mot => {
                                    // Déterminer le style selon le feedback visuel
                                    let buttonStyle = {
                                        padding: isMobile ? '16px 8px' : '20px',
                                        background: '#fff',
                                        border: '2px solid #06b6d4',
                                        borderRadius: isMobile ? '8px' : '12px',
                                        cursor: isPlaying ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s',
                                        fontSize: isMobile ? '16px' : '24px',
                                        fontWeight: '600',
                                        color: '#06b6d4',
                                        opacity: isPlaying ? 0.5 : 1
                                    }

                                    // Bonne réponse cliquée → fond vert
                                    if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect) {
                                        buttonStyle.background = '#10b981'
                                        buttonStyle.border = '2px solid #10b981'
                                        buttonStyle.color = 'white'
                                    }

                                    // Mauvaise réponse cliquée → cadre rouge
                                    if (mot.id === visualFeedback.clickedMotId && visualFeedback.isCorrect === false) {
                                        buttonStyle.border = '4px solid #ef4444'
                                    }

                                    // Montrer le bon mot si erreur → cadre vert
                                    if (mot.id === visualFeedback.correctMotId && visualFeedback.isCorrect === false) {
                                        buttonStyle.border = '4px solid #10b981'
                                    }

                                    return (
                                        <button
                                            key={mot.id}
                                            onClick={() => handleMotClick(mot)}
                                            disabled={completedMots.includes(mot.id) || isPlaying}
                                            style={buttonStyle}
                                            onMouseEnter={(e) => {
                                                if (!isMobile) {
                                                    e.target.style.transform = 'scale(1.05)'
                                                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isMobile) {
                                                    e.target.style.transform = 'scale(1)'
                                                    e.target.style.boxShadow = 'none'
                                                }
                                            }}
                                        >
                                            {mot.mot}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                    </>
                )}

                {/* Écran de fin avec score - Pattern ou-est-ce */}
                {gameFinished && (
                    <div style={{ width: '100%' }}>
                        {isMobile ? (
                            // VERSION MOBILE
                            <div style={{ width: '100%' }}>
                                <h1 style={{
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginBottom: '12px',
                                    color: '#06b6d4',
                                    textAlign: 'center'
                                }}>
                                    📊 Résultats
                                </h1>

                                {/* 5 icônes : ← 👁️ 📖 🏠 🔄 */}
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                                    <button
                                        onClick={() => {
                                            const texteIds = selectedTexteIds.join(',')
                                            router.push(`/lire/reconnaitre-les-mots?etape=exercices&texte_ids=${texteIds}`)
                                        }}
                                        style={{
                                            padding: '8px 12px',
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
                                        onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                        style={{
                                            padding: '8px 12px',
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
                                            padding: '8px 12px',
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
                                            padding: '8px 12px',
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
                                    <button
                                        onClick={restartGame}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'white',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '20px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Recommencer"
                                    >
                                        🔄
                                    </button>
                                </div>

                                {/* Score intégré sous les icônes */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        border: '3px solid #3b82f6',
                                        borderRadius: '12px',
                                        padding: '8px 20px',
                                        backgroundColor: 'white',
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: '#1e293b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{finalScore.correct}</span>
                                        <span style={{ color: '#64748b' }}>/</span>
                                        <span style={{ color: '#64748b' }}>{finalScore.total}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // VERSION DESKTOP - score inline with title
                            <div style={{ width: '100%', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ flex: 1 }}>
                                        <h1 style={{
                                            fontSize: '28px',
                                            fontWeight: 'bold',
                                            color: '#06b6d4'
                                        }}>
                                            📊 Résultats
                                        </h1>
                                    </div>
                                    {/* Score pour desktop */}
                                    <div style={{
                                        border: '3px solid #3b82f6',
                                        borderRadius: '12px',
                                        padding: '8px 20px',
                                        backgroundColor: 'white',
                                        fontSize: '32px',
                                        fontWeight: 'bold',
                                        color: '#1e293b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{finalScore.correct}</span>
                                        <span style={{ color: '#64748b' }}>/</span>
                                        <span style={{ color: '#64748b' }}>{finalScore.total}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Listes des mots avec espacement optimisé pour mobile */}
                        <div style={{
                            ...(isMobile ? {
                                padding: '8px',
                                marginTop: '8px',
                                backgroundColor: 'transparent'
                            } : {
                                padding: '20px',
                                backgroundColor: 'white',
                                borderRadius: '12px'
                            })
                        }}>
                            {resultats.reussis.length > 0 && (
                                <div style={{
                                    ...(isMobile ? {
                                        marginBottom: '12px'
                                    } : {
                                        marginBottom: '30px'
                                    })
                                }}>
                                    <h2 style={{
                                        ...(isMobile ? {
                                            fontSize: '16px',
                                            marginBottom: '8px'
                                        } : {
                                            fontSize: '20px',
                                            marginBottom: '15px'
                                        }),
                                        color: '#10b981',
                                        fontWeight: 'bold'
                                    }}>
                                        ✅ Mots réussis ({resultats.reussis.length})
                                    </h2>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: isMobile ? '8px' : '12px'
                                    }}>
                                        {resultats.reussis.map((mot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => playAudio(mot)}
                                                style={{
                                                    padding: isMobile ? '8px 12px' : '10px 16px',
                                                    backgroundColor: '#d1fae5',
                                                    color: '#065f46',
                                                    borderRadius: '8px',
                                                    fontSize: isMobile ? '14px' : '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    transition: 'transform 0.1s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                                title="🔊 Écouter"
                                            >
                                                {mot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {resultats.rates.length > 0 && (
                                <div style={{
                                    ...(isMobile ? {
                                        marginBottom: '12px'
                                    } : {})
                                }}>
                                    <h2 style={{
                                        ...(isMobile ? {
                                            fontSize: '16px',
                                            marginBottom: '8px'
                                        } : {
                                            fontSize: '20px',
                                            marginBottom: '15px'
                                        }),
                                        color: '#ef4444',
                                        fontWeight: 'bold'
                                    }}>
                                        ❌ Mots ratés ({resultats.rates.length})
                                    </h2>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: isMobile ? '8px' : '12px'
                                    }}>
                                        {resultats.rates.map((mot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => playAudio(mot)}
                                                style={{
                                                    padding: isMobile ? '8px 12px' : '10px 16px',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#991b1b',
                                                    borderRadius: '8px',
                                                    fontSize: isMobile ? '14px' : '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    transition: 'transform 0.1s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                                title="🔊 Écouter"
                                            >
                                                {mot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Boutons de navigation desktop uniquement */}
                        {!isMobile && (
                            <div style={{
                                display: 'flex',
                                gap: '15px',
                                justifyContent: 'center',
                                marginTop: '30px',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={restartGame}
                                    style={{
                                        backgroundColor: '#10b981',
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
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '12px 24px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ← Menu exercices
                                </button>
                            </div>
                        )}
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
