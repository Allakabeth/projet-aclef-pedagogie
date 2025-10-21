import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VoirTexte() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [texte, setTexte] = useState(null)
    const [groupesSens, setGroupesSens] = useState([])
    const [isLoadingTexte, setIsLoadingTexte] = useState(false)
    const [speechSupported, setSpeechSupported] = useState(true) // ElevenLabs toujours supporté
    const [speaking, setSpeaking] = useState(false)
    const [currentSpeaking, setCurrentSpeaking] = useState(null)
    const [currentAudio, setCurrentAudio] = useState(null)
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
    const [selectedVoice, setSelectedVoice] = useState('AfbuxQ9DVtS4azaxN1W7') // Paul par défaut
    const [speechSpeed, setSpeechSpeed] = useState(0.8) // Vitesse par défaut
    const [availableVoices, setAvailableVoices] = useState([])
    const [useElevenLabs, setUseElevenLabs] = useState(true)
    const [quotaExceeded, setQuotaExceeded] = useState(false)
    const [audioCache, setAudioCache] = useState({})
    const [textFont, setTextFont] = useState('Comic Sans MS')
    const [textSize, setTextSize] = useState('22')

    // États pour l'enregistrement vocal
    const [enregistrements, setEnregistrements] = useState({}) // { groupeId: { audio_url, duree, ... } }
    const [isRecording, setIsRecording] = useState(false)
    const [recordingGroupeId, setRecordingGroupeId] = useState(null)
    const [mediaRecorder, setMediaRecorder] = useState(null)
    const [audioChunks, setAudioChunks] = useState([])
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [recordingTimer, setRecordingTimer] = useState(null)
    const [isUploading, setIsUploading] = useState(false)

    const router = useRouter()
    const { id } = router.query

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

    useEffect(() => {
        if (id && !isLoading) {
            loadTexte()
        }
    }, [id, isLoading])

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

    // Fonctions de gestion du cache audio
    const getCacheKey = (text, voiceId) => {
        // Hash simple du texte qui supporte tous les caractères Unicode (accents majuscules/minuscules)
        const hash = text.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0)
        }, 0)
        return `elevenlabs_${voiceId}_${text.length}_${Math.abs(hash)}`
    }

    const getCachedAudio = (text, voiceId) => {
        const key = getCacheKey(text, voiceId)
        const cached = localStorage.getItem(key)
        if (cached) {
            console.log('📂 Audio trouvé dans le cache')
            return cached
        }
        return null
    }

    const setCachedAudio = (text, voiceId, audioData) => {
        try {
            const key = getCacheKey(text, voiceId)
            localStorage.setItem(key, audioData)
            console.log('💾 Audio mis en cache')
        } catch (error) {
            console.error('Erreur cache audio:', error)
            // Si le cache est plein, supprimer les anciens
            if (error.name === 'QuotaExceededError') {
                clearOldCache()
            }
        }
    }

    const clearOldCache = () => {
        try {
            const keys = Object.keys(localStorage)
            const audioKeys = keys.filter(key => key.startsWith('elevenlabs_'))
            // Supprimer les 50% les plus anciens
            audioKeys.slice(0, Math.floor(audioKeys.length / 2)).forEach(key => {
                localStorage.removeItem(key)
            })
            console.log('🧹 Cache audio nettoyé')
        } catch (error) {
            console.error('Erreur nettoyage cache:', error)
        }
    }

    const loadTexte = async () => {
        setIsLoadingTexte(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/textes/get/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setTexte(data.texte)
                setGroupesSens(data.groupes_sens || [])
                // Charger les enregistrements après avoir chargé le texte
                await loadEnregistrements()
            } else {
                console.error('Erreur chargement texte')
                alert('Erreur lors du chargement du texte')
                router.push('/lire/voir-mes-textes')
            }
        } catch (error) {
            console.error('Erreur chargement texte:', error)
            alert('Erreur lors du chargement du texte')
            router.push('/lire/voir-mes-textes')
        } finally {
            setIsLoadingTexte(false)
        }
    }

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/enregistrements/list?texte_id=${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Enregistrements chargés:', data.count)

                // Transformer en map { groupeId: enregistrement }
                const enregMap = {}
                data.enregistrements.forEach(enreg => {
                    enregMap[enreg.groupe_sens_id] = enreg
                })
                setEnregistrements(enregMap)
            } else {
                console.error('Erreur chargement enregistrements')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
        }
    }

    const lireTexte = async (texteALire, groupeId = null) => {
        // Arrêter la lecture en cours
        if (speaking) {
            if (currentAudio) {
                currentAudio.pause()
                currentAudio.currentTime = 0
                setCurrentAudio(null)
            } else {
                // Arrêter Web Speech API
                window.speechSynthesis.cancel()
            }
            setSpeaking(false)
            setCurrentSpeaking(null)
            return
        }

        // Éviter les générations simultanées
        if (isGeneratingAudio) {
            return
        }

        setIsGeneratingAudio(true)
        setCurrentSpeaking(groupeId)

        // Essayer d'abord ElevenLabs si activé et quota non dépassé
        if (useElevenLabs && !quotaExceeded) {
            try {
                // Vérifier d'abord le cache
                const cachedAudio = getCachedAudio(texteALire, selectedVoice)
                let audioData = null

                if (cachedAudio) {
                    // Utiliser l'audio en cache
                    audioData = cachedAudio
                    setIsGeneratingAudio(false)
                    console.log('🎵 Lecture depuis le cache')
                } else {
                    // Générer nouveau audio via API
                    console.log('🌐 Génération via API ElevenLabs')
                    const token = localStorage.getItem('token')
                    const response = await fetch('/api/speech/elevenlabs', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text: texteALire,
                            voice_id: selectedVoice
                        })
                    })

                    if (response.status === 429) {
                        // Quota dépassé, fallback vers Web Speech API
                        const error = await response.json()
                        if (error.error === 'QUOTA_EXCEEDED') {
                            console.log('🔄 ElevenLabs indisponible, fallback vers Web Speech API (Paul/Julie)')
                            setQuotaExceeded(true)
                            await lireTexteWebSpeech(texteALire, groupeId)
                            return
                        }
                    }

                    if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Erreur génération audio')
                    }

                    const data = await response.json()
                    audioData = data.audio
                    
                    // Mettre en cache pour les prochaines utilisations
                    setCachedAudio(texteALire, selectedVoice, audioData)
                }
                
                // Créer et jouer l'audio ElevenLabs
                const audio = new Audio(audioData)
                setCurrentAudio(audio)

                audio.onloadstart = () => {
                    setSpeaking(true)
                    setIsGeneratingAudio(false)
                }

                audio.onended = () => {
                    setSpeaking(false)
                    setCurrentSpeaking(null)
                    setCurrentAudio(null)
                }

                audio.onerror = () => {
                    setSpeaking(false)
                    setCurrentSpeaking(null)
                    setCurrentAudio(null)
                    setIsGeneratingAudio(false)
                    alert('Erreur lors de la lecture audio ElevenLabs')
                }

                await audio.play()

            } catch (error) {
                console.error('Erreur ElevenLabs:', error)
                console.log('🔄 Fallback vers Web Speech API')
                await lireTexteWebSpeech(texteALire, groupeId)
            }
        } else {
            // Utiliser directement Web Speech API
            await lireTexteWebSpeech(texteALire, groupeId)
        }
    }

    const lireTexteWebSpeech = async (texteALire, groupeId) => {
        try {
            if (!('speechSynthesis' in window)) {
                throw new Error('Web Speech API non supportée')
            }

            const utterance = new SpeechSynthesisUtterance(texteALire)
            
            // Configuration de la voix française
            utterance.lang = 'fr-FR'
            utterance.rate = speechSpeed
            utterance.pitch = 1
            utterance.volume = 1

            // Sélectionner Paul ou Julie en fallback Web Speech API
            const voices = window.speechSynthesis.getVoices()
            
            // Priorité absolue aux voix Paul et Julie
            const preferredVoices = [
                'paul', 'julie', 'microsoft paul', 'microsoft julie', 
                'thomas', 'google français'
            ]
            
            let frenchVoice = null
            
            // Chercher d'abord Paul ou Julie spécifiquement
            for (const preferred of preferredVoices) {
                frenchVoice = voices.find(voice => 
                    voice.lang.startsWith('fr') && 
                    voice.name.toLowerCase().includes(preferred)
                )
                if (frenchVoice) {
                    console.log('🎤 Fallback Web Speech - Voix trouvée:', frenchVoice.name)
                    break
                }
            }
            
            // Sinon, prendre n'importe quelle voix française
            if (!frenchVoice) {
                frenchVoice = voices.find(voice => 
                    voice.lang.startsWith('fr') || voice.name.toLowerCase().includes('french')
                )
                if (frenchVoice) {
                    console.log('🎤 Fallback Web Speech - Voix générique:', frenchVoice.name)
                }
            }
            
            if (frenchVoice) {
                utterance.voice = frenchVoice
            } else {
                console.log('⚠️ Aucune voix française trouvée, utilisation voix par défaut')
            }

            utterance.onstart = () => {
                setSpeaking(true)
                setIsGeneratingAudio(false)
            }

            utterance.onend = () => {
                setSpeaking(false)
                setCurrentSpeaking(null)
            }

            utterance.onerror = () => {
                setSpeaking(false)
                setCurrentSpeaking(null)
                setIsGeneratingAudio(false)
                alert('Erreur lors de la lecture audio Web Speech')
            }

            window.speechSynthesis.speak(utterance)

        } catch (error) {
            console.error('Erreur Web Speech:', error)
            setSpeaking(false)
            setCurrentSpeaking(null)
            setIsGeneratingAudio(false)
            alert(`Erreur: ${error.message}`)
        }
    }

    const lireToutLeTexte = () => {
        const texteComplet = groupesSens.map(groupe => groupe.contenu).join('. ')
        lireTexte(texteComplet, 'all')
    }

    const printText = () => {
        const printContent = `
            <html>
                <head>
                    <title>${texte?.titre || 'Texte de référence'}</title>
                    <style>
                        body {
                            font-family: ${textFont}, Arial, sans-serif;
                            font-size: 16px;
                            line-height: 1.6;
                            margin: 20px;
                            color: #333;
                        }
                        .text-group {
                            background: #f8f9fa;
                            border: 2px solid #dee2e6;
                            border-radius: 8px;
                            padding: 15px;
                            margin-bottom: 15px;
                            min-height: 40px;
                            display: flex;
                            align-items: center;
                        }
                        .title {
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 30px;
                            color: #333;
                        }
                        @media print {
                            body { margin: 15px; }
                            .text-group {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="title">${texte?.titre || 'Texte de référence'}</div>
                    ${groupesSens.map(groupe =>
                        groupe.contenu && groupe.contenu.trim() ?
                            `<div class="text-group">${groupe.contenu.trim()}</div>` : ''
                    ).join('')}
                </body>
            </html>
        `

        const printWindow = window.open('', '_blank')
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()
    }

    // ========================================================================
    // FONCTIONS ENREGISTREMENT VOCAL
    // ========================================================================

    const startRecording = async (groupeId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

            const chunks = []
            recorder.ondataavailable = (e) => chunks.push(e.data)

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                const dureeSec = recordingDuration
                await uploadEnregistrement(groupeId, blob, dureeSec)
                stream.getTracks().forEach(track => track.stop())
            }

            setMediaRecorder(recorder)
            setAudioChunks([])
            setRecordingGroupeId(groupeId)
            setIsRecording(true)
            setRecordingDuration(0)

            recorder.start()

            // Démarrer compteur
            const timer = setInterval(() => {
                setRecordingDuration(prev => prev + 1)
            }, 1000)
            setRecordingTimer(timer)

        } catch (error) {
            console.error('Erreur accès micro:', error)
            alert('⚠️ Impossible d\'accéder au microphone. Vérifiez les permissions dans votre navigateur.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
            setIsRecording(false)
            if (recordingTimer) {
                clearInterval(recordingTimer)
                setRecordingTimer(null)
            }
        }
    }

    const uploadEnregistrement = async (groupeId, audioBlob, dureeSec) => {
        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('groupe_sens_id', groupeId)
            formData.append('audio', audioBlob, `groupe_${groupeId}.webm`)
            formData.append('duree_secondes', dureeSec)

            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (!response.ok) throw new Error('Upload échoué')

            const data = await response.json()

            // Mettre à jour l'état local
            setEnregistrements(prev => ({
                ...prev,
                [groupeId]: data.enregistrement
            }))

            alert('✅ Enregistrement sauvegardé !')

        } catch (error) {
            console.error('Erreur upload:', error)
            alert('❌ Erreur lors de la sauvegarde : ' + error.message)
        } finally {
            setIsUploading(false)
            setRecordingGroupeId(null)
            setRecordingDuration(0)
        }
    }

    const playEnregistrement = async (groupeId) => {
        const enreg = enregistrements[groupeId]
        if (!enreg) return

        // Arrêter toute lecture en cours
        if (currentAudio) {
            currentAudio.pause()
            currentAudio.currentTime = 0
        }
        if (speaking) {
            window.speechSynthesis.cancel()
        }

        const audio = new Audio(enreg.audio_url)
        setCurrentAudio(audio)
        setSpeaking(true)
        setCurrentSpeaking(groupeId)

        audio.onended = () => {
            setSpeaking(false)
            setCurrentSpeaking(null)
            setCurrentAudio(null)
        }

        audio.onerror = () => {
            setSpeaking(false)
            setCurrentSpeaking(null)
            setCurrentAudio(null)
            alert('❌ Erreur lors de la lecture de l\'enregistrement')
        }

        await audio.play()
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
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {isLoadingTexte ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        fontSize: '16px',
                        color: '#666'
                    }}>
                        Chargement du texte...
                    </div>
                ) : texte ? (
                    <>
                        {/* Titre */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '30px'
                        }}>
                            <h1 style={{
                                fontSize: 'clamp(22px, 5vw, 28px)',
                                fontWeight: 'bold',
                                marginBottom: '10px',
                                color: '#333'
                            }}>
                                {texte.titre}
                            </h1>
                            
                            {/* Contrôles de style */}
                            <div style={{
                                background: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '20px',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'center'
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
                            
                            {/* Bouton lecture complète */}
                            {speechSupported && (
                                <button
                                    onClick={lireToutLeTexte}
                                    disabled={isGeneratingAudio || (speaking && currentSpeaking !== 'all')}
                                    style={{
                                        backgroundColor: speaking && currentSpeaking === 'all' ? '#ef4444' : 
                                                        isGeneratingAudio && currentSpeaking === 'all' ? '#f59e0b' : '#8b5cf6',
                                        color: 'white',
                                        border: getCachedAudio(groupesSens.map(g => g.contenu).join('. '), selectedVoice) ? '2px solid #fbbf24' : 'none',
                                        borderRadius: '8px',
                                        padding: '12px 20px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: isGeneratingAudio ? 'wait' : 'pointer',
                                        marginTop: '10px',
                                        opacity: (isGeneratingAudio || (speaking && currentSpeaking !== 'all')) ? 0.7 : 1
                                    }}
                                    title={getCachedAudio(groupesSens.map(g => g.contenu).join('. '), selectedVoice) ? 'Audio complet en cache - pas de quota utilisé' : 'Générera un nouveau audio'}
                                >
                                    {speaking && currentSpeaking === 'all' ? '⏹️ Arrêter' : 
                                     isGeneratingAudio && currentSpeaking === 'all' ? '⏳ Génération...' : 
                                     getCachedAudio(groupesSens.map(g => g.contenu).join('. '), selectedVoice) ? '💾 Lire tout (Cache)' : '🎤 Lire tout (ElevenLabs)'}
                                </button>
                            )}
                        </div>

                        {/* Groupes de sens */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '30px'
                        }}>
                            {groupesSens.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666' }}>
                                    Aucun groupe de sens trouvé
                                </p>
                            ) : (
                                <div>
                                    {groupesSens.map((groupe, index) => (
                                        <div key={groupe.id} style={{
                                            marginBottom: index < groupesSens.length - 1 ? '20px' : '0'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: '15px'
                                            }}>
                                                <div style={{
                                                    fontSize: textSize + 'px',
                                                    fontFamily: textFont,
                                                    lineHeight: '1.6',
                                                    color: '#333',
                                                    flex: 1
                                                }}>
                                                    {groupe.contenu}
                                                </div>
                                                
                                                {/* Boutons audio du groupe */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px',
                                                    flexShrink: 0,
                                                    alignItems: 'center'
                                                }}>
                                                    {/* Bouton TTS */}
                                                    {speechSupported && groupe.contenu && groupe.contenu.trim() && (
                                                        <button
                                                            onClick={() => lireTexte(groupe.contenu, groupe.id)}
                                                            disabled={isGeneratingAudio || (speaking && currentSpeaking !== groupe.id)}
                                                            style={{
                                                                backgroundColor: speaking && currentSpeaking === groupe.id ? '#ef4444' :
                                                                                isGeneratingAudio && currentSpeaking === groupe.id ? '#f59e0b' : '#10b981',
                                                                color: 'white',
                                                                border: getCachedAudio(groupe.contenu, selectedVoice) ? '2px solid #fbbf24' : 'none',
                                                                borderRadius: '6px',
                                                                padding: '8px 12px',
                                                                fontSize: '14px',
                                                                cursor: isGeneratingAudio ? 'wait' : 'pointer',
                                                                opacity: (isGeneratingAudio || (speaking && currentSpeaking !== groupe.id)) ? 0.7 : 1,
                                                                minWidth: '45px'
                                                            }}
                                                            title={getCachedAudio(groupe.contenu, selectedVoice) ? 'Audio en cache - pas de quota utilisé' : 'Générera un nouveau audio'}
                                                        >
                                                            {speaking && currentSpeaking === groupe.id ? '⏹️' :
                                                             isGeneratingAudio && currentSpeaking === groupe.id ? '⏳' :
                                                             getCachedAudio(groupe.contenu, selectedVoice) ? '💾' : '🎤'}
                                                        </button>
                                                    )}

                                                    {/* Boutons enregistrement (uniquement si le groupe a du contenu) */}
                                                    {groupe.contenu && groupe.contenu.trim() && (
                                                        <>
                                                            {/* Bouton Enregistrer/Stop */}
                                                            <button
                                                                onClick={() => isRecording && recordingGroupeId === groupe.id
                                                                    ? stopRecording()
                                                                    : startRecording(groupe.id)}
                                                                disabled={isUploading || (isRecording && recordingGroupeId !== groupe.id)}
                                                                style={{
                                                                    backgroundColor: isRecording && recordingGroupeId === groupe.id
                                                                        ? '#ef4444'  // Rouge quand enregistrement
                                                                        : '#dc2626', // Rouge foncé par défaut
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    padding: '8px 12px',
                                                                    fontSize: '14px',
                                                                    cursor: (isUploading || (isRecording && recordingGroupeId !== groupe.id)) ? 'not-allowed' : 'pointer',
                                                                    opacity: (isUploading || (isRecording && recordingGroupeId !== groupe.id)) ? 0.5 : 1,
                                                                    minWidth: '45px',
                                                                    fontWeight: '500'
                                                                }}
                                                                title={isRecording && recordingGroupeId === groupe.id
                                                                    ? 'Arrêter l\'enregistrement'
                                                                    : 'Enregistrer ma voix'}
                                                            >
                                                                {isRecording && recordingGroupeId === groupe.id
                                                                    ? `⏹️ ${recordingDuration}s`
                                                                    : '🔴'}
                                                            </button>

                                                            {/* Bouton Lire Mon Enregistrement */}
                                                            {enregistrements[groupe.id] && (
                                                                <button
                                                                    onClick={() => playEnregistrement(groupe.id)}
                                                                    disabled={isUploading || isRecording}
                                                                    style={{
                                                                        backgroundColor: '#8b5cf6', // Violet
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        padding: '8px 12px',
                                                                        fontSize: '14px',
                                                                        cursor: (isUploading || isRecording) ? 'not-allowed' : 'pointer',
                                                                        opacity: (isUploading || isRecording) ? 0.5 : 1,
                                                                        minWidth: '45px'
                                                                    }}
                                                                    title="Écouter mon enregistrement"
                                                                >
                                                                    🎵
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sélecteur de voix et statut */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '15px'
                            }}>
                                {/* Contrôles audio */}
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* Sélection de voix */}
                                    <div>
                                        <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px' }}>
                                            🎤 Voix:
                                        </label>
                                        <select
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {availableVoices.map(voice => (
                                                <option key={voice.voice_id} value={voice.voice_id}>
                                                    {voice.name} {voice.recommended ? '⭐' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Contrôle de vitesse (Web Speech API seulement) */}
                                    <div>
                                        <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px' }}>
                                            ⚡ Vitesse (fallback): {speechSpeed}x
                                        </label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2.0"
                                            step="0.1"
                                            value={speechSpeed}
                                            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                                            style={{
                                                width: '100px',
                                                accentColor: '#10b981',
                                                opacity: quotaExceeded ? 1 : 0.5
                                            }}
                                            disabled={!quotaExceeded}
                                        />
                                    </div>
                                </div>

                                {/* Statut système */}
                                <div style={{
                                    fontSize: '13px',
                                    color: quotaExceeded ? '#d97706' : '#059669'
                                }}>
                                    {quotaExceeded ? (
                                        <span>⚠️ Fallback: Web Speech API (Paul/Julie) actif</span>
                                    ) : (
                                        <span>✅ ElevenLabs actif - Voix IA premium</span>
                                    )}
                                </div>

                                {/* Boutons d'action */}
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {quotaExceeded && (
                                        <button
                                            onClick={() => {setQuotaExceeded(false); setUseElevenLabs(true)}}
                                            style={{
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '5px 10px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔄 Réessayer ElevenLabs
                                        </button>
                                    )}
                                    
                                    <button
                                        onClick={() => {
                                            const keys = Object.keys(localStorage).filter(key => key.startsWith('elevenlabs_'))
                                            keys.forEach(key => localStorage.removeItem(key))
                                            alert(`Cache audio vidé (${keys.length} fichiers supprimés)`)
                                        }}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '5px 10px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑️ Vider cache
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Statistiques */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '10px', color: '#333' }}>📊 Statistiques</h3>
                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                flexWrap: 'wrap',
                                fontSize: '14px',
                                color: '#666'
                            }}>
                                <span>📝 {texte.nombre_groupes || 0} groupes de sens</span>
                                <span>🔤 {texte.nombre_mots_total || 0} mots total</span>
                                <span>🧩 {texte.nombre_mots_multi_syllabes || 0} mots multi-syllabes</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#666'
                    }}>
                        Texte non trouvé
                    </div>
                )}

                {/* Boutons de navigation */}
                <div style={{
                    textAlign: 'center',
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => router.push('/lire/voir-mes-textes')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour à mes textes
                    </button>

                    {texte && (
                        <>
                            <button
                                onClick={printText}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    padding: '12px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🖨️ Imprimer
                            </button>
                            <button
                                onClick={() => router.push(`/lire/modifier-texte/${texte.id}`)}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '12px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✏️ Modifier ce texte
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
