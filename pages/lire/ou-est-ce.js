import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

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
    const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB')
    const [availableVoices, setAvailableVoices] = useState([])
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
                    groupes.forEach(groupe => {
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
        setIsLoadingTextes(false)
        
        // Lire automatiquement le premier groupe
        setTimeout(() => playAudio(shuffled[0].contenu), 500)
    }

    const playAudio = async (texte) => {
        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            return
        }

        setIsPlaying(true)
        
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
            const cachedAudio = getCachedAudio(texte, selectedVoice)
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
                        text: texte,
                        voice_id: selectedVoice
                    })
                })

                if (!response.ok) {
                    // Fallback vers Web Speech API
                    const utterance = new SpeechSynthesisUtterance(texte)
                    utterance.lang = 'fr-FR'
                    utterance.rate = 0.8
                    utterance.onend = () => {
                        setIsPlaying(false)
                    }
                    window.speechSynthesis.speak(utterance)
                    return
                }

                const data = await response.json()
                audioData = data.audio
                setCachedAudio(texte, selectedVoice, audioData)
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
            }
            
            await audio.play()
            
        } catch (error) {
            console.error('Erreur lecture audio:', error)
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
                    setFeedback(`🎉 Terminé ! Score: ${score + 1}/${shuffledGroupes.length}`)
                    setGameStarted(false)
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
                    🎯 Où est-ce ? - Reconnaissance des groupes de sens
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

                            {/* Bouton écouter */}
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <button
                                    onClick={() => playAudio(currentGroupe.contenu)}
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
                                    {isPlaying ? '⏸️ Pause' : '🔊 Écouter le groupe de sens'}
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