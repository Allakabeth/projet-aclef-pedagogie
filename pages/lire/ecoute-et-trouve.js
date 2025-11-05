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
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
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
    const [orderMode, setOrderMode] = useState('random') // 'random' ou 'sequential'
    const [displayMode, setDisplayMode] = useState('random') // 'random' ou 'sequential' pour l'affichage des étiquettes
    const [nbChoix, setNbChoix] = useState(8) // Nombre de mots affichés (4-12)
    const [feedback, setFeedback] = useState('')
    const [completedMots, setCompletedMots] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [availableVoices, setAvailableVoices] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
    const [tokenStatus, setTokenStatus] = useState('unknown') // 'available', 'exhausted', 'unknown'
    const router = useRouter()

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

            const response = await fetch('/api/textes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

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

            // Extraire tous les mots uniques de tous les groupes
            const motsSet = new Set()
            const mots = []
            let idCounter = 1;

            (data || []).forEach(groupe => {
                const motsGroupe = groupe.contenu
                    .trim()
                    .split(/\s+/)
                    .filter(mot => mot && mot.trim().length > 0)
                    .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

                motsGroupe.forEach(mot => {
                    const motLower = mot.toLowerCase()
                    if (!motsSet.has(motLower)) {
                        motsSet.add(motLower)
                        mots.push({
                            id: idCounter++,
                            mot: mot,
                            texte_id: groupe.texte_reference_id
                        })
                    }
                })
            })

            console.log(`📝 ${mots.length} mots uniques chargés depuis ${data?.length || 0} groupes`)
            return mots

        } catch (error) {
            console.error('Erreur chargement mots:', error)
            return []
        }
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        setIsLoadingTextes(true)
        const mots = await loadMotsForTextes(selectedTextes)

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

        // Mélanger les mots si mode aléatoire
        const shuffled = orderMode === 'random'
            ? [...mots].sort(() => Math.random() - 0.5)
            : [...mots]

        setShuffledMots(shuffled)
        setCurrentMot(shuffled[0])

        // Afficher les premiers choix
        updateDisplayedMots(shuffled[0], mots)

        setScore(0)
        setAttempts(0)
        setCompletedMots([])
        setGameStarted(true)
        setGameFinished(false)
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
        setIsLoadingTextes(false)

        // Lire automatiquement le premier mot
        setTimeout(() => playAudio(shuffled[0].mot), 500)
    }

    const updateDisplayedMots = (motCourant, tousLesMots) => {
        // Créer un array avec le mot courant + (nbChoix - 1) autres mots aléatoires
        const autresMots = tousLesMots.filter(m => m.id !== motCourant.id)
        const motsAleatoires = [...autresMots].sort(() => Math.random() - 0.5).slice(0, nbChoix - 1)

        // Ajouter le mot courant et mélanger si mode random
        const choix = [motCourant, ...motsAleatoires]
        const displayed = displayMode === 'random'
            ? choix.sort(() => Math.random() - 0.5)
            : choix

        setDisplayedMots(displayed)
    }

    const restartGame = () => {
        setGameFinished(false)
        setGameStarted(false)
        setScore(0)
        setAttempts(0)
        setCompletedMots([])
        setFeedback('')
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
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
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice => voice.lang.includes('fr'))

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

    const handleMotClick = (mot) => {
        setAttempts(attempts + 1)

        if (mot.id === currentMot.id) {
            // Bonne réponse
            setScore(score + 1)
            setFeedback('✅ Correct !')
            setCompletedMots([...completedMots, mot.id])

            // Passer au mot suivant après un délai
            setTimeout(() => {
                const currentIndex = shuffledMots.findIndex(m => m.id === currentMot.id)
                if (currentIndex < shuffledMots.length - 1) {
                    const nextMot = shuffledMots[currentIndex + 1]
                    setCurrentMot(nextMot)
                    updateDisplayedMots(nextMot, allMots)
                    playAudio(nextMot.mot)
                    setFeedback('')
                } else {
                    // Fin du jeu
                    const finalCorrect = score + 1
                    const finalTotal = shuffledMots.length
                    const percentage = Math.round((finalCorrect / finalTotal) * 100)

                    setFinalScore({
                        correct: finalCorrect,
                        total: finalTotal,
                        percentage: percentage
                    })
                    setGameStarted(false)
                    setGameFinished(true)
                    setFeedback('')
                }
            }, 1500)
        } else {
            // Mauvaise réponse
            setFeedback('❌ Essayez encore')
            setTimeout(() => setFeedback(''), 2000)
        }
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
        setFeedback('')
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
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🎯 Écoute et trouve<span className="desktop-only"> - Reconnaissance des mots</span>
                </h1>

                {!gameStarted ? (
                    <>
                        {/* Configuration du jeu */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 className="desktop-only" style={{ marginBottom: '15px' }}>⚙️ Configuration</h3>

                            {/* Options de jeu */}
                            <div style={{ marginBottom: '20px' }}>
                                <div className="desktop-only" style={{ marginBottom: '15px' }}>
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

                                <div className="desktop-only" style={{ marginBottom: '15px' }}>
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

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                                        Nombre de mots affichés: <strong>{nbChoix}</strong>
                                    </label>
                                    <input
                                        type="range"
                                        min="4"
                                        max="12"
                                        value={nbChoix}
                                        onChange={(e) => setNbChoix(parseInt(e.target.value))}
                                        style={{
                                            width: '100%',
                                            height: '6px',
                                            borderRadius: '5px',
                                            background: '#d3d3d3',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '12px',
                                        color: '#666',
                                        marginTop: '5px'
                                    }}>
                                        <span>4</span>
                                        <span>12</span>
                                    </div>
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
                                        {availableVoices.map(voice => (
                                            <option key={voice.voice_id} value={voice.voice_id}>
                                                {voice.name} {voice.recommended ? '⭐' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Sélection des textes */}
                            <h3 style={{ marginBottom: '15px' }}>📚 Sélectionner les textes</h3>

                            {isLoadingTextes ? (
                                <div>Chargement des textes...</div>
                            ) : textes.length === 0 ? (
                                <div>Aucun texte disponible</div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gap: '10px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}>
                                    {textes.map(texte => (
                                        <label key={texte.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '10px',
                                            background: selectedTextes.includes(texte.id) ? '#e0f2fe' : '#fff',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTextes.includes(texte.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTextes([...selectedTextes, texte.id])
                                                    } else {
                                                        setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                                    }
                                                }}
                                                style={{ marginRight: '10px' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{texte.titre}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {texte.nombre_groupes} groupes de sens
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Bouton démarrer */}
                            <button
                                onClick={startGame}
                                disabled={selectedTextes.length === 0}
                                style={{
                                    backgroundColor: selectedTextes.length > 0 ? '#10b981' : '#ccc',
                                    color: 'white',
                                    padding: '12px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
                                    marginTop: '20px',
                                    width: '100%'
                                }}
                            >
                                🚀 Commencer l'exercice
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
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

                            {/* Boutons d'action */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: window.innerWidth <= 768 ? '10px' : '20px',
                                marginBottom: '30px',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => playAudio(currentMot.mot)}
                                    disabled={isPlaying}
                                    style={{
                                        backgroundColor: isPlaying ? '#f59e0b' : '#3b82f6',
                                        color: 'white',
                                        padding: window.innerWidth <= 768 ? '10px 15px' : '15px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: window.innerWidth <= 768 ? '14px' : '18px',
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
                                        padding: window.innerWidth <= 768 ? '10px' : '10px 20px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                        cursor: 'pointer',
                                        minWidth: window.innerWidth <= 768 ? '40px' : 'auto'
                                    }}
                                    title="Arrêter l'exercice"
                                >
                                    {window.innerWidth <= 768 ? '⏹️' : '⏹️ Arrêter l\'exercice'}
                                </button>

                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        padding: window.innerWidth <= 768 ? '10px' : '12px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        minWidth: window.innerWidth <= 768 ? '40px' : 'auto'
                                    }}
                                    title="Retour au menu Lire"
                                >
                                    {window.innerWidth <= 768 ? '←' : '← Retour au menu Lire'}
                                </button>
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

                            {/* Étiquettes des mots */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '15px',
                                marginTop: '20px'
                            }}>
                                {displayedMots.map(mot => (
                                    <button
                                        key={mot.id}
                                        onClick={() => handleMotClick(mot)}
                                        disabled={completedMots.includes(mot.id)}
                                        style={{
                                            padding: '20px',
                                            background: mot.id === currentMot?.id && feedback.includes('✅') ? '#fef3c7' : '#fff',
                                            border: '2px solid #dee2e6',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            fontSize: '18px',
                                            fontWeight: 'bold'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'scale(1.05)'
                                            e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'scale(1)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    >
                                        {mot.mot}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </>
                )}

                {/* Écran de fin avec score */}
                {gameFinished && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center',
                        margin: '20px 0'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                            {finalScore.percentage >= 80 ? '🎉' :
                             finalScore.percentage >= 60 ? '👏' : '💪'}
                        </div>

                        <h2 style={{
                            color: '#1f2937',
                            marginBottom: '20px',
                            fontSize: '24px'
                        }}>
                            Exercice terminé !
                        </h2>

                        <div style={{
                            backgroundColor: '#f3f4f6',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '25px'
                        }}>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
                                {finalScore.correct}/{finalScore.total}
                            </div>
                            <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '5px' }}>
                                Score : {finalScore.percentage}%
                            </div>
                            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                                {finalScore.percentage >= 80 ? 'Excellent travail !' :
                                 finalScore.percentage >= 60 ? 'Bon travail !' :
                                 'Continue tes efforts !'}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
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
                                onClick={() => router.push('/lire')}
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
                                🏠 Autres exercices
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
