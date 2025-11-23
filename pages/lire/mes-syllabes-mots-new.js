import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

// Importer les composants sans SSR
const ExerciceClassement = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceClassement'), { ssr: false })
const ExerciceOuEst = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceOuEst'), { ssr: false })
const ExerciceQuestCe = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceQuestCe'), { ssr: false })

// Styles personnalisés
const customStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }

    /* Icônes exercices - mobile uniquement */
    .mobile-exercices-icons {
        display: none;
    }

    @media (max-width: 768px) {
        .mobile-exercices-icons {
            display: flex !important;
        }
    }

    /* Checkbox ronde */
    input[type="checkbox"].round-checkbox {
        appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid #10b981;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        margin: 0;
        flex-shrink: 0;
    }

    input[type="checkbox"].round-checkbox:checked {
        background-color: #10b981;
    }

    input[type="checkbox"].round-checkbox:checked::after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
`

export default function MesSyllabesMotsNew() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState(new Set())
    const [textesDetails, setTextesDetails] = useState({})
    const [activeExercice, setActiveExercice] = useState(null) // null, 'classement', 'ou-est', 'quest-ce'
    const [showPaniers, setShowPaniers] = useState(false)
    const [paniersData, setPaniersData] = useState(null)

    // ⭐ SYSTÈME DE PRIORITÉ DES VOIX (personnel → ElevenLabs → système)
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Map des enregistrements personnels
    const [isLoadingAudio, setIsLoadingAudio] = useState(false) // Verrou pendant chargement audio
    const [tokenStatus, setTokenStatus] = useState('available') // 'available' | 'exhausted'
    const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB') // Voix ElevenLabs par défaut (Adam)
    const [currentAudio, setCurrentAudio] = useState(null) // Instance Audio en cours
    const [isPlaying, setIsPlaying] = useState(false) // État de lecture

    useEffect(() => {
        const initPage = async () => {
            const token = localStorage.getItem('token')
            const userData = localStorage.getItem('user')

            if (!token || !userData) {
                router.push('/login')
                return
            }

            try {
                setUser(JSON.parse(userData))
                await loadTextes()
                await loadEnregistrements() // ⭐ Charger les enregistrements personnels
                setIsLoading(false)
            } catch (error) {
                console.error('Erreur:', error)
                router.push('/login')
            }
        }

        initPage()
    }, [router])

    // ========================================================================
    // FONCTIONS CACHE ELEVENLABS
    // ========================================================================

    const getCachedAudio = (text, voiceId) => {
        try {
            const cacheKey = `audio_${text}_${voiceId}`
            const cached = localStorage.getItem(cacheKey)
            return cached ? JSON.parse(cached) : null
        } catch {
            return null
        }
    }

    const setCachedAudio = (text, voiceId, audioData) => {
        try {
            const cacheKey = `audio_${text}_${voiceId}`
            localStorage.setItem(cacheKey, JSON.stringify(audioData))
        } catch (error) {
            console.warn('Impossible de mettre en cache:', error)
        }
    }

    // ========================================================================
    // CHARGEMENT DES ENREGISTREMENTS PERSONNELS
    // ========================================================================

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-mots/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log(`🎤 ${data.count} enregistrement(s) vocal(aux) chargé(s)`)

                // ⚠️ IMPORTANT: Normaliser les clés pour correspondre à playAudio() (garder apostrophes internes)
                const mapNormalise = {}
                Object.entries(data.enregistrementsMap || {}).forEach(([mot, enreg]) => {
                    const motNormalise = mot
                        .toLowerCase()
                        .trim()
                        .replace(/^[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+/, '')
                        .replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+$/, '')
                    mapNormalise[motNormalise] = enreg
                })

                console.log('📋 Enregistrements normalisés:', Object.keys(mapNormalise))
                setEnregistrementsMap(mapNormalise)
            } else {
                console.error('Erreur chargement enregistrements vocaux')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
    }

    // ========================================================================
    // LECTURE ENREGISTREMENT PERSONNEL
    // ========================================================================

    const playEnregistrement = async (enregistrement) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('⚠️ Enregistrement invalide')
            setIsLoadingAudio(false)
            return false
        }

        try {
            console.log('🎵 Lecture enregistrement personnel:', enregistrement.mot)
            const audio = new Audio(enregistrement.audio_url)
            setCurrentAudio(audio)

            audio.onended = () => {
                setIsPlaying(false)
                setCurrentAudio(null)
                setIsLoadingAudio(false)
            }

            audio.onerror = () => {
                console.error('❌ Erreur lecture enregistrement')
                setIsPlaying(false)
                setCurrentAudio(null)
                setIsLoadingAudio(false)
                return false
            }

            await audio.play()
            return true

        } catch (error) {
            console.error('❌ Erreur playEnregistrement:', error)
            setIsLoadingAudio(false)
            return false
        }
    }

    // ========================================================================
    // FALLBACK WEB SPEECH (SANS HORTENSE)
    // ========================================================================

    const fallbackToWebSpeech = (texte) => {
        try {
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8

            const voices = window.speechSynthesis.getVoices()
            // Exclure explicitement Hortense et chercher une voix masculine
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense')
            )

            if (voixMasculine) {
                utterance.voice = voixMasculine
            }

            utterance.onend = () => {
                setIsPlaying(false)
                setIsLoadingAudio(false)
            }

            utterance.onerror = () => {
                setIsPlaying(false)
                setIsLoadingAudio(false)
            }

            window.speechSynthesis.speak(utterance)
        } catch (error) {
            setIsPlaying(false)
            setIsLoadingAudio(false)
        }
    }

    // ========================================================================
    // LECTURE AUDIO AVEC PRIORITÉ (Personnel → ElevenLabs → Web Speech)
    // ========================================================================

    const playAudio = async (texte) => {
        // ⭐ VERROU - Empêcher appels multiples pendant chargement
        if (isLoadingAudio) {
            console.log('⏸️ Audio déjà en cours de chargement, requête ignorée')
            return
        }

        setIsLoadingAudio(true)

        // ⭐ NETTOYAGE INCONDITIONNEL - Arrêter TOUT son en cours
        if (currentAudio) {
            currentAudio.pause()
            currentAudio.currentTime = 0
            setCurrentAudio(null)
        }
        window.speechSynthesis.cancel()

        if (isPlaying && currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setIsPlaying(false)
            setIsLoadingAudio(false)
            return
        }

        setIsPlaying(true)

        try {
            // Normaliser le mot pour chercher dans enregistrementsMap (garder apostrophes internes)
            const motNormalise = texte
                .toLowerCase()
                .trim()
                .replace(/^[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+/, '')
                .replace(/[^a-zA-ZàâäéèêëïîôöùûüÿæœçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÆŒÇ']+$/, '')

            console.log(`🔍 Recherche enregistrement pour "${motNormalise}"`)
            console.log(`🔍 Contient "${motNormalise}"?`, motNormalise in enregistrementsMap)

            // ========================================================
            // PRIORITÉ 1 : VOIX PERSONNALISÉE
            // ========================================================
            if (enregistrementsMap[motNormalise]) {
                console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
                console.log(`🎵 URL:`, enregistrementsMap[motNormalise].audio_url)
                const success = await playEnregistrement(enregistrementsMap[motNormalise])
                if (success) {
                    // Note: setIsLoadingAudio(false) sera appelé dans les callbacks de playEnregistrement
                    return
                }
                console.log('⚠️ Échec enregistrement personnel, fallback ElevenLabs')
            }

            // ========================================================
            // PRIORITÉ 2 : ELEVENLABS AVEC CACHE
            // ========================================================
            const cachedAudio = getCachedAudio(texte, selectedVoice)
            let audioData = null

            if (cachedAudio) {
                audioData = cachedAudio
            } else if (tokenStatus !== 'exhausted') {
                try {
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

                    if (response.ok) {
                        const data = await response.json()
                        audioData = data.audio
                        setCachedAudio(texte, selectedVoice, audioData)
                        setTokenStatus('available')
                    } else {
                        setTokenStatus('exhausted')
                        fallbackToWebSpeech(texte)
                        // Note: setIsLoadingAudio(false) sera appelé dans les callbacks de fallbackToWebSpeech
                        return
                    }
                } catch (error) {
                    setTokenStatus('exhausted')
                    fallbackToWebSpeech(texte)
                    // Note: setIsLoadingAudio(false) sera appelé dans les callbacks de fallbackToWebSpeech
                    return
                }
            } else {
                // ========================================================
                // PRIORITÉ 3 : WEB SPEECH API (Paul/Julie, PAS Hortense)
                // ========================================================
                fallbackToWebSpeech(texte)
                // Note: setIsLoadingAudio(false) sera appelé dans les callbacks de fallbackToWebSpeech
                return
            }

            // Jouer l'audio ElevenLabs
            if (audioData) {
                const audio = new Audio(`data:audio/mp3;base64,${audioData}`)
                setCurrentAudio(audio)

                audio.onended = () => {
                    setIsPlaying(false)
                    setCurrentAudio(null)
                    setIsLoadingAudio(false)
                }

                audio.onerror = () => {
                    console.error('Erreur lecture ElevenLabs, fallback Web Speech')
                    setIsPlaying(false)
                    setCurrentAudio(null)
                    fallbackToWebSpeech(texte)
                }

                await audio.play()
            }

        } catch (error) {
            console.error('Erreur playAudio:', error)
            setIsPlaying(false)
            setIsLoadingAudio(false)
        }
    }

    const loadTextes = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/textes/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setTextes(data.textes || [])
                loadTextesDetails(data.textes || [])
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const loadTextesDetails = async (textesListe) => {
        const token = localStorage.getItem('token')
        const details = {}

        // Charger les syllabes-mots classés depuis localStorage
        const syllabesMotsClasses = JSON.parse(localStorage.getItem('syllabes-mots-classes') || '{}')

        for (const texte of textesListe) {
            try {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texte.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (response.ok) {
                    const data = await response.json()
                    const monosyllabesDuTexte = data.monosyllabes || []
                    const totalMots = monosyllabesDuTexte.length

                    // Récupérer les mots classés pour ce texte
                    const motsClassesData = syllabesMotsClasses[texte.id]
                    let motsTraites = 0

                    if (motsClassesData?.paniers) {
                        // Extraire tous les mots des paniers
                        const tousMotsClasses = []
                        Object.values(motsClassesData.paniers).forEach(panier => {
                            if (Array.isArray(panier)) {
                                tousMotsClasses.push(...panier)
                            }
                        })

                        // Compter combien de monosyllabes de CE texte sont classés
                        motsTraites = monosyllabesDuTexte.filter(mot => tousMotsClasses.includes(mot)).length
                    }

                    details[texte.id] = {
                        nombreSyllabesMots: totalMots,
                        motsTraites: motsTraites
                    }
                }
            } catch (error) {
                details[texte.id] = { nombreSyllabesMots: 0, motsTraites: 0 }
            }
        }

        setTextesDetails(details)
    }

    const toggleTexteSelection = (texteId) => {
        const newSelected = new Set(selectedTextes)
        if (newSelected.has(texteId)) {
            newSelected.delete(texteId)
        } else {
            newSelected.add(texteId)
        }
        setSelectedTextes(newSelected)
    }

    const startClassement = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('classement')
    }

    const retourSelection = () => {
        setActiveExercice(null)
        // Recharger les détails pour mettre à jour la progression
        loadTextesDetails(textes)
    }

    const startOuEst = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('ou-est')
    }

    const startQuestCe = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('quest-ce')
    }

    const voirPaniers = () => {
        // Charger les paniers depuis localStorage
        const syllabesMotsClasses = JSON.parse(localStorage.getItem('syllabes-mots-classes') || '{}')

        // Combiner tous les paniers de tous les textes sélectionnés
        const paniersGlobaux = {}

        selectedTextes.forEach(texteId => {
            const dataTexte = syllabesMotsClasses[texteId]
            if (dataTexte?.paniers) {
                Object.keys(dataTexte.paniers).forEach(lettre => {
                    if (!paniersGlobaux[lettre]) {
                        paniersGlobaux[lettre] = []
                    }
                    paniersGlobaux[lettre].push(...dataTexte.paniers[lettre])
                })
            }
        })

        // Éliminer les doublons dans chaque panier
        Object.keys(paniersGlobaux).forEach(lettre => {
            paniersGlobaux[lettre] = [...new Set(paniersGlobaux[lettre])]
        })

        setPaniersData(paniersGlobaux)
        setShowPaniers(true)
    }

    if (isLoading) {
        return null
    }

    // Si on affiche les paniers
    if (showPaniers) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                padding: '15px'
            }}>
                <div style={{
                    maxWidth: '940px',
                    margin: '0 auto'
                }}>
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>👁️</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Mes Syllabes-Mots Classés
                        </span>
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '30px'
                    }}>
                        <button
                            onClick={() => setShowPaniers(false)}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            ← Retour
                        </button>
                    </div>

                    {!paniersData || Object.keys(paniersData).length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: '#fff3cd',
                            borderRadius: '12px',
                            border: '2px solid #ffc107'
                        }}>
                            <p style={{ fontSize: '20px', marginBottom: '10px' }}>📭 Aucun mot classé</p>
                            <p style={{ fontSize: '14px', color: '#666' }}>
                                Commencez un exercice pour classer vos syllabes-mots !
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '15px'
                        }}>
                            {Object.keys(paniersData).sort().map(lettre => {
                                const mots = paniersData[lettre]
                                if (!mots || mots.length === 0) return null

                                return (
                                    <div
                                        key={lettre}
                                        style={{
                                            background: 'white',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '15px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '28px',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            marginBottom: '10px',
                                            color: lettre === '🗑️' ? '#ef4444' : '#3b82f6'
                                        }}>
                                            {lettre}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            textAlign: 'center',
                                            color: '#6b7280',
                                            marginBottom: '10px'
                                        }}>
                                            {mots.length} mot{mots.length > 1 ? 's' : ''}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '5px'
                                        }}>
                                            {mots.map((mot, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px',
                                                        background: '#f3f4f6',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            playAudio(mot)
                                                        }}
                                                        disabled={isLoadingAudio}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: isLoadingAudio ? 'wait' : 'pointer',
                                                            fontSize: '16px',
                                                            padding: '0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            opacity: isLoadingAudio ? 0.5 : 1,
                                                            flexShrink: 0
                                                        }}
                                                        title="Écouter le mot"
                                                    >
                                                        🔊
                                                    </button>
                                                    <span style={{ flex: 1, textAlign: 'center' }}>
                                                        {mot}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Si l'exercice Classement est actif, afficher le composant
    if (activeExercice === 'classement') {
        return <ExerciceClassement
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    // Si l'exercice Où est est actif, afficher le composant
    if (activeExercice === 'ou-est') {
        return <ExerciceOuEst
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    // Si l'exercice Qu'est-ce est actif, afficher le composant
    if (activeExercice === 'quest-ce') {
        return <ExerciceQuestCe
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />
            <div style={{
                maxWidth: '100%',
                margin: '0 auto',
                padding: '0 20px'
            }}>
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>📚</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Mes Syllabes-Mots
                    </span>
                </h1>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    color: '#666',
                    fontSize: '18px'
                }} className="desktop-only">
                    Jouez avec vos mots pour apprendre les syllabes !
                </p>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '40px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '10px',
                            fontSize: '22px',
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
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#8b5cf6',
                            border: '2px solid #8b5cf6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                    <button
                        onClick={voirPaniers}
                        disabled={selectedTextes.size === 0}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#f59e0b',
                            border: '2px solid #f59e0b',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Voir mes syllabes-mots"
                    >
                        👁️
                    </button>

                    {/* Icônes exercices - Mobile uniquement */}
                    <button
                        onClick={startClassement}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#ef4444',
                            border: '2px solid #ef4444',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Classement"
                    >
                        🏷️
                    </button>

                    <button
                        onClick={startOuEst}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Où est ce mot ?"
                    >
                        🔍
                    </button>

                    <button
                        onClick={startQuestCe}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Qu'est-ce que c'est ?"
                    >
                        🤔
                    </button>
                </div>

                {textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        border: '1px solid #ffeaa7',
                        marginBottom: '40px'
                    }}>
                        <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            Créez d'abord un texte de référence dans "📚 Mes textes références"
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'block',
                        marginBottom: '40px'
                    }}>
                        {/* Liste des textes centrée */}
                        <div style={{
                            maxWidth: '940px',
                            margin: '0 auto 30px auto'
                        }}>
                            <h2 className="desktop-only" style={{
                                marginBottom: '20px',
                                color: '#333',
                                fontSize: '20px',
                                textAlign: 'center'
                            }}>
                                🎯 Choisissez vos textes ({selectedTextes.size} sélectionné{selectedTextes.size > 1 ? 's' : ''})
                            </h2>

                            <div style={{ display: 'grid', gap: '15px' }}>
                                {textes.map((texte, index) => {
                                    const couleurs = [
                                        { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(240, 147, 251, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79, 172, 254, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', shadow: 'rgba(250, 112, 154, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', shadow: 'rgba(168, 237, 234, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', shadow: 'rgba(255, 154, 158, 0.3)' },
                                        { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', shadow: 'rgba(255, 236, 210, 0.3)' }
                                    ]
                                    const couleur = couleurs[index % couleurs.length]
                                    const details = textesDetails[texte.id]

                                    return (
                                        <div
                                            key={texte.id}
                                            onClick={() => toggleTexteSelection(texte.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                padding: '15px',
                                                background: couleur.bg,
                                                borderRadius: '12px',
                                                border: selectedTextes.has(texte.id) ? '3px solid #10b981' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: selectedTextes.has(texte.id)
                                                    ? `0 8px 24px ${couleur.shadow}, 0 0 0 3px rgba(16, 185, 129, 0.2)`
                                                    : `0 4px 12px ${couleur.shadow}`
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="round-checkbox desktop-only"
                                                checked={selectedTextes.has(texte.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    toggleTexteSelection(texte.id)
                                                }}
                                            />
                                            <div style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '15px'
                                            }}>
                                                <div style={{
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    {texte.titre}
                                                </div>
                                                <div className="desktop-only" style={{
                                                    fontSize: '14px',
                                                    color: 'white',
                                                    whiteSpace: 'nowrap',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                }}>
                                                    {details ?
                                                        `${details.motsTraites || 0}/${details.nombreSyllabesMots} syllabes-mots traités` :
                                                        'Chargement...'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Cartes exercices - Desktop uniquement */}
                        <div className="desktop-only" style={{
                            maxWidth: '940px',
                            margin: '0 auto',
                            marginTop: '40px'
                        }}>
                            <h2 style={{
                                marginBottom: '30px',
                                color: '#333',
                                fontSize: '22px',
                                textAlign: 'center'
                            }}>
                                🎮 Choisissez votre exercice
                            </h2>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '20px'
                            }}>
                                {/* Carte 1: Classement */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #ef4444',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🏷️
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#ef4444',
                                        textAlign: 'center'
                                    }}>
                                        Classement
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Classez les syllabes et les mots selon leurs caractéristiques
                                    </p>
                                    <button
                                        onClick={startClassement}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#ef4444' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>

                                {/* Carte 2: Où est ce mot ? */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #10b981',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🔍
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#10b981',
                                        textAlign: 'center'
                                    }}>
                                        Où est ce mot ?
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Écoutez le mot et trouvez-le parmi les propositions
                                    </p>
                                    <button
                                        onClick={startOuEst}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#10b981' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>

                                {/* Carte 3: Qu'est-ce que c'est ? */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #3b82f6',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🤔
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#3b82f6',
                                        textAlign: 'center'
                                    }}>
                                        Qu'est-ce que c'est ?
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Lisez le mot et identifiez-le parmi les propositions audio
                                    </p>
                                    <button
                                        onClick={startQuestCe}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#3b82f6' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
