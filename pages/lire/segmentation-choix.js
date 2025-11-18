import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EnregistreurSyllabes from '../../components/EnregistreurSyllabes'

export default function SegmentationSyllabiqueTest() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [gameStarted, setGameStarted] = useState(false)
    const [allMots, setAllMots] = useState([])
    const [currentMotIndex, setCurrentMotIndex] = useState(0)
    const [cuts, setCuts] = useState([]) // Positions des coupures
    const [showEnregistreur, setShowEnregistreur] = useState(false)
    const [segmentationEnCours, setSegmentationEnCours] = useState([])
    const [completedMots, setCompletedMots] = useState([])
    const [motsSegmentes, setMotsSegmentes] = useState([]) // Résultats des segmentations
    const [isSaving, setIsSaving] = useState(false)
    const [showDoute, setShowDoute] = useState(false)
    const [messageDoute, setMessageDoute] = useState('')
    const [showResults, setShowResults] = useState(false) // Afficher page de résultats
    const [syllabesToRecord, setSyllabesToRecord] = useState([]) // Syllabes à enregistrer (pas déjà existantes)
    const [existingSyllabes, setExistingSyllabes] = useState({}) // Map des syllabes déjà enregistrées
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
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
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const startGame = async () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }

        try {
            const token = localStorage.getItem('token')
            let tousLesMultisyllabes = []

            for (const texteId of selectedTextes) {
                const response = await fetch(`/api/mots-classifies/multisyllabes?texteId=${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    tousLesMultisyllabes.push(...(data.multisyllabes || []))
                }
            }

            const multisyllabesUniques = [...new Set(tousLesMultisyllabes)]

            if (multisyllabesUniques.length === 0) {
                alert('Aucun mot multisyllabe trouvé')
                return
            }

            console.log(`📚 ${multisyllabesUniques.length} mots à segmenter`)

            const motsAvecIndex = multisyllabesUniques.map((mot, index) => ({
                id: index,
                contenu: mot
            }))

            setAllMots(motsAvecIndex)
            setCurrentMotIndex(0)
            setCuts([])
            setCompletedMots([])
            setGameStarted(true)
        } catch (error) {
            console.error('Erreur démarrage:', error)
            alert('Erreur lors du démarrage')
        }
    }

    const currentMot = allMots[currentMotIndex]

    // Calculer la segmentation en fonction des coupures
    const getSyllabesFromCuts = () => {
        if (!currentMot) return []

        const mot = currentMot.contenu
        const sortedCuts = [...cuts].sort((a, b) => a - b)

        const syllabes = []
        let lastCut = 0

        sortedCuts.forEach(cut => {
            syllabes.push(mot.substring(lastCut, cut))
            lastCut = cut
        })

        syllabes.push(mot.substring(lastCut))

        return syllabes.filter(s => s.length > 0)
    }

    const handleLetterClick = (index) => {
        // Toggle la coupure à cet index
        if (cuts.includes(index)) {
            setCuts(cuts.filter(c => c !== index))
        } else {
            setCuts([...cuts, index])
        }
    }

    const validerSegmentation = async () => {
        console.log('🔵 Début validerSegmentation')
        const syllabes = getSyllabesFromCuts()

        if (syllabes.length === 0) {
            alert('Veuillez segmenter le mot en cliquant entre les lettres')
            return
        }

        console.log('✂️ Segmentation validée:', syllabes.join('-'))

        // Vérifier quelles syllabes existent déjà
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/syllabes/check-existing', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ syllabes })
            })

            if (!response.ok) {
                console.error('Erreur vérification syllabes')
                // Continuer quand même
                setSegmentationEnCours(syllabes)
                setShowEnregistreur(true)
                return
            }

            const data = await response.json()
            console.log('📊 Vérification syllabes:', data.stats)

            // Séparer syllabes existantes et à enregistrer
            const existing = {}
            const toRecord = []

            data.syllabes.forEach(s => {
                if (s.exists) {
                    existing[s.syllabe] = s.audio_url
                    console.log(`✅ "${s.syllabe}" déjà enregistrée`)
                } else {
                    toRecord.push(s.syllabe)
                    console.log(`🎤 "${s.syllabe}" à enregistrer`)
                }
            })

            setExistingSyllabes(existing)
            setSyllabesToRecord(toRecord)
            setSegmentationEnCours(syllabes)

            // Ouvrir l'enregistreur (affichera les syllabes existantes différemment)
            if (toRecord.length === 0) {
                console.log('✅ Toutes les syllabes déjà enregistrées!')
            } else {
                console.log(`🎤 ${toRecord.length} syllabe(s) à enregistrer: ${toRecord.join(', ')}`)
            }
            setShowEnregistreur(true)

        } catch (error) {
            console.error('Erreur vérification syllabes:', error)
            // Continuer quand même
            setSegmentationEnCours(syllabes)
            setShowEnregistreur(true)
        }
    }

    const handleEnregistrementsComplete = async (result) => {
        setShowEnregistreur(false)
        setIsSaving(true)

        try {
            const token = localStorage.getItem('token')
            const formData = new FormData()

            // result = {syllabes: [...], syllabesModifiees: [...], actions: [...], audios: [...]}
            const { syllabes, syllabesModifiees, actions, audios } = result

            formData.append('mot', currentMot.contenu)
            formData.append('segmentation', JSON.stringify(syllabes))
            formData.append('syllabesModifiees', JSON.stringify(syllabesModifiees)) // NOUVEAU

            // Ajouter tous les fichiers audio (null si jeté)
            audios.forEach((blob, index) => {
                if (blob) { // Seulement si pas jeté
                    formData.append('audio', blob, `syllabe_${index}.webm`)
                }
            })

            // Ajouter les actions pour que l'API sache quelles syllabes ont été jetées/modifiées
            formData.append('actions', JSON.stringify(actions))

            const response = await fetch('/api/enregistrements-syllabes/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Segmentation sauvegardée:', data)

                // Stocker le résultat pour l'affichage final
                const resultat = {
                    mot: currentMot.contenu,
                    syllabes: syllabes,
                    syllabesModifiees: syllabesModifiees,
                    actions: actions
                }
                setMotsSegmentes([...motsSegmentes, resultat])

                // Passer au mot suivant
                setCompletedMots([...completedMots, currentMot.id])
                passerMotSuivant()
            } else {
                const error = await response.json()
                console.error('❌ Erreur sauvegarde:', error)
                alert('Erreur lors de la sauvegarde: ' + (error.error || 'Erreur inconnue'))
                setIsSaving(false)
            }
        } catch (error) {
            console.error('💥 Erreur:', error)
            alert('Erreur lors de la sauvegarde')
            setIsSaving(false)
        }
    }

    const passerMotSuivant = () => {
        setCuts([])
        setSegmentationEnCours([])
        setIsSaving(false)

        if (currentMotIndex + 1 < allMots.length) {
            setCurrentMotIndex(currentMotIndex + 1)
        } else {
            // Tous les mots sont terminés, afficher la page de résultats
            setShowResults(true)
        }
    }

    const envoyerDemandeDoute = async () => {
        const syllabes = getSyllabesFromCuts()

        if (syllabes.length === 0) {
            alert('Veuillez d\'abord segmenter le mot')
            return
        }

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-syllabes/demande-doute', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mot: currentMot.contenu,
                    segmentation_proposee: syllabes,
                    message_doute: messageDoute || null
                })
            })

            if (response.ok) {
                alert('✅ Demande envoyée à l\'admin !')
                setShowDoute(false)
                setMessageDoute('')
            } else {
                const error = await response.json()
                alert('Erreur: ' + (error.error || 'Erreur inconnue'))
            }
        } catch (error) {
            console.error('Erreur envoi doute:', error)
            alert('Erreur lors de l\'envoi de la demande')
        }
    }

    if (isLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>
    }

    if (!gameStarted) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>
                    ✂️ Segmentation Syllabique (TEST)
                </h1>

                <div style={{
                    padding: '15px',
                    backgroundColor: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <strong>⚠️ Page de test</strong> - Nouveau système de segmentation personnalisée
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '10px' }}>Sélectionne tes textes</h3>
                    {textes.map(texte => (
                        <label
                            key={texte.id}
                            style={{
                                display: 'block',
                                padding: '10px',
                                marginBottom: '5px',
                                backgroundColor: selectedTextes.includes(texte.id) ? '#dbeafe' : '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedTextes.includes(texte.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedTextes([...selectedTextes, texte.id])
                                    } else {
                                        setSelectedTextes(selectedTextes.filter(id => id !== texte.id))
                                    }
                                }}
                                style={{ marginRight: '10px' }}
                            />
                            {texte.titre}
                        </label>
                    ))}
                </div>

                <button
                    onClick={startGame}
                    disabled={selectedTextes.length === 0}
                    style={{
                        width: '100%',
                        padding: '15px',
                        backgroundColor: selectedTextes.length > 0 ? '#3b82f6' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed'
                    }}
                >
                    🚀 Commencer la segmentation
                </button>
            </div>
        )
    }

    // Page de résultats
    if (showResults) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px'
            }}>
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                }}>
                    <h1 style={{
                        textAlign: 'center',
                        color: '#1f2937',
                        marginBottom: '10px'
                    }}>
                        🎉 Segmentation terminée !
                    </h1>

                    <p style={{
                        textAlign: 'center',
                        color: '#6b7280',
                        marginBottom: '30px'
                    }}>
                        Voici tous les mots que tu as segmentés :
                    </p>

                    {/* Liste des mots segmentés */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                    }}>
                        {motsSegmentes.map((item, index) => {
                            // Construire l'affichage des syllabes
                            const syllabesAffichees = item.syllabes.map((syllabe, idx) => {
                                const action = item.actions[idx]
                                const modifiee = item.syllabesModifiees[idx]

                                if (action === 'jeter') {
                                    return null // Ne pas afficher les syllabes jetées
                                }

                                if (action === 'modifier') {
                                    return `${syllabe} → ${modifiee}`
                                }

                                return syllabe
                            }).filter(s => s !== null)

                            return (
                                <div
                                    key={index}
                                    style={{
                                        padding: '20px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: '#1f2937',
                                        marginBottom: '10px'
                                    }}>
                                        {index + 1}. {item.mot}
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        color: '#3b82f6',
                                        fontWeight: 'bold'
                                    }}>
                                        {syllabesAffichees.join(' - ')}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Boutons */}
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        marginTop: '30px'
                    }}>
                        <button
                            onClick={() => {
                                setShowResults(false)
                                setGameStarted(false)
                                setMotsSegmentes([])
                                setCompletedMots([])
                                setCurrentMotIndex(0)
                            }}
                            style={{
                                flex: 1,
                                padding: '15px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Nouvelle segmentation
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{
                                flex: 1,
                                padding: '15px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ✅ Retour au tableau de bord
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Interface de segmentation
    const syllabes = getSyllabesFromCuts()
    const motLetters = currentMot.contenu.split('')

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#1f2937', marginBottom: '10px' }}>
                    ✂️ Segmente ton mot
                </h1>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Mot {currentMotIndex + 1} sur {allMots.length} • {completedMots.length} terminés
                </div>
            </div>

            {/* Progression */}
            <div style={{
                marginBottom: '30px',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${((currentMotIndex + 1) / allMots.length) * 100}%`,
                    backgroundColor: '#3b82f6',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            {/* Mot avec interface de coupure */}
            <div style={{
                marginBottom: '30px',
                padding: '30px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '2px solid #e5e7eb'
            }}>
                <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    marginBottom: '15px',
                    textAlign: 'center'
                }}>
                    Clique entre les lettres pour découper :
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#1f2937'
                }}>
                    {motLetters.map((letter, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span>{letter}</span>
                            {index < motLetters.length - 1 && (
                                <button
                                    onClick={() => handleLetterClick(index + 1)}
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        margin: '0 2px',
                                        backgroundColor: cuts.includes(index + 1) ? '#ef4444' : 'transparent',
                                        border: cuts.includes(index + 1) ? '2px solid #dc2626' : '2px dashed #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {cuts.includes(index + 1) ? '✂️' : ''}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Aperçu segmentation */}
                {syllabes.length > 0 && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#dbeafe',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '5px' }}>
                            Ta segmentation :
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>
                            {syllabes.join(' - ')}
                        </div>
                    </div>
                )}
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {/* NOUVEAU : Bouton Panier Sons Complexes */}
                <button
                    onClick={async () => {
                        if (!confirm(`Mettre "${currentMot.contenu}" dans le panier des sons complexes ?\n\nCe mot ne sera pas segmenté.`)) return

                        try {
                            const token = localStorage.getItem('token')
                            const response = await fetch('/api/mots-sons-complexes/add', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    mot: currentMot.contenu,
                                    raison: null
                                })
                            })

                            if (response.ok) {
                                alert(`✅ "${currentMot.contenu}" ajouté au panier sons complexes !`)
                                passerMotSuivant()
                            } else {
                                const error = await response.json()
                                alert('Erreur: ' + (error.error || 'Erreur inconnue'))
                            }
                        } catch (error) {
                            console.error('Erreur:', error)
                            alert('Erreur lors de l\'ajout au panier')
                        }
                    }}
                    disabled={isSaving}
                    style={{
                        padding: '15px',
                        backgroundColor: !isSaving ? '#f59e0b' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: !isSaving ? 'pointer' : 'not-allowed'
                    }}
                >
                    📦 Mettre dans panier sons complexes (ne pas segmenter)
                </button>

                <button
                    onClick={validerSegmentation}
                    disabled={syllabes.length === 0 || isSaving}
                    style={{
                        padding: '15px',
                        backgroundColor: syllabes.length > 0 && !isSaving ? '#10b981' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: syllabes.length > 0 && !isSaving ? 'pointer' : 'not-allowed'
                    }}
                >
                    {isSaving ? '💾 Sauvegarde...' : '✅ Valider et enregistrer mes syllabes'}
                </button>

                <button
                    onClick={() => setShowDoute(true)}
                    disabled={syllabes.length === 0}
                    style={{
                        padding: '12px',
                        backgroundColor: syllabes.length > 0 ? '#f59e0b' : '#d1d5db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: syllabes.length > 0 ? 'pointer' : 'not-allowed'
                    }}
                >
                    ❓ J'ai un doute - Demander l'avis de l'admin
                </button>

                <button
                    onClick={() => setCuts([])}
                    style={{
                        padding: '12px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Recommencer ce mot
                </button>
            </div>

            {/* Modal Enregistreur Syllabes */}
            {showEnregistreur && (
                <EnregistreurSyllabes
                    syllabes={segmentationEnCours}
                    mot={currentMot.contenu}
                    existingSyllabes={existingSyllabes}
                    onComplete={handleEnregistrementsComplete}
                    onCancel={() => {
                        setShowEnregistreur(false)
                        setIsSaving(false)
                    }}
                />
            )}

            {/* Modal Demande de Doute */}
            {showDoute && (
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
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '100%'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
                            ❓ Demande d'aide à l'admin
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <strong>Mot :</strong> {currentMot.contenu}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <strong>Ta segmentation :</strong> {syllabes.join(' - ')}
                        </div>

                        <textarea
                            value={messageDoute}
                            onChange={(e) => setMessageDoute(e.target.value)}
                            placeholder="Pourquoi as-tu un doute ? (optionnel)"
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                marginBottom: '15px',
                                resize: 'vertical'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowDoute(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={envoyerDemandeDoute}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Envoyer à l'admin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
