import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

export default function DecoupageExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // États de l'exercice
    const [textes, setTextes] = useState([])
    const [groupesSens, setGroupesSens] = useState([])
    const [groupeActuel, setGroupeActuel] = useState(null)
    const [indexGroupe, setIndexGroupe] = useState(0)
    const [score, setScore] = useState({ bonnes: 0, total: 0 })
    const [feedback, setFeedback] = useState(null)
    const [resultats, setResultats] = useState({ reussis: [], rates: [] })
    const [etape, setEtape] = useState('chargement') // chargement | exercice | resultats

    // Découpage spécifique
    const [separations, setSeparations] = useState([])
    const [decoupageValidation, setDecoupageValidation] = useState(null)
    const [taillePoliceDecoupage, setTaillePoliceDecoupage] = useState(32)

    // Enregistrements vocaux
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Mots individuels
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({}) // Groupes de sens

    // Mobile et plein écran
    const [isMobile, setIsMobile] = useState(false)
    const [pleinEcran, setPleinEcran] = useState(false)

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // Détection mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Vérification authentification
    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
        } catch (error) {
            router.push('/login')
            return
        }

        setLoading(false)
    }, [router])

    // Charger les données au démarrage
    useEffect(() => {
        if (user && router.query.texte_ids) {
            chargerDonnees()
        }
    }, [user, router.query.texte_ids])

    // Confettis sur la page de résultats si score parfait
    useEffect(() => {
        if (etape === 'resultats' && score.total > 0 && score.bonnes === score.total) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
        }
    }, [etape])

    // Sortie du plein écran
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            )
            setPleinEcran(isCurrentlyFullscreen)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
        }
    }, [])

    async function chargerDonnees() {
        try {
            const token = localStorage.getItem('token')
            const texteIds = router.query.texte_ids.split(',')

            // Charger les groupes de sens
            const { data: groupes, error: errGroupes } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', texteIds)
                .order('texte_reference_id', { ascending: true })
                .order('ordre_groupe', { ascending: true })

            if (errGroupes) throw errGroupes

            // Filtrer les groupes vides
            const groupesFiltres = (groupes || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0 && contenuNettoyé !== '.'
            })

            setGroupesSens(groupesFiltres)

            // Charger les enregistrements de mots via API
            const motResponse = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds.join(',')}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (motResponse.ok) {
                const motData = await motResponse.json()
                const motMap = {}
                motData.enregistrements?.forEach(enr => {
                    const motNormalise = enr.mot
                        .toLowerCase().trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    motMap[motNormalise] = enr
                })
                setEnregistrementsMap(motMap)
                console.log(`🎤 ${Object.keys(motMap).length} enregistrement(s) vocal(aux) chargé(s)`)
            }

            // Charger les enregistrements de groupes via API
            const groupeResponse = await fetch(`/api/enregistrements-groupes/list?texte_ids=${texteIds.join(',')}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (groupeResponse.ok) {
                const groupeData = await groupeResponse.json()
                const groupeMap = {}
                groupeData.enregistrements?.forEach(enr => {
                    groupeMap[enr.groupe_sens_id] = enr
                })
                setEnregistrementsGroupesMap(groupeMap)
                console.log(`📼 ${Object.keys(groupeMap).length} enregistrement(s) de groupe(s) chargé(s)`)
            }

            // Démarrer l'exercice automatiquement
            if (groupesFiltres.length > 0) {
                setTimeout(() => demarrerDecoupage(groupesFiltres), 100)
            }

        } catch (err) {
            console.error('Erreur chargement:', err)
            setError('Erreur de chargement des données')
        }
    }

    async function demarrerDecoupage(groupes = null) {
        const groupesAUtiliser = groupes || groupesSens
        if (groupesAUtiliser.length === 0) return

        // Sur mobile, forcer plein écran + orientation paysage
        if (isMobile) {
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

        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setEtape('exercice')
        setIndexGroupe(0)
        preparerDecoupage(0, groupesAUtiliser)
    }

    function preparerDecoupage(index, groupes = null) {
        const groupesAUtiliser = groupes || groupesSens

        if (index >= groupesAUtiliser.length) {
            setEtape('resultats')
            return
        }

        const groupe = groupesAUtiliser[index]
        // Filtrer les mots vides
        const motsValides = groupe.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        // Ne préparer que si on a des mots valides
        if (motsValides.length > 0) {
            setGroupeActuel(groupe)
            setSeparations([])
            setDecoupageValidation(null)
        }
    }

    function toggleSeparation(position) {
        if (separations.includes(position)) {
            setSeparations(separations.filter(p => p !== position))
        } else {
            setSeparations([...separations, position].sort((a, b) => a - b))
        }
    }

    function verifierDecoupage() {
        if (!groupeActuel) return

        const texteColle = groupeActuel.contenu.replace(/\s+/g, '')
        // Filtrer les mots vides
        const motsAttendus = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        // Calculer les positions attendues
        const positionsAttendues = []
        let pos = 0
        for (let i = 0; i < motsAttendus.length - 1; i++) {
            pos += motsAttendus[i].length
            positionsAttendues.push(pos)
        }

        // Vérifier si les séparations correspondent
        const correct =
            separations.length === positionsAttendues.length &&
            separations.every((p, i) => p === positionsAttendues[i])

        const newScore = {
            bonnes: score.bonnes + (correct ? 1 : 0),
            total: score.total + 1
        }
        setScore(newScore)

        // Sauvegarder la validation
        setDecoupageValidation({
            correct,
            positionsAttendues,
            motsAttendus
        })

        // Mettre à jour les résultats
        if (correct) {
            setResultats(prev => ({
                ...prev,
                reussis: [...prev.reussis, groupeActuel.contenu]
            }))
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, groupeActuel.contenu]
            }))
        }

        // Si correct, passage automatique après 4 sec
        if (correct) {
            setFeedback({ type: 'success', message: '✅ Parfait !' })
            setTimeout(() => {
                setFeedback(null)
                setDecoupageValidation(null)
                setSeparations([])
                const nextIndex = indexGroupe + 1
                setIndexGroupe(nextIndex)
                preparerDecoupage(nextIndex)
            }, 4000)
        }
        // Si incorrect, on attend que l'utilisateur clique sur "Suivant"
    }

    function phraseSuivanteDecoupage() {
        setFeedback(null)
        setDecoupageValidation(null)
        setSeparations([])
        const nextIndex = indexGroupe + 1
        setIndexGroupe(nextIndex)
        preparerDecoupage(nextIndex)
    }

    // ===== FONCTIONS AUDIO =====

    async function lireTTS(texte, onEnded = null) {
        const token = localStorage.getItem('token')
        const motNormalise = texte
            .toLowerCase().trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // PRIORITÉ 1 : Voix personnalisée
        if (enregistrementsMap[motNormalise]) {
            const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
            if (onEnded) audio.addEventListener('ended', onEnded)
            await audio.play()
            return audio
        }

        // PRIORITÉ 2 : ElevenLabs
        return await lireTTSElevenLabs(texte, onEnded)
    }

    async function lireTTSElevenLabs(texte, onEnded) {
        const token = localStorage.getItem('token')
        try {
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
                const audio = new Audio(data.audio)
                if (onEnded) audio.addEventListener('ended', onEnded)
                await audio.play()
                return audio
            }
        } catch (err) {
            console.error('Erreur ElevenLabs:', err)
        }

        // PRIORITÉ 3 : Fallback Web Speech
        return lireTTSFallback(texte, onEnded)
    }

    function lireTTSFallback(texte, onEnded) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6
            if (onEnded) utterance.onend = onEnded
            window.speechSynthesis.speak(utterance)
        }
    }

    async function lireGroupeDeSens() {
        if (!groupeActuel) return

        // Priorité : enregistrement du groupe complet
        if (enregistrementsGroupesMap[groupeActuel.id]) {
            const audio = new Audio(enregistrementsGroupesMap[groupeActuel.id].audio_url)
            await audio.play()
        } else {
            // Fallback : lire mot par mot
            lireGroupeMotParMot()
        }
    }

    function lireGroupeMotParMot() {
        if (!groupeActuel) return

        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && !/^[.,:;!?]+$/.test(mot))

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) return
            lireTTS(mots[index++], lireMotSuivant)
        }

        lireMotSuivant()
    }

    // ===== FONCTIONS PLEIN ÉCRAN =====

    async function togglePleinEcran() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const elem = document.documentElement
            if (elem.requestFullscreen) {
                await elem.requestFullscreen()
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen()
            }
            setPleinEcran(true)
        } else {
            await quitterPleinEcran()
        }
    }

    async function quitterPleinEcran() {
        if (document.exitFullscreen) {
            await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen()
        }

        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock()
            } catch (e) {
                console.log('Orientation unlock non supporté:', e)
            }
        }

        setPleinEcran(false)
    }

    // ===== STYLES =====

    const styles = {
        container: {
            minHeight: '100vh',
            backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: isMobile ? '16px' : '32px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        header: {
            marginBottom: '32px'
        },
        title: {
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 'bold',
            color: '#06B6D4',
            marginBottom: '8px',
            textAlign: 'center'
        },
        subtitle: {
            fontSize: isMobile ? '16px' : '18px',
            color: '#64748b',
            textAlign: 'center'
        },
        consigne: {
            fontSize: '20px',
            fontWeight: '600',
            color: '#06B6D4',
            textAlign: 'center',
            backgroundColor: '#dbeafe',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #06B6D4',
            width: 'fit-content',
            margin: '0 auto 24px auto'
        },
        lettre: {
            display: 'inline-block',
            fontWeight: 'bold',
            color: '#000',
            fontSize: '32px'
        },
        separationButton: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '12px',
            height: '50px',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '0',
            margin: '0 2px',
            transition: 'all 0.2s',
            verticalAlign: 'middle'
        },
        separationButtonActive: {
            minWidth: '30px',
            margin: '0 8px',
            backgroundColor: 'rgba(6, 182, 212, 0.1)'
        },
        separationBarre: {
            fontSize: '40px',
            fontWeight: 'bold',
            color: '#06b6d4',
            display: 'inline-block',
            lineHeight: '1'
        },
        feedbackBox: {
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '600',
            width: 'fit-content',
            margin: '0 auto 24px auto'
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
        actions: {
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginTop: '24px'
        },
        primaryButton: {
            padding: '16px 32px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
        },
        secondaryButton: {
            padding: '16px 32px',
            backgroundColor: 'white',
            color: '#64748b',
            border: '2px solid #64748b',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        resultatsBox: {
            backgroundColor: 'transparent',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '800px',
            margin: '0 auto'
        },
        motReussi: {
            color: '#10b981',
            fontSize: '18px',
            marginBottom: '8px',
            textAlign: 'center'
        },
        motRate: {
            color: '#ef4444',
            fontSize: '18px',
            marginBottom: '8px',
            textAlign: 'center'
        }
    }

    // ===== RENDU =====

    if (loading || etape === 'chargement') {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <p style={{ fontSize: '20px', color: '#64748b' }}>Chargement...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', padding: '24px', borderRadius: '12px' }}>
                    <p style={{ fontSize: '20px', color: '#991b1b' }}>❌ {error}</p>
                    <button onClick={() => router.push('/lire')} style={styles.primaryButton}>
                        Retour
                    </button>
                </div>
            </div>
        )
    }

    // PAGE RÉSULTATS
    if (etape === 'resultats') {
        return (
            <div style={styles.container}>
                {showConfetti && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @keyframes confettiFall {
                                    0% {
                                        transform: translateY(-50px) rotate(0deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translateY(100vh) rotate(360deg);
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
                                const emojis = ['🎉', '🎊', '✨', '🌟', '⭐']
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                                const randomLeft = Math.random() * 100
                                const randomDuration = 2 + Math.random() * 2
                                const randomDelay = Math.random() * 0.5

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${randomLeft}%`,
                                            top: '-50px',
                                            fontSize: '40px',
                                            animation: `confettiFall ${randomDuration}s linear ${randomDelay}s forwards`
                                        }}
                                    >
                                        {randomEmoji}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <div style={styles.header}>
                    <h1 style={styles.title}>✂️ Découpage - Résultats</h1>
                    {!isMobile && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                            <button
                                onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                style={{ ...styles.secondaryButton, padding: '8px 12px', fontSize: '20px' }}
                            >
                                ←
                            </button>
                            <button
                                onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                style={{ ...styles.secondaryButton, padding: '8px 12px', fontSize: '20px', border: '2px solid #06B6D4' }}
                            >
                                👁️
                            </button>
                            <button
                                onClick={() => router.push('/lire')}
                                style={{ ...styles.secondaryButton, padding: '8px 12px', fontSize: '20px' }}
                            >
                                📖
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                style={{ ...styles.secondaryButton, padding: '8px 12px', fontSize: '20px' }}
                            >
                                🏠
                            </button>
                            <button
                                onClick={() => {
                                    setScore({ bonnes: 0, total: 0 })
                                    setResultats({ reussis: [], rates: [] })
                                    demarrerDecoupage()
                                }}
                                style={{ ...styles.secondaryButton, padding: '8px 12px', fontSize: '20px', border: '2px solid #06B6D4' }}
                            >
                                🔄
                            </button>
                        </div>
                    )}
                </div>

                <div style={styles.resultatsBox}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '32px'
                    }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '16px 32px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px'
                        }}>
                            <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#06B6D4', margin: 0 }}>
                                {score.bonnes}/{score.total}
                            </h2>
                        </div>
                    </div>

                    {resultats.reussis.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px', color: '#10b981', marginBottom: '12px', textAlign: 'center' }}>
                                Phrases réussies ({resultats.reussis.length})
                            </h3>
                            {resultats.reussis.map((phrase, index) => (
                                <p key={index} style={styles.motReussi}>• {phrase}</p>
                            ))}
                        </div>
                    )}

                    {resultats.rates.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px', color: '#ef4444', marginBottom: '12px', textAlign: 'center' }}>
                                Phrases à revoir ({resultats.rates.length})
                            </h3>
                            {resultats.rates.map((phrase, index) => (
                                <p key={index} style={styles.motRate}>• {phrase}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // EXERCICE ACTIF
    if (etape === 'exercice' && groupeActuel) {
        const texteColle = groupeActuel.contenu.replace(/\s+/g, '')

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {!isMobile ? (
                        <div style={{ width: '100%' }}>
                            <h1 style={styles.title}>✂️ Découpage</h1>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #64748b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #06B6D4',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
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
                                        fontSize: '20px'
                                    }}
                                >
                                    📖
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={lireGroupeDeSens}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                >
                                    🔊
                                </button>
                            </div>
                            <p style={styles.subtitle}>
                                Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={styles.title}>✂️ Découpage</h1>
                                <p style={styles.subtitle}>
                                    Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        quitterPleinEcran()
                                        router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #64748b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                    title="Menu exercices"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => {
                                        quitterPleinEcran()
                                        router.push('/lire/reconnaitre-les-mots')
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #06B6D4',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                    title="Sélection des textes"
                                >
                                    👁️
                                </button>
                                <button
                                    onClick={() => {
                                        quitterPleinEcran()
                                        router.push('/lire')
                                    }}
                                    style={{
                                        padding: '8px 12px',
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
                                    onClick={() => {
                                        quitterPleinEcran()
                                        router.push('/dashboard')
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
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
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                    title="Écouter"
                                >
                                    🔊
                                </button>
                                <button
                                    onClick={togglePleinEcran}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #ef4444',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px'
                                    }}
                                    title="Plein écran On/Off"
                                >
                                    ⛶
                                </button>
                                {!decoupageValidation ? (
                                    <button
                                        onClick={verifierDecoupage}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'white',
                                            color: '#06B6D4',
                                            border: '3px solid #06B6D4',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            fontWeight: 'bold'
                                        }}
                                        title="Vérifier"
                                    >
                                        Vérifier
                                    </button>
                                ) : (
                                    !decoupageValidation.correct && (
                                        <button
                                            onClick={phraseSuivanteDecoupage}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: 'white',
                                                color: '#06B6D4',
                                                border: '3px solid #06B6D4',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold'
                                            }}
                                            title="Suivant"
                                        >
                                            Suivant ➡️
                                        </button>
                                    )
                                )}
                            </div>
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

                {!isMobile && !feedback && (
                    <p style={styles.consigne}>Clique entre les lettres pour séparer les mots</p>
                )}

                <div style={{
                    padding: isMobile ? '24px 0' : '48px',
                    textAlign: 'center',
                    fontSize: '32px',
                    marginBottom: '32px'
                }}>
                    {(() => {
                        const lettres = texteColle.split('')

                        // Si aucune séparation : affichage simple
                        if (separations.length === 0) {
                            // Si validation incorrecte : encadrer tout en rouge
                            if (decoupageValidation && !decoupageValidation.correct) {
                                return (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '6px',
                                        padding: isMobile ? '4px 1px' : '4px 4px',
                                        border: '3px solid #ef4444'
                                    }}>
                                        {lettres.map((lettre, index) => (
                                            <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                <span style={{
                                                    ...styles.lettre,
                                                    ...(isMobile ? { fontSize: `${taillePoliceDecoupage}px` } : {})
                                                }}>{lettre}</span>
                                                {index < lettres.length - 1 && (
                                                    <button
                                                        onClick={() => toggleSeparation(index + 1)}
                                                        style={{
                                                            ...styles.separationButton,
                                                            cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ctext y=\'20\' font-size=\'20\'%3E✂️%3C/text%3E%3C/svg%3E") 12 12, crosshair'
                                                        }}
                                                        title="Cliquer pour couper"
                                                    />
                                                )}
                                            </span>
                                        ))}
                                    </span>
                                )
                            }

                            // Sinon affichage normal sans bordure
                            return lettres.map((lettre, index) => (
                                <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span style={{
                                        ...styles.lettre,
                                        ...(isMobile ? { fontSize: `${taillePoliceDecoupage}px` } : {})
                                    }}>{lettre}</span>
                                    {index < lettres.length - 1 && (
                                        <button
                                            onClick={() => toggleSeparation(index + 1)}
                                            style={{
                                                ...styles.separationButton,
                                                cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ctext y=\'20\' font-size=\'20\'%3E✂️%3C/text%3E%3C/svg%3E") 12 12, crosshair'
                                            }}
                                            title="Cliquer pour couper"
                                        />
                                    )}
                                </span>
                            ))
                        }

                        // Si des séparations : créer des groupes
                        const separationsSorted = [0, ...separations, lettres.length].sort((a, b) => a - b)
                        const groupes = []

                        for (let i = 0; i < separationsSorted.length - 1; i++) {
                            const debut = separationsSorted[i]
                            const fin = separationsSorted[i + 1]
                            if (debut !== fin) {
                                groupes.push({ debut, fin, lettres: lettres.slice(debut, fin) })
                            }
                        }

                        return groupes.map((groupe, groupeIndex) => {
                            // Déterminer la couleur du groupe selon la validation
                            let groupeStyle = {
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '6px',
                                padding: isMobile ? '4px 1px' : '4px 4px',
                                gap: '0px'
                            }

                            // Si validation en cours et incorrecte, colorer selon si le groupe est bien/mal découpé
                            if (decoupageValidation && !decoupageValidation.correct) {
                                const { positionsAttendues } = decoupageValidation
                                const positionsAttenduesTotales = [0, ...positionsAttendues, lettres.length]

                                // Vérifier si ce groupe correspond à un mot attendu
                                let estCorrect = false
                                for (let i = 0; i < positionsAttenduesTotales.length - 1; i++) {
                                    if (groupe.debut === positionsAttenduesTotales[i] && groupe.fin === positionsAttenduesTotales[i + 1]) {
                                        estCorrect = true
                                        break
                                    }
                                }

                                // Appliquer bordure verte ou rouge
                                if (estCorrect) {
                                    groupeStyle.border = '3px solid #10b981' // Vert
                                } else {
                                    groupeStyle.border = '3px solid #ef4444' // Rouge
                                }
                            }

                            return (
                                <span key={groupeIndex} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span style={groupeStyle}>
                                        {groupe.lettres.map((lettre, indexDansGroupe) => {
                                            const indexGlobal = groupe.debut + indexDansGroupe
                                            return (
                                                <span key={indexGlobal} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    <span style={{
                                                        ...styles.lettre,
                                                        ...(isMobile ? { fontSize: `${taillePoliceDecoupage}px` } : {}),
                                                        margin: 0,
                                                        padding: 0
                                                    }}>{lettre}</span>
                                                    {indexDansGroupe < groupe.lettres.length - 1 && (
                                                        <button
                                                            onClick={() => toggleSeparation(indexGlobal + 1)}
                                                            style={{
                                                                ...styles.separationButton,
                                                                cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ctext y=\'20\' font-size=\'20\'%3E✂️%3C/text%3E%3C/svg%3E") 12 12, crosshair',
                                                                minWidth: isMobile ? '8px' : '12px',
                                                                width: isMobile ? '8px' : '12px'
                                                            }}
                                                            title="Cliquer pour couper"
                                                        />
                                                    )}
                                                </span>
                                            )
                                        })}
                                    </span>
                                    {groupeIndex < groupes.length - 1 && (
                                        <button
                                            onClick={() => toggleSeparation(groupe.fin)}
                                            style={{
                                                ...styles.separationButton,
                                                ...styles.separationButtonActive,
                                                cursor: 'pointer',
                                                minWidth: isMobile ? '16px' : '20px'
                                            }}
                                            title="Cliquer pour annuler la séparation"
                                        >
                                            <span style={styles.separationBarre}>|</span>
                                        </button>
                                    )}
                                </span>
                            )
                        })
                    })()}
                </div>

                {/* Afficher la bonne segmentation si réponse incorrecte */}
                {decoupageValidation && !decoupageValidation.correct && (
                    <div style={{
                        padding: '20px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '3px solid #10b981',
                        width: 'fit-content',
                        margin: '20px auto'
                    }}>
                        <div style={{
                            fontSize: isMobile ? '20px' : '24px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            lineHeight: '1.6'
                        }}>
                            {decoupageValidation.motsAttendus.map((mot, index) => (
                                <span key={index}>
                                    <span style={{ color: '#000' }}>{mot}</span>
                                    {index < decoupageValidation.motsAttendus.length - 1 && (
                                        <span style={{
                                            color: '#06B6D4',
                                            margin: '0 8px',
                                            fontSize: '28px'
                                        }}> | </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {!isMobile && (
                    <div style={styles.actions}>
                        {!decoupageValidation ? (
                            <>
                                <button
                                    onClick={verifierDecoupage}
                                    style={{
                                        padding: '16px 32px',
                                        backgroundColor: 'white',
                                        color: '#06B6D4',
                                        border: '3px solid #06B6D4',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Vérifier
                                </button>
                                <button
                                    onClick={() => setSeparations([])}
                                    style={styles.secondaryButton}
                                >
                                    Effacer
                                </button>
                            </>
                        ) : (
                            !decoupageValidation.correct && (
                                <button
                                    onClick={phraseSuivanteDecoupage}
                                    style={{
                                        padding: '16px 32px',
                                        backgroundColor: 'white',
                                        color: '#06B6D4',
                                        border: '3px solid #06B6D4',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Suivant ➡️
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        )
    }

    return null
}
