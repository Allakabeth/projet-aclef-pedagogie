import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VoirMesTextes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const [stats, setStats] = useState({ nombre_mots_differents: 0, nombre_textes: 0 })
    const [confirmSupprimer, setConfirmSupprimer] = useState(null) // ID du texte à confirmer
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

            // Chercher une voix masculine française
            const voices = window.speechSynthesis.getVoices()
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

            if (!voixMasculine) {
                voixMasculine = voices.find(voice =>
                    voice.lang.includes('fr') &&
                    voice.name.toLowerCase().includes('male')
                )
            }

            if (!voixMasculine) {
                voixMasculine = voices.find(voice => voice.lang.includes('fr'))
                utterance.pitch = 0.4
            }

            if (voixMasculine) {
                utterance.voice = voixMasculine
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
            loadTextes()
            loadStats()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
        setIsLoadingTextes(true)
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
            } else {
                console.error('Erreur chargement textes')
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        } finally {
            setIsLoadingTextes(false)
        }
    }

    const loadStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/textes/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setStats(data.stats || { nombre_mots_differents: 0, nombre_textes: 0 })
            } else {
                console.error('Erreur chargement statistiques')
            }
        } catch (error) {
            console.error('Erreur chargement statistiques:', error)
        }
    }

    const demanderConfirmationSupprimer = (texteId) => {
        console.log('🚨 Demande confirmation suppression pour texte:', texteId)
        setConfirmSupprimer(texteId)
        // Auto-annulation après 10 secondes
        setTimeout(() => {
            setConfirmSupprimer(null)
        }, 10000)
    }

    const annulerSupprimer = () => {
        console.log('❌ Suppression annulée')
        setConfirmSupprimer(null)
    }

    const confirmerSupprimer = async (texteId) => {
        console.log('🚀 SUPPRESSION CONFIRMÉE pour texte ID:', texteId)
        setConfirmSupprimer(null)

        try {
            const token = localStorage.getItem('token')
            console.log('🔑 Token présent:', !!token)
            
            const response = await fetch(`/api/textes/supprimer-simple/${texteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: texteId })
            })

            console.log('📡 Response status:', response.status)
            
            if (response.ok) {
                const result = await response.json()
                console.log('✅ Suppression réussie:', result)
                alert('Texte supprimé avec succès !')
                loadTextes()
                loadStats()
            } else {
                const errorText = await response.text()
                console.error('❌ Erreur suppression:', response.status, errorText)
                alert(`Erreur lors de la suppression: ${response.status}`)
            }
        } catch (error) {
            console.error('💥 Erreur suppression:', error)
            alert('Erreur lors de la suppression: ' + error.message)
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
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Titre sur 3 lignes */}
                <div style={{ marginBottom: '20px' }}>
                    {/* Ligne 1 : Titre */}
                    <h1 style={{
                        fontSize: 'clamp(22px, 5vw, 28px)',
                        fontWeight: 'bold',
                        margin: 0,
                        marginBottom: '8px',
                        textAlign: 'center'
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

                    {/* Ligne 2 : Stats */}
                    <div style={{
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#666',
                        textAlign: 'center',
                        marginBottom: '12px'
                    }}>
                        {stats.nombre_mots_differents} mots différents au total
                    </div>

                    {/* Ligne 3 : Navigation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px'
                    }}>
                        <button
                            onClick={() => router.push('/lire/mes-textes-references')}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                border: '2px solid #64748b',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Retour aux textes références"
                        >
                            ←
                        </button>
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
                            title="Module Lire"
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
                </div>


                {/* Liste des textes */}
                {isLoadingTextes ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        fontSize: '16px',
                        color: '#666'
                    }}>
                        Chargement des textes...
                    </div>
                ) : textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '20px',
                        border: '2px dashed #0ea5e9',
                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.1)'
                    }}>
                        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                            Aucun texte de référence créé
                        </p>
                        <p style={{ fontSize: '14px', color: '#888' }}>
                            Commencez par créer votre premier texte !
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '15px'
                    }}>
                        {textes.map((texte, index) => {
                            const couleurs = [
                                { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.3)' },
                                { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(240, 147, 251, 0.3)' },
                                { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79, 172, 254, 0.3)' },
                                { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.3)' },
                                { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', shadow: 'rgba(250, 112, 154, 0.3)' },
                                { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', shadow: 'rgba(168, 237, 234, 0.3)' },
                                { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', shadow: 'rgba(255, 154, 158, 0.3)' },
                                { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', shadow: 'rgba(255, 236, 210, 0.3)' }
                            ]
                            const couleur = couleurs[index % couleurs.length]

                            return (
                            <div key={texte.id} style={{
                                background: couleur.bg,
                                border: 'none',
                                borderRadius: '20px',
                                padding: '15px',
                                boxShadow: `0 8px 25px ${couleur.shadow}`,
                                color: 'white',
                                position: 'relative',
                                overflow: 'hidden',
                                transform: 'translateY(0)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)'
                                e.currentTarget.style.boxShadow = `0 15px 35px ${couleur.shadow}`
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = `0 8px 25px ${couleur.shadow}`
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    flexWrap: 'wrap',
                                    marginBottom: '10px'
                                }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: 'clamp(16px, 4vw, 20px)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {texte.titre}
                                    </h3>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.9)',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                        📊 {texte.nombre_groupes || 0} groupes
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.9)',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                        📝 {texte.nombre_mots_total || 0} mots
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        color: 'rgba(255,255,255,0.8)',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                        Créé le {new Date(texte.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                                
                                {/* Boutons d'actions */}
                                <div style={{
                                    marginTop: '15px',
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap',
                                    position: 'relative'
                                }}>
                                    {/* Icône son */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            lireTexte(texte.titre)
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-40px',
                                            right: '0px',
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '35px',
                                            height: '35px',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backdropFilter: 'blur(10px)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                            e.target.style.transform = 'scale(1.1)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                                            e.target.style.transform = 'scale(1)'
                                        }}
                                        title="Écouter le titre"
                                    >
                                        🔊
                                    </button>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                lireTexte('Voir')
                                            }}
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderRadius: '25px',
                                                padding: '10px 20px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                backdropFilter: 'blur(10px)',
                                                transition: 'all 0.2s ease',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                paddingRight: '45px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                e.target.style.transform = 'translateY(-2px)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                                                e.target.style.transform = 'translateY(0)'
                                            }}
                                            title="Cliquez pour écouter, puis sur → pour voir"
                                        >
                                            👁️ Voir
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/lire/texte/${texte.id}`)
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: '8px',
                                                transform: 'translateY(-50%)',
                                                backgroundColor: 'rgba(255,255,255,0.3)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '25px',
                                                height: '25px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.5)'
                                                e.target.style.transform = 'translateY(-50%) scale(1.1)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                e.target.style.transform = 'translateY(-50%) scale(1)'
                                            }}
                                            title="Voir le texte"
                                        >
                                            →
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                lireTexte('Modifier')
                                            }}
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderRadius: '25px',
                                                padding: '10px 20px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                backdropFilter: 'blur(10px)',
                                                transition: 'all 0.2s ease',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                paddingRight: '45px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                e.target.style.transform = 'translateY(-2px)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                                                e.target.style.transform = 'translateY(0)'
                                            }}
                                            title="Cliquez pour écouter, puis sur → pour modifier"
                                        >
                                            ✏️ Modifier
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/lire/modifier-texte/${texte.id}`)
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: '8px',
                                                transform: 'translateY(-50%)',
                                                backgroundColor: 'rgba(255,255,255,0.3)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '25px',
                                                height: '25px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.5)'
                                                e.target.style.transform = 'translateY(-50%) scale(1.1)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                e.target.style.transform = 'translateY(-50%) scale(1)'
                                            }}
                                            title="Modifier le texte"
                                        >
                                            →
                                        </button>
                                    </div>
                                    {confirmSupprimer === texte.id ? (
                                        // Mode confirmation
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        lireTexte('Confirmer suppression')
                                                    }}
                                                    style={{
                                                        backgroundColor: 'rgba(220, 38, 38, 0.9)',
                                                        color: 'white',
                                                        border: '2px solid rgba(220, 38, 38, 0.6)',
                                                        borderRadius: '25px',
                                                        padding: '10px 20px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        backdropFilter: 'blur(10px)',
                                                        transition: 'all 0.2s ease',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                        paddingRight: '45px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(220, 38, 38, 1)'
                                                        e.target.style.transform = 'translateY(-2px)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)'
                                                        e.target.style.transform = 'translateY(0)'
                                                    }}
                                                    title="Cliquez pour écouter, puis sur → pour confirmer"
                                                >
                                                    ✅ CONFIRMER
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        confirmerSupprimer(texte.id)
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        right: '8px',
                                                        transform: 'translateY(-50%)',
                                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '25px',
                                                        height: '25px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.5)'
                                                        e.target.style.transform = 'translateY(-50%) scale(1.1)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                        e.target.style.transform = 'translateY(-50%) scale(1)'
                                                    }}
                                                    title="Confirmer la suppression"
                                                >
                                                    →
                                                </button>
                                            </div>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        lireTexte('Annuler')
                                                    }}
                                                    style={{
                                                        backgroundColor: 'rgba(107, 114, 128, 0.9)',
                                                        color: 'white',
                                                        border: '2px solid rgba(107, 114, 128, 0.6)',
                                                        borderRadius: '25px',
                                                        padding: '10px 20px',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        backdropFilter: 'blur(10px)',
                                                        transition: 'all 0.2s ease',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                        paddingRight: '45px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(107, 114, 128, 1)'
                                                        e.target.style.transform = 'translateY(-2px)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.9)'
                                                        e.target.style.transform = 'translateY(0)'
                                                    }}
                                                    title="Cliquez pour écouter, puis sur → pour annuler"
                                                >
                                                    ❌ ANNULER
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        annulerSupprimer()
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        right: '8px',
                                                        transform: 'translateY(-50%)',
                                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '25px',
                                                        height: '25px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.5)'
                                                        e.target.style.transform = 'translateY(-50%) scale(1.1)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                        e.target.style.transform = 'translateY(-50%) scale(1)'
                                                    }}
                                                    title="Annuler"
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Mode normal
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    lireTexte('Supprimer')
                                                }}
                                                style={{
                                                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                                                    color: 'white',
                                                    border: '2px solid rgba(239, 68, 68, 0.6)',
                                                    borderRadius: '25px',
                                                    padding: '10px 20px',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    backdropFilter: 'blur(10px)',
                                                    transition: 'all 0.2s ease',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                    paddingRight: '45px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 1)'
                                                    e.target.style.transform = 'translateY(-2px)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'
                                                    e.target.style.transform = 'translateY(0)'
                                                }}
                                                title="Cliquez pour écouter, puis sur → pour supprimer"
                                            >
                                                🗑️ Supprimer
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    demanderConfirmationSupprimer(texte.id)
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    right: '8px',
                                                    transform: 'translateY(-50%)',
                                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '25px',
                                                    height: '25px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = 'rgba(255,255,255,0.5)'
                                                    e.target.style.transform = 'translateY(-50%) scale(1.1)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                                                    e.target.style.transform = 'translateY(-50%) scale(1)'
                                                }}
                                                title="Supprimer le texte"
                                            >
                                                →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )
                        })}
                    </div>
                )}

            </div>
        </div>
    )
}