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
                }
            }
            
            return allGroupesTemp
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            return []
        }
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        setIsLoadingTextes(true)
        const groupes = await loadGroupesForTextes(selectedTextes)
        
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
        
        // Lire automatiquement le premier groupe
        setTimeout(() => playAudio(shuffled[0].contenu), 500)
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

    const playAudio = async (texte) => {
        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            return
        }

        setIsPlaying(true)

        try {
            // 1. TOUJOURS vérifier le cache en premier
            const cachedAudio = getCachedAudio(texte, selectedVoice)
            let audioData = null

            if (cachedAudio) {
                // Utilisation silencieuse du cache - l'utilisateur ne voit rien
                audioData = cachedAudio
            } else if (tokenStatus !== 'exhausted') {
                // Tentative ElevenLabs silencieuse
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
                        // Succès silencieux - l'utilisateur entend juste une belle voix
                    } else {
                        // Échec silencieux - bascule vers Web Speech
                        setTokenStatus('exhausted')
                        fallbackToWebSpeech(texte)
                        return
                    }
                } catch (error) {
                    // Erreur silencieuse - bascule vers Web Speech
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte)
                    return
                }
            } else {
                // Tokens déjà épuisés - utilise Web Speech directement
                fallbackToWebSpeech(texte)
                return
            }

            // Jouer l'audio ElevenLabs
            const audio = new Audio(audioData)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
            }

            audio.onerror = () => {
                // Erreur silencieuse - l'utilisateur ne voit rien
                setIsPlaying(false)
                setCurrentAudio(null)
                fallbackToWebSpeech(texte)
            }

            await audio.play()

        } catch (error) {
            // Erreur générale silencieuse
            fallbackToWebSpeech(texte)
        }
    }

    // Fonction fallback Web Speech optimisée
    const fallbackToWebSpeech = (texte) => {
        try {
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6 // Plus grave pour ressembler aux voix masculines

            // Chercher une voix masculine française
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
            // Erreur Web Speech silencieuse - juste arrêter
            setIsPlaying(false)
        }
    }

    const handleGroupeClick = (groupe) => {
        setAttempts(attempts + 1)
        
        if (groupe.id === currentGroupe.id) {
            // Bonne réponse
            setScore(score + 1)
            setFeedback('✅ Correct !')
            setCompletedGroupes([...completedGroupes, groupe.id])
            
            // Passer au groupe suivant après un délai
            setTimeout(() => {
                const currentIndex = shuffledGroupes.findIndex(g => g.id === currentGroupe.id)
                if (currentIndex < shuffledGroupes.length - 1) {
                    const nextGroupe = shuffledGroupes[currentIndex + 1]
                    setCurrentGroupe(nextGroupe)
                    playAudio(nextGroupe.contenu)
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
        setAllGroupes([])
        setCurrentGroupe(null)
        setShuffledGroupes([])
        setDisplayedGroupes([])
        setScore(0)
        setAttempts(0)
        setFeedback('')
        setCompletedGroupes([])
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
                    🎯 Où est-ce ?<span className="desktop-only"> - Reconnaissance des groupes de sens</span>
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
                                <span>📝 Progression: {completedGroupes.length}/{shuffledGroupes.length}</span>
                            </div>

                            {/* Boutons d'action - optimisés pour mobile */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: window.innerWidth <= 768 ? '10px' : '20px',
                                marginBottom: '30px',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => playAudio(currentGroupe.contenu)}
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

                                {/* Bouton arrêter - version mobile avec icône uniquement */}
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

                                {/* Bouton retour - version mobile avec icône uniquement */}
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
                                        disabled={completedGroupes.includes(groupe.id)}
                                        style={{
                                            padding: '15px',
                                            background: completedGroupes.includes(groupe.id) ? '#d1fae5' : 
                                                       groupe.id === currentGroupe?.id && feedback.includes('✅') ? '#fef3c7' : '#fff',
                                            border: '2px solid',
                                            borderColor: completedGroupes.includes(groupe.id) ? '#10b981' : '#dee2e6',
                                            borderRadius: '8px',
                                            cursor: completedGroupes.includes(groupe.id) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s',
                                            opacity: completedGroupes.includes(groupe.id) ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!completedGroupes.includes(groupe.id)) {
                                                e.target.style.transform = 'scale(1.05)'
                                                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'scale(1)'
                                            e.target.style.boxShadow = 'none'
                                        }}
                                    >
                                        <div style={{ fontSize: '16px' }}>
                                            {groupe.contenu}
                                        </div>
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