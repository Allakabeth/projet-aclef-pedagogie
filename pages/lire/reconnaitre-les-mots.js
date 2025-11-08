import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

/**
 * MODULE : Reconnaitre les mots
 *
 * Étape située AVANT la syllabification où l'apprenant apprend
 * à associer le mot oral au mot écrit.
 *
 * 8 exercices progressifs :
 * 1. Ma voix, mes mots : Enregistrer sa voix pour chaque mot (bibliothèque vocale personnelle)
 * 2. Karaoké : Illumination synchronisée son/écrit
 * 3. Remettre dans l'ordre : Reconstruire la phrase à partir de mots mélangés
 * 4. Où est-ce ? : Audio → Trouver le mot écrit (groupes de sens)
 * 5. Qu'est-ce ? : Mot illuminé → Choisir le bon son (groupes de sens)
 * 6. Découpage : Séparer les mots collés
 * 7. Écoute et trouve : Audio → Trouver le mot écrit (mots isolés, 4-12 choix)
 * 8. Lis et trouve : Mot écrit → Trouver le bon son (mots isolés, 4-8 sons)
 */
export default function ReconnaitreLesMotsPage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Étape 1 : Sélection
    const [etape, setEtape] = useState('selection') // selection | exercices
    const [textes, setTextes] = useState([])
    const [textesSelectionnes, setTextesSelectionnes] = useState([])
    const [groupesSens, setGroupesSens] = useState([])

    // Navigation exercices
    const [exerciceActif, setExerciceActif] = useState(null) // karaoke | ou-est-ce | quest-ce | decoupage | remettre-ordre

    // États exercices
    const [groupeActuel, setGroupeActuel] = useState(null)
    const [indexGroupe, setIndexGroupe] = useState(0)
    const [motActuel, setMotActuel] = useState(null)
    const [score, setScore] = useState({ bonnes: 0, total: 0 })
    const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: '...' }
    const [resultats, setResultats] = useState({ reussis: [], rates: [] }) // Pour page résultats
    const [tousLesMots, setTousLesMots] = useState([]) // Tous les mots de tous les groupes
    const [indexQuestion, setIndexQuestion] = useState(0)

    // Remettre dans l'ordre
    const [motsSelectionnes, setMotsSelectionnes] = useState([])
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [motsValidation, setMotsValidation] = useState([]) // 'correct' | 'incorrect' pour chaque mot
    const [motEnCoursLecture, setMotEnCoursLecture] = useState(-1) // Index du mot en cours de lecture
    const [taillePoliceMots, setTaillePoliceMots] = useState(12) // Taille dynamique pour mobile
    const [taillePoliceQuestCe, setTaillePoliceQuestCe] = useState(20) // Taille dynamique pour "Qu'est-ce ?"
    const phraseRefQuestCe = useRef(null) // Référence pour mesurer la phrase
    const containerRef = useRef(null)
    const audioEnCoursRef = useRef(null) // Audio en cours de lecture
    const interrompreLectureRef = useRef(false) // Flag pour interrompre la lecture

    // Karaoké
    const [motIllumineIndex, setMotIllumineIndex] = useState(-1)

    // Qu'est-ce ?
    const [sonSelectionne, setSonSelectionne] = useState(null)
    const [sonsDesordre, setSonsDesordre] = useState([])
    const [listeMotsQuestCe, setListeMotsQuestCe] = useState([]) // Liste de tous les mots pour "Qu'est-ce ?"

    // Découpage
    const [separations, setSeparations] = useState([])
    const [taillePoliceDecoupage, setTaillePoliceDecoupage] = useState(32)

    // Enregistrements vocaux personnalisés
    const [enregistrementsMap, setEnregistrementsMap] = useState({}) // Mots individuels
    const [enregistrementsGroupesMap, setEnregistrementsGroupesMap] = useState({}) // Groupes de sens

    // Détection mobile
    const [isMobile, setIsMobile] = useState(false)
    
    // Où est - taille dynamique des mots sur mobile
    const [taillePoliceOuEst, setTaillePoliceOuEst] = useState(16)
    const motsGridOuEstRef = useRef(null)

    // Effet de célébration (confettis + son)
    const [showConfetti, setShowConfetti] = useState(false)

    // Message de fin Karaoké
    const [showFinMessage, setShowFinMessage] = useState(false)

    // Référence pour le conteneur karaoké (scroll automatique mobile)
    const karaokeContainerRef = useRef(null)
    const phraseContexteRef = useRef(null)
    const [taillePhraseContexte, setTaillePhraseContexte] = useState(14)

    useEffect(() => {
        const checkMobile = () => {
            // Détecte mobile en portrait (width <= 768) OU en paysage (height <= 768)
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Calcul automatique de la taille de police pour la phrase contextuelle (mobile)
    useEffect(() => {
        if (isMobile && phraseContexteRef.current && groupeActuel && exerciceActif === 'karaoke') {
            const container = phraseContexteRef.current
            const containerWidth = container.offsetWidth

            // Calculer les mots depuis groupeActuel.contenu
            const mots = groupeActuel.contenu
                .trim()
                .split(/\s+/)
                .filter(mot => mot && mot.trim().length > 0)
                .filter(mot => !/^[.,:;!?]+$/.test(mot))

            if (mots.length === 0) return

            // Tester différentes tailles de police pour trouver la plus grande qui tient sur une ligne
            let tailleTrouvee = 14
            const tailles = [80, 72, 64, 56, 52, 48, 44, 40, 36, 32, 28, 24, 20, 18, 16, 14, 12]

            for (let taille of tailles) {
                container.style.fontSize = `${taille}px`
                container.style.whiteSpace = 'nowrap'

                // Vérifier si ça tient
                if (container.scrollWidth <= containerWidth) {
                    tailleTrouvee = taille
                    break
                }
            }

            container.style.whiteSpace = 'normal'
            setTaillePhraseContexte(tailleTrouvee)
        }
    }, [isMobile, groupeActuel, exerciceActif])

    // Calcul automatique de la taille de police pour "Qu'est-ce ?" (mobile)
    useEffect(() => {
        if (isMobile && groupeActuel && exerciceActif === 'quest-ce') {
            const mots = groupeActuel.contenu
                .trim()
                .split(/\s+/)
                .filter(mot => mot && mot.trim().length > 0)
                .filter(mot => !/^[.,:;!?]+$/.test(mot))

            if (mots.length === 0) return

            // Créer un élément temporaire pour mesurer
            const tempDiv = document.createElement('div')
            tempDiv.style.position = 'absolute'
            tempDiv.style.visibility = 'hidden'
            tempDiv.style.whiteSpace = 'nowrap'
            tempDiv.style.fontWeight = '600'
            tempDiv.innerHTML = mots.join(' ')
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
            setTaillePoliceQuestCe(tailleTrouvee)
        }
    }, [isMobile, groupeActuel, exerciceActif, motActuel])

    // Calcul automatique de la taille de police pour "Découpage" (mobile)
    useEffect(() => {
        if (isMobile && groupeActuel && exerciceActif === 'decoupage') {
            const texteColle = groupeActuel.contenu.replace(/\s+/g, '')

            if (!texteColle || texteColle.trim().length === 0) return

            // Créer un élément temporaire pour mesurer
            const tempDiv = document.createElement('div')
            tempDiv.style.position = 'absolute'
            tempDiv.style.visibility = 'hidden'
            tempDiv.style.whiteSpace = 'nowrap'
            tempDiv.style.fontWeight = '600'
            tempDiv.innerHTML = texteColle
            document.body.appendChild(tempDiv)

            // Calculer espace disponible (largeur totale - marges - espace boutons séparation)
            // En paysage on a plus d'espace, mais il faut compter les boutons de séparation
            const nombreBoutons = texteColle.length - 1
            const espaceBoutons = nombreBoutons * 35 // Estimation: ~35px par bouton (cliquable + séparation + marges)
            const maxWidth = window.innerWidth - 150 - espaceBoutons // 150px marge sécurité

            let tailleTrouvee = 16
            const tailles = [80, 72, 64, 56, 48, 44, 40, 36, 32, 28, 26, 24, 22, 20, 18, 16, 14, 12]

            for (let taille of tailles) {
                tempDiv.style.fontSize = `${taille}px`
                if (tempDiv.offsetWidth <= maxWidth) {
                    tailleTrouvee = taille
                    break
                }
            }

            document.body.removeChild(tempDiv)
            setTaillePoliceDecoupage(tailleTrouvee)
        }
    }, [isMobile, groupeActuel, exerciceActif, separations])

    useEffect(() => {
        checkAuth()
    }, [router])

    // 🎉 Célébration pour score parfait (tous les exercices avec résultats)
    useEffect(() => {
        const exercicesAvecResultats = ['remettre-ordre-resultats', 'ou-est-ce-resultats', 'quest-ce-resultats', 'decoupage-resultats']
        if (exercicesAvecResultats.includes(exerciceActif) && score.total > 0 && score.bonnes === score.total) {
            // Lancer la célébration
            setShowConfetti(true)

            // Jouer le son d'applaudissements immédiatement
            const audio = new Audio('/sounds/clapping.mp3')
            audio.play().catch(e => console.log('Audio play failed:', e))

            // Jouer aussi la synthèse vocale
            jouerSonApplaudissement()

            // Arrêter confettis après 3 secondes
            const timerConfetti = setTimeout(() => {
                setShowConfetti(false)
            }, 3000)

            // Redirection au menu après 5 secondes
            const timerRedirect = setTimeout(() => {
                // Quitter le plein écran si on est dans Découpage (mode mobile paysage)
                if (exerciceActif === 'decoupage-resultats' && document.fullscreenElement) {
                    if (document.exitFullscreen) {
                        document.exitFullscreen()
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen()
                    }
                }
                setExerciceActif(null)
            }, 5000)

            return () => {
                clearTimeout(timerConfetti)
                clearTimeout(timerRedirect)
            }
        }
    }, [exerciceActif, score.bonnes, score.total])

    // Lancer automatiquement la question audio pour "Où est-ce ?"
    useEffect(() => {
        if (exerciceActif === 'ou-est-ce' && motActuel && tousLesMots.length > 0 && indexQuestion < tousLesMots.length) {
            const timer = setTimeout(() => {
                lireQuestionOuEstCe(motActuel)
            }, 300)

            return () => clearTimeout(timer)
        }
    }, [exerciceActif, indexQuestion, motActuel, tousLesMots.length])

    // Calcul dynamique de la taille de police pour l'exercice "Où est" sur mobile
    useEffect(() => {
        if (!isMobile || exerciceActif !== 'ou-est-ce' || !groupeActuel) return

        const motsAfficher = groupeActuel.motsDuGroupe || groupeActuel.contenu.trim().split(/\s+/).filter(mot => !/^[.,:;!?]+$/.test(mot))
        if (motsAfficher.length === 0) return

        // Calculer l'espace disponible avec plus de précision
        const viewportHeight = window.innerHeight
        const headerElement = document.querySelector('div[style*="flexDirection: \'column\'"]') // Header mobile
        const headerHeight = headerElement ? headerElement.offsetHeight + 20 : 160
        const feedbackHeight = feedback ? 70 : 0
        const margins = 20 // Réduire les marges
        
        const availableHeight = viewportHeight - headerHeight - feedbackHeight - margins

        // Calculer avec tous les mots (longueur totale et individuelle)
        const nombreMots = motsAfficher.length
        const longueurMax = Math.max(...motsAfficher.map(mot => mot.length))
        const longueurMoyenne = motsAfficher.reduce((acc, mot) => acc + mot.length, 0) / nombreMots

        // Fonction d'estimation plus précise
        const estimerLayout = (fontSize) => {
            const largeurEcran = window.innerWidth - 16 // padding réduit
            const paddingButton = fontSize * 1.6 // padding horizontal proportionnel
            const gapBetweenButtons = 8
            
            // Calculer combien de mots par ligne en moyenne
            let largeurLigneActuelle = 0
            let lignes = 1
            
            motsAfficher.forEach(mot => {
                const largeurMot = mot.length * fontSize * 0.6 + paddingButton
                if (largeurLigneActuelle + largeurMot + gapBetweenButtons > largeurEcran && largeurLigneActuelle > 0) {
                    lignes++
                    largeurLigneActuelle = largeurMot
                } else {
                    largeurLigneActuelle += largeurMot + (largeurLigneActuelle > 0 ? gapBetweenButtons : 0)
                }
            })
            
            const hauteurBouton = fontSize * 2.5 + 16 // padding vertical + borders
            const gapVertical = 8
            const hauteurTotale = lignes * hauteurBouton + (lignes - 1) * gapVertical + 16 // padding conteneur
            
            return { lignes, hauteurTotale }
        }

        // Recherche dichotomique pour trouver la taille optimale
        let tailleMin = 12
        let tailleMax = 36 // Augmenter la limite max
        let tailleTrouvee = tailleMin

        while (tailleMax - tailleMin > 0.5) {
            const tailleMoyenne = (tailleMin + tailleMax) / 2
            const { hauteurTotale } = estimerLayout(tailleMoyenne)
            
            if (hauteurTotale <= availableHeight) {
                tailleTrouvee = tailleMoyenne
                tailleMin = tailleMoyenne
            } else {
                tailleMax = tailleMoyenne
            }
        }

        setTaillePoliceOuEst(Math.max(12, Math.min(36, Math.floor(tailleTrouvee))))
    }, [exerciceActif, groupeActuel, isMobile, feedback])

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
                console.log('📋 Enregistrements chargés:', Object.keys(data.enregistrementsMap || {}))
                setEnregistrementsMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements vocaux')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
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

    function toggleTexte(texteId) {
        if (textesSelectionnes.includes(texteId)) {
            setTextesSelectionnes(textesSelectionnes.filter(id => id !== texteId))
        } else {
            setTextesSelectionnes([...textesSelectionnes, texteId])
        }
    }

    async function demarrerExercices() {
        if (textesSelectionnes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Récupérer les groupes de sens des textes sélectionnés
            const { data, error: err } = await supabase
                .from('groupes_sens')
                .select('id, texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', textesSelectionnes)
                .order('texte_reference_id', { ascending: true })
                .order('ordre_groupe', { ascending: true })

            if (err) throw err

            // Filtrer les groupes vides ou avec seulement des espaces/sauts de ligne
            const groupes = (data || []).filter(g => {
                const contenuNettoyé = g.contenu.replace(/[\r\n\s]+/g, ' ').trim()
                return contenuNettoyé.length > 0
            })

            setGroupesSens(groupes)
            setEtape('exercices')
            setIndexGroupe(0)
            setScore({ bonnes: 0, total: 0 })
        } catch (err) {
            console.error('Erreur chargement groupes:', err)
            setError('Impossible de charger les groupes de sens')
        } finally {
            setLoading(false)
        }
    }

    function retourSelection() {
        setEtape('selection')
        setExerciceActif(null)
        setGroupesSens([])
        setIndexGroupe(0)
        setGroupeActuel(null)
    }

    async function lireTTS(texte, onEnded = null) {
        // Normaliser le texte pour la recherche dans les enregistrements
        // Supprimer la ponctuation en début et fin de mot
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')  // Ponctuation au début
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')  // Ponctuation à la fin

        // Debug : afficher la recherche
        if (texte !== motNormalise) {
            console.log(`🔍 Recherche enregistrement: "${texte}" → "${motNormalise}"`)
        }

        // Debug : afficher l'état de enregistrementsMap
        console.log(`🔍 Recherche "${motNormalise}" dans`, Object.keys(enregistrementsMap).length, 'enregistrements')
        console.log(`🔍 Contient "${motNormalise}"?`, motNormalise in enregistrementsMap)

        // ========================================================================
        // PRIORITÉ 1 : VOIX PERSONNALISÉE (enregistrement de l'apprenant)
        // ========================================================================
        if (enregistrementsMap[motNormalise]) {
            console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
            console.log(`🎵 URL:`, enregistrementsMap[motNormalise].audio_url)
            const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
            if (onEnded) {
                audio.addEventListener('ended', onEnded)
            }
            audio.play().catch(err => {
                console.error('❌ Erreur lecture audio personnalisé:', err)
                // Fallback sur ElevenLabs en cas d'erreur
                lireTTSElevenLabs(texte, onEnded)
            })
            return audio
        }

        // ========================================================================
        // PRIORITÉ 2 : ELEVENLABS API
        // ========================================================================
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

                // Si quota dépassé (429) ou autre erreur
                if (response.status === 429 || errorData.error === 'QUOTA_EXCEEDED') {
                    console.warn('⚠️ Quota ElevenLabs dépassé, fallback vers Web Speech API')
                } else {
                    console.error('❌ Erreur ElevenLabs:', response.status, errorData)
                }

                // Fallback sur Web Speech API
                return lireTTSFallback(texte, onEnded)
            }
        } catch (error) {
            console.error('❌ Erreur appel ElevenLabs:', error)
            // Fallback sur Web Speech API
            return lireTTSFallback(texte, onEnded)
        }
    }

    function lireTTSFallback(texte, onEnded = null) {
        console.log(`🔊 Fallback Web Speech API pour "${texte}"`)

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()

            // Récupérer les voix disponibles
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
                // Préférer Thomas, Daniel, ou toute autre voix masculine
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

    // ==================== FONCTION LECTURE GROUPE DE SENS ====================
    async function lireGroupeDeSens() {
        if (!groupeActuel) return

        // PRIORITÉ 1: Enregistrement du groupe complet
        if (enregistrementsGroupesMap[groupeActuel.id]) {
            console.log(`✅ Enregistrement de groupe trouvé pour groupe ${groupeActuel.id}`)
            const audio = new Audio(enregistrementsGroupesMap[groupeActuel.id].audio_url)
            audio.play().catch(err => {
                console.error('❌ Erreur lecture groupe:', err)
                // Fallback: lire mot par mot
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

        // Filtrer les mots vides et la ponctuation seule
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
                setTimeout(lireMotSuivant, 300) // Petite pause entre les mots
            }

            lireTTS(mots[index], onEnded)
        }

        lireMotSuivant()
    }

    // ==================== LECTURE PHRASE DANS L'ORDRE (Remettre dans l'ordre) ====================
    function lirePhraseDansOrdre(motsALire) {
        if (!motsALire || motsALire.length === 0) return

        // Réinitialiser le flag d'interruption
        interrompreLectureRef.current = false

        let index = 0

        function lireMotSuivant() {
            // Vérifier si on doit interrompre
            if (interrompreLectureRef.current) {
                setMotEnCoursLecture(-1)
                return
            }

            if (index >= motsALire.length) {
                // Fin de la lecture, réinitialiser l'index
                setMotEnCoursLecture(-1)
                audioEnCoursRef.current = null
                return
            }

            // Illuminer le mot en cours
            setMotEnCoursLecture(index)

            const onEnded = () => {
                // Vérifier à nouveau avant de passer au mot suivant
                if (interrompreLectureRef.current) {
                    setMotEnCoursLecture(-1)
                    return
                }
                index++
                setTimeout(lireMotSuivant, 100) // Petite pause entre les mots
            }

            // Stocker l'audio en cours et lancer la lecture
            const audio = lireTTS(motsALire[index], onEnded)
            if (audio && audio.then) {
                // Si c'est une Promise (ElevenLabs ou fallback)
                audio.then(audioObj => {
                    audioEnCoursRef.current = audioObj
                })
            } else {
                // Si c'est directement un objet Audio
                audioEnCoursRef.current = audio
            }
        }

        lireMotSuivant()
    }

    // Fonction pour stopper la lecture en cours
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

    // ==================== EXERCICE 1 : KARAOKÉ ====================
    function demarrerKaraoke() {
        if (groupesSens.length === 0) return
        setFeedback(null)
        setExerciceActif('karaoke')
        setIndexGroupe(0)
        chargerGroupe(0)
    }

    function chargerGroupe(index) {
        if (index >= groupesSens.length) {
            setShowFinMessage(true)
            setTimeout(() => {
                setShowFinMessage(false)
                setExerciceActif(null)
            }, 3000)
            return
        }
        setGroupeActuel(groupesSens[index])
        setMotIllumineIndex(-1)
    }

    function jouerKaraoke() {
        if (!groupeActuel) return
        // Filtrer les mots vides
        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) {
                setMotIllumineIndex(-1)
                return
            }

            setMotIllumineIndex(index)

            // Callback appelé quand l'audio se termine
            const onAudioEnded = () => {
                index++
                // Petit délai de 300ms entre les mots
                setTimeout(lireMotSuivant, 300)
            }

            lireTTS(mots[index], onAudioEnded)
        }

        lireMotSuivant()
    }

    function groupeSuivantKaraoke() {
        const nextIndex = indexGroupe + 1
        setIndexGroupe(nextIndex)
        chargerGroupe(nextIndex)
    }

    // ==================== EXERCICE 2 : OÙ EST-CE ? ====================
    function demarrerOuEstCe() {
        if (groupesSens.length === 0) return
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })

        // Créer liste de questions : chaque mot de chaque groupe
        const questions = []
        groupesSens.forEach(groupe => {
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
        setExerciceActif('ou-est-ce')

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
            setFeedback({ type: 'success', message: '✅ Correct !' })
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, motActuel]
            }))
            setFeedback({ type: 'error', message: `❌ Non, c'était "${motActuel}"` })
        }

        // Question suivante après 1.5 sec
        setTimeout(() => {
            setFeedback(null)

            const nextIndex = indexQuestion + 1

            // Vérifier si on a fini
            if (nextIndex >= tousLesMots.length) {
                setExerciceActif('ou-est-ce-resultats')
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
        }, 1500)
    }

    // Fonction pour lire la question "Où est [mot]" avec cascade audio
    function lireQuestionOuEstCe(mot) {
        // Normaliser le mot pour chercher dans enregistrementsMap
        const motNormalise = mot
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'\"«»\-—]+/, '')  // Ponctuation au début
            .replace(/[.,;:!?¡¿'\"«»\-—]+$/, '')  // Ponctuation à la fin

        console.log(`🔍 Recherche enregistrement pour "Où est ${motNormalise}"`)

        // ========================================================================
        // PRIORITÉ 1 : ENREGISTREMENT PERSONNALISÉ DU MOT
        // ========================================================================
        if (enregistrementsMap[motNormalise]) {
            console.log(`✅ Enregistrement personnalisé trouvé pour "${motNormalise}"`)
            console.log(`🎵 URL:`, enregistrementsMap[motNormalise].audio_url)
            
            const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
            audio.play().catch(err => {
                console.error('❌ Erreur lecture audio personnalisé:', err)
                // Fallback sur TTS en cas d'erreur
                lireQuestionAvecTTS(mot)
            })
            return
        }

        // ========================================================================
        // PRIORITÉ 2 : "OÙ EST" + 200ms + MOT VIA TTS (ELEVENLABS OU FALLBACK)
        // ========================================================================
        console.log(`⏭️ Pas d'enregistrement perso, lecture via TTS`)
        lireQuestionAvecTTS(mot)
    }

    // Fonction auxiliaire pour lire "Où est" + mot via TTS
    function lireQuestionAvecTTS(mot) {
        lireTTS('Où est')
        setTimeout(() => {
            lireTTS(mot)
        }, 200) // Pause de 200ms entre "Où est" et le mot
    }

    // ==================== EXERCICE 3 : QU'EST-CE ? ====================
    function demarrerQuestCe() {
        if (groupesSens.length === 0) return

        // Créer une liste de tous les mots de tous les groupes
        const tousLesMots = []
        groupesSens.forEach(groupe => {
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
        setExerciceActif('quest-ce')
        setIndexQuestion(0)
        preparerQuestionQuestCe(0, motsAleaoires)
    }

    function preparerQuestionQuestCe(index, listeMots = listeMotsQuestCe) {
        if (index >= listeMots.length) {
            setExerciceActif('quest-ce-resultats')
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
        setSonSelectionne(null) // Réinitialiser la sélection
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
            setFeedback({ type: 'success', message: '✅ Correct !' })
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, motActuel]
            }))
            setFeedback({ type: 'error', message: `❌ Non, c'était "${motActuel}"` })
        }

        // Question suivante après 1.5 sec
        setTimeout(() => {
            setFeedback(null)
            setSonSelectionne(null) // Réinitialiser la sélection
            const nextIndex = indexQuestion + 1
            setIndexQuestion(nextIndex)
            preparerQuestionQuestCe(nextIndex)
        }, 1500)
    }

    // ==================== EXERCICE 5 : REMETTRE DANS L'ORDRE ====================
    function demarrerRemettreOrdre() {
        if (groupesSens.length === 0) return
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setResultats({ reussis: [], rates: [] })
        setExerciceActif('remettre-ordre')
        setIndexGroupe(0)
        preparerQuestionRemettreOrdre(0)
    }

    // Mélange Fisher-Yates (vrai aléatoire)
    function melangerTableau(array) {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    function preparerQuestionRemettreOrdre(index) {
        if (index >= groupesSens.length) {
            // Exercice terminé - afficher les résultats
            setExerciceActif('remettre-ordre-resultats')
            return
        }

        const groupe = groupesSens[index]
        // Filtrer les mots vides
        const mots = groupe.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

        // Mélanger les mots avec Fisher-Yates (vrai aléatoire)
        const motsMelanges = melangerTableau(mots)

        setGroupeActuel(groupe)
        setMotsDisponibles(motsMelanges)
        setMotsSelectionnes([])
        setMotsValidation([]) // Réinitialiser la validation
        setMotEnCoursLecture(-1) // Réinitialiser l'index de lecture
        setFeedback(null) // Réinitialiser le feedback
    }

    // Fonction pour sortir du plein écran (mobile)
    function quitterPleinEcran() {
        if (!isMobile) return

        // Sortir du plein écran
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {})
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen()
            }
        }

        // Déverrouiller l'orientation
        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock()
            } catch (e) {
                // Ignorer les erreurs
            }
        }
    }

    // Écouter la sortie du plein écran pour déverrouiller l'orientation
    useEffect(() => {
        if (!isMobile) return

        function handleFullscreenChange() {
            // Si on sort du plein écran alors qu'on est dans Découpage
            if (exerciceActif === 'decoupage' && !document.fullscreenElement && !document.webkitFullscreenElement) {
                // Déverrouiller l'orientation
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
    }, [isMobile, exerciceActif])

    // Calcul dynamique de la taille de police pour mobile
    useEffect(() => {
        if (!isMobile || motsSelectionnes.length === 0 || !containerRef.current) return

        // Calculer la largeur approximative nécessaire
        const longueurTotale = motsSelectionnes.reduce((acc, mot) => acc + mot.length, 0)
        const nombreMots = motsSelectionnes.length
        const largeurContainer = containerRef.current.offsetWidth - 16 // padding
        
        // Estimation: chaque caractère prend environ 0.6 * fontSize en largeur
        // + padding des boutons (16px par mot) + gap entre mots (4px)
        const largeurEstimee = (longueurTotale, fontSize) => {
            return (longueurTotale * 0.6 * fontSize) + (nombreMots * 16) + ((nombreMots - 1) * 4)
        }

        // Trouver la taille de police maximale qui rentre
        let taille = 20 // Commencer grand
        while (taille > 8 && largeurEstimee(longueurTotale, taille) > largeurContainer) {
            taille -= 0.5
        }

        setTaillePoliceMots(Math.max(8, Math.min(20, taille)))
    }, [motsSelectionnes, isMobile])

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

        // Filtrer les mots vides
        const motsAttendus = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

        // Vérifier chaque mot individuellement
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

        // Tracker résultats (phrase complète)
        const phraseReconstitue = motsSelectionnes.join(' ')
        if (correct) {
            setResultats(prev => ({
                ...prev,
                reussis: [...prev.reussis, phraseReconstitue]
            }))
            setFeedback({ type: 'success', message: '✅ Parfait ! C\'est bien ça !' })
        } else {
            setResultats(prev => ({
                ...prev,
                rates: [...prev.rates, groupeActuel.contenu]
            }))
            setFeedback({
                type: 'error',
                message: `❌ Certains mots ne sont pas au bon endroit`
            })
        }

        // Lire la phrase dans l'ordre choisi par l'apprenant
        lirePhraseDansOrdre(motsSelectionnes)
    }

    function phraseSuivante() {
        stopperLecture() // Interrompre la lecture audio en cours
        const nextIndex = indexGroupe + 1
        setIndexGroupe(nextIndex)
        preparerQuestionRemettreOrdre(nextIndex)
    }

    // ==================== EXERCICE 4 : DÉCOUPAGE ====================
    async function demarrerDecoupage() {
        if (groupesSens.length === 0) return

        // Sur mobile, forcer plein écran + orientation paysage
        if (isMobile) {
            try {
                // Demander le plein écran
                const elem = document.documentElement
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen()
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen()
                }

                // Forcer orientation paysage
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
        setExerciceActif('decoupage')
        setIndexGroupe(0)
        preparerDecoupage(0)
    }

    function preparerDecoupage(index) {
        if (index >= groupesSens.length) {
            setExerciceActif('decoupage-resultats')
            return
        }

        const groupe = groupesSens[index]
        // Filtrer les mots vides pour le contenu
        const motsValides = groupe.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

        // Ne préparer que si on a des mots valides
        if (motsValides.length > 0) {
            setGroupeActuel(groupe)
            setSeparations([])
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
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

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

        // Afficher feedback
        if (correct) {
            setFeedback({ type: 'success', message: '✅ Parfait !' })
        } else {
            setFeedback({ type: 'error', message: `❌ Les mots sont : ${motsAttendus.join(' - ')}` })
        }

        // Phrase suivante après 2 sec
        setTimeout(() => {
            setFeedback(null)
            const nextIndex = indexGroupe + 1
            setIndexGroupe(nextIndex)
            preparerDecoupage(nextIndex)
        }, 2000)
    }

    // ==================== RENDER ====================

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>Chargement...</div>
            </div>
        )
    }

    // ÉTAPE 1 : Sélection des textes
    if (etape === 'selection') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={{
                        ...styles.title,
                        fontSize: isMobile ? '20px' : '32px'
                    }}>👁️ Reconnaitre les mots</h1>
                    <div style={styles.navIcons}>
                        <button
                            onClick={() => router.push('/lire')}
                            style={styles.iconButton}
                            title="Menu Lecture"
                        >
                            📖
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={styles.iconButton}
                            title="Tableau de bord"
                        >
                            🏠
                        </button>
                    </div>
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
                        <div style={{ marginBottom: '24px' }}>
                            <div style={styles.textesGrid}>
                                {textes.map(texte => (
                                    <div
                                        key={texte.id}
                                        style={{
                                            ...styles.texteCard,
                                            ...(textesSelectionnes.includes(texte.id) ? styles.texteCardSelected : {})
                                        }}
                                        onClick={() => toggleTexte(texte.id)}
                                    >
                                        <div style={styles.texteCardHeader}>
                                            <input
                                                type="checkbox"
                                                checked={textesSelectionnes.includes(texte.id)}
                                                onChange={() => {}}
                                                style={styles.checkbox}
                                            />
                                            <span style={styles.texteCardTitle}>{texte.titre}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.actions}>
                            <button
                                onClick={demarrerExercices}
                                style={styles.primaryButton}
                                disabled={textesSelectionnes.length === 0}
                            >
                                Commencer les exercices
                            </button>
                        </div>
                    </>
                )}
            </div>
        )
    }

    // ÉTAPE 2 : Menu des exercices
    if (etape === 'exercices' && !exerciceActif) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={{
                        ...styles.title,
                        fontSize: isMobile ? '20px' : '32px'
                    }}>👁️ Reconnaitre les mots</h1>
                    <div style={styles.navIcons}>
                        <button
                            onClick={retourSelection}
                            style={styles.iconButton}
                            title="Changer de textes"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => router.push('/lire')}
                            style={styles.iconButton}
                            title="Menu Lecture"
                        >
                            📖
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={styles.iconButton}
                            title="Tableau de bord"
                        >
                            🏠
                        </button>
                    </div>
                    <p style={styles.subtitle}>
                        {groupesSens.length} groupes de sens • Choisis un exercice
                    </p>
                </div>

                <div style={{
                    ...styles.exercicesGrid,
                    gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: isMobile ? '8px' : '20px'
                }}>
                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={() => {
                        // textesSelectionnes contient déjà les IDs (nombres)
                        const texteIds = textesSelectionnes.join(',')
                        router.push(`/lire/ma-voix-mes-mots?texte_ids=${texteIds}`)
                    }}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>🎙️</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Ma voix, mes mots</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Enregistre ta voix pour chaque mot de ton texte
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={demarrerKaraoke}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>🎤</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Karaoké</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Chaque mot s'illumine quand il est prononcé
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={demarrerRemettreOrdre}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>🔄</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Remettre dans l'ordre</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Les mots sont mélangés, remets-les dans l'ordre
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={demarrerOuEstCe}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>📍</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Où est-ce ?</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Écoute le mot et clique sur le bon mot écrit
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={demarrerQuestCe}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>🔊</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Qu'est-ce ?</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Un mot est illuminé, trouve le bon son
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={demarrerDecoupage}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>✂️</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Découpage</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Sépare les mots qui sont collés
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={() => router.push('/lire/ecoute-et-trouve')}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>🎯</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Écoute et trouve</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Écoute un mot et trouve-le parmi plusieurs choix
                            </p>
                        )}
                    </div>

                    <div style={{
                        ...styles.exerciceCard,
                        padding: isMobile ? '8px' : '32px'
                    }} onClick={() => router.push('/lire/lis-et-trouve')}>
                        <div style={{
                            ...styles.exerciceIcon,
                            fontSize: isMobile ? '16px' : '64px',
                            marginBottom: isMobile ? '4px' : '16px'
                        }}>👀</div>
                        <h3 style={{
                            ...styles.exerciceTitle,
                            fontSize: isMobile ? '12px' : '20px',
                            marginBottom: isMobile ? '2px' : '8px'
                        }}>Lis et trouve</h3>
                        {!isMobile && (
                            <p style={styles.exerciceDescription}>
                                Lis un mot et trouve le bon son parmi plusieurs audios
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // EXERCICE 1 : KARAOKÉ
    if (exerciceActif === 'karaoke' && groupeActuel) {
        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule
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
                            maxWidth: isMobile ? '90%' : '500px',
                            animation: 'fadeIn 0.3s ease-in'
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

                <div style={styles.header}>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            <h1 style={{ ...styles.title, fontSize: '20px', margin: 0 }}>🎤 Karaoké</h1>
                            <p style={{ ...styles.subtitle, margin: 0, fontSize: '14px' }}>
                                Groupe {indexGroupe + 1} / {groupesSens.length}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                                        border: '2px solid #8b5cf6',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Écouter le groupe de sens"
                                >
                                    🔊
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={styles.title}>🎤 Karaoké</h1>
                                <p style={styles.subtitle}>
                                    Groupe {indexGroupe + 1} / {groupesSens.length}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div
                    ref={karaokeContainerRef}
                    style={isMobile ? styles.karaokeBoxMobile : styles.karaokeBox}
                >
                    {isMobile ? (
                        /* OPTION 3 MOBILE : Afficher uniquement le mot illuminé en grand */
                        <>
                            {/* Mot principal illuminé en très grand */}
                            {motIllumineIndex >= 0 && (
                                <div style={styles.motPrincipalMobile}>
                                    {mots[motIllumineIndex]}
                                </div>
                            )}

                            {/* Phrase complète en petit en bas pour contexte */}
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

                <div style={{ ...styles.actions, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <button onClick={jouerKaraoke} style={styles.primaryButton}>
                        ▶️ Jouer
                    </button>
                    <button onClick={groupeSuivantKaraoke} style={styles.secondaryButton}>
                        Groupe suivant →
                    </button>
                </div>

                {/* Icônes de navigation */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
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
                            title="Tableau de bord"
                        >
                            🏠
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
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
                        >
                            👁️
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // EXERCICE 2 : OÙ EST-CE ?
    if (exerciceActif === 'ou-est-ce' && motActuel && groupeActuel) {
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
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={styles.title}>📍 Où est-ce ?</h1>
                                <p style={styles.subtitle}>
                                    Question {indexQuestion + 1} / {tousLesMots.length} • Score : {score.bonnes}/{score.total}
                                </p>
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

                {!isMobile && (
                    <div style={styles.questionBox}>
                        <p style={styles.consigne}>🔊 Écoute bien et clique sur le bon mot :</p>
                        <button
                            onClick={() => lireQuestionOuEstCe(motActuel)}
                            style={styles.ecouterButton}
                        >
                            🔊 Écouter la question
                        </button>
                    </div>
                )}

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
                                ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                                ...(isMobile ? {
                                    fontSize: `${taillePoliceOuEst}px`,
                                    padding: `${taillePoliceOuEst * 0.5}px ${taillePoliceOuEst * 0.8}px`,
                                    minWidth: 'auto',
                                    flexShrink: 1
                                } : {})
                            }}
                        >
                            {mot}
                        </button>
                    ))}
                </div>

                {!isMobile && (
                    <div style={styles.actions}>
                        <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                            ← Menu exercices
                        </button>
                    </div>
                )}

                {/* Icônes de navigation (desktop uniquement) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
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
                    </div>
                )}
            </div>
        )
    }

    // PAGE RÉSULTATS - OÙ EST-CE ?
    if (exerciceActif === 'ou-est-ce-resultats') {
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
                                {/* 5 icônes : ← 👁️ 📖 🏠 🔄 */}
                                <button
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                                    onClick={() => demarrerOuEstCe()}
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
                                    title="Recommencer"
                                >
                                    🔄
                                </button>
                            </div>
                            {/* Score intégré sous les icônes */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
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
                        // VERSION DESKTOP - score inline with title
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📊 Résultats</h1>
                                </div>
                                {/* Score pour desktop */}
                                <div style={{
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: 'white',
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

                {/* Listes des mots avec espacement optimisé pour mobile */}
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

                {/* Boutons de navigation desktop uniquement */}
                {!isMobile && (
                    <div style={styles.actions}>
                        <button
                            onClick={() => demarrerOuEstCe()}
                            style={styles.primaryButton}
                        >
                            🔄 Recommencer
                        </button>
                        <button
                            onClick={() => setExerciceActif(null)}
                            style={styles.secondaryButton}
                        >
                            ← Menu exercices
                        </button>
                    </div>
                )}

                {/* Icônes de navigation (desktop uniquement) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
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
                    </div>
                )}

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

    // EXERCICE 3 : QU'EST-CE ? - RESULTATS
    if (exerciceActif === 'quest-ce-resultats') {
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
                                {/* 5 icônes : ← 👁️ 📖 🏠 🔄 */}
                                <button
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                                    onClick={() => demarrerQuestCe()}
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
                                    title="Recommencer"
                                >
                                    🔄
                                </button>
                            </div>
                            {/* Score intégré sous les icônes */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
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
                        // VERSION DESKTOP - score inline with title
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📊 Résultats</h1>
                                </div>
                                {/* Score pour desktop */}
                                <div style={{
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: 'white',
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

                {/* Listes des mots avec espacement optimisé pour mobile */}
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
                                ✅ Mots réussis ({resultats.reussis.length})
                            </h2>
                            <div style={styles.motsListeReussis}>
                                {resultats.reussis.map((mot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => lireTTS(mot)}
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

                {/* Boutons de navigation desktop uniquement */}
                {!isMobile && (
                    <div style={styles.actions}>
                        <button
                            onClick={() => demarrerQuestCe()}
                            style={styles.primaryButton}
                        >
                            🔄 Recommencer
                        </button>
                        <button
                            onClick={() => setExerciceActif(null)}
                            style={styles.secondaryButton}
                        >
                            ← Menu exercices
                        </button>
                    </div>
                )}

                {/* Icônes de navigation (desktop uniquement) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
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
                    </div>
                )}

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

    // EXERCICE 3 : QU'EST-CE ?
    if (exerciceActif === 'quest-ce' && groupeActuel && motActuel) {
        const mots = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule
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
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={styles.title}>🔊 Qu'est-ce ?</h1>
                                <p style={styles.subtitle}>
                                    Question {indexQuestion + 1} / {listeMotsQuestCe.length} • Score : {score.bonnes}/{score.total}
                                </p>
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

                {isMobile ? (
                    <div
                        ref={phraseRefQuestCe}
                        style={{
                            marginTop: '16px',
                            marginBottom: '24px',
                            width: '100%',
                            textAlign: 'left',
                            fontSize: `${taillePoliceQuestCe}px`,
                            fontWeight: '600',
                            lineHeight: '1.2',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            padding: '0 16px'
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
                    <div style={styles.questionBox}>
                        <p style={styles.consigne}>Le mot illuminé est :</p>
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
                        <p style={styles.consigne}>🔊 Écoute les sons et choisis le bon :</p>
                    </div>
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
                    {sonsDesordre.map((mot, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setSonSelectionne(mot)
                                lireTTS(mot)
                            }}
                            disabled={feedback !== null}
                            style={{
                                ...styles.audioButton,
                                ...(isMobile ? {
                                    padding: '16px',
                                    fontSize: '18px'
                                } : {}),
                                ...(sonSelectionne === mot ? styles.audioButtonSelected : {}),
                                ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            🔊 {index + 1}
                        </button>
                    ))}
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={() => verifierReponseQuestCe(sonSelectionne)}
                        disabled={!sonSelectionne || feedback !== null}
                        style={{
                            ...styles.primaryButton,
                            ...(!sonSelectionne || feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                        }}
                    >
                        Valider
                    </button>
                </div>

                {/* Icônes de navigation */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
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
                            title="Tableau de bord"
                        >
                            🏠
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
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
                        >
                            👁️
                        </button>
                    </div>
                )}

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

    // EXERCICE 5 : REMETTRE DANS L'ORDRE
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
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                        // VERSION DESKTOP : Layout horizontal
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={styles.title}>🔄 Remettre dans l'ordre</h1>
                                <p style={styles.subtitle}>
                                    Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                                </p>
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
                                        // Afficher couleur si déjà lu (index < motEnCoursLecture) OU en cours de lecture (index === motEnCoursLecture)
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
                                        // Animation scale uniquement pour le mot en cours de lecture
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
                        disabled={motsSelectionnes.length === 0 || feedback !== null}
                        style={{
                            ...styles.primaryButton,
                            ...(motsSelectionnes.length === 0 || feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                            ...(isMobile ? { padding: '8px 12px', fontSize: '14px' } : {})
                        }}
                    >
                        Vérifier
                    </button>
                    {feedback !== null && (
                        <button
                            onClick={phraseSuivante}
                            style={{
                                ...styles.primaryButton,
                                backgroundColor: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                ...(isMobile ? { padding: '8px 12px', fontSize: '14px' } : {})
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

                {/* Icônes de navigation (desktop uniquement) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
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
                    </div>
                )}
            </div>
        )
    }

    // PAGE RÉSULTATS - REMETTRE DANS L'ORDRE
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
                                    onClick={() => setExerciceActif(null)}
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
                                    onClick={() => setExerciceActif(null)}
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
                                    title="Retour aux exercices"
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📊 Résultats</h1>
                                </div>
                                {/* Score pour desktop */}
                                <div style={{
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: 'white',
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

    // PAGE RÉSULTATS DÉCOUPAGE
    if (exerciceActif === 'decoupage-resultats') {
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
                                {/* 5 icônes : ← 👁️ 📖 🏠 🔄 */}
                                <button
                                    onClick={() => {
                                        quitterPleinEcran()
                                        setExerciceActif(null)
                                    }}
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
                                    onClick={() => {
                                        quitterPleinEcran()
                                        setExerciceActif(null)
                                    }}
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
                                    title="Retour aux exercices"
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
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
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
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Accueil"
                                >
                                    🏠
                                </button>
                                <button
                                    onClick={() => demarrerDecoupage()}
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
                                    title="Recommencer"
                                >
                                    🔄
                                </button>
                            </div>
                            {/* Score intégré sous les icônes */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
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
                        // VERSION DESKTOP - score inline with title
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                    <h1 style={styles.title}>📊 Résultats</h1>
                                </div>
                                {/* Score pour desktop */}
                                <div style={{
                                    border: '3px solid #3b82f6',
                                    borderRadius: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: 'white',
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

                {/* Message de félicitations */}
                <div style={{
                    ...styles.resultatsBox,
                    ...(isMobile ? {
                        padding: '16px',
                        marginTop: '16px'
                    } : {})
                }}>
                    <div style={{
                        textAlign: 'center',
                        fontSize: isMobile ? '18px' : '24px',
                        color: '#1e293b',
                        marginBottom: '16px'
                    }}>
                        {score.bonnes === score.total ? (
                            <>
                                <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>🎉</div>
                                <div style={{ fontWeight: 'bold', color: '#10b981' }}>Parfait !</div>
                                <div style={{ marginTop: '8px', fontSize: isMobile ? '16px' : '20px', color: '#64748b' }}>
                                    Toutes les phrases sont correctement découpées !
                                </div>
                            </>
                        ) : score.bonnes >= score.total * 0.7 ? (
                            <>
                                <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>👏</div>
                                <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>Très bien !</div>
                                <div style={{ marginTop: '8px', fontSize: isMobile ? '16px' : '20px', color: '#64748b' }}>
                                    Tu as réussi {score.bonnes} phrases sur {score.total}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>💪</div>
                                <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>Continue !</div>
                                <div style={{ marginTop: '8px', fontSize: isMobile ? '16px' : '20px', color: '#64748b' }}>
                                    Tu progresses ! {score.bonnes} phrases réussies sur {score.total}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Boutons de navigation desktop uniquement */}
                {!isMobile && (
                    <div style={styles.actions}>
                        <button
                            onClick={() => demarrerDecoupage()}
                            style={styles.primaryButton}
                        >
                            🔄 Recommencer
                        </button>
                        <button
                            onClick={() => setExerciceActif(null)}
                            style={styles.secondaryButton}
                        >
                            ← Menu exercices
                        </button>
                    </div>
                )}

                {/* Confettis pour score parfait */}
                {score.total > 0 && score.bonnes === score.total && (
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
        )
    }

    // EXERCICE 4 : DÉCOUPAGE
    if (exerciceActif === 'decoupage' && groupeActuel) {
        const texteColle = groupeActuel.contenu.replace(/\s+/g, '')
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={styles.title}>✂️ Découpage</h1>
                            <p style={styles.subtitle}>
                                Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                            </p>
                        </div>
                        {isMobile && (
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        quitterPleinEcran()
                                        setExerciceActif(null)
                                    }}
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
                                    onClick={() => {
                                        quitterPleinEcran()
                                        setExerciceActif(null)
                                    }}
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
                                    title="Retour aux exercices"
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
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
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
                                    title="Écouter"
                                >
                                    🔊
                                </button>
                                <button
                                    onClick={quitterPleinEcran}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: 'white',
                                        border: '2px solid #ef4444',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Sortir du plein écran"
                                >
                                    ⛶
                                </button>
                                <button
                                    onClick={verifierDecoupage}
                                    disabled={feedback !== null}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: feedback ? '#94a3b8' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: feedback ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        opacity: feedback ? 0.5 : 1
                                    }}
                                    title="Vérifier"
                                >
                                    Vérifier
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                {!isMobile && (
                    <div style={styles.questionBox}>
                        <p style={styles.consigne}>Clique entre les lettres pour séparer les mots :</p>
                    </div>
                )}

                <div style={{
                    ...styles.decoupageBox,
                    ...(isMobile ? {
                        backgroundColor: 'transparent',
                        padding: '16px 0',
                        borderRadius: '0'
                    } : {})
                }}>
                    {(() => {
                        const lettres = texteColle.split('')

                        // Si aucune séparation : affichage simple
                        if (separations.length === 0) {
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

                        return groupes.map((groupe, groupeIndex) => (
                            <span key={groupeIndex} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                {/* Groupe de lettres rapprochées */}
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '6px',
                                    padding: isMobile ? '4px 1px' : '4px 4px',
                                    gap: '0px'
                                }}>
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
                                {/* Séparation visible entre groupes (sauf après le dernier groupe) */}
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
                        ))
                    })()}
                </div>

                {!isMobile && (
                    <div style={styles.actions}>
                        <button
                            onClick={verifierDecoupage}
                            disabled={feedback !== null}
                            style={{
                                ...styles.primaryButton,
                                ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            Vérifier
                        </button>
                        <button
                            onClick={() => setSeparations([])}
                            disabled={feedback !== null}
                            style={{
                                ...styles.secondaryButton,
                                ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            Effacer
                        </button>
                        <button onClick={() => {
                            quitterPleinEcran()
                            setExerciceActif(null)
                        }} style={styles.secondaryButton}>
                            ← Menu exercices
                        </button>
                    </div>
                )}

                {/* Icônes de navigation (desktop uniquement) */}
                {!isMobile && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button
                            onClick={() => router.push('/lire/ma-voix-mes-mots')}
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
                            title="Ma voix, mes mots"
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
                    </div>
                )}
            </div>
        )
    }

    return null
}

// ==================== STYLES ====================
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#06b6d4',
        margin: '0 0 12px 0',
        whiteSpace: 'nowrap'
    },
    navIcons: {
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        marginBottom: '12px'
    },
    iconButton: {
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
    subtitle: {
        fontSize: '16px',
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
        padding: '10px 12px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    texteCardSelected: {
        borderColor: '#06b6d4',
        backgroundColor: '#ecfeff'
    },
    texteCardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    texteCardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
    },
    texteCardInfo: {
        fontSize: '14px',
        color: '#666',
        marginLeft: '32px'
    },
    checkbox: {
        width: '20px',
        height: '20px',
        cursor: 'pointer'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        cursor: 'pointer'
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: '24px'
    },
    primaryButton: {
        padding: '12px 24px',
        backgroundColor: '#06b6d4',
        color: '#fff',
        border: 'none',
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
    exercicesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
    },
    exerciceCard: {
        backgroundColor: '#fff',
        padding: '32px',
        borderRadius: '12px',
        textAlign: 'center',
        cursor: 'pointer',
        border: '2px solid #e5e7eb',
        transition: 'all 0.3s'
    },
    exerciceIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    exerciceTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '8px'
    },
    exerciceDescription: {
        fontSize: '14px',
        color: '#666',
        lineHeight: '1.4'
    },
    karaokeBox: {
        backgroundColor: '#fff',
        padding: '48px',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '32px',
        lineHeight: '1.8',
        marginBottom: '32px'
    },
    karaokeBoxMobile: {
        textAlign: 'center',
        marginBottom: '24px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
    },
    motKaraoke: {
        display: 'inline-block',
        margin: '0 8px',
        padding: '8px 16px',
        borderRadius: '8px',
        transition: 'all 0.3s'
    },
    motKaraokeMobile: {
        display: 'inline-block',
        margin: '8px 10px',
        padding: '10px 14px',
        borderRadius: '8px',
        transition: 'all 0.3s',
        fontSize: '26px'
    },
    // OPTION 3 : Mot principal en très grand
    motPrincipalMobile: {
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#000',
        backgroundColor: '#fef08a',
        padding: '20px 30px',
        borderRadius: '12px',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '90vw',
        textAlign: 'center'
    },
    // OPTION 3 : Phrase complète en petit pour contexte
    phraseContexteMobile: {
        fontSize: '14px',
        color: '#666',
        lineHeight: '1.8',
        textAlign: 'center',
        padding: '8px',
        whiteSpace: 'nowrap',
        overflow: 'visible',
        width: '100%'
    },
    motContexteMobile: {
        display: 'inline',
        margin: '0 4px'
    },
    motIllumine: {
        backgroundColor: '#fef08a',
        transform: 'scale(1.2)',
        fontWeight: 'bold'
    },
    questionBox: {
        backgroundColor: '#fff',
        padding: '32px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '24px'
    },
    consigne: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '16px'
    },
    ecouterButton: {
        padding: '12px 32px',
        backgroundColor: '#06b6d4',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    motsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
    },
    motButton: {
        padding: '20px',
        backgroundColor: '#fff',
        border: '2px solid #06b6d4',
        borderRadius: '12px',
        fontSize: '24px',
        fontWeight: '600',
        color: '#06b6d4',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    audioButton: {
        padding: '20px',
        backgroundColor: '#fff',
        border: '2px solid #8b5cf6',
        borderRadius: '12px',
        fontSize: '20px',
        fontWeight: '600',
        color: '#8b5cf6',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    audioButtonSelected: {
        backgroundColor: '#ede9fe',
        border: '2px solid #7c3aed',
        transform: 'scale(1.05)',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
    },
    phraseBox: {
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '28px',
        lineHeight: '1.8'
    },
    motPhrase: {
        display: 'inline-block',
        margin: '0 8px',
        padding: '8px 16px',
        borderRadius: '8px',
        transition: 'all 0.3s'
    },
    decoupageBox: {
        backgroundColor: '#fff',
        padding: '48px',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '32px',
        marginBottom: '32px'
    },
    lettre: {
        display: 'inline-block',
        fontWeight: '600',
        color: '#333',
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
        marginBottom: '24px',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: '600',
        animation: 'fadeIn 0.3s ease'
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
    resultatsBox: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px'
    },
    scoreGlobal: {
        textAlign: 'center',
        marginBottom: '48px'
    },
    scoreCircle: {
        fontSize: '64px',
        fontWeight: 'bold',
        color: '#06b6d4',
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
        color: '#6b7280'
    },
    resultatsSection: {
        marginBottom: '32px'
    },
    resultatsSectionTitle: {
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#333'
    },
    motsListeReussis: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
    },
    motsListeRates: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
    },
    motReussi: {
        display: 'inline-block',
        padding: '8px 16px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        border: '2px solid #10b981'
    },
    motRate: {
        display: 'inline-block',
        padding: '8px 16px',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        border: '2px solid #ef4444'
    },
    ordreSection: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
    },
    ordreSectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '16px'
    },
    phraseEnCours: {
        minHeight: '80px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '2px dashed #d1d5db',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center'
    },
    placeholderPhrase: {
        fontSize: '14px',
        color: '#9ca3af',
        fontStyle: 'italic'
    },
    motSelectionne: {
        padding: '10px 16px',
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    motsDisponiblesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px'
    },
    motDisponible: {
        padding: '12px 16px',
        backgroundColor: '#fff',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#374151',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    phrasesListe: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    phraseReussie: {
        padding: '12px 16px',
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        border: '2px solid #10b981'
    },
    phraseRatee: {
        padding: '12px 16px',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        border: '2px solid #ef4444'
    }
}
