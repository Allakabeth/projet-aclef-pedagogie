import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Lire() {
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

    const handleRetourDashboard = () => {
        router.push('/dashboard')
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
                    <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    📖 Module Lire
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(20px, 5vw, 35px)',
                    lineHeight: '1.4'
                }}>
                    Choisissez une activité de lecture :
                </p>

                {/* Grille de boutons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'clamp(10px, 3vw, 15px)',
                    marginBottom: 'clamp(15px, 4vw, 25px)'
                }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📚 Mes textes références
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Mes textes références')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/ou-est-ce')}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📍 Où est-ce ?
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Où est-ce ?')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/quest-ce')}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🤔 Qu'est-ce ?
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Qu\'est-ce ?')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/remettre-dans-ordre')}
                            style={{
                                backgroundColor: '#ec4899',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🔀 Remettre dans l'ordre
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Remettre dans l\'ordre')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/reconnaitre-les-mots')}
                            style={{
                                backgroundColor: '#06b6d4',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            👁️ Reconnaitre les mots
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Reconnaitre les mots')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/monosyllabes-multisyllabes')}
                            style={{
                                backgroundColor: '#14b8a6',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🔤 Syllabe-mot
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Syllabe mot')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/segmentation-choix')}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            ✂️ Segmentation des Syllabes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Segmentation des Syllabes')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/dictees-recherche')}
                            style={{
                                backgroundColor: '#a855f7',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🔍 Dictées recherche
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Dictées recherche')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/mes-syllabes-mots')}
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🔤 Mes Syllabes-Mots
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Mes Syllabes Mots')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/syllabes-paniers')}
                            style={{
                                backgroundColor: '#84cc16',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📝 Mes syllabes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Mes syllabes')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/je-joue-syllabes')}
                            style={{
                                backgroundColor: '#ec4899',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎮 Je joue avec mes syllabes
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Je joue avec mes syllabes')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/lectures-decouverte')}
                            style={{
                                backgroundColor: '#6366f1',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🔍 Lectures découverte
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Lectures découverte')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                            onClick={() => router.push('/lire/statistiques')}
                            style={{
                                backgroundColor: '#64748b',
                                color: 'white',
                                padding: 'clamp(15px, 4vw, 20px) clamp(10px, 3vw, 15px)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: 'clamp(13px, 3vw, 15px)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease',
                                width: '100%'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            📊 Statistiques
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Statistiques')
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer',
                                fontSize: '12px',
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

                {/* Bouton Retour */}
                <button
                    onClick={handleRetourDashboard}
                    style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '12px 30px',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginTop: '10px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                    ← Retour au menu principal
                </button>

                {/* Informations utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '15px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    Module Lire - Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}