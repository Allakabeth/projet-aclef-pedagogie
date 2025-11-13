import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

/**
 * EXERCICE : Karaoké
 *
 * Deuxième exercice du module "Reconnaitre les mots"
 * Chaque mot s'illumine quand il est prononcé de manière synchronisée.
 *
 * Fonctionnalités :
 * - Lecture synchronisée mot par mot
 * - Illumination du mot en cours de lecture
 * - Navigation par groupe de sens
 * - Gestion mobile et desktop
 */
export default function KaraokeExercicePage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Étapes : exercice | termine
    const [etape, setEtape] = useState('exercice')

    // Sélection du texte
    const [textes, setTextes] = useState([])
    const [texteSelectionne, setTexteSelectionne] = useState(null)

    // Données de l'exercice
    const [groupesSens, setGroupesSens] = useState([])
    const [indexGroupe, setIndexGroupe] = useState(0)
    const [groupeActuel, setGroupeActuel] = useState(null)

    // Enregistrements
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({})

    // Karaoké
    const [motIllumineIndex, setMotIllumineIndex] = useState(-1)
    const [showFinMessage, setShowFinMessage] = useState(false)

    // Détection mobile/desktop
    const [isMobile, setIsMobile] = useState(false)

    // Taille de phrase contexte (mobile)
    const [taillePhraseContexte, setTaillePhraseContexte] = useState(14)
    const phraseContexteRef = useRef(null)
    const karaokeContainerRef = useRef(null)

    // ========================================================================
    // 1. AUTHENTIFICATION
    // ========================================================================

    useEffect(() => {
        checkAuth()
    }, [router])

    // Détection de la taille de l'écran
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Calcul automatique de la taille de la phrase contexte (mobile)
    useEffect(() => {
        if (isMobile && phraseContexteRef.current && groupeActuel) {
            const phraseElement = phraseContexteRef.current
            const maxWidth = window.innerWidth - 32 // Padding de sécurité

            let tailleTrouvee = 14
            const tailles = [20, 18, 16, 14, 12, 10, 9, 8]

            for (let taille of tailles) {
                phraseElement.style.fontSize = `${taille}px`
                if (phraseElement.scrollWidth <= maxWidth) {
                    tailleTrouvee = taille
                    break
                }
            }

            setTaillePhraseContexte(tailleTrouvee)
        }
    }, [isMobile, groupeActuel])

    // Détection automatique des textes présélectionnés
    useEffect(() => {
        console.log('🔍 Debug auto-start Karaoké:', {
            isReady: router.isReady,
            texte_ids: router.query.texte_ids,
            hasUser: !!user,
            textesCount: textes.length,
            hasGroupes: groupesSens.length > 0
        })

        if (router.isReady && router.query.texte_ids && user && textes.length > 0 && groupesSens.length === 0) {
            const ids = router.query.texte_ids.split(',').map(id => parseInt(id))
            console.log('✅ Toutes les conditions remplies, IDs parsés:', ids)
            if (ids.length >= 1) {
                // Démarrer avec le premier texte
                console.log('🎯 Démarrage automatique avec texte ID:', ids[0])
                demarrerExercice(ids[0])
            }
        }
    }, [router.isReady, router.query.texte_ids, user, textes, groupesSens])

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
            await loadEnregistrements()
            await loadEnregistrementsGroupes()
        } catch (err) {
            console.error('Erreur authentification:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    // ========================================================================
    // 2. CHARGEMENT DES DONNÉES
    // ========================================================================

    async function loadTextes(apprenantId) {
        try {
            const { data, error: err } = await supabase
                .from('textes_references')
                .select('id, titre, nombre_groupes, created_at')
                .eq('apprenant_id', apprenantId)
                .order('created_at', { ascending: false })

            if (err) throw err
            setTextes(data || [])
        } catch (err) {
            console.error('Erreur chargement textes:', err)
            setError('Impossible de charger vos textes')
        }
    }

    async function loadEnregistrements() {
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
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
        }
    }

    async function loadEnregistrementsGroupes() {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-groupes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                console.log(`🎤 ${data.count} enregistrement(s) de groupe(s) chargé(s)`)
                setEnregistrementsGroupesMap(data.enregistrementsMap || {})
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements groupes:', error)
        }
    }

    async function demarrerExercice(texteId) {
        if (!texteId) return

        try {
            setLoading(true)
            setError(null)

            // Charger les groupes de sens du texte
            const { data, error: err } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .eq('texte_reference_id', texteId)
                .order('ordre_groupe', { ascending: true })

            if (err) throw err

            // Filtrer les groupes vides
            const groupes = (data || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0
            })

            setGroupesSens(groupes)
            setTexteSelectionne(texteId)
            setIndexGroupe(0)

            if (groupes.length > 0) {
                chargerGroupe(0, groupes)
            }

            setEtape('exercice')
        } catch (err) {
            console.error('Erreur chargement groupes:', err)
            setError('Impossible de charger le texte')
        } finally {
            setLoading(false)
        }
    }

    function chargerGroupe(index, groupes = groupesSens) {
        if (index < 0 || index >= groupes.length) return

        const groupe = groupes[index]
        setGroupeActuel(groupe)
        setIndexGroupe(index)
        setMotIllumineIndex(-1)
    }

    // ========================================================================
    // 3. LECTURE AUDIO
    // ========================================================================

    async function lireTTS(texte, onEnded = null) {
        // Normaliser le texte pour la recherche
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

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

        // PRIORITÉ 1: Enregistrement du groupe complet
        if (enregistrementsGroupesMap[groupeActuel.id]) {
            console.log(`✅ Enregistrement de groupe trouvé pour groupe ${groupeActuel.id}`)
            const audio = new Audio(enregistrementsGroupesMap[groupeActuel.id].audio_url)
            audio.play().catch(err => {
                console.error('❌ Erreur lecture groupe:', err)
                lireGroupeMotParMot()
            })
        } else {
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

            const onEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300)
            }

            lireTTS(mots[index], onEnded)
        }

        lireMotSuivant()
    }

    // ========================================================================
    // 4. FONCTIONS KARAOKÉ
    // ========================================================================

    function jouerKaraoke() {
        if (!groupeActuel) return

        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) {
                setMotIllumineIndex(-1)
                return
            }

            setMotIllumineIndex(index)

            const onAudioEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300)
            }

            lireTTS(mots[index], onAudioEnded)
        }

        lireMotSuivant()
    }

    function groupePrecedentKaraoke() {
        if (indexGroupe > 0) {
            const prevIndex = indexGroupe - 1
            setIndexGroupe(prevIndex)
            chargerGroupe(prevIndex)
        }
    }

    function groupeSuivantKaraoke() {
        const nextIndex = indexGroupe + 1

        if (nextIndex >= groupesSens.length) {
            // Dernier groupe → Message de fin
            setShowFinMessage(true)
            setTimeout(() => {
                setShowFinMessage(false)
                router.push('/lire/reconnaitre-les-mots/exercices2?textes=' + texteSelectionne)
            }, 3000)
        } else {
            setIndexGroupe(nextIndex)
            chargerGroupe(nextIndex)
        }
    }

    // ========================================================================
    // 5. RENDER
    // ========================================================================

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>Chargement...</div>
            </div>
        )
    }

    // Exercice Karaoké
    if (etape === 'exercice' && groupeActuel) {
        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        return (
            <div style={styles.container}>
                {/* Message de fin - Overlay */}
                {showFinMessage && (
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
                        zIndex: 1000
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: isMobile ? '24px' : '48px',
                            borderRadius: '16px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            textAlign: 'center',
                            maxWidth: isMobile ? '90%' : '500px'
                        }}>
                            <div style={{
                                fontSize: isMobile ? '32px' : '48px',
                                marginBottom: '16px'
                            }}>🎉</div>
                            <h2 style={{
                                fontSize: isMobile ? '18px' : '24px',
                                fontWeight: 'bold',
                                color: '#333',
                                margin: '0 0 8px 0'
                            }}>
                                Tous les groupes ont été lus !
                            </h2>
                            <p style={{
                                fontSize: isMobile ? '14px' : '16px',
                                color: '#666',
                                margin: 0
                            }}>
                                Retour au menu dans 3 secondes...
                            </p>
                        </div>
                    </div>
                )}

                {/* En-tête */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f093fb', margin: 0, textAlign: 'center' }}>
                        🎤 Karaoké
                    </h1>

                    {isMobile ? (
                        <>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={groupePrecedentKaraoke}
                                    disabled={indexGroupe === 0}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: indexGroupe === 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '20px',
                                        opacity: indexGroupe === 0 ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots/exercices2?textes=' + texteSelectionne)}
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
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={lireGroupeDeSens}
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
                                >
                                    🔊
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#666', textAlign: 'center' }}>
                                Groupe {indexGroupe + 1} / {groupesSens.length}
                            </p>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={groupePrecedentKaraoke}
                                    disabled={indexGroupe === 0}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: indexGroupe === 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '20px',
                                        opacity: indexGroupe === 0 ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => router.push('/lire/reconnaitre-les-mots/exercices2?textes=' + texteSelectionne)}
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
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={lireGroupeDeSens}
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
                                >
                                    🔊
                                </button>
                                <button
                                    onClick={groupeSuivantKaraoke}
                                    disabled={indexGroupe >= groupesSens.length - 1}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #6b7280',
                                        borderRadius: '8px',
                                        cursor: indexGroupe >= groupesSens.length - 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '20px',
                                        opacity: indexGroupe >= groupesSens.length - 1 ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    →
                                </button>
                            </div>
                            <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: '#666' }}>
                                Groupe {indexGroupe + 1} / {groupesSens.length}
                            </p>
                        </>
                    )}
                </div>

                {/* Zone Karaoké */}
                <div
                    ref={karaokeContainerRef}
                    style={isMobile ? styles.karaokeBoxMobile : styles.karaokeBox}
                >
                    {isMobile ? (
                        <>
                            {/* Mot principal illuminé en très grand */}
                            {motIllumineIndex >= 0 && (
                                <div style={styles.motPrincipalMobile}>
                                    {mots[motIllumineIndex]}
                                </div>
                            )}

                            {/* Phrase complète en petit pour contexte */}
                            <div
                                ref={phraseContexteRef}
                                style={{
                                    ...styles.phraseContexteMobile,
                                    fontSize: `${taillePhraseContexte}px`
                                }}
                            >
                                {mots.map((mot, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            ...styles.motContexteMobile,
                                            ...(motIllumineIndex === index ? {
                                                fontWeight: 'bold',
                                                color: '#000',
                                                backgroundColor: '#fef08a',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            } : {})
                                        }}
                                    >
                                        {mot}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* DESKTOP : Affichage normal */
                        mots.map((mot, index) => (
                            <span
                                key={index}
                                style={{
                                    ...styles.motKaraoke,
                                    ...(motIllumineIndex === index ? styles.motIllumine : {})
                                }}
                            >
                                {mot}
                            </span>
                        ))
                    )}
                </div>

                {/* Boutons */}
                {isMobile ? (
                    <div style={{ ...styles.actions, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                        <button onClick={jouerKaraoke} style={styles.primaryButton}>
                            ▶️ Jouer
                        </button>
                        <button onClick={groupeSuivantKaraoke} style={styles.secondaryButton}>
                            Groupe suivant →
                        </button>
                    </div>
                ) : (
                    <div style={{ ...styles.actions, justifyContent: 'center' }}>
                        <button onClick={jouerKaraoke} style={styles.primaryButton}>
                            ▶️ Jouer
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return null
}

// ========================================================================
// 6. STYLES
// ========================================================================

const styles = {
    container: {
        minHeight: '100vh',
        background: '#ffffff',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    loadingBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '8px'
    },
    karaokeBox: {
        padding: '60px 40px',
        marginBottom: '24px',
        textAlign: 'center',
        minHeight: '300px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'center',
        alignItems: 'center'
    },
    karaokeBoxMobile: {
        padding: '24px 16px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        minHeight: '250px'
    },
    motKaraoke: {
        fontSize: '48px',
        fontWeight: '500',
        color: '#333',
        padding: '8px 16px',
        transition: 'all 0.3s ease',
        lineHeight: '1.4'
    },
    motIllumine: {
        fontSize: '56px',
        fontWeight: 'bold',
        color: '#78350f',
        background: '#fef08a',
        border: '2px solid #78350f',
        borderRadius: '12px',
        padding: '12px 24px',
        transform: 'scale(1.1)'
    },
    motPrincipalMobile: {
        fontSize: '64px',
        fontWeight: 'bold',
        color: '#78350f',
        background: '#fef08a',
        border: '2px solid #78350f',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        width: '100%',
        wordBreak: 'break-word'
    },
    phraseContexteMobile: {
        color: '#666',
        lineHeight: '1.6',
        textAlign: 'center',
        width: '100%',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        marginTop: '12px'
    },
    motContexteMobile: {
        display: 'inline',
        marginRight: '4px'
    },
    actions: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginTop: '24px'
    },
    primaryButton: {
        padding: '16px 32px',
        background: '#fef08a',
        color: '#78350f',
        border: '2px solid #78350f',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    secondaryButton: {
        padding: '16px 32px',
        backgroundColor: 'white',
        color: '#f093fb',
        border: '2px solid #f093fb',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    }
}
