import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { countSyllables, isMonosyllabic, syllabifyWord } from '../../utils/syllabify'

// Styles pour masquer les éléments sur mobile
const mobileStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }
`

export default function MonosyllabesMultisyllabes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTexte, setSelectedTexte] = useState('')
    const [isLoadingTexte, setIsLoadingTexte] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const [allMots, setAllMots] = useState([])
    const [currentMotIndex, setCurrentMotIndex] = useState(0)
    const [currentMot, setCurrentMot] = useState(null)
    const [score, setScore] = useState(0)
    const [attempts, setAttempts] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [gameFinished, setGameFinished] = useState(false)
    const [userChoices, setUserChoices] = useState([])
    const [showResults, setShowResults] = useState(false)
    const [availableVoices, setAvailableVoices] = useState([])
    const [selectedVoice, setSelectedVoice] = useState('Paul')
    const [autoRead, setAutoRead] = useState(false)
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

        // Forcer la lecture auto sur mobile
        if (window.innerWidth <= 768) {
            setAutoRead(true)
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
            if (allVoices.length > 0 && !selectedVoice) {
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
        setIsLoadingTexte(true)
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
        } finally {
            setIsLoadingTexte(false)
        }
    }

    const loadMotsTexte = async (texteId) => {
        setIsLoadingTexte(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/textes/get/${texteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                const groupes = data.groupes_sens || []
                
                // Filtrer pour exclure les sauts de lignes et groupes vides
                const groupesValides = groupes.filter(groupe => 
                    groupe.type_groupe !== 'linebreak' && 
                    groupe.contenu && 
                    groupe.contenu.trim() !== ''
                )
                
                // Extraire tous les mots de tous les groupes
                const allWords = []
                groupesValides.forEach(groupe => {
                    // Diviser le contenu en mots (simple pour commencer)
                    const words = groupe.contenu
                        .split(/\s+/)
                        .filter(word => word.trim() !== '')
                        .map(word => {
                            // Nettoyer le mot : enlever ponctuation
                            let cleanWord = word.replace(/[.,!?;:()"""]/g, '').toLowerCase()
                            
                            // Si le mot contient une apostrophe, prendre seulement la partie après l'apostrophe
                            if (cleanWord.includes("'")) {
                                cleanWord = cleanWord.split("'").pop()
                            }
                            
                            return {
                                original: word,
                                clean: cleanWord,
                                groupe_id: groupe.id,
                                syllables: syllabifyWord(cleanWord),
                                estimatedSyllables: countSyllables(cleanWord),
                                isMonosyllabe: isMonosyllabic(cleanWord)
                            }
                        })
                        .filter(wordObj => wordObj.clean.length > 0)
                    
                    allWords.push(...words)
                })

                // Éliminer les doublons en gardant seulement les mots uniques
                const uniqueWordsMap = new Map()
                allWords.forEach(wordObj => {
                    if (!uniqueWordsMap.has(wordObj.clean)) {
                        uniqueWordsMap.set(wordObj.clean, wordObj)
                    }
                })
                
                // Convertir en tableau et mélanger
                const uniqueWords = Array.from(uniqueWordsMap.values())
                const shuffledWords = uniqueWords.sort(() => Math.random() - 0.5)
                setAllMots(shuffledWords)
                setCurrentMotIndex(0)
                setCurrentMot(shuffledWords[0])
                setGameStarted(true)
                setScore(0)
                setAttempts(0)
                setFeedback('')
                setGameFinished(false)
                setUserChoices([])
                setShowResults(false)
                
                console.log(`Exercice démarré avec ${shuffledWords.length} mots uniques`)
                
                // Lecture automatique du premier mot si activée
                if (autoRead && shuffledWords[0]) {
                    setTimeout(() => speakText(shuffledWords[0]?.clean), 1000)
                }
            } else {
                alert('Erreur lors du chargement du texte')
            }
        } catch (error) {
            console.error('Erreur chargement mots:', error)
            alert('Erreur lors du chargement du texte')
        } finally {
            setIsLoadingTexte(false)
        }
    }


    const startGame = () => {
        if (!selectedTexte) {
            alert('Veuillez sélectionner un texte')
            return
        }
        loadMotsTexte(selectedTexte)
    }

    const handleChoice = (isMonosyllabe) => {
        if (!currentMot) return

        const newAttempts = attempts + 1
        const isCorrect = currentMot.isMonosyllabe === isMonosyllabe
        const newScore = isCorrect ? score + 1 : score

        // Enregistrer le choix
        const choice = {
            mot: currentMot,
            userChoice: isMonosyllabe,
            isCorrect: isCorrect
        }

        const newUserChoices = [...userChoices, choice]

        setAttempts(newAttempts)
        setScore(newScore)
        setUserChoices(newUserChoices)
        
        if (isCorrect) {
            setFeedback('✅ Correct !')
        } else {
            const correctType = currentMot.isMonosyllabe ? 'monosyllabe' : 'multisyllabe'
            setFeedback(`❌ Non, "${currentMot.clean}" est ${correctType}`)
        }

        // Passer au mot suivant après un délai
        setTimeout(() => {
            if (currentMotIndex < allMots.length - 1) {
                const nextIndex = currentMotIndex + 1
                setCurrentMotIndex(nextIndex)
                setCurrentMot(allMots[nextIndex])
                setFeedback('')
                
                // Lecture automatique si activée
                if (autoRead) {
                    setTimeout(() => speakText(allMots[nextIndex]?.clean), 500)
                }
            } else {
                // Fin du jeu
                setGameFinished(true)
                setFeedback('')
                
                // Sauvegarder tous les résultats en base de données
                sauvegarderResultats()
            }
        }, 1500)
    }

    // Fonction pour sauvegarder tous les résultats en base de données
    const sauvegarderResultats = async () => {
        if (!selectedTexte || !userChoices.length) return

        try {
            const resultats = userChoices.map(choice => ({
                mot: choice.mot.clean,
                classification: choice.mot.isMonosyllabe ? 'mono' : 'multi',
                score: choice.isCorrect ? 1 : 0
            }))

            const token = localStorage.getItem('token')
            const response = await fetch('/api/mots-classifies/sauvegarder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    texteId: parseInt(selectedTexte),
                    resultats: resultats
                })
            })

            if (response.ok) {
                console.log('✅ Résultats sauvegardés en base de données')
            } else {
                console.error('Erreur sauvegarde résultats:', await response.json())
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
        }
    }

    // Fonction pour demander une correction à l'admin
    const demanderCorrection = async (mot, isCurrentlyCorrect) => {
        if (!selectedTexte) {
            alert('Erreur: pas de texte sélectionné')
            return
        }

        try {
            const classificationActuelle = mot.isMonosyllabe ? 'mono' : 'multi'
            const correctionProposee = mot.isMonosyllabe ? 'multi' : 'mono'
            
            const token = localStorage.getItem('token')
            const response = await fetch('/api/corrections/demander', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mot: mot.clean,
                    texteId: parseInt(selectedTexte),
                    classificationActuelle: classificationActuelle,
                    correctionProposee: correctionProposee,
                    raison: `L'utilisateur pense que "${mot.clean}" devrait être classé comme ${correctionProposee === 'mono' ? '1 son' : 'plusieurs sons'} plutôt que ${classificationActuelle === 'mono' ? '1 son' : 'plusieurs sons'}`
                })
            })

            if (response.ok) {
                const data = await response.json()
                alert(`✅ ${data.message}\n\nVotre demande sera examinée par un administrateur.`)
            } else {
                const error = await response.json()
                if (error.error.includes('déjà en attente')) {
                    alert(`ℹ️ ${error.error}`)
                } else {
                    alert(`❌ Erreur: ${error.error}`)
                }
            }
        } catch (error) {
            console.error('Erreur demande correction:', error)
            alert('❌ Erreur lors de la demande de correction')
        }
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

    const resetGame = () => {
        setGameStarted(false)
        setSelectedTexte('')
        setAllMots([])
        setCurrentMotIndex(0)
        setCurrentMot(null)
        setScore(0)
        setAttempts(0)
        setFeedback('')
        setGameFinished(false)
        setUserChoices([])
        setShowResults(false)
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
            <style dangerouslySetInnerHTML={{ __html: mobileStyles }} />
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🔤 Trouver mes syllabes-mot
                </h1>

                {!gameStarted ? (
                    <>
                        {/* Instructions */}
                        <div className="desktop-only" style={{
                            background: '#e0f2fe',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ marginBottom: '10px', color: '#0284c7' }}>
                                📚 Comment jouer ?
                            </h3>
                            <p style={{ margin: 0, color: '#0369a1' }}>
                                Pour chaque mot affiché, écoutez bien les mots et comptez les syllabes. Décidez s'il s'agit d'un mot avec une syllabe 🟢 ou d'un mot avec plusieurs syllabes 🔴
                            </p>
                        </div>

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
                            <div className="desktop-only" style={{ marginBottom: '15px' }}>
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
                                className="desktop-only"
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

                        {/* Sélection du texte */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 className="desktop-only" style={{ marginBottom: '15px' }}>📚 Choisir un texte</h3>
                            
                            {isLoadingTexte ? (
                                <div>Chargement des textes...</div>
                            ) : textes.length === 0 ? (
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
                                <>
                                    <select
                                        value={selectedTexte}
                                        onChange={(e) => setSelectedTexte(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '16px',
                                            marginBottom: '20px'
                                        }}
                                    >
                                        <option value="">-- Sélectionner un texte --</option>
                                        {textes.map(texte => (
                                            <option key={texte.id} value={texte.id}>
                                                {texte.titre} ({texte.nombre_mots_total} mots)
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={startGame}
                                        disabled={!selectedTexte}
                                        style={{
                                            backgroundColor: selectedTexte ? '#10b981' : '#ccc',
                                            color: 'white',
                                            padding: '12px 30px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTexte ? 'pointer' : 'not-allowed',
                                            width: '100%'
                                        }}
                                    >
🚀 Commencer l'exercice (tous les mots uniques)
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                ) : gameFinished ? (
                    <>
                        {/* Résultats finaux */}
                        <div style={{
                            background: '#f0fdf4',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ color: '#166534', marginBottom: '20px' }}>
                                🎉 Exercice terminé !
                            </h2>
                            <div style={{ fontSize: '24px', marginBottom: '20px' }}>
                                Score final : <strong>{score}/{attempts}</strong>
                            </div>
                            <div style={{ fontSize: '18px', color: '#15803d' }}>
                                Pourcentage de réussite : <strong>{Math.round((score / attempts) * 100)}%</strong>
                            </div>
                        </div>

                        {/* Boutons d'actions */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            marginBottom: '20px'
                        }}>
                            <button
                                onClick={() => setShowResults(!showResults)}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showResults ? '📊 Masquer le détail' : '📊 Voir le détail'}
                            </button>

                            <button
                                onClick={() => loadMotsTexte(selectedTexte)}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Recommencer
                            </button>

                            <button
                                onClick={resetGame}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                📚 Nouveau texte
                            </button>
                        </div>

                        {/* Détail des résultats */}
                        {showResults && (
                            <div style={{
                                background: '#f8f9fa',
                                padding: '20px',
                                borderRadius: '8px'
                            }}>
                                <h3 style={{ marginBottom: '20px' }}>📝 Détail des réponses</h3>
                                <div style={{
                                    display: 'grid',
                                    gap: '10px'
                                }}>
                                    {userChoices.map((choice, index) => (
                                        <div key={index} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px',
                                            background: choice.isCorrect ? '#d1fae5' : '#fee2e2',
                                            borderRadius: '4px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    onClick={() => speakText(choice.mot.clean)}
                                                    style={{
                                                        backgroundColor: '#3b82f6',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🔊
                                                </button>
                                                <div>
                                                    <strong>{choice.mot.clean}</strong> 
                                                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                                                        {choice.mot.syllables?.join('-')} ({choice.mot.estimatedSyllables} syllabe{choice.mot.estimatedSyllables > 1 ? 's' : ''})
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ 
                                                    color: choice.isCorrect ? '#065f46' : '#991b1b',
                                                    fontSize: '14px'
                                                }}>
                                                    {choice.isCorrect ? '✅' : '❌'} 
                                                    Vous: {choice.userChoice ? 'Mono' : 'Multi'} | 
                                                    Correct: {choice.mot.isMonosyllabe ? 'Mono' : 'Multi'}
                                                </span>
                                                <button
                                                    onClick={() => demanderCorrection(choice.mot, choice.isCorrect)}
                                                    style={{
                                                        backgroundColor: '#f59e0b',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    🤔 Pas d'accord
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Zone de jeu */}
                        <div style={{
                            background: '#f8f9fa',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            {/* Progression */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '30px'
                            }}>
                                <div style={{ fontSize: '16px', color: '#666' }}>
                                    📊 Score: {score}/{attempts}
                                </div>
                                <div style={{ fontSize: '16px', color: '#666' }}>
                                    📝 Mot {currentMotIndex + 1}/{allMots.length}
                                </div>
                            </div>

                            {/* Mot actuel */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '30px'
                            }}>
                                <div style={{
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    color: '#10b981',
                                    padding: '30px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    marginBottom: '20px'
                                }}>
                                    {currentMot?.clean}
                                </div>
                                
                                {/* Bouton écouter */}
                                <button
                                    onClick={() => speakText(currentMot?.clean)}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        marginBottom: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        margin: '0 auto 15px auto'
                                    }}
                                >
                                    🔊 Écouter le mot
                                </button>
                                
                            </div>

                            {/* Feedback */}
                            {feedback && (
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    color: feedback.includes('✅') ? '#10b981' : '#ef4444'
                                }}>
                                    {feedback}
                                </div>
                            )}

                            {/* Boutons de choix */}
                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => handleChoice(true)}
                                    disabled={!!feedback}
                                    style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '20px 40px',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: feedback ? 'not-allowed' : 'pointer',
                                        opacity: feedback ? 0.5 : 1,
                                        minWidth: '200px'
                                    }}
                                >
                                    🟢 1 son
                                </button>

                                <button
                                    onClick={() => handleChoice(false)}
                                    disabled={!!feedback}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        padding: '20px 40px',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: feedback ? 'not-allowed' : 'pointer',
                                        opacity: feedback ? 0.5 : 1,
                                        minWidth: '200px'
                                    }}
                                >
                                    🔴 Plusieurs sons
                                </button>
                            </div>
                        </div>

                        {/* Bouton arrêter */}
                        <div style={{ textAlign: 'center' }}>
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
                    </>
                )}

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
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
                        ← Retour au menu
                    </button>
                </div>
            </div>
        </div>
    )
}