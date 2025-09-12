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
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🎤 Mode Défi - Dictée Recherche
                </h1>

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
                        <div style={{
                            background: '#f8f9fa',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ 
                                marginBottom: '20px', 
                                color: '#333',
                                fontSize: '20px'
                            }}>
                                📖 Phrase à lire
                            </h2>
                            
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                marginBottom: '20px',
                                padding: '20px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '2px solid #ddd'
                            }}>
                                {phraseGeneree.phrase_generee}
                            </div>
                        </div>

                        <div style={{
                            background: '#fff7ed',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ 
                                marginBottom: '20px', 
                                color: '#ea580c',
                                fontSize: '18px'
                            }}>
                                🎯 Répétez la phrase au microphone
                            </h3>

                            {!isListening ? (
                                <button
                                    onClick={startListening}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        padding: '15px 30px',
                                        border: 'none',
                                        borderRadius: '50px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🎤 Commencer l'enregistrement
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
                                background: '#f0fdf4',
                                padding: '30px',
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

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/lire/dictees-recherche')}
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
                        ← Retour au choix
                    </button>
                </div>
            </div>
        </div>
    )
}