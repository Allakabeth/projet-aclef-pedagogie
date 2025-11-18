import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EnregistreurSyllabes from '../../components/EnregistreurSyllabes'

export default function SegmentationSyllabiqueTest() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [allMots, setAllMots] = useState([])
    const [currentMotIndex, setCurrentMotIndex] = useState(0)
    const [cuts, setCuts] = useState([]) // Positions des coupures
    const [showEnregistreur, setShowEnregistreur] = useState(false)
    const [segmentationEnCours, setSegmentationEnCours] = useState([])
    const [completedMots, setCompletedMots] = useState([])
    const [motsSegmentes, setMotsSegmentes] = useState([]) // Résultats des segmentations
    const [isSaving, setIsSaving] = useState(false)
    const [showDoute, setShowDoute] = useState(false)
    const [messageDoute, setMessageDoute] = useState('')
    const [showResults, setShowResults] = useState(false) // Afficher page de résultats
    const [syllabesToRecord, setSyllabesToRecord] = useState([]) // Syllabes à enregistrer (pas déjà existantes)
    const [existingSyllabes, setExistingSyllabes] = useState({}) // Map des syllabes déjà enregistrées
    const [currentAudioUrls, setCurrentAudioUrls] = useState([]) // URLs audio du mot courant

    // ⭐ SYSTÈME DE PRIORITÉ DES VOIX (personnel → ElevenLabs → système)
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Map des enregistrements personnels
    const [isLoadingAudio, setIsLoadingAudio] = useState(false) // Verrou pendant chargement audio
    const [tokenStatus, setTokenStatus] = useState('available') // 'available' | 'exhausted'
    const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB') // Voix ElevenLabs par défaut (Adam)
    const [currentAudio, setCurrentAudio] = useState(null) // Instance Audio en cours
    const [isPlaying, setIsPlaying] = useState(false) // État de lecture

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
            loadEnregistrements() // ⭐ Charger les enregistrements personnels
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
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
            const utterance = new SpeechSynthesisUtterance(`Le mot est : ${texte}`)
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
                            text: `Le mot est : ${texte}`,
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
                alert('Aucun mot multisyllabe trouvé')
                return
            }

            console.log(`📚 ${multisyllabesUniques.length} mots à segmenter`)

            const motsAvecIndex = multisyllabesUniques.map((mot, index) => ({
                id: index,
                contenu: mot
            }))

            setAllMots(motsAvecIndex)
            setCurrentMotIndex(0)
            setCuts([])
            setCompletedMots([])
            setGameStarted(true)
        } catch (error) {
            console.error('Erreur démarrage:', error)
            alert('Erreur lors du démarrage')
        }
    }

    const currentMot = allMots[currentMotIndex]

    // Calculer la segmentation en fonction des coupures
    const getSyllabesFromCuts = () => {
        if (!currentMot) return []

        const mot = currentMot.contenu
        const sortedCuts = [...cuts].sort((a, b) => a - b)

        const syllabes = []
        let lastCut = 0

        sortedCuts.forEach(cut => {
            syllabes.push(mot.substring(lastCut, cut))
            lastCut = cut
        })

        syllabes.push(mot.substring(lastCut))

        return syllabes.filter(s => s.length > 0)
    }

    const handleLetterClick = (index) => {
        // Toggle la coupure à cet index
        if (cuts.includes(index)) {
            setCuts(cuts.filter(c => c !== index))
        } else {
            setCuts([...cuts, index])
        }
    }

    const validerSegmentation = async () => {
        console.log('🔵 Début validerSegmentation')
        const syllabes = getSyllabesFromCuts()

        if (syllabes.length === 0) {
            alert('Veuillez segmenter le mot en cliquant entre les lettres')
            return
        }

        console.log('✂️ Segmentation validée:', syllabes.join('-'))

        // Vérifier quelles syllabes existent déjà
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/syllabes/check-existing', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ syllabes })
            })

            if (!response.ok) {
                console.error('Erreur vérification syllabes')
                // Continuer quand même
                setSegmentationEnCours(syllabes)
                setShowEnregistreur(true)
                return
            }

            const data = await response.json()
            console.log('📊 Vérification syllabes:', data.stats)

            // Séparer syllabes existantes et à enregistrer
            const existing = {}
            const toRecord = []

            data.syllabes.forEach(s => {
                if (s.exists) {
                    existing[s.syllabe] = s.audio_url
                    console.log(`✅ "${s.syllabe}" déjà enregistrée`)
                } else {
                    toRecord.push(s.syllabe)
                    console.log(`🎤 "${s.syllabe}" à enregistrer`)
                }
            })

            setExistingSyllabes(existing)
            setSyllabesToRecord(toRecord)
            setSegmentationEnCours(syllabes)

            // Ouvrir l'enregistreur (affichera les syllabes existantes différemment)
            if (toRecord.length === 0) {
                console.log('✅ Toutes les syllabes déjà enregistrées!')
            } else {
                console.log(`🎤 ${toRecord.length} syllabe(s) à enregistrer: ${toRecord.join(', ')}`)
            }
            setShowEnregistreur(true)

        } catch (error) {
            console.error('Erreur vérification syllabes:', error)
            // Continuer quand même
            setSegmentationEnCours(syllabes)
            setShowEnregistreur(true)
        }
    }

    const handleEnregistrementsComplete = async (result) => {
        setShowEnregistreur(false)
        setIsSaving(true)

        try {
            const token = localStorage.getItem('token')
            const formData = new FormData()

            // result = {syllabes: [...], syllabesModifiees: [...], actions: [...], audios: [...]}
            const { syllabes, syllabesModifiees, actions, audios } = result

            formData.append('mot', currentMot.contenu)
            formData.append('segmentation', JSON.stringify(syllabes))
            formData.append('syllabesModifiees', JSON.stringify(syllabesModifiees)) // NOUVEAU

            // Ajouter tous les fichiers audio (null si jeté)
            audios.forEach((blob, index) => {
                if (blob) { // Seulement si pas jeté
                    formData.append('audio', blob, `syllabe_${index}.webm`)
                }
            })

            // Ajouter les actions pour que l'API sache quelles syllabes ont été jetées/modifiées
            formData.append('actions', JSON.stringify(actions))

            const response = await fetch('/api/enregistrements-syllabes/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Segmentation sauvegardée:', data)

                // Stocker les URLs audio pour le mot courant
                if (data.enregistrement && data.enregistrement.audio_urls) {
                    setCurrentAudioUrls(data.enregistrement.audio_urls)
                }

                // Stocker le résultat pour l'affichage final
                const resultat = {
                    mot: currentMot.contenu,
                    syllabes: syllabes,
                    syllabesModifiees: syllabesModifiees,
                    actions: actions,
                    audioUrls: data.enregistrement?.audio_urls || []
                }
                setMotsSegmentes([...motsSegmentes, resultat])

                // Marquer comme complété (mais ne pas passer au suivant automatiquement)
                setCompletedMots([...completedMots, currentMot.id])
                setIsSaving(false)
            } else {
                const error = await response.json()
                console.error('❌ Erreur sauvegarde:', error)
                alert('Erreur lors de la sauvegarde: ' + (error.error || 'Erreur inconnue'))
                setIsSaving(false)
            }
        } catch (error) {
            console.error('💥 Erreur:', error)
            alert('Erreur lors de la sauvegarde')
            setIsSaving(false)
        }
    }

    const passerMotSuivant = () => {
        setCuts([])
        setSegmentationEnCours([])
        setIsSaving(false)
        setCurrentAudioUrls([]) // Réinitialiser les URLs audio

        if (currentMotIndex + 1 < allMots.length) {
            setCurrentMotIndex(currentMotIndex + 1)
        } else {
            // Tous les mots sont terminés, afficher la page de résultats
            setShowResults(true)
        }
    }

    const envoyerDemandeDoute = async () => {
        const syllabes = getSyllabesFromCuts()

        if (syllabes.length === 0) {
            alert('Veuillez d\'abord segmenter le mot')
            return
        }

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-syllabes/demande-doute', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mot: currentMot.contenu,
                    segmentation_proposee: syllabes,
                    message_doute: messageDoute || null
                })
            })

            if (response.ok) {
                alert('✅ Demande envoyée à l\'admin !')
                setShowDoute(false)
                setMessageDoute('')
            } else {
                const error = await response.json()
                alert('Erreur: ' + (error.error || 'Erreur inconnue'))
            }
        } catch (error) {
            console.error('Erreur envoi doute:', error)
            alert('Erreur lors de l\'envoi de la demande')
        }
    }

    if (isLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>
    }

    if (!gameStarted) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

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
                    {/* Titre + Navigation */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        textAlign: 'center'
                    }}>
                        <span style={{ marginRight: '8px' }}>✂️</span>
                        <span style={{
                            color: '#06B6D4'
                        }}>
                            Je coupe mes mots en morceaux
                        </span>
                    </h1>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '25px'
                    }}>
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                width: '50px',
                                height: '50px',
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.color = 'white'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                                e.currentTarget.style.color = '#10b981'
                            }}
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                width: '50px',
                                height: '50px',
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.color = 'white'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                                e.currentTarget.style.color = '#10b981'
                            }}
                        >
                            🏠
                        </button>
                    </div>

                    {/* Sélection d'un texte */}
                    <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>Sélectionner un texte</h3>

                    {textes.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                            borderRadius: '20px',
                            border: '2px dashed #0ea5e9',
                            boxShadow: '0 4px 15px rgba(14, 165, 233, 0.1)'
                        }}>
                            <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                                Aucun texte disponible
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
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
                                const isSelected = selectedTextes.includes(texte.id)

                                return (
                                    <div
                                        key={texte.id}
                                        onClick={() => {
                                            // Sélection unique
                                            setSelectedTextes([texte.id])
                                        }}
                                        style={{
                                            background: couleur.bg,
                                            border: isSelected ? '3px solid #10b981' : 'none',
                                            borderRadius: '20px',
                                            padding: isMobile ? '10px 15px' : '15px',
                                            boxShadow: isSelected
                                                ? `0 8px 25px ${couleur.shadow}, 0 0 0 3px #10b981`
                                                : `0 4px 15px ${couleur.shadow}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        {/* Radio button PC uniquement */}
                                        {!isMobile && (
                                            <input
                                                type="radio"
                                                name="texte-selection"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    if (e.target.checked) {
                                                        setSelectedTextes([texte.id])
                                                    }
                                                }}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    cursor: 'pointer',
                                                    accentColor: '#10b981'
                                                }}
                                            />
                                        )}

                                        {/* Contenu : titre + stats */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: isMobile ? 'center' : 'space-between',
                                            alignItems: 'center',
                                            width: '100%',
                                            gap: '10px'
                                        }}>
                                            <div style={{
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                flex: '1',
                                                textAlign: isMobile ? 'center' : 'left',
                                                whiteSpace: isMobile ? 'nowrap' : 'normal',
                                                overflow: isMobile ? 'hidden' : 'visible',
                                                textOverflow: isMobile ? 'ellipsis' : 'clip'
                                            }}>
                                                {texte.titre}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <button
                        onClick={startGame}
                        disabled={selectedTextes.length === 0}
                        style={{
                            width: '100%',
                            padding: '18px',
                            backgroundColor: 'white',
                            color: selectedTextes.length > 0 ? '#10b981' : '#d1d5db',
                            border: selectedTextes.length > 0 ? '3px solid #10b981' : '3px solid #d1d5db',
                            borderRadius: '12px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedTextes.length > 0) {
                                e.currentTarget.style.backgroundColor = '#f0fdf4'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedTextes.length > 0) {
                                e.currentTarget.style.backgroundColor = 'white'
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'none'
                            }
                        }}
                    >
                        Commencer
                    </button>
                </div>
            </div>
        )
    }

    // Page de résultats
    if (showResults) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px'
            }}>
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                }}>
                    <h1 style={{
                        textAlign: 'center',
                        color: '#1f2937',
                        marginBottom: '10px'
                    }}>
                        🎉 Segmentation terminée !
                    </h1>

                    <p style={{
                        textAlign: 'center',
                        color: '#6b7280',
                        marginBottom: '30px'
                    }}>
                        Voici tous les mots que tu as segmentés :
                    </p>

                    {/* Liste des mots segmentés */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                    }}>
                        {motsSegmentes.map((item, index) => {
                            // Construire l'affichage des syllabes
                            const syllabesAffichees = item.syllabes.map((syllabe, idx) => {
                                const action = item.actions[idx]
                                const modifiee = item.syllabesModifiees[idx]

                                if (action === 'jeter') {
                                    return null // Ne pas afficher les syllabes jetées
                                }

                                if (action === 'modifier') {
                                    return `${syllabe} → ${modifiee}`
                                }

                                return syllabe
                            }).filter(s => s !== null)

                            return (
                                <div
                                    key={index}
                                    style={{
                                        padding: '20px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: '#1f2937',
                                        marginBottom: '10px'
                                    }}>
                                        {index + 1}. {item.mot}
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        color: '#3b82f6',
                                        fontWeight: 'bold'
                                    }}>
                                        {syllabesAffichees.join(' - ')}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Boutons */}
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        marginTop: '30px'
                    }}>
                        <button
                            onClick={() => {
                                setShowResults(false)
                                setGameStarted(false)
                                setMotsSegmentes([])
                                setCompletedMots([])
                                setCurrentMotIndex(0)
                            }}
                            style={{
                                flex: 1,
                                padding: '15px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Nouvelle segmentation
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                flex: 1,
                                padding: '15px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ✅ Retour au tableau de bord
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Interface de segmentation
    const syllabes = getSyllabesFromCuts()
    const motLetters = currentMot.contenu.split('')

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>✂️</span>
                    <span style={{ color: '#06B6D4' }}>
                        Je coupe mes mots en morceaux
                    </span>
                </h1>

                {/* Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '25px'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981'
                            e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.color = '#10b981'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={() => router.push('/lire/mes-textes-references')}
                        style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981'
                            e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.color = '#10b981'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981'
                            e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.color = '#10b981'
                        }}
                    >
                        🏠
                    </button>
                    <button
                        onClick={() => playAudio(currentMot.contenu)}
                        disabled={isLoadingAudio}
                        style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '20px',
                            cursor: isLoadingAudio ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: isLoadingAudio ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoadingAudio) {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.color = 'white'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white'
                            e.currentTarget.style.color = '#10b981'
                        }}
                    >
                        {isPlaying ? '⏸️' : '🔊'}
                    </button>
                    {completedMots.includes(currentMot.id) && (
                        <button
                            onClick={passerMotSuivant}
                            style={{
                                width: '50px',
                                height: '50px',
                                backgroundColor: 'white',
                                color: '#10b981',
                                border: '2px solid #10b981',
                                borderRadius: '12px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.color = 'white'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                                e.currentTarget.style.color = '#10b981'
                            }}
                        >
                            {currentMotIndex + 1 < allMots.length ? '→' : '✓'}
                        </button>
                    )}
                </div>

                {/* Info progression */}
                <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    Mot {currentMotIndex + 1} sur {allMots.length} • {completedMots.length} terminés
                </div>

            {/* Mot avec interface de coupure */}
            <div style={{
                marginBottom: '30px',
                padding: '30px'
            }}>
                <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '15px',
                    textAlign: 'center'
                }}>
                    Clique entre les lettres pour découper :
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: '5px',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#06B6D4'
                }}>
                    {motLetters.map((letter, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span>{letter}</span>
                            {index < motLetters.length - 1 && (
                                <button
                                    onClick={() => handleLetterClick(index + 1)}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        margin: '0 2px',
                                        backgroundColor: 'transparent',
                                        border: cuts.includes(index + 1) ? '2px solid #dc2626' : '2px dashed #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 24 24\'><text x=\'0\' y=\'20\' font-size=\'20\'>✂️</text></svg>") 16 16, pointer',
                                        fontSize: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {cuts.includes(index + 1) ? '✂️' : ''}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Aperçu segmentation */}
                {cuts.length > 0 && (
                    <div style={{
                        marginTop: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                        }}>
                            {syllabes.map((syllabe, index) => {
                                const hasAudio = currentAudioUrls[index]
                                const cursorIcon = hasAudio ? '🎧' : '🔇'
                                const cursorUrl = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><text x='0' y='20' font-size='20'>${cursorIcon}</text></svg>") 16 16, pointer`

                                return (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            if (hasAudio) {
                                                const audio = new Audio(currentAudioUrls[index])
                                                audio.play().catch(err => console.error('Erreur lecture audio:', err))
                                            }
                                        }}
                                        style={{
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            color: '#06B6D4',
                                            backgroundColor: 'white',
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: '2px solid #06B6D4',
                                            cursor: cursorUrl
                                        }}
                                    >
                                        {syllabe}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {/* 1. Bouton Valider */}
                <button
                    onClick={validerSegmentation}
                    disabled={syllabes.length === 0 || isSaving}
                    style={{
                        padding: '15px',
                        backgroundColor: syllabes.length > 0 && !isSaving ? '#10b981' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: syllabes.length > 0 && !isSaving ? 'pointer' : 'not-allowed'
                    }}
                >
                    {isSaving ? '💾 Sauvegarde...' : 'Valider'}
                </button>

                {/* 2. Bouton On ne voit pas et on n'entend pas la même chose */}
                <button
                    onClick={async () => {
                        if (!confirm(`Mettre "${currentMot.contenu}" dans le panier des sons complexes ?\n\nCe mot ne sera pas segmenté.`)) return

                        try {
                            const token = localStorage.getItem('token')
                            const response = await fetch('/api/mots-sons-complexes/add', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    mot: currentMot.contenu,
                                    raison: null
                                })
                            })

                            if (response.ok) {
                                alert(`✅ "${currentMot.contenu}" ajouté au panier sons complexes !`)
                                passerMotSuivant()
                            } else {
                                const error = await response.json()
                                alert('Erreur: ' + (error.error || 'Erreur inconnue'))
                            }
                        } catch (error) {
                            console.error('Erreur:', error)
                            alert('Erreur lors de l\'ajout au panier')
                        }
                    }}
                    disabled={isSaving}
                    style={{
                        padding: '15px',
                        backgroundColor: !isSaving ? '#fbbf24' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: !isSaving ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 24 24\'><text x=\'0\' y=\'20\' font-size=\'20\'>🗑️</text></svg>") 16 16, pointer' : 'not-allowed'
                    }}
                >
                    On n'entend pas et on ne voit pas la même chose
                </button>

                {/* 3. Bouton J'ai un doute */}
                <button
                    onClick={() => setShowDoute(true)}
                    disabled={syllabes.length === 0}
                    style={{
                        padding: '12px',
                        backgroundColor: syllabes.length > 0 ? '#f59e0b' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: syllabes.length > 0 ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 24 24\'><text x=\'0\' y=\'20\' font-size=\'20\'>🤔</text></svg>") 16 16, pointer' : 'not-allowed'
                    }}
                >
                    ❓ J'ai un doute - Demander l'avis des responsables
                </button>

                {/* 4. Bouton Recommencer */}
                <button
                    onClick={() => setCuts([])}
                    style={{
                        padding: '12px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Recommencer ce mot
                </button>
            </div>

            {/* Modal Enregistreur Syllabes */}
            {showEnregistreur && (
                <EnregistreurSyllabes
                    syllabes={segmentationEnCours}
                    mot={currentMot.contenu}
                    existingSyllabes={existingSyllabes}
                    onComplete={handleEnregistrementsComplete}
                    onCancel={() => {
                        setShowEnregistreur(false)
                        setIsSaving(false)
                    }}
                />
            )}

            {/* Modal Demande de Doute */}
            {showDoute && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '100%'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
                            ❓ Demande d'aide à l'admin
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <strong>Mot :</strong> {currentMot.contenu}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <strong>Tes morceaux :</strong> {syllabes.join(' - ')}
                        </div>

                        <textarea
                            value={messageDoute}
                            onChange={(e) => setMessageDoute(e.target.value)}
                            placeholder="Pourquoi as-tu un doute ? (optionnel)"
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                marginBottom: '15px',
                                resize: 'vertical'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowDoute(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={envoyerDemandeDoute}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Envoyer à l'admin
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    )
}
