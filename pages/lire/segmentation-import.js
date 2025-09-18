import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import mammoth from 'mammoth'
import JSZip from 'jszip'

export default function SegmentationImport() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedFile, setSelectedFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [extractedText, setExtractedText] = useState('')
    const [currentWord, setCurrentWord] = useState('')
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [words, setWords] = useState([])
    const [cuts, setCuts] = useState([]) // Positions des coupures (indices entre les lettres)
    const [gameStarted, setGameStarted] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [correctSyllables, setCorrectSyllables] = useState([])
    const [syllabifications, setSyllabifications] = useState({})
    const [motsReussis, setMotsReussis] = useState([])
    const [motsRates, setMotsRates] = useState([])
    const [gameFinished, setGameFinished] = useState(false)
    const [signalementsEnvoyes, setSignalementsEnvoyes] = useState([])
    const [availableVoices, setAvailableVoices] = useState([
        { name: 'Paul', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7' },
        { name: 'Julie', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw' }
    ])
    const [selectedVoice, setSelectedVoice] = useState('Paul')
    const [autoRead, setAutoRead] = useState(false)
    const router = useRouter()

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

    // Fonction de compatibilité pour l'ancien nom
    const speakWord = (word) => speakText(word)

    // Fonction pour extraire le texte des fichiers .docx
    const extractTextFromDocx = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            return result.value
        } catch (error) {
            console.error('Erreur extraction .docx:', error)
            throw new Error('Impossible de lire le fichier Word')
        }
    }

    // Fonction pour extraire le texte des fichiers .odt
    const extractTextFromOdt = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer()
            const zip = await JSZip.loadAsync(arrayBuffer)
            const contentXml = await zip.file('content.xml').async('string')

            // Parser le XML et extraire le texte
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(contentXml, 'application/xml')

            // Extraire tout le texte des éléments text:p (paragraphes)
            const textNodes = xmlDoc.getElementsByTagName('text:p')
            let extractedText = ''

            for (let i = 0; i < textNodes.length; i++) {
                extractedText += textNodes[i].textContent + '\n'
            }

            return extractedText.trim()
        } catch (error) {
            console.error('Erreur extraction .odt:', error)
            throw new Error('Impossible de lire le fichier OpenDocument')
        }
    }

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
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

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const processFile = async () => {
        if (!selectedFile) return

        setIsProcessing(true)

        try {
            let text = ''

            // Traitement selon le type de fichier
            if (selectedFile.type === 'text/plain') {
                text = await selectedFile.text()
            } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      selectedFile.name.endsWith('.docx')) {
                text = await extractTextFromDocx(selectedFile)
            } else if (selectedFile.type === 'application/vnd.oasis.opendocument.text' ||
                      selectedFile.name.endsWith('.odt')) {
                text = await extractTextFromOdt(selectedFile)
            } else {
                alert('⚠️ Formats supportés :\n• Fichiers texte (.txt)\n• Documents Word (.docx)\n• Documents OpenDocument (.odt)')
                return
            }

            setExtractedText(text)

            // Extraire les mots (supprimer ponctuation et espaces multiples)
            const wordsArray = [...new Set(text // Utiliser Set pour supprimer les doublons
                .toLowerCase()
                .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2) // Mots d'au moins 3 lettres
            )].slice(0, 50) // Limiter à 50 mots uniques pour l'exercice

            if (wordsArray.length === 0) {
                alert('❌ Aucun mot exploitable trouvé dans le fichier.\nVérifiez que le document contient du texte.')
                return
            }

            setWords(wordsArray)
            setCurrentWordIndex(0)
            setCurrentWord(wordsArray[0])
            setCuts([])
            setGameStarted(true)

            // Lecture automatique du premier mot si activée
            if (autoRead && wordsArray[0]) {
                setTimeout(() => speakText(wordsArray[0]), 1000)
            }
        } catch (error) {
            console.error('Erreur traitement fichier:', error)
            alert('❌ Erreur lors du traitement du fichier : ' + (error.message || 'Format non supporté'))
        } finally {
            setIsProcessing(false)
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

    const validateSegmentation = async () => {
        if (feedback) return // Éviter les doubles validations
        
        setAttempts(attempts + 1)
        
        // Reconstruire les syllabes à partir des coupures
        const userSyllables = []
        let startIndex = 0
        
        // Ajouter les coupures triées plus la fin du mot
        const allCuts = [...cuts.sort((a, b) => a - b), currentWord.length]
        
        for (const cutIndex of allCuts) {
            if (cutIndex > startIndex) {
                userSyllables.push(currentWord.slice(startIndex, cutIndex))
                startIndex = cutIndex
            }
        }

        // Obtenir la syllabification correcte
        let correctSyllables = []
        
        try {
            // D'abord vérifier si on a déjà la syllabification en cache
            if (syllabifications[currentWord]) {
                correctSyllables = syllabifications[currentWord]
            } else {
                // Appeler l'API de syllabification
                const token = localStorage.getItem('token')
                const response = await fetch('/api/syllabification/coupe-mots', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        mots: [currentWord]
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    correctSyllables = data.syllabifications[currentWord] || [currentWord]
                    // Mettre en cache
                    setSyllabifications(prev => ({
                        ...prev,
                        [currentWord]: correctSyllables
                    }))
                } else {
                    // Fallback : considérer comme monosyllabe
                    correctSyllables = [currentWord]
                }
            }
        } catch (error) {
            console.error('Erreur syllabification:', error)
            correctSyllables = [currentWord] // Fallback
        }

        // Comparer avec la segmentation de l'utilisateur
        const isCorrect = userSyllables.length === correctSyllables.length && 
                         userSyllables.every((syllable, index) => syllable === correctSyllables[index])

        if (isCorrect) {
            setFeedback(`✅ Parfait ! ${currentWord} = ${correctSyllables.join(' - ')}`)
            setScore(score + 1)
            
            // Ajouter aux mots réussis
            const motReussi = {
                mot: currentWord,
                segmentationUtilisateur: userSyllables,
                segmentationCorrecte: correctSyllables
            }
            setMotsReussis(prev => [...prev, motReussi])
        } else {
            setFeedback(`❌ Pas tout à fait ! Vous avez fait : ${userSyllables.join(' - ')}. La bonne segmentation : ${correctSyllables.join(' - ')}`)
            
            // Ajouter aux mots ratés
            const motRate = {
                mot: currentWord,
                segmentationUtilisateur: userSyllables,
                segmentationCorrecte: correctSyllables
            }
            setMotsRates(prev => [...prev, motRate])
        }

        setTimeout(() => {
            // Passer au mot suivant
            if (currentWordIndex < words.length - 1) {
                setCurrentWordIndex(currentWordIndex + 1)
                const nextWord = words[currentWordIndex + 1]
                setCurrentWord(nextWord)
                setCuts([])
                setFeedback('')

                // Lecture automatique si activée
                if (autoRead && nextWord) {
                    setTimeout(() => speakText(nextWord), 1000)
                }
            } else {
                // Exercice terminé - afficher les résultats
                setGameFinished(true)
            }
        }, 2000)
    }

    const renderWordWithCuts = () => {
        if (!currentWord) return null

        const letters = currentWord.split('')
        const elements = []

        letters.forEach((letter, index) => {
            // Ajouter la lettre
            elements.push(
                <span
                    key={`letter-${index}`}
                    style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: '#f59e0b',
                        margin: '0 2px'
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
                            width: '20px',
                            height: '50px',
                            cursor: 'pointer',
                            position: 'relative',
                            backgroundColor: hasCut ? '#fef3c7' : 'transparent',
                            borderRadius: '4px',
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
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '2px',
                                    height: '30px',
                                    backgroundColor: '#d1d5db',
                                    opacity: 0.5
                                }}
                            />
                        )}
                    </span>
                )
            }
        })

        return elements
    }

    const signalError = async (mot, segmentationUtilisateur, segmentationCorrecte) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/admin/signalement-syllabification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mot: mot,
                    segmentationUtilisateur: segmentationUtilisateur,
                    segmentationCorrecte: segmentationCorrecte,
                    utilisateur: user?.identifiant || user?.email || 'Utilisateur inconnu',
                    source: 'import-exercise' // Identifier que ça vient de l'exercice d'import
                })
            })

            if (response.ok) {
                const result = await response.json()
                console.log('Signalement envoyé avec succès:', result)
                // Ajouter le mot à la liste des signalements envoyés
                setSignalementsEnvoyes(prev => [...prev, mot])
            } else {
                const errorData = await response.json()
                console.error('Erreur réponse serveur:', errorData)
                // Garder juste une alerte discrète pour les erreurs techniques
                if (errorData.error?.includes('Table de signalements non configurée')) {
                    console.warn('❌ Le système de signalement n\'est pas encore configuré.')
                } else {
                    console.error('❌ Erreur lors de l\'envoi du signalement:', errorData.error || 'Erreur inconnue')
                }
            }
        } catch (error) {
            console.error('Erreur signalement:', error)
            alert(`❌ Erreur de connexion lors de l'envoi du signalement.\n\nVérifiez votre connexion internet et réessayez.`)
        }
    }

    const resetGame = () => {
        setGameStarted(false)
        setSelectedFile(null)
        setExtractedText('')
        setWords([])
        setCurrentWordIndex(0)
        setCurrentWord('')
        setCuts([])
        setFeedback('')
        setScore(0)
        setAttempts(0)
        setSyllabifications({})
        setMotsReussis([])
        setMotsRates([])
        setGameFinished(false)
        setSignalementsEnvoyes([])
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

    if (gameFinished) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    {/* Titre des résultats */}
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        🎯 Résultats de l'exercice
                    </h1>

                    {/* Score */}
                    <div style={{
                        background: '#f8fafc',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            fontSize: '24px',
                            color: '#333',
                            marginBottom: '10px'
                        }}>
                            Score : {score}/{attempts}
                        </div>
                        <div style={{
                            fontSize: '16px',
                            color: '#666'
                        }}>
                            {motsReussis.length} mots réussis • {motsRates.length} mots à revoir
                        </div>
                    </div>

                    {/* Mots ratés avec signalement */}
                    {motsRates.length > 0 && (
                        <div style={{
                            background: '#fef2f2',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '30px',
                            textAlign: 'left'
                        }}>
                            <h3 style={{
                                color: '#dc2626',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                ❌ Mots à revoir ({motsRates.length})
                            </h3>
                            
                            {motsRates.map((motRate, index) => (
                                <div key={index} style={{
                                    background: 'white',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    marginBottom: '15px',
                                    border: '1px solid #fecaca'
                                }}>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        color: '#dc2626',
                                        marginBottom: '10px'
                                    }}>
                                        {motRate.mot}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#666',
                                        marginBottom: '10px'
                                    }}>
                                        Votre segmentation : {motRate.segmentationUtilisateur.join(' - ')}<br/>
                                        Segmentation proposée : {motRate.segmentationCorrecte.join(' - ')}
                                    </div>
                                    {signalementsEnvoyes.includes(motRate.mot) ? (
                                        <div style={{
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            display: 'inline-block'
                                        }}>
                                            ✅ Signalé
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                const button = e.target
                                                button.textContent = '✅ Signalé'
                                                button.style.backgroundColor = '#059669'
                                                signalError(motRate.mot, motRate.segmentationUtilisateur, motRate.segmentationCorrecte)
                                                setTimeout(() => {
                                                    button.style.display = 'none'
                                                }, 1500)
                                            }}
                                            style={{
                                                backgroundColor: '#dc2626',
                                                color: 'white',
                                                padding: '8px 16px',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            📝 Signaler cette segmentation comme incorrecte
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Mots réussis */}
                    {motsReussis.length > 0 && (
                        <div style={{
                            background: '#ecfdf5',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '30px',
                            textAlign: 'left'
                        }}>
                            <h3 style={{
                                color: '#047857',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                ✅ Mots réussis ({motsReussis.length})
                            </h3>
                            
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                {motsReussis.map((motReussi, index) => (
                                    <span key={index} style={{
                                        background: 'white',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        color: '#047857',
                                        border: '1px solid #d1fae5'
                                    }}>
                                        {motReussi.mot}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Boutons d'action */}
                    <div style={{ marginBottom: '20px' }}>
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
                                cursor: 'pointer',
                                marginRight: '15px'
                            }}
                        >
                            🔄 Nouveau texte
                        </button>
                        
                        <button
                            onClick={() => router.push('/lire/segmentation-choix')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '12px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour au choix
                        </button>
                    </div>

                    {/* Info utilisateur */}
                    <div style={{
                        padding: '15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#64748b'
                    }}>
                        Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                    </div>
                </div>
            </div>
        )
    }

    if (gameStarted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        ✂️ Découpez avec les ciseaux
                    </h1>

                    {/* Progression */}
                    <div style={{
                        background: '#f8fafc',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            fontSize: '16px',
                            color: '#666',
                            marginBottom: '15px'
                        }}>
                            Mot {currentWordIndex + 1} sur {words.length} • Score: {score}/{attempts}
                        </div>
                        <div style={{
                            background: '#e5e7eb',
                            height: '8px',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                background: '#f59e0b',
                                height: '100%',
                                width: `${((currentWordIndex + 1) / words.length) * 100}%`,
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div style={{
                        background: '#e0f2fe',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px'
                    }}>
                        <p style={{ 
                            color: '#1d4ed8',
                            fontSize: '16px',
                            margin: '0'
                        }}>
                            ✂️ Cliquez entre les lettres pour découper le mot • Pas de coupure = monosyllabe • La segmentation est vérifiée automatiquement
                        </p>
                    </div>

                    {/* Mot à découper */}
                    <div style={{
                        background: '#fff7ed',
                        padding: '40px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px',
                            marginBottom: '30px'
                        }}>
                            <h2 style={{ 
                                color: '#ea580c',
                                fontSize: '24px',
                                margin: '0'
                            }}>
                                Découpez ce mot :
                            </h2>
                            <button
                                onClick={() => speakWord(currentWord)}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                title="Écouter le mot"
                            >
                                🔊
                            </button>
                        </div>
                        
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: '30px',
                            flexWrap: 'wrap'
                        }}>
                            {renderWordWithCuts()}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <button
                                onClick={validateSegmentation}
                                disabled={!!feedback}
                                style={{
                                    backgroundColor: feedback ? '#ccc' : '#f59e0b',
                                    color: 'white',
                                    padding: '12px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: feedback ? 'not-allowed' : 'pointer',
                                    marginRight: '15px'
                                }}
                            >
                                {feedback ? '⏳ Validation...' : '✅ Valider la segmentation'}
                            </button>
                            
                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '12px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🏠 Retour
                            </button>
                        </div>

                        <p style={{
                            color: '#6b7280',
                            fontSize: '14px',
                            fontStyle: 'italic'
                        }}>
                            {cuts.length === 0 
                                ? 'Pas de coupure = mot monosyllabique 👍' 
                                : `${cuts.length} coupure${cuts.length > 1 ? 's' : ''} faite${cuts.length > 1 ? 's' : ''}`
                            }
                        </p>

                        {feedback && (
                            <div style={{
                                background: feedback.includes('✅') ? '#ecfdf5' : '#fef2f2',
                                color: feedback.includes('✅') ? '#047857' : '#dc2626',
                                padding: '15px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginTop: '20px',
                                lineHeight: '1.4',
                                textAlign: 'left'
                            }}>
                                {feedback}
                            </div>
                        )}
                    </div>

                    {/* Info utilisateur */}
                    <div style={{
                        padding: '15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#64748b'
                    }}>
                        Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                maxWidth: '800px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    📤 Import de Textes
                </h1>

                <p style={{
                    fontSize: '18px',
                    color: '#666',
                    marginBottom: '40px',
                    lineHeight: '1.5'
                }}>
                    Importez votre propre texte (.txt, .docx, .odt) et entraînez-vous à découper ses mots avec les ciseaux ✂️
                </p>

                {/* Paramètres audio */}
                <div style={{
                    background: '#f0f9ff',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    textAlign: 'left'
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

                {/* Zone d'upload */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragActive ? '#f59e0b' : '#d1d5db'}`,
                        borderRadius: '12px',
                        padding: '60px 40px',
                        marginBottom: '30px',
                        backgroundColor: dragActive ? '#fef3c7' : '#f9fafb',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('fileInput').click()}
                >
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '20px'
                    }}>
                        📁
                    </div>
                    <h3 style={{
                        fontSize: '24px',
                        color: '#333',
                        marginBottom: '15px'
                    }}>
                        {selectedFile ? selectedFile.name : 'Sélectionnez ou glissez votre fichier'}
                    </h3>
                    <p style={{
                        color: '#666',
                        fontSize: '16px',
                        marginBottom: '20px'
                    }}>
                        Formats supportés : .txt, .docx (Word), .odt (OpenDocument)
                    </p>
                    <div style={{
                        background: dragActive ? '#f59e0b' : '#e5e7eb',
                        color: dragActive ? 'white' : '#374151',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        transition: 'all 0.2s ease'
                    }}>
                        Cliquez ou glissez ici
                    </div>
                </div>

                <input
                    id="fileInput"
                    type="file"
                    accept=".txt,.docx,.odt"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Bouton traitement */}
                {selectedFile && (
                    <div style={{ marginBottom: '30px' }}>
                        <button
                            onClick={processFile}
                            disabled={isProcessing}
                            style={{
                                backgroundColor: isProcessing ? '#d1d5db' : '#f59e0b',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            {isProcessing ? '⏳ Traitement...' : '✂️ Commencer à découper'}
                        </button>
                    </div>
                )}

                {/* Instructions */}
                <div style={{
                    background: '#e0f2fe',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    textAlign: 'left'
                }}>
                    <h4 style={{
                        color: '#0284c7',
                        marginBottom: '15px'
                    }}>
                        ✂️ Instructions
                    </h4>
                    <ul style={{
                        color: '#0369a1',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        paddingLeft: '20px'
                    }}>
                        <li>Sélectionnez un fichier texte de votre choix</li>
                        <li>L'application extraira automatiquement les mots</li>
                        <li>Vous découperez chaque mot avec les ciseaux ✂️</li>
                        <li>Cliquez entre les lettres pour placer les coupures</li>
                        <li>L'exercice se limite aux 50 premiers mots du texte</li>
                    </ul>
                </div>

                {/* Bouton retour */}
                <button
                    onClick={() => router.push('/lire/segmentation-choix')}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour au choix
                </button>

                {/* Info utilisateur */}
                <div style={{
                    marginTop: '30px',
                    padding: '15px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#64748b'
                }}>
                    Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}