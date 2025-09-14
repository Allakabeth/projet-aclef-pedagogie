import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DicteeVocale() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [textesDetails, setTextesDetails] = useState({})
    const [gameStarted, setGameStarted] = useState(false)
    const [allMots, setAllMots] = useState([])
    const [currentMot, setCurrentMot] = useState(null)
    const [shuffledMots, setShuffledMots] = useState([])
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [completedMots, setCompletedMots] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 })
    const [isListening, setIsListening] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [isSupported, setIsSupported] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [inputMode, setInputMode] = useState('voice') // 'voice' ou 'keyboard'
    const [keyboardInput, setKeyboardInput] = useState('')
    const router = useRouter()

    useEffect(() => {
        // Vérifier la compatibilité de l'enregistrement audio
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            setIsSupported(true)
        }
        
        // Authentification
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


    const loadTextes = async () => {
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
                await loadTextesDetails(data.textes || [])
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const loadTextesDetails = async (textesListe) => {
        const details = {}
        const token = localStorage.getItem('token')
        
        for (const texte of textesListe) {
            try {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texte.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                
                if (response.ok) {
                    const data = await response.json()
                    details[texte.id] = {
                        nombreSyllabesMots: data.monosyllabes?.length || 0
                    }
                }
            } catch (error) {
                console.error(`Erreur chargement détails texte ${texte.id}:`, error)
                details[texte.id] = { nombreSyllabesMots: 0 }
            }
        }
        
        setTextesDetails(details)
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        if (!isSupported) {
            alert('Votre navigateur ne supporte pas la reconnaissance vocale')
            return
        }

        try {
            const token = localStorage.getItem('token')
            let tousLesMonosyllabes = []
            
            for (const texteId of selectedTextes) {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    tousLesMonosyllabes.push(...(data.monosyllabes || []))
                }
            }
            
            const monosyllabesUniques = [...new Set(tousLesMonosyllabes)]
            
            if (monosyllabesUniques.length === 0) {
                alert('Aucun monosyllabe trouvé pour les textes sélectionnés')
                return
            }

            const motsAvecIndex = monosyllabesUniques.map((mot, index) => ({
                id: index,
                contenu: mot
            }))

            setAllMots(motsAvecIndex)
            const shuffled = [...motsAvecIndex].sort(() => Math.random() - 0.5)
            setShuffledMots(shuffled)
            setCompletedMots([])
            setScore(0)
            setAttempts(0)
            setGameFinished(false)
            setFeedback('')
            
            setGameStarted(true)
            nextRound(shuffled, [])
        } catch (error) {
            console.error('Erreur démarrage jeu:', error)
            alert('Erreur lors du démarrage du jeu')
        }
    }

    const nextRound = (remainingMots, completed) => {
        if (remainingMots.length === 0) {
            finishGame()
            return
        }

        const currentMot = remainingMots[0]
        setCurrentMot(currentMot)
        setTranscript('')
        setFeedback('')
    }

    const normalizeText = (text) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z]/g, '') // Garder seulement les lettres
            .trim()
    }

    // Fonction pour vérifier la similarité phonétique
    const isPhoneticallySimilar = (spoken, target) => {
        const spokenNorm = normalizeText(spoken)
        const targetNorm = normalizeText(target)
        
        // Correspondances exactes
        if (spokenNorm === targetNorm) return true
        
        // Correspondances phonétiques courantes
        const phoneticMappings = {
            'mets': 'mes',
            'met': 'mes', 
            'mais': 'mes',
            'jeux': 'je',
            'jeu': 'je',
            'trois': '3',
            '3': 'trois',
            'des': 'de',
            'dais': 'de',
            'dans': 'de',
            'est': 'et',
            'ais': 'et',
            'eh': 'et'
        }
        
        // Vérifier les mappings directs
        if (phoneticMappings[spokenNorm] === targetNorm || phoneticMappings[targetNorm] === spokenNorm) {
            return true
        }
        
        // Vérifier la distance de Levenshtein pour les mots courts
        if (targetNorm.length <= 3 && spokenNorm.length <= 4) {
            const distance = levenshteinDistance(spokenNorm, targetNorm)
            return distance <= 1 // Tolérer 1 différence pour les mots courts
        }
        
        return false
    }

    // Distance de Levenshtein simplifiée
    const levenshteinDistance = (str1, str2) => {
        const matrix = []
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i]
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                }
            }
        }
        
        return matrix[str2.length][str1.length]
    }

    // Suggestions pour aider à prononcer les mots difficiles
    const getSuggestionForWord = (word) => {
        const suggestions = {
            'je': 'prononcez "jeu" ou étirez le son "jeeee"',
            'de': 'prononcez "deu" ou étirez le son "deeee"',
            'et': 'prononcez "est" ou étirez le son "eeet"',
            'me': 'prononcez "meu" ou étirez le son "meeee"',
            'te': 'prononcez "teu" ou étirez le son "teeee"',
            'se': 'prononcez "seu" ou étirez le son "seeee"',
            'le': 'prononcez "leu" ou étirez le son "leeee"',
            'ne': 'prononcez "neu" ou étirez le son "neeee"'
        }
        
        return suggestions[word.toLowerCase()] || null
    }

    const startListening = async () => {
        if (!isSupported || isListening) return
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks = []
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data)
                }
            }
            
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' })
                await sendAudioToElevenLabs(audioBlob)
                
                // Arrêter le stream
                stream.getTracks().forEach(track => track.stop())
                setIsListening(false)
            }
            
            recorder.start()
            setMediaRecorder(recorder)
            setIsListening(true)
            setTranscript('')
            
            // Arrêter automatiquement après 3 secondes
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop()
                }
            }, 3000)
            
        } catch (error) {
            console.error('Erreur accès microphone:', error)
            setFeedback('❌ Impossible d\'accéder au microphone')
            setTimeout(() => setFeedback(''), 2000)
        }
    }
    
    const sendAudioToElevenLabs = async (audioBlob) => {
        try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.wav')
            
            const response = await fetch('/api/speech/whisper-stt', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            })
            
            if (response.ok) {
                const data = await response.json()
                const spokenText = data.text?.toLowerCase().trim() || ''
                console.log(`Whisper STT résultat: "${spokenText}"`)
                setTranscript(spokenText)
                
                if (spokenText && currentMot && gameStarted && !gameFinished) {
                    setTimeout(() => {
                        processVoiceResult(spokenText)
                    }, 100)
                }
            } else {
                throw new Error('Erreur API Whisper')
            }
        } catch (error) {
            console.error('Erreur Whisper STT:', error)
            setFeedback('❌ Erreur de reconnaissance vocale. Réessayez.')
            setTimeout(() => setFeedback(''), 2000)
        }
    }

    const processVoiceResult = (spokenText) => {
        if (!currentMot) return
        
        setAttempts(prev => prev + 1)
        
        console.log(`Comparaison: "${spokenText}" vs "${currentMot.contenu}"`) // Debug
        
        if (isPhoneticallySimilar(spokenText, currentMot.contenu)) {
            setScore(prev => prev + 1)
            
            // Feedback adapté selon si c'est une correspondance exacte ou phonétique
            const normalizedSpoken = normalizeText(spokenText)
            const normalizedTarget = normalizeText(currentMot.contenu)
            
            if (normalizedSpoken === normalizedTarget) {
                setFeedback(`✅ Parfait ! Vous avez dit "${currentMot.contenu}"`)
            } else {
                setFeedback(`✅ Très bien ! Vous avez prononcé "${currentMot.contenu}" correctement`)
            }
            
            setCompletedMots(prev => {
                const newCompleted = [...prev, currentMot]
                const remaining = shuffledMots.filter(m => !newCompleted.find(c => c.id === m.id))
                
                setTimeout(() => {
                    setFeedback('')
                    nextRound(remaining, newCompleted)
                }, 2000)
                
                return newCompleted
            })
        } else {
            // Feedback d'échec plus pédagogique
            const suggestions = getSuggestionForWord(currentMot.contenu)
            const suggestionText = suggestions ? ` (${suggestions})` : ' (essayez de prononcer plus clairement)'
            
            setFeedback(`❌ Le mot était "${currentMot.contenu}"${suggestionText}`)
            setTimeout(() => {
                setFeedback('')
                const remaining = shuffledMots.filter(m => m.id !== currentMot.id)
                setShuffledMots(remaining)
                nextRound(remaining, completedMots)
            }, 3000)
        }
    }


    const finishGame = () => {
        const percentage = attempts > 0 ? Math.round((score / attempts) * 100) : 0
        setFinalScore({ correct: score, total: attempts, percentage })
        setGameFinished(true)
    }

    const resetGame = () => {
        // Arrêter l'enregistrement si actif
        if (mediaRecorder && isListening && mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
        }
        
        setGameStarted(false)
        setSelectedTextes([])
        setAllMots([])
        setCurrentMot(null)
        setScore(0)
        setAttempts(0)
        setGameFinished(false)
        setCompletedMots([])
        setFeedback('')
        setTranscript('')
        setIsListening(false)
        setKeyboardInput('')
        setInputMode('voice')
        setMediaRecorder(null)
    }

    const toggleTexteSelection = (texteId) => {
        setSelectedTextes(prev => {
            if (prev.includes(texteId)) {
                return prev.filter(id => id !== texteId)
            } else {
                return [...prev, texteId]
            }
        })
    }

    const getTotalSyllabesMots = () => {
        return selectedTextes.reduce((total, texteId) => {
            return total + (textesDetails[texteId]?.nombreSyllabesMots || 0)
        }, 0)
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
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🎙️ Dictée Vocale
                </h1>

                {!isSupported && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                            ⚠️ Votre navigateur ne supporte pas l'enregistrement audio
                        </p>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Autorisez l'accès au microphone pour cet exercice
                        </p>
                    </div>
                )}

                {!gameStarted ? (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
                                Regardez le mot affiché et {inputMode === 'voice' ? 'prononcez-le clairement' : 'tapez-le au clavier'}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                                <button onClick={() => setInputMode('voice')} style={{
                                    padding: '8px 16px', border: inputMode === 'voice' ? '2px solid #8b5cf6' : '1px solid #d1d5db',
                                    borderRadius: '6px', background: inputMode === 'voice' ? '#faf5ff' : 'white',
                                    color: inputMode === 'voice' ? '#7c3aed' : '#374151', cursor: 'pointer', fontSize: '14px'
                                }}>🎙️ Mode Vocal</button>
                                <button onClick={() => setInputMode('keyboard')} style={{
                                    padding: '8px 16px', border: inputMode === 'keyboard' ? '2px solid #8b5cf6' : '1px solid #d1d5db',
                                    borderRadius: '6px', background: inputMode === 'keyboard' ? '#faf5ff' : 'white',
                                    color: inputMode === 'keyboard' ? '#7c3aed' : '#374151', cursor: 'pointer', fontSize: '14px'
                                }}>⌨️ Mode Clavier</button>
                            </div>
                        </div>

                        <div style={{
                            background: '#f8f9fa',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px'
                        }}>
                            <h2 style={{ 
                                marginBottom: '20px', 
                                color: '#333',
                                fontSize: '20px',
                                textAlign: 'center'
                            }}>
                                📚 Choisissez un ou plusieurs textes
                            </h2>
                            
                            {textes.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    background: '#fff3cd',
                                    borderRadius: '8px',
                                    border: '1px solid #ffeaa7'
                                }}>
                                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                                    <p style={{ fontSize: '14px', color: '#666' }}>
                                        Créez d'abord un texte de référence
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                        gap: '15px',
                                        marginBottom: '25px'
                                    }}>
                                        {textes.map(texte => {
                                            const isSelected = selectedTextes.includes(texte.id)
                                            const details = textesDetails[texte.id]
                                            
                                            return (
                                                <div
                                                    key={texte.id}
                                                    style={{
                                                        padding: '20px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ddd',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '15px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleTexteSelection(texte.id)}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ 
                                                            fontSize: '18px', 
                                                            fontWeight: 'bold',
                                                            marginBottom: '5px',
                                                            color: '#333'
                                                        }}>
                                                            {texte.titre}
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: '#666' }}>
                                                            {details ? 
                                                                `${details.nombreSyllabesMots} syllabes-mots` :
                                                                'Chargement...'
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    
                                    <div style={{ 
                                        textAlign: 'center',
                                        padding: '20px',
                                        background: '#f3f4f6',
                                        borderRadius: '8px'
                                    }}>
                                        {selectedTextes.length > 0 && (
                                            <div style={{ marginBottom: '15px' }}>
                                                <strong style={{ color: '#7c3aed' }}>
                                                    {selectedTextes.length} texte{selectedTextes.length > 1 ? 's' : ''} sélectionné{selectedTextes.length > 1 ? 's' : ''} • 
                                                    {getTotalSyllabesMots()} syllabes-mots au total
                                                </strong>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={startGame}
                                                disabled={selectedTextes.length === 0 || !isSupported}
                                                style={{
                                                    backgroundColor: (selectedTextes.length > 0 && isSupported) ? '#8b5cf6' : '#ccc',
                                                    color: 'white',
                                                    padding: '12px 30px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: (selectedTextes.length > 0 && isSupported) ? 'pointer' : 'not-allowed',
                                                    minWidth: '180px'
                                                }}
                                            >
                                                🚀 Commencer l'exercice
                                            </button>
                                            
                                            {selectedTextes.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedTextes([])}
                                                    style={{
                                                        backgroundColor: '#6b7280',
                                                        color: 'white',
                                                        padding: '8px 20px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        minWidth: '140px'
                                                    }}
                                                >
                                                    🗑️ Tout décocher
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : gameFinished ? (
                    <div style={{
                        background: '#f0fdf4',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ color: '#166534', marginBottom: '20px' }}>
                            🎉 Exercice terminé !
                        </h2>
                        <div style={{ fontSize: '24px', marginBottom: '20px' }}>
                            Score : <strong>{finalScore.correct}/{finalScore.total}</strong>
                        </div>
                        <div style={{ fontSize: '18px', color: '#15803d', marginBottom: '30px' }}>
                            Pourcentage : <strong>{finalScore.percentage}%</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    padding: '12px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Recommencer
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* En-tête de jeu */}
                        <div style={{
                            background: '#faf5ff',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ color: '#7c3aed', marginBottom: '10px' }}>
                                📊 Score : {score}/{attempts} ({attempts > 0 ? Math.round((score/attempts)*100) : 0}%)
                            </h3>
                            <p style={{ color: '#666', fontSize: '14px' }}>
                                Mots restants : {shuffledMots.length - completedMots.length}
                            </p>
                        </div>

                        {/* Mot à prononcer */}
                        {currentMot && (
                            <div style={{
                                background: '#fef3c7',
                                padding: '40px',
                                borderRadius: '12px',
                                marginBottom: '30px',
                                textAlign: 'center'
                            }}>
                                <h2 style={{ 
                                    color: '#92400e',
                                    marginBottom: '20px',
                                    fontSize: '20px'
                                }}>
                                    👁️ Regardez ce mot et prononcez-le clairement :
                                </h2>
                                
                                {currentMot.contenu.length <= 3 && (
                                    <p style={{
                                        color: '#d97706',
                                        fontSize: '16px',
                                        marginBottom: '15px',
                                        fontStyle: 'italic'
                                    }}>
                                        💡 Conseil pour les mots courts : Prononcez lentement et clairement
                                    </p>
                                )}
                                <div style={{
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    color: '#b45309',
                                    padding: '20px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    marginBottom: '30px'
                                }}>
                                    {currentMot.contenu}
                                </div>
                                
                                <button
                                    onClick={startListening}
                                    disabled={isListening || !!feedback}
                                    style={{
                                        backgroundColor: isListening ? '#fbbf24' : (feedback ? '#ccc' : '#8b5cf6'),
                                        color: 'white',
                                        padding: '15px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: (isListening || feedback) ? 'not-allowed' : 'pointer',
                                        minWidth: '200px'
                                    }}
                                >
                                    {isListening ? '🎙️ Écoute...' : '🎙️ Appuyer pour parler'}
                                </button>
                                
                                {inputMode === 'keyboard' && (
                                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={keyboardInput}
                                            onChange={(e) => setKeyboardInput(e.target.value.toLowerCase())}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && keyboardInput.trim()) {
                                                    processVoiceResult(keyboardInput.trim())
                                                    setKeyboardInput('')
                                                }
                                            }}
                                            placeholder="Tapez le mot..."
                                            disabled={!!feedback}
                                            style={{
                                                padding: '12px',
                                                border: '2px solid #8b5cf6',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                minWidth: '150px',
                                                textAlign: 'center'
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (keyboardInput.trim()) {
                                                    processVoiceResult(keyboardInput.trim())
                                                    setKeyboardInput('')
                                                }
                                            }}
                                            disabled={!keyboardInput.trim() || !!feedback}
                                            style={{
                                                backgroundColor: (!keyboardInput.trim() || feedback) ? '#ccc' : '#8b5cf6',
                                                color: 'white',
                                                padding: '12px 20px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                cursor: (!keyboardInput.trim() || feedback) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            ✓ OK
                                        </button>
                                    </div>
                                )}
                                
                                {transcript && (
                                    <div style={{
                                        marginTop: '20px',
                                        padding: '10px',
                                        background: '#e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        color: '#374151'
                                    }}>
                                        Vous avez dit : "<strong>{transcript}</strong>"
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feedback */}
                        {feedback && (
                            <div style={{
                                textAlign: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: feedback.includes('✅') ? '#10b981' : '#ef4444',
                                marginBottom: '20px',
                                padding: '15px',
                                background: feedback.includes('✅') ? '#ecfdf5' : '#fef2f2',
                                borderRadius: '8px'
                            }}>
                                {feedback}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ 
                            textAlign: 'center',
                            marginTop: '30px'
                        }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#6b7280',
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
                    </div>
                )}

                {/* Bouton retour */}
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button
                        onClick={() => router.push('/lire/mes-syllabes-mots')}
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
                        ← Retour aux exercices
                    </button>
                </div>
            </div>
        </div>
    )
}