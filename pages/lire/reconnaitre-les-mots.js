import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

/**
 * MODULE : Reconnaitre les mots
 *
 * Étape située AVANT la syllabification où l'apprenant apprend
 * à associer le mot oral au mot écrit.
 *
 * 7 exercices progressifs :
 * 1. Karaoké : Illumination synchronisée son/écrit
 * 2. Remettre dans l'ordre : Reconstruire la phrase à partir de mots mélangés
 * 3. Où est-ce ? : Audio → Trouver le mot écrit (groupes de sens)
 * 4. Qu'est-ce ? : Mot illuminé → Choisir le bon son (groupes de sens)
 * 5. Découpage : Séparer les mots collés
 * 6. Écoute et trouve : Audio → Trouver le mot écrit (mots isolés, 4-12 choix)
 * 7. Lis et trouve : Mot écrit → Trouver le bon son (mots isolés, 4-8 sons)
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

    // Karaoké
    const [motIllumineIndex, setMotIllumineIndex] = useState(-1)

    // Qu'est-ce ?
    const [sonSelectionne, setSonSelectionne] = useState(null)
    const [sonsDesordre, setSonsDesordre] = useState([])

    // Découpage
    const [separations, setSeparations] = useState([])

    useEffect(() => {
        checkAuth()
    }, [router])

    // Lancer automatiquement la question audio pour "Où est-ce ?"
    useEffect(() => {
        if (exerciceActif === 'ou-est-ce' && motActuel && tousLesMots.length > 0 && indexQuestion < tousLesMots.length) {
            const timer = setTimeout(() => {
                lireTTS('Où est')
                setTimeout(() => {
                    lireTTS(`${motActuel} ?`)
                }, 600)
            }, 300)

            return () => clearTimeout(timer)
        }
    }, [exerciceActif, indexQuestion, motActuel, tousLesMots.length])

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
        } catch (err) {
            console.error('Erreur authentification:', err)
            router.push('/login')
        } finally {
            setLoading(false)
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

            let groupes = data || []

            // Toujours mélanger les groupes
            groupes = groupes.sort(() => Math.random() - 0.5)

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

    function lireTTS(texte) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6
            window.speechSynthesis.speak(utterance)
        }
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
            alert('Tous les groupes ont été lus !')
            setExerciceActif(null)
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

        const interval = setInterval(() => {
            if (index >= mots.length) {
                clearInterval(interval)
                setMotIllumineIndex(-1)
                return
            }

            setMotIllumineIndex(index)
            lireTTS(mots[index])
            index++
        }, 1500) // 1.5 secondes entre chaque mot
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

        // TOUJOURS mélanger les questions pour éviter de deviner l'ordre
        questions.sort(() => Math.random() - 0.5)

        setTousLesMots(questions)
        setIndexQuestion(0)
        setExerciceActif('ou-est-ce')

        // Préparer première question (l'audio sera lancé par useEffect)
        if (questions.length > 0) {
            const question = questions[0]
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

    // ==================== EXERCICE 3 : QU'EST-CE ? ====================
    function demarrerQuestCe() {
        if (groupesSens.length === 0) return
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setSonSelectionne(null)
        setExerciceActif('quest-ce')
        setIndexGroupe(0)
        preparerQuestionQuestCe(0)
    }

    function preparerQuestionQuestCe(index) {
        if (index >= groupesSens.length) {
            alert(`Exercice terminé ! Score : ${score.bonnes}/${score.total}`)
            setExerciceActif(null)
            return
        }

        const groupe = groupesSens[index]
        // Filtrer les mots vides
        const mots = groupe.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

        if (mots.length > 0) {
            const motAleatoire = mots[Math.floor(Math.random() * mots.length)]

            // Mélanger l'ordre des sons
            const sonsMelanges = [...mots].sort(() => Math.random() - 0.5)

            setGroupeActuel(groupe)
            setMotActuel(motAleatoire)
            setSonsDesordre(sonsMelanges)
            setSonSelectionne(null) // Réinitialiser la sélection
        }
    }

    function verifierReponseQuestCe(motChoisi) {
        if (!motChoisi) return

        const correct = motChoisi === motActuel
        const newScore = {
            bonnes: score.bonnes + (correct ? 1 : 0),
            total: score.total + 1
        }
        setScore(newScore)

        // Afficher feedback
        if (correct) {
            setFeedback({ type: 'success', message: '✅ Correct !' })
        } else {
            setFeedback({ type: 'error', message: `❌ Non, c'était "${motActuel}"` })
        }

        // Question suivante après 1.5 sec
        setTimeout(() => {
            setFeedback(null)
            setSonSelectionne(null) // Réinitialiser la sélection
            const nextIndex = indexGroupe + 1
            setIndexGroupe(nextIndex)
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

        // Mélanger les mots disponibles
        const motsMelanges = [...mots].sort(() => Math.random() - 0.5)

        setGroupeActuel(groupe)
        setMotsDisponibles(motsMelanges)
        setMotsSelectionnes([])
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

        // Filtrer les mots vides
        const motsAttendus = groupeActuel.contenu
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot)) // Exclure ponctuation seule

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
                message: `❌ Non, c'était : "${groupeActuel.contenu}"`
            })
        }

        // Phrase suivante après 2 sec
        setTimeout(() => {
            setFeedback(null)
            const nextIndex = indexGroupe + 1
            setIndexGroupe(nextIndex)
            preparerQuestionRemettreOrdre(nextIndex)
        }, 2000)
    }

    // ==================== EXERCICE 4 : DÉCOUPAGE ====================
    function demarrerDecoupage() {
        if (groupesSens.length === 0) return
        setFeedback(null)
        setScore({ bonnes: 0, total: 0 })
        setExerciceActif('decoupage')
        setIndexGroupe(0)
        preparerDecoupage(0)
    }

    function preparerDecoupage(index) {
        if (index >= groupesSens.length) {
            alert(`Exercice terminé ! Score : ${score.bonnes}/${score.total}`)
            setExerciceActif(null)
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
                    <h1 style={styles.title}>👁️ Reconnaitre les mots</h1>
                    <p style={styles.subtitle}>
                        Apprends à associer les mots que tu entends avec les mots écrits
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
                            <h2 style={styles.sectionTitle}>📚 Choisis tes textes</h2>
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
                                        <div style={styles.texteCardInfo}>
                                            {texte.nombre_groupes} groupes de sens
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
                            <button
                                onClick={() => router.push('/lire')}
                                style={styles.secondaryButton}
                            >
                                ← Retour
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
                    <h1 style={styles.title}>👁️ Reconnaitre les mots</h1>
                    <p style={styles.subtitle}>
                        {groupesSens.length} groupes de sens • Choisis un exercice
                    </p>
                </div>

                <div style={styles.exercicesGrid}>
                    <div style={styles.exerciceCard} onClick={demarrerKaraoke}>
                        <div style={styles.exerciceIcon}>🎤</div>
                        <h3 style={styles.exerciceTitle}>Karaoké</h3>
                        <p style={styles.exerciceDescription}>
                            Chaque mot s'illumine quand il est prononcé
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={demarrerRemettreOrdre}>
                        <div style={styles.exerciceIcon}>🔄</div>
                        <h3 style={styles.exerciceTitle}>Remettre dans l'ordre</h3>
                        <p style={styles.exerciceDescription}>
                            Les mots sont mélangés, remets-les dans l'ordre
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={demarrerOuEstCe}>
                        <div style={styles.exerciceIcon}>📍</div>
                        <h3 style={styles.exerciceTitle}>Où est-ce ?</h3>
                        <p style={styles.exerciceDescription}>
                            Écoute le mot et clique sur le bon mot écrit
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={demarrerQuestCe}>
                        <div style={styles.exerciceIcon}>🔊</div>
                        <h3 style={styles.exerciceTitle}>Qu'est-ce ?</h3>
                        <p style={styles.exerciceDescription}>
                            Un mot est illuminé, trouve le bon son
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={demarrerDecoupage}>
                        <div style={styles.exerciceIcon}>✂️</div>
                        <h3 style={styles.exerciceTitle}>Découpage</h3>
                        <p style={styles.exerciceDescription}>
                            Sépare les mots qui sont collés
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={() => router.push('/lire/ecoute-et-trouve')}>
                        <div style={styles.exerciceIcon}>🎯</div>
                        <h3 style={styles.exerciceTitle}>Écoute et trouve</h3>
                        <p style={styles.exerciceDescription}>
                            Écoute un mot et trouve-le parmi plusieurs choix
                        </p>
                    </div>

                    <div style={styles.exerciceCard} onClick={() => router.push('/lire/lis-et-trouve')}>
                        <div style={styles.exerciceIcon}>📖</div>
                        <h3 style={styles.exerciceTitle}>Lis et trouve</h3>
                        <p style={styles.exerciceDescription}>
                            Lis un mot et trouve le bon son parmi plusieurs audios
                        </p>
                    </div>
                </div>

                <div style={styles.actions}>
                    <button onClick={retourSelection} style={styles.secondaryButton}>
                        ← Changer de textes
                    </button>
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
                <div style={styles.header}>
                    <h1 style={styles.title}>🎤 Karaoké</h1>
                    <p style={styles.subtitle}>
                        Groupe {indexGroupe + 1} / {groupesSens.length}
                    </p>
                </div>

                <div style={styles.karaokeBox}>
                    {mots.map((mot, index) => (
                        <span
                            key={index}
                            style={{
                                ...styles.motKaraoke,
                                ...(motIllumineIndex === index ? styles.motIllumine : {})
                            }}
                        >
                            {mot}
                        </span>
                    ))}
                </div>

                <div style={styles.actions}>
                    <button onClick={jouerKaraoke} style={styles.primaryButton}>
                        ▶️ Jouer
                    </button>
                    <button onClick={groupeSuivantKaraoke} style={styles.secondaryButton}>
                        Groupe suivant →
                    </button>
                    <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                        ← Menu exercices
                    </button>
                </div>
            </div>
        )
    }

    // EXERCICE 2 : OÙ EST-CE ?
    if (exerciceActif === 'ou-est-ce' && motActuel && groupeActuel) {
        const motsAfficher = groupeActuel.motsDuGroupe || groupeActuel.contenu.trim().split(/\s+/).filter(mot => !/^[.,:;!?]+$/.test(mot))
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>📍 Où est-ce ?</h1>
                    <p style={styles.subtitle}>
                        Question {indexQuestion + 1} / {tousLesMots.length} • Score : {score.bonnes}/{score.total}
                    </p>
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                <div style={styles.questionBox}>
                    <p style={styles.consigne}>🔊 Écoute bien et clique sur le bon mot :</p>
                    <button
                        onClick={() => {
                            lireTTS('Où est')
                            setTimeout(() => {
                                lireTTS(`${motActuel} ?`)
                            }, 600)
                        }}
                        style={styles.ecouterButton}
                    >
                        🔊 Écouter la question
                    </button>
                </div>

                <div style={styles.motsGrid}>
                    {motsAfficher.map((mot, index) => (
                        <button
                            key={index}
                            onClick={() => verifierReponseOuEstCe(mot)}
                            disabled={feedback !== null}
                            style={{
                                ...styles.motButton,
                                ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                            }}
                        >
                            {mot}
                        </button>
                    ))}
                </div>

                <div style={styles.actions}>
                    <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                        ← Menu exercices
                    </button>
                </div>
            </div>
        )
    }

    // PAGE RÉSULTATS - OÙ EST-CE ?
    if (exerciceActif === 'ou-est-ce-resultats') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>📊 Résultats</h1>
                    <p style={styles.subtitle}>
                        Exercice : Où est-ce ?
                    </p>
                </div>

                <div style={styles.resultatsBox}>
                    <div style={styles.scoreGlobal}>
                        <div style={styles.scoreCircle}>
                            <span style={styles.scoreNumber}>{score.bonnes}</span>
                            <span style={styles.scoreSlash}>/</span>
                            <span style={styles.scoreTotal}>{score.total}</span>
                        </div>
                        <div style={styles.scorePourcentage}>
                            {Math.round((score.bonnes / score.total) * 100)}%
                        </div>
                    </div>

                    {resultats.reussis.length > 0 && (
                        <div style={styles.resultatsSection}>
                            <h2 style={styles.resultatsSectionTitle}>
                                ✅ Mots réussis ({resultats.reussis.length})
                            </h2>
                            <div style={styles.motsListeReussis}>
                                {resultats.reussis.map((mot, index) => (
                                    <span key={index} style={styles.motReussi}>
                                        {mot}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {resultats.rates.length > 0 && (
                        <div style={styles.resultatsSection}>
                            <h2 style={styles.resultatsSectionTitle}>
                                ❌ Mots ratés ({resultats.rates.length})
                            </h2>
                            <div style={styles.motsListeRates}>
                                {resultats.rates.map((mot, index) => (
                                    <span key={index} style={styles.motRate}>
                                        {mot}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

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
                    <h1 style={styles.title}>🔊 Qu'est-ce ?</h1>
                    <p style={styles.subtitle}>
                        Question {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                    </p>
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                <div style={styles.questionBox}>
                    <p style={styles.consigne}>Le mot illuminé est :</p>
                    <div style={styles.phraseBox}>
                        {mots.map((mot, index) => (
                            <span
                                key={index}
                                style={{
                                    ...styles.motPhrase,
                                    ...(mot === motActuel ? styles.motIllumine : {})
                                }}
                            >
                                {mot}
                            </span>
                        ))}
                    </div>
                    <p style={styles.consigne}>🔊 Écoute les sons et choisis le bon :</p>
                </div>

                <div style={styles.motsGrid}>
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
                    <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                        ← Menu exercices
                    </button>
                </div>
            </div>
        )
    }

    // EXERCICE 5 : REMETTRE DANS L'ORDRE
    if (exerciceActif === 'remettre-ordre' && groupeActuel) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🔄 Remettre dans l'ordre</h1>
                    <p style={styles.subtitle}>
                        Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                    </p>
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                <div style={styles.questionBox}>
                    <p style={styles.consigne}>
                        🔊 Écoute la phrase et remets les mots dans le bon ordre :
                    </p>
                    <button
                        onClick={() => lireTTS(groupeActuel.contenu)}
                        style={styles.ecouterButton}
                    >
                        🔊 Écouter la phrase
                    </button>
                </div>

                {/* Zone des mots sélectionnés (phrase en construction) */}
                <div style={styles.ordreSection}>
                    <h3 style={styles.ordreSectionTitle}>Ta phrase :</h3>
                    <div style={styles.phraseEnCours}>
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
                                        ...(feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                                    }}
                                >
                                    {mot} ✕
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Zone des mots disponibles (mélangés) */}
                <div style={styles.ordreSection}>
                    <h3 style={styles.ordreSectionTitle}>Mots disponibles :</h3>
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
                            ...(motsSelectionnes.length === 0 || feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                        }}
                    >
                        Vérifier
                    </button>
                    <button
                        onClick={() => {
                            setMotsDisponibles([...motsDisponibles, ...motsSelectionnes].sort(() => Math.random() - 0.5))
                            setMotsSelectionnes([])
                        }}
                        disabled={motsSelectionnes.length === 0 || feedback !== null}
                        style={{
                            ...styles.secondaryButton,
                            ...(motsSelectionnes.length === 0 || feedback ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                        }}
                    >
                        Réinitialiser
                    </button>
                    <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                        ← Menu exercices
                    </button>
                </div>
            </div>
        )
    }

    // PAGE RÉSULTATS - REMETTRE DANS L'ORDRE
    if (exerciceActif === 'remettre-ordre-resultats') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>📊 Résultats</h1>
                    <p style={styles.subtitle}>
                        Exercice : Remettre dans l'ordre
                    </p>
                </div>

                <div style={styles.resultatsBox}>
                    <div style={styles.scoreGlobal}>
                        <div style={styles.scoreCircle}>
                            <span style={styles.scoreNumber}>{score.bonnes}</span>
                            <span style={styles.scoreSlash}>/</span>
                            <span style={styles.scoreTotal}>{score.total}</span>
                        </div>
                        <div style={styles.scorePourcentage}>
                            {Math.round((score.bonnes / score.total) * 100)}%
                        </div>
                    </div>

                    {resultats.reussis.length > 0 && (
                        <div style={styles.resultatsSection}>
                            <h2 style={styles.resultatsSectionTitle}>
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
                        <div style={styles.resultatsSection}>
                            <h2 style={styles.resultatsSectionTitle}>
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

                <div style={styles.actions}>
                    <button
                        onClick={() => demarrerRemettreOrdre()}
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
            </div>
        )
    }

    // EXERCICE 4 : DÉCOUPAGE
    if (exerciceActif === 'decoupage' && groupeActuel) {
        const texteColle = groupeActuel.contenu.replace(/\s+/g, '')
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={styles.title}>✂️ Découpage</h1>
                    <p style={styles.subtitle}>
                        Phrase {indexGroupe + 1} / {groupesSens.length} • Score : {score.bonnes}/{score.total}
                    </p>
                </div>

                {feedback && (
                    <div style={{
                        ...styles.feedbackBox,
                        ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                    }}>
                        {feedback.message}
                    </div>
                )}

                <div style={styles.questionBox}>
                    <p style={styles.consigne}>Clique entre les lettres pour séparer les mots :</p>
                </div>

                <div style={styles.decoupageBox}>
                    {texteColle.split('').map((lettre, index) => (
                        <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span style={styles.lettre}>{lettre}</span>
                            {index < texteColle.length - 1 && (
                                <button
                                    onClick={() => toggleSeparation(index + 1)}
                                    style={{
                                        ...styles.separationButton,
                                        ...(separations.includes(index + 1) ? styles.separationButtonActive : {}),
                                        cursor: separations.includes(index + 1) ? 'pointer' : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ctext y=\'20\' font-size=\'20\'%3E✂️%3C/text%3E%3C/svg%3E") 12 12, crosshair'
                                    }}
                                    title={separations.includes(index + 1) ? "Cliquer pour annuler la séparation" : "Cliquer pour couper"}
                                >
                                    {separations.includes(index + 1) && (
                                        <span style={styles.separationBarre}>|</span>
                                    )}
                                </button>
                            )}
                        </span>
                    ))}
                </div>

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
                    <button onClick={() => setExerciceActif(null)} style={styles.secondaryButton}>
                        ← Menu exercices
                    </button>
                </div>
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
        margin: '0 0 8px 0'
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
        padding: '16px',
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
        gap: '12px',
        marginBottom: '8px'
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
    motKaraoke: {
        display: 'inline-block',
        margin: '0 8px',
        padding: '8px 16px',
        borderRadius: '8px',
        transition: 'all 0.3s'
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
