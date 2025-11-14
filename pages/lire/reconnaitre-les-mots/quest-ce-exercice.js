import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

export default function QuestCeExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // États de l'exercice
    const [groupesSens, setGroupesSens] = useState([])
    const [groupeActuel, setGroupeActuel] = useState(null)
    const [motActuel, setMotActuel] = useState(null)
    const [indexQuestion, setIndexQuestion] = useState(0)
    const [score, setScore] = useState({ bonnes: 0, total: 0 })
    const [feedback, setFeedback] = useState(null)
    const [resultats, setResultats] = useState({ reussis: [], rates: [] })
    const [etape, setEtape] = useState('chargement') // chargement | exercice | resultats

    // Qu'est-ce ? spécifique
    const [sonSelectionne, setSonSelectionne] = useState(null)
    const [sonsDesordre, setSonsDesordre] = useState([])
    const [listeMotsQuestCe, setListeMotsQuestCe] = useState([])
    const [reponseValidee, setReponseValidee] = useState(null)

    // Enregistrements vocaux
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Mots individuels
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({}) // Groupes de sens

    // Mobile
    const [isMobile, setIsMobile] = useState(false)
    const [taillePoliceQuestCe, setTaillePoliceQuestCe] = useState(20)
    const phraseRefQuestCe = useRef(null)

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

            // Charger les enregistrements de mots
            const motResponse = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (motResponse.ok) {
                const motData = await motResponse.json()
                const mapMots = {}
                motData.enregistrements?.forEach(enreg => {
                    const motNorm = enreg.mot
                        .toLowerCase()
                        .trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    mapMots[motNorm] = enreg
                })
                setEnregistrementsMap(mapMots)
                console.log(`🎤 ${Object.keys(mapMots).length} enregistrement(s) vocal(aux) chargé(s)`)
            }

            // Charger les enregistrements de groupes
            const groupeResponse = await fetch(`/api/enregistrements-groupes/list?texte_ids=${texteIds.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (groupeResponse.ok) {
                const groupeData = await groupeResponse.json()
                const mapGroupes = {}
                groupeData.enregistrements?.forEach(enreg => {
                    mapGroupes[enreg.groupe_sens_id] = enreg
                })
                setEnregistrementsGroupesMap(mapGroupes)
                console.log(`📼 ${Object.keys(mapGroupes).length} enregistrement(s) de groupe(s) chargé(s)`)
            }

            // Démarrer l'exercice
            demarrerQuestCe(groupesFiltres)

        } catch (error) {
            console.error('Erreur chargement données:', error)
            setError(error.message)
        }
    }

    function demarrerQuestCe(groupes = groupesSens) {
        if (groupes.length === 0) return

        // Créer une liste de tous les mots de tous les groupes
        const tousLesMots = []
        groupes.forEach(groupe => {
            const mots = groupe.contenu
                .trim()
                .split(/\s+/)
                .filter(mot => mot && mot.trim().length > 0)
                .filter(mot => !/^[.,:;!?]+$/.test(mot))

            mots.forEach(mot => {
                tousLesMots.push({
                    mot: mot,
                    groupe: groupe,
                    tousMotsGroupe: mots
                })
            })
        })

        // Mélanger tous les mots (Fisher-Yates)
        const motsAleaoires = melangerTableau(tousLesMots)

        setListeMotsQuestCe(motsAleaoires)
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })
        setSonSelectionne(null)
        setIndexQuestion(0)
        setEtape('exercice')
        preparerQuestionQuestCe(0, motsAleaoires)
    }

    function preparerQuestionQuestCe(index, listeMots = listeMotsQuestCe) {
        if (index >= listeMots.length) {
            setEtape('resultats')
            return
        }

        const item = listeMots[index]
        const motAleatoire = item.mot
        const groupe = item.groupe
        const mots = item.tousMotsGroupe

        // Mélanger l'ordre des sons (Fisher-Yates)
        const sonsMelanges = melangerTableau(mots)

        setGroupeActuel(groupe)
        setMotActuel(motAleatoire)
        setSonsDesordre(sonsMelanges)
        setSonSelectionne(null)
        setReponseValidee(null)
    }

    function verifierReponseQuestCe(motChoisi) {
        if (!motChoisi) return

        const correct = motChoisi === motActuel
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
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, motActuel]
            }))
        }

        // Enregistrer la validation pour afficher les bordures
        setReponseValidee({ correct, motChoisi })

        // Passage automatique sur mobile si réponse correcte
        if (isMobile && correct) {
            setTimeout(() => {
                questionSuivanteQuestCe()
            }, 2000)
        }
    }

    function questionSuivanteQuestCe() {
        setReponseValidee(null)
        setSonSelectionne(null)
        const nextIndex = indexQuestion + 1
        setIndexQuestion(nextIndex)
        preparerQuestionQuestCe(nextIndex)
    }

    // ==================== FONCTIONS AUDIO ====================
    async function lireTTS(texte, onEnded = null) {
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        console.log(`🔍 Recherche "${motNormalise}" dans`, Object.keys(enregistrementsMap).length, 'enregistrements')

        // PRIORITÉ 1 : VOIX PERSONNALISÉE
        if (enregistrementsMap[motNormalise]) {
            console.log(`🎵 Lecture enregistrement personnel pour "${motNormalise}"`)
            const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
            if (onEnded) audio.addEventListener('ended', onEnded)
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
                if (onEnded) audio.addEventListener('ended', onEnded)
                audio.play().catch(err => {
                    console.error('❌ Erreur lecture ElevenLabs:', err)
                    lireTTSFallback(texte, onEnded)
                })
                return audio
            } else {
                const errorData = await response.json()
                if (response.status === 429 || errorData.error === 'QUOTA_EXCEEDED') {
                    console.warn('⚠️ Quota ElevenLabs dépassé, fallback vers Web Speech API')
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

            const frenchVoices = voices.filter(v =>
                v.lang.startsWith('fr') &&
                !v.name.toLowerCase().includes('hortense')
            )

            if (frenchVoices.length > 0) {
                utterance.voice = frenchVoices[0]
            }

            if (onEnded) utterance.onend = onEnded

            window.speechSynthesis.speak(utterance)
        } else {
            console.error('❌ Web Speech API non disponible')
        }
    }

    async function lireGroupeDeSens() {
        if (!groupeActuel) return

        // PRIORITÉ 1: Enregistrement du groupe complet
        if (enregistrementsGroupesMap[groupeActuel.id]) {
            console.log(`✅ Enregistrement de groupe trouvé pour groupe ${groupeActuel.id}`)
            const audio = new Audio(enregistrementsGroupesMap[groupeActuel.id].audio_url)
            audio.play().catch(err => {
                console.error('❌ Erreur lecture groupe:', err)
                console.log(`⏭️ Fallback: lecture mot par mot`)
                lireGroupeMotParMot()
            })
        } else {
            console.log(`⏭️ Pas d'enregistrement de groupe pour ${groupeActuel.id}, lecture mot par mot`)
            lireGroupeMotParMot()
        }
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
            const mot = mots[index]
            index++
            lireTTS(mot, lireMotSuivant)
        }

        lireMotSuivant()
    }

    // ==================== UTILITAIRES ====================
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
            backgroundColor: '#e0f2fe',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #06B6D4',
            fontWeight: 'bold',
            minWidth: '400px',
            textAlign: 'center'
        },
        phraseBox: {
            marginTop: '16px',
            marginBottom: '24px',
            fontSize: '24px',
            fontWeight: '600',
            lineHeight: '1.4',
            color: '#06B6D4'
        },
        motIllumine: {
            backgroundColor: '#fef08a',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold'
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
        audioButton: {
            padding: '12px 24px',
            backgroundColor: 'white',
            border: '3px solid #06B6D4',
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1e293b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '120px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        audioButtonSelected: {
            backgroundColor: '#dbeafe',
            transform: 'scale(1.05)'
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
            backgroundColor: 'white',
            color: '#06B6D4',
            border: '3px solid #06B6D4',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
        resultatsSectionTitle: {
            fontSize: isMobile ? '18px' : '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#1e293b',
            textAlign: 'center'
        },
        motReussi: {
            padding: '8px 16px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold'
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
    if (loading || etape === 'chargement') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>⏳ Chargement...</h1>
                </div>
            </div>
        )
    }

    // ==================== ERREUR ====================
    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>❌ Erreur</h1>
                    <p style={styles.subtitle}>{error}</p>
                </div>
            </div>
        )
    }

    // ==================== RESULTATS ====================
    if (etape === 'resultats') {
        const pourcentage = Math.round((score.bonnes / score.total) * 100)

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🎉 Exercice terminé !</h1>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                border: '2px solid #6b7280',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/lire')}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                border: '2px solid #0ea5e9',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px'
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
                                fontSize: '18px'
                            }}
                        >
                            🏠
                        </button>
                        <button
                            onClick={() => demarrerQuestCe(groupesSens)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                border: '2px solid #06B6D4',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px'
                            }}
                            title="Recommencer"
                        >
                            🔄
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                        <div style={{
                            padding: '20px',
                            backgroundColor: 'white',
                            border: '3px solid #06B6D4',
                            borderRadius: '12px'
                        }}>
                            <p style={{
                                fontSize: '36px',
                                fontWeight: 'bold',
                                color: '#06B6D4',
                                margin: 0
                            }}>
                                Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: '1200px', padding: isMobile ? '12px' : '24px' }}>
                    {resultats.reussis.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={styles.resultatsSectionTitle}>
                                ✅ Mots réussis ({resultats.reussis.length})
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {resultats.reussis.map((mot, index) => (
                                    <div key={index} style={styles.motReussi}>{mot}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {resultats.rates.length > 0 && (
                        <div>
                            <h2 style={styles.resultatsSectionTitle}>
                                ❌ Mots à revoir ({resultats.rates.length})
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {resultats.rates.map((mot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => lireTTS(mot)}
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

                {/* Confettis de célébration sur score parfait */}
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

    // ==================== EXERCICE ACTIF ====================
    if (etape === 'exercice' && groupeActuel && motActuel) {
        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    {isMobile ? (
                        <div style={{ width: '100%' }}>
                            <h1 style={{ ...styles.title, fontSize: '20px', marginBottom: '8px', textAlign: 'center' }}>
                                🔊 Qu'est-ce ?
                            </h1>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginBottom: '12px', color: '#64748b' }}>
                                <span>Question {indexQuestion + 1} / {listeMotsQuestCe.length}</span>
                                <span>Score : {score.bonnes}/{score.total}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #64748b',
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
                                        border: '2px solid #06B6D4',
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
                                        border: '2px solid #0ea5e9',
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
                                        border: '2px solid #8b5cf6',
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
                                        border: '2px solid #f59e0b',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Écouter le groupe"
                                >
                                    🔊
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ width: '100%' }}>
                            <h1 style={styles.title}>🔊 Qu'est-ce ?</h1>
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
                                    title="Menu exercices"
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
                                        fontSize: '18px'
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
                                        border: '2px solid #0ea5e9',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '18px'
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
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '18px'
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
                                    title="Écouter le groupe"
                                >
                                    🔊
                                </button>
                            </div>
                            <p style={styles.subtitle}>
                                Question {indexQuestion + 1} / {listeMotsQuestCe.length} • Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                    )}
                </div>

                {isMobile ? (
                    <div
                        ref={phraseRefQuestCe}
                        style={{
                            marginTop: '16px',
                            marginBottom: '24px',
                            width: '100%',
                            textAlign: 'center',
                            fontSize: `${taillePoliceQuestCe}px`,
                            fontWeight: '600',
                            lineHeight: '1.4',
                            whiteSpace: 'normal',
                            padding: '0 16px',
                            color: '#06B6D4'
                        }}
                    >
                        {mots.map((mot, index) => (
                            <span
                                key={index}
                                style={{
                                    marginRight: index < mots.length - 1 ? '0.3em' : '0',
                                    ...(mot === motActuel ? {
                                        backgroundColor: '#fef08a',
                                        padding: '4px 8px',
                                        borderRadius: '6px'
                                    } : {})
                                }}
                            >
                                {mot}
                            </span>
                        ))}
                    </div>
                ) : (
                    <>
                        <p style={styles.consigne}>🔊 Écoute les sons et choisis le bon</p>
                        <div style={styles.questionBox}>
                            <div style={styles.phraseBox}>
                                {mots.map((mot, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            display: 'inline-block',
                                            marginRight: '24px',
                                            ...(mot === motActuel ? styles.motIllumine : {})
                                        }}
                                    >
                                        {mot}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <div style={{
                    ...styles.motsGrid,
                    ...(isMobile ? {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '16px'
                    } : {})
                }}>
                    {sonsDesordre.map((mot, index) => {
                        let borderStyle = {}
                        let isClickable = true

                        if (reponseValidee) {
                            if (mot === motActuel) {
                                borderStyle = { border: '3px solid #10b981' }
                                isClickable = true
                            } else if (mot === reponseValidee.motChoisi && !reponseValidee.correct) {
                                borderStyle = { border: '3px solid #ef4444' }
                                isClickable = true
                            } else {
                                isClickable = false
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    setSonSelectionne(mot)
                                    lireTTS(mot)
                                }}
                                disabled={reponseValidee !== null && !isClickable}
                                style={{
                                    ...styles.audioButton,
                                    ...(isMobile ? {
                                        padding: '16px',
                                        fontSize: '18px'
                                    } : {}),
                                    ...(sonSelectionne === mot && !reponseValidee ? styles.audioButtonSelected : {}),
                                    ...(reponseValidee && !isClickable ? { opacity: 0.3, cursor: 'not-allowed' } : {}),
                                    ...borderStyle
                                }}
                            >
                                🔊 <span style={{ color: '#06B6D4' }}>{index + 1}</span>
                            </button>
                        )
                    })}
                </div>

                <div style={styles.actions}>
                    {!reponseValidee ? (
                        <button
                            onClick={() => verifierReponseQuestCe(sonSelectionne)}
                            disabled={!sonSelectionne}
                            style={{
                                ...styles.primaryButton,
                                ...(!sonSelectionne ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            Valider
                        </button>
                    ) : (
                        // Afficher le bouton Suivant uniquement si :
                        // - Desktop OU
                        // - Mobile avec réponse incorrecte
                        (!isMobile || !reponseValidee.correct) && (
                            <button
                                onClick={questionSuivanteQuestCe}
                                style={styles.primaryButton}
                            >
                                Suivant ➡️
                            </button>
                        )
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
