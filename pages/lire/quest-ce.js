import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function QuestCe() {
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
    const [isPlaying, setIsPlaying] = useState(null) // ID du groupe en cours de lecture
    const [currentAudio, setCurrentAudio] = useState(null)
    const [orderMode, setOrderMode] = useState('random') // 'random' ou 'sequential'
    const [displayMode, setDisplayMode] = useState('random') // 'random' ou 'sequential' pour l'affichage des boutons
    const [feedback, setFeedback] = useState('')
    const [completedGroupes, setCompletedGroupes] = useState([])
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
        
        // Mélanger les groupes si mode aléatoire pour la progression
        const shuffled = orderMode === 'random' 
            ? [...groupes].sort(() => Math.random() - 0.5)
            : [...groupes]
        
        setShuffledGroupes(shuffled)
        setCurrentGroupe(shuffled[0])
        
        // Afficher TOUS les groupes de sens en audio
        const allAudioChoices = displayMode === 'random'
            ? [...groupes].sort(() => Math.random() - 0.5)
            : [...groupes]
        
        setDisplayedGroupes(allAudioChoices)
        
        setScore(0)
        setAttempts(0)
        setCompletedGroupes([])
        setGameStarted(true)
        setGameFinished(false)
        setFinalScore({ correct: 0, total: 0, percentage: 0 })
        setIsLoadingTextes(false)
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

    const playAudio = async (groupe) => {
        // Si on clique sur le même audio qui joue, on l'arrête
        if (isPlaying === groupe.id && currentAudio) {
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

        setIsPlaying(groupe.id)
        
        // Essayer d'abord avec le cache
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
            const cachedAudio = getCachedAudio(groupe.contenu, selectedVoice)
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
                        text: groupe.contenu,
                        voice_id: selectedVoice
                    })
                })

                if (!response.ok) {
                    // Fallback vers Web Speech API
                    const utterance = new SpeechSynthesisUtterance(groupe.contenu)
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
                setCachedAudio(groupe.contenu, selectedVoice, audioData)
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

    const handleValidation = (groupe) => {
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
                    
                    // Garder tous les groupes audio, juste mélanger si mode aléatoire
                    if (displayMode === 'random') {
                        setDisplayedGroupes([...allGroupes].sort(() => Math.random() - 0.5))
                    }
                    // Si mode séquentiel, on garde l'ordre initial des groupes affichés
                    
                    setFeedback('')
                    setIsPlaying(null)
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
                    🔊 Qu'est-ce ? - Reconnaissance audio
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
                            <h3 style={{ marginBottom: '15px' }}>⚙️ Configuration</h3>
                            
                            {/* Options de jeu */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ marginBottom: '15px' }}>
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
                                
                                <div style={{ marginBottom: '15px' }}>
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
                            {/* Score et progression */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                                fontSize: '16px'
                            }}>
                                <span>📊 Score: {score}/{attempts}</span>
                                <span>📝 Progression: {completedGroupes.length}/{shuffledGroupes.length}</span>
                            </div>

                            {/* Groupe de sens affiché */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '30px',
                                padding: '30px',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                <h2 style={{
                                    fontSize: '24px',
                                    color: '#333',
                                    marginBottom: '10px'
                                }}>
                                    📝 Trouvez l'audio qui correspond à :
                                </h2>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: '#10b981',
                                    padding: '20px',
                                    background: '#f0fdf4',
                                    borderRadius: '8px',
                                    border: '2px solid #10b981'
                                }}>
                                    {currentGroupe?.contenu}
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
                                marginTop: '30px'
                            }}>
                                <h3 style={{
                                    textAlign: 'center',
                                    marginBottom: '20px',
                                    color: '#666'
                                }}>
                                    🎧 Écoutez les audios et choisissez le bon :
                                </h3>
                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: '20px'
                                }}>
                                    {displayedGroupes.map((groupe, index) => (
                                        <div key={groupe.id} style={{
                                            background: completedGroupes.includes(currentGroupe?.id) && groupe.id === currentGroupe?.id ? '#d1fae5' : '#fff',
                                            border: '2px solid',
                                            borderColor: completedGroupes.includes(currentGroupe?.id) && groupe.id === currentGroupe?.id ? '#10b981' : '#dee2e6',
                                            borderRadius: '8px',
                                            padding: '15px',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '10px'
                                            }}>
                                                <span style={{
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    color: '#333'
                                                }}>
                                                    Audio {index + 1}
                                                </span>
                                                
                                                <button
                                                    onClick={() => playAudio(groupe)}
                                                    style={{
                                                        backgroundColor: isPlaying === groupe.id ? '#f59e0b' : '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '8px 16px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {isPlaying === groupe.id ? '⏸️ Pause' : '🔊 Écouter'}
                                                </button>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleValidation(groupe)}
                                                disabled={completedGroupes.includes(currentGroupe?.id)}
                                                style={{
                                                    width: '100%',
                                                    backgroundColor: completedGroupes.includes(currentGroupe?.id) && groupe.id === currentGroupe?.id ? '#10b981' : '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '10px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    cursor: completedGroupes.includes(currentGroupe?.id) ? 'not-allowed' : 'pointer',
                                                    opacity: completedGroupes.includes(currentGroupe?.id) ? 0.5 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!completedGroupes.includes(currentGroupe?.id)) {
                                                        e.target.style.transform = 'scale(1.02)'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'scale(1)'
                                                }}
                                            >
                                                ✅ C'est celui-ci !
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bouton arrêter */}
                        <div style={{ textAlign: 'center' }}>
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
                            >
                                ⏹️ Arrêter l'exercice
                            </button>
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

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/lire/mes-textes-references')}
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
                    >
                        ← Retour aux textes références
                    </button>
                </div>
            </div>
        </div>
    )
}