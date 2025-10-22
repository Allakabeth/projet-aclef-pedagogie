import { useState, useRef } from 'react'

/**
 * Composant réutilisable pour enregistrer le son via le microphone
 *
 * Props:
 * - onRecordingComplete: callback(audioBlob) appelé quand l'enregistrement est terminé
 * - maxDuration: durée max en secondes (défaut: 10s)
 * - buttonStyle: style personnalisé pour le bouton
 */
export default function VoiceRecorder({
    onRecordingComplete,
    maxDuration = 10,
    buttonStyle = {}
}) {
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [error, setError] = useState(null)

    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])
    const timerRef = useRef(null)
    const streamRef = useRef(null)

    const startRecording = async () => {
        try {
            setError(null)

            // Demander l'accès au microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            // Créer le MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            })
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            // Événement: données audio disponibles
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            // Événement: enregistrement terminé
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

                // Arrêter le stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                    streamRef.current = null
                }

                // Appeler le callback
                if (onRecordingComplete) {
                    onRecordingComplete(audioBlob)
                }

                // Réinitialiser
                setRecordingTime(0)
                clearInterval(timerRef.current)
            }

            // Démarrer l'enregistrement
            mediaRecorder.start()
            setIsRecording(true)
            setIsPaused(false)

            // Timer pour afficher la durée
            let seconds = 0
            timerRef.current = setInterval(() => {
                seconds++
                setRecordingTime(seconds)

                // Arrêter automatiquement après maxDuration
                if (seconds >= maxDuration) {
                    stopRecording()
                }
            }, 1000)

        } catch (err) {
            console.error('Erreur accès microphone:', err)
            setError('Impossible d\'accéder au microphone. Vérifiez les permissions.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setIsPaused(false)
        }
    }

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause()
            setIsPaused(true)
            clearInterval(timerRef.current)
        }
    }

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume()
            setIsPaused(false)

            // Reprendre le timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1
                    if (newTime >= maxDuration) {
                        stopRecording()
                    }
                    return newTime
                })
            }, 1000)
        }
    }

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        clearInterval(timerRef.current)
        setIsRecording(false)
        setIsPaused(false)
        setRecordingTime(0)
        audioChunksRef.current = []
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
        }}>
            {/* Message d'erreur */}
            {error && (
                <div style={{
                    color: '#ef4444',
                    fontSize: '12px',
                    textAlign: 'center',
                    padding: '8px',
                    background: '#fee2e2',
                    borderRadius: '4px'
                }}>
                    {error}
                </div>
            )}

            {/* Timer d'enregistrement */}
            {isRecording && (
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#ef4444'
                }}>
                    ⏺️ {recordingTime}s / {maxDuration}s
                </div>
            )}

            {/* Boutons de contrôle */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            ...buttonStyle
                        }}
                    >
                        🎤 Enregistrer
                    </button>
                ) : (
                    <>
                        {!isPaused ? (
                            <button
                                onClick={pauseRecording}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ⏸️ Pause
                            </button>
                        ) : (
                            <button
                                onClick={resumeRecording}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ▶️ Reprendre
                            </button>
                        )}

                        <button
                            onClick={stopRecording}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ✅ Terminer
                        </button>

                        <button
                            onClick={cancelRecording}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ❌ Annuler
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
