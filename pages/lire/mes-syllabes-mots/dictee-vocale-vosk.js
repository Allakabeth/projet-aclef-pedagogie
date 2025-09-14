import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function DicteeVocaleVosk() {
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
    const [transcript, setTranscript] = useState('')
    const [voskReady, setVoskReady] = useState(false)
    const [voskModel, setVoskModel] = useState(null)
    const [audioContext, setAudioContext] = useState(null)
    const [inputMode, setInputMode] = useState('voice')
    const [keyboardInput, setKeyboardInput] = useState('')
    const recognizerRef = useRef(null)
    const router = useRouter()

    useEffect(() => {
        // Authentification d'abord
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

        // Puis charger Vosk
        loadVosk()
        
        setIsLoading(false)
    }, [router])

    const loadVosk = async () => {
        try {
            // Charger le script Vosk depuis CDN
            const script = document.createElement('script')
            script.src = 'https://alphacephei.com/vosk/js/vosk.js'
            script.onload = async () => {
                try {
                    console.log('Vosk script loaded')
                    
                    // Initialiser Vosk avec un petit modèle français
                    const model = await window.Vosk.createModel('/vosk-model-small-fr-0.22.zip')
                    setVoskModel(model)
                    setVoskReady(true)
                    console.log('Vosk model loaded')
                } catch (error) {
                    console.error('Erreur chargement modèle Vosk:', error)
                    // Fallback vers Web Speech API améliorée
                    setupImprovedWebSpeech()
                }
            }
            script.onerror = () => {
                console.log('Fallback vers Web Speech API améliorée')
                setupImprovedWebSpeech()
            }
            document.head.appendChild(script)
        } catch (error) {
            console.error('Erreur chargement Vosk:', error)
            setupImprovedWebSpeech()
        }
    }

    const setupImprovedWebSpeech = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setVoskReady(true) // On utilise Web Speech comme fallback
            console.log('Web Speech API disponible comme fallback')
        } else {
            console.error('Aucune reconnaissance vocale disponible')
        }
    }

    const startListening = async () => {
        if (!voskReady || isListening) return

        try {
            if (voskModel) {
                // Utiliser Vosk
                await startVoskRecognition()
            } else {
                // Fallback vers Web Speech API améliorée
                await startWebSpeechRecognition()
            }
        } catch (error) {
            console.error('Erreur démarrage reconnaissance:', error)
            setFeedback('❌ Erreur de reconnaissance vocale')
            setTimeout(() => setFeedback(''), 2000)
        }
    }

    const startVoskRecognition = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
            const source = context.createMediaStreamSource(stream)
            
            const recognizer = new window.Vosk.KaldiRecognizer(voskModel, 16000)
            recognizerRef.current = recognizer
            
            const processor = context.createScriptProcessor(4096, 1, 1)
            processor.onaudioprocess = (event) => {
                const audioData = event.inputBuffer.getChannelData(0)
                if (recognizer.AcceptWaveform(audioData)) {
                    const result = recognizer.Result()
                    const parsed = JSON.parse(result)
                    if (parsed.text) {
                        processVoiceResult(parsed.text.trim())
                        stopListening()
                    }
                }
            }
            
            source.connect(processor)
            processor.connect(context.destination)
            
            setAudioContext(context)
            setIsListening(true)
            setTranscript('')
            
            // Auto-stop après 5 secondes
            setTimeout(() => {
                if (isListening) stopListening()
            }, 5000)
            
        } catch (error) {
            console.error('Erreur Vosk:', error)
            // Fallback vers Web Speech
            await startWebSpeechRecognition()
        }
    }

    const startWebSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'fr-FR'
        recognition.maxAlternatives = 1
        
        recognition.onstart = () => {
            setIsListening(true)
            setTranscript('')
        }
        
        recognition.onresult = (event) => {
            const result = event.results[0][0].transcript.toLowerCase().trim()
            console.log('Web Speech result:', result)
            setTranscript(result)
            processVoiceResult(result)
        }
        
        recognition.onerror = (event) => {
            console.error('Erreur Web Speech:', event.error)
            setIsListening(false)
            setFeedback('❌ Erreur de reconnaissance. Réessayez.')
            setTimeout(() => setFeedback(''), 2000)
        }
        
        recognition.onend = () => {
            setIsListening(false)
        }
        
        recognition.start()
    }

    const stopListening = () => {
        if (audioContext) {
            audioContext.close()
            setAudioContext(null)
        }
        if (recognizerRef.current) {
            recognizerRef.current = null
        }
        setIsListening(false)
    }

    // Reprise du reste du code depuis l'autre fichier...
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

    const normalizeText = (text) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z]/g, '')
            .trim()
    }

    const isPhoneticallySimilar = (spoken, target) => {
        const spokenNorm = normalizeText(spoken)
        const targetNorm = normalizeText(target)
        
        if (spokenNorm === targetNorm) return true
        
        const phoneticMappings = {
            'mets': 'mes', 'met': 'mes', 'mais': 'mes',
            'jeux': 'je', 'jeu': 'je', 'jeune': 'je', 'g': 'je', 'gi': 'je',
            'des': 'de', 'dais': 'de', 'dans': 'de', 'd': 'de',
            'est': 'et', 'ais': 'et', 'eh': 'et', 'hey': 'et', 'hais': 'et'
        }
        
        if (phoneticMappings[spokenNorm] === targetNorm || phoneticMappings[targetNorm] === spokenNorm) {
            return true
        }
        
        if (targetNorm.length <= 3) {
            const distance = levenshteinDistance(spokenNorm, targetNorm)
            if (targetNorm.length <= 2) {
                return distance <= 2
            } else {
                return distance <= 1
            }
        }
        
        return false
    }

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

    const processVoiceResult = (spokenText) => {
        if (!currentMot) return
        
        setAttempts(prev => prev + 1)
        
        console.log(`Comparaison: "${spokenText}" vs "${currentMot.contenu}"`)
        
        if (isPhoneticallySimilar(spokenText, currentMot.contenu)) {
            setScore(prev => prev + 1)
            
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

    const getSuggestionForWord = (word) => {
        const suggestions = {
            'je': 'prononcez "jeu" ou étirez le son "jeeee"',
            'de': 'prononcez "deu" ou étirez le son "deeee"',
            'et': 'prononcez "est" ou étirez le son "eeet"'
        }
        return suggestions[word.toLowerCase()] || null
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
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
        setKeyboardInput('')
    }

    const finishGame = () => {
        const percentage = attempts > 0 ? Math.round((score / attempts) * 100) : 0
        setFinalScore({ correct: score, total: attempts, percentage })
        setGameFinished(true)
    }

    const resetGame = () => {
        stopListening()
        
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
                    🎙️ Dictée Vocale (Gratuite)
                </h1>

                {!voskReady && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                            ⏳ Chargement de la reconnaissance vocale...
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
                                }}>🎙️ Mode Vocal (Gratuit)</button>
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
                                                <div key={texte.id} style={{
                                                    padding: '20px',
                                                    background: 'white',
                                                    borderRadius: '8px',
                                                    border: '1px solid #ddd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '15px'
                                                }}>
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
                                                disabled={selectedTextes.length === 0 || !voskReady}
                                                style={{
                                                    backgroundColor: (selectedTextes.length > 0 && voskReady) ? '#8b5cf6' : '#ccc',
                                                    color: 'white',
                                                    padding: '12px 30px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: (selectedTextes.length > 0 && voskReady) ? 'pointer' : 'not-allowed',
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
                        {/* Interface de jeu */}
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
                                    👁️ Regardez ce mot et {inputMode === 'voice' ? 'prononcez-le clairement' : 'tapez-le'} :
                                </h2>
                                
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

                                {inputMode === 'voice' ? (
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
                                ) : (
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
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

                                {transcript && inputMode === 'voice' && (
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