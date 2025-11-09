import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesTranquille() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [gameFinished, setGameFinished] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
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
        chargerPhrases()
    }, [router])

    const chargerPhrases = async () => {
        try {
            const mots = JSON.parse(localStorage.getItem('construis-phrases-mots') || '[]')

            if (mots.length === 0) {
                alert('Aucun mot disponible')
                router.push('/lire/construis-phrases')
                return
            }

            const token = localStorage.getItem('token')
            const response = await fetch('/api/phrases/generer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mots: mots })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Phrases chargées:', data.phrases.length)
                setPhrases(data.phrases)
                setPhraseActuelle(data.phrases[0])
            } else {
                const error = await response.json()
                alert(error.error || 'Erreur lors du chargement des phrases')
                router.push('/lire/construis-phrases')
            }
        } catch (error) {
            console.error('Erreur chargement phrases:', error)
            alert('Erreur lors du chargement des phrases')
            router.push('/lire/construis-phrases')
        }
    }

    // Fonction TTS pour lire la phrase
    const lirePhrase = async () => {
        if (!phraseActuelle || isPlaying) return

        setIsPlaying(true)

        const text = phraseActuelle.texte

        // Essayer ElevenLabs en premier
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7' // Paul (voix d'homme)
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                audio.onended = () => setIsPlaying(false)
                audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible, utilisation Web Speech API')
        }

        // Fallback vers Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.9

            utterance.onend = () => setIsPlaying(false)

            // Chercher une voix masculine française
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme'))
            ) || voices.find(voice => voice.lang.includes('fr'))

            if (maleVoice) {
                utterance.voice = maleVoice
            }

            window.speechSynthesis.speak(utterance)
        } else {
            setIsPlaying(false)
        }
    }

    const phraseReussie = () => {
        setScore(score + 1)

        // Passer à la phrase suivante
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
        } else {
            // Fin du jeu
            setGameFinished(true)
        }
    }

    const passerPhrase = () => {
        // Passer à la phrase suivante sans compter le point
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
        } else {
            // Fin du jeu
            setGameFinished(true)
        }
    }

    if (isLoading || !phraseActuelle) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    if (gameFinished) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#10b981',
                        marginBottom: '20px'
                    }}>
                        Bravo !
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        color: '#666',
                        marginBottom: '30px'
                    }}>
                        Vous avez lu {score} phrase{score > 1 ? 's' : ''} sur {phrases.length} !
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => router.push('/lire/construis-phrases')}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Recommencer
                        </button>
                        <button
                            onClick={() => router.push('/lire/reconnaitre-les-mots')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour aux exercices
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    color: 'white',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    fontWeight: 'bold',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div>Phrase {phraseIndex + 1}/{phrases.length}</div>
                    <div>Score: {score}</div>
                    <button
                        onClick={() => router.push('/lire/construis-phrases')}
                        style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🚪 Quitter
                    </button>
                </div>

                {/* Zone phrase */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#10b981',
                        marginBottom: '30px'
                    }}>
                        😌 Mode Tranquille
                    </div>

                    {/* La phrase */}
                    <div style={{
                        fontSize: window.innerWidth <= 768 ? '24px' : '32px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '40px',
                        lineHeight: '1.5',
                        padding: '30px',
                        background: '#f0fdf4',
                        borderRadius: '15px',
                        border: '3px solid #10b981'
                    }}>
                        {phraseActuelle.texte}
                    </div>

                    {/* Boutons d'action */}
                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '30px'
                    }}>
                        <button
                            onClick={lirePhrase}
                            disabled={isPlaying}
                            style={{
                                background: isPlaying ? '#ccc' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: isPlaying ? 'not-allowed' : 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => !isPlaying && (e.target.style.transform = 'scale(1.05)')}
                            onMouseOut={(e) => !isPlaying && (e.target.style.transform = 'scale(1)')}
                        >
                            🔊 Écouter la phrase
                        </button>

                        <button
                            onClick={phraseReussie}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                padding: '15px 30px',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            ✅ J'ai réussi à lire !
                        </button>
                    </div>

                    <button
                        onClick={passerPhrase}
                        style={{
                            background: 'transparent',
                            color: '#6b7280',
                            padding: '10px 20px',
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ⏭️ Passer cette phrase
                    </button>

                    <p style={{
                        marginTop: '30px',
                        color: '#666',
                        fontSize: '14px',
                        opacity: 0.8
                    }}>
                        Lisez la phrase, écoutez-la si besoin, puis cliquez "J'ai réussi !"
                    </p>
                </div>
            </div>
        </div>
    )
}
