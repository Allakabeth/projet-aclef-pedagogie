import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesDefi() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [phrasesReussies, setPhrasesReussies] = useState([])
    const [phrasesARevoir, setPhrasesARevoir] = useState([])

    // États pour la reconstruction
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [motsSelectionnes, setMotsSelectionnes] = useState([])
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })
    const [phraseVisible, setPhraseVisible] = useState(false)
    const [nbMotsIntrus, setNbMotsIntrus] = useState(8)
    const [motsStatuts, setMotsStatuts] = useState([]) // Statut de chaque mot sélectionné
    const [afficherBoutonSuivant, setAfficherBoutonSuivant] = useState(false)

    // États pour les erreurs et compteur
    const [loadingError, setLoadingError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)

    // Flag pour éviter de charger plusieurs fois
    const isLoadingRef = useRef(false)

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // État de rechargement (anti-spam bouton recommencer)
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
        // Verrou pour éviter les appels multiples (React Strict Mode)
        if (isLoadingRef.current) {
            console.log('⏸️ Chargement déjà en cours, ignorer cet appel')
            return
        }

        if (router.isReady && router.query.texte_ids) {
            console.log('🔐 Verrou activé - Début du chargement')
            isLoadingRef.current = true
            checkAuth()
        }
    }, [router.isReady, router.query.texte_ids, router.query.nb_intrus])

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

            // Récupérer le nombre de mots intrus depuis query param
            const nbIntrus = parseInt(router.query.nb_intrus || '8')
            setNbMotsIntrus(nbIntrus)
            console.log('🎯 Nombre de mots intrus récupéré:', nbIntrus)

            // Charger les données via texte_ids
            if (router.query.texte_ids) {
                const enregMap = await loadEnregistrements()
                await chargerPhrases(router.query.texte_ids, enregMap)
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
                console.log(`🎤 ${data.count || 0} enregistrement(s) vocal(aux) chargé(s)`)
                console.log(`📦 Data reçue:`, data)

                // Normaliser les clés (garder apostrophes internes)
                const mapNormalise = {}
                Object.entries(data.enregistrementsMap || {}).forEach(([mot, enreg]) => {
                    const motNormalise = mot.toLowerCase().trim()
                        .replace(/^[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+/, '')
                        .replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+$/, '')
                    console.log(`📝 Normalisation: "${mot}" → "${motNormalise}"`)
                    mapNormalise[motNormalise] = enreg
                })
                console.log(`✅ Map finale:`, Object.keys(mapNormalise))
                setEnregistrementsMap(mapNormalise)
                return mapNormalise
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
        return {}
    }

    const chargerPhrases = async (texteIds, enregMap = null) => {
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

                // Mettre à jour le state avec toutes les phrases
                setPhrases(data.phrases)

                // Démarrer la première phrase AVANT de changer l'étape
                // On passe toutes les phrases pour avoir accès aux mots intrus
                if (data.phrases.length > 0) {
                    console.log('🚀 Démarrage de la phrase:', data.phrases[0].texte)
                    demarrerPhrase(data.phrases[0], data.phrases, enregMap)
                }

                // Changer l'étape EN DERNIER
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

    const lireUnMot = async (mot, onEnded = null, enregMap = null) => {
        // Normaliser le mot (enlever ponctuation SAUF apostrophes internes)
        const motNormalise = mot
            .toLowerCase()
            .trim()
            .replace(/^[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+/, '')
            .replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+$/, '')

        // Utiliser la map fournie ou celle du state
        const mapAUtiliser = enregMap || enregistrementsMap

        console.log(`🔍 Recherche voix perso pour: "${mot}" → normalisé: "${motNormalise}"`)
        console.log(`📚 Enregistrements disponibles:`, Object.keys(mapAUtiliser).slice(0, 10))

        // PRIORITÉ 1 : Voix personnalisée de l'apprenant
        if (mapAUtiliser[motNormalise]) {
            console.log(`✅ Voix perso trouvée pour: ${motNormalise}`)
            try {
                const audio = new Audio(mapAUtiliser[motNormalise].audio_url)
                if (onEnded) audio.addEventListener('ended', onEnded)
                await audio.play()
                return
            } catch (err) {
                console.error('Erreur lecture voix perso:', err)
                // Fallback sur ElevenLabs
            }
        }

        // PRIORITÉ 2 : ElevenLabs
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: mot })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                if (onEnded) audio.addEventListener('ended', onEnded)
                await audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible pour mot:', mot)
        }

        // PRIORITÉ 3 : Web Speech API (pas Hortense)
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(mot)
            utterance.lang = 'fr-FR'
            utterance.rate = 1.0
            utterance.pitch = 1.0

            const voices = window.speechSynthesis.getVoices()
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('thomas'))
            ) || voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense')
            )

            if (voixMasculine) {
                utterance.voice = voixMasculine
            }

            if (onEnded) utterance.addEventListener('end', onEnded)

            window.speechSynthesis.speak(utterance)
        } else {
            if (onEnded) onEnded()
        }
    }

    const lirePhrase = (phrase = phraseActuelle, enregMap = null) => {
        if (isPlaying || !phrase || !phrase.mots) return

        setIsPlaying(true)

        // Annuler toute lecture en cours
        window.speechSynthesis.cancel()

        // Découper la phrase en mots
        const mots = phrase.mots

        let index = 0

        // Fonction récursive pour lire les mots les uns après les autres
        function lireMotSuivant() {
            if (index >= mots.length) {
                setIsPlaying(false)
                return
            }

            const onAudioEnded = () => {
                index++
                lireMotSuivant()
            }

            lireUnMot(mots[index], onAudioEnded, enregMap)
        }

        lireMotSuivant()
    }

    const demarrerPhrase = (phrase, toutesLesPhrases = null, enregMap = null) => {
        console.log('🔍 APPEL demarrerPhrase:', phrase.texte)

        setPhraseActuelle(phrase)
        setMotsSelectionnes([])
        setVisualFeedback({ correct: false, incorrect: false })
        setPhraseVisible(false)
        setMotsStatuts([])
        setAfficherBoutonSuivant(false)
        setIsRestarting(false) // Libérer le verrou quand l'exercice démarre

        // Récupérer les mots de la phrase actuelle
        const motsPhrase = [...phrase.mots]
        console.log('📝 Phrase:', phrase.texte)
        console.log('🎯 Mots de la phrase:', motsPhrase.length, 'mots')

        // Ajouter le nombre de mots intrus choisi par l'apprenant
        const motsIntrus = []

        // Utiliser toutesLesPhrases si fourni, sinon utiliser le state
        const phrasesDisponibles = toutesLesPhrases || phrases

        // Collecter tous les mots des autres phrases
        const autresMots = phrasesDisponibles
            .filter(p => p !== phrase) // Exclure la phrase actuelle
            .flatMap(p => p.mots) // Récupérer tous les mots
            .filter(mot => !motsPhrase.includes(mot)) // Exclure les mots déjà dans la phrase

        // Dédupliquer les mots disponibles (garder uniques)
        const motsUniques = [...new Set(autresMots)]

        console.log('🔢 Nombre de mots intrus demandé:', nbMotsIntrus)
        console.log('📚 Mots disponibles pour intrus:', motsUniques.length, `(${autresMots.length} avant déduplication)`)

        // Sélectionner aléatoirement des intrus (depuis les mots uniques)
        const motsIntrusCopie = [...motsUniques]
        for (let i = 0; i < nbMotsIntrus && motsIntrusCopie.length > 0; i++) {
            const indexAleatoire = Math.floor(Math.random() * motsIntrusCopie.length)
            motsIntrus.push(motsIntrusCopie[indexAleatoire])
            motsIntrusCopie.splice(indexAleatoire, 1) // Éviter les doublons
        }

        console.log('🎲 Mots intrus ajoutés:', motsIntrus.length)
        console.log('👉 Intrus:', motsIntrus)

        // Combiner les mots de la phrase + les intrus et mélanger avec Fisher-Yates
        const tousLesMots = [...motsPhrase, ...motsIntrus]

        // Fisher-Yates shuffle pour un vrai hasard
        for (let i = tousLesMots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tousLesMots[i], tousLesMots[j]] = [tousLesMots[j], tousLesMots[i]]
        }

        console.log('✅ Total de mots présentés:', tousLesMots.length)
        setMotsDisponibles(tousLesMots)

        // Lire automatiquement la phrase après 1 seconde
        setTimeout(() => {
            lirePhrase(phrase, enregMap)
        }, 1000)
    }

    const handleMotClick = (mot, index) => {
        if (visualFeedback.correct || visualFeedback.incorrect) return

        // Ajouter le mot à la sélection
        const nouveauxMots = [...motsSelectionnes, mot]
        setMotsSelectionnes(nouveauxMots)

        // La vérification se fait maintenant manuellement via le bouton Valider
    }

    const retirerMot = (index) => {
        if (visualFeedback.correct || visualFeedback.incorrect || motsStatuts.length > 0) return

        const nouveauxMots = motsSelectionnes.filter((_, i) => i !== index)
        setMotsSelectionnes(nouveauxMots)
    }

    const verifierPhrase = (motsConstruit) => {
        setAttempts(attempts + 1)

        // Comparer mot par mot
        const motsAttendus = phraseActuelle.mots.map(m => m.toLowerCase())
        const statuts = motsConstruit.map((mot, index) => ({
            mot: mot,
            correct: index < motsAttendus.length && mot.toLowerCase() === motsAttendus[index]
        }))

        setMotsStatuts(statuts)

        // Vérifier si tout est correct
        const toutCorrect = statuts.every(s => s.correct) && statuts.length === motsAttendus.length

        if (toutCorrect) {
            setScore(score + 1)
            setPhrasesReussies([...phrasesReussies, phraseActuelle.texte])
            setVisualFeedback({ correct: true, incorrect: false })
            setAfficherBoutonSuivant(false)

            // Passer à la phrase suivante après 2 secondes
            setTimeout(() => {
                const nextIndex = phraseIndex + 1
                if (nextIndex < phrases.length) {
                    setPhraseIndex(nextIndex)
                    demarrerPhrase(phrases[nextIndex])
                } else {
                    setEtape('resultats')
                }
            }, 2000)
        } else {
            setVisualFeedback({ correct: false, incorrect: true })
            setAfficherBoutonSuivant(true) // Afficher le bouton Suivant
        }
    }

    const passerPhraseApresErreur = () => {
        // Réinitialiser pour la phrase suivante
        setMotsSelectionnes([])
        setMotsStatuts([])
        setVisualFeedback({ correct: false, incorrect: false })
        setAfficherBoutonSuivant(false)
        setPhrasesARevoir([...phrasesARevoir, phraseActuelle.texte])
        passerPhrase()
    }

    const afficherPhrase = () => {
        setPhraseVisible(true)
    }

    const passerPhrase = () => {
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            demarrerPhrase(phrases[nextIndex])
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
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
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
                        color: '#8b5cf6',
                        textAlign: 'center',
                        marginBottom: isMobile ? '10px' : '15px'
                    }}>
                        🎯 Mode Défi - Résultats
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
                                    setAttempts(0)
                                    setPhrasesReussies([])
                                    setPhrasesARevoir([])
                                    demarrerPhrase(data.phrases[0], data.phrases)
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
                            border: '3px solid #8b5cf6',
                            borderRadius: '12px',
                            padding: isMobile ? '12px 24px' : '16px 32px'
                        }}>
                            <h2 style={{
                                fontSize: isMobile ? '28px' : '36px',
                                fontWeight: 'bold',
                                color: '#8b5cf6',
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
                    color: '#8b5cf6',
                    textAlign: 'center',
                    margin: '0 0 10px 0'
                }}>
                    🎯 Mode Défi
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
                    <div style={{ color: '#8b5cf6' }}>
                        Score: {score}/{attempts}
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
                    <button
                        onClick={() => lirePhrase()}
                        disabled={isPlaying}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isPlaying ? '#d1d5db' : 'white',
                            border: '2px solid #f59e0b',
                            borderRadius: '8px',
                            cursor: isPlaying ? 'not-allowed' : 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: isPlaying ? 0.6 : 1
                        }}
                        title="Écouter la phrase"
                    >
                        🔊
                    </button>
                </div>

                {/* Zone de jeu (sans cadre blanc) */}
                <div>

                    {/* Phrase (cachée ou visible) */}
                    {phraseVisible && (
                        <div style={{
                            fontSize: isMobile ? '18px' : '24px',
                            fontWeight: 'bold',
                            color: '#333',
                            marginBottom: '30px',
                            textAlign: 'center',
                            padding: '20px',
                            background: '#f3e8ff',
                            borderRadius: '12px',
                            border: '2px solid #8b5cf6'
                        }}>
                            {phraseActuelle.texte}
                        </div>
                    )}

                    {/* Zone de construction */}
                    <div style={{
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        {!isMobile && (
                            <p style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                marginBottom: '15px',
                                color: '#666'
                            }}>
                                {phraseVisible ? 'Construis la phrase :' : '🎧 Écoute et construis la phrase :'}
                            </p>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginBottom: '20px',
                            minHeight: '60px'
                        }}>
                            {motsSelectionnes.length === 0 ? (
                                <div style={{
                                    padding: '15px 30px',
                                    border: '2px dashed #ccc',
                                    borderRadius: '10px',
                                    color: '#999',
                                    fontSize: '14px'
                                }}>
                                    Clique sur les mots...
                                </div>
                            ) : (
                                motsSelectionnes.map((mot, index) => {
                                    // Déterminer la couleur selon le statut du mot
                                    const statut = motsStatuts[index]
                                    const isCorrect = statut && statut.correct
                                    const isIncorrect = statut && !statut.correct

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => retirerMot(index)}
                                            style={{
                                                background: '#f3f4f6',
                                                color: '#333',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                fontSize: isMobile ? '14px' : '16px',
                                                fontWeight: 'bold',
                                                cursor: motsStatuts.length > 0 ? 'not-allowed' : 'pointer',
                                                border: '3px solid',
                                                borderColor: isCorrect
                                                    ? '#10b981'
                                                    : isIncorrect
                                                    ? '#ef4444'
                                                    : '#8b5cf6'
                                            }}
                                        >
                                            {mot}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {visualFeedback.correct && (
                            <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
                                ✅ Bravo ! C'est correct !
                            </p>
                        )}

                        {visualFeedback.incorrect && (
                            <div style={{ marginTop: '20px' }}>
                                <p style={{
                                    color: '#f59e0b',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    marginBottom: '10px'
                                }}>
                                    Bonne phrase :
                                </p>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                }}>
                                    {phraseActuelle.mots.map((mot, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                background: '#f0fdf4',
                                                color: '#10b981',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                fontSize: isMobile ? '14px' : '16px',
                                                fontWeight: 'bold',
                                                border: '3px solid #10b981'
                                            }}
                                        >
                                            {mot}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Boutons Valider et Suivant */}
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        marginBottom: '30px'
                    }}>
                        {!afficherBoutonSuivant && (
                            <button
                                onClick={() => {
                                    if (motsSelectionnes.length > 0) {
                                        verifierPhrase(motsSelectionnes)
                                    }
                                }}
                                disabled={motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect || isPlaying}
                                style={{
                                    background: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect || isPlaying)
                                        ? '#d1d5db'
                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    padding: '15px 40px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect || isPlaying) ? 'not-allowed' : 'pointer',
                                    opacity: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect || isPlaying) ? 0.5 : 1
                                }}
                            >
                                ✓ Valider
                            </button>
                        )}

                        {afficherBoutonSuivant && (
                            <button
                                onClick={passerPhraseApresErreur}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    padding: '15px 40px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                → Suivant
                            </button>
                        )}
                    </div>

                    {/* Mots disponibles */}
                    <div>
                        {!isMobile && (
                            <p style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '15px',
                                color: '#666',
                                textAlign: 'center'
                            }}>
                                Mots disponibles :
                            </p>
                        )}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                            gap: isMobile ? '8px' : '15px'
                        }}>
                            {motsDisponibles.map((mot, index) => {
                                const dejaUtilise = motsSelectionnes.includes(mot)
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleMotClick(mot, index)}
                                        disabled={dejaUtilise || visualFeedback.correct || visualFeedback.incorrect}
                                        style={{
                                            background: dejaUtilise ? '#f3f4f6' : 'white',
                                            color: dejaUtilise ? '#9ca3af' : '#333',
                                            padding: isMobile ? '10px 8px' : '15px',
                                            border: dejaUtilise ? '2px dashed #d1d5db' : '2px solid #8b5cf6',
                                            borderRadius: '10px',
                                            fontSize: isMobile ? '14px' : '16px',
                                            fontWeight: 'bold',
                                            cursor: (dejaUtilise || visualFeedback.correct || visualFeedback.incorrect) ? 'not-allowed' : 'pointer',
                                            opacity: dejaUtilise ? 0.5 : 1,
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {mot}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {!isMobile && (
                        <p style={{
                            marginTop: '30px',
                            textAlign: 'center',
                            color: '#666',
                            fontSize: '12px',
                            opacity: 0.8
                        }}>
                            Clique sur les mots dans le bon ordre pour reconstituer la phrase
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
