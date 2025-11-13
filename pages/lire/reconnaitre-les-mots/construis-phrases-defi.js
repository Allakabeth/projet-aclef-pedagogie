import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import confetti from 'canvas-confetti'

export default function ConstruisPhrasesDefi() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    // États pour la reconstruction
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [motsSelectionnes, setMotsSelectionnes] = useState([])
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })
    const [phraseVisible, setPhraseVisible] = useState(false)
    const [nbMotsIntrus, setNbMotsIntrus] = useState(8)
    const [motsStatuts, setMotsStatuts] = useState([]) // Statut de chaque mot sélectionné
    const [afficherBoutonSuivant, setAfficherBoutonSuivant] = useState(false)
    const [enregistrementsMap, setEnregistrementsMap] = useState({})

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

            // Récupérer le nombre de mots intrus depuis query param
            const nbIntrus = parseInt(router.query.nb_intrus || '8')
            setNbMotsIntrus(nbIntrus)
            console.log('🎯 Nombre de mots intrus récupéré:', nbIntrus)

            // Charger les données via texte_ids
            if (router.query.texte_ids) {
                await chargerPhrases(router.query.texte_ids)
                await loadEnregistrements(router.query.texte_ids)
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

    // Charger les enregistrements vocaux personnalisés
    const loadEnregistrements = async (texteIds) => {
        try {
            const response = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds}`)
            const data = await response.json()

            if (data.success && data.enregistrementsMap) {
                // Normaliser les clés
                const mapNormalise = {}
                Object.entries(data.enregistrementsMap).forEach(([mot, enreg]) => {
                    const motNormalise = mot.toLowerCase().trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    mapNormalise[motNormalise] = enreg
                })
                setEnregistrementsMap(mapNormalise)
                console.log('✅ Enregistrements chargés:', Object.keys(mapNormalise).length)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
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
                // Démarrer la première phrase
                if (data.phrases.length > 0) {
                    demarrerPhrase(data.phrases[0])
                }
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

    const demarrerPhrase = (phrase) => {
        setPhraseActuelle(phrase)
        setMotsSelectionnes([])
        setVisualFeedback({ correct: false, incorrect: false })
        setPhraseVisible(false)
        setMotsStatuts([])
        setAfficherBoutonSuivant(false)

        // Récupérer les mots de la phrase actuelle
        const motsPhrase = [...phrase.mots]
        console.log('📝 Phrase:', phrase.texte)
        console.log('🎯 Mots de la phrase:', motsPhrase.length, 'mots')

        // Ajouter le nombre de mots intrus choisi par l'apprenant
        const motsIntrus = []

        // Collecter tous les mots des autres phrases
        const autresMots = phrases
            .filter(p => p !== phrase) // Exclure la phrase actuelle
            .flatMap(p => p.mots) // Récupérer tous les mots
            .filter(mot => !motsPhrase.includes(mot)) // Exclure les mots déjà dans la phrase

        console.log('🔢 Nombre de mots intrus demandé:', nbMotsIntrus)
        console.log('📚 Mots disponibles pour intrus:', autresMots.length)

        // Sélectionner aléatoirement des intrus
        const motsIntrusCopie = [...autresMots]
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
            lirePhrase(phrase.texte)
        }, 1000)
    }

    // Fonction pour lire un mot individuel avec priorités
    const lireUnMot = async (mot, onEnded = null) => {
        // Normaliser le mot (enlever ponctuation)
        const motNormalise = mot
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // PRIORITÉ 1 : Voix personnalisée de l'apprenant
        if (enregistrementsMap[motNormalise]) {
            try {
                const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
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

        // PRIORITÉ 3 : Web Speech API
        if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices()
            const frenchVoice = voices.find(v => v.lang.startsWith('fr'))

            const utterance = new SpeechSynthesisUtterance(mot)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.9
            if (frenchVoice) utterance.voice = frenchVoice

            if (onEnded) utterance.addEventListener('end', onEnded)

            window.speechSynthesis.speak(utterance)
        } else {
            if (onEnded) onEnded()
        }
    }

    // Fonction TTS pour lire la phrase mot par mot
    const lirePhrase = async (text) => {
        if (isPlaying) return

        setIsPlaying(true)

        // Découper la phrase en mots
        const mots = text
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        let index = 0

        // Fonction récursive pour lire les mots les uns après les autres
        function lireMotSuivant() {
            if (index >= mots.length) {
                setIsPlaying(false)
                return
            }

            const onAudioEnded = () => {
                index++
                lireMotSuivant() // Pas de délai, enchaîne directement
            }

            lireUnMot(mots[index], onAudioEnded)
        }

        lireMotSuivant()
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
        passerPhrase()
    }

    const afficherPhrase = () => {
        setPhraseVisible(true)
        lirePhrase(phraseActuelle.texte)
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

    // Confettis si score parfait
    useEffect(() => {
        if (etape === 'resultats' && score === phrases.length && phrases.length > 0) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        }
    }, [etape, score, phrases])

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
        const scorePercent = Math.round((score / phrases.length) * 100)
        const parfait = score === phrases.length

        return (
            <div style={{
                minHeight: '100vh',
                background: parfait
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                        {parfait ? '🏆' : '🎉'}
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: parfait ? '#fbbf24' : '#8b5cf6',
                        marginBottom: '20px'
                    }}>
                        {parfait ? 'Parfait !' : 'Bravo !'}
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        color: '#666',
                        marginBottom: '10px'
                    }}>
                        Score: {score}/{phrases.length} ({scorePercent}%)
                    </p>
                    <p style={{
                        fontSize: '14px',
                        color: '#999',
                        marginBottom: '30px'
                    }}>
                        Total de tentatives: {attempts}
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
                                setAttempts(0)
                                setPhraseIndex(0)
                                demarrerPhrase(phrases[0])
                                setEtape('exercice')
                            }}
                            style={{
                                backgroundColor: '#8b5cf6',
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

                {/* LIGNE 3 : Icônes de navigation + Écouter */}
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
                        onClick={() => lirePhrase(phraseActuelle.texte)}
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
                                disabled={motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect}
                                style={{
                                    background: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect)
                                        ? '#d1d5db'
                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    padding: '15px 40px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect) ? 'not-allowed' : 'pointer',
                                    opacity: (motsSelectionnes.length === 0 || visualFeedback.correct || visualFeedback.incorrect) ? 0.5 : 1
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
