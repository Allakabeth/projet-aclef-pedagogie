import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MesTextesReferences() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Fonction pour lire le texte avec une voix masculine
    const lireTexte = (texte) => {
        if ('speechSynthesis' in window) {
            // Arrêter toute lecture en cours
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6  // Plus grave pour une voix masculine

            // Chercher une voix masculine française avec plus de critères
            const voices = window.speechSynthesis.getVoices()

            // Essayer de trouver une voix masculine spécifiquement
            let voixMasculine = voices.find(voice =>
                voice.lang.includes('fr') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('man') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('masculin') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre') ||
                 voice.name.toLowerCase().includes('antoine') ||
                 voice.name.toLowerCase().includes('nicolas'))
            )

            // Si pas trouvé, chercher les voix avec "male" dans le nom
            if (!voixMasculine) {
                voixMasculine = voices.find(voice =>
                    voice.lang.includes('fr') &&
                    voice.name.toLowerCase().includes('male')
                )
            }

            // Si toujours pas trouvé, utiliser une voix française avec pitch plus grave
            if (!voixMasculine) {
                voixMasculine = voices.find(voice => voice.lang.includes('fr'))
                utterance.pitch = 0.4  // Encore plus grave si pas de voix masculine disponible
            }

            if (voixMasculine) {
                utterance.voice = voixMasculine
                console.log('Voix utilisée:', voixMasculine.name)
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

    const handleRetourLire = () => {
        router.push('/lire')
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '15px'
            }}>
                <div style={{
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: 'clamp(15px, 4vw, 25px)',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(20px, 5vw, 26px)',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                }}>
                    <span style={{ marginRight: '8px' }}>📚</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Mes textes références
                    </span>
                </h1>

                {/* Icônes de navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
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
                        title="Retour à Lire"
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
                </div>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(25px, 6vw, 40px)',
                    lineHeight: '1.4'
                }}>
                    Que voulez-vous faire ?
                </p>

                {/* Menu réorganisé pour non-lecteurs */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(15px, 4vw, 20px)',
                    marginBottom: 'clamp(20px, 5vw, 30px)'
                }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/voir-mes-textes')}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: 'clamp(20px, 5vw, 25px)',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📚 Voir mes textes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Voir mes textes')
                            }}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Écouter"
                        >
                            🔊
                        </button>
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/creer-texte-manuel')}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: 'clamp(20px, 5vw, 25px)',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            ✍️ Créer un texte
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Créer un texte')
                            }}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Écouter"
                        >
                            🔊
                        </button>
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/importer-texte')}
                            style={{
                                backgroundColor: '#06b6d4',
                                color: 'white',
                                padding: 'clamp(20px, 5vw, 25px)',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📂 Importer un texte
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Importer un texte')
                            }}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Écouter"
                        >
                            🔊
                        </button>
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/enregistrer-texte')}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: 'clamp(20px, 5vw, 25px)',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎤 Enregistrer un texte
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Enregistrer un texte')
                            }}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Écouter"
                        >
                            🔊
                        </button>
                    </div>



                </div>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#166534'
                }}>
                    Textes références - <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}