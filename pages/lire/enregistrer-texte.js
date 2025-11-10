import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { convertNumbersInText, capitalizeText } from '../../lib/convertNumbers'

// Moteur de syllables simplifié
class SimpleSyllableEngine {
    segmentWord(word) {
        if (word.length <= 2) return [word];
        
        const vowels = ['a', 'e', 'i', 'o', 'u', 'y', 'à', 'á', 'â', 'ã', 'ä', 'å', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ò', 'ó', 'ô', 'õ', 'ö', 'ù', 'ú', 'û', 'ü', 'ÿ'];
        
        // Exceptions courantes
        const exceptions = {
            'bonjour': ['bon', 'jour'],
            'madame': ['ma', 'dame'],
            'comment': ['com', 'ment'],
            'allez': ['al', 'lez'],
            'merci': ['mer', 'ci'],
            'pardon': ['par', 'don'],
            'voiture': ['voi', 'ture'],
            'famille': ['fa', 'mille'],
            'maison': ['mai', 'son'],
            'jardin': ['jar', 'din'],
            'enfant': ['en', 'fant'],
            'école': ['é', 'cole'],
            'photo': ['pho', 'to'],
            'piano': ['pi', 'a', 'no'],
            'radio': ['ra', 'dio'],
            'table': ['ta', 'ble']
        };
        
        const lowerWord = word.toLowerCase();
        if (exceptions[lowerWord]) {
            return exceptions[lowerWord];
        }
        
        // Règle simple
        let syllables = [];
        let current = '';
        let lastWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            const isVowel = vowels.includes(char);
            
            if (lastWasVowel && !isVowel && current.length > 0) {
                if (current.length >= 2) {
                    syllables.push(current);
                    current = char;
                } else {
                    current += char;
                }
            } else {
                current += char;
            }
            
            lastWasVowel = isVowel;
        }
        
        if (current) {
            syllables.push(current);
        }
        
        return syllables.length > 0 ? syllables : [word];
    }
}

