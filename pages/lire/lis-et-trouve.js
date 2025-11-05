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

export default function LisEtTrouve() {
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
    const [isPlaying, setIsPlaying] = useState(null) // ID du mot en cours de lecture
    const [currentAudio, setCurrentAudio] = useState(null)
    const [orderMode, setOrderMode] = useState('random') // 'random' ou 'sequential'
    const [displayMode, setDisplayMode] = useState('random') // 'random' ou 'sequential' pour l'affichage des boutons
    const [nbSons, setNbSons] = useState(6) // Nombre de sons présentés (4-8)
    const [feedback, setFeedback] = useState('')
    const [completedMots, setCompletedMots] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7')
    const [availableVoices, setAvailableVoices] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
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
                setTextes(data.textes || [])
            } else {
                const errorData = await response.json()
                console.error('Erreur chargement textes:', errorData)
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
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

        // Vérifier qu'on a assez de mots pour le nombre de sons
        if (mots.length < nbSons) {
            alert(`Pas assez de mots ! Il faut au moins ${nbSons} mots. Vous n'avez que ${mots.length} mots.`)
            setIsLoadingTextes(false)
            return
        }

        setAllMots(mots)

        // Mélanger les mots si mode aléatoire pour la progression
        const shuffled = orderMode === 'random'
            ? [...mots].sort(() => Math.random() - 0.5)
            : [...mots]

        setShuffledMots(shuffled)
        setCurrentMot(shuffled[0])

        // Afficher les premiers choix audio
        updateDisplayedMots(shuffled[0], mots)

        setScore(0)
        setAttempts(0)
        setCompletedMots([])
        setGameStarted(true)
        setGameFinished(false)
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
        setIsLoadingTextes(false)
    }

    const updateDisplayedMots = (motCourant, tousLesMots) => {
        // Créer un array avec le mot courant + (nbSons - 1) autres mots aléatoires
        const autresMots = tousLesMots.filter(m => m.id !== motCourant.id)
        const motsAleatoires = [...autresMots].sort(() => Math.random() - 0.5).slice(0, nbSons - 1)

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

    const playAudio = async (mot) => {
        // Si on clique sur le même audio qui joue, on l'arrête
        if (isPlaying === mot.id && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(null)
            return
        }

        // Arrêter tout audio en cours
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
        }

        setIsPlaying(mot.id)

        const getCachedAudio = (text, voiceId) => {
            const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
            return localStorage.getItem(key)
        }

        const setCachedAudio = (text, voiceId, audioData) => {
            try {
                const key = `elevenlabs_${voiceId}_${btoa(text).substring(0, 50)}`
                localStorage.setItem(key, audioData)
            } catch (error) {
                console.error('Erreur cache:', error)
            }
        }

        try {
            // Vérifier le cache
            const cachedAudio = getCachedAudio(mot.mot, selectedVoice)
            let audioData = null

            if (cachedAudio) {
                audioData = cachedAudio
            } else {
                // Générer via ElevenLabs
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        text: mot.mot,
                        voice_id: selectedVoice
                    })
                })

                if (!response.ok) {
                    // Fallback vers Web Speech API
                    const utterance = new SpeechSynthesisUtterance(mot.mot)
                    utterance.lang = 'fr-FR'
                    utterance.rate = 0.8
                    utterance.onend = () => {
                        setIsPlaying(null)
                    }
                    window.speechSynthesis.speak(utterance)
                    return
                }

                const data = await response.json()
                audioData = data.audio
                setCachedAudio(mot.mot, selectedVoice, audioData)
            }

            const audio = new Audio(audioData)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            audio.onerror = () => {
                setIsPlaying(null)
                setCurrentAudio(null)
            }

            await audio.play()

        } catch (error) {
            console.error('Erreur lecture audio:', error)
            setIsPlaying(null)
        }
    }

    const handleValidation = (mot) => {
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
                    setFeedback('')
                    setIsPlaying(null)
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
        setIsPlaying(null)
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
                {!gameStarted ? (
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center'
                    }}>
                        🔊 Lis et trouve<span className="desktop-only"> - Reconnaissance audio des mots</span>
                    </h1>
                ) : (
                    /* Titre avec boutons de navigation pendant le jeu */
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        {/* Bouton arrêter à gauche */}
                        <button
                            onClick={resetGame}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '8px' : '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                cursor: 'pointer',
                                minWidth: window.innerWidth <= 768 ? '36px' : 'auto',
                                flexShrink: 0
                            }}
                            title="Arrêter l'exercice"
                        >
                            {window.innerWidth <= 768 ? '⏹️' : '⏹️ Arrêter l\'exercice'}
                        </button>

                        {/* Titre au centre */}
                        <h1 style={{
                            fontSize: 'clamp(18px, 4vw, 24px)',
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textAlign: 'center',
                            margin: 0,
                            flex: 1
                        }}>
                            🔊 Lis et trouve<span className="desktop-only"> - Reconnaissance audio</span>
                        </h1>

                        {/* Bouton retour à droite */}
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: window.innerWidth <= 768 ? '8px' : '12px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: window.innerWidth <= 768 ? '16px' : '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minWidth: window.innerWidth <= 768 ? '36px' : 'auto',
                                flexShrink: 0
                            }}
                            title="Retour au menu Lire"
                        >
                            {window.innerWidth <= 768 ? '←' : '← Retour au menu Lire'}
                        </button>
                    </div>
                )}

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
                                        Ordre de progression:
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
                                        Disposition des boutons:
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
                                        <option value="sequential">Fixe</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                                        Nombre de sons présentés: <strong>{nbSons}</strong>
                                    </label>
                                    <input
                                        type="range"
                                        min="4"
                                        max="8"
                                        value={nbSons}
                                        onChange={(e) => setNbSons(parseInt(e.target.value))}
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
                                        <span>8</span>
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

                            {/* Mot affiché */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '30px'
                            }}>
                                <h2 className="desktop-only" style={{
                                    fontSize: '24px',
                                    color: '#333',
                                    marginBottom: '10px'
                                }}>
                                    📝 Trouvez l'audio qui correspond à :
                                </h2>
                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    color: '#10b981',
                                    padding: '30px',
                                    background: '#f0fdf4',
                                    borderRadius: '8px',
                                    border: '2px solid #10b981'
                                }}>
                                    {currentMot?.mot}
                                </div>
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

                            {/* Choix audio avec boutons séparés */}
                            <div style={{
                                marginTop: window.innerWidth <= 768 ? '10px' : '30px'
                            }}>
                                <h3 className="desktop-only" style={{
                                    textAlign: 'center',
                                    marginBottom: '20px',
                                    color: '#666'
                                }}>
                                    🎧 Écoutez les audios et choisissez le bon :
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: window.innerWidth <= 768 ?
                                        (displayedMots.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)') :
                                        'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: window.innerWidth <= 768 ? '8px' : '20px'
                                }}>
                                    {displayedMots.map((mot, index) => {
                                        // Numérotation stable basée sur l'ID du mot
                                        const stableIndex = allMots.findIndex(m => m.id === mot.id) + 1
                                        return (
                                        <div key={mot.id} style={{
                                            background: '#fff',
                                            border: window.innerWidth <= 768 ? '1px solid' : '2px solid',
                                            borderColor: '#dee2e6',
                                            borderRadius: window.innerWidth <= 768 ? '6px' : '8px',
                                            padding: window.innerWidth <= 768 ? '10px' : '15px',
                                            transition: 'all 0.3s'
                                        }}>
                                            {/* Titre "Son X" en haut */}
                                            <div style={{
                                                textAlign: 'center',
                                                marginBottom: window.innerWidth <= 768 ? '10px' : '12px'
                                            }}>
                                                <span style={{
                                                    fontSize: window.innerWidth <= 768 ? '14px' : '18px',
                                                    fontWeight: 'bold',
                                                    color: '#333'
                                                }}>
                                                    Son {stableIndex}
                                                </span>
                                            </div>

                                            {/* Boutons côte à côte */}
                                            <div style={{
                                                display: 'flex',
                                                gap: window.innerWidth <= 768 ? '8px' : '10px'
                                            }}>
                                                {/* Bouton écouter à gauche */}
                                                <button
                                                    onClick={() => playAudio(mot)}
                                                    style={{
                                                        backgroundColor: isPlaying === mot.id ? '#f59e0b' : '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: window.innerWidth <= 768 ? '10px' : '12px',
                                                        fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        flex: 1,
                                                        minHeight: window.innerWidth <= 768 ? '44px' : '50px'
                                                    }}
                                                >
                                                    {isPlaying === mot.id ? '⏸️' : '🔊'}
                                                </button>

                                                {/* Bouton validation à droite */}
                                                <button
                                                    onClick={() => handleValidation(mot)}
                                                    disabled={completedMots.includes(currentMot?.id)}
                                                    style={{
                                                        backgroundColor: (completedMots.includes(currentMot?.id) && mot.id === currentMot?.id) ? '#10b981' : 'transparent',
                                                        color: (completedMots.includes(currentMot?.id) && mot.id === currentMot?.id) ? 'white' : '#10b981',
                                                        border: '2px solid #10b981',
                                                        borderRadius: '4px',
                                                        padding: window.innerWidth <= 768 ? '10px' : '12px',
                                                        fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                                                        fontWeight: 'bold',
                                                        cursor: completedMots.includes(currentMot?.id) ? 'not-allowed' : 'pointer',
                                                        opacity: completedMots.includes(currentMot?.id) ? 0.7 : 1,
                                                        transition: 'all 0.2s',
                                                        flex: 1,
                                                        minHeight: window.innerWidth <= 768 ? '44px' : '50px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!completedMots.includes(currentMot?.id)) {
                                                            e.target.style.backgroundColor = '#10b981'
                                                            e.target.style.color = 'white'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!(completedMots.includes(currentMot?.id) && mot.id === currentMot?.id)) {
                                                            e.target.style.backgroundColor = 'transparent'
                                                            e.target.style.color = '#10b981'
                                                        }
                                                    }}
                                                >
                                                    ✅
                                                </button>
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
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
