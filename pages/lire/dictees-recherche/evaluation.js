import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function DicteesRechercheEvaluation() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTexteIds, setSelectedTexteIds] = useState([])
    const [phraseGeneree, setPhraseGeneree] = useState(null)
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [analysisResult, setAnalysisResult] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentTextIndex, setCurrentTextIndex] = useState(0)
    const [isMobile, setIsMobile] = useState(false)
    const [phraseCount, setPhraseCount] = useState(0)
    const [maxPhrases] = useState(10)
    const [etape, setEtape] = useState('exercice')
    const [phrasesReussies, setPhrasesReussies] = useState([])
    const [phrasesARevoir, setPhrasesARevoir] = useState([])
    const recognitionRef = useRef(null)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        const savedTextes = localStorage.getItem('dictee-recherche-textes')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        if (!savedTextes) {
            router.push('/lire/dictees-recherche')
            return
        }

        try {
            setUser(JSON.parse(userData))
            setSelectedTexteIds(JSON.parse(savedTextes))
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing data:', error)
            router.push('/login')
            return
        }

        // Détection mobile
        setIsMobile(window.innerWidth <= 768)

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
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const genererPhrase = async () => {
        if (selectedTexteIds.length === 0) return

        // Vérifier la limite de 10 phrases
        if (phraseCount >= maxPhrases) {
            setEtape('resultats')
            return
        }

        setIsGenerating(true)
        
        try {
            const token = localStorage.getItem('token')
            const allGroupes = []
            
            // Charger les groupes de chaque texte sélectionné
            for (const texteId of selectedTexteIds) {
                const response = await fetch(`/api/textes/get/${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    const groupesFiltered = (data.groupes_sens || [])
                        .filter(g => g.type_groupe === 'text' && g.contenu && g.contenu.trim())
                    
                    allGroupes.push(...groupesFiltered)
                } else {
                    console.error(`Erreur chargement texte ${texteId}`)
                }
            }

            if (allGroupes.length === 0) {
                throw new Error('Aucun groupe de sens trouvé')
            }

            const response = await fetch('/api/exercises/generer-phrase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupes_sens: allGroupes
                })
            })

            if (!response.ok) {
                throw new Error('Erreur génération phrase')
            }

            const data = await response.json()
            setPhraseGeneree(data)
            setPhraseCount(prev => prev + 1)
            setTranscript('')
            setAnalysisResult(null)
            
        } catch (error) {
            console.error('Erreur génération:', error)
            alert('Erreur lors de la génération de phrase')
        } finally {
            setIsGenerating(false)
        }
    }

    useEffect(() => {
        if (textes.length > 0 && selectedTexteIds.length > 0) {
            genererPhrase()
        }
    }, [textes, selectedTexteIds, currentTextIndex])

    const playAudio = async (text) => {
        if (!text.trim()) return

        // Essayer d'abord ElevenLabs
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7' // Paul (ElevenLabs)
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                await audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible, fallback vers Web Speech API')
        }

        // Utiliser Web Speech API en fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            window.speechSynthesis.speak(utterance)
        }
    }

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('La reconnaissance vocale n\'est pas supportée par ce navigateur')
            return
        }

        const recognition = new window.webkitSpeechRecognition()
        recognition.lang = 'fr-FR'
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onstart = () => {
            setIsListening(true)
            setTranscript('')
        }

        recognition.onresult = (event) => {
            let finalTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript
                }
            }
            if (finalTranscript) {
                setTranscript(prev => prev + ' ' + finalTranscript)
            }
        }

        recognition.onerror = (event) => {
            console.error('Erreur reconnaissance:', event.error)
            setIsListening(false)
        }

        recognition.onend = () => {
            setIsListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
        setIsListening(false)
    }

    const analyzeTranscript = () => {
        if (!transcript.trim() || !phraseGeneree) return

        setIsAnalyzing(true)

        const originalWords = phraseGeneree.phrase_generee
            .toLowerCase()
            .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0)

        const spokenWords = transcript
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0)

        const wordAnalysis = originalWords.map(originalWord => {
            const bestMatch = findBestMatch(originalWord, spokenWords)
            return {
                original: originalWord,
                spoken: bestMatch.word,
                score: bestMatch.score,
                status: bestMatch.score >= 0.9 ? 'parfait' : 
                       bestMatch.score >= 0.7 ? 'bien' : 
                       bestMatch.score >= 0.4 ? 'moyen' : 'manque'
            }
        })

        const totalScore = Math.round(
            (wordAnalysis.reduce((sum, word) => sum + word.score, 0) / wordAnalysis.length) * 100
        )

        setAnalysisResult({
            words: wordAnalysis,
            score: totalScore,
            originalPhrase: phraseGeneree.phrase_generee,
            spokenText: transcript.trim()
        })

        // Tracker la phrase selon le score
        if (phraseGeneree && phraseGeneree.phrase_generee) {
            if (totalScore >= 70) {
                // Score >= 70% : phrase réussie
                setPhrasesReussies(prev => [...prev, phraseGeneree.phrase_generee])
            } else {
                // Score < 70% : phrase à revoir
                setPhrasesARevoir(prev => [...prev, phraseGeneree.phrase_generee])
            }
        }

        setIsAnalyzing(false)
    }

    const findBestMatch = (originalWord, spokenWords) => {
        if (spokenWords.length === 0) {
            return { word: '', score: 0 }
        }

        let bestMatch = { word: '', score: 0 }

        for (const spokenWord of spokenWords) {
            let score = 0

            if (originalWord === spokenWord) {
                score = 1.0
            } else if (originalWord.includes(spokenWord) || spokenWord.includes(originalWord)) {
                score = 0.8
            } else {
                const distance = levenshteinDistance(originalWord, spokenWord)
                const maxLength = Math.max(originalWord.length, spokenWord.length)
                score = Math.max(0, 1 - (distance / maxLength))
                
                if (score < 0.3 && (originalWord.startsWith(spokenWord.substring(0, 2)) || 
                    spokenWord.startsWith(originalWord.substring(0, 2)))) {
                    score = 0.5
                }
            }

            if (score > bestMatch.score) {
                bestMatch = { word: spokenWord, score }
            }
        }

        return bestMatch
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

    const playWordAudio = async (word) => {
        await playAudio(`Le mot est : ${word}`)
    }

    const nextPhrase = () => {
        setTranscript('')
        setAnalysisResult(null)
        setPhraseGeneree(null)
        setIsGenerating(true)
        
        // Régénérer une nouvelle phrase
        setTimeout(() => {
            genererPhrase()
        }, 500)
    }

    const getWordGroupColor = (word) => {
        if (!phraseGeneree || !phraseGeneree.groupes_utilises) return '#e5e7eb'
        
        const groupIndex = phraseGeneree.groupes_utilises.findIndex(groupe => 
            groupe.toLowerCase().includes(word.toLowerCase())
        )
        
        const colors = ['#fef3c7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ecfdf5']
        return groupIndex !== -1 ? colors[groupIndex % colors.length] : '#e5e7eb'
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
                <div style={{ color: '#3b82f6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    // Page de résultats
    if (etape === 'resultats') {
        const score = phrasesReussies.length
        const total = phrasesReussies.length + phrasesARevoir.length

        return (
            <div style={{ minHeight: '100vh', background: 'white', padding: '15px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Titre + icônes de navigation */}
                    <h1 style={{
                        fontSize: isMobile ? '20px' : '28px',
                        fontWeight: 'bold',
                        color: '#14b8a6',
                        textAlign: 'center',
                        marginBottom: isMobile ? '10px' : '15px'
                    }}>
                        📊 Résultats - Mode Défi
                    </h1>

                    {/* Barre d'icônes */}
                    <div style={{
                        display: 'flex',
                        gap: isMobile ? '8px' : '10px',
                        justifyContent: 'center',
                        marginBottom: isMobile ? '15px' : '20px'
                    }}>
                        <button
                            onClick={() => router.push('/lire/dictees-recherche')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #64748b',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                            title="Menu dictées"
                        >
                            ←
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
                            onClick={() => {
                                // Recommencer l'exercice
                                setPhraseCount(0)
                                setPhrasesReussies([])
                                setPhrasesARevoir([])
                                setEtape('exercice')
                                setPhraseGeneree(null)
                                setTranscript('')
                                setAnalysisResult(null)
                                genererPhrase()
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'white',
                                border: '2px solid #14b8a6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                            title="Recommencer"
                        >
                            🔄
                        </button>
                    </div>

                    {/* Score */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            fontSize: isMobile ? '24px' : '32px',
                            fontWeight: 'bold',
                            color: '#14b8a6'
                        }}>
                            {score}/{total} phrases réussies (≥ 70%)
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
                                ✅ Phrases réussies ({phrasesReussies.length})
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
                                            padding: '8px 12px',
                                            background: '#f0fdf4',
                                            border: '2px solid #10b981',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '13px' : '15px',
                                            color: '#333',
                                            textAlign: 'center',
                                            maxWidth: '600px',
                                            width: '100%'
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
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{
                                fontSize: isMobile ? '16px' : '20px',
                                fontWeight: 'bold',
                                color: '#f59e0b',
                                marginBottom: '10px',
                                textAlign: 'center'
                            }}>
                                🔁 Phrases à revoir ({phrasesARevoir.length})
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
                                            padding: '8px 12px',
                                            background: '#fffbeb',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '8px',
                                            fontSize: isMobile ? '13px' : '15px',
                                            color: '#333',
                                            textAlign: 'center',
                                            maxWidth: '600px',
                                            width: '100%'
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
            padding: '15px'
        }}>
            <div style={{
                maxWidth: isMobile ? '800px' : '100%',
                margin: '0 auto',
                padding: isMobile ? '0' : '0 20px'
            }}>
                <h1 style={{
                    fontSize: 'clamp(18px, 4vw, 22px)',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <span style={{ color: '#3b82f6', fontSize: 'clamp(24px, 5vw, 28px)' }}>🔥</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        whiteSpace: 'nowrap'
                    }}>
                        Dictée Recherche - Mode Défi
                    </span>
                </h1>

                {/* Compteur de phrases */}
                <p style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: phraseCount >= maxPhrases ? '#dc2626' : '#666',
                    marginBottom: '10px',
                    fontWeight: phraseCount >= maxPhrases ? 'bold' : 'normal'
                }}>
                    Phrase {phraseCount}/{maxPhrases}
                </p>

                {/* Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '10px'
                }}>
                    <button
                        onClick={() => router.push('/lire/dictees-recherche')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#64748b',
                            border: '2px solid #64748b',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: '#8b5cf6',
                            border: '2px solid #8b5cf6',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                </div>

                {isGenerating ? (
                    <div style={{
                        background: '#f0f9ff',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '18px', color: '#3b82f6' }}>
                            🤖 Génération d'une nouvelle phrase...
                        </div>
                    </div>
                ) : phraseGeneree ? (
                    <div>
                        {/* Titre Répétez la phrase */}
                        <h3 style={{
                            textAlign: 'center',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: 'normal',
                            marginBottom: '15px'
                        }}>
                            Répétez la phrase
                        </h3>

                        <div style={{
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: isMobile ? '14px' : '22px',
                                fontWeight: 'bold',
                                margin: '0 15px 10px 15px',
                                padding: isMobile ? '15px 10px' : '25px',
                                background: 'white',
                                borderRadius: '12px',
                                lineHeight: '1.4',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: isMobile ? '4px' : '8px',
                                justifyContent: 'center'
                            }}>
                                {phraseGeneree.groupes_utilises && phraseGeneree.groupes_utilises.map((groupe, index) => {
                                    const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#f3e8ff', '#fed7aa', '#ecfdf5']

                                    return (
                                        <span
                                            key={index}
                                            style={{
                                                backgroundColor: colors[index % colors.length],
                                                padding: isMobile ? '8px 12px' : '12px 20px',
                                                borderRadius: isMobile ? '6px' : '10px',
                                                border: '2px solid transparent',
                                                display: 'inline-block',
                                                whiteSpace: 'nowrap',
                                                fontSize: isMobile ? '13px' : 'inherit',
                                                maxWidth: isMobile ? 'calc(100vw - 80px)' : 'none',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {groupe}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>

                            {!isListening ? (
                                <button
                                    onClick={startListening}
                                    style={{
                                        backgroundColor: 'white',
                                        color: '#10b981',
                                        padding: '15px 30px',
                                        border: '3px solid #10b981',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🎤 Commencer
                                </button>
                            ) : (
                                <div>
                                    <div style={{
                                        fontSize: '16px',
                                        color: '#dc2626',
                                        marginBottom: '15px'
                                    }}>
                                        🔴 Enregistrement en cours... Parlez maintenant !
                                    </div>
                                    
                                    <button
                                        onClick={stopListening}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⏹️ Arrêter
                                    </button>
                                </div>
                            )}

                            {transcript && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db'
                                }}>
                                    <strong>Ce que j'ai entendu :</strong><br/>
                                    {transcript}
                                </div>
                            )}

                            {transcript && !isAnalyzing && (
                                <button
                                    onClick={analyzeTranscript}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginTop: '15px'
                                    }}
                                >
                                    📊 Voir mon score
                                </button>
                            )}

                            {isAnalyzing && (
                                <div style={{ 
                                    marginTop: '15px',
                                    color: '#3b82f6',
                                    fontSize: '16px'
                                }}>
                                    🔍 Analyse en cours...
                                </div>
                            )}
                        </div>

                        {analysisResult && (
                            <div style={{
                                padding: '20px',
                                borderRadius: '12px',
                                marginBottom: '30px'
                            }}>
                                <h3 style={{
                                    textAlign: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    color: analysisResult.score >= 70 ? '#16a34a' : analysisResult.score >= 50 ? '#ea580c' : '#dc2626'
                                }}>
                                    🎯 Score : {analysisResult.score}%
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: '10px',
                                    marginBottom: '20px'
                                }}>
                                    {analysisResult.words.map((wordResult, index) => (
                                        <div
                                            key={index}
                                            onClick={() => playWordAudio(wordResult.original)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                backgroundColor: getWordGroupColor(wordResult.original),
                                                border: wordResult.status === 'parfait' ? '3px solid #22c55e' :
                                                       wordResult.status === 'bien' ? '3px solid #16a34a' :
                                                       wordResult.status === 'moyen' ? '3px solid #ea580c' : '3px solid #dc2626'
                                            }}
                                        >
                                            {wordResult.original}
                                            <div style={{
                                                fontSize: '12px',
                                                marginTop: '5px',
                                                color: wordResult.status === 'parfait' ? '#22c55e' :
                                                       wordResult.status === 'bien' ? '#16a34a' :
                                                       wordResult.status === 'moyen' ? '#ea580c' : '#dc2626'
                                            }}>
                                                {wordResult.status === 'parfait' ? '🎯 Parfait' :
                                                 wordResult.status === 'bien' ? '✅ Bien' :
                                                 wordResult.status === 'moyen' ? '⚠️ Moyen' : '❌ ?'}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ 
                                    textAlign: 'center',
                                    display: 'flex',
                                    gap: '15px',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <button
                                        onClick={() => playAudio(phraseGeneree.phrase_generee)}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            padding: '15px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔊 Écouter pour se corriger
                                    </button>
                                    
                                    <button
                                        onClick={nextPhrase}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            padding: '15px 30px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ➡️ Phrase suivante
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

            </div>
        </div>
    )
}