export default function EnregistrerTexte() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [recordedText, setRecordedText] = useState('')
    const [recognition, setRecognition] = useState(null)
    const [speechSupported, setSpeechSupported] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showTextEditor, setShowTextEditor] = useState(false)
    const [textGroups, setTextGroups] = useState([])
    const [selectedGroups, setSelectedGroups] = useState(new Set())
    const [textFont, setTextFont] = useState('Comic Sans MS')
    const [textSize, setTextSize] = useState('22')
    const [isMobile, setIsMobile] = useState(false)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Détection mobile
        setIsMobile(window.innerWidth <= 768)

        // Vérifier le support de la reconnaissance vocale
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            setSpeechSupported(!!SpeechRecognition)
        }
        
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            
            // Charger les préférences de police/taille
            const savedFont = localStorage.getItem('textFont')
            const savedSize = localStorage.getItem('textSize')
            if (savedFont) setTextFont(savedFont)
            if (savedSize) setTextSize(savedSize)
            
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    // Initialiser la reconnaissance vocale
    const initSpeechRecognition = () => {
        if (typeof window === 'undefined') {
            return null
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        
        if (!SpeechRecognition) {
            alert('Désolé, votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.')
            return null
        }
        
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'fr-FR'
        
        recognition.onresult = (event) => {
            let finalTranscript = ''
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' '
                }
            }
            
            if (finalTranscript) {
                setRecordedText(prev => prev + finalTranscript)
            }
        }
        
        recognition.onerror = (event) => {
            console.error('Erreur reconnaissance vocale:', event.error)
            if (event.error === 'not-allowed') {
                alert('Accès au microphone refusé. Veuillez autoriser l\'accès au microphone.')
            }
            setIsRecording(false)
        }
        
        recognition.onend = () => {
            setIsRecording(false)
        }
        
        return recognition
    }

    // Démarrer l'enregistrement vocal (SpeechRecognition OU MediaRecorder+Whisper)
    const startVoiceRecording = () => {
        if (speechSupported) {
            // Navigateur compatible (Chrome/Edge/Safari) → SpeechRecognition
            const speechRecognition = initSpeechRecognition()
            if (!speechRecognition) return

            setRecognition(speechRecognition)
            setRecordedText('')
            setIsRecording(true)

            try {
                speechRecognition.start()
            } catch (error) {
                console.error('Erreur démarrage reconnaissance:', error)
                alert('Erreur lors du démarrage de la reconnaissance vocale')
                setIsRecording(false)
            }
        } else {
            // Navigateur incompatible (Firefox) → MediaRecorder + Whisper
            startMediaRecording()
        }
    }

    // Enregistrement avec MediaRecorder (pour Firefox)
    const startMediaRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const audioChunks = []

            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            })

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data)
                }
            }

            recorder.onstop = async () => {
                setIsRecording(false)
                setIsTranscribing(true)

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

                // Arrêter le stream audio
                stream.getTracks().forEach(track => track.stop())

                // Envoyer à l'API Whisper pour transcription
                await transcribeAudio(audioBlob)
            }

            recorder.start()
            setMediaRecorder(recorder)
            setIsRecording(true)
            setRecordedText('')
        } catch (error) {
            console.error('Erreur accès microphone:', error)
            alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.')
        }
    }

    // Transcription via Whisper
    const transcribeAudio = async (audioBlob) => {
        try {
            const formData = new FormData()
            formData.append('audio', audioBlob, 'recording.webm')

            const response = await fetch('/api/speech/groq-whisper', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                console.log('Transcription Whisper:', data.text)

                // Appliquer conversions (ponctuation, nombres, capitalisation)
                const processedText = convertPunctuation(data.text)
                setRecordedText(processedText)
            } else {
                const error = await response.json()
                console.error('Erreur transcription:', error)
                alert('Erreur lors de la transcription. Réessayez.')
            }
        } catch (error) {
            console.error('Erreur transcription:', error)
            alert('Erreur lors de la transcription.')
        } finally {
            setIsTranscribing(false)
        }
    }

    // Arrêter l'enregistrement vocal
    const convertPunctuation = (text) => {
        let result = text
            // D'abord traiter les expressions composées (plus spécifiques)
            .replace(/\s*point d'interrogation\s*/gi, '? ')
            .replace(/\s*point d\'interrogation\s*/gi, '? ')
            .replace(/\s*point d'exclamation\s*/gi, '! ')
            .replace(/\s*point d\'exclamation\s*/gi, '! ')
            .replace(/\s*point virgule\s*/gi, '; ')
            .replace(/\s*deux points\s*/gi, ': ')
            .replace(/\s*nouvelle ligne\s*/gi, '\n')
            .replace(/\s*nouveau paragraphe\s*/gi, '\n\n')
            // Puis traiter les mots simples (moins spécifiques)
            .replace(/\s*point\s*/gi, '. ')
            .replace(/\s*virgule\s*/gi, ', ')
            // Nettoyer les espaces en trop
            .replace(/\s+/g, ' ')
            .replace(/\s+([.!?,:;])/g, '$1')
            .trim()
            
        // Convertir les nombres en lettres
        result = convertNumbersInText(result)
        
        // Capitaliser le début et après ponctuation
        result = capitalizeText(result)
        
        return result
    }

    const stopVoiceRecording = () => {
        if (speechSupported && recognition) {
            // Chrome/Edge/Safari → arrêter SpeechRecognition
            recognition.stop()
            setIsRecording(false)
            // Convertir la ponctuation après l'arrêt
            setTimeout(() => {
                setRecordedText(prevText => convertPunctuation(prevText))
            }, 500) // Petit délai pour laisser le temps à la reconnaissance de finir
        } else if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            // Firefox → arrêter MediaRecorder (déclenchera transcription)
            mediaRecorder.stop()
        }
    }

    // Créer des groupes automatiquement depuis l'enregistrement
    const createGroupsFromVoiceText = () => {
        if (!recordedText.trim()) {
            alert('Aucun texte enregistré')
            return
        }
        
        // Créer un seul groupe avec tout le texte enregistré
        const group = {
            id: Date.now(),
            type: 'text',
            content: recordedText.trim()
        }
        
        setTextGroups([group])
        setShowTextEditor(false)
        
        alert('✅ Texte vocal converti en groupe de sens !')
    }

    // Ouvrir l'éditeur pour découper manuellement
    const openTextEditor = () => {
        if (!recordedText.trim()) {
            alert('Aucun texte enregistré à découper')
            return
        }
        setShowTextEditor(true)
    }

    // Créer des groupes depuis l'éditeur manuel
    const createGroupsFromEditor = () => {
        if (!recordedText.trim()) return
        
        // Diviser le texte par les doubles retours à la ligne
        const groups = recordedText
            .split(/\n\n+/)
            .map(group => group.trim())
            .filter(group => group.length > 0)
            .map((content, index) => ({
                id: Date.now() + index,
                type: 'text',
                content: content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
            }))
        
        if (groups.length === 0 || groups.length === 1) {
            // Si pas de groupes détectés ou un seul groupe, proposer un découpage par phrases
            const sentences = recordedText
                .split(/[.!?]+/)
                .map(sentence => sentence.trim())
                .filter(sentence => sentence.length > 0)
                .map((content, index) => ({
                    id: Date.now() + index,
                    type: 'text',
                    content: content
                }))
            
            if (sentences.length > 1) {
                setTextGroups(sentences)
                alert(`✅ ${sentences.length} groupes créés automatiquement (séparés par phrases) !`)
            } else {
                const singleGroup = [{
                    id: Date.now(),
                    type: 'text',
                    content: recordedText.trim()
                }]
                setTextGroups(singleGroup)
                alert('ℹ️ Un seul groupe créé. Pour créer plusieurs groupes, séparez-les par des lignes vides dans le texte.')
            }
        } else {
            setTextGroups(groups)
            alert(`✅ ${groups.length} groupes créés à partir des lignes vides !`)
        }
        
        setShowTextEditor(false)
    }

    const toggleGroupSelection = (groupId) => {
        const newSelected = new Set(selectedGroups)
        if (newSelected.has(groupId)) {
            newSelected.delete(groupId)
        } else {
            newSelected.add(groupId)
        }
        setSelectedGroups(newSelected)
    }

    const selectAllGroups = () => {
        const textGroupIds = textGroups.filter(g => g.type === 'text').map(g => g.id)
        setSelectedGroups(new Set(textGroupIds))
    }

    const deselectAllGroups = () => {
        setSelectedGroups(new Set())
    }

    const addLineBreakAfterSelected = () => {
        const newGroups = [...textGroups]
        let addedCount = 0
        
        textGroups.forEach((group, originalIndex) => {
            if (selectedGroups.has(group.id)) {
                const currentIndex = originalIndex + addedCount
                // Vérifier si il n'y a pas déjà un saut de ligne après
                if (currentIndex + 1 < newGroups.length && newGroups[currentIndex + 1].type !== 'linebreak') {
                    newGroups.splice(currentIndex + 1, 0, {
                        id: `linebreak_${Date.now()}_${currentIndex}`, 
                        type: 'linebreak'
                    })
                    addedCount++
                }
            }
        })
        setTextGroups(newGroups)
    }

    const removeLineBreakAfterSelected = () => {
        const newGroups = [...textGroups]
        const groupsToRemove = []
        
        textGroups.forEach((group, index) => {
            if (selectedGroups.has(group.id)) {
                // Vérifier si le groupe suivant est un saut de ligne
                if (index + 1 < textGroups.length && textGroups[index + 1].type === 'linebreak') {
                    groupsToRemove.push(textGroups[index + 1].id)
                }
            }
        })
        
        setTextGroups(newGroups.filter(g => !groupsToRemove.includes(g.id)))
    }

    // Sauvegarder le texte enregistré
    const handleSave = async () => {
        let groupsToSave = textGroups
        
        // Si pas de groupes créés, utiliser le texte brut
        if (groupsToSave.length === 0 && recordedText.trim()) {
            groupsToSave = [{
                id: Date.now(),
                type: 'text',
                content: recordedText.trim()
            }]
        }
        
        if (groupsToSave.length === 0) {
            alert('Aucun texte à sauvegarder')
            return
        }

        // Extraire les mots et statistiques
        const allWords = []
        const multiSyllableWords = []
        const syllableEngine = new SimpleSyllableEngine()

        groupsToSave.forEach((group) => {
            if (group.content && group.content.trim()) {
                const words = group.content.match(/[a-zA-ZàáâãäåèéêëìíîïòóôõöùúûüÿçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜŸÇ-]+/g) || []
                
                words.forEach(word => {
                    const cleanWord = word.toLowerCase()
                    if (!allWords.includes(cleanWord)) {
                        allWords.push(cleanWord)
                        
                        const syllables = syllableEngine.segmentWord(cleanWord)
                        if (syllables.length > 1) {
                            multiSyllableWords.push({
                                mot: cleanWord,
                                syllabes: syllables
                            })
                        }
                    }
                })
            }
        })

        const titre = prompt('Titre du texte :') || `Texte vocal ${new Date().toLocaleDateString()}`

        setIsSaving(true)
        try {
            const token = localStorage.getItem('token')
            console.log('🔑 Token:', token ? 'Présent' : 'Absent')
            console.log('🔑 Token détail:', token?.substring(0, 20) + '...')
            console.log('📝 Données à envoyer:', { titre, groupesCount: groupsToSave.length, motsCount: multiSyllableWords.length })
            
            const response = await fetch('/api/textes/creer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    titre,
                    groupes_sens: groupsToSave.map((group, index) => ({
                        ordre_groupe: index + 1,
                        contenu: group.type === 'text' ? group.content.trim() : '',
                        type_groupe: group.type || 'text'
                    })),
                    mots_extraits: multiSyllableWords
                })
            })

            if (response.ok) {
                alert(`✅ Texte "${titre}" sauvegardé !\n${multiSyllableWords.length} mots ajoutés à l'entraînement.`)
                router.push('/lire/voir-mes-textes')
            } else if (response.status === 401) {
                // Token expiré - rediriger vers login
                console.log('🔄 Token expiré, redirection vers login...')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                alert('⏰ Votre session a expiré. Vous allez être redirigé vers la page de connexion.')
                router.push('/login')
                return
            } else {
                const errorText = await response.text()
                console.error('❌ Réponse erreur:', response.status, errorText)
                try {
                    const errorJson = JSON.parse(errorText)
                    throw new Error(errorJson.error || `Erreur ${response.status}`)
                } catch (parseError) {
                    throw new Error(`Erreur ${response.status}: ${errorText}`)
                }
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('❌ Erreur : ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    // Recommencer l'enregistrement
    const resetRecording = () => {
        setRecordedText('')
        setTextGroups([])
        setShowTextEditor(false)
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
                <div style={{ color: '#059669', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <>
            <Head>
                <title>Enregistrer un Texte - ACLEF</title>
                <style jsx>{`
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                    .recording {
                        animation: pulse 2s infinite;
                    }
                `}</style>
            </Head>
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    backgroundColor: 'white'
                }}>
                    {/* Titre */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        textAlign: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>🎤</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Enregistrer un Texte
                        </span>
                    </h1>

                    {/* Navigation avec icônes */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
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

                    <p style={{
                        textAlign: 'center',
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#666',
                        marginBottom: '20px'
                    }}>
                        Parlez clairement et votre voix sera transformée en texte automatiquement.
                    </p>

                    {/* Zone d'enregistrement - fonctionne sur tous les navigateurs */}
                    <div style={{
                        background: '#f0fff4',
                        padding: '30px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        {/* Bouton d'enregistrement principal */}
                        <div style={{ marginBottom: '20px' }}>
                            {!isRecording && !isTranscribing ? (
                                <button
                                    onClick={startVoiceRecording}
                                    disabled={!!recordedText.trim()}
                                    style={{
                                        backgroundColor: recordedText.trim() ? '#9ca3af' : '#059669',
                                        color: 'white',
                                        padding: '20px 40px',
                                        border: 'none',
                                        borderRadius: '50px',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        cursor: recordedText.trim() ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 6px 20px rgba(5, 150, 105, 0.3)',
                                        opacity: recordedText.trim() ? 0.6 : 1
                                    }}
                                >
                                    🎤 {recordedText.trim() ? 'Enregistrement terminé' : 'Commencer l\'enregistrement'}
                                </button>
                            ) : isTranscribing ? (
                                <button
                                    disabled
                                    style={{
                                        backgroundColor: '#f59e0b',
                                        color: 'white',
                                        padding: '20px 40px',
                                        border: 'none',
                                        borderRadius: '50px',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        cursor: 'not-allowed',
                                        boxShadow: '0 6px 20px rgba(245, 158, 11, 0.3)'
                                    }}
                                >
                                    ⏳ Transcription en cours...
                                </button>
                            ) : (
                                    <button
                                        onClick={stopVoiceRecording}
                                        className="recording"
                                        style={{
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            padding: '20px 40px',
                                            border: 'none',
                                            borderRadius: '50px',
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 20px rgba(5, 150, 105, 0.5)'
                                        }}
                                    >
                                        ⏹️ Arrêter l\'enregistrement
                                    </button>
                                )}
                            </div>

                            {/* Zone de texte transcrit */}
                            <div style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '2px solid #059669',
                                minHeight: '120px',
                                textAlign: 'left',
                                marginBottom: '20px'
                            }}>
                                <p style={{ 
                                    margin: '0 0 10px 0', 
                                    fontSize: '16px', 
                                    fontWeight: 'bold', 
                                    color: '#059669' 
                                }}>
                                    {isRecording ? '🔴 Enregistrement en cours...' : '📝 Texte transcrit :'}
                                </p>
                                <div style={{
                                    fontSize: '16px',
                                    lineHeight: '1.6',
                                    color: '#374151',
                                    minHeight: '60px'
                                }}>
                                    {recordedText || (isRecording ? 'Parlez maintenant...' : 'Appuyez sur le bouton pour commencer')}
                                </div>
                            </div>

                            {/* Actions après enregistrement */}
                            {recordedText && !isRecording && (
                                <div style={{
                                    display: 'flex',
                                    gap: '15px',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                    marginBottom: '20px'
                                }}>
                                    <button
                                        onClick={createGroupsFromVoiceText}
                                        style={{
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✅ Utiliser tel quel
                                    </button>
                                    
                                    <button
                                        onClick={openTextEditor}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✂️ Découper en groupes
                                    </button>
                                    
                                    <button
                                        onClick={resetRecording}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            padding: '12px 25px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔄 Recommencer
                                    </button>
                                </div>
                            )}
                    </div>

                    {/* Éditeur de découpage manuel */}
                    {showTextEditor && (
                        <div style={{
                            background: '#fff7ed',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#ea580c' }}>
                                ✂️ Découper le texte en groupes de sens
                            </h3>
                            
                            <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6c757d' }}>
                                Modifiez le texte ci-dessous et séparez chaque groupe de sens par une <strong>ligne vide</strong>
                            </p>
                            
                            <textarea
                                value={recordedText}
                                onChange={(e) => setRecordedText(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '200px',
                                    padding: '15px',
                                    border: '2px solid #ea580c',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    lineHeight: '1.5',
                                    resize: 'vertical',
                                    marginBottom: '15px'
                                }}
                            />
                            
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    onClick={createGroupsFromEditor}
                                    style={{
                                        backgroundColor: '#059669',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✅ Créer les groupes
                                </button>
                                
                                <button
                                    onClick={() => setRecordedText(convertPunctuation(recordedText))}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔤 Convertir ponctuation
                                </button>
                                
                                <button
                                    onClick={() => setShowTextEditor(false)}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        padding: '12px 25px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ❌ Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Groupes créés */}
                    {textGroups.length > 0 && (
                        <div style={{
                            background: '#f0fdf4',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#059669' }}>
                                Contrôles ({selectedGroups.size} groupe{selectedGroups.size > 1 ? 's' : ''} sélectionné{selectedGroups.size > 1 ? 's' : ''})
                            </h3>
                            
                            {/* Boutons de sélection */}
                            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={selectAllGroups}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✓ Sélectionner tous
                                </button>
                                <button
                                    onClick={deselectAllGroups}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✗ Désélectionner tous
                                </button>
                            </div>

                            {/* Boutons saut de ligne */}
                            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={addLineBreakAfterSelected}
                                    disabled={selectedGroups.size === 0}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: selectedGroups.size > 0 ? '#3b82f6' : '#ccc',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: selectedGroups.size > 0 ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    +↵ Ajouter saut de ligne
                                </button>
                                <button
                                    onClick={removeLineBreakAfterSelected}
                                    disabled={selectedGroups.size === 0}
                                    style={{
                                        padding: '8px 15px',
                                        backgroundColor: selectedGroups.size > 0 ? '#ef4444' : '#ccc',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        cursor: selectedGroups.size > 0 ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    -↵ Supprimer saut de ligne
                                </button>
                            </div>

                            {/* Contrôles de police/taille */}
                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                marginBottom: '15px'
                            }}>
                                <div>
                                    <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: '500' }}>
                                        Police :
                                    </label>
                                    <select
                                        value={textFont}
                                        onChange={(e) => {
                                            setTextFont(e.target.value)
                                            localStorage.setItem('textFont', e.target.value)
                                        }}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="Arial">Arial</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Comic Sans MS">Comic Sans MS</option>
                                        <option value="Trebuchet MS">Trebuchet MS</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ marginRight: '10px', fontSize: '14px', fontWeight: '500' }}>
                                        Taille :
                                    </label>
                                    <select
                                        value={textSize}
                                        onChange={(e) => {
                                            setTextSize(e.target.value)
                                            localStorage.setItem('textSize', e.target.value)
                                        }}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="14">14px</option>
                                        <option value="16">16px</option>
                                        <option value="18">18px</option>
                                        <option value="20">20px</option>
                                        <option value="22">22px</option>
                                        <option value="24">24px</option>
                                        <option value="28">28px</option>
                                    </select>
                                </div>
                            </div>

                            <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#059669' }}>
                                📝 Groupes de sens créés ({textGroups.length})
                            </h3>
                            
                            {textGroups.map((group, index) => (
                                <div key={group.id} style={{ marginBottom: '10px' }}>
                                    {group.type === 'text' ? (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            {/* Case à cocher */}
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.has(group.id)}
                                                onChange={() => toggleGroupSelection(group.id)}
                                                style={{
                                                    marginTop: '15px',
                                                    transform: 'scale(1.2)',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            
                                            <div style={{
                                                flex: 1,
                                                background: selectedGroups.has(group.id) ? '#e8f5e8' : 'white',
                                                padding: '15px',
                                                borderRadius: '8px',
                                                border: selectedGroups.has(group.id) ? '2px solid #10b981' : '2px solid #10b981'
                                            }}>
                                                <p style={{ 
                                                    margin: '0 0 5px 0', 
                                                    fontSize: '14px', 
                                                    fontWeight: 'bold', 
                                                    color: '#059669' 
                                                }}>
                                                    Groupe {index + 1}
                                                </p>
                                                <p style={{ 
                                                    margin: 0, 
                                                    fontSize: textSize + 'px', 
                                                    fontFamily: textFont,
                                                    lineHeight: '1.5' 
                                                }}>
                                                    {group.content}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            height: '30px',
                                            background: 'linear-gradient(90deg, #ccc 0%, transparent 100%)',
                                            border: '2px dashed #ccc',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#666',
                                            fontStyle: 'italic',
                                            fontSize: '14px'
                                        }}>
                                            --- Saut de ligne ---
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bouton de sauvegarde */}
                    {(recordedText || textGroups.length > 0) && (
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    padding: '15px 30px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    opacity: isSaving ? 0.5 : 1
                                }}
                            >
                                {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le texte'}
                            </button>
                        </div>
                    )}

                    {/* Bouton retour */}
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
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
        </>
    )
}