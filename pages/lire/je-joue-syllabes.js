import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function JeJoueSyllabes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Système audio intelligent (ElevenLabs + Web Speech fallback)
    const lireTexte = async (text) => {
        if (!text.trim()) return

        // Vérifier le cache ElevenLabs
        const cacheKey = `voice_Paul_${btoa(text).replace(/[^a-zA-Z0-9]/g, '')}`
        const cachedAudio = localStorage.getItem(cacheKey)

        if (cachedAudio) {
            const audio = new Audio(cachedAudio)
            audio.play()
            return
        }

        // Essayer ElevenLabs si pas en cache
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7'
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Sauvegarder en cache
                try {
                    localStorage.setItem(cacheKey, data.audio)
                } catch (storageError) {
                    // Nettoyer les anciens caches si plein
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('voice_')) {
                            localStorage.removeItem(key)
                        }
                    })
                }

                const audio = new Audio(data.audio)
                audio.play()
                return
            }
        } catch (error) {
            // Fallback silencieux vers Web Speech API
        }

        // Utiliser Web Speech API en fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6

            // Essayer de trouver une voix masculine
            const voices = speechSynthesis.getVoices()
            const maleVoice = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('paul'))
            )

            if (maleVoice) {
                utterance.voice = maleVoice
            } else {
                utterance.pitch = 0.4
            }

            window.speechSynthesis.speak(utterance)
        }
    }

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
    }, [router])

    if (isLoading) {
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(24px, 5vw, 32px)',
                    fontWeight: 'bold',
                    marginBottom: '30px',
                    color: 'white',
                    textAlign: 'center',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}>
                    🎮 Je joue avec les syllabes
                </h1>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '40px',
                    color: 'white',
                    fontSize: '18px',
                    opacity: 0.9
                }}>
                    Choisissez un jeu pour vous entraîner avec vos syllabes personnelles
                </p>

                {/* Grille des jeux - CLASSÉS DU PLUS FACILE AU PLUS DUR */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '25px',
                    marginBottom: '40px'
                }}>
                    {/* 🟢 NIVEAU FACILE */}

                    {/* Jeu 8 - Le plus facile : Compter les syllabes */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-8')}
                            style={{
                                background: 'linear-gradient(135deg, #26de81 0%, #20bf6b 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(38, 222, 129, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(38, 222, 129, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(38, 222, 129, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔢</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 8 - Compter 🟢
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Comptez le nombre de syllabes dans chaque mot affiché
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#26de81',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            FACILE
                        </div>
                    </div>

                    {/* Jeu 5 - Facile : Identification audio */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-5')}
                            style={{
                                background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(116, 185, 255, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(116, 185, 255, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(116, 185, 255, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 2 - Écouter 🟢
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Écoutez la syllabe mystère et trouvez-la parmi les choix
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#26de81',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            FACILE
                        </div>
                    </div>

                    {/* Jeu 3 - Facile : Repérage visuel */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-3')}
                            style={{
                                background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(116, 185, 255, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(116, 185, 255, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(116, 185, 255, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎨</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 3 - Repérer 🟢
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Cliquez sur les syllabes dans les mots pour les trouver toutes
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#26de81',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            FACILE
                        </div>
                    </div>

                    {/* 🟡 NIVEAU MOYEN */}

                    {/* Jeu 1 - Moyen : Premières syllabes */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-1')}
                            style={{
                                background: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(253, 203, 110, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(253, 203, 110, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(253, 203, 110, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧩</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 4 - Début 🟡
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Glissez-déposez les premières syllabes pour reconstituer les mots
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#fdcb6e',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            MOYEN
                        </div>
                    </div>

                    {/* Jeu 2 - Moyen : Dernières syllabes */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-2')}
                            style={{
                                background: 'linear-gradient(135deg, #a55eea 0%, #8854d0 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(165, 94, 234, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(165, 94, 234, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(165, 94, 234, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎯</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 5 - Fin 🟡
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Glissez-déposez les dernières syllabes pour reconstituer les mots
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#fdcb6e',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            MOYEN
                        </div>
                    </div>

                    {/* Jeu 4 - Moyen : Ordre complet */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-4')}
                            style={{
                                background: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(253, 121, 168, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(253, 121, 168, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(253, 121, 168, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎵</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 6 - Ordonner 🟡
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Cliquez sur les syllabes dans l'ordre pour reconstituer les mots
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#fdcb6e',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            MOYEN
                        </div>
                    </div>

                    {/* Jeu 7 - Moyen : Mémoire */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-7')}
                            style={{
                                background: 'linear-gradient(135deg, #e17055 0%, #d63031 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(225, 112, 85, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(225, 112, 85, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(225, 112, 85, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👯</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 7 - Mémoire 🟡
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Jeu de mémoire : trouvez les paires de syllabes identiques
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#fdcb6e',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            MOYEN
                        </div>
                    </div>

                    {/* 🔴 NIVEAU DIFFICILE */}

                    {/* Jeu 6 - Difficile : Réflexes */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-6')}
                            style={{
                                background: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(0, 184, 148, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(0, 184, 148, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(0, 184, 148, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏃</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 8 - Rapidité 🔴
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Attrapez les syllabes qui tombent dans le bon ordre
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#e17055',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            DIFFICILE
                        </div>
                    </div>

                    {/* Jeu 11 - Le plus difficile : Découverte */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/syllabes-jeu-11')}
                            style={{
                                background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
                                color: 'white',
                                padding: '30px 20px',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(162, 155, 254, 0.3)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-5px)'
                                e.target.style.boxShadow = '0 15px 40px rgba(162, 155, 254, 0.4)'
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)'
                                e.target.style.boxShadow = '0 10px 30px rgba(162, 155, 254, 0.3)'
                            }}
                        >
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🧩</div>
                            <h3 style={{ fontSize: '20px', marginBottom: '10px', margin: 0 }}>
                                Jeu 9 - Découverte 🔴
                            </h3>
                            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0, lineHeight: '1.4' }}>
                                Découvrez les mots cachés formables avec vos syllabes
                            </p>
                        </button>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: '#e17055',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            DIFFICILE
                        </div>
                    </div>
                </div>

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '40px'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '15px 30px',
                            border: '2px solid white',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                            e.target.style.transform = 'translateY(-2px)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                            e.target.style.transform = 'translateY(0)'
                        }}
                    >
                        ← Retour au menu Lire
                    </button>
                </div>
            </div>
        </div>
    )
}