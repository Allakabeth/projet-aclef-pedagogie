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
    const [motEnCours, setMotEnCours] = useState(null) // Mot en cours d'enregistrement
    const [showRecorder, setShowRecorder] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Progression
    const [statsProgression, setStatsProgression] = useState({ enregistres: 0, total: 0 })

    // ========================================================================
    // 1. AUTHENTIFICATION
    // ========================================================================

    useEffect(() => {
        checkAuth()
    }, [router])

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
                console.log(`🎤 ${data.count} enregistrement(s) chargé(s)`)
                setEnregistrementsMap(data.enregistrementsMap || {})
            } else {
                console.error('Erreur chargement enregistrements')
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
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

            const groupes = data || []
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

                // Recharger les enregistrements
                await loadEnregistrements()

                // Recalculer progression
                calculerProgression()

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
                <div style={styles.header}>
                    <h1 style={styles.title}>🎤 Ma voix, mes mots</h1>
                    <p style={styles.subtitle}>
                        Groupe {indexGroupe + 1} / {groupesSens.length}
                    </p>
                </div>

                {/* Barre de progression globale */}
                <div style={styles.progressionBox}>
                    <div style={styles.progressionText}>
                        📊 Progression : {statsProgression.enregistres} / {statsProgression.total} mots ({pourcentage}%)
                    </div>
                    <div style={styles.progressBarContainer}>
                        <div
                            style={{
                                ...styles.progressBarFill,
                                width: `${pourcentage}%`
                            }}
                        />
                    </div>
                </div>

                {/* Affichage du groupe de sens */}
                <div style={styles.groupeBox}>
                    <h3 style={styles.groupeTitle}>📝 Groupe de sens :</h3>
                    <p style={styles.groupeContenu}>{groupeActuel.contenu}</p>
                </div>

                {/* Liste des mots à enregistrer */}
                <div style={styles.motsSection}>
                    <h3 style={styles.motsSectionTitle}>
                        Enregistre chaque mot ({motsUniques.length} mots) :
                    </h3>
                    <div style={styles.motsGrid}>
                        {motsUniques.map((mot, index) => {
                            const motNormalized = mot.toLowerCase().trim()
                            const dejaEnregistre = !!enregistrementsMap[motNormalized]

                            return (
                                <div key={index} style={styles.motCard}>
                                    <div style={styles.motTexte}>{mot}</div>

                                    {dejaEnregistre ? (
                                        <div style={styles.motActions}>
                                            <span style={styles.motStatut}>✅ Enregistré</span>
                                            <button
                                                onClick={() => rejouerEnregistrement(mot)}
                                                style={styles.ecouterButton}
                                            >
                                                🔊 Écouter
                                            </button>
                                            <button
                                                onClick={() => ouvrirEnregistreur(mot)}
                                                disabled={isUploading}
                                                style={{
                                                    ...styles.reEnregistrerButton,
                                                    opacity: isUploading ? 0.5 : 1
                                                }}
                                            >
                                                🎤 Réenregistrer
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => ouvrirEnregistreur(mot)}
                                            disabled={isUploading}
                                            style={{
                                                ...styles.enregistrerButton,
                                                opacity: isUploading ? 0.5 : 1
                                            }}
                                        >
                                            🎤 Enregistrer
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

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
                            <button
                                onClick={() => {
                                    setShowRecorder(false)
                                    setMotEnCours(null)
                                }}
                                style={styles.modalCancelButton}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                )}

                {/* Message d'upload */}
                {isUploading && (
                    <div style={styles.uploadingBox}>
                        📤 Upload en cours...
                    </div>
                )}

                {/* Navigation */}
                <div style={styles.actions}>
                    <button
                        onClick={groupePrecedent}
                        disabled={indexGroupe === 0}
                        style={{
                            ...styles.secondaryButton,
                            opacity: indexGroupe === 0 ? 0.5 : 1
                        }}
                    >
                        ← Groupe précédent
                    </button>

                    {indexGroupe < groupesSens.length - 1 ? (
                        <button
                            onClick={groupeSuivant}
                            style={styles.primaryButton}
                        >
                            Groupe suivant →
                        </button>
                    ) : (
                        <button
                            onClick={terminerExercice}
                            style={styles.primaryButton}
                        >
                            ✓ Terminer
                        </button>
                    )}

                    <button
                        onClick={retourSelection}
                        style={styles.secondaryButton}
                    >
                        ← Changer de texte
                    </button>
                </div>
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
        color: '#ef4444',
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
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
    },
    progressionText: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '12px',
        textAlign: 'center'
    },
    progressBarContainer: {
        width: '100%',
        height: '24px',
        backgroundColor: '#e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10b981',
        transition: 'width 0.3s ease'
    },
    groupeBox: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
    },
    groupeTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '12px'
    },
    groupeContenu: {
        fontSize: '20px',
        lineHeight: '1.6',
        color: '#555'
    },
    motsSection: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
    },
    motsSectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
    },
    motsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
    },
    motCard: {
        padding: '16px',
        backgroundColor: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    motTexte: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center'
    },
    motActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    motStatut: {
        fontSize: '14px',
        color: '#10b981',
        fontWeight: '600',
        textAlign: 'center'
    },
    ecouterButton: {
        padding: '8px 12px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    reEnregistrerButton: {
        padding: '8px 12px',
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    enregistrerButton: {
        padding: '12px 16px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer'
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
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: '24px'
    },
    primaryButton: {
        padding: '12px 24px',
        backgroundColor: '#ef4444',
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
