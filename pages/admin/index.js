import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function QuizzAdmin() {
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
        // Vérifier l'authentification admin quiz
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)

            // Vérifier si l'utilisateur est admin ou salarié
            if (parsedUser.role !== 'admin' && parsedUser.role !== 'salarié') {
                alert('Accès non autorisé. Cette section est réservée aux administrateurs et salariés.')
                router.push('/aclef-pedagogie-admin')
                return
            }
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem('quiz-admin-token')
        localStorage.removeItem('quiz-admin-user')
        router.push('/aclef-pedagogie-admin')
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
                padding: 'clamp(20px, 4vw, 30px)',
                maxWidth: '1000px',
                width: '100%',
                textAlign: 'center',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    🛠️ Administration ACLEF-Pédagogie
                </h1>

                {/* Message */}
                <p style={{
                    fontSize: 'clamp(16px, 3vw, 18px)',
                    color: '#666',
                    marginBottom: 'clamp(20px, 5vw, 35px)',
                    lineHeight: '1.4'
                }}>
                    Gestion des formations et modules pédagogiques :
                </p>

                {/* Grille de boutons - Section Principale */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'clamp(10px, 3vw, 15px)',
                    marginBottom: 'clamp(20px, 4vw, 30px)'
                }}>
                    {/* Gérer la Formation */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/formation')}
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
                            🎓 Gérer la Formation
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Gérer la Formation')
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

                {/* Section Modules Pédagogiques */}
                <h3 style={{
                    fontSize: 'clamp(18px, 4vw, 22px)',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    color: '#333',
                    textAlign: 'center'
                }}>
                    📚 Modules Pédagogiques
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'clamp(10px, 3vw, 15px)',
                    marginBottom: 'clamp(20px, 4vw, 30px)'
                }}>
                    {/* Module Lire */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/lire')}
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
                            📖 Module Lire
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Module Lire')
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

                    {/* Module Écrire */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/ecrire')}
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
                            ✍️ Module Écrire
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Module Écrire')
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

                    {/* Module Compter */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/compter')}
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
                            🔢 Module Compter
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Module Compter')
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

                    {/* Module Code de la Route */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/code-route')}
                            style={{
                                backgroundColor: '#dc2626',
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
                            🚗 Code de la Route
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Code de la Route')
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

                    {/* Module Quiz */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/quizz')}
                            style={{
                                backgroundColor: '#059669',
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
                            📋 Module Quiz
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Module Quiz')
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

                    {/* Module FLE */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/fle')}
                            style={{
                                backgroundColor: '#0891b2',
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
                            🌍 Module FLE
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Module FLE')
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

                    {/* Gérer les Imagiers */}
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <button
                            onClick={() => router.push('/admin/imagiers')}
                            style={{
                                backgroundColor: '#be185d',
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
                            🖼️ Gérer les Imagiers
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lireTexte('Gérer les Imagiers')
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

                {/* Bouton Déconnexion */}
                <button
                    onClick={handleLogout}
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
                    🚪 Se déconnecter
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
                    Administration ACLEF-Pédagogie - Connecté : <strong>{user.email}</strong> ({user.prenom} {user.nom})
                </div>
            </div>
        </div>
    )
}