import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function TestDicteeRecherche() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState(new Set())
    const [groupes, setGroupes] = useState([])
    const [phraseGeneree, setPhraseGeneree] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showGroupes, setShowGroupes] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [dicteeSimple, setDicteeSimple] = useState('')
    const [recognition, setRecognition] = useState(null)
    const [availableVoices, setAvailableVoices] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('Paul (ElevenLabs)')
    const router = useRouter()

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
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
        
        // Charger les voix disponibles
        const loadVoices = () => {
            const allVoices = []
            
            // Voix ElevenLabs (Paul et Julie)
            const elevenLabsVoices = [
                { name: 'Paul (ElevenLabs)', type: 'elevenlabs', id: 'AfbuxQ9DVtS4azaxN1W7', lang: 'fr-FR' },
                { name: 'Julie (ElevenLabs)', type: 'elevenlabs', id: 'tMyQcCxfGDdIt7wJ2RQw', lang: 'fr-FR' }
            ]
            allVoices.push(...elevenLabsVoices)
            
            // Voix Web Speech API
            if ('speechSynthesis' in window) {
                const webVoices = speechSynthesis.getVoices()
                    .filter(voice => voice.lang.startsWith('fr'))
                    .map(voice => ({ 
                        name: `${voice.name} (Système)`, 
                        type: 'web', 
                        voice: voice, 
                        lang: voice.lang 
                    }))
                allVoices.push(...webVoices)
            }
            
            setAvailableVoices(allVoices)
        }
        
        loadVoices()
        if ('speechSynthesis' in window) {
            speechSynthesis.addEventListener('voiceschanged', loadVoices)
            return () => {
                speechSynthesis.removeEventListener('voiceschanged', loadVoices)
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
            } else {
                console.error('Erreur chargement textes')
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const loadGroupesTextes = async (textesIds) => {
        if (textesIds.size === 0) {
            setGroupes([])
            setPhraseGeneree(null)
            return
        }

        try {
            const token = localStorage.getItem('token')
            const allGroupes = []
            
            // Charger les groupes de chaque texte sélectionné
            for (const texteId of textesIds) {
                const response = await fetch(`/api/textes/get/${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    const groupesFiltered = (data.groupes_sens || [])
                        .filter(g => g.type_groupe === 'text' && g.contenu && g.contenu.trim())
                        .map(g => ({...g, texte_titre: data.titre})) // Ajouter le titre pour identifier la source
                    
                    allGroupes.push(...groupesFiltered)
                } else {
                    console.error(`Erreur chargement texte ${texteId}`)
                }
            }
            
            setGroupes(allGroupes)
            setPhraseGeneree(null)
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            alert('Erreur lors du chargement des textes')
        }
    }

    const toggleTexteSelection = (texteId) => {
        const newSelected = new Set(selectedTextes)
        if (newSelected.has(texteId)) {
            newSelected.delete(texteId)
        } else {
            newSelected.add(texteId)
        }
        setSelectedTextes(newSelected)
        loadGroupesTextes(newSelected)
    }

    const genererPhrase = async () => {
        if (groupes.length < 2) {
            alert('Il faut au moins 2 groupes de sens')
            return
        }

        setIsGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/exercises/generer-phrase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupes_sens: groupes
                })
            })

            if (response.ok) {
                const data = await response.json()
                setPhraseGeneree(data)
            } else {
                // Gérer les réponses d'erreur (peuvent être du JSON ou du HTML)
                const contentType = response.headers.get('content-type')
                let errorMessage = `Erreur ${response.status}`
                
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const error = await response.json()
                        errorMessage = error.error || error.details || errorMessage
                    } catch (e) {
                        errorMessage = `Erreur de parsing JSON: ${e.message}`
                    }
                } else {
                    const textError = await response.text()
                    console.error('Réponse serveur complète:', textError)
                    errorMessage = 'Erreur serveur (voir console pour détails)'
                }
                
                alert('Erreur: ' + errorMessage)
            }
        } catch (error) {
            console.error('Erreur génération:', error)
            alert('Erreur lors de la génération')
        } finally {
            setIsGenerating(false)
        }
    }

    // Fonction TTS pour lire la phrase
    const speakPhrase = async (text) => {
        if (!text.trim()) return

        const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice)
        
        if (selectedVoiceObj?.type === 'elevenlabs') {
            // Utiliser ElevenLabs
            try {
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        text,
                        voice_id: selectedVoiceObj.id 
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    const audio = new Audio(data.audio)
                    audio.play()
                    return
                }
            } catch (error) {
                console.log('ElevenLabs non disponible, fallback vers Web Speech API')
            }
        }

        // Utiliser Web Speech API (par défaut ou en fallback)
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            
            if (selectedVoiceObj?.type === 'web' && selectedVoiceObj.voice) {
                utterance.voice = selectedVoiceObj.voice
            }
            
            window.speechSynthesis.speak(utterance)
        }
    }

    // Fonction TTS spécifique pour lire un mot avec contexte français
    const speakMot = async (mot) => {
        if (!mot.trim()) return

        const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice)
        
        if (selectedVoiceObj?.type === 'elevenlabs') {
            // Utiliser ElevenLabs avec contexte français pour les mots isolés
            try {
                // Ajouter le contexte français pour améliorer la prononciation
                const textToSpeak = `Le mot est "${mot}".`
                
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
                    const audio = new Audio(data.audio)
                    audio.play()
                    return
                }
            } catch (error) {
                console.log('ElevenLabs non disponible, fallback vers Web Speech API')
            }
        }

        // Utiliser Web Speech API (par défaut ou en fallback)
        if ('speechSynthesis' in window) {
            const textToSpeak = `Le mot est ${mot}`
            const utterance = new SpeechSynthesisUtterance(textToSpeak)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            
            if (selectedVoiceObj?.type === 'web' && selectedVoiceObj.voice) {
                utterance.voice = selectedVoiceObj.voice
            }
            
            window.speechSynthesis.speak(utterance)
        }
    }

    // Fonction pour créer une nouvelle phrase (réinitialise la dictée)
    const genererNouvellePhrase = () => {
        setDicteeSimple('')
        setIsListening(false)
        if (recognition) {
            recognition.stop()
        }
        genererPhrase()
    }

    // Fonction pour marquer comme réussi et générer une nouvelle phrase
    const marquerReussi = () => {
        setDicteeSimple('')
        setIsListening(false)
        if (recognition) {
            recognition.stop()
        }
        genererPhrase()
    }

    // Fonction pour démarrer une dictée simple et tolérante
    const startDicteeSimple = () => {
        if (!phraseGeneree) return
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('La reconnaissance vocale n\'est pas supportée par votre navigateur')
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const newRecognition = new SpeechRecognition()
        
        newRecognition.continuous = true
        newRecognition.interimResults = true
        newRecognition.lang = 'fr-FR'

        newRecognition.onstart = () => {
            setIsListening(true)
            setDicteeSimple('')
        }

        newRecognition.onresult = (event) => {
            // Prendre le transcript complet accumulé, pas seulement la fin
            let transcript = ''
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript + ' '
                } else {
                    // Ajouter aussi les résultats intermédiaires pour plus de réactivité
                    transcript += event.results[i][0].transcript + ' '
                }
            }
            setDicteeSimple(transcript.trim())
        }

        newRecognition.onerror = (event) => {
            console.error('Erreur reconnaissance vocale:', event.error)
            setIsListening(false)
        }

        newRecognition.onend = () => {
            setIsListening(false)
        }

        setRecognition(newRecognition)
        newRecognition.start()
    }

    // Fonction pour arrêter la dictée
    const stopDictee = () => {
        if (recognition) {
            recognition.stop()
        }
        setIsListening(false)
    }

    // Fonction pour calculer la similarité phonétique entre deux mots
    const similitudeMot = (mot1, mot2) => {
        const normaliser = (mot) => mot.toLowerCase()
            .replace(/[àâäéèêë]/g, 'e')
            .replace(/[ïî]/g, 'i') 
            .replace(/[ôö]/g, 'o')
            .replace(/[ùûü]/g, 'u')
            .replace(/[ÿ]/g, 'y')
            .replace(/[ç]/g, 'c')
            .replace(/[.,!?;:()"""]/g, '')
            .trim()
        
        const m1 = normaliser(mot1)
        const m2 = normaliser(mot2)
        
        // Exactement identique
        if (m1 === m2) return 1.0
        
        // Un mot contient l'autre
        if (m1.includes(m2) || m2.includes(m1)) return 0.9
        
        // Même début (au moins 3 caractères)
        if (m1.length >= 3 && m2.length >= 3 && m1.substring(0, 3) === m2.substring(0, 3)) {
            return 0.8
        }
        
        // Même fin (au moins 3 caractères)
        if (m1.length >= 3 && m2.length >= 3 && m1.slice(-3) === m2.slice(-3)) {
            return 0.7
        }
        
        // Distance de Levenshtein simplifiée pour les mots courts
        if (Math.abs(m1.length - m2.length) <= 2) {
            let differences = 0
            const minLen = Math.min(m1.length, m2.length)
            for (let i = 0; i < minLen; i++) {
                if (m1[i] !== m2[i]) differences++
            }
            differences += Math.abs(m1.length - m2.length)
            
            const similarity = 1 - (differences / Math.max(m1.length, m2.length))
            return similarity > 0.5 ? similarity : 0
        }
        
        return 0
    }
    
    // Fonction pour matcher intelligemment les mots de la dictée avec l'original
    const matcherMots = (motsOriginal, motsDictee) => {
        const matches = []
        const motsOriginalUtilises = new Set()
        const motsDicteeUtilises = new Set()
        
        // Pour chaque mot de la dictée, trouver le meilleur match dans l'original
        motsDictee.forEach((motDictee, indexDictee) => {
            let meilleurMatch = null
            let meilleurScore = 0
            
            motsOriginal.forEach((motOriginal, indexOriginal) => {
                if (motsOriginalUtilises.has(indexOriginal)) return
                
                const score = similitudeMot(motOriginal, motDictee)
                if (score > meilleurScore && score >= 0.5) { // Seuil minimum de similarité
                    meilleurScore = score
                    meilleurMatch = { indexOriginal, indexDictee, score, motOriginal, motDictee }
                }
            })
            
            if (meilleurMatch) {
                matches.push(meilleurMatch)
                motsOriginalUtilises.add(meilleurMatch.indexOriginal)
                motsDicteeUtilises.add(indexDictee)
            }
        })
        
        return matches
    }

    // Fonction pour identifier les groupes de sens dans la phrase
    const identifierGroupesDeSens = (phrase, groupesUtilises) => {
        if (!groupesUtilises || groupesUtilises.length === 0) return []
        
        const motsPhrase = phrase.split(' ')
        const groupesIdentifies = []
        
        // Pour chaque groupe utilisé, trouver sa position dans la phrase
        groupesUtilises.forEach((groupe, indexGroupe) => {
            const motsGroupe = groupe.split(' ').filter(m => m.trim().length > 0)
            
            // Chercher où ce groupe apparaît dans la phrase
            for (let i = 0; i <= motsPhrase.length - motsGroupe.length; i++) {
                let match = true
                for (let j = 0; j < motsGroupe.length; j++) {
                    const motPhrase = motsPhrase[i + j]?.toLowerCase().replace(/[.,!?;:()"""]/g, '')
                    const motGroupe = motsGroupe[j]?.toLowerCase().replace(/[.,!?;:()"""]/g, '')
                    
                    if (motPhrase !== motGroupe) {
                        match = false
                        break
                    }
                }
                
                if (match) {
                    // Ajouter ce groupe à la liste
                    groupesIdentifies.push({
                        texte: groupe,
                        startIndex: i,
                        endIndex: i + motsGroupe.length - 1,
                        indexGroupe: indexGroupe,
                        couleur: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][indexGroupe % 6]
                    })
                    break // Ne chercher qu'une occurrence par groupe
                }
            }
        })
        
        // Trier par position dans la phrase
        return groupesIdentifies.sort((a, b) => a.startIndex - b.startIndex)
    }

    // Fonction pour évaluer la dictée avec comparaison intelligente
    const evaluerDictee = (original, dictee) => {
        if (!dictee.trim()) return { feedback: "🎙️ Je vous écoute...", color: '#6b7280', matches: [] }
        
        // Normalisation de base
        const normaliser = (text) => text.toLowerCase()
            .replace(/[.,!?;:()"""]/g, '')
            .trim()
        
        const motsOriginal = original.split(' ').filter(m => m.trim().length > 0)
        const motsDictee = dictee.split(' ').filter(m => m.trim().length > 0)
        
        // Matcher intelligemment les mots
        const matches = matcherMots(motsOriginal, motsDictee)
        
        // Identifier les groupes de sens
        const groupesSens = phraseGeneree ? identifierGroupesDeSens(original, phraseGeneree.groupes_utilises) : []
        
        // Calculer le score basé sur les matches
        const scoreExact = matches.filter(m => m.score >= 0.95).length
        const scoreBon = matches.filter(m => m.score >= 0.8).length
        const scoreAcceptable = matches.length
        
        const pourcentageExact = Math.round((scoreExact / motsOriginal.length) * 100)
        const pourcentageBon = Math.round((scoreBon / motsOriginal.length) * 100)
        const pourcentageAcceptable = Math.round((scoreAcceptable / motsOriginal.length) * 100)
        
        // Feedback basé sur la qualité des matches
        if (pourcentageExact >= 90) {
            return { 
                feedback: `🎉 Parfait ! ${scoreExact}/${motsOriginal.length} mots parfaits !`, 
                color: '#10b981', 
                matches,
                groupesSens,
                stats: `${pourcentageExact}% parfait`
            }
        } else if (pourcentageBon >= 80) {
            return { 
                feedback: `🌟 Excellent ! ${scoreBon}/${motsOriginal.length} mots bien reconnus !`, 
                color: '#10b981',
                matches,
                groupesSens,
                stats: `${pourcentageBon}% bien`
            }
        } else if (pourcentageAcceptable >= 60) {
            return { 
                feedback: `👍 Bien ! ${scoreAcceptable}/${motsOriginal.length} mots compris !`, 
                color: '#f59e0b',
                matches,
                groupesSens,
                stats: `${pourcentageAcceptable}% moyen`
            }
        } else if (scoreAcceptable > 0) {
            return { 
                feedback: `💪 Continue ! J'ai reconnu ${scoreAcceptable} mot${scoreAcceptable > 1 ? 's' : ''} !`, 
                color: '#3b82f6',
                matches,
                groupesSens,
                stats: `${scoreAcceptable} mot${scoreAcceptable > 1 ? 's' : ''} reconnu${scoreAcceptable > 1 ? 's' : ''}`
            }
        } else {
            return { 
                feedback: "🎙️ Parle un peu plus fort, j'ai du mal à t'entendre", 
                color: '#6b7280',
                matches: [],
                groupesSens,
                stats: "0% reconnu"
            }
        }
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
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🧪 Test Dictée Recherche
                </h1>

                <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
                    Test de génération de phrases à partir de groupes de sens existants
                </p>

                {/* Sélection du texte */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ marginBottom: '15px' }}>📚 Choisir les textes ({selectedTextes.size} sélectionné{selectedTextes.size > 1 ? 's' : ''})</h3>
                    
                    {textes.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            background: '#fff3cd',
                            borderRadius: '8px',
                            border: '1px solid #ffeaa7'
                        }}>
                            <p>Aucun texte disponible</p>
                            <p style={{ fontSize: '14px', color: '#666' }}>
                                Créez d'abord un texte de référence
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {textes.map(texte => (
                                <label key={texte.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px',
                                    background: selectedTextes.has(texte.id) ? '#e8f5e8' : 'white',
                                    borderRadius: '4px',
                                    border: selectedTextes.has(texte.id) ? '2px solid #10b981' : '1px solid #ddd',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTextes.has(texte.id)}
                                        onChange={() => toggleTexteSelection(texte.id)}
                                        style={{
                                            transform: 'scale(1.2)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div>
                                        <strong>{texte.titre}</strong>
                                        <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
                                            ({texte.nombre_mots_total} mots)
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Groupes de sens disponibles */}
                {groupes.length > 0 && (
                    <div style={{
                        background: '#e0f2fe',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#0284c7' }}>
                                📝 Groupes de sens disponibles ({groupes.length})
                            </h3>
                            <button
                                onClick={() => setShowGroupes(!showGroupes)}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showGroupes ? '👁️ Masquer' : '👁️ Afficher'}
                            </button>
                        </div>
                        
                        {showGroupes && (
                            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                                {groupes.map((groupe, index) => (
                                    <div key={groupe.id} style={{
                                        padding: '10px',
                                        background: 'white',
                                        borderRadius: '4px',
                                        border: '1px solid #bae6fd'
                                    }}>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                                            📖 {groupe.texte_titre}
                                        </div>
                                        <strong>{index + 1}.</strong> "{groupe.contenu}"
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={genererPhrase}
                            disabled={isGenerating || groupes.length < 2}
                            style={{
                                backgroundColor: isGenerating || groupes.length < 2 ? '#ccc' : '#10b981',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                cursor: isGenerating || groupes.length < 2 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isGenerating ? '⏳ Génération...' : '🎲 Générer une phrase'}
                        </button>
                    </div>
                )}

                {/* Phrase générée */}
                {phraseGeneree && (
                    <div style={{
                        background: '#f0fdf4',
                        padding: '30px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ marginBottom: '20px', color: '#15803d' }}>
                            ✨ Votre nouvelle phrase à lire
                        </h3>
                        
                        <div style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#166534',
                            marginBottom: '30px',
                            padding: '25px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #bbf7d0',
                            lineHeight: '1.4'
                        }}>
                            "{phraseGeneree.phrase_generee}"
                        </div>

                        {/* Section d'aide */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ marginBottom: '15px', color: '#15803d' }}>
                                💡 Aide pour lire
                            </h4>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                flexWrap: 'wrap',
                                marginBottom: '20px'
                            }}>
                                <button
                                    onClick={() => speakPhrase(phraseGeneree.phrase_generee)}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '10px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔊 Écouter la phrase
                                </button>
                            </div>
                        </div>

                        {/* Section dictée simple */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ marginBottom: '15px', color: '#15803d' }}>
                                🎤 Essayez de répéter la phrase
                            </h4>
                            
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                marginBottom: '15px'
                            }}>
                                <button
                                    onClick={isListening ? stopDictee : startDicteeSimple}
                                    style={{
                                        backgroundColor: isListening ? '#ef4444' : '#10b981',
                                        color: 'white',
                                        padding: '12px 20px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {isListening ? '⏹️ Arrêter' : '🎤 Je répète la phrase'}
                                </button>
                            </div>

                            {/* Feedback en temps réel */}
                            {(isListening || dicteeSimple) && (
                                <div style={{
                                    padding: '20px',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginBottom: '15px'
                                }}>
                                    {isListening && (
                                        <div style={{
                                            padding: '15px',
                                            background: '#e0f2fe',
                                            borderRadius: '6px',
                                            fontSize: '16px',
                                            color: '#0369a1',
                                            textAlign: 'center',
                                            marginBottom: '15px'
                                        }}>
                                            🎙️ Je vous écoute... Prenez votre temps !
                                        </div>
                                    )}
                                    
                                    {dicteeSimple && (
                                        <>
                                            <div style={{
                                                padding: '15px',
                                                background: 'white',
                                                borderRadius: '6px',
                                                marginBottom: '15px',
                                                border: '1px solid #e5e7eb'
                                            }}>
                                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                                                    J'ai entendu :
                                                </div>
                                                <div style={{ fontSize: '18px', color: '#333', fontStyle: 'italic' }}>
                                                    "{dicteeSimple}"
                                                </div>
                                            </div>
                                            
                                            <div style={{
                                                padding: '15px',
                                                background: evaluerDictee(phraseGeneree.phrase_generee, dicteeSimple).color,
                                                color: 'white',
                                                borderRadius: '6px',
                                                textAlign: 'center',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                marginBottom: '15px'
                                            }}>
                                                {evaluerDictee(phraseGeneree.phrase_generee, dicteeSimple).feedback}
                                            </div>
                                            
                                            {/* Affichage détaillé des matches */}
                                            {evaluerDictee(phraseGeneree.phrase_generee, dicteeSimple).matches?.length > 0 && (
                                                <div style={{
                                                    padding: '15px',
                                                    background: 'white',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                                        📊 Analyse détaillée : {evaluerDictee(phraseGeneree.phrase_generee, dicteeSimple).stats}
                                                    </div>
                                                    
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '12px',
                                                        fontSize: '14px'
                                                    }}>
                                                        {(() => {
                                                            const motsPhrase = phraseGeneree.phrase_generee.split(' ')
                                                            const evaluation = evaluerDictee(phraseGeneree.phrase_generee, dicteeSimple)
                                                            const groupesSens = evaluation.groupesSens || []
                                                            const matches = evaluation.matches || []
                                                            
                                                            if (groupesSens.length === 0) {
                                                                // Affichage simple sans groupes
                                                                return motsPhrase.map((motOriginal, index) => {
                                                                    const match = matches.find(m => m.indexOriginal === index)
                                                                    
                                                                    let backgroundColor = '#fee2e2'
                                                                    let textColor = '#991b1b'
                                                                    let titre = `Le mot : "${motOriginal}" → ?`
                                                                    
                                                                    if (match) {
                                                                        if (match.score >= 0.95) {
                                                                            backgroundColor = '#d1fae5'
                                                                            textColor = '#065f46'
                                                                            titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (parfait)`
                                                                        } else if (match.score >= 0.8) {
                                                                            backgroundColor = '#fef3c7'
                                                                            textColor = '#92400e'
                                                                            titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (bien)`
                                                                        } else {
                                                                            backgroundColor = '#fed7aa'
                                                                            textColor = '#c2410c'
                                                                            titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (moyen)`
                                                                        }
                                                                    }
                                                                    
                                                                    return (
                                                                        <span
                                                                            key={index}
                                                                            style={{
                                                                                backgroundColor,
                                                                                color: textColor,
                                                                                padding: '4px 8px',
                                                                                borderRadius: '4px',
                                                                                fontWeight: 'bold',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                            title={titre}
                                                                            onClick={() => speakMot(motOriginal)}
                                                                        >
                                                                            {motOriginal}
                                                                        </span>
                                                                    )
                                                                })
                                                            }
                                                            
                                                            // Affichage avec groupes de sens
                                                            return groupesSens.map((groupe, groupeIndex) => (
                                                                <div
                                                                    key={groupeIndex}
                                                                    style={{
                                                                        border: `2px solid ${groupe.couleur}`,
                                                                        borderRadius: '8px',
                                                                        padding: '8px',
                                                                        backgroundColor: `${groupe.couleur}15`, // Couleur très transparente
                                                                        position: 'relative'
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        fontSize: '10px',
                                                                        color: groupe.couleur,
                                                                        fontWeight: 'bold',
                                                                        marginBottom: '4px',
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Groupe {groupeIndex + 1}
                                                                    </div>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        flexWrap: 'wrap',
                                                                        gap: '4px'
                                                                    }}>
                                                                        {motsPhrase.slice(groupe.startIndex, groupe.endIndex + 1).map((motOriginal, motIndex) => {
                                                                            const indexGlobal = groupe.startIndex + motIndex
                                                                            const match = matches.find(m => m.indexOriginal === indexGlobal)
                                                                            
                                                                            let backgroundColor = '#fee2e2'
                                                                            let textColor = '#991b1b'
                                                                            let titre = `Le mot : "${motOriginal}" → ?`
                                                                            
                                                                            if (match) {
                                                                                if (match.score >= 0.95) {
                                                                                    backgroundColor = '#d1fae5'
                                                                                    textColor = '#065f46'
                                                                                    titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (parfait)`
                                                                                } else if (match.score >= 0.8) {
                                                                                    backgroundColor = '#fef3c7'
                                                                                    textColor = '#92400e'
                                                                                    titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (bien)`
                                                                                } else {
                                                                                    backgroundColor = '#fed7aa'
                                                                                    textColor = '#c2410c'
                                                                                    titre = `Le mot : "${motOriginal}" → "${match.motDictee}" (moyen)`
                                                                                }
                                                                            }
                                                                            
                                                                            return (
                                                                                <span
                                                                                    key={motIndex}
                                                                                    style={{
                                                                                        backgroundColor,
                                                                                        color: textColor,
                                                                                        padding: '4px 8px',
                                                                                        borderRadius: '4px',
                                                                                        fontWeight: 'bold',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                    title={titre}
                                                                                    onClick={() => speakMot(motOriginal)}
                                                                                >
                                                                                    {motOriginal}
                                                                                </span>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        })()}
                                                    </div>
                                                    
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: '#666', 
                                                        marginTop: '10px',
                                                        textAlign: 'center'
                                                    }}>
                                                        🟢 = Parfait | 🟡 = Bien | 🟠 = Moyen | 🔴 = ? | 🔊 Cliquez sur un mot pour l'écouter
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions principales */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={marquerReussi}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ J'ai réussi à lire !
                            </button>
                            
                            <button
                                onClick={genererNouvellePhrase}
                                disabled={isGenerating}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                                    opacity: isGenerating ? 0.5 : 1
                                }}
                            >
                                🔄 Autre phrase
                            </button>
                        </div>
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
                        ← Retour au menu
                    </button>
                </div>
            </div>
        </div>
    )
}