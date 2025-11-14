import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ConstruisPhrasesTranquille() {
    const [user, setUser] = useState(null)
    const [etape, setEtape] = useState('chargement')
    const [phrases, setPhrases] = useState([])
    const [phraseActuelle, setPhraseActuelle] = useState(null)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    // Confettis
    const [showConfetti, setShowConfetti] = useState(false)

    // États pour le mode karaoké
    const [modeKaraoke, setModeKaraoke] = useState(false)
    const [motIllumineIndex, setMotIllumineIndex] = useState(-1)
    const [enregistrementsMap, setEnregistrementsMap] = useState({})

    // Détection mobile
    const [isMobile, setIsMobile] = useState(false)

    const router = useRouter()

    // Détection mobile avec listener de redimensionnement
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (router.isReady) {
            checkAuth()
        }
    }, [router.isReady, router.query])

    const checkAuth = async () => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)

            // Charger les données via texte_ids
            if (router.query.texte_ids) {
                await chargerPhrases(router.query.texte_ids)
                await loadEnregistrements(router.query.texte_ids)
            } else {
                alert('Aucun texte sélectionné. Retournez au menu des exercices.')
                router.push('/lire/reconnaitre-les-mots/exercices2')
                return
            }
        } catch (error) {
            console.error('Erreur:', error)
            router.push('/login')
            return
        }
    }

    const chargerPhrases = async (texteIds) => {
        try {
            // Convertir texte_ids en tableau de nombres
            const texteIdsArray = texteIds.split(',').map(Number)

            // Récupérer les phrases pré-générées
            const token = localStorage.getItem('token')
            const response = await fetch('/api/phrases/generer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ texte_ids: texteIdsArray })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Phrases chargées:', data.phrases.length)
                setPhrases(data.phrases)
                setPhraseActuelle(data.phrases[0])
                setEtape('exercice')
            } else {
                const error = await response.json()

                // Afficher le message d'erreur détaillé pour les phrases non générées
                if (error.error === 'Phrases non générées') {
                    alert(error.message)
                } else {
                    alert(error.error || 'Erreur lors du chargement des phrases')
                }

                router.push('/lire/reconnaitre-les-mots/construis-phrases-intro?texte_ids=' + texteIds)
            }
        } catch (error) {
            console.error('Erreur chargement phrases:', error)
            alert('Erreur lors du chargement des phrases')
            router.push('/lire/reconnaitre-les-mots/construis-phrases-intro?texte_ids=' + texteIds)
        }
    }

    // Charger les enregistrements vocaux personnalisés
    const loadEnregistrements = async (texteIds) => {
        try {
            const response = await fetch(`/api/enregistrements-mots/list?texte_ids=${texteIds}`)
            const data = await response.json()

            if (data.success && data.enregistrementsMap) {
                // Normaliser les clés
                const mapNormalise = {}
                Object.entries(data.enregistrementsMap).forEach(([mot, enreg]) => {
                    const motNormalise = mot.toLowerCase().trim()
                        .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
                        .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')
                    mapNormalise[motNormalise] = enreg
                })
                setEnregistrementsMap(mapNormalise)
                console.log('✅ Enregistrements chargés:', Object.keys(mapNormalise).length)
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements vocaux:', error)
        }
    }

    // Fonction de lecture audio avec priorités : 1) Voix perso, 2) ElevenLabs, 3) Web Speech
    const lireTTS = async (texte, onEnded = null) => {
        // Normalisation du texte (suppression ponctuation)
        const motNormalise = texte
            .toLowerCase()
            .trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // PRIORITÉ 1 : Voix personnalisée de l'apprenant
        if (enregistrementsMap[motNormalise]) {
            try {
                const audio = new Audio(enregistrementsMap[motNormalise].audio_url)
                if (onEnded) audio.addEventListener('ended', onEnded)
                await audio.play()
                return audio
            } catch (err) {
                console.error('Erreur lecture voix perso:', err)
                // Fallback sur ElevenLabs
            }
        }

        // PRIORITÉ 2 : ElevenLabs
        return await lireTTSElevenLabs(texte, onEnded)
    }

    const lireTTSElevenLabs = async (texte, onEnded = null) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: texte })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                if (onEnded) audio.addEventListener('ended', onEnded)
                await audio.play()
                return audio
            } else {
                // Quota dépassé → Fallback Web Speech
                return lireTTSFallback(texte, onEnded)
            }
        } catch (error) {
            return lireTTSFallback(texte, onEnded)
        }
    }

    const lireTTSFallback = (texte, onEnded = null) => {
        // PRIORITÉ 3 : Web Speech API du navigateur
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const voices = window.speechSynthesis.getVoices()
            const frenchVoice = voices.find(v => v.lang.startsWith('fr'))

            const utterance = new SpeechSynthesisUtterance(texte)
            utterance.lang = 'fr-FR'
            if (frenchVoice) utterance.voice = frenchVoice

            if (onEnded) utterance.addEventListener('end', onEnded)

            window.speechSynthesis.speak(utterance)
            return utterance
        }
    }

    // Mode karaoké : lecture séquentielle avec illumination
    const demarrerKaraoke = () => {
        if (!phraseActuelle) return

        setModeKaraoke(true)

        // Filtrer les mots (supprimer ponctuation isolée)
        const mots = phraseActuelle.texte
            .trim()
            .split(/\s+/)
            .filter(mot => mot && mot.trim().length > 0)
            .filter(mot => !/^[.,:;!?]+$/.test(mot))

        let index = 0

        function lireMotSuivant() {
            if (index >= mots.length) {
                // Fin du karaoké
                setMotIllumineIndex(-1)

                // Gestion selon type d'appareil
                if (isMobile) {
                    // Mobile : passage automatique après 200ms
                    setTimeout(() => {
                        setModeKaraoke(false)
                        phraseReussie() // Passe à la phrase suivante
                    }, 200)
                } else {
                    // Desktop : retour à l'affichage normal
                    setModeKaraoke(false)
                }
                return
            }

            setMotIllumineIndex(index)

            const onAudioEnded = () => {
                index++
                setTimeout(lireMotSuivant, 300) // Délai entre mots
            }

            lireTTS(mots[index], onAudioEnded)
        }

        lireMotSuivant()
    }

    const phraseReussie = () => {
        setScore(score + 1)

        // Passer à la phrase suivante
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setModeKaraoke(false)
        } else {
            // Fin du jeu
            setEtape('resultats')
        }
    }

    const passerPhrase = () => {
        // Passer à la phrase suivante sans compter le point
        const nextIndex = phraseIndex + 1
        if (nextIndex < phrases.length) {
            setPhraseIndex(nextIndex)
            setPhraseActuelle(phrases[nextIndex])
            setModeKaraoke(false)
        } else {
            // Fin du jeu
            setEtape('resultats')
        }
    }

    // Confettis sur la page de résultats si score parfait
    useEffect(() => {
        if (etape === 'resultats' && score === phrases.length && phrases.length > 0) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
        }
    }, [etape])

    if (etape === 'chargement' || !phraseActuelle) {
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

    if (etape === 'resultats') {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                {showConfetti && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @keyframes confettiFall {
                                    0% {
                                        transform: translateY(-50px) rotate(0deg);
                                        opacity: 1;
                                    }
                                    100% {
                                        transform: translateY(100vh) rotate(360deg);
                                        opacity: 0;
                                    }
                                }
                            `
                        }} />
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            overflow: 'hidden'
                        }}>
                            {[...Array(50)].map((_, i) => {
                                const emojis = ['🎉', '🎊', '✨', '🌟', '⭐']
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                                const randomLeft = Math.random() * 100
                                const randomDuration = 2 + Math.random() * 2
                                const randomDelay = Math.random() * 0.5

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${randomLeft}%`,
                                            top: '-50px',
                                            fontSize: '40px',
                                            animation: `confettiFall ${randomDuration}s linear ${randomDelay}s forwards`
                                        }}
                                    >
                                        {randomEmoji}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                        {score === phrases.length ? '🎉' : '👏'}
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#10b981',
                        marginBottom: '20px'
                    }}>
                        {score === phrases.length ? 'Parfait !' : 'Bravo !'}
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
                            onClick={() => {
                                setScore(0)
                                setPhraseIndex(0)
                                setPhraseActuelle(phrases[0])
                                setEtape('exercice')
                            }}
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
                            onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
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
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: isMobile ? '20px' : '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    textAlign: 'center',
                    marginBottom: '15px'
                }}>
                    😌 Mode Tranquille
                </h1>

                {/* Phrase et Score */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '12px' : '15px',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 'bold',
                    color: '#64748b'
                }}>
                    <div>Phrase {phraseIndex + 1}/{phrases.length}</div>
                    <div>Score: {score}</div>
                </div>

                {/* Barre d'icônes de navigation */}
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '10px',
                    justifyContent: 'center',
                    marginBottom: isMobile ? '12px' : '20px'
                }}>
                    <button
                        onClick={() => router.push(`/lire/reconnaitre-les-mots/exercices2?textes=${router.query.texte_ids}`)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #64748b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Menu exercices"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => router.push(`/lire/reconnaitre-les-mots?etape=selection`)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Sélection des textes"
                    >
                        👁️
                    </button>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #10b981',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Menu Lire"
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '8px 16px',
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

                {/* La phrase */}
                <div style={{
                    fontSize: isMobile ? '24px' : '32px',
                    fontWeight: 'bold',
                    color: '#333',
                    lineHeight: '1.5',
                    padding: '30px',
                    background: '#f0fdf4',
                    borderRadius: '15px',
                    border: '3px solid #10b981',
                    maxWidth: '800px',
                    margin: '60px auto 40px auto',
                    textAlign: 'center'
                }}>
                    {modeKaraoke ? (
                        // Mode karaoké : affichage mot par mot avec illumination
                        phraseActuelle.texte
                            .trim()
                            .split(/\s+/)
                            .filter(mot => mot && mot.trim().length > 0)
                            .map((mot, index) => (
                                <span
                                    key={index}
                                    style={{
                                        backgroundColor: motIllumineIndex === index ? '#fef08a' : 'transparent',
                                        transform: motIllumineIndex === index ? 'scale(1.2)' : 'scale(1)',
                                        fontWeight: motIllumineIndex === index ? 'bold' : 'normal',
                                        display: 'inline-block',
                                        marginRight: '8px',
                                        transition: 'all 0.2s',
                                        padding: '2px 4px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {mot}
                                </span>
                            ))
                    ) : (
                        // Mode normal : affichage simple
                        phraseActuelle.texte
                    )}
                </div>

                {/* Boutons d'action */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '20px',
                    maxWidth: '800px',
                    margin: '0 auto 20px auto'
                }}>
                    <button
                        onClick={phraseReussie}
                        style={{
                            backgroundColor: 'white',
                            color: '#10b981',
                            padding: isMobile ? '12px 24px' : '15px 30px',
                            border: '3px solid #10b981',
                            borderRadius: '8px',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flex: isMobile ? '1 1 100%' : '1 1 45%'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f0fdf4'
                            e.target.style.transform = 'scale(1.05)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white'
                            e.target.style.transform = 'scale(1)'
                        }}
                    >
                        J'ai réussi à lire !
                    </button>

                    <button
                        onClick={demarrerKaraoke}
                        style={{
                            backgroundColor: 'white',
                            color: '#f97316',
                            padding: isMobile ? '12px 24px' : '15px 30px',
                            border: '3px solid #f97316',
                            borderRadius: '8px',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flex: isMobile ? '1 1 100%' : '1 1 45%'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#fff7ed'
                            e.target.style.transform = 'scale(1.05)'
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white'
                            e.target.style.transform = 'scale(1)'
                        }}
                    >
                        C'est difficile
                    </button>
                </div>

                {!isMobile && (
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
                            cursor: 'pointer',
                            display: 'block',
                            margin: '0 auto 30px auto'
                        }}
                    >
                        ⏭️ Passer cette phrase
                    </button>
                )}

                {!isMobile && (
                    <p style={{
                        marginTop: '30px',
                        color: '#666',
                        fontSize: '14px',
                        opacity: 0.8,
                        textAlign: 'center',
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        Lisez la phrase, écoutez-la, puis cliquez "J'ai réussi !" ou "C'est difficile !"
                    </p>
                )}
            </div>
        </div>
    )
}
