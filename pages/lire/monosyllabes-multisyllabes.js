import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { countSyllables, isMonosyllabic, syllabifyWord } from '../../utils/syllabify'
import { convertNumberToWordsWithHyphens, isNumericString } from '../../lib/convertNumbers'

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
    const [autoRead, setAutoRead] = useState(true)
    const [numbersDetected, setNumbersDetected] = useState([])
    const [showNumbersModal, setShowNumbersModal] = useState(false)
    const [numbersChoices, setNumbersChoices] = useState({})
    const [pendingWords, setPendingWords] = useState([])
    const [correctionsMonoMulti, setCorrectionsMonoMulti] = useState({})
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Enregistrements personnels indexés par mot
    const [isAudioPlaying, setIsAudioPlaying] = useState(false) // Bloquer boutons pendant lecture audio
    const [showConfetti, setShowConfetti] = useState(false) // Confettis pour score parfait
    const router = useRouter()
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

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
            loadEnregistrements() // Charger les enregistrements vocaux
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
                console.log('📋 Enregistrements chargés:', Object.keys(data.enregistrementsMap || {}))
                setEnregistrementsMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements vocaux')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
    }

    const playEnregistrement = async (enregistrement) => {
        if (!enregistrement || !enregistrement.audio_url) {
            console.warn('⚠️ Enregistrement invalide')
            return false
        }

        try {
            console.log('🎵 Lecture enregistrement personnel:', enregistrement.mot)
            setIsAudioPlaying(true)
            const audio = new Audio(enregistrement.audio_url)

            audio.onended = () => {
                console.log('✅ Enregistrement personnel terminé')
                setIsAudioPlaying(false)
            }

            audio.onerror = (error) => {
                console.error('❌ Erreur lecture enregistrement:', error)
                setIsAudioPlaying(false)
            }

            await audio.play()
            console.log('✅ Enregistrement personnel lu avec succès')
            return true
        } catch (error) {
            console.error('❌ Erreur playEnregistrement:', error)
            setIsAudioPlaying(false)
            return false
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
                
                // Convertir en tableau
                const uniqueWords = Array.from(uniqueWordsMap.values())

                // ====================================================================
                // CHARGER LES CORRECTIONS CENTRALISÉES
                // ====================================================================
                const motsUniques = uniqueWords.map(w => w.clean)
                let correctionsTemp = {}

                if (motsUniques.length > 0) {
                    try {
                        const token = localStorage.getItem('token')
                        const correctionsResponse = await fetch('/api/corrections/get-corrections', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                mots: motsUniques,
                                type: 'mono_multi'
                            })
                        })

                        if (correctionsResponse.ok) {
                            const correctionsData = await correctionsResponse.json()
                            correctionsTemp = correctionsData.mono_multi || {}
                            console.log(`🌟 ${Object.keys(correctionsTemp).length} correction(s) centralisée(s) chargée(s)`)
                        }
                    } catch (error) {
                        console.error('Erreur chargement corrections centralisées:', error)
                    }
                }

                setCorrectionsMonoMulti(correctionsTemp)

                // Appliquer les corrections aux mots
                uniqueWords.forEach(wordObj => {
                    if (correctionsTemp[wordObj.clean]) {
                        const correctionValue = correctionsTemp[wordObj.clean]
                        wordObj.isMonosyllabe = (correctionValue === 'monosyllabe')
                        console.log(`🌟 Correction appliquée: "${wordObj.clean}" → ${correctionValue}`)
                    }
                })

                // Mélanger les mots
                const shuffledWords = uniqueWords.sort(() => Math.random() - 0.5)

                // ====================================================================
                // DÉTECTION DES NOMBRES
                // ====================================================================

                const detectedNumbers = []
                const initialChoices = {}

                shuffledWords.forEach(wordObj => {
                    if (isNumericString(wordObj.clean)) {
                        const converted = convertNumberToWordsWithHyphens(wordObj.clean)
                        if (converted) {
                            detectedNumbers.push({
                                original: wordObj.clean,
                                converted: converted,
                                syllables: syllabifyWord(converted),
                                estimatedSyllables: countSyllables(converted)
                            })
                            initialChoices[wordObj.clean] = 'keep' // Par défaut : garder
                        } else {
                            // Nombre trop grand, exclure par défaut
                            initialChoices[wordObj.clean] = 'exclude'
                        }
                    }
                })

                // Si des nombres sont détectés, afficher la modale
                if (detectedNumbers.length > 0) {
                    console.log(`🔢 ${detectedNumbers.length} nombre(s) détecté(s)`)
                    setPendingWords(shuffledWords)
                    setNumbersDetected(detectedNumbers)
                    setNumbersChoices(initialChoices)
                    setShowNumbersModal(true)
                    // Le jeu ne démarre pas encore, on attend les choix de l'utilisateur
                } else {
                    // Aucun nombre, démarrer directement le jeu
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


    const applyNumbersChoices = () => {
        // Appliquer les choix de l'utilisateur sur les nombres
        const processedWords = []

        pendingWords.forEach(wordObj => {
            if (isNumericString(wordObj.clean)) {
                const choice = numbersChoices[wordObj.clean]

                if (choice === 'exclude') {
                    // Exclure ce mot du jeu
                    console.log(`🗑️ Nombre exclu : ${wordObj.clean}`)
                    return // Skip this word
                } else if (choice === 'keep') {
                    // Convertir en lettres avec tirets
                    const converted = convertNumberToWordsWithHyphens(wordObj.clean)
                    if (converted) {
                        let isMonosyllabe = isMonosyllabic(converted)

                        // Appliquer correction centralisée si elle existe
                        if (correctionsMonoMulti[converted]) {
                            isMonosyllabe = (correctionsMonoMulti[converted] === 'monosyllabe')
                            console.log(`🌟 Correction appliquée au nombre converti: "${converted}" → ${correctionsMonoMulti[converted]}`)
                        }

                        const convertedWord = {
                            original: wordObj.original,
                            clean: converted,
                            groupe_id: wordObj.groupe_id,
                            syllables: syllabifyWord(converted),
                            estimatedSyllables: countSyllables(converted),
                            isMonosyllabe: isMonosyllabe
                        }
                        processedWords.push(convertedWord)
                        console.log(`✅ Nombre converti : ${wordObj.clean} → ${converted}`)
                    }
                }
            } else {
                // Mot normal, garder tel quel
                processedWords.push(wordObj)
            }
        })

        // Lancer le jeu avec les mots traités
        setAllMots(processedWords)
        setCurrentMotIndex(0)
        setCurrentMot(processedWords[0])
        setGameStarted(true)
        setScore(0)
        setAttempts(0)
        setFeedback('')
        setGameFinished(false)
        setUserChoices([])
        setShowResults(false)
        setShowNumbersModal(false) // Fermer la modale

        console.log(`✅ Exercice démarré avec ${processedWords.length} mots uniques (après traitement des nombres)`)

        // Lecture automatique du premier mot si activée
        if (autoRead && processedWords[0]) {
            setTimeout(() => speakText(processedWords[0]?.clean), 1000)
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

            // Si correct, passer automatiquement au mot suivant
            setTimeout(() => {
                goToNextWord(newScore, newAttempts, newUserChoices)
            }, 1500)
        } else {
            // Message d'erreur selon le type de mot
            if (currentMot.isMonosyllabe) {
                setFeedback(`Le mot "${currentMot.clean}" a une syllabe`)
            } else {
                setFeedback(`Le mot "${currentMot.clean}" a plusieurs syllabes`)
            }
            // Si incorrect, ne PAS passer automatiquement (attendre clic sur "Suivant")
        }
    }

    const goToNextWord = (currentScore = score, currentAttempts = attempts, currentUserChoices = userChoices) => {
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

            // Déclencher confettis si score parfait
            if (currentScore === allMots.length) {
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 5000) // Arrêter après 5 secondes
            }

            // Sauvegarder tous les résultats en base de données
            sauvegarderResultats()
        }
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

    // Fonction TTS intelligente avec priorité : Enregistrement utilisateur > ElevenLabs > Web Speech
    const speakText = async (text) => {
        if (!text.trim()) return

        // ====================================================================
        // PRIORITÉ 1 : ENREGISTREMENT PERSONNEL (si existe)
        // ====================================================================

        // Normaliser le mot pour chercher dans enregistrementsMap
        const motNormalise = text
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')  // Ponctuation au début
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')  // Ponctuation à la fin

        console.log(`🔍 Recherche enregistrement pour "${motNormalise}"`)

        if (enregistrementsMap[motNormalise]) {
            console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
            const success = await playEnregistrement(enregistrementsMap[motNormalise])
            if (success) return // Succès, on s'arrête là
            console.log('⚠️ Échec enregistrement personnel, fallback ElevenLabs')
        }

        // ====================================================================
        // PRIORITÉ 2 : ELEVENLABS (si tokens disponibles)
        // ====================================================================

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
                setIsAudioPlaying(true)
                const audio = new Audio(cachedAudio)
                audio.onended = () => setIsAudioPlaying(false)
                audio.onerror = () => setIsAudioPlaying(false)
                audio.play()
                return
            } catch (error) {
                setIsAudioPlaying(false)
                localStorage.removeItem(cacheKey)
            }
        }

        // Essayer ElevenLabs
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

                setIsAudioPlaying(true)
                const audio = new Audio(data.audio)
                audio.onended = () => setIsAudioPlaying(false)
                audio.onerror = () => setIsAudioPlaying(false)
                audio.play()
                return
            }
        } catch (error) {
            // Fallback silencieux vers Web Speech API
        }

        // ====================================================================
        // PRIORITÉ 3 : WEB SPEECH API (fallback, pas Hortense)
        // ====================================================================

        if ('speechSynthesis' in window) {
            setIsAudioPlaying(true)
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6 // Plus grave pour ressembler aux voix masculines

            utterance.onend = () => setIsAudioPlaying(false)
            utterance.onerror = () => setIsAudioPlaying(false)

            // Chercher une voix masculine française (JAMAIS Hortense)
            const voices = window.speechSynthesis.getVoices()
            const voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice => voice.lang.includes('fr') && !voice.name.toLowerCase().includes('hortense'))

            if (voixMasculine) {
                utterance.voice = voixMasculine
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
        setIsAudioPlaying(false)
        setShowConfetti(false)
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
                {/* Titre + Navigation (UNIQUEMENT sur page sélection textes) */}
                {!gameStarted && (
                    <>
                        <h1 style={{
                            fontSize: 'clamp(22px, 5vw, 28px)',
                            fontWeight: 'bold',
                            marginBottom: '10px',
                            textAlign: 'center'
                        }}>
                            <span style={{ marginRight: '8px' }}>🔤</span>
                            <span style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Trouver mes syllabes-mot
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
                                    transition: 'all 0.3s ease'
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
                                    color: '#8b5cf6',
                                    border: '2px solid #8b5cf6',
                                    borderRadius: '12px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                🏠
                            </button>
                        </div>
                    </>
                )}

                {/* Modale de gestion des nombres */}
                {showNumbersModal && (
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
                        zIndex: 1000,
                        padding: '20px'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                        }}>
                            <h2 style={{
                                marginBottom: '20px',
                                color: '#f59e0b',
                                textAlign: 'center'
                            }}>
                                ⚠️ Nombres détectés
                            </h2>

                            <p style={{
                                marginBottom: '20px',
                                color: '#666',
                                textAlign: 'center'
                            }}>
                                Des nombres ont été trouvés dans le texte.
                                Pour chaque nombre, choisissez si vous voulez le garder (converti en lettres) ou l'exclure du jeu.
                            </p>

                            <div style={{
                                display: 'grid',
                                gap: '15px',
                                marginBottom: '30px'
                            }}>
                                {numbersDetected.map((number, index) => (
                                    <div key={index} style={{
                                        padding: '15px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '10px'
                                        }}>
                                            <div>
                                                <strong style={{ fontSize: '18px', color: '#3b82f6' }}>
                                                    {number.original}
                                                </strong>
                                                <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                                                <strong style={{ fontSize: '18px', color: '#10b981' }}>
                                                    {number.converted}
                                                </strong>
                                            </div>
                                        </div>

                                        <div style={{
                                            fontSize: '14px',
                                            color: '#666',
                                            marginBottom: '10px'
                                        }}>
                                            {number.syllables?.join(' · ')} ({number.estimatedSyllables} syllabe{number.estimatedSyllables > 1 ? 's' : ''})
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            gap: '10px'
                                        }}>
                                            <button
                                                onClick={() => setNumbersChoices({
                                                    ...numbersChoices,
                                                    [number.original]: 'keep'
                                                })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: numbersChoices[number.original] === 'keep' ? '#10b981' : '#d1d5db',
                                                    backgroundColor: numbersChoices[number.original] === 'keep' ? '#d1fae5' : 'white',
                                                    color: numbersChoices[number.original] === 'keep' ? '#065f46' : '#6b7280',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✓ Garder
                                            </button>

                                            <button
                                                onClick={() => setNumbersChoices({
                                                    ...numbersChoices,
                                                    [number.original]: 'exclude'
                                                })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '2px solid',
                                                    borderColor: numbersChoices[number.original] === 'exclude' ? '#ef4444' : '#d1d5db',
                                                    backgroundColor: numbersChoices[number.original] === 'exclude' ? '#fee2e2' : 'white',
                                                    color: numbersChoices[number.original] === 'exclude' ? '#991b1b' : '#6b7280',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✗ Exclure
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={applyNumbersChoices}
                                style={{
                                    width: '100%',
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
                                🚀 Valider et commencer l'exercice
                            </button>
                        </div>
                    </div>
                )}

                {!gameStarted ? (
                    <>
                        {/* Instructions */}
                        <p className="desktop-only" style={{ textAlign: 'center', fontSize: '16px', color: '#0369a1', marginBottom: '20px' }}>
                            Pour chaque mot, décidez s'il s'agit d'un mot avec une syllabe 🟢 ou d'un mot avec plusieurs syllabes 🔴
                        </p>

                        {/* Sélection du texte */}
                        {/* Sélection des textes */}
                        {!isMobile && <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>📚 Sélectionner un texte</h3>}

                        {isLoadingTexte ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                fontSize: '16px',
                                color: '#666'
                            }}>
                                Chargement des textes...
                            </div>
                        ) : textes.length === 0 ? (
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
                                    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

                                    return (
                                        <div
                                            key={texte.id}
                                            onClick={() => {
                                                setSelectedTexte(texte.id.toString())
                                            }}
                                            style={{
                                                background: couleur.bg,
                                                border: selectedTexte === texte.id.toString() ? '3px solid #10b981' : 'none',
                                                borderRadius: '20px',
                                                padding: isMobile ? '10px 15px' : '15px',
                                                boxShadow: selectedTexte === texte.id.toString()
                                                    ? `0 8px 25px ${couleur.shadow}, 0 0 0 3px #10b981`
                                                    : `0 4px 15px ${couleur.shadow}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                transform: selectedTexte === texte.id.toString() ? 'scale(1.02)' : 'scale(1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            {/* Radio PC uniquement */}
                                            {!isMobile && (
                                                <input
                                                    type="radio"
                                                    name="texte-selection"
                                                    checked={selectedTexte === texte.id.toString()}
                                                    onChange={(e) => {
                                                        e.stopPropagation()
                                                        if (e.target.checked) {
                                                            setSelectedTexte(texte.id.toString())
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

                                            {/* Contenu : titre + stats (PC) ou titre seul (mobile) */}
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
                                                {!isMobile && (
                                                    <div style={{
                                                        color: 'rgba(255,255,255,0.9)',
                                                        fontSize: '12px',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        📊 {texte.nombre_mots_total} mots
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Bouton démarrer */}
                        <button
                            onClick={startGame}
                            disabled={!selectedTexte}
                            style={{
                                background: 'white',
                                color: selectedTexte ? '#10b981' : '#ccc',
                                padding: '15px 30px',
                                border: selectedTexte ? '2px solid #10b981' : '2px solid #ccc',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'normal',
                                cursor: selectedTexte ? 'pointer' : 'not-allowed',
                                marginTop: '20px',
                                width: '100%',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Commencer
                        </button>
                    </>
                ) : gameFinished ? (
                    <>
                        {/* Résultats finaux */}
                        <div style={{
                            padding: isMobile ? '10px' : '0'
                        }}>
                            {/* LIGNE 1 : Titre */}
                            <h2 style={{
                                fontSize: isMobile ? '24px' : '32px',
                                textAlign: 'center',
                                marginBottom: '20px',
                                color: '#10b981'
                            }}>
                                🎉 Exercice terminé !
                            </h2>

                            {/* LIGNE 2 : Icônes navigation (même style que pendant le jeu) */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '15px',
                                marginBottom: '30px'
                            }}>
                                <button
                                    onClick={() => {
                                        setGameStarted(false)
                                        setGameFinished(false)
                                    }}
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
                                    onClick={() => loadMotsTexte(selectedTexte)}
                                    style={{
                                        width: '55px',
                                        height: '55px',
                                        backgroundColor: 'white',
                                        color: '#3b82f6',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '12px',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    🔄
                                </button>
                            </div>

                            {/* Score final (sans %) */}
                            <p style={{
                                fontSize: '24px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                marginBottom: '30px',
                                color: '#333'
                            }}>
                                Score final : {score}/{attempts}
                            </p>

                            {/* Bouton "Voir le détail" UNIQUEMENT sur mobile */}
                            {isMobile && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
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
                                </div>
                            )}

                            {/* Détail : toujours affiché sur PC, conditionnel sur mobile */}
                            {(!isMobile || showResults) && (
                                <div style={{
                                    background: 'transparent',
                                    padding: '0'
                                }}>
                                    <h3 style={{
                                        marginBottom: '20px',
                                        fontSize: '20px',
                                        textAlign: isMobile ? 'left' : 'center'
                                    }}>
                                        📏 Détail des réponses
                                    </h3>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                        gap: isMobile ? '15px' : '10px'
                                    }}>
                                        {userChoices.map((choice, index) => (
                                            <div key={index} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: isMobile ? '10px' : '8px',
                                                background: choice.isCorrect ? '#d1fae5' : '#fee2e2',
                                                borderRadius: '4px',
                                                fontSize: isMobile ? '14px' : '24px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '6px' }}>
                                                    <button
                                                        onClick={() => speakText(choice.mot.clean)}
                                                        style={{
                                                            backgroundColor: '#3b82f6',
                                                            color: 'white',
                                                            padding: isMobile ? '4px 8px' : '3px 6px',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: isMobile ? '12px' : '20px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        🔊
                                                    </button>
                                                    <div>
                                                        <strong>{choice.mot.clean}</strong>
                                                        {!isMobile && (
                                                            <span style={{ fontSize: '20px', color: '#666', marginLeft: '6px' }}>
                                                                {choice.mot.syllables?.join('-')} ({choice.mot.estimatedSyllables} syll.)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '6px' }}>
                                                    {!isMobile && (
                                                        <span style={{
                                                            color: choice.isCorrect ? '#065f46' : '#991b1b',
                                                            fontSize: '22px'
                                                        }}>
                                                            {choice.isCorrect ? '✅' : '❌'}
                                                        </span>
                                                    )}
                                                    {isMobile && (
                                                        <span style={{
                                                            color: '#333',
                                                            fontSize: '12px'
                                                        }}>
                                                            Vous: {choice.userChoice ? 'Mono' : 'Multi'} {!choice.isCorrect && '❌'} / ✅: {choice.mot.isMonosyllabe ? 'Mono' : 'Multi'}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => demanderCorrection(choice.mot, choice.isCorrect)}
                                                        style={{
                                                            backgroundColor: '#f59e0b',
                                                            color: 'white',
                                                            padding: isMobile ? '4px 8px' : '6px 12px',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: isMobile ? '11px' : '18px',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {isMobile ? '🤔' : '🤔 Pas d\'accord'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Confettis de célébration (score parfait) */}
                            {showConfetti && (
                                <>
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                            @keyframes confetti-fall {
                                                0% {
                                                    transform: translateY(0) rotate(0deg);
                                                    opacity: 1;
                                                }
                                                100% {
                                                    transform: translateY(100vh) rotate(720deg);
                                                    opacity: 0;
                                                }
                                            }
                                        `
                                    }} />
                                    <div style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        zIndex: 9999,
                                        overflow: 'hidden'
                                    }}>
                                        {[...Array(50)].map((_, i) => {
                                            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
                                            const duration = 3 + Math.random() * 2
                                            const delay = Math.random() * 0.5
                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-20px',
                                                        left: `${Math.random() * 100}%`,
                                                        width: '15px',
                                                        height: '15px',
                                                        backgroundColor: colors[Math.floor(Math.random() * 6)],
                                                        opacity: 1,
                                                        borderRadius: '50%',
                                                        animation: `confetti-fall ${duration}s linear forwards`,
                                                        animationDelay: `${delay}s`,
                                                        zIndex: 10000
                                                    }}
                                                />
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Ligne 1 : Titre */}
                        <h2 style={{
                            fontSize: 'clamp(20px, 4.5vw, 26px)',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            textAlign: 'center',
                            color: '#10b981'
                        }}>
                            🔤 Trouver mes syllabes-mot
                        </h2>

                        {/* Ligne 2 : Score (gauche) + Progression (droite) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px',
                            fontSize: '16px',
                            color: '#666'
                        }}>
                            <div>📊 Score: {score}/{attempts}</div>
                            <div>📏 Mot {currentMotIndex + 1}/{allMots.length}</div>
                        </div>

                        {/* Ligne 3 : Icônes de navigation + Écouter */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '25px'
                        }}>
                            <button
                                onClick={() => {
                                    setGameStarted(false)
                                    setGameFinished(false)
                                }}
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
                                onClick={() => speakText(currentMot?.clean)}
                                style={{
                                    width: '55px',
                                    height: '55px',
                                    backgroundColor: 'white',
                                    color: '#3b82f6',
                                    border: '2px solid #3b82f6',
                                    borderRadius: '12px',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🔊
                            </button>

                            {/* Bouton Suivant (icône, uniquement si réponse incorrecte) */}
                            {feedback && !feedback.includes('✅') && (
                                <button
                                    onClick={() => goToNextWord()}
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
                                    →
                                </button>
                            )}
                        </div>

                        {/* Instructions (PC uniquement) */}
                        {!isMobile && (
                            <div style={{
                                textAlign: 'center',
                                fontSize: '16px',
                                color: '#666',
                                marginBottom: '20px',
                                marginTop: '15px'
                            }}>
                                Pour chaque mot, décidez s'il s'agit d'un mot avec une syllabe 🟢 ou d'un mot avec plusieurs syllabes 🔴
                            </div>
                        )}

                        {/* Mot actuel (sans cadre gris) */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '30px'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: '#333',
                                padding: '30px',
                                marginBottom: '20px'
                            }}>
                                {currentMot?.clean}
                            </div>
                        </div>

                        {/* Feedback */}
                        {feedback && (
                            <div style={{
                                textAlign: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                marginBottom: '20px',
                                color: feedback.includes('✅') ? '#10b981' : '#f59e0b'
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
                                disabled={!!feedback || isAudioPlaying}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#10b981',
                                    padding: '20px 40px',
                                    border: '3px solid #10b981',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'normal',
                                    cursor: (feedback || isAudioPlaying) ? 'not-allowed' : 'pointer',
                                    opacity: (feedback || isAudioPlaying) ? 0.5 : 1,
                                    minWidth: '200px',
                                    minHeight: isMobile ? '80px' : 'auto',
                                    flex: '1',
                                    maxWidth: '250px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🟢 Une syllabe
                            </button>

                            <button
                                onClick={() => handleChoice(false)}
                                disabled={!!feedback || isAudioPlaying}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#3b82f6',
                                    padding: '20px 40px',
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'normal',
                                    cursor: (feedback || isAudioPlaying) ? 'not-allowed' : 'pointer',
                                    opacity: (feedback || isAudioPlaying) ? 0.5 : 1,
                                    minWidth: '200px',
                                    minHeight: isMobile ? '80px' : 'auto',
                                    flex: '1',
                                    maxWidth: '250px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🔴 Plusieurs syllabes
                            </button>
                        </div>
                    </>
                )}


            </div>
        </div>
    )
}
