import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'
import VoiceRecorder from '@/components/VoiceRecorder'

/**
 * EXERCICE : Ma voix, mes mots
 *
 * Premier exercice du module "Reconnaitre les mots"
 * L'apprenant enregistre sa voix pour chaque mot unique de ses textes.
 * Ces enregistrements seront utilisés dans tous les autres exercices.
 *
 * Fonctionnalités :
 * - Détection automatique des mots déjà enregistrés (pas de doublons)
 * - Navigation par groupe de sens
 * - Barre de progression globale
 * - Réécoute et réenregistrement possible
 */
export default function MaVoixMesMotsPage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Étapes : selection | exercice | termine
    const [etape, setEtape] = useState('selection')

    // Sélection du texte
    const [textes, setTextes] = useState([])
    const [texteSelectionne, setTexteSelectionne] = useState(null)

    // Données de l'exercice
    const [groupesSens, setGroupesSens] = useState([])
    const [indexGroupe, setIndexGroupe] = useState(0)
    const [groupeActuel, setGroupeActuel] = useState(null)

    // Enregistrements
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // { mot: { audio_url, ... } }
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({}) // { groupe_id: { audio_url, ... } }
    const [motEnCours, setMotEnCours] = useState(null) // Mot en cours d'enregistrement
    const [showRecorder, setShowRecorder] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Progression
    const [statsProgression, setStatsProgression] = useState({ enregistres: 0, total: 0 })

    // Navigation mobile : affichage d'un mot à la fois
    const [indexMotActuel, setIndexMotActuel] = useState(0)

    // Détection mobile/desktop
    const [isMobile, setIsMobile] = useState(false)

    // Taille de police dynamique pour le texte (mobile)
    const [taillePoliceTexte, setTaillePoliceTexte] = useState(16)

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

    // Calcul automatique de la taille de police pour le texte (mobile)
    useEffect(() => {
        if (isMobile && groupeActuel && etape === 'exercice') {
            const texte = groupeActuel.contenu

            if (!texte || texte.trim().length === 0) return

            // Créer un élément temporaire pour mesurer
            const tempDiv = document.createElement('div')
            tempDiv.style.position = 'absolute'
            tempDiv.style.visibility = 'hidden'
            tempDiv.style.whiteSpace = 'nowrap'
            tempDiv.style.fontWeight = 'normal'
            tempDiv.innerHTML = texte
            document.body.appendChild(tempDiv)

            const maxWidth = window.innerWidth - 100 // Marge de sécurité pour éviter débordement
            let tailleTrouvee = 16
            const tailles = [100, 90, 80, 72, 64, 56, 52, 48, 44, 40, 36, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12]

            for (let taille of tailles) {
                tempDiv.style.fontSize = `${taille}px`
                if (tempDiv.offsetWidth <= maxWidth) {
                    tailleTrouvee = taille
                    break
                }
            }

            document.body.removeChild(tempDiv)
            setTaillePoliceTexte(tailleTrouvee)
        }
    }, [isMobile, groupeActuel, etape, indexMotActuel])

    // Détection automatique des textes présélectionnés
    useEffect(() => {
        console.log('🔍 Debug auto-start:', {
            isReady: router.isReady,
            texte_ids: router.query.texte_ids,
            hasUser: !!user,
            textesCount: textes.length,
            etape: etape
        })

        if (router.isReady && router.query.texte_ids && user && textes.length > 0 && etape === 'selection') {
            const ids = router.query.texte_ids.split(',').map(id => parseInt(id))
            console.log('✅ Toutes les conditions remplies, IDs parsés:', ids)
            if (ids.length === 1) {
                // Un seul texte → démarrer automatiquement
                console.log('🎯 Démarrage automatique avec texte ID:', ids[0])
                demarrerExercice(ids[0])
            } else if (ids.length > 1) {
                console.log('⚠️ Plusieurs textes détectés, pas de démarrage auto')
            }
        }
    }, [router.isReady, router.query.texte_ids, user, textes, etape])

    // Recalculer automatiquement la progression quand enregistrementsMap change
    useEffect(() => {
        if (groupesSens.length > 0) {
            calculerProgression()
        }
    }, [enregistrementsMap, groupesSens])

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

    // ========================================================================
    // FONCTIONS DE LECTURE AUDIO AVEC CASCADE
    // ========================================================================

    async function lireTTS(texte, onEnded = null) {
        // Normaliser le texte pour la recherche
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')  // Ponctuation au début
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')  // Ponctuation à la fin

        console.log(`🔍 Recherche "${motNormalise}" dans`, Object.keys(enregistrementsMap).length, 'enregistrements')

        // PRIORITÉ 1 : VOIX PERSONNALISÉE (enregistrement de l'apprenant)
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
                const errorData = await response.json()
                if (response.status === 429 || errorData.error === 'QUOTA_EXCEEDED') {
                    console.warn('⚠️ Quota ElevenLabs dépassé, fallback vers Web Speech API')
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
            // FALLBACK: Lire mot par mot avec cascade audio
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

            const onEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300)
            }

            lireTTS(mots[index], onEnded)
        }

        lireMotSuivant()
    }

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
            } else {
                console.error('Erreur chargement enregistrements')
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
                console.log('📋 Groupes enregistrés:', Object.keys(data.enregistrementsMap || {}))
                setEnregistrementsGroupesMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements groupes')
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

            // Filtrer les groupes vides ou avec seulement des espaces/sauts de ligne
            const groupes = (data || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0
            })

            setGroupesSens(groupes)
            setTexteSelectionne(texteId)
            setIndexGroupe(0)

            if (groupes.length > 0) {
                preparerGroupe(0, groupes)
            }

            // Calculer progression globale
            calculerProgression(groupes)

            setEtape('exercice')
        } catch (err) {
            console.error('Erreur chargement groupes:', err)
            setError('Impossible de charger le texte')
        } finally {
            setLoading(false)
        }
    }

    function preparerGroupe(index, groupes = groupesSens) {
        if (index < 0 || index >= groupes.length) return

        const groupe = groupes[index]
        setGroupeActuel(groupe)
        setIndexGroupe(index)
    }

    function calculerProgression(groupes = groupesSens) {
        // Extraire tous les mots uniques de tous les groupes
        const motsUniques = new Set()

        groupes.forEach(groupe => {
            const mots = extraireMots(groupe.contenu)
            mots.forEach(mot => motsUniques.add(mot.toLowerCase().trim()))
        })

        const total = motsUniques.size
        let enregistres = 0

        motsUniques.forEach(mot => {
            if (enregistrementsMap[mot]) {
                enregistres++
            }
        })

        setStatsProgression({ enregistres, total })
    }

    // ========================================================================
    // 3. UTILITAIRES
    // ========================================================================

    function extraireMots(contenu) {
        return contenu
            .replace(/[\r\n]+/g, ' ') // Remplacer tous les sauts de ligne par des espaces
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,;!?:()"""']+$/.test(mot)) // Exclure ponctuation seule
            .map(mot => {
                // Nettoyer seulement la ponctuation en début/fin (garder les apostrophes internes)
                let clean = mot
                    .replace(/^[.,!?;:()"""]+/, '') // Ponctuation au début
                    .replace(/[.,!?;:()"""]+$/, '') // Ponctuation à la fin

                // Garder le mot COMPLET avec l'apostrophe (C'est, J'ai, L'école, etc.)
                return clean.toLowerCase().trim()
            })
            .filter(mot => mot.length > 0)
    }

    function getMotsUniquesDuGroupe() {
        if (!groupeActuel) return []

        const mots = extraireMots(groupeActuel.contenu)
        const motsUniques = [...new Set(mots)] // Dédupliquer

        return motsUniques
    }

    // ========================================================================
    // 4. ENREGISTREMENT
    // ========================================================================

    function ouvrirEnregistreur(mot) {
        setMotEnCours(mot.toLowerCase().trim())
        setShowRecorder(true)
    }

    async function handleRecordingComplete(audioBlob) {
        if (!motEnCours) return

        setIsUploading(true)
        setShowRecorder(false)

        try {
            const token = localStorage.getItem('token')
            const formData = new FormData()
            formData.append('audio', audioBlob, `${motEnCours}.webm`)
            formData.append('mot', motEnCours)
            if (texteSelectionne) {
                formData.append('texte_id', texteSelectionne)
            }

            console.log(`📤 Upload enregistrement pour mot: ${motEnCours}`)

            const response = await fetch('/api/enregistrements-mots/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Enregistrement sauvegardé:', data)

                // Recharger les enregistrements puis recalculer
                await loadEnregistrements()
                // La progression sera recalculée automatiquement via useEffect

                alert(`✅ Enregistrement sauvegardé pour "${motEnCours}"`)
            } else {
                const error = await response.json()
                console.error('❌ Erreur upload:', error)
                alert(`❌ Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('💥 Erreur upload:', error)
            alert('❌ Erreur lors de l\'enregistrement')
        } finally {
            setIsUploading(false)
            setMotEnCours(null)
        }
    }

    function rejouerEnregistrement(mot) {
        const motNormalized = mot.toLowerCase().trim()
        const enregistrement = enregistrementsMap[motNormalized]

        if (enregistrement && enregistrement.audio_url) {
            const audio = new Audio(enregistrement.audio_url)
            audio.play()
        }
    }

    // ========================================================================
    // 5. NAVIGATION
    // ========================================================================

    function groupePrecedent() {
        if (indexGroupe > 0) {
            preparerGroupe(indexGroupe - 1)
        }
    }

    function groupeSuivant() {
        if (indexGroupe < groupesSens.length - 1) {
            preparerGroupe(indexGroupe + 1)
        }
    }

    function terminerExercice() {
        setEtape('termine')
    }

    function retourSelection() {
        setEtape('selection')
        setTexteSelectionne(null)
        setGroupesSens([])
        setGroupeActuel(null)
        setIndexGroupe(0)
    }

    // ========================================================================
    // 6. RENDER
    // ========================================================================

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>Chargement...</div>
            </div>
        )
    }

    // ÉTAPE 1 : Sélection du texte
    if (etape === 'selection') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🎤 Ma voix, mes mots</h1>
                    <p style={styles.subtitle}>
                        Enregistre ta voix pour chaque mot de ton texte
                    </p>
                </div>

                {error && (
                    <div style={styles.errorBox}>{error}</div>
                )}

                {textes.length === 0 ? (
                    <div style={styles.emptyBox}>
                        <p>Tu n'as pas encore créé de textes.</p>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
                            style={styles.primaryButton}
                        >
                            Créer mon premier texte
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>📚 Choisis ton texte</h2>
                            <div style={styles.textesGrid}>
                                {textes.map(texte => (
                                    <div
                                        key={texte.id}
                                        style={styles.texteCard}
                                        onClick={() => demarrerExercice(texte.id)}
                                    >
                                        <div style={styles.texteCardTitle}>{texte.titre}</div>
                                        <div style={styles.texteCardInfo}>
                                            {texte.nombre_groupes} groupes de sens
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button
                                onClick={() => router.push('/lire/reconnaitre-les-mots')}
                                style={styles.secondaryButton}
                            >
                                ← Retour au menu
                            </button>
                        </div>
                    </>
                )}
            </div>
        )
    }

    // ÉTAPE 2 : Exercice d'enregistrement
    if (etape === 'exercice' && groupeActuel) {
        const motsUniques = getMotsUniquesDuGroupe()
        const pourcentage = statsProgression.total > 0
            ? Math.round((statsProgression.enregistres / statsProgression.total) * 100)
            : 0

        return (
            <div style={styles.container}>
                {/* En-tête mobile sans cadre */}
                {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '16px' }}>
                        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: 0, textAlign: 'center' }}>
                            🎤 Ma voix, mes mots
                        </h1>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
                            <span>Groupe {indexGroupe + 1}/{groupesSens.length}</span>
                            <span>Mots {statsProgression.enregistres}/{statsProgression.total}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={groupePrecedent}
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
                                title="Groupe précédent"
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
                                onClick={groupeSuivant}
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
                                title="Groupe suivant"
                            >
                                →
                            </button>
                        </div>

                        {/* Groupe de sens avec mot actuel illuminé */}
                        <div style={{
                            marginTop: '12px',
                            fontSize: `${taillePoliceTexte}px`,
                            color: '#666',
                            lineHeight: '1.2',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textAlign: 'left',
                            width: '100%',
                            padding: '0 16px'
                        }}>
                            {groupeActuel?.contenu.split(' ').map((mot, idx) => {
                                const motActuel = motsUniques[indexMotActuel]
                                const isCurrentWord = mot.toLowerCase().replace(/[.,!?;:]/g, '') === motActuel.toLowerCase().replace(/[.,!?;:]/g, '')
                                return (
                                    <span key={idx} style={{
                                        backgroundColor: isCurrentWord ? '#fef3c7' : 'transparent',
                                        color: isCurrentWord ? '#92400e' : '#666',
                                        fontWeight: isCurrentWord ? 'bold' : 'normal',
                                        padding: isCurrentWord ? '2px 4px' : '0',
                                        borderRadius: '4px'
                                    }}>
                                        {mot}{idx < groupeActuel.contenu.split(' ').length - 1 ? ' ' : ''}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                    ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '16px' }}>
                        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: 0, textAlign: 'center' }}>
                            🎤 Ma voix, mes mots
                        </h1>
                        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '14px', color: '#666' }}>
                            <span>Groupe {indexGroupe + 1}/{groupesSens.length}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={groupePrecedent}
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
                                title="Groupe précédent"
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
                                onClick={groupeSuivant}
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
                                title="Groupe suivant"
                            >
                                →
                            </button>
                        </div>

                        {/* Groupe de sens avec mot actuel illuminé + flèches navigation */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                            {/* Flèche gauche - mot précédent */}
                            <button
                                onClick={() => setIndexMotActuel(Math.max(0, indexMotActuel - 1))}
                                disabled={indexMotActuel === 0}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'white',
                                    border: '2px solid #6b7280',
                                    borderRadius: '8px',
                                    cursor: indexMotActuel === 0 ? 'not-allowed' : 'pointer',
                                    fontSize: '32px',
                                    opacity: indexMotActuel === 0 ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Mot précédent"
                            >
                                ←
                            </button>

                            {/* Groupe de sens avec highlighting */}
                            <div style={{
                                fontSize: '48px',
                                color: '#666',
                                lineHeight: '1.2',
                                textAlign: 'center',
                                flex: 1
                            }}>
                                {groupeActuel?.contenu.split(' ').map((mot, idx) => {
                                    const motsUniques = getMotsUniquesDuGroupe()
                                    const motActuel = motsUniques[indexMotActuel] || motsUniques[0]
                                    const isCurrentWord = mot.toLowerCase().replace(/[.,!?;:]/g, '') === motActuel?.toLowerCase().replace(/[.,!?;:]/g, '')
                                    return (
                                        <span key={idx} style={{
                                            color: isCurrentWord ? '#3b82f6' : '#666',
                                            fontWeight: isCurrentWord ? 'bold' : 'normal'
                                        }}>
                                            {mot}{idx < groupeActuel.contenu.split(' ').length - 1 ? ' ' : ''}
                                        </span>
                                    )
                                })}
                            </div>

                            {/* Flèche droite - mot suivant */}
                            <button
                                onClick={() => {
                                    const motsUniques = getMotsUniquesDuGroupe()
                                    setIndexMotActuel(Math.min(motsUniques.length - 1, indexMotActuel + 1))
                                }}
                                disabled={indexMotActuel === getMotsUniquesDuGroupe().length - 1}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'white',
                                    border: '2px solid #6b7280',
                                    borderRadius: '8px',
                                    cursor: indexMotActuel === getMotsUniquesDuGroupe().length - 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '32px',
                                    opacity: indexMotActuel === getMotsUniquesDuGroupe().length - 1 ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Mot suivant"
                            >
                                →
                            </button>
                        </div>
                    </div>
                )}

                {/* Liste des mots à enregistrer */}
                {isMobile ? (
                    <>
                        {/* Navigation mobile */}
                        <div>
                            <div style={styles.mobileNavigation}>
                                <button
                                    onClick={() => setIndexMotActuel(Math.max(0, indexMotActuel - 1))}
                                    disabled={indexMotActuel === 0}
                                    style={{
                                        ...styles.navButton,
                                        opacity: indexMotActuel === 0 ? 0.3 : 1,
                                        cursor: indexMotActuel === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ←
                                </button>
                                <span style={styles.mobileCounter}>
                                    {indexMotActuel + 1} / {motsUniques.length}
                                </span>
                                <button
                                    onClick={() => setIndexMotActuel(Math.min(motsUniques.length - 1, indexMotActuel + 1))}
                                    disabled={indexMotActuel === motsUniques.length - 1}
                                    style={{
                                        ...styles.navButton,
                                        opacity: indexMotActuel === motsUniques.length - 1 ? 0.3 : 1,
                                        cursor: indexMotActuel === motsUniques.length - 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Mot actuel mobile - EN DEHORS du cadre blanc */}
                        {motsUniques.length > 0 && (() => {
                            const mot = motsUniques[indexMotActuel]
                            const motNormalized = mot.toLowerCase().trim()
                            const dejaEnregistre = !!enregistrementsMap[motNormalized]

                            return (
                                <div style={styles.motCardMobile}>
                                    <div style={styles.motTexteMobile}>{mot}</div>

                                    <div style={styles.motActions}>
                                        {/* Bouton Écouter (TTS ordinateur) */}
                                        <button
                                            onClick={() => lireTTS(mot)}
                                            style={styles.buttonMobile}
                                        >
                                            🔊 Écouter
                                        </button>

                                        {dejaEnregistre ? (
                                            <>
                                                <button
                                                    onClick={() => rejouerEnregistrement(mot)}
                                                    style={{ ...styles.buttonMobile, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                                                >
                                                    🎤 Ma voix
                                                </button>
                                                <button
                                                    onClick={() => ouvrirEnregistreur(mot)}
                                                    disabled={isUploading}
                                                    style={{
                                                        ...styles.buttonMobile,
                                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                        opacity: isUploading ? 0.5 : 1,
                                                        cursor: isUploading ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    🎤 Recommencer
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => ouvrirEnregistreur(mot)}
                                                disabled={isUploading}
                                                style={{
                                                    ...styles.buttonMobile,
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                    opacity: isUploading ? 0.5 : 1,
                                                    cursor: isUploading ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                🎤 Enregistrer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })()}
                    </>
                ) : (
                    /* VERSION DESKTOP : Scroll horizontal */
                    <div style={styles.motsSection}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '12px', textAlign: 'center' }}>
                            Enregistre chaque mot ({motsUniques.length} mots) :
                        </h3>
                        <div style={styles.motsGrid}>
                            {motsUniques.map((mot, index) => {
                                const motNormalized = mot.toLowerCase().trim()
                                const dejaEnregistre = !!enregistrementsMap[motNormalized]

                                return (
                                    <div key={index} style={styles.motCard}>
                                        <div style={styles.motTexte}>{mot}</div>

                                        <div style={styles.motActions}>
                                            {/* Bouton Écouter (TTS ordinateur) */}
                                            <button
                                                onClick={() => lireTTS(mot)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    padding: '12px 16px',
                                                    fontSize: '15px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = 'translateY(-2px)'
                                                    e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'translateY(0)'
                                                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                                                }}
                                            >
                                                🔊 Écouter
                                            </button>

                                            {dejaEnregistre ? (
                                                <>
                                                    <button
                                                        onClick={() => rejouerEnregistrement(mot)}
                                                        style={styles.ecouterButton}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.transform = 'translateY(-2px)'
                                                            e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.transform = 'translateY(0)'
                                                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                                                        }}
                                                    >
                                                        🎤 Ma voix
                                                    </button>
                                                    <button
                                                        onClick={() => ouvrirEnregistreur(mot)}
                                                        disabled={isUploading}
                                                        style={{
                                                            ...styles.reEnregistrerButton,
                                                            opacity: isUploading ? 0.5 : 1,
                                                            cursor: isUploading ? 'not-allowed' : 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isUploading) {
                                                                e.target.style.transform = 'translateY(-2px)'
                                                                e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)'
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.transform = 'translateY(0)'
                                                            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'
                                                        }}
                                                    >
                                                        🎤 Recommencer
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => ouvrirEnregistreur(mot)}
                                                    disabled={isUploading}
                                                    style={{
                                                        ...styles.enregistrerButton,
                                                        opacity: isUploading ? 0.5 : 1,
                                                        cursor: isUploading ? 'not-allowed' : 'pointer'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isUploading) {
                                                            e.target.style.transform = 'translateY(-2px)'
                                                            e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.transform = 'translateY(0)'
                                                        e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                    }}
                                                >
                                                    🎤 Enregistrer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Modal d'enregistrement */}
                {showRecorder && motEnCours && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3 style={styles.modalTitle}>
                                🎤 Enregistre le mot : <strong>{motEnCours}</strong>
                            </h3>
                            <VoiceRecorder
                                onRecordingComplete={handleRecordingComplete}
                                maxDuration={5}
                            />
                        </div>
                    </div>
                )}

                {/* Message d'upload */}
                {isUploading && (
                    <div style={styles.uploadingBox}>
                        📤 Upload en cours...
                    </div>
                )}



                
            </div>
        )
    }

    // ÉTAPE 3 : Exercice terminé
    if (etape === 'termine') {
        const pourcentage = statsProgression.total > 0
            ? Math.round((statsProgression.enregistres / statsProgression.total) * 100)
            : 0

        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🎉 Bravo !</h1>
                    <p style={styles.subtitle}>
                        Tu as terminé l'exercice
                    </p>
                </div>

                <div style={styles.resultatsBox}>
                    <div style={styles.scoreCircle}>
                        <span style={styles.scoreNumber}>{statsProgression.enregistres}</span>
                        <span style={styles.scoreSlash}>/</span>
                        <span style={styles.scoreTotal}>{statsProgression.total}</span>
                    </div>
                    <div style={styles.scorePourcentage}>{pourcentage}%</div>
                    <p style={styles.resultatsText}>
                        Tes enregistrements sont maintenant disponibles dans tous les exercices !
                    </p>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={() => router.push('/lire/reconnaitre-les-mots')}
                        style={styles.primaryButton}
                    >
                        ✓ Retour aux exercices
                    </button>
                    <button
                        onClick={retourSelection}
                        style={styles.secondaryButton}
                    >
                        📚 Enregistrer un autre texte
                    </button>
                </div>
            </div>
        )
    }

    return null
}

// ========================================================================
// 7. STYLES
// ========================================================================

const styles = {
    container: {
        minHeight: '100vh',
        background: '#ffffff',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    },
    title: {
        fontSize: 'clamp(28px, 5vw, 40px)',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: 'clamp(14px, 3vw, 18px)',
        color: '#666',
        margin: 0
    },
    loadingBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '8px'
    },
    errorBox: {
        padding: '20px',
        backgroundColor: '#fee',
        color: '#c00',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    emptyBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '12px'
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '16px'
    },
    textesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px'
    },
    texteCard: {
        padding: '20px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: '#fff'
    },
    texteCardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '8px'
    },
    texteCardInfo: {
        fontSize: '14px',
        color: '#666'
    },
    progressionBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
    },
    progressionText: {
        fontSize: 'clamp(14px, 3vw, 18px)',
        fontWeight: '600',
        color: '#333',
        marginBottom: '16px',
        textAlign: 'center'
    },
    progressBarContainer: {
        width: '100%',
        height: '32px',
        backgroundColor: '#e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    progressBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
        transition: 'width 0.3s ease',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
    },
    groupeBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255, 255, 255, 0.3)'
    },
    groupeTitle: {
        fontSize: 'clamp(16px, 3.5vw, 22px)',
        fontWeight: '700',
        color: '#333',
        margin: 0
    },
    groupeContenu: {
        fontSize: 'clamp(18px, 4vw, 24px)',
        lineHeight: '1.8',
        color: '#444',
        fontWeight: '500',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        borderLeft: '4px solid #667eea'
    },
    motsSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '8px 10px',
        marginBottom: '10px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(10px)'
    },
    motsSectionTitle: {
        fontSize: 'clamp(16px, 3.5vw, 22px)',
        fontWeight: '700',
        color: '#333',
        marginBottom: '24px',
        textAlign: 'center'
    },
    motsGrid: {
        display: 'flex',
        flexWrap: 'nowrap',
        gap: '20px',
        paddingBottom: '16px',
        overflowX: 'auto',
        justifyContent: 'center'
    },
    motCard: {
        flex: '1 1 auto',
        minWidth: '200px',
        maxWidth: '300px',
        padding: '20px',
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
        flexShrink: 0
    },
    motTexte: {
        fontSize: 'clamp(22px, 4.5vw, 28px)',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        padding: '12px',
        backgroundColor: '#f0f4ff',
        borderRadius: '12px',
        border: '2px solid #667eea'
    },
    motActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    motStatut: {
        fontSize: '16px',
        color: '#10b981',
        fontWeight: '700',
        textAlign: 'center',
        padding: '4px'
    },
    ecouterButton: {
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    reEnregistrerButton: {
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    enregistrerButton: {
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '17px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    // Styles mobile
    mobileNavigation: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '12px'
    },
    navButton: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        transition: 'all 0.2s'
    },
    mobileCounter: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#667eea',
        textAlign: 'center'
    },
    motCardMobile: {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '2px solid #e5e7eb',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        boxSizing: 'border-box'
    },
    motTexteMobile: {
        fontSize: 'clamp(28px, 7vw, 40px)',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        padding: '12px',
        backgroundColor: '#f0f4ff',
        borderRadius: '12px',
        border: '2px solid #667eea'
    },
    buttonMobile: {
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        transition: 'transform 0.2s'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    modalTitle: {
        fontSize: '20px',
        color: '#333',
        textAlign: 'center',
        margin: 0
    },
    modalCancelButton: {
        padding: '12px 24px',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    uploadingBox: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '16px 24px',
        backgroundColor: '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 999
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        marginTop: '24px'
    },
    primaryButton: {
        padding: '12px 24px',
        backgroundColor: '#f3f4f6',
        color: '#333',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    secondaryButton: {
        padding: '12px 24px',
        backgroundColor: '#f3f4f6',
        color: '#333',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    resultatsBox: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '48px 32px',
        textAlign: 'center',
        marginBottom: '32px'
    },
    scoreCircle: {
        fontSize: '64px',
        fontWeight: 'bold',
        marginBottom: '16px'
    },
    scoreNumber: {
        color: '#10b981'
    },
    scoreSlash: {
        color: '#d1d5db',
        margin: '0 8px'
    },
    scoreTotal: {
        color: '#6b7280'
    },
    scorePourcentage: {
        fontSize: '32px',
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: '16px'
    },
    resultatsText: {
        fontSize: '16px',
        color: '#666',
        lineHeight: '1.5'
    }
}
