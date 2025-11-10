import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesDefi() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [gameFinished, setGameFinished] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    // États pour la reconstruction
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [motsSelectionnes, setMotsSelectionnes] = useState([])
    const [visualFeedback, setVisualFeedback] = useState({ correct: false, incorrect: false })
    const [phraseVisible, setPhraseVisible] = useState(false)
    const [nbMotsIntrus, setNbMotsIntrus] = useState(8)

    const router = useRouter()

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

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

        // Récupérer le nombre de mots intrus depuis localStorage
        const nbIntrus = parseInt(localStorage.getItem('construis-phrases-nb-intrus') || '8')
        setNbMotsIntrus(nbIntrus)
        console.log('🎯 Nombre de mots intrus récupéré:', nbIntrus)

        setIsLoading(false)
        chargerPhrases()
    }, [router])

    // Démarrer la première phrase quand phrases ET nbMotsIntrus sont prêts
    useEffect(() => {
        if (phrases.length > 0 && !phraseActuelle && nbMotsIntrus > 0) {
            console.log('🚀 Démarrage première phrase avec', nbMotsIntrus, 'mots intrus')
            demarrerPhrase(phrases[0])
        }
    }, [phrases, nbMotsIntrus])

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
                // Ne pas démarrer la phrase ici, elle sera démarrée après mise à jour de nbMotsIntrus
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

    const demarrerPhrase = (phrase) => {
        setPhraseActuelle(phrase)
        setMotsSelectionnes([])
        setVisualFeedback({ correct: false, incorrect: false })
        setPhraseVisible(false)

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

        // Combiner les mots de la phrase + les intrus et mélanger
        const tousLesMots = [...motsPhrase, ...motsIntrus]
        const motsMelanges = tousLesMots.sort(() => Math.random() - 0.5)
        console.log('✅ Total de mots présentés:', tousLesMots.length)
        setMotsDisponibles(motsMelanges)

        // Lire automatiquement la phrase après 1 seconde
        setTimeout(() => {
            lirePhrase(phrase.texte)
        }, 1000)
    }

    // Fonction TTS pour lire la phrase
    const lirePhrase = async (text) => {
        if (isPlaying) return

        setIsPlaying(true)

        // Essayer ElevenLabs en premier
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7' // Paul (voix d'homme)
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                audio.onended = () => setIsPlaying(false)
                audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible, utilisation Web Speech API')
        }

        // Fallback vers Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.9

            utterance.onend = () => setIsPlaying(false)

            // Chercher une voix masculine française
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme'))
            ) || voices.find(voice => voice.lang.includes('fr'))

            if (maleVoice) {
                utterance.voice = maleVoice
            }

            window.speechSynthesis.speak(utterance)
        } else {
            setIsPlaying(false)
        }
    }

    const handleMotClick = (mot, index) => {
        if (visualFeedback.correct || visualFeedback.incorrect) return

        // Ajouter le mot à la sélection
        const nouveauxMots = [...motsSelectionnes, mot]
        setMotsSelectionnes(nouveauxMots)

        // Vérifier si la phrase est complète
        if (nouveauxMots.length === phraseActuelle.mots.length) {
            verifierPhrase(nouveauxMots)
        }
    }

    const retirerMot = (index) => {
        if (visualFeedback.correct || visualFeedback.incorrect) return

        const nouveauxMots = motsSelectionnes.filter((_, i) => i !== index)
        setMotsSelectionnes(nouveauxMots)
    }

    const verifierPhrase = (motsConstruit) => {
        setAttempts(attempts + 1)

        // Comparer la phrase construite avec la phrase attendue
        const phraseReconstruite = motsConstruit.join(' ').toLowerCase()
        const phraseAttendue = phraseActuelle.mots.join(' ').toLowerCase()

        const isCorrect = phraseReconstruite === phraseAttendue

        if (isCorrect) {
            setScore(score + 1)
            setVisualFeedback({ correct: true, incorrect: false })

            // Passer à la phrase suivante après 2 secondes
            setTimeout(() => {
                const nextIndex = phraseIndex + 1
                if (nextIndex < phrases.length) {
                    setPhraseIndex(nextIndex)
                    demarrerPhrase(phrases[nextIndex])
                } else {
                    setGameFinished(true)
                }
            }, 2000)
        } else {
            setVisualFeedback({ correct: false, incorrect: true })

            // Réinitialiser après 2 secondes
            setTimeout(() => {
                setMotsSelectionnes([])
                setVisualFeedback({ correct: false, incorrect: false })
            }, 2000)
        }
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
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    if (gameFinished) {
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
                            onClick={() => router.push('/lire/construis-phrases')}
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
                            onClick={() => {
                                const texteIds = localStorage.getItem('construis-phrases-texte-ids')
                                if (texteIds) {
                                    router.push(`/lire/reconnaitre-les-mots?etape=exercices&texte_ids=${texteIds}`)
                                } else {
                                    router.push('/lire/reconnaitre-les-mots?etape=exercices')
                                }
                            }}
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
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 'bold',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div>Phrase {phraseIndex + 1}/{phrases.length}</div>
                    <div>Score: {score}/{attempts}</div>
                    <div style={{ fontSize: isMobile ? '12px' : '14px' }}>
                        Mots intrus: {nbMotsIntrus}
                    </div>
                    <button
                        onClick={() => router.push('/lire/construis-phrases')}
                        style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: isMobile ? '8px 16px' : '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: isMobile ? '14px' : '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Quitter
                    </button>
                </div>

                {/* Zone principale */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: isMobile ? '20px' : '40px'
                }}>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#8b5cf6',
                        marginBottom: '30px',
                        textAlign: 'center'
                    }}>
                        🎯 Mode Défi
                    </div>

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
                        <p style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            color: '#666'
                        }}>
                            {phraseVisible ? 'Construis la phrase :' : '🎧 Écoute et construis la phrase :'}
                        </p>

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
                                motsSelectionnes.map((mot, index) => (
                                    <div
                                        key={index}
                                        onClick={() => retirerMot(index)}
                                        style={{
                                            background: visualFeedback.correct
                                                ? '#10b981'
                                                : visualFeedback.incorrect
                                                ? '#ef4444'
                                                : '#8b5cf6',
                                            color: 'white',
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '14px' : '16px',
                                            fontWeight: 'bold',
                                            cursor: (visualFeedback.correct || visualFeedback.incorrect) ? 'not-allowed' : 'pointer',
                                            border: '2px solid',
                                            borderColor: visualFeedback.correct
                                                ? '#059669'
                                                : visualFeedback.incorrect
                                                ? '#dc2626'
                                                : '#7c3aed'
                                        }}
                                    >
                                        {mot}
                                    </div>
                                ))
                            )}
                        </div>

                        {visualFeedback.correct && (
                            <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
                                ✅ Bravo ! C'est correct !
                            </p>
                        )}

                        {visualFeedback.incorrect && (
                            <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>
                                ❌ Essaie encore !
                            </p>
                        )}
                    </div>

                    {/* Boutons d'aide */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '30px'
                    }}>
                        <button
                            onClick={() => lirePhrase(phraseActuelle.texte)}
                            disabled={isPlaying}
                            style={{
                                background: isPlaying ? '#ccc' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                padding: '12px 20px',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: isPlaying ? 'not-allowed' : 'pointer'
                            }}
                        >
                            🔊 Réécouter
                        </button>

                        {!phraseVisible && (
                            <button
                                onClick={afficherPhrase}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    padding: '12px 20px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                💡 Voir la phrase
                            </button>
                        )}

                        <button
                            onClick={passerPhrase}
                            style={{
                                background: 'transparent',
                                color: '#666',
                                padding: '12px 20px',
                                border: '2px solid #d1d5db',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ⏭️ Passer
                        </button>
                    </div>

                    {/* Mots disponibles */}
                    <div>
                        <p style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            Mots disponibles :
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: isMobile ? '10px' : '15px'
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
                                            padding: isMobile ? '12px' : '15px',
                                            border: dejaUtilise ? '2px dashed #d1d5db' : '2px solid #8b5cf6',
                                            borderRadius: '10px',
                                            fontSize: isMobile ? '14px' : '16px',
                                            fontWeight: 'bold',
                                            cursor: (dejaUtilise || visualFeedback.correct || visualFeedback.incorrect) ? 'not-allowed' : 'pointer',
                                            opacity: dejaUtilise ? 0.5 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {mot}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <p style={{
                        marginTop: '30px',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '12px',
                        opacity: 0.8
                    }}>
                        Clique sur les mots dans le bon ordre pour reconstituer la phrase
                    </p>
                </div>
            </div>
        </div>
    )
}
