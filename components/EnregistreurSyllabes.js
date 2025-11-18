import { useState, useRef } from 'react'
import VoiceRecorder from './VoiceRecorder'

/**
 * Composant pour enregistrer chaque syllabe d'un mot segmenté
 *
 * NOUVEAU : Permet de jeter des syllabes (tirets, apostrophes) sans les enregistrer
 *
 * Props:
 * - syllabes: array des syllabes à enregistrer (ex: ["cerf", "-", "vo", "lant"])
 * - mot: mot complet (pour affichage)
 * - onComplete: callback({syllabes: [...], audios: [...], actions: [...]})
 * - onCancel: callback() appelé si annulation
 */
export default function EnregistreurSyllabes({ syllabes, mot, onComplete, onCancel }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [enregistrements, setEnregistrements] = useState([]) // {syllabe, syllabeModifiee, action: 'enregistrer'|'jeter'|'modifier', audioBlob}
    const [showRecorder, setShowRecorder] = useState(false)
    const [showModifier, setShowModifier] = useState(false)
    const [syllabeEditee, setSyllabeEditee] = useState('')
    const [isPlaying, setIsPlaying] = useState(null)
    const audioUrlsRef = useRef([])

    // Vérifier que toutes les syllabes sont traitées
    const allProcessed = enregistrements.length === syllabes.length
    const syllabeActuelle = syllabes[currentIndex]

    /**
     * Action : Enregistrer la syllabe
     */
    const handleEnregistrer = () => {
        setShowRecorder(true)
    }

    /**
     * Action : Modifier la syllabe (enlever lettres muettes)
     */
    const handleModifier = () => {
        setSyllabeEditee(syllabeActuelle)
        setShowModifier(true)
    }

    /**
     * Valider la modification de syllabe
     */
    const handleValiderModification = () => {
        if (!syllabeEditee.trim()) {
            alert('La syllabe ne peut pas être vide')
            return
        }

        console.log(`✏️ Syllabe ${currentIndex + 1}/${syllabes.length} modifiée: "${syllabeActuelle}" → "${syllabeEditee}"`)

        // Maintenant on passe en mode enregistrement avec la syllabe modifiée
        setShowModifier(false)
        setShowRecorder(true)
    }

    /**
     * Annuler la modification
     */
    const handleAnnulerModification = () => {
        setSyllabeEditee('')
        setShowModifier(false)
    }

    /**
     * Action : Jeter la syllabe (ne pas enregistrer)
     */
    const handleJeter = () => {
        console.log(`🗑️ Syllabe ${currentIndex + 1}/${syllabes.length} jetée: "${syllabeActuelle}"`)

        const newEnregistrements = [...enregistrements]
        newEnregistrements[currentIndex] = {
            syllabe: syllabeActuelle,
            syllabeModifiee: null,
            action: 'jeter',
            audioBlob: null
        }

        setEnregistrements(newEnregistrements)

        // Passer à la syllabe suivante
        if (currentIndex < syllabes.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setShowRecorder(false)
            setShowModifier(false)
        }
    }

    /**
     * Quand une syllabe est enregistrée via VoiceRecorder
     */
    const handleRecordingComplete = (audioBlob) => {
        const syllabeFinale = syllabeEditee || syllabeActuelle
        const estModifiee = !!syllabeEditee

        console.log(`✅ Syllabe ${currentIndex + 1}/${syllabes.length} enregistrée: "${syllabeActuelle}"${estModifiee ? ` → "${syllabeFinale}"` : ''}`)

        // Stocker le blob
        const newEnregistrements = [...enregistrements]
        newEnregistrements[currentIndex] = {
            syllabe: syllabeActuelle,
            syllabeModifiee: estModifiee ? syllabeFinale : null,
            action: estModifiee ? 'modifier' : 'enregistrer',
            audioBlob: audioBlob
        }

        // Créer URL pour écoute
        const audioUrl = URL.createObjectURL(audioBlob)
        audioUrlsRef.current[currentIndex] = audioUrl

        setEnregistrements(newEnregistrements)
        setShowRecorder(false)
        setSyllabeEditee('') // Reset

        // Passer à la syllabe suivante si pas fini
        if (currentIndex < syllabes.length - 1) {
            setCurrentIndex(currentIndex + 1)
        }
    }

    /**
     * Écouter un enregistrement
     */
    const playRecording = (index) => {
        const audioUrl = audioUrlsRef.current[index]
        if (!audioUrl) return

        setIsPlaying(index)

        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlaying(null)
        audio.play()
    }

    /**
     * Ré-enregistrer ou modifier une syllabe
     */
    const reProcessSyllabe = (index) => {
        setCurrentIndex(index)
        setShowRecorder(false)
        setShowModifier(false)
        setSyllabeEditee('')

        // Nettoyer l'ancien enregistrement si existait
        if (audioUrlsRef.current[index]) {
            URL.revokeObjectURL(audioUrlsRef.current[index])
        }

        const newEnregistrements = [...enregistrements]
        newEnregistrements[index] = undefined
        setEnregistrements(newEnregistrements.filter((_, i) => i !== index))
    }

    /**
     * Valider et envoyer tous les enregistrements
     */
    const handleValidate = () => {
        if (!allProcessed) {
            alert('Veuillez traiter toutes les syllabes (enregistrer ou jeter)')
            return
        }

        console.log(`🚀 Validation de ${enregistrements.length} syllabes`)

        // Préparer les données pour le parent
        const result = {
            syllabes: enregistrements.map(e => e.syllabe),
            syllabesModifiees: enregistrements.map(e => e.syllabeModifiee), // null si pas modifié
            actions: enregistrements.map(e => e.action),
            audios: enregistrements.map(e => e.audioBlob) // null si jeté
        }

        // Appeler le callback avec toutes les données
        if (onComplete) {
            onComplete(result)
        }

        // Nettoyer les URLs
        audioUrlsRef.current.forEach(url => {
            if (url) URL.revokeObjectURL(url)
        })
    }

    /**
     * Annuler
     */
    const handleCancel = () => {
        // Nettoyer les URLs
        audioUrlsRef.current.forEach(url => {
            if (url) URL.revokeObjectURL(url)
        })

        if (onCancel) {
            onCancel()
        }
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    return (
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
            padding: isMobile ? '10px' : '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '20px' : '30px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}>
                {/* Titre */}
                <h2 style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    color: '#1f2937',
                    fontSize: isMobile ? '20px' : '24px',
                    textAlign: 'center'
                }}>
                    🎤 Enregistre tes syllabes
                </h2>

                {/* Mot complet */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    padding: '10px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                        Mot :
                    </div>
                    <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {mot}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                        {syllabes.join(' - ')}
                    </div>
                </div>

                {/* Progression */}
                <div style={{
                    marginBottom: '20px',
                    padding: '10px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '14px', color: '#0369a1', fontWeight: 'bold' }}>
                        Progression : {enregistrements.length} / {syllabes.length} syllabes
                    </div>
                    <div style={{
                        marginTop: '8px',
                        height: '8px',
                        backgroundColor: '#e0f2fe',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(enregistrements.length / syllabes.length) * 100}%`,
                            backgroundColor: '#0ea5e9',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                {/* Liste des syllabes */}
                <div style={{
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    {syllabes.map((syllabe, index) => {
                        const processed = enregistrements[index]
                        const isCurrent = index === currentIndex

                        return (
                            <div
                                key={index}
                                style={{
                                    padding: '15px',
                                    border: `2px solid ${isCurrent ? '#3b82f6' : processed ? '#10b981' : '#e5e7eb'}`,
                                    borderRadius: '8px',
                                    backgroundColor: isCurrent ? '#eff6ff' : processed ? '#f0fdf4' : '#f9fafb'
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '10px'
                                }}>
                                    <div style={{
                                        fontSize: isMobile ? '18px' : '20px',
                                        fontWeight: 'bold',
                                        color: '#1f2937'
                                    }}>
                                        {index + 1}. {syllabe}
                                        {processed && processed.action === 'modifier' && (
                                            <span style={{
                                                marginLeft: '10px',
                                                fontSize: isMobile ? '16px' : '18px',
                                                color: '#f59e0b'
                                            }}>
                                                → {processed.syllabeModifiee}
                                            </span>
                                        )}
                                    </div>
                                    {processed && (
                                        <span style={{ fontSize: '20px' }}>
                                            {processed.action === 'jeter' ? '🗑️' : processed.action === 'modifier' ? '✏️' : '✅'}
                                        </span>
                                    )}
                                </div>

                                {/* Choix d'action (syllabe actuelle, pas encore traitée) */}
                                {isCurrent && !processed && !showRecorder && !showModifier && (
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={handleEnregistrer}
                                            style={{
                                                flex: '1 1 45%',
                                                padding: '12px',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🎤 Enregistrer
                                        </button>
                                        <button
                                            onClick={handleModifier}
                                            style={{
                                                flex: '1 1 45%',
                                                padding: '12px',
                                                backgroundColor: '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✏️ Modifier
                                        </button>
                                        <button
                                            onClick={handleJeter}
                                            style={{
                                                flex: '1 1 100%',
                                                padding: '12px',
                                                backgroundColor: '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Jeter
                                        </button>
                                    </div>
                                )}

                                {/* Interface de modification (si choisi "Modifier") */}
                                {isCurrent && showModifier && !processed && (
                                    <div style={{ marginTop: '10px' }}>
                                        <div style={{
                                            padding: '15px',
                                            backgroundColor: '#fef3c7',
                                            borderRadius: '8px',
                                            border: '2px solid #f59e0b'
                                        }}>
                                            <label style={{
                                                display: 'block',
                                                marginBottom: '8px',
                                                fontWeight: 'bold',
                                                color: '#92400e'
                                            }}>
                                                ✏️ Modifie la syllabe (enlève les lettres muettes) :
                                            </label>
                                            <input
                                                type="text"
                                                value={syllabeEditee}
                                                onChange={(e) => setSyllabeEditee(e.target.value)}
                                                placeholder={syllabe}
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    fontSize: '20px',
                                                    fontWeight: 'bold',
                                                    border: '2px solid #f59e0b',
                                                    borderRadius: '6px',
                                                    marginBottom: '10px',
                                                    textAlign: 'center'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={handleValiderModification}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✅ Valider et enregistrer
                                                </button>
                                                <button
                                                    onClick={handleAnnulerModification}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        backgroundColor: '#6b7280',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ❌ Annuler
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Zone d'enregistrement (si choisi "Enregistrer") */}
                                {isCurrent && showRecorder && !processed && (
                                    <div style={{ marginTop: '10px' }}>
                                        <VoiceRecorder
                                            onRecordingComplete={handleRecordingComplete}
                                            maxDuration={5}
                                        />
                                    </div>
                                )}

                                {/* Boutons d'écoute et ré-traitement */}
                                {processed && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '10px',
                                        marginTop: '10px'
                                    }}>
                                        {processed.action === 'enregistrer' && (
                                            <button
                                                onClick={() => playRecording(index)}
                                                disabled={isPlaying === index}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: isPlaying === index ? '#f59e0b' : '#3b82f6',
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    cursor: isPlaying === index ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isPlaying === index ? '⏸️ En lecture...' : '▶️ Écouter'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => reProcessSyllabe(index)}
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#6b7280',
                                                color: 'white',
                                                padding: '8px 12px',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔄 Modifier
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Boutons d'action finaux */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '20px'
                }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            flex: 1,
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ❌ Annuler
                    </button>
                    <button
                        onClick={handleValidate}
                        disabled={!allProcessed}
                        style={{
                            flex: 2,
                            backgroundColor: allProcessed ? '#10b981' : '#d1d5db',
                            color: 'white',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: allProcessed ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {allProcessed ? '✅ Valider' : `⏳ ${enregistrements.length}/${syllabes.length} traitées`}
                    </button>
                </div>
            </div>
        </div>
    )
}
