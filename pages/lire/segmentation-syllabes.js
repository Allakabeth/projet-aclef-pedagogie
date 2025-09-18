import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { syllabifyWord } from '../../lib/wordAnalyzer'

export default function SegmentationSyllabes() {
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
    const [cuts, setCuts] = useState([]) // Positions des coupures (indices entre les lettres)
    const [correctSyllables, setCorrectSyllables] = useState([])
    const [motsReussis, setMotsReussis] = useState([]) // Mots correctement segmentés
    const [motsRates, setMotsRates] = useState([]) // Mots incorrectement segmentés avec détails
    const [availableVoices, setAvailableVoices] = useState([
        { name: 'Paul', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7' },
        { name: 'Julie', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw' }
    ])
    const [selectedVoice, setSelectedVoice] = useState('Paul')
    const [autoRead, setAutoRead] = useState(false)
    const router = useRouter()

    useEffect(() => {
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

        // Charger les voix disponibles avec système transparent
        const loadAllVoices = () => {
            const allVoices = [
                {
                    name: 'Paul',
                    type: 'elevenlabs',
                    id: 'AfbuxQ9DVtS4azaxN1W7',
                    lang: 'fr-FR',
                    fallback: null
                },
                {
                    name: 'Julie',
                    type: 'elevenlabs',
                    id: 'tMyQcCxfGDdIt7wJ2RQw',
                    lang: 'fr-FR',
                    fallback: null
                }
            ]

            // Chercher des voix fallback Web Speech API
            if ('speechSynthesis' in window) {
                const webVoices = speechSynthesis.getVoices()

                // Trouver les voix fallback
                const paulFallback = webVoices.find(voice =>
                    voice.lang.includes('fr') &&
                    (voice.name.toLowerCase().includes('paul') ||
                     voice.name.toLowerCase().includes('thomas') ||
                     voice.name.toLowerCase().includes('male'))
                ) || webVoices.find(voice => voice.lang.includes('fr'))

                const julieFallback = webVoices.find(voice =>
                    voice.lang.includes('fr') &&
                    (voice.name.toLowerCase().includes('julie') ||
                     voice.name.toLowerCase().includes('marie') ||
                     voice.name.toLowerCase().includes('amelie') ||
                     voice.name.toLowerCase().includes('female'))
                ) || webVoices.find(voice => voice.lang.includes('fr'))

                // Assigner les fallbacks
                allVoices[0].fallback = paulFallback
                allVoices[1].fallback = julieFallback
            }

            console.log('Voix chargées:', allVoices)
            setAvailableVoices(allVoices)
            if (allVoices.length > 0) {
                setSelectedVoice('Paul')
            }
        }

        loadAllVoices()
        if ('speechSynthesis' in window) {
            speechSynthesis.addEventListener('voiceschanged', loadAllVoices)
            return () => {
                speechSynthesis.removeEventListener('voiceschanged', loadAllVoices)
            }
        }
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
                const response = await fetch(`/api/mots-classifies/multisyllabes?texteId=${texte.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                
                if (response.ok) {
                    const data = await response.json()
                    details[texte.id] = {
                        nombreMultisyllabes: data.multisyllabes?.length || 0
                    }
                }
            } catch (error) {
                console.error(`Erreur chargement détails texte ${texte.id}:`, error)
                details[texte.id] = { nombreMultisyllabes: 0 }
            }
        }
        
        setTextesDetails(details)
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        try {
            const token = localStorage.getItem('token')
            let tousLesMultisyllabes = []
            
            for (const texteId of selectedTextes) {
                const response = await fetch(`/api/mots-classifies/multisyllabes?texteId=${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    tousLesMultisyllabes.push(...(data.multisyllabes || []))
                }
            }
            
            const multisyllabesUniques = [...new Set(tousLesMultisyllabes)]
            
            if (multisyllabesUniques.length === 0) {
                alert('Aucun mot multisyllabe trouvé pour les textes sélectionnés')
                return
            }

            console.log('Syllabification avec Coupe-Mots pour', multisyllabesUniques.length, 'mots')

            // Utiliser l'API Coupe-Mots pour la syllabification
            const syllabificationResponse = await fetch('/api/syllabification/coupe-mots', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mots: multisyllabesUniques
                })
            })

            let syllabifications = {}
            if (syllabificationResponse.ok) {
                const syllabData = await syllabificationResponse.json()
                syllabifications = syllabData.syllabifications || {}
                console.log('Syllabifications Coupe-Mots reçues:', syllabifications)
            } else {
                console.error('Erreur syllabification Coupe-Mots, utilisation fallback')
                // Fallback sur l'ancienne méthode
                multisyllabesUniques.forEach(mot => {
                    syllabifications[mot] = syllabifyWord(mot)
                })
            }

            const motsAvecIndex = multisyllabesUniques.map((mot, index) => ({
                id: index,
                contenu: mot,
                syllables: syllabifications[mot] || syllabifyWord(mot)
            }))

            console.log('Mots avec syllabification:', motsAvecIndex.slice(0, 5))

            setAllMots(motsAvecIndex)
            const shuffled = [...motsAvecIndex].sort(() => Math.random() - 0.5)
            setShuffledMots(shuffled)
            setCompletedMots([])
            setScore(0)
            setAttempts(0)
            setGameFinished(false)
            setFeedback('')
            setMotsReussis([])
            setMotsRates([])
            
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

        // Filtrer les mots déjà complétés pour éviter les doublons
        const reallyRemainingMots = remainingMots.filter(m => !completed.find(c => c.id === m.id))
        
        if (reallyRemainingMots.length === 0) {
            finishGame()
            return
        }

        const nextMot = reallyRemainingMots[0]
        setCurrentMot(nextMot)
        setCorrectSyllables(nextMot.syllables)
        setCuts([])
        setFeedback('')

        console.log('Mot:', nextMot.contenu, 'Syllabes attendues:', nextMot.syllables)
        console.log(`Mots restants: ${reallyRemainingMots.length}, Mots complétés: ${completed.length}`)

        // Lecture automatique si activée
        if (autoRead && nextMot) {
            setTimeout(() => speakText(nextMot.contenu), 1000)
        }
    }

    const handleLetterClick = (index) => {
        if (feedback) return // Pas de clic pendant le feedback
        
        // Toggle la coupure à cette position
        setCuts(prevCuts => {
            if (prevCuts.includes(index)) {
                // Enlever la coupure
                return prevCuts.filter(cut => cut !== index)
            } else {
                // Ajouter la coupure
                return [...prevCuts, index].sort((a, b) => a - b)
            }
        })
    }

    const validateSegmentation = () => {
        if (!currentMot || cuts.length === 0) {
            alert('Faites au moins une coupure pour séparer les syllabes')
            return
        }

        setAttempts(attempts + 1)
        
        // Reconstruire les syllabes à partir des coupures
        const userSyllables = []
        let startIndex = 0
        
        // Ajouter les coupures triées plus la fin du mot
        const allCuts = [...cuts.sort((a, b) => a - b), currentMot.contenu.length]
        
        for (const cutIndex of allCuts) {
            if (cutIndex > startIndex) {
                userSyllables.push(currentMot.contenu.slice(startIndex, cutIndex))
                startIndex = cutIndex
            }
        }
        
        console.log('Segmentation utilisateur:', userSyllables)
        console.log('Segmentation correcte:', correctSyllables)
        
        // Comparer les segmentations (normaliser en minuscules)
        const userSyllablesNorm = userSyllables.map(s => s.toLowerCase())
        const correctSyllablesNorm = correctSyllables.map(s => s.toLowerCase())
        
        const isCorrect = userSyllablesNorm.length === correctSyllablesNorm.length &&
                         userSyllablesNorm.every((syllable, index) => syllable === correctSyllablesNorm[index])
        
        if (isCorrect) {
            setScore(score + 1)
            setFeedback(`✅ Parfait ! ${currentMot.contenu} = ${correctSyllables.join(' - ')}`)
            
            // Ajouter aux mots réussis
            const motReussi = {
                mot: currentMot.contenu,
                segmentationUtilisateur: userSyllables,
                segmentationCorrecte: correctSyllables
            }
            setMotsReussis(prev => [...prev, motReussi])
            
            const newCompleted = [...completedMots, currentMot]
            setCompletedMots(newCompleted)
            
            const remaining = shuffledMots.filter(m => !newCompleted.find(c => c.id === m.id))
            
            setTimeout(() => {
                setFeedback('')
                nextRound(remaining, newCompleted)
            }, 2000)
        } else {
            setFeedback(`❌ Pas tout à fait ! Vous avez fait : ${userSyllables.join(' - ')}. 
                        La bonne segmentation : ${correctSyllables.join(' - ')}`)
            
            // Ajouter aux mots ratés
            const motRate = {
                mot: currentMot.contenu,
                segmentationUtilisateur: userSyllables,
                segmentationCorrecte: correctSyllables
            }
            setMotsRates(prev => [...prev, motRate])
            
            setTimeout(() => {
                setFeedback('')
                // Retirer le mot raté des mots shufflés ET l'ajouter aux complétés pour éviter qu'il réapparaisse
                const remaining = shuffledMots.filter(m => m.id !== currentMot.id)
                const newCompleted = [...completedMots, currentMot]
                setShuffledMots(remaining)
                setCompletedMots(newCompleted)
                nextRound(remaining, newCompleted)
            }, 4000)
        }
    }

    const renderWordWithCuts = () => {
        if (!currentMot) return null
        
        const letters = currentMot.contenu.split('')
        const elements = []
        
        letters.forEach((letter, index) => {
            // Ajouter la lettre
            elements.push(
                <span
                    key={`letter-${index}`}
                    style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: '#374151',
                        cursor: 'default'
                    }}
                >
                    {letter}
                </span>
            )
            
            // Ajouter un espace cliquable après chaque lettre (sauf la dernière)
            if (index < letters.length - 1) {
                const hasCut = cuts.includes(index + 1)
                elements.push(
                    <span
                        key={`cut-${index}`}
                        onClick={() => handleLetterClick(index + 1)}
                        style={{
                            display: 'inline-block',
                            width: hasCut ? '20px' : '4px',
                            height: '40px',
                            cursor: feedback ? 'not-allowed' : 'pointer',
                            position: 'relative',
                            margin: '0 2px'
                        }}
                    >
                        {hasCut && (
                            <span style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '24px',
                                color: '#ef4444'
                            }}>
                                ✂️
                            </span>
                        )}
                        {!hasCut && (
                            <div
                                style={{
                                    width: '2px',
                                    height: '100%',
                                    background: feedback ? 'transparent' : '#d1d5db',
                                    margin: '0 auto',
                                    borderRadius: '1px',
                                    opacity: 0.5
                                }}
                                onMouseOver={(e) => !feedback && (e.target.style.background = '#6366f1')}
                                onMouseOut={(e) => !feedback && (e.target.style.background = '#d1d5db')}
                            />
                        )}
                    </span>
                )
            }
        })
        
        return elements
    }

    const finishGame = () => {
        const percentage = attempts > 0 ? Math.round((score / attempts) * 100) : 0
        setFinalScore({ correct: score, total: attempts, percentage })
        setGameFinished(true)
    }

    const resetGame = () => {
        setGameStarted(false)
        setSelectedTextes([])
        setAllMots([])
        setCurrentMot(null)
        setScore(0)
        setAttempts(0)
        setGameFinished(false)
        setCompletedMots([])
        setFeedback('')
        setCuts([])
        setCorrectSyllables([])
        setMotsReussis([])
        setMotsRates([])
    }

    // Fonction TTS intelligente Paul/Julie avec auto-détection ElevenLabs/Web Speech
    const speakText = async (text) => {
        if (!text.trim()) return

        const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice)
        if (!selectedVoiceObj) return

        // Ajouter contexte français pour mots isolés
        let textToSpeak = text
        if (!text.includes(' ') && text.length >= 1) {
            textToSpeak = `Le mot "${text}".`
        }

        // Créer clé de cache
        const cacheKey = `voice_${selectedVoice}_${btoa(textToSpeak).replace(/[^a-zA-Z0-9]/g, '')}`

        // Vérifier le cache ElevenLabs
        const cachedAudio = localStorage.getItem(cacheKey)
        if (cachedAudio) {
            try {
                const audio = new Audio(cachedAudio)
                audio.play()
                return
            } catch (error) {
                localStorage.removeItem(cacheKey)
            }
        }

        // Essayer ElevenLabs en premier
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    voice_id: selectedVoiceObj.id
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Sauvegarder en cache permanent
                try {
                    localStorage.setItem(cacheKey, data.audio)
                } catch (storageError) {
                    // Nettoyer les anciens caches si plein
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('voice_')) {
                            localStorage.removeItem(key)
                        }
                    })
                }

                const audio = new Audio(data.audio)
                audio.play()
                return
            }
        } catch (error) {
            // Fallback silencieux vers Web Speech API
        }

        // Utiliser Web Speech API en fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8

            // Utiliser la voix fallback appropriée
            if (selectedVoiceObj.fallback) {
                utterance.voice = selectedVoiceObj.fallback
            }

            window.speechSynthesis.speak(utterance)
        }
    }

    const envoyerSignalementAdmin = async (motRate) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/admin/signalement-syllabification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mot: motRate.mot,
                    segmentationUtilisateur: motRate.segmentationUtilisateur,
                    segmentationCorrecte: motRate.segmentationCorrecte,
                    utilisateur: user?.identifiant || user?.email || 'Utilisateur inconnu'
                })
            })

            if (response.ok) {
                const result = await response.json()
                const statusMessage = result.saved_to_db 
                    ? "✅ Signalement sauvé en base de données"
                    : "⚠️ Signalement reçu et loggé (BDD non configurée)"
                
                alert(`${statusMessage}\n\nMot: "${motRate.mot}"\n\nMerci de nous aider à améliorer la syllabification !`)
            } else {
                const errorData = await response.json()
                console.error('Erreur réponse serveur:', errorData)
                
                if (errorData.error?.includes('Table de signalements non configurée')) {
                    alert(`❌ Le système de signalement n'est pas encore configuré.\n\nVeuillez contacter l'administrateur pour activer cette fonctionnalité.`)
                } else {
                    alert(`❌ Erreur lors de l'envoi du signalement:\n${errorData.error || 'Erreur inconnue'}`)
                }
            }
        } catch (error) {
            console.error('Erreur signalement:', error)
            alert(`❌ Erreur de connexion lors de l'envoi du signalement.\n\nVérifiez votre connexion internet et réessayez.`)
        }
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

    const getTotalMultisyllabes = () => {
        return selectedTextes.reduce((total, texteId) => {
            return total + (textesDetails[texteId]?.nombreMultisyllabes || 0)
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
                <div style={{ color: '#f59e0b', fontSize: '18px' }}>Chargement...</div>
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
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    ✂️ Segmentation des Syllabes
                </h1>

                {!gameStarted ? (
                    <div>
                        <p style={{
                            textAlign: 'center',
                            marginBottom: '30px',
                            color: '#666',
                            fontSize: '16px'
                        }}>
                            Découpez les mots en syllabes avec les ciseaux
                        </p>

                        {/* Paramètres audio */}
                        <div style={{
                            background: '#f0f9ff',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', color: '#0284c7' }}>🔊 Paramètres audio</h3>

                            {/* Choix de la voix */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}>
                                    Voix de lecture :
                                </label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px'
                                    }}
                                >
                                    {availableVoices.map(voice => (
                                        <option key={voice.name} value={voice.name}>
                                            {voice.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Lecture automatique */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={autoRead}
                                        onChange={(e) => setAutoRead(e.target.checked)}
                                        style={{ transform: 'scale(1.2)' }}
                                    />
                                    <span>Lire automatiquement chaque mot</span>
                                </label>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    marginLeft: '24px',
                                    marginTop: '4px'
                                }}>
                                    Si coché, les mots seront prononcés automatiquement
                                </p>
                            </div>

                            {/* Test de la voix */}
                            <button
                                onClick={() => speakText('Bonjour, ceci est un test de la voix sélectionnée')}
                                disabled={availableVoices.length === 0}
                                style={{
                                    backgroundColor: '#0284c7',
                                    color: 'white',
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    cursor: availableVoices.length > 0 ? 'pointer' : 'not-allowed',
                                    opacity: availableVoices.length > 0 ? 1 : 0.5
                                }}
                            >
                                🎵 Tester la voix
                            </button>
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
                                                                `${details.nombreMultisyllabes} mots multisyllabes` :
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
                                        background: '#fef3c7',
                                        borderRadius: '8px'
                                    }}>
                                        {selectedTextes.length > 0 && (
                                            <div style={{ marginBottom: '15px' }}>
                                                <strong style={{ color: '#d97706' }}>
                                                    {selectedTextes.length} texte{selectedTextes.length > 1 ? 's' : ''} sélectionné{selectedTextes.length > 1 ? 's' : ''} • 
                                                    {getTotalMultisyllabes()} mots multisyllabes au total
                                                </strong>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={startGame}
                                                disabled={selectedTextes.length === 0}
                                                style={{
                                                    backgroundColor: selectedTextes.length > 0 ? '#f59e0b' : '#ccc',
                                                    color: 'white',
                                                    padding: '12px 30px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
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
                    <div>
                        <div style={{
                            background: '#f0fdf4',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px',
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
                        </div>

                        {/* Récapitulatif détaillé */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            {/* Mots réussis */}
                            <div style={{
                                background: '#ecfdf5',
                                padding: '20px',
                                borderRadius: '12px',
                                border: '2px solid #10b981'
                            }}>
                                <h3 style={{ 
                                    color: '#059669', 
                                    marginBottom: '15px',
                                    fontSize: '18px',
                                    textAlign: 'center'
                                }}>
                                    ✅ Mots réussis ({motsReussis.length})
                                </h3>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {motsReussis.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                            Aucun mot réussi
                                        </p>
                                    ) : (
                                        motsReussis.map((mot, index) => (
                                            <div key={index} style={{
                                                background: '#f0fdf4',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                marginBottom: '8px',
                                                border: '1px solid #bbf7d0'
                                            }}>
                                                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                                                    {mot.mot}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#047857' }}>
                                                    {mot.segmentationCorrecte.join(' - ')}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Mots ratés */}
                            <div style={{
                                background: '#fef2f2',
                                padding: '20px',
                                borderRadius: '12px',
                                border: '2px solid #ef4444'
                            }}>
                                <h3 style={{ 
                                    color: '#dc2626', 
                                    marginBottom: '15px',
                                    fontSize: '18px',
                                    textAlign: 'center'
                                }}>
                                    ❌ Mots ratés ({motsRates.length})
                                </h3>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {motsRates.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                            Aucun mot raté ! 🎉
                                        </p>
                                    ) : (
                                        motsRates.map((mot, index) => (
                                            <div key={index} style={{
                                                background: '#fef2f2',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                marginBottom: '10px',
                                                border: '1px solid #fecaca'
                                            }}>
                                                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '5px' }}>
                                                    {mot.mot}
                                                </div>
                                                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                                                    <div style={{ color: '#dc2626' }}>
                                                        Votre réponse: {mot.segmentationUtilisateur.join(' - ')}
                                                    </div>
                                                    <div style={{ color: '#059669' }}>
                                                        Correct: {mot.segmentationCorrecte.join(' - ')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => envoyerSignalementAdmin(mot)}
                                                    style={{
                                                        backgroundColor: '#f59e0b',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        width: '100%'
                                                    }}
                                                    title="Signaler une erreur de segmentation"
                                                >
                                                    🚨 Signaler erreur
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#f59e0b',
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
                            background: '#fef3c7',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ color: '#d97706', marginBottom: '10px' }}>
                                📊 Score : {score}/{attempts} ({attempts > 0 ? Math.round((score/attempts)*100) : 0}%)
                            </h3>
                            <p style={{ color: '#666', fontSize: '14px' }}>
                                Mots restants : {Math.max(0, allMots.length - completedMots.length)}
                            </p>
                        </div>

                        {/* Instructions */}
                        <div style={{
                            background: '#f0f9ff',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <p style={{ 
                                color: '#1d4ed8',
                                fontSize: '16px',
                                margin: '0'
                            }}>
                                ✂️ Cliquez entre les lettres pour découper le mot en syllabes
                            </p>
                        </div>

                        {/* Mot à découper */}
                        {currentMot && (
                            <div style={{
                                background: '#fff7ed',
                                padding: '40px',
                                borderRadius: '12px',
                                marginBottom: '30px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '15px',
                                    marginBottom: '30px',
                                    flexWrap: 'wrap'
                                }}>
                                    <h2 style={{
                                        color: '#ea580c',
                                        margin: '0',
                                        fontSize: '24px'
                                    }}>
                                        Découpez ce mot :
                                    </h2>
                                    <button
                                        onClick={() => speakText(currentMot.contenu)}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            padding: '8px 12px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        title="Écouter le mot"
                                    >
                                        🔊 Écouter
                                    </button>
                                </div>
                                
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0',
                                    marginBottom: '30px',
                                    padding: '20px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}>
                                    {renderWordWithCuts()}
                                </div>

                                <button
                                    onClick={validateSegmentation}
                                    disabled={!!feedback || cuts.length === 0}
                                    style={{
                                        backgroundColor: (feedback || cuts.length === 0) ? '#ccc' : '#f59e0b',
                                        color: 'white',
                                        padding: '12px 30px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: (feedback || cuts.length === 0) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ✅ Valider la segmentation
                                </button>

                                {cuts.length === 0 && (
                                    <p style={{
                                        color: '#6b7280',
                                        fontSize: '14px',
                                        marginTop: '10px',
                                        fontStyle: 'italic'
                                    }}>
                                        Faites au moins une coupure pour valider
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Feedback */}
                        {feedback && (
                            <div style={{
                                textAlign: 'center',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: feedback.includes('✅') ? '#10b981' : '#ef4444',
                                marginBottom: '20px',
                                padding: '20px',
                                background: feedback.includes('✅') ? '#ecfdf5' : '#fef2f2',
                                borderRadius: '8px',
                                whiteSpace: 'pre-line'
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
                        onClick={() => router.push('/lire')}
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
                        ← Retour au menu Lire
                    </button>
                </div>
            </div>
        </div>
    )
}