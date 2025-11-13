import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

/**
 * EXERCICE : Remettre dans l'ordre
 *
 * Les mots d'un groupe de sens sont mélangés.
 * L'apprenant doit les remettre dans le bon ordre.
 *
 * Extraction depuis reconnaitre-les-mots.js
 * Auto-démarrage avec texte_ids depuis query params
 */
export default function RemettreOrdreExercicePage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // États exercice
    const [etape, setEtape] = useState('exercice') // Toujours 'exercice' (pas de sélection)
    const [textes, setTextes] = useState([])
    const [groupesSens, setGroupesSens] = useState([])
    const [exerciceActif, setExerciceActif] = useState(null) // 'remettre-ordre' | 'remettre-ordre-resultats'
    const [groupeActuel, setGroupeActuel] = useState(null)
    const [indexGroupe, setIndexGroupe] = useState(0)
    const [score, setScore] = useState({ bonnes: 0, total: 0 })
    const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: '...' }
    const [resultats, setResultats] = useState({ reussis: [], rates: [] })

    // Remettre dans l'ordre - états spécifiques
    const [motsSelectionnes, setMotsSelectionnes] = useState([])
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [motsValidation, setMotsValidation] = useState([]) // 'correct' | 'incorrect' pour chaque mot
    const [motEnCoursLecture, setMotEnCoursLecture] = useState(-1)
    const [isVerifying, setIsVerifying] = useState(false)
    const [taillePoliceMots, setTaillePoliceMots] = useState(12)

    // Enregistrements vocaux personnalisés
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Mots individuels
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({}) // Groupes de sens

    // Détection mobile
    const [isMobile, setIsMobile] = useState(false)

    // Célébration
    const [showConfetti, setShowConfetti] = useState(false)

    // Références
    const containerRef = useRef(null)
    const audioEnCoursRef = useRef(null)
    const interrompreLectureRef = useRef(null)

    // ==================== DÉTECTION MOBILE ====================
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // ==================== AUTHENTIFICATION ====================
    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        try {
            const token = localStorage.getItem('token')
            const userData = localStorage.getItem('user')

            if (!token || !userData) {
                router.push('/login')
                return
            }

            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            await loadTextes(parsedUser.id)
            // Enregistrements chargés dans chargerGroupesSens() avec texte_ids
        } catch (err) {
            console.error('Erreur auth:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    // ==================== CHARGEMENT DONNÉES ====================
    async function loadTextes(apprenantId) {
        try {
            const { data, error } = await supabase
                .from('textes_references')
                .select('*')
                .eq('apprenant_id', apprenantId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTextes(data || [])
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    async function loadEnregistrements(texteIds) {
        try {
            console.log('🔍 DEBUG loadEnregistrements - texteIds:', texteIds)

            const token = localStorage.getItem('token')
            const response = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()

            console.log('🔍 DEBUG loadEnregistrements - résultat API:', {
                nbEnregistrements: data?.enregistrements?.length || 0,
                premierEnregistrement: data?.enregistrements?.[0]
            })

            if (data && data.enregistrements) {
                const map = {}
                data.enregistrements.forEach(enr => {
                    // Normaliser la clé comme dans lireTTS()
                    const motNormalise = enr.mot.toLowerCase().trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    map[motNormalise] = enr
                })
                console.log('🔍 DEBUG loadEnregistrements - map créé:', {
                    nbClés: Object.keys(map).length,
                    clés: Object.keys(map).slice(0, 10)
                })
                setEnregistrementsMap(map)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
        }
    }

    async function loadEnregistrementsGroupes(texteIds) {
        try {
            console.log('🔍 DEBUG loadEnregistrementsGroupes - texteIds:', texteIds)

            const token = localStorage.getItem('token')
            const response = await fetch(`/api/enregistrements-groupes/list?texte_ids=${texteIds.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()

            console.log('🔍 DEBUG loadEnregistrementsGroupes - résultat API:', {
                nbEnregistrements: data?.enregistrements?.length || 0,
                premierEnregistrement: data?.enregistrements?.[0]
            })

            if (data && data.enregistrements) {
                const map = {}
                data.enregistrements.forEach(enr => {
                    map[enr.groupe_sens_id] = enr  // ✅ groupe_sens_id (pas groupe_id)
                })
                console.log('🔍 DEBUG loadEnregistrementsGroupes - map créé:', {
                    nbClés: Object.keys(map).length
                })
                setEnregistrementsGroupesMap(map)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements groupes:', error)
        }
    }

    // ==================== AUTO-DÉMARRAGE ====================
    useEffect(() => {
        if (router.isReady && router.query.texte_ids && user && textes.length > 0 && groupesSens.length === 0) {
            const ids = router.query.texte_ids.split(',').map(id => parseInt(id))
            console.log('🎯 Auto-démarrage Remettre dans l\'ordre avec textes:', ids)
            chargerGroupesSens(ids)
        }
    }, [router.isReady, router.query.texte_ids, user, textes, groupesSens])

    async function chargerGroupesSens(texteIds) {
        try {
            const { data, error: err } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', texteIds)
                .order('texte_reference_id', { ascending: true })
                .order('ordre_groupe', { ascending: true })

            if (err) throw err

            // Filtrer les groupes vides ou avec seulement des espaces/sauts de ligne
            const groupesFiltres = (data || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0
            })

            console.log(`✅ ${groupesFiltres.length} groupes de sens chargés`)

            // Charger les enregistrements via API avec texte_ids
            await loadEnregistrements(texteIds)
            await loadEnregistrementsGroupes(texteIds)

            setGroupesSens(groupesFiltres)

            // AUTO-DÉMARRER l'exercice
            if (groupesFiltres.length > 0) {
                setTimeout(() => {
                    demarrerRemettreOrdre(groupesFiltres)
                }, 100)
            }
        } catch (error) {
            console.error('Erreur chargement groupes:', error)
            setError('Erreur lors du chargement des groupes de sens')
        }
    }

    // ==================== FONCTIONS AUDIO ====================
    async function lireTTS(texte, onEnded = null) {
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // DEBUG TEMPORAIRE
        console.log('🔍 DEBUG lireTTS:', {
            texteOriginal: texte,
            motNormalise: motNormalise,
            nbEnregistrements: Object.keys(enregistrementsMap).length,
            clésDisponibles: Object.keys(enregistrementsMap).slice(0, 10),
            enregistrementTrouvé: !!enregistrementsMap[motNormalise],
            enregistrement: enregistrementsMap[motNormalise]
        })

        // PRIORITÉ 1 : VOIX PERSONNALISÉE
        if (enregistrementsMap[motNormalise]) {
            console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
            const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
            if (onEnded) {
                audio.addEventListener('ended', onEnded)
            }
            audio.play().catch(err => {
                console.error('❌ Erreur lecture audio personnalisé:', err)
                lireTTSElevenLabs(texte, onEnded)
            })
            return audio
        }

        // PRIORITÉ 2 : ELEVENLABS API
        console.log(`⏭️ Pas d'enregistrement pour "${motNormalise}", tentative ElevenLabs`)
        return await lireTTSElevenLabs(texte, onEnded)
    }

    async function lireTTSElevenLabs(texte, onEnded = null) {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: texte })
            })

            if (response.ok) {
                const data = await response.json()
                console.log(`🎙️ Audio ElevenLabs généré pour "${texte}"`)
                const audio = new Audio(data.audio)
                if (onEnded) {
                    audio.addEventListener('ended', onEnded)
                }
                audio.play().catch(err => {
                    console.error('❌ Erreur lecture ElevenLabs:', err)
                    lireTTSFallback(texte, onEnded)
                })
                return audio
            } else {
                return lireTTSFallback(texte, onEnded)
            }
        } catch (error) {
            console.error('❌ Erreur appel ElevenLabs:', error)
            return lireTTSFallback(texte, onEnded)
        }
    }

    function lireTTSFallback(texte, onEnded = null) {
        console.log(`🔊 Fallback Web Speech API pour "${texte}"`)

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()

            const voices = window.speechSynthesis.getVoices()
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6

            const frenchVoices = voices.filter(v =>
                v.lang.startsWith('fr') &&
                !v.name.toLowerCase().includes('hortense')
            )

            if (frenchVoices.length > 0) {
                const preferredVoice = frenchVoices.find(v =>
                    v.name.toLowerCase().includes('thomas') ||
                    v.name.toLowerCase().includes('daniel')
                ) || frenchVoices[0]

                utterance.voice = preferredVoice
                console.log(`🗣️ Voix sélectionnée: ${preferredVoice.name}`)
            }

            if (onEnded) {
                utterance.addEventListener('end', onEnded)
            }

            window.speechSynthesis.speak(utterance)
            return utterance
        }
        return null
    }

    async function lireGroupeDeSens() {
        if (!groupeActuel) return

        // Lecture mot par mot avec cascade audio (Voix perso > ElevenLabs > Web Speech)
        console.log(`🔊 Lecture mot par mot du groupe ${groupeActuel.id}`)
        lireGroupeMotParMot()
    }

    function lireGroupeMotParMot() {
        if (!groupeActuel) return

        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) return

            const onEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300)
            }

            lireTTS(mots[index], onEnded)
        }

        lireMotSuivant()
    }

    function lirePhraseDansOrdre(motsALire, onFinish) {
        if (!motsALire || motsALire.length === 0) return

        interrompreLectureRef.current = false

        let index = 0

        function lireMotSuivant() {
            if (interrompreLectureRef.current) {
                setMotEnCoursLecture(-1)
                return
            }

            if (index >= motsALire.length) {
                setMotEnCoursLecture(-1)
                audioEnCoursRef.current = null
                if (onFinish) onFinish()
                return
            }

            setMotEnCoursLecture(index)

            const onEnded = () => {
                if (interrompreLectureRef.current) {
                    setMotEnCoursLecture(-1)
                    return
                }
                index++
                lireMotSuivant()
            }

            const audio = lireTTS(motsALire[index], onEnded)
            if (audio && audio.then) {
                audio.then(audioObj => {
                    audioEnCoursRef.current = audioObj
                })
            } else {
                audioEnCoursRef.current = audio
            }
        }

        lireMotSuivant()
    }

    function stopperLecture() {
        interrompreLectureRef.current = true
        if (audioEnCoursRef.current) {
            try {
                audioEnCoursRef.current.pause()
                audioEnCoursRef.current.currentTime = 0
            } catch (e) {
                console.log('Audio déjà terminé ou non disponible')
            }
            audioEnCoursRef.current = null
        }
        setMotEnCoursLecture(-1)
    }

    function jouerSonApplaudissement() {
        console.log('🎉 Célébration : score parfait !')

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance('Bravo !!! Score parfait !!!')
            utterance.lang = 'fr-FR'
            utterance.rate = 1.0
            utterance.pitch = 1.2
            utterance.volume = 1.0

            const voices = window.speechSynthesis.getVoices()
            const frenchVoices = voices.filter(v =>
                v.lang.startsWith('fr') &&
                !v.name.toLowerCase().includes('hortense')
            )
            if (frenchVoices.length > 0) {
                utterance.voice = frenchVoices[0]
            }

            window.speechSynthesis.speak(utterance)
        }
    }

    // ==================== FONCTIONS EXERCICE ====================
    function demarrerRemettreOrdre(groupes = null) {
        const groupesAUtiliser = groupes || groupesSens
        if (groupesAUtiliser.length === 0) return

        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })
        setExerciceActif('remettre-ordre')
        setIndexGroupe(0)
        preparerQuestionRemettreOrdre(0, groupesAUtiliser)
    }

    function melangerTableau(array) {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    function preparerQuestionRemettreOrdre(index, groupes = null) {
        const groupesAUtiliser = groupes || groupesSens

        if (index >= groupesAUtiliser.length) {
            setExerciceActif('remettre-ordre-resultats')
            return
        }

        const groupe = groupesAUtiliser[index]
        const mots = groupe.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        const motsMelanges = melangerTableau(mots)

        setGroupeActuel(groupe)
        setMotsDisponibles(motsMelanges)
        setMotsSelectionnes([])
        setMotsValidation([])
        setMotEnCoursLecture(-1)
        setFeedback(null)
    }

    function ajouterMotDansOrdre(mot) {
        setMotsSelectionnes([...motsSelectionnes, mot])
        setMotsDisponibles(motsDisponibles.filter(m => m !== mot))
    }

    function retirerMotDansOrdre(index) {
        const motRetire = motsSelectionnes[index]
        setMotsSelectionnes(motsSelectionnes.filter((_, i) => i !== index))
        setMotsDisponibles([...motsDisponibles, motRetire])
    }

    function verifierOrdre() {
        if (!groupeActuel) return

        setIsVerifying(true)

        const motsAttendus = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        const validation = motsSelectionnes.map((mot, i) =>
            mot === motsAttendus[i] ? 'correct' : 'incorrect'
        )
        setMotsValidation(validation)

        const correct =
            motsSelectionnes.length === motsAttendus.length &&
            motsSelectionnes.every((mot, i) => mot === motsAttendus[i])

        const newScore = {
            bonnes: score.bonnes + (correct ? 1 : 0),
            total: score.total + 1
        }
        setScore(newScore)

        const phraseReconstitue = motsSelectionnes.join(' ')
        if (correct) {
            setResultats(prev => ({
                ...prev,
                reussis: [...prev.reussis, phraseReconstitue]
            }))
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, groupeActuel.contenu]
            }))
        }

        lirePhraseDansOrdre(motsSelectionnes, () => {
            if (correct) {
                setFeedback({ type: 'success', message: '✅ Parfait ! C\'est bien ça !' })
            } else {
                setFeedback({
                    type: 'error',
                    message: `❌ Certains mots ne sont pas au bon endroit`
                })
            }
            setIsVerifying(false)
        })
    }

    function phraseSuivante() {
        stopperLecture()
        setIsVerifying(false)
        const nextIndex = indexGroupe + 1
        setIndexGroupe(nextIndex)
        preparerQuestionRemettreOrdre(nextIndex)
    }

    // ==================== PLEIN ÉCRAN (Mobile) ====================
    function quitterPleinEcran() {
        if (!isMobile) return

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {})
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen()
            }
        }

        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock()
            } catch (e) {
                // Ignorer les erreurs
            }
        }
    }

    async function togglePleinEcran() {
        if (!isMobile) return

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            quitterPleinEcran()
        } else {
            try {
                const elem = document.documentElement
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen()
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen()
                }

                if (screen.orientation && screen.orientation.lock) {
                    try {
                        await screen.orientation.lock('landscape')
                    } catch (e) {
                        console.log('Orientation lock non supporté:', e)
                    }
                }
            } catch (e) {
                console.log('Plein écran refusé:', e)
            }
        }
    }

    // ==================== USEEFFECTS ====================
    // Écouter la sortie du plein écran
    useEffect(() => {
        if (!isMobile) return

        function handleFullscreenChange() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (screen.orientation && screen.orientation.unlock) {
                    try {
                        screen.orientation.unlock()
                    } catch (e) {
                        // Ignorer
                    }
                }
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
        }
    }, [isMobile])

    // Calcul dynamique de la taille de police pour mobile
    useEffect(() => {
        if (!isMobile || motsSelectionnes.length === 0 || !containerRef.current) return

        const longueurTotale = motsSelectionnes.reduce((acc, mot) => acc + mot.length, 0)
        const nombreMots = motsSelectionnes.length
        const largeurContainer = containerRef.current.offsetWidth - 16

        const largeurEstimee = (longueurTotale, fontSize) => {
            return (longueurTotale * 0.6 * fontSize) + (nombreMots * 16) + ((nombreMots - 1) * 4)
        }

        let taille = 20
        while (taille > 8 && largeurEstimee(longueurTotale, taille) > largeurContainer) {
            taille -= 0.5
        }

        setTaillePoliceMots(Math.max(8, Math.min(20, taille)))
    }, [motsSelectionnes, isMobile])

    // Célébration score parfait
    useEffect(() => {
        if (exerciceActif === 'remettre-ordre-resultats' && score.total > 0) {
            const pourcentage = (score.bonnes / score.total) * 100
            if (pourcentage === 100) {
                setShowConfetti(true)
                jouerSonApplaudissement()
                setTimeout(() => setShowConfetti(false), 4000)
            }
        }
    }, [exerciceActif, score])

    // ==================== RENDU ====================
    if (loading) {
        return (
            <div style={styles.container}>
                <p>Chargement...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        )
    }

    // EXERCICE : REMETTRE DANS L'ORDRE
    if (exerciceActif === 'remettre-ordre' && groupeActuel) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {isMobile ? (
                        // VERSION MOBILE : Layout vertical
                        <div style={{ width: '100%' }}>
                            <h1 style={{
                                ...styles.title,
                                fontSize: '20px',
                                marginBottom: '8px',
                                textAlign: 'center'
                            }}>
                                🔄 Remettre dans l'ordre
                            </h1>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '14px',
                                color: '#666',
                                marginBottom: '12px'
                            }}>
                                <span>Phrase {indexGroupe + 1}/{groupesSens.length}</span>
                                <span>Score {score.bonnes}/{score.total}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Reconnaître les mots"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu Lire"
                                >
                                    📖
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={lireGroupeDeSens}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Écouter la phrase"
                                >
                                    🔊
                                </button>
                            </div>
                        </div>
                    ) : (
                        // VERSION DESKTOP
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            <h1 style={styles.title}>🔄 Remettre dans l'ordre</h1>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Reconnaître les mots"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu Lire"
                                >
                                    📖
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={lireGroupeDeSens}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Écouter la phrase"
                                >
                                    🔊
                                </button>
                            </div>
                            <p style={styles.subtitle}>
                                Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                    )}
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                {/* Zone des mots sélectionnés (phrase en construction) */}
                <div style={{
                    ...styles.ordreSection,
                    ...(isMobile ? {
                        marginTop: '8px',
                        width: '100%',
                        padding: '8px',
                        marginLeft: '0',
                        marginRight: '0',
                        boxSizing: 'border-box'
                    } : {})
                }}>
                    <div
                        ref={containerRef}
                        style={{
                            ...styles.phraseEnCours,
                            ...(isMobile ? {
                                width: '100%',
                                minHeight: '80px',
                                display: 'flex',
                                flexWrap: 'nowrap',
                                alignItems: 'center',
                                gap: '4px',
                                justifyContent: 'center'
                            } : {})
                        }}
                    >
                        {motsSelectionnes.length === 0 ? (
                            <span style={styles.placeholderPhrase}>
                                Clique sur les mots ci-dessous pour construire ta phrase...
                            </span>
                        ) : (
                            motsSelectionnes.map((mot, index) => (
                                <button
                                    key={index}
                                    onClick={() => retirerMotDansOrdre(index)}
                                    disabled={feedback !== null}
                                    style={{
                                        ...styles.motSelectionne,
                                        ...(feedback !== null ? { cursor: 'not-allowed' } : {}),
                                        ...(isMobile ? {
                                            flexShrink: 1,
                                            whiteSpace: 'nowrap',
                                            display: 'inline-flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0px',
                                            fontSize: `${taillePoliceMots}px`,
                                            padding: `${Math.max(4, taillePoliceMots * 0.4)}px ${Math.max(6, taillePoliceMots * 0.6)}px ${Math.max(2, taillePoliceMots * 0.2)}px`,
                                            minWidth: '0'
                                        } : {}),
                                        ...(motsValidation[index] === 'correct' && (index <= motEnCoursLecture || motEnCoursLecture === -1) ? {
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: '2px solid #059669',
                                            fontWeight: 'bold'
                                        } : {}),
                                        ...(motsValidation[index] === 'incorrect' && (index <= motEnCoursLecture || motEnCoursLecture === -1) ? {
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            border: '2px solid #dc2626',
                                            fontWeight: 'bold'
                                        } : {}),
                                        ...(motEnCoursLecture === index ? {
                                            transform: 'scale(1.15)'
                                        } : {})
                                    }}
                                >
                                    <span>{mot}</span>
                                    {feedback === null && (
                                        <span style={{
                                            fontSize: isMobile ? `${taillePoliceMots * 0.5}px` : '14px',
                                            color: '#ef4444',
                                            marginTop: isMobile ? '-2px' : '0',
                                            lineHeight: '1'
                                        }}>
                                            ✕
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Zone des mots disponibles (mélangés) */}
                <div style={styles.ordreSection}>
                    <div style={styles.motsDisponiblesGrid}>
                        {motsDisponibles.map((mot, index) => (
                            <button
                                key={index}
                                onClick={() => ajouterMotDansOrdre(mot)}
                                disabled={feedback !== null}
                                style={{
                                    ...styles.motDisponible,
                                    ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                                }}
                            >
                                {mot}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={verifierOrdre}
                        disabled={motsSelectionnes.length === 0 || feedback !== null || isVerifying}
                        style={{
                            padding: isMobile ? '8px 12px' : '14px 32px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            fontSize: isMobile ? '14px' : '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            ...(motsSelectionnes.length === 0 || feedback || isVerifying ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                        }}
                    >
                        Vérifier
                    </button>
                    {feedback !== null && (
                        <button
                            onClick={phraseSuivante}
                            style={{
                                padding: isMobile ? '8px 12px' : '14px 32px',
                                backgroundColor: 'white',
                                color: '#3b82f6',
                                border: '2px solid #3b82f6',
                                borderRadius: '12px',
                                fontSize: isMobile ? '14px' : '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Phrase suivante ➡️
                        </button>
                    )}
                    {!isMobile && (
                        <button
                            onClick={() => {
                                setMotsDisponibles(melangerTableau([...motsDisponibles, ...motsSelectionnes]))
                                setMotsSelectionnes([])
                                setMotsValidation([])
                            }}
                            disabled={motsSelectionnes.length === 0 || feedback !== null}
                            style={{
                                ...styles.secondaryButton,
                                ...(motsSelectionnes.length === 0 || feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // PAGE RÉSULTATS
    if (exerciceActif === 'remettre-ordre-resultats') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {isMobile ? (
                        // VERSION MOBILE
                        <div style={{ width: '100%' }}>
                            <h1 style={{
                                ...styles.title,
                                fontSize: '20px',
                                marginBottom: '12px',
                                textAlign: 'center'
                            }}>
                                📊 Résultats
                            </h1>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Reconnaître les mots"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu Lire"
                                >
                                    📖
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={() => demarrerRemettreOrdre()}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Recommencer"
                                >
                                    🔄
                                </button>
                            </div>
                            {/* Score intégré sous les icônes */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: '12px'
                            }}>
                                <div style={{
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: 'white',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: '#1e293b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>{score.bonnes}</span>
                                    <span style={{ color: '#64748b' }}>/</span>
                                    <span style={{ color: '#64748b' }}>{score.total}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // VERSION DESKTOP
                        <div style={{ width: '100%' }}>
                            <h1 style={styles.title}>📊 Résultats</h1>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Reconnaître les mots"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu Lire"
                                >
                                    📖
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={() => demarrerRemettreOrdre()}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Recommencer"
                                >
                                    🔄
                                </button>
                            </div>
                            <p style={styles.subtitle}>
                                Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                    )}
                </div>

                <div style={{
                    ...styles.resultatsBox,
                    ...(isMobile ? {
                        padding: '8px',
                        marginTop: '8px',
                        backgroundColor: 'transparent'
                    } : {})
                }}>
                    {resultats.reussis.length > 0 && (
                        <div style={{
                            ...styles.resultatsSection,
                            ...(isMobile ? {
                                marginBottom: '12px'
                            } : {})
                        }}>
                            <h2 style={{
                                ...styles.resultatsSectionTitle,
                                ...(isMobile ? {
                                    fontSize: '16px',
                                    marginBottom: '8px',
                                    textAlign: 'center'
                                } : {})
                            }}>
                                ✅ Phrases réussies ({resultats.reussis.length})
                            </h2>
                            <div style={styles.phrasesListe}>
                                {resultats.reussis.map((phrase, index) => (
                                    <div key={index} style={styles.phraseReussie}>
                                        {phrase}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {resultats.rates.length > 0 && (
                        <div style={{
                            ...styles.resultatsSection,
                            ...(isMobile ? {
                                marginBottom: '12px'
                            } : {})
                        }}>
                            <h2 style={{
                                ...styles.resultatsSectionTitle,
                                ...(isMobile ? {
                                    fontSize: '16px',
                                    marginBottom: '8px',
                                    textAlign: 'center'
                                } : {})
                            }}>
                                ❌ Phrases ratées ({resultats.rates.length})
                            </h2>
                            <div style={styles.phrasesListe}>
                                {resultats.rates.map((phrase, index) => (
                                    <div key={index} style={styles.phraseRatee}>
                                        {phrase}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confettis de célébration */}
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
                            width: '100vw',
                            height: '100vh',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            overflow: 'hidden'
                        }}>
                            {[...Array(50)].map((_, i) => {
                                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
                                const duration = 2 + Math.random() * 2
                                const delay = Math.random() * 0.5
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            left: `${Math.random() * 100}%`,
                                            width: '10px',
                                            height: '10px',
                                            backgroundColor: colors[Math.floor(Math.random() * 6)],
                                            opacity: 0.8,
                                            borderRadius: '50%',
                                            animation: `confetti-fall ${duration}s linear forwards`,
                                            animationDelay: `${delay}s`
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        )
    }

    // Chargement initial ou pas encore démarré
    return (
        <div style={styles.container}>
            <p>Chargement de l'exercice...</p>
        </div>
    )
}

// ==================== STYLES ====================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },
    header: {
        width: '100%',
        maxWidth: '900px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1e293b',
        margin: '0 0 16px 0',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: '18px',
        color: '#64748b',
        margin: '0',
        textAlign: 'center'
    },
    feedbackBox: {
        width: '100%',
        maxWidth: '900px',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: '600',
        textAlign: 'center'
    },
    feedbackSuccess: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '2px solid #10b981'
    },
    feedbackError: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        border: '2px solid #ef4444'
    },
    ordreSection: {
        width: '100%',
        maxWidth: '900px',
        marginBottom: '24px'
    },
    phraseEnCours: {
        minHeight: '120px',
        padding: '20px',
        backgroundColor: 'white',
        border: '3px dashed #cbd5e1',
        borderRadius: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'center'
    },
    placeholderPhrase: {
        color: '#94a3b8',
        fontSize: '18px',
        fontStyle: 'italic'
    },
    motSelectionne: {
        padding: '12px 20px 8px',
        backgroundColor: '#e0f2fe',
        border: '2px solid #0ea5e9',
        borderRadius: '12px',
        fontSize: '20px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
    },
    motsDisponiblesGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        justifyContent: 'center'
    },
    motDisponible: {
        padding: '12px 24px',
        backgroundColor: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        fontSize: '20px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    actions: {
        display: 'flex',
        gap: '16px',
        marginTop: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    primaryButton: {
        padding: '14px 32px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    secondaryButton: {
        padding: '14px 32px',
        backgroundColor: 'white',
        color: '#64748b',
        border: '2px solid #cbd5e1',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    resultatsBox: {
        width: '100%',
        maxWidth: '900px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    resultatsSection: {
        marginBottom: '24px'
    },
    resultatsSectionTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: '12px'
    },
    phrasesListe: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    phraseReussie: {
        padding: '12px 16px',
        backgroundColor: '#d1fae5',
        border: '2px solid #10b981',
        borderRadius: '8px',
        fontSize: '16px',
        color: '#065f46'
    },
    phraseRatee: {
        padding: '12px 16px',
        backgroundColor: '#fee2e2',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        fontSize: '16px',
        color: '#991b1b'
    }
}
