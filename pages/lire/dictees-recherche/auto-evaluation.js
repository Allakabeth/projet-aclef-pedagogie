import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DicteesRechercheAutoEvaluation() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTexteIds, setSelectedTexteIds] = useState([])
    const [phraseGeneree, setPhraseGeneree] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentTextIndex, setCurrentTextIndex] = useState(0)
    const [hasSucceeded, setHasSucceeded] = useState(false)
    const [showWordHelp, setShowWordHelp] = useState(false)
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)
    const [currentPlayingGroup, setCurrentPlayingGroup] = useState(null)
    const [hasListened, setHasListened] = useState(false)
    const [phraseCount, setPhraseCount] = useState(0)
    const [maxPhrases] = useState(10)
    const [enregistrements, setEnregistrements] = useState({})
    const [tokenStatus, setTokenStatus] = useState('available')
    const [groupesComplets, setGroupesComplets] = useState([])
    const [isMobile, setIsMobile] = useState(false)
    const [etape, setEtape] = useState('exercice')
    const [phrasesReussies, setPhrasesReussies] = useState([])
    const [phrasesARevoir, setPhrasesARevoir] = useState([])
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

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-groupes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const enregMap = {}
                data.enregistrements.forEach(e => {
                    enregMap[e.groupe_sens_id] = e.audio_url
                })
                setEnregistrements(enregMap)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
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
        setHasSucceeded(false)

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
                const errorData = await response.json()
                console.log('API quota dépassé, utilisation du fallback')
                
                // Fallback : génération simple sans IA
                const groupesContenu = allGroupes.map(g => g.contenu)
                const groupesChoisis = []
                
                // Choisir 2-3 groupes aléatoirement
                const nombreGroupes = Math.min(3, Math.max(2, groupesContenu.length))
                while (groupesChoisis.length < nombreGroupes && groupesChoisis.length < groupesContenu.length) {
                    const index = Math.floor(Math.random() * groupesContenu.length)
                    const groupe = groupesContenu[index]
                    if (!groupesChoisis.includes(groupe)) {
                        groupesChoisis.push(groupe)
                    }
                }
                
                // Créer une phrase simple en combinant les groupes
                const phrase = groupesChoisis.join(' ')
                
                const fallbackData = {
                    success: true,
                    phrase_generee: phrase,
                    groupes_utilises: groupesChoisis,
                    mots_ajoutes: []
                }
                
                setPhraseGeneree(fallbackData)
                return
            }

            const data = await response.json()

            // Récupérer les groupes complets avec IDs à partir de allGroupes
            const groupesUtilisesComplets = []
            if (data.groupes_utilises) {
                data.groupes_utilises.forEach(contenu => {
                    const groupeComplet = allGroupes.find(g => g.contenu === contenu)
                    if (groupeComplet) {
                        groupesUtilisesComplets.push(groupeComplet)
                    }
                })
            }
            setGroupesComplets(groupesUtilisesComplets)
            setPhraseGeneree(data)
            setPhraseCount(prev => prev + 1)

        } catch (error) {
            console.error('Erreur génération:', error)
            alert('Erreur lors de la génération de phrase')
        } finally {
            setIsGenerating(false)
        }
    }

    useEffect(() => {
        if (textes.length > 0 && selectedTexteIds.length > 0) {
            loadEnregistrements()
            genererPhrase()
        }
    }, [textes, selectedTexteIds])

    const playEnregistrement = async (audioUrl) => {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl)
            audio.onended = () => resolve(true)
            audio.onerror = () => reject(false)
            audio.play().catch(() => reject(false))
        })
    }

    const playAudioElevenLabs = async (text) => {
        if (tokenStatus === 'exhausted') return false

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
                return true
            } else if (response.status === 429) {
                setTokenStatus('exhausted')
                return false
            }
        } catch (error) {
            console.log('ElevenLabs non disponible')
        }
        return false
    }

    const fallbackToWebSpeech = (text) => {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve()
                return
            }

            const voices = window.speechSynthesis.getVoices()

            // Chercher voix masculine française (JAMAIS Hortense)
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul'))
            )

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.voice = voixMasculine || voices.find(v => v.lang.includes('fr'))

            utterance.onend = () => resolve()
            window.speechSynthesis.speak(utterance)
        })
    }

    const playAudio = async (text, groupeId = null) => {
        if (!text.trim()) return

        // 1. PRIORITÉ : Enregistrement utilisateur
        if (groupeId && enregistrements[groupeId]) {
            try {
                await playEnregistrement(enregistrements[groupeId])
                return
            } catch (error) {
                console.log('Enregistrement non disponible, fallback')
            }
        }

        // 2. ElevenLabs (si tokens disponibles)
        const elevenLabsSuccess = await playAudioElevenLabs(text)
        if (elevenLabsSuccess) return

        // 3. Web Speech API (jamais Hortense)
        await fallbackToWebSpeech(text)
    }

    const playPhraseWithHighlight = async () => {
        if (!phraseGeneree || !phraseGeneree.groupes_utilises) return

        setIsPlayingAudio(true)

        // Lire chaque groupe de sens avec illumination et enregistrements personnalisés
        for (let i = 0; i < phraseGeneree.groupes_utilises.length; i++) {
            const contenu = phraseGeneree.groupes_utilises[i]
            const groupeComplet = groupesComplets[i]

            setCurrentPlayingGroup(i)

            // Passer le contenu ET l'ID du groupe pour utiliser l'enregistrement
            await playAudio(contenu, groupeComplet?.id)

            // Pause entre les groupes
            await new Promise(resolve => setTimeout(resolve, 300))
        }

        setCurrentPlayingGroup(null)
        setIsPlayingAudio(false)
        setHasListened(true)

        // Tracker la phrase à revoir (car l'utilisateur a eu besoin d'aide)
        if (phraseGeneree && phraseGeneree.phrase_generee) {
            setPhrasesARevoir(prev => [...prev, phraseGeneree.phrase_generee])
        }
    }

    const handleSuccess = () => {
        setHasSucceeded(true)

        // Tracker la phrase réussie
        if (phraseGeneree && phraseGeneree.phrase_generee) {
            setPhrasesReussies(prev => [...prev, phraseGeneree.phrase_generee])
        }

        setTimeout(() => {
            nextPhrase()
        }, 2000)
    }

    const nextPhrase = () => {
        setHasSucceeded(false)
        setHasListened(false)
        setShowWordHelp(false) // Masquer l'aide à chaque nouvelle phrase
        setPhraseGeneree(null)
        setIsGenerating(true)

        // Cycle à travers les textes ou juste régénérer avec tous les groupes
        setTimeout(() => {
            genererPhrase()
        }, 500)
    }

    const getWordGroupColor = (word, isPlaying = false) => {
        if (!phraseGeneree || !phraseGeneree.groupes_utilises) return '#e5e7eb'

        const groupIndex = phraseGeneree.groupes_utilises.findIndex(groupe =>
            groupe.toLowerCase().includes(word.toLowerCase())
        )

        const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#f3e8ff', '#fed7aa', '#ecfdf5']
        const highlightColors = ['#fde047', '#60a5fa', '#f9a8d4', '#c084fc', '#fb923c', '#34d399']

        if (isPlaying && groupIndex === currentPlayingGroup) {
            return highlightColors[groupIndex % highlightColors.length]
        }

        return groupIndex !== -1 ? colors[groupIndex % colors.length] : '#e5e7eb'
    }

    const playWordAudio = async (word) => {
        await playAudio(`Le mot est : ${word}`)
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
                        📊 Résultats - Mode Tranquille
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
                                setHasSucceeded(false)
                                setHasListened(false)
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
                            {score}/{total} phrases lues sans aide
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
                maxWidth: '800px',
                margin: '0 auto'
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
                    <span style={{ color: '#10b981', fontSize: 'clamp(24px, 5vw, 28px)' }}>😌</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        whiteSpace: 'nowrap'
                    }}>
                        Dictée Recherche - Mode Tranquille
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
                    <button
                        onClick={() => setShowWordHelp(!showWordHelp)}
                        disabled={!phraseGeneree}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: phraseGeneree ? '#f59e0b' : '#ccc',
                            border: phraseGeneree ? '2px solid #f59e0b' : '2px solid #ccc',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: phraseGeneree ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: phraseGeneree ? 1 : 0.5
                        }}
                    >
                        💡
                    </button>
                    <button
                        onClick={nextPhrase}
                        disabled={!phraseGeneree}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            color: phraseGeneree ? '#10b981' : '#ccc',
                            border: phraseGeneree ? '2px solid #10b981' : '2px solid #ccc',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: phraseGeneree ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: phraseGeneree ? 1 : 0.5
                        }}
                    >
                        ➡️
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
                        <div style={{ fontSize: '18px', color: '#10b981' }}>
                            🤖 Génération d'une nouvelle phrase...
                        </div>
                    </div>
                ) : phraseGeneree ? (
                    <div>
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
                                    const highlightColors = ['#fde047', '#60a5fa', '#f9a8d4', '#c084fc', '#fb923c', '#34d399']
                                    const isHighlighted = isPlayingAudio && currentPlayingGroup === index

                                    return (
                                        <span
                                            key={index}
                                            style={{
                                                backgroundColor: isHighlighted
                                                    ? highlightColors[index % highlightColors.length]
                                                    : colors[index % colors.length],
                                                padding: isMobile ? '8px 12px' : '12px 20px',
                                                borderRadius: isMobile ? '6px' : '10px',
                                                transition: 'background-color 0.3s ease',
                                                border: isHighlighted ? '2px solid #333' : '2px solid transparent',
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

                            <div style={{
                                display: 'flex',
                                gap: isMobile ? '8px' : '15px',
                                justifyContent: 'center',
                                flexWrap: isMobile ? 'nowrap' : 'wrap'
                            }}>
                                {!hasSucceeded && (
                                    <button
                                        onClick={handleSuccess}
                                        style={{
                                            backgroundColor: 'white',
                                            color: '#10b981',
                                            padding: isMobile ? '12px 15px' : '15px 25px',
                                            border: '2px solid #10b981',
                                            borderRadius: isMobile ? '8px' : '12px',
                                            fontSize: isMobile ? '14px' : '18px',
                                            fontWeight: 'normal',
                                            cursor: 'pointer',
                                            minWidth: isMobile ? 'auto' : '250px',
                                            flex: isMobile ? '1' : 'none'
                                        }}
                                    >
                                        ✅ {isMobile ? 'Réussi !' : 'J\'ai réussi à lire !'}
                                    </button>
                                )}

                                {!hasListened ? (
                                    <button
                                        onClick={playPhraseWithHighlight}
                                        disabled={isPlayingAudio}
                                        style={{
                                            backgroundColor: 'white',
                                            color: isPlayingAudio ? '#f59e0b' : '#f97316',
                                            padding: isMobile ? '12px 15px' : '15px 25px',
                                            border: isPlayingAudio ? '2px solid #f59e0b' : '2px solid #f97316',
                                            borderRadius: isMobile ? '8px' : '12px',
                                            fontSize: isMobile ? '14px' : '18px',
                                            fontWeight: 'normal',
                                            cursor: isPlayingAudio ? 'not-allowed' : 'pointer',
                                            opacity: isPlayingAudio ? 0.7 : 1,
                                            minWidth: isMobile ? 'auto' : '250px',
                                            flex: isMobile ? '1' : 'none'
                                        }}
                                    >
                                        {isPlayingAudio ? '⏸️ En cours...' : (isMobile ? '✖️ Pas facile' : '✖️ C\'est pas facile!')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={nextPhrase}
                                        style={{
                                            backgroundColor: 'white',
                                            color: '#3b82f6',
                                            padding: isMobile ? '12px 15px' : '15px 25px',
                                            border: '2px solid #3b82f6',
                                            borderRadius: isMobile ? '8px' : '12px',
                                            fontSize: isMobile ? '14px' : '18px',
                                            fontWeight: 'normal',
                                            cursor: 'pointer',
                                            minWidth: isMobile ? 'auto' : '250px',
                                            flex: isMobile ? '1' : 'none'
                                        }}
                                    >
                                        {isMobile ? 'Suivant ➡️' : 'Phrase suivante ➡️'}
                                    </button>
                                )}
                            </div>

                            {hasSucceeded && (
                                <div style={{
                                    marginTop: '30px',
                                    padding: '25px',
                                    background: '#f0fdf4',
                                    borderRadius: '12px',
                                    border: '2px solid #22c55e'
                                }}>
                                    <div style={{
                                        fontSize: '24px',
                                        color: '#16a34a',
                                        fontWeight: 'bold',
                                        marginBottom: '15px'
                                    }}>
                                        🎉 Bravo ! Vous avez lu la phrase !
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        color: '#059669'
                                    }}>
                                        Nouvelle phrase dans quelques secondes...
                                    </div>
                                </div>
                            )}
                        </div>

                        {phraseGeneree.groupes_utilises && showWordHelp && (
                            <div style={{
                                marginBottom: '30px'
                            }}>
                                <h3 style={{
                                    textAlign: 'center',
                                    fontSize: '18px',
                                    marginBottom: '20px',
                                    color: '#666'
                                }}>
                                    💡 Cliquez sur les mots pour les entendre
                                </h3>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    alignItems: 'center'
                                }}>
                                    {phraseGeneree.groupes_utilises.map((groupe, index) => {
                                        const groupeComplet = groupesComplets[index]
                                        const colors = ['#fef3c7', '#dbeafe', '#fce7f3', '#f3e8ff', '#fed7aa', '#ecfdf5']
                                        return (
                                            <div
                                                key={index}
                                                onClick={() => playAudio(groupe, groupeComplet?.id)}
                                                style={{
                                                    padding: '15px 25px',
                                                    borderRadius: '10px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    backgroundColor: colors[index % colors.length],
                                                    border: '2px solid #ddd',
                                                    transition: 'transform 0.2s ease'
                                                }}
                                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                            >
                                                🔊 {groupe}
                                            </div>
                                        )
                                    })}
                                </div>

                                <div style={{
                                    marginTop: '20px',
                                    fontSize: '14px',
                                    color: '#666',
                                    textAlign: 'center'
                                }}>
                                    Les couleurs montrent les groupes de sens de vos textes
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}