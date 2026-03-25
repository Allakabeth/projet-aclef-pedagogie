import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function VoirPaniers() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [paniers, setPaniers] = useState({})
    const [rawPaniers, setRawPaniers] = useState({})
    const [motsTraites, setMotsTraites] = useState([])
    const [totalMots, setTotalMots] = useState(0)
    const [selectedLetter, setSelectedLetter] = useState('A')
    const [editingWord, setEditingWord] = useState(null)
    const [editCuts, setEditCuts] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    // Étape 2 : enregistrement audio
    const [editStep, setEditStep] = useState(1)
    const [existingSyllabesAudio, setExistingSyllabesAudio] = useState({})
    const [newRecordings, setNewRecordings] = useState({})
    const [recordingIndex, setRecordingIndex] = useState(null)
    const [playingIndex, setPlayingIndex] = useState(null)
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])
    const streamRef = useRef(null)
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
        loadPaniers()
    }, [router])

    const loadPaniers = async () => {
        try {
            const token = localStorage.getItem('token')

            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()

                // Garder les données brutes pour la sauvegarde
                setRawPaniers(data.paniers || {})
                setMotsTraites(data.motsTraites || [])

                // Transformer la structure des paniers : paniers[lettre][nom_panier] = [syllabes]
                // vers : paniers[lettre] = [{nom: nom_panier, mots: [syllabes]}]
                const transformedPaniers = {}
                Object.keys(data.paniers || {}).forEach(lettre => {
                    transformedPaniers[lettre] = []
                    Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                        transformedPaniers[lettre].push({
                            nom: nomPanier,
                            mots: data.paniers[lettre][nomPanier] || []
                        })
                    })
                })

                setPaniers(transformedPaniers)
                
                // Calculer le nombre total de mots avec la nouvelle structure
                const total = Object.values(transformedPaniers).reduce((acc, letterPaniers) => {
                    return acc + letterPaniers.reduce((letterAcc, panier) => {
                        return letterAcc + (panier.mots ? panier.mots.length : 0)
                    }, 0)
                }, 0)
                setTotalMots(total)
            }
        } catch (error) {
            console.error('Erreur chargement paniers:', error)
        }
    }



    // Sélectionner automatiquement la première lettre avec des paniers
    useEffect(() => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AUTRES'])
        const firstLetterWithPaniers = alphabet.find(letter => paniers[letter] && paniers[letter].length > 0)
        if (firstLetterWithPaniers && (!paniers[selectedLetter] || paniers[selectedLetter].length === 0)) {
            setSelectedLetter(firstLetterWithPaniers)
        }
    }, [paniers, selectedLetter])

    // === Fonctions d'édition de segmentation ===

    const openEditModal = (motData) => {
        if (!motData || !motData.segmentation) return
        const mot = motData.segmentation.join('')
        const cuts = []
        let pos = 0
        for (let i = 0; i < motData.segmentation.length - 1; i++) {
            pos += motData.segmentation[i].length
            cuts.push(pos)
        }
        setEditingWord({ mot, originalSegmentation: motData.segmentation })
        setEditCuts(cuts)
        setEditStep(1)
        setExistingSyllabesAudio({})
        setNewRecordings({})
        setRecordingIndex(null)
    }

    const closeEditModal = () => {
        stopRecording()
        setEditingWord(null)
        setEditCuts([])
        setEditStep(1)
        setExistingSyllabesAudio({})
        setNewRecordings({})
        setRecordingIndex(null)
    }

    const toggleCut = (position) => {
        setEditCuts(prev =>
            prev.includes(position)
                ? prev.filter(c => c !== position)
                : [...prev, position].sort((a, b) => a - b)
        )
    }

    const getPreviewSyllables = () => {
        if (!editingWord) return []
        const mot = editingWord.mot
        const sortedCuts = [...editCuts].sort((a, b) => a - b)
        const syllables = []
        let start = 0
        for (const cut of sortedCuts) {
            syllables.push(mot.slice(start, cut))
            start = cut
        }
        syllables.push(mot.slice(start))
        return syllables
    }

    // Passer à l'étape 2 : vérifier les enregistrements existants
    const goToRecordingStep = async () => {
        const syllables = getPreviewSyllables()
        const token = localStorage.getItem('token')

        try {
            const response = await fetch('/api/enregistrements-syllabes/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ syllabes: syllables })
            })

            if (response.ok) {
                const data = await response.json()
                setExistingSyllabesAudio(data.existing || {})
            }
        } catch (err) {
            console.warn('Vérification audio ignorée:', err)
        }

        setEditStep(2)
    }

    // === Enregistrement audio ===

    const startRecording = async (index) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            audioChunksRef.current = []

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus' : 'audio/webm'
            })

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setNewRecordings(prev => ({ ...prev, [index]: blob }))
                setRecordingIndex(null)
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop())
                    streamRef.current = null
                }
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start()
            setRecordingIndex(index)
        } catch (err) {
            alert('Impossible d\'accéder au microphone')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setRecordingIndex(null)
    }

    const playAudio = (index) => {
        const syllables = getPreviewSyllables()
        const syllabeNorm = syllables[index].toLowerCase().trim()
            
        let audioSrc = null
        if (newRecordings[index]) {
            audioSrc = URL.createObjectURL(newRecordings[index])
        } else if (existingSyllabesAudio[syllabeNorm]) {
            audioSrc = existingSyllabesAudio[syllabeNorm]
        }

        if (audioSrc) {
            setPlayingIndex(index)
            const audio = new Audio(audioSrc)
            audio.onended = () => setPlayingIndex(null)
            audio.onerror = () => setPlayingIndex(null)
            audio.play().catch(() => setPlayingIndex(null))
        }
    }

    const removeRecording = (index) => {
        setNewRecordings(prev => {
            const updated = { ...prev }
            delete updated[index]
            return updated
        })
    }

    // === Sauvegarde complète ===

    const saveNewSegmentation = async () => {
        if (!editingWord || editCuts.length === 0) return

        setIsSaving(true)
        try {
            const mot = editingWord.mot.toLowerCase()
            const newSegmentation = getPreviewSyllables()
            const token = localStorage.getItem('token')

            // === 1. Mettre à jour les paniers ===
            const updatedPaniers = JSON.parse(JSON.stringify(rawPaniers))

            // Supprimer le mot de tous les paniers
            Object.keys(updatedPaniers).forEach(lettre => {
                Object.keys(updatedPaniers[lettre]).forEach(nomPanier => {
                    updatedPaniers[lettre][nomPanier] = updatedPaniers[lettre][nomPanier].filter(item => {
                        if (typeof item === 'object' && item.mot && item.mot.toLowerCase() === mot) return false
                        return true
                    })
                    if (updatedPaniers[lettre][nomPanier].length === 0) delete updatedPaniers[lettre][nomPanier]
                })
                if (Object.keys(updatedPaniers[lettre]).length === 0) delete updatedPaniers[lettre]
            })

            // Ajouter avec la nouvelle segmentation
            newSegmentation.forEach((syllabe, index) => {
                const syllabeNorm = syllabe.toLowerCase()
                const premiereLettre = syllabeNorm.charAt(0).toUpperCase()
                if (!updatedPaniers[premiereLettre]) updatedPaniers[premiereLettre] = {}
                if (!updatedPaniers[premiereLettre][syllabeNorm]) updatedPaniers[premiereLettre][syllabeNorm] = []
                updatedPaniers[premiereLettre][syllabeNorm].push({
                    mot: mot,
                    segmentation: newSegmentation.map(s => s.toLowerCase()),
                    syllabeCiblee: syllabeNorm,
                    indexSyllabeCiblee: index
                })
            })

            await fetch('/api/paniers/sauvegarder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ paniers: updatedPaniers, motsTraites: motsTraites })
            })

            // === 2. Sauvegarder les enregistrements audio si on en a ===
            const hasNewRecordings = Object.keys(newRecordings).length > 0

            if (hasNewRecordings) {
                // Supprimer l'ancien enregistrement mot-level
                try {
                    const motNormalise = mot.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const listResp = await fetch('/api/enregistrements-syllabes/list', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (listResp.ok) {
                        const listData = await listResp.json()
                        const existing = listData.segmentationsMap?.[motNormalise]
                        if (existing) {
                            await fetch(`/api/enregistrements-syllabes/delete/${existing.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                        }
                    }
                } catch (e) { /* ignorer */ }

                // Préparer le FormData pour le save
                const formData = new FormData()
                formData.append('mot', editingWord.mot)
                formData.append('segmentation', JSON.stringify(newSegmentation))

                const actions = []
                const syllabesModifiees = newSegmentation.map(() => null)

                newSegmentation.forEach((syllabe, index) => {
                    const syllabeNorm = syllabe.toLowerCase().trim()
                        
                    if (newRecordings[index]) {
                        actions.push('enregistrer')
                        formData.append('audio', newRecordings[index], `syllabe_${index}.webm`)
                    } else if (existingSyllabesAudio[syllabeNorm]) {
                        actions.push('existing')
                    } else {
                        actions.push('jeter')
                    }
                })

                formData.append('actions', JSON.stringify(actions))
                formData.append('syllabesModifiees', JSON.stringify(syllabesModifiees))

                await fetch('/api/enregistrements-syllabes/save', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                })
            }

            closeEditModal()
            await loadPaniers()
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('Erreur lors de la sauvegarde')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#84cc16', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AUTRES', 'SONS_COMPLEXES', 'RESEGMENTATION'])
    const lettresAvecPaniers = alphabet.filter(letter => paniers[letter] && paniers[letter].length > 0)

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '10px'
                    }}>
                        🗂️ Mes Paniers de Syllabes
                    </h1>
                    <p style={{ color: '#666', fontSize: '16px' }}>
                        Consultez l'organisation de vos syllabes par textes
                    </p>
                </div>

                {/* Résumé */}
                {Object.keys(paniers).length > 0 && (
                    <div style={{
                        background: '#e0f2fe',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#0369a1'
                        }}>
                            📊 {lettresAvecPaniers.length} lettres • {Object.values(paniers).reduce((acc, letterPaniers) => acc + letterPaniers.length, 0)} paniers • {totalMots} mots organisés
                        </div>
                    </div>
                )}

                {/* Navigation alphabet */}
                {Object.keys(paniers).length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ color: '#333', marginBottom: '15px', textAlign: 'center' }}>🔤 Choisissez une lettre</h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
                            gap: '10px',
                            maxWidth: '800px',
                            margin: '0 auto'
                        }}>
                            {alphabet.map(letter => {
                                const hasData = paniers[letter] && paniers[letter].length > 0
                                const isSelected = selectedLetter === letter
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => setSelectedLetter(letter)}
                                        disabled={!hasData}
                                        style={{
                                            padding: '12px 8px',
                                            borderRadius: '8px',
                                            border: isSelected ? '3px solid #84cc16' : hasData ? '2px solid #e5e7eb' : '2px solid #f3f4f6',
                                            background: isSelected ? '#dcfce7' : hasData ? 'white' : '#f9fafb',
                                            color: isSelected ? '#16a34a' : hasData ? '#333' : '#9ca3af',
                                            fontWeight: isSelected ? 'bold' : hasData ? 'normal' : 'normal',
                                            cursor: hasData ? 'pointer' : 'not-allowed',
                                            fontSize: '16px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {letter === 'RESEGMENTATION' ? '✂️' : letter === 'SONS_COMPLEXES' ? '🤔' : letter === 'AUTRES' ? '✦' : letter}
                                        {hasData && (
                                            <div style={{ fontSize: '10px', color: '#84cc16' }}>
                                                {paniers[letter].length}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Affichage des paniers de la lettre sélectionnée */}
                {paniers[selectedLetter] && paniers[selectedLetter].length > 0 ? (
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: selectedLetter === 'SONS_COMPLEXES' ? '#c2410c' : '#84cc16',
                            marginBottom: '15px',
                            textAlign: 'center',
                            background: selectedLetter === 'SONS_COMPLEXES' ? '#fed7aa' : '#f0f9ff',
                            padding: '10px',
                            borderRadius: '8px'
                        }}>
                            {selectedLetter === 'RESEGMENTATION' ? '✂️ RESEGMENTATION' :
                             selectedLetter === 'SONS_COMPLEXES' ? '🤔 SONS COMPLEXES' : 
                             selectedLetter === 'AUTRES' ? '🔤 AUTRES' : 
                             `🔤 ${selectedLetter}`}
                            <div style={{ fontSize: '16px', color: '#666', marginTop: '5px' }}>
                                {paniers[selectedLetter].length} panier{paniers[selectedLetter].length > 1 ? 's' : ''}
                            </div>
                        </h2>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '15px'
                        }}>
                            {paniers[selectedLetter].map((panier, index) => (
                                <div key={index} style={{
                                    background: '#fefce8',
                                    border: '2px solid #84cc16',
                                    borderRadius: '8px',
                                    padding: '15px'
                                }}>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        color: '#365314',
                                        marginBottom: '10px'
                                    }}>
                                        📂 {panier.nom} ({panier.mots ? panier.mots.length : 0} mots)
                                    </h3>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px'
                                    }}>
                                        {(panier.mots || []).map((motData, motIndex) => {
                                            // Gérer les deux formats : ancien (string) et nouveau (objet)
                                            if (typeof motData === 'string') {
                                                // Ancien format : simple syllabe
                                                return (
                                                    <span key={motIndex} style={{
                                                        background: '#84cc16',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {motData}
                                                    </span>
                                                )
                                            } else if (motData && motData.segmentation) {
                                                // Nouveau format : objet avec mot et colorisation
                                                return (
                                                    <span
                                                        key={motIndex}
                                                        onClick={() => openEditModal(motData)}
                                                        title="Cliquer pour modifier la segmentation"
                                                        style={{
                                                            background: '#f3f4f6',
                                                            border: '2px solid #84cc16',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#16a34a' }}
                                                        onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#84cc16' }}
                                                    >
                                                        {motData.segmentation.map((syllabe, index) => (
                                                            <span
                                                                key={index}
                                                                style={{
                                                                    color: index === motData.indexSyllabeCiblee ? '#16a34a' : '#666',
                                                                    fontWeight: index === motData.indexSyllabeCiblee ? 'bold' : 'normal'
                                                                }}
                                                            >
                                                                {syllabe}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )
                                            } else {
                                                // Données corrompues
                                                return (
                                                    <span key={motIndex} style={{
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        Erreur
                                                    </span>
                                                )
                                            }
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
                        <h3 style={{ color: '#666', marginBottom: '10px' }}>Aucun panier trouvé</h3>
                        <p style={{ color: '#999' }}>
                            Commencez par organiser vos syllabes dans l'exercice "Mes Syllabes"
                        </p>
                    </div>
                )}

                {/* Modale de re-segmentation */}
                {editingWord && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                        onClick={(e) => { if (e.target === e.currentTarget) closeEditModal() }}
                    >
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '20px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '100%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}>

                            {/* === ÉTAPE 1 : Couper le mot === */}
                            {editStep === 1 && (<>
                                <h2 style={{ fontSize: '22px', color: '#333', marginBottom: '8px', textAlign: 'center' }}>
                                    Modifier la segmentation
                                </h2>
                                <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '25px' }}>
                                    Cliquez entre les lettres pour couper ou retirer une coupe
                                </p>

                                {/* Zone de coupe */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexWrap: 'wrap', padding: '20px', background: '#f8fafc',
                                    borderRadius: '12px', marginBottom: '20px', minHeight: '80px'
                                }}>
                                    {editingWord.mot.split('').map((letter, index) => (
                                        <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#333', userSelect: 'none' }}>
                                                {letter}
                                            </span>
                                            {index < editingWord.mot.length - 1 && (
                                                <button
                                                    onClick={() => toggleCut(index + 1)}
                                                    style={{
                                                        width: editCuts.includes(index + 1) ? '4px' : '20px',
                                                        height: '50px', border: 'none',
                                                        background: editCuts.includes(index + 1) ? '#ef4444' : 'transparent',
                                                        cursor: 'pointer', borderRadius: '2px',
                                                        transition: 'all 0.2s ease', padding: 0, margin: '0 2px', position: 'relative'
                                                    }}
                                                    title={editCuts.includes(index + 1) ? 'Retirer la coupe' : 'Couper ici'}
                                                >
                                                    {!editCuts.includes(index + 1) && (
                                                        <span style={{
                                                            position: 'absolute', top: '50%', left: '50%',
                                                            transform: 'translate(-50%, -50%)', color: '#ccc', fontSize: '16px', fontWeight: 'bold'
                                                        }}>|</span>
                                                    )}
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* Aperçu */}
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                                        Résultat : {editCuts.length === 0 ? '(aucune coupe)' : ''}
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {getPreviewSyllables().map((syllabe, index) => (
                                            <span key={index} style={{
                                                background: '#dcfce7', border: '2px solid #16a34a', color: '#16a34a',
                                                padding: '8px 16px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold'
                                            }}>{syllabe}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Segmentation actuelle */}
                                <div style={{ textAlign: 'center', marginBottom: '25px', padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
                                    <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '6px' }}>Segmentation actuelle :</p>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {editingWord.originalSegmentation.map((syllabe, index) => (
                                            <span key={index} style={{
                                                background: '#fde68a', color: '#92400e', padding: '4px 10px',
                                                borderRadius: '6px', fontSize: '16px', fontWeight: 'bold'
                                            }}>{syllabe}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Boutons étape 1 */}
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        onClick={goToRecordingStep}
                                        disabled={editCuts.length === 0}
                                        style={{
                                            background: editCuts.length === 0 ? '#d1d5db' : '#16a34a',
                                            color: 'white', padding: '12px 24px', border: 'none',
                                            borderRadius: '10px', fontSize: '16px', fontWeight: 'bold',
                                            cursor: editCuts.length === 0 ? 'not-allowed' : 'pointer'
                                        }}
                                    >Continuer</button>
                                    <button
                                        onClick={closeEditModal}
                                        style={{
                                            background: '#6b7280', color: 'white', padding: '12px 24px',
                                            border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >Annuler</button>
                                </div>
                            </>)}

                            {/* === ÉTAPE 2 : Enregistrer les syllabes === */}
                            {editStep === 2 && (<>
                                <h2 style={{ fontSize: '22px', color: '#333', marginBottom: '8px', textAlign: 'center' }}>
                                    Enregistrer les syllabes
                                </h2>
                                <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '25px' }}>
                                    Enregistrez les nouvelles syllabes (optionnel)
                                </p>

                                {/* Liste des syllabes avec état audio */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                                    {getPreviewSyllables().map((syllabe, index) => {
                                        const syllabeNorm = syllabe.toLowerCase().trim()
                                                                                    const hasExisting = !!existingSyllabesAudio[syllabeNorm]
                                        const hasNewRec = !!newRecordings[index]
                                        const hasAudio = hasExisting || hasNewRec
                                        const isRec = recordingIndex === index
                                        const isPlaying = playingIndex === index

                                        return (
                                            <div key={index} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', borderRadius: '12px',
                                                background: hasAudio ? '#f0fdf4' : '#fefce8',
                                                border: `2px solid ${hasAudio ? '#86efac' : '#fde68a'}`
                                            }}>
                                                {/* Syllabe */}
                                                <span style={{
                                                    fontSize: '22px', fontWeight: 'bold', color: '#333',
                                                    minWidth: '80px', textAlign: 'center'
                                                }}>{syllabe}</span>

                                                {/* Statut */}
                                                <span style={{
                                                    fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                                                    background: hasNewRec ? '#dcfce7' : hasExisting ? '#dbeafe' : '#fef3c7',
                                                    color: hasNewRec ? '#16a34a' : hasExisting ? '#2563eb' : '#92400e',
                                                    fontWeight: 'bold', whiteSpace: 'nowrap'
                                                }}>
                                                    {hasNewRec ? 'Enregistré' : hasExisting ? 'Existant' : 'Pas d\'audio'}
                                                </span>

                                                <div style={{ flex: 1 }} />

                                                {/* Bouton écouter */}
                                                {hasAudio && (
                                                    <button
                                                        onClick={() => playAudio(index)}
                                                        disabled={isPlaying}
                                                        style={{
                                                            background: isPlaying ? '#93c5fd' : '#3b82f6',
                                                            color: 'white', border: 'none', borderRadius: '8px',
                                                            padding: '8px 12px', cursor: 'pointer', fontSize: '14px'
                                                        }}
                                                    >{isPlaying ? '...' : '▶'}</button>
                                                )}

                                                {/* Bouton enregistrer / stop */}
                                                {isRec ? (
                                                    <button
                                                        onClick={stopRecording}
                                                        style={{
                                                            background: '#ef4444', color: 'white', border: 'none',
                                                            borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                                                            fontSize: '14px', animation: 'pulse 1s infinite'
                                                        }}
                                                    >⏹ Stop</button>
                                                ) : (
                                                    <button
                                                        onClick={() => startRecording(index)}
                                                        disabled={recordingIndex !== null}
                                                        style={{
                                                            background: recordingIndex !== null ? '#d1d5db' : '#f97316',
                                                            color: 'white', border: 'none', borderRadius: '8px',
                                                            padding: '8px 12px', cursor: recordingIndex !== null ? 'not-allowed' : 'pointer',
                                                            fontSize: '14px'
                                                        }}
                                                    >{hasNewRec ? '🔄' : '🎤'}</button>
                                                )}

                                                {/* Bouton supprimer enregistrement */}
                                                {hasNewRec && !isRec && (
                                                    <button
                                                        onClick={() => removeRecording(index)}
                                                        style={{
                                                            background: '#fee2e2', color: '#ef4444', border: 'none',
                                                            borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px'
                                                        }}
                                                    >✕</button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Style animation pulse */}
                                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

                                {/* Boutons étape 2 */}
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setEditStep(1)}
                                        style={{
                                            background: '#e5e7eb', color: '#374151', padding: '12px 24px',
                                            border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >← Retour</button>
                                    <button
                                        onClick={saveNewSegmentation}
                                        disabled={isSaving || recordingIndex !== null}
                                        style={{
                                            background: isSaving || recordingIndex !== null ? '#d1d5db' : '#16a34a',
                                            color: 'white', padding: '12px 24px', border: 'none',
                                            borderRadius: '10px', fontSize: '16px', fontWeight: 'bold',
                                            cursor: isSaving || recordingIndex !== null ? 'not-allowed' : 'pointer'
                                        }}
                                    >{isSaving ? 'Sauvegarde...' : 'Enregistrer'}</button>
                                    <button
                                        onClick={closeEditModal}
                                        style={{
                                            background: '#6b7280', color: 'white', padding: '12px 24px',
                                            border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >Annuler</button>
                                </div>
                            </>)}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            backgroundColor: '#84cc16',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginRight: '15px'
                        }}
                    >
                        🚀 Organiser mes syllabes
                    </button>
                    
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour aux activités
                    </button>
                </div>
            </div>
        </div>
    )
}