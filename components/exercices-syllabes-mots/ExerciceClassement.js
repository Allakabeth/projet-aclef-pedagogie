import { useState, useEffect } from 'react'

export default function ExerciceClassement({ selectedTextes, retourSelection }) {
    const [mots, setMots] = useState([])
    const [paniers, setPaniers] = useState({})
    const [motEnCours, setMotEnCours] = useState(null)
    const [motActuel, setMotActuel] = useState(null)
    const [indexActuel, setIndexActuel] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [enregistrementsMap, setEnregistrementsMap] = useState({})
    const [elevenLabsTokens, setElevenLabsTokens] = useState(0)
    const [audioCache, setAudioCache] = useState({})
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            // Détecte mobile en portrait (width <= 768) OU en paysage (height <= 768)
            setIsMobile(window.innerWidth <= 768 || window.innerHeight <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (selectedTextes && selectedTextes.length > 0) {
            loadEnregistrements()
            loadElevenLabsTokens()
            loadSyllabesMots()
        }
    }, [])

    const loadEnregistrements = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/enregistrements-mots/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setEnregistrementsMap(data.enregistrementsMap || {})
            }
        } catch (error) {
            console.error('Erreur chargement enregistrements:', error)
        }
    }

    const loadElevenLabsTokens = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/speech/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setElevenLabsTokens(data.tokens || 0)
            }
        } catch (error) {
            console.error('Erreur chargement tokens ElevenLabs:', error)
        }
    }

    const loadSyllabesMots = async () => {
        try {
            const token = localStorage.getItem('token')
            let tousLesMonosyllabes = []

            // Charger les monosyllabes de tous les textes sélectionnés
            for (const texteId of selectedTextes) {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    tousLesMonosyllabes.push(...(data.monosyllabes || []))
                }
            }

            // Éliminer les doublons
            const monosyllabesUniques = [...new Set(tousLesMonosyllabes)]

            if (monosyllabesUniques.length === 0) {
                console.log('Aucun monosyllabe trouvé pour les textes sélectionnés')
            }

            // Mélanger les mots pour un ordre vraiment aléatoire (Fisher-Yates)
            const motsAleatoires = [...monosyllabesUniques]
            for (let i = motsAleatoires.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [motsAleatoires[i], motsAleatoires[j]] = [motsAleatoires[j], motsAleatoires[i]]
            }
            setMots(motsAleatoires)
            initializePaniers()
            setMotActuel(motsAleatoires[0] || null)
            setIndexActuel(0)
            setIsCompleted(false)
            setIsLoading(false)
        } catch (error) {
            console.error('Erreur chargement monosyllabes validés:', error)
            setIsLoading(false)
        }
    }

    const initializePaniers = () => {
        // Créer des paniers : 1 poubelle + toutes les lettres de l'alphabet
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

        const nouvellesPaniers = {
            '🗑️': [] // Panier poubelle pour nombres et caractères spéciaux
        }
        alphabet.forEach(lettre => {
            nouvellesPaniers[lettre] = []
        })

        setPaniers(nouvellesPaniers)
    }

    const playAudio = async (text) => {
        if (!text) return

        // Normaliser le texte (supprimer ponctuation)
        const motNormalise = text.toLowerCase().trim()
            .replace(/^[.,;:!?¡¿'"«»\-—]+/, '')
            .replace(/[.,;:!?¡¿'"«»\-—]+$/, '')

        // PRIORITÉ 1 : Enregistrement personnel
        if (enregistrementsMap[motNormalise]) {
            const enregistrement = enregistrementsMap[motNormalise]
            if (enregistrement?.audio_url) {
                try {
                    const audio = new Audio(enregistrement.audio_url)
                    await audio.play()
                    return // Succès, arrêt
                } catch (error) {
                    console.error('Erreur lecture enregistrement:', error)
                }
            }
        }

        // PRIORITÉ 2 : ElevenLabs (si tokens disponibles)
        if (elevenLabsTokens > 0) {
            // Vérifier cache
            if (audioCache[text]) {
                try {
                    const audio = new Audio(audioCache[text])
                    await audio.play()
                    return
                } catch (error) {
                    console.error('Erreur lecture cache:', error)
                }
            }

            // Appel API ElevenLabs
            try {
                const token = localStorage.getItem('token')
                const response = await fetch('/api/speech/elevenlabs', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: text,
                        voiceId: 'AfbuxQ9DVtS4azaxN1W7' // Paul
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.audioUrl) {
                        setAudioCache(prev => ({ ...prev, [text]: data.audioUrl }))
                        setElevenLabsTokens(data.tokensRestants || 0)
                        const audio = new Audio(data.audioUrl)
                        await audio.play()
                        return
                    }
                }
            } catch (error) {
                console.error('Erreur ElevenLabs:', error)
            }
        }

        // PRIORITÉ 3 : Web Speech API (fallback, pas Hortense)
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            utterance.pitch = 0.6

            // Sélectionner voix (exclure Hortense)
            const voices = window.speechSynthesis.getVoices()
            const voixFrancaise = voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense') &&
                (voice.name.toLowerCase().includes('male') ||
                 voice.name.toLowerCase().includes('homme') ||
                 voice.name.toLowerCase().includes('thomas') ||
                 voice.name.toLowerCase().includes('paul') ||
                 voice.name.toLowerCase().includes('pierre'))
            ) || voices.find(voice =>
                voice.lang.includes('fr') &&
                !voice.name.toLowerCase().includes('hortense')
            )

            if (voixFrancaise) {
                utterance.voice = voixFrancaise
            }

            window.speechSynthesis.speak(utterance)
        }
    }

    const handleDragStart = (e, mot) => {
        setMotEnCours(mot)
        e.dataTransfer.effectAllowed = 'move'
    }

    const passerAuMotSuivant = () => {
        const prochainIndex = indexActuel + 1
        if (prochainIndex < mots.length) {
            setIndexActuel(prochainIndex)
            setMotActuel(mots[prochainIndex])
        } else {
            setIsCompleted(true)
            setMotActuel(null)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e, lettre) => {
        e.preventDefault()

        if (motEnCours && motActuel) {
            const premierCaractere = motActuel.charAt(0)

            // Vérifier si c'est un nombre ou caractère spécial
            const estNombreOuSpecial = /[0-9\-''"«»,;:!?.]/.test(premierCaractere)

            if (lettre === '🗑️' && estNombreOuSpecial) {
                // Bonne réponse : nombre/caractère spécial dans poubelle
                const nouveauxPaniers = { ...paniers }
                nouveauxPaniers['🗑️'] = [...nouveauxPaniers['🗑️'], motActuel]
                setPaniers(nouveauxPaniers)
                passerAuMotSuivant()
            } else if (lettre === '🗑️' && !estNombreOuSpecial) {
                // Mauvaise réponse : lettre dans poubelle
                const initialeAttendue = premierCaractere
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toUpperCase()
                alert(`❌ "${motActuel}" commence par "${initialeAttendue}", pas un caractère spécial`)
            } else if (lettre !== '🗑️' && estNombreOuSpecial) {
                // Mauvaise réponse : nombre/spécial dans lettre
                alert(`❌ "${motActuel}" commence par un caractère spécial, il va dans la poubelle 🗑️`)
            } else {
                // Cas normal : validation par lettre
                const initialeAttendue = premierCaractere
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toUpperCase()

                if (lettre === initialeAttendue) {
                    // Bonne réponse
                    const nouveauxPaniers = { ...paniers }
                    nouveauxPaniers[lettre] = [...nouveauxPaniers[lettre], motActuel]
                    setPaniers(nouveauxPaniers)
                    passerAuMotSuivant()
                } else {
                    // Mauvaise réponse
                    alert(`❌ "${motActuel}" commence par "${initialeAttendue}", pas par "${lettre}"`)
                }
            }
        }

        setMotEnCours(null)
    }

    const resetExercice = () => {
        if (selectedTextes.length > 0) {
            setIsLoading(true)
            loadSyllabesMots()
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    color: '#ef4444',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    Chargement de l'exercice...
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
            <style jsx>{`
                @media (max-width: 768px) {
                    .desktop-only {
                        display: none !important;
                    }
                }
            `}</style>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Ligne 1 : Titre */}
                <h1 style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    color: '#ef4444',
                    fontSize: isMobile ? '24px' : '32px',
                    fontWeight: 'bold'
                }}>
                    🏷️ Classement
                </h1>

                {/* Ligne 2 : Icônes de navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={retourSelection}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #ef4444',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={() => window.location.href = '/lire'}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #10b981',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #3b82f6',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>
                    <button
                        onClick={() => motActuel && playAudio(motActuel)}
                        disabled={!motActuel || isCompleted}
                        style={{
                            width: '55px',
                            height: '55px',
                            backgroundColor: 'white',
                            border: '3px solid #3b82f6',
                            borderRadius: '12px',
                            fontSize: '24px',
                            cursor: (!motActuel || isCompleted) ? 'not-allowed' : 'pointer',
                            opacity: (!motActuel || isCompleted) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🔊
                    </button>
                </div>

                {/* Ligne 3 : Instructions - masqué sur mobile */}
                <p className="desktop-only" style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Glissez chaque mot dans la bonne lettre selon sa première lettre
                </p>

                {/* Message de complétion */}
                {isCompleted && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '30px',
                        padding: '20px',
                        background: '#d1fae5',
                        borderRadius: '12px',
                        border: '2px solid #10b981'
                    }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎉</div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#059669'
                        }}>
                            Bravo ! Tous les mots sont classés !
                        </div>
                    </div>
                )}

                {/* Mot actuel à classer */}
                {!isCompleted && motActuel && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, motActuel)}
                            onClick={() => playAudio(motActuel)}
                            className="mot-actuel"
                            style={{
                                padding: isMobile ? '12px 20px' : '20px 40px',
                                background: '#fff',
                                borderRadius: '12px',
                                border: isMobile ? '2px solid #ef4444' : '3px solid #ef4444',
                                textAlign: 'center',
                                fontSize: isMobile ? '24px' : '32px',
                                fontWeight: 'bold',
                                cursor: 'grab',
                                transition: 'transform 0.2s ease',
                                userSelect: 'none',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                margin: '0 auto',
                                display: 'inline-block',
                                color: '#333'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            {motActuel}
                        </div>
                        <p style={{
                            marginTop: '15px',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            Mot {indexActuel + 1} sur {mots.length}
                        </p>
                    </div>
                )}

                {/* Paniers de lettres - 3 lignes de 9 */}
                <div>
                    <h3 className="desktop-only" style={{
                        fontSize: '18px',
                        marginBottom: '20px',
                        color: '#333',
                        textAlign: 'center'
                    }}>
                        🏷️ Paniers par lettre
                    </h3>

                    {/* Ligne 1: A B C D E F G H I */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(9, 1fr)',
                        gap: isMobile ? '4px' : '8px',
                        marginBottom: isMobile ? '4px' : '8px'
                    }}>
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(lettre => (
                            <div
                                key={lettre}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, lettre)}
                                style={{
                                    minHeight: isMobile ? '60px' : '80px',
                                    padding: isMobile ? '6px' : '10px',
                                    background: '#e0f2fe',
                                    borderRadius: '8px',
                                    border: '2px dashed #0ea5e9',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    fontSize: isMobile ? '14px' : '18px',
                                    fontWeight: 'bold',
                                    color: '#0369a1',
                                    marginBottom: isMobile ? '4px' : '8px'
                                }}>
                                    {lettre}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}>
                                    {paniers[lettre]?.map((mot, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '4px',
                                                background: '#dcfce7',
                                                borderRadius: '4px',
                                                border: '1px solid #16a34a',
                                                fontSize: isMobile ? '8px' : '10px',
                                                fontWeight: 'bold',
                                                color: '#15803d'
                                            }}
                                        >
                                            {mot}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Ligne 2: J K L M N O P Q R */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(9, 1fr)',
                        gap: isMobile ? '4px' : '8px',
                        marginBottom: isMobile ? '4px' : '8px'
                    }}>
                        {['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'].map(lettre => (
                            <div
                                key={lettre}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, lettre)}
                                style={{
                                    minHeight: isMobile ? '60px' : '80px',
                                    padding: isMobile ? '6px' : '10px',
                                    background: '#e0f2fe',
                                    borderRadius: '8px',
                                    border: '2px dashed #0ea5e9',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    fontSize: isMobile ? '14px' : '18px',
                                    fontWeight: 'bold',
                                    color: '#0369a1',
                                    marginBottom: isMobile ? '4px' : '8px'
                                }}>
                                    {lettre}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}>
                                    {paniers[lettre]?.map((mot, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '4px',
                                                background: '#dcfce7',
                                                borderRadius: '4px',
                                                border: '1px solid #16a34a',
                                                fontSize: isMobile ? '8px' : '10px',
                                                fontWeight: 'bold',
                                                color: '#15803d'
                                            }}
                                        >
                                            {mot}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Ligne 3: S T U V W X Y Z 🗑️ */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(9, 1fr)',
                        gap: isMobile ? '4px' : '8px'
                    }}>
                        {['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '🗑️'].map(lettre => (
                            <div
                                key={lettre}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, lettre)}
                                style={{
                                    minHeight: isMobile ? '60px' : '80px',
                                    padding: isMobile ? '6px' : '10px',
                                    background: lettre === '🗑️' ? '#fee2e2' : '#e0f2fe',
                                    borderRadius: '8px',
                                    border: lettre === '🗑️' ? '2px dashed #ef4444' : '2px dashed #0ea5e9',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    fontSize: isMobile ? '14px' : '18px',
                                    fontWeight: 'bold',
                                    color: lettre === '🗑️' ? '#dc2626' : '#0369a1',
                                    marginBottom: isMobile ? '4px' : '8px'
                                }}>
                                    {lettre}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}>
                                    {paniers[lettre]?.map((mot, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '4px',
                                                background: '#dcfce7',
                                                borderRadius: '4px',
                                                border: '1px solid #16a34a',
                                                fontSize: isMobile ? '8px' : '10px',
                                                fontWeight: 'bold',
                                                color: '#15803d'
                                            }}
                                        >
                                            {mot}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
