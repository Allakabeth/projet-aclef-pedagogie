import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { countSyllables, isMonosyllabic, syllabifyWord } from '../../utils/syllabify'
import { convertNumberToWordsWithHyphens, isNumericString } from '../../lib/convertNumbers'
import VoiceRecorder from '../../components/VoiceRecorder'

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
    const [numbersDetected, setNumbersDetected] = useState([])
    const [showNumbersModal, setShowNumbersModal] = useState(false)
    const [numbersChoices, setNumbersChoices] = useState({})
    const [pendingWords, setPendingWords] = useState([])
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [showRecorder, setShowRecorder] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [correctionsMonoMulti, setCorrectionsMonoMulti] = useState({})
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
            loadEnregistrements() // Charger les enregistrements de mots
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
                console.log(`🎤 ${data.count} enregistrement(s) de mots chargé(s)`)
                setEnregistrementsMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
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

                // 🌟 CHARGER LES CORRECTIONS CENTRALISÉES
                // Extraire tous les mots pour récupérer leurs corrections
                const motsUniques = new Set()
                groupesValides.forEach(groupe => {
                    const words = groupe.contenu
                        .split(/\s+/)
                        .filter(word => word.trim() !== '')
                        .map(word => {
                            let cleanWord = word.replace(/[.,!?;:()"""]/g, '').toLowerCase()
                            if (cleanWord.includes("'")) {
                                cleanWord = cleanWord.split("'").pop()
                            }
                            return cleanWord
                        })
                        .filter(w => w.length > 0)
                    words.forEach(w => motsUniques.add(w))
                })

                // Récupérer les corrections depuis l'API
                const correctionsTemp = {}
                if (motsUniques.size > 0) {
                    try {
                        const correctionsResponse = await fetch('/api/corrections/get-corrections', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                mots: Array.from(motsUniques),
                                type: 'mono_multi'
                            })
                        })

                        if (correctionsResponse.ok) {
                            const correctionsData = await correctionsResponse.json()
                            console.log('📥 Réponse API corrections:', correctionsData)
                            Object.assign(correctionsTemp, correctionsData.mono_multi || {})
                            if (Object.keys(correctionsTemp).length > 0) {
                                console.log(`🌟 ${Object.keys(correctionsTemp).length} correction(s) centralisée(s) chargée(s)`)
                                console.log('📋 Détail des corrections:', correctionsTemp)
                            } else {
                                console.warn('⚠️ Aucune correction centralisée trouvée pour ces mots:', Array.from(motsUniques))
                            }
                        } else {
                            console.error('❌ Erreur API corrections:', correctionsResponse.status, await correctionsResponse.text())
                        }
                    } catch (error) {
                        console.error('Erreur chargement corrections centralisées:', error)
                    }
                }

                // Sauvegarder les corrections dans le state pour utilisation ultérieure
                setCorrectionsMonoMulti(correctionsTemp)

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

                            // 🌟 APPLIQUER CORRECTION CENTRALISÉE si elle existe
                            let isMonosyllabe = isMonosyllabic(cleanWord)
                            if (correctionsTemp[cleanWord]) {
                                const correctionCentrale = correctionsTemp[cleanWord]
                                isMonosyllabe = correctionCentrale === 'monosyllabe'
                                console.log(`🌟 Correction appliquée pour "${cleanWord}": ${correctionCentrale} (était: ${isMonosyllabic(cleanWord) ? 'mono' : 'multi'})`)
                            }

                            return {
                                original: word,
                                clean: cleanWord,
                                groupe_id: groupe.id,
                                syllables: syllabifyWord(cleanWord),
                                estimatedSyllables: countSyllables(cleanWord),
                                isMonosyllabe: isMonosyllabe
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
                        // 🌟 APPLIQUER CORRECTION CENTRALISÉE pour nombres convertis
                        let isMonosyllabe = isMonosyllabic(converted)
                        if (correctionsMonoMulti[converted]) {
                            const correctionCentrale = correctionsMonoMulti[converted]
                            isMonosyllabe = correctionCentrale === 'monosyllabe'
                            console.log(`🌟 Correction appliquée pour nombre converti "${converted}": ${correctionCentrale}`)
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