import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

/**
 * EXERCICE : OÙ EST-CE ?
 *
 * Audio → Trouver le mot écrit parmi les mots du groupe de sens
 *
 * Fonctionnement :
 * - L'apprenant entend "Où est [mot]"
 * - Il doit cliquer sur le bon mot parmi ceux affichés
 * - Feedback immédiat (✅ ou ❌)
 * - Passage automatique à la question suivante après 1.5s
 * - Page résultats finale avec confettis si score parfait
 */
export default function OuEstCeExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Données
    const [textes, setTextes] = useState([])
    const [groupesSens, setGroupesSens] = useState([])
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [elevenLabsTokens, setElevenLabsTokens] = useState(0)

    // États exercice
    const [etape, setEtape] = useState('exercice') // exercice | resultats
    const [motActuel, setMotActuel] = useState(null)
    const [groupeActuel, setGroupeActuel] = useState(null)
    const [score, setScore] = useState({ bonnes: 0, total: 0 })
    const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', motClique: '...' }
    const [resultats, setResultats] = useState({ reussis: [], rates: [] })
    const [tousLesMots, setTousLesMots] = useState([]) // Toutes les questions
    const [indexQuestion, setIndexQuestion] = useState(-1) // -1 pour déclencher useEffect au premier démarrage

    // Mobile
    const [isMobile, setIsMobile] = useState(false)
    const [taillePoliceOuEst, setTaillePoliceOuEst] = useState(16)
    const motsGridOuEstRef = useRef(null)

    // Célébration
    const [showConfetti, setShowConfetti] = useState(false)

    // ==================== AUTHENTIFICATION ====================
    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setLoading(false)
    }, [])

    // ==================== DÉTECTION MOBILE ====================
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // ==================== CHARGEMENT TEXTES ====================
    useEffect(() => {
        if (!user) return

        async function chargerTextes() {
            try {
                const { data, error } = await supabase
                    .from('textes_references')
                    .select('id, titre')
                    .eq('apprenant_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setTextes(data || [])
            } catch (err) {
                console.error('Erreur chargement textes:', err)
            }
        }

        chargerTextes()
    }, [user])

    // ==================== CHARGEMENT ENREGISTREMENTS ====================
    useEffect(() => {
        if (!user) return

        async function chargerEnregistrements() {
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
                    setEnregistrementsMap(data.enregistrementsMap || {})
                }
            } catch (err) {
                console.error('Erreur chargement enregistrements:', err)
            }
        }

        chargerEnregistrements()
    }, [user])

    // ==================== CHARGEMENT TOKENS ELEVENLABS ====================
    useEffect(() => {
        if (!user) return

        async function chargerTokensElevenLabs() {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/tokens', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (response.ok) {
                    const data = await response.json()
                    setElevenLabsTokens(data.remaining || 0)
                    console.log(`✅ ${data.remaining || 0} tokens ElevenLabs disponibles`)
                }
            } catch (err) {
                console.error('Erreur chargement tokens ElevenLabs:', err)
            }
        }

        chargerTokensElevenLabs()
    }, [user])

    // ==================== AUTO-DÉMARRAGE ====================
    useEffect(() => {
        if (router.isReady && router.query.texte_ids && user && textes.length > 0 && groupesSens.length === 0) {
            const ids = router.query.texte_ids.split(',').map(id => parseInt(id))
            console.log('🎯 Auto-démarrage Où est-ce avec textes:', ids)
            chargerGroupesSens(ids)
        }
    }, [router.isReady, router.query.texte_ids, user, textes, groupesSens])

    // ==================== CHARGEMENT GROUPES + DÉMARRAGE ====================
    async function chargerGroupesSens(texteIds) {
        try {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', texteIds)
                .order('texte_reference_id', { ascending: true })
                .order('ordre_groupe', { ascending: true })

            if (err) throw err

            // Filtrer les groupes vides
            const groupes = (data || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0
            })

            setGroupesSens(groupes)

            // Démarrer l'exercice automatiquement
            setTimeout(() => demarrerOuEstCe(groupes), 100)

        } catch (err) {
            console.error('Erreur chargement groupes:', err)
        } finally {
            setLoading(false)
        }
    }

    // ==================== LECTURE AUTO QUESTION ====================
    useEffect(() => {
        if (etape === 'exercice' && motActuel && tousLesMots.length > 0 && indexQuestion < tousLesMots.length) {
            // Au premier démarrage (indexQuestion === 0), attendre que enregistrementsMap soit chargé
            if (indexQuestion === 0 && Object.keys(enregistrementsMap).length === 0) {
                console.log('⏳ Attente du chargement des enregistrements avant le premier audio...')
                return
            }

            const timer = setTimeout(() => {
                console.log(`🎯 Lecture auto question ${indexQuestion + 1} - ${Object.keys(enregistrementsMap).length} enregistrements disponibles`)
                lireQuestionOuEstCe(motActuel)
            }, 300)

            return () => clearTimeout(timer)
        }
    }, [indexQuestion, etape, enregistrementsMap]) // Ajouter enregistrementsMap pour relancer quand ils arrivent

    // ==================== CALCUL TAILLE POLICE MOBILE ====================
    useEffect(() => {
        if (!isMobile || etape !== 'exercice' || !groupeActuel) return

        const calculerTaille = () => {
            if (!motsGridOuEstRef.current) return

            const container = motsGridOuEstRef.current
            const containerWidth = container.offsetWidth - 16 // padding

            const mots = groupeActuel.motsDuGroupe || groupeActuel.contenu.trim().split(/\s+/).filter(mot => !/^[.,:;!?]+$/.test(mot))
            if (mots.length === 0) return

            // Longueur max d'un mot
            const motLePlusLong = Math.max(...mots.map(m => m.length))

            // Calculer taille optimale
            let taille = 24
            while (taille > 8) {
                const largeurEstimee = motLePlusLong * taille * 0.6 + 32
                if (largeurEstimee <= containerWidth / 2) break
                taille -= 0.5
            }

            setTaillePoliceOuEst(Math.max(10, Math.min(24, taille)))
        }

        calculerTaille()
    }, [isMobile, groupeActuel, etape])

    // ==================== CÉLÉBRATION SCORE PARFAIT ====================
    useEffect(() => {
        if (etape === 'resultats' && score.total > 0) {
            const pourcentage = (score.bonnes / score.total) * 100

            if (pourcentage === 100) {
                setShowConfetti(true)
                jouerSonApplaudissement()

                const timerConfetti = setTimeout(() => {
                    setShowConfetti(false)
                }, 4000)

                return () => {
                    clearTimeout(timerConfetti)
                }
            }
        }
    }, [etape, score.bonnes, score.total])

    // ==================== DÉMARRAGE EXERCICE ====================
    function demarrerOuEstCe(groupes = groupesSens) {
        if (groupes.length === 0) return
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })

        // Créer liste de questions : chaque mot de chaque groupe
        const questions = []
        groupes.forEach(groupe => {
            // Filtrer les mots vides (espaces, lignes vides, etc.)
            const mots = groupe.contenu
                .trim()
                .split(/\s+/)
                .filter(mot => mot && mot.trim().length > 0)
                .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

            // Ne créer des questions que pour les groupes avec des mots valides
            if (mots.length > 0) {
                mots.forEach((mot) => {
                    questions.push({
                        mot: mot,
                        groupe: groupe,
                        motsDuGroupe: mots
                    })
                })
            }
        })

        // TOUJOURS mélanger les questions pour éviter de deviner l'ordre (Fisher-Yates)
        const questionsMelangees = melangerTableau(questions)

        setTousLesMots(questionsMelangees)
        setIndexQuestion(0)
        setEtape('exercice')

        // Préparer première question (l'audio sera lancé par useEffect)
        if (questionsMelangees.length > 0) {
            const question = questionsMelangees[0]
            setMotActuel(question.mot)
            setGroupeActuel({
                ...question.groupe,
                motsDuGroupe: question.motsDuGroupe
            })
        }
    }

    // ==================== PASSAGE QUESTION SUIVANTE ====================
    function passerQuestionSuivante() {
        setFeedback(null)

        const nextIndex = indexQuestion + 1

        // Vérifier si on a fini
        if (nextIndex >= tousLesMots.length) {
            setEtape('resultats')
            return
        }

        // Préparer la question suivante (l'audio sera lancé par useEffect)
        const question = tousLesMots[nextIndex]

        if (question && question.mot && question.motsDuGroupe) {
            setMotActuel(question.mot)
            setGroupeActuel({
                ...question.groupe,
                motsDuGroupe: question.motsDuGroupe
            })
            setIndexQuestion(nextIndex)
        }
    }

    // ==================== VÉRIFICATION RÉPONSE ====================
    function verifierReponseOuEstCe(motClique) {
        const correct = motClique.toLowerCase() === motActuel.toLowerCase()
        const newScore = {
            bonnes: score.bonnes + (correct ? 1 : 0),
            total: score.total + 1
        }
        setScore(newScore)

        // Tracker résultats
        if (correct) {
            setResultats(prev => ({
                ...prev,
                reussis: [...prev.reussis, motActuel]
            }))
            setFeedback({ type: 'success', motClique: motClique })
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, motActuel]
            }))
            setFeedback({ type: 'error', motClique: motClique })
        }

        // Passage automatique : si mobile OU si bonne réponse
        // Sur desktop avec erreur : attendre clic sur bouton "Suivant"
        if (isMobile || correct) {
            setTimeout(() => {
                passerQuestionSuivante()
            }, 1500)
        }
        // Si desktop + erreur : pas de setTimeout, on attend le bouton
    }

    // ==================== LECTURE QUESTION "OÙ EST [MOT]" ====================
    function lireQuestionOuEstCe(mot) {
        // Normaliser le mot pour vérifier les enregistrements
        const motNormalise = mot
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // Si enregistrement perso → jouer UNIQUEMENT le mot
        if (enregistrementsMap[motNormalise]) {
            console.log(`🎵 Enregistrement perso trouvé → lecture directe du mot "${mot}"`)
            lireTTS(mot)
        } else {
            // Sinon → "Où est" + pause + mot
            console.log(`📢 Pas d'enregistrement perso → "Où est" + mot "${mot}"`)
            lireTTS('Où est')
            setTimeout(() => {
                lireTTS(mot)
            }, 200) // Pause de 200ms entre "Où est" et le mot
        }
    }

    // ==================== LECTURE ENREGISTREMENT PERSONNEL ====================
    async function playEnregistrement(mot, onEnded = null) {
        // Normaliser le texte pour la recherche
        const motNormalise = mot
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        const enregistrement = enregistrementsMap[motNormalise]
        if (!enregistrement || !enregistrement.audio_url) {
            console.log(`❌ Pas d'enregistrement valide pour "${motNormalise}"`)
            return false
        }

        try {
            console.log(`🎵 Lecture enregistrement personnel pour "${motNormalise}"`)
            const audio = new Audio(enregistrement.audio_url)

            audio.onended = () => {
                if (onEnded) onEnded()
            }

            audio.onerror = () => {
                console.error(`❌ Erreur lecture enregistrement pour "${motNormalise}"`)
            }

            await audio.play()
            return true
        } catch (error) {
            console.error(`❌ Erreur playback enregistrement pour "${motNormalise}":`, error)
            return false
        }
    }

    // ==================== CASCADE AUDIO TTS ====================
    async function lireTTS(texte, onEnded = null) {
        // Normaliser le texte pour la recherche dans les enregistrements
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        console.log(`🔍 Recherche "${motNormalise}" dans`, Object.keys(enregistrementsMap).length, 'enregistrements')

        // PRIORITÉ 1 : VOIX PERSONNALISÉE (enregistrement de l'apprenant)
        if (enregistrementsMap[motNormalise]) {
            const success = await playEnregistrement(texte, onEnded)
            if (success) return
        }

        // PRIORITÉ 2 : ELEVENLABS API
        console.log(`⏭️ Pas d'enregistrement pour "${motNormalise}", tentative ElevenLabs`)
        return await lireTTSElevenLabs(texte, onEnded)
    }

    async function lireTTSElevenLabs(texte, onEnded = null) {
        // Vérifier si on a des tokens AVANT d'appeler l'API
        if (elevenLabsTokens <= 0) {
            console.warn('⚠️ Aucun token ElevenLabs disponible, fallback vers Web Speech API')
            return lireTTSFallback(texte, onEnded)
        }

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

                // Mettre à jour les tokens restants
                if (data.remaining !== undefined) {
                    setElevenLabsTokens(data.remaining)
                    console.log(`📊 Tokens restants: ${data.remaining}`)
                }

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
                const errorData = await response.json()

                if (response.status === 429 || errorData.error === 'QUOTA_EXCEEDED') {
                    console.warn('⚠️ Quota ElevenLabs dépassé, fallback vers Web Speech API')
                    setElevenLabsTokens(0)
                } else {
                    console.error('❌ Erreur ElevenLabs:', response.status, errorData)
                }

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

            // Sélectionner une voix française SAUF Hortense
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

    // ==================== SON APPLAUDISSEMENT ====================
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

    // ==================== MÉLANGE FISHER-YATES ====================
    function melangerTableau(array) {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    // ==================== STYLES ====================
    const styles = {
        container: {
            minHeight: '100vh',
            padding: isMobile ? '12px' : '20px',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '12px' : '20px'
        },
        header: {
            width: '100%',
            maxWidth: '1200px',
            padding: isMobile ? '12px' : '24px'
        },
        title: {
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 'bold',
            color: '#06B6D4',
            margin: 0,
            textAlign: 'center'
        },
        subtitle: {
            fontSize: isMobile ? '14px' : '18px',
            color: '#64748b',
            marginTop: '8px',
            textAlign: 'center'
        },
        feedbackBox: {
            width: '100%',
            maxWidth: '1200px',
            padding: isMobile ? '12px' : '16px',
            borderRadius: '12px',
            fontSize: isMobile ? '16px' : '20px',
            fontWeight: 'bold',
            textAlign: 'center'
        },
        feedbackSuccess: {
            backgroundColor: '#dcfce7',
            color: '#166534',
            border: '2px solid #22c55e'
        },
        feedbackError: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '2px solid #ef4444'
        },
        questionBox: {
            width: '100%',
            maxWidth: '1200px',
            padding: '24px',
            textAlign: 'center'
        },
        consigne: {
            fontSize: '20px',
            color: '#06B6D4',
            marginBottom: '16px',
            backgroundColor: '#dbeafe',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #06B6D4',
            fontWeight: 'bold',
            display: 'inline-block',
            minWidth: isMobile ? 'auto' : '400px'
        },
        ecouterButton: {
            padding: '12px 24px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.1s'
        },
        motsGrid: {
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? '8px' : '12px',
            justifyContent: 'center',
            padding: isMobile ? '12px' : '20px'
        },
        motButton: {
            padding: '12px 24px',
            backgroundColor: 'white',
            border: '3px solid #06B6D4',
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#06B6D4',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '120px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        actions: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '1200px'
        },
        primaryButton: {
            padding: '12px 24px',
            backgroundColor: '#06B6D4',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.1s'
        },
        secondaryButton: {
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#1e293b',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.1s'
        },
        resultatsBox: {
            width: '100%',
            maxWidth: '1200px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: isMobile ? '12px' : '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        resultatsSection: {
            marginBottom: '24px'
        },
        resultatsSectionTitle: {
            fontSize: isMobile ? '18px' : '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#1e293b'
        },
        motsListeReussis: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
        },
        motReussi: {
            padding: '8px 16px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold'
        },
        motsListeRates: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
        },
        motRate: {
            padding: '8px 16px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold'
        }
    }

    // ==================== CHARGEMENT ====================
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>⏳ Chargement...</h1>
                </div>
            </div>
        )
    }

    // ==================== EXERCICE ACTIF ====================
    if (etape === 'exercice' && motActuel && groupeActuel) {
        const motsAfficher = groupeActuel.motsDuGroupe || groupeActuel.contenu.trim().split(/\s+/).filter(mot => !/^[.,:;!?]+$/.test(mot))
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            <h1 style={{ ...styles.title, fontSize: '20px', margin: 0 }}>📍 Où est-ce ?</h1>
                            <p style={{ ...styles.subtitle, margin: 0, fontSize: '14px' }}>
                                Question {indexQuestion + 1} / {tousLesMots.length} • Score : {score.bonnes}/{score.total}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=1`)}
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
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #06B6D4',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Sélection des textes"
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
                                    onClick={() => lireQuestionOuEstCe(motActuel)}
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
                                    title="Écouter"
                                >
                                    🔊
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📍 Où est-ce ?</h1>
                                    <p style={styles.subtitle}>
                                        Question {indexQuestion + 1} / {tousLesMots.length} • Score : {score.bonnes}/{score.total}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=1`)}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots`)}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                        border: '2px solid #06B6D4',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Sélection des textes"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => router.push('/lire')}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                        border: '2px solid #10b981',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
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
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={() => lireQuestionOuEstCe(motActuel)}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'white',
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Écouter"
                                >
                                    🔊
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.questionBox}>
                    <p style={styles.consigne}>🔊 Écoute et clique sur le bon mot</p>
                </div>

                <div
                    ref={motsGridOuEstRef}
                    style={{
                        ...styles.motsGrid,
                        ...(isMobile ? {
                            gap: '8px',
                            padding: '8px'
                        } : {})
                    }}
                >
                    {motsAfficher.map((mot, index) => (
                        <button
                            key={index}
                            onClick={() => verifierReponseOuEstCe(mot)}
                            disabled={feedback !== null}
                            style={{
                                ...styles.motButton,
                                ...(isMobile ? {
                                    fontSize: `${taillePoliceOuEst}px`,
                                    padding: `${taillePoliceOuEst * 0.5}px ${taillePoliceOuEst * 0.8}px`,
                                    minWidth: 'auto',
                                    flexShrink: 1
                                } : {}),
                                // Cadre vert gras pour le bon mot
                                ...(feedback && mot.toLowerCase() === motActuel.toLowerCase() ? {
                                    border: '4px solid #22c55e',
                                    boxShadow: '0 0 0 2px #22c55e'
                                } : {}),
                                // Cadre rouge gras pour le mauvais choix
                                ...(feedback && feedback.type === 'error' && mot.toLowerCase() === feedback.motClique.toLowerCase() ? {
                                    border: '4px solid #ef4444',
                                    boxShadow: '0 0 0 2px #ef4444'
                                } : {})
                            }}
                            onMouseEnter={(e) => !feedback && (e.target.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => !feedback && (e.target.style.transform = 'scale(1)')}
                        >
                            {mot}
                        </button>
                    ))}
                </div>

                {/* Bouton Suivant (desktop uniquement, erreur uniquement) */}
                {!isMobile && feedback && feedback.type === 'error' && (
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '24px'
                    }}>
                        <button
                            onClick={passerQuestionSuivante}
                            style={{
                                padding: '16px 48px',
                                backgroundColor: 'white',
                                color: '#06B6D4',
                                border: '3px solid #06B6D4',
                                borderRadius: '12px',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            Suivant →
                        </button>
                    </div>
                )}

            </div>
        )
    }

    // ==================== PAGE RÉSULTATS ====================
    if (etape === 'resultats') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {isMobile ? (
                        <div style={{ width: '100%' }}>
                            <h1 style={{
                                ...styles.title,
                                fontSize: '20px',
                                marginBottom: '12px',
                                textAlign: 'center'
                            }}>
                                📊 Résultats
                            </h1>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                                <div style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
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
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📊 Résultats</h1>
                                </div>
                                <div style={{
                                    padding: '8px 20px',
                                    backgroundColor: 'transparent',
                                    fontSize: '32px',
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
                                    marginBottom: '8px'
                                } : {})
                            }}>
                                ✅ Mots réussis ({resultats.reussis.length})
                            </h2>
                            <div style={styles.motsListeReussis}>
                                {resultats.reussis.map((mot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => lireQuestionOuEstCe(mot)}
                                        style={{
                                            ...styles.motReussi,
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s',
                                            border: 'none'
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        title="🔊 Écouter"
                                    >
                                        {mot}
                                    </button>
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
                                    marginBottom: '8px'
                                } : {})
                            }}>
                                ❌ Mots ratés ({resultats.rates.length})
                            </h2>
                            <div style={styles.motsListeRates}>
                                {resultats.rates.map((mot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => lireQuestionOuEstCe(mot)}
                                        style={{
                                            ...styles.motRate,
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s',
                                            border: 'none'
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        title="🔊 Écouter"
                                    >
                                        {mot}
                                    </button>
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

    return null
}
