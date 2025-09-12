import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DicteesRechercheAutoEvaluation() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTexteIds, setSelectedTexteIds] = useState([])
    const [phraseGeneree, setPhraseGeneree] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentTextIndex, setCurrentTextIndex] = useState(0)
    const [hasSucceeded, setHasSucceeded] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        const savedTextes = localStorage.getItem('dictee-recherche-textes')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        if (!savedTextes) {
            router.push('/lire/dictees-recherche')
            return
        }

        try {
            setUser(JSON.parse(userData))
            setSelectedTexteIds(JSON.parse(savedTextes))
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
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
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const genererPhrase = async () => {
        if (selectedTexteIds.length === 0) return

        setIsGenerating(true)
        setHasSucceeded(false)
        
        try {
            const token = localStorage.getItem('token')
            const allGroupes = []
            
            // Charger les groupes de chaque texte sélectionné
            for (const texteId of selectedTexteIds) {
                const response = await fetch(`/api/textes/get/${texteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    const groupesFiltered = (data.groupes_sens || [])
                        .filter(g => g.type_groupe === 'text' && g.contenu && g.contenu.trim())
                    
                    allGroupes.push(...groupesFiltered)
                } else {
                    console.error(`Erreur chargement texte ${texteId}`)
                }
            }

            if (allGroupes.length === 0) {
                throw new Error('Aucun groupe de sens trouvé')
            }

            const response = await fetch('/api/exercises/generer-phrase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupes_sens: allGroupes
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.log('API quota dépassé, utilisation du fallback')
                
                // Fallback : génération simple sans IA
                const groupesContenu = allGroupes.map(g => g.contenu)
                const groupesChoisis = []
                
                // Choisir 2-3 groupes aléatoirement
                const nombreGroupes = Math.min(3, Math.max(2, groupesContenu.length))
                while (groupesChoisis.length < nombreGroupes && groupesChoisis.length < groupesContenu.length) {
                    const index = Math.floor(Math.random() * groupesContenu.length)
                    const groupe = groupesContenu[index]
                    if (!groupesChoisis.includes(groupe)) {
                        groupesChoisis.push(groupe)
                    }
                }
                
                // Créer une phrase simple en combinant les groupes
                const phrase = groupesChoisis.join(' ')
                
                const fallbackData = {
                    success: true,
                    phrase_generee: phrase,
                    groupes_utilises: groupesChoisis,
                    mots_ajoutes: []
                }
                
                setPhraseGeneree(fallbackData)
                return
            }

            const data = await response.json()
            setPhraseGeneree(data)
            
        } catch (error) {
            console.error('Erreur génération:', error)
            alert('Erreur lors de la génération de phrase')
        } finally {
            setIsGenerating(false)
        }
    }

    useEffect(() => {
        if (textes.length > 0 && selectedTexteIds.length > 0) {
            genererPhrase()
        }
    }, [textes, selectedTexteIds])

    const playAudio = async (text) => {
        if (!text.trim()) return

        // Essayer d'abord ElevenLabs
        try {
            const response = await fetch('/api/speech/elevenlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    text,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7' // Paul (ElevenLabs)
                })
            })

            if (response.ok) {
                const data = await response.json()
                const audio = new Audio(data.audio)
                await audio.play()
                return
            }
        } catch (error) {
            console.log('ElevenLabs non disponible, fallback vers Web Speech API')
        }

        // Utiliser Web Speech API en fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
            window.speechSynthesis.speak(utterance)
        }
    }

    const handleSuccess = () => {
        setHasSucceeded(true)
        
        setTimeout(() => {
            nextPhrase()
        }, 2000)
    }

    const nextPhrase = () => {
        setHasSucceeded(false)
        setPhraseGeneree(null)
        setIsGenerating(true)
        
        // Cycle à travers les textes ou juste régénérer avec tous les groupes
        setTimeout(() => {
            genererPhrase()
        }, 500)
    }

    const getWordGroupColor = (word) => {
        if (!phraseGeneree || !phraseGeneree.groupes_utilises) return '#e5e7eb'
        
        const groupIndex = phraseGeneree.groupes_utilises.findIndex(groupe => 
            groupe.toLowerCase().includes(word.toLowerCase())
        )
        
        const colors = ['#fef3c7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ecfdf5']
        return groupIndex !== -1 ? colors[groupIndex % colors.length] : '#e5e7eb'
    }

    const playWordAudio = async (word) => {
        await playAudio(`Le mot est : ${word}`)
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
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    😌 Mode Tranquille - Dictée Recherche
                </h1>

                {isGenerating ? (
                    <div style={{
                        background: '#f0f9ff',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '18px', color: '#10b981' }}>
                            🤖 Génération d'une nouvelle phrase...
                        </div>
                    </div>
                ) : phraseGeneree ? (
                    <div>
                        <div style={{
                            background: '#f8f9fa',
                            padding: '40px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            textAlign: 'center'
                        }}>
                            <h2 style={{ 
                                marginBottom: '30px', 
                                color: '#333',
                                fontSize: '20px'
                            }}>
                                📖 Voici votre phrase à lire
                            </h2>
                            
                            <div style={{
                                fontSize: '28px',
                                fontWeight: 'bold',
                                marginBottom: '30px',
                                padding: '25px',
                                background: 'white',
                                borderRadius: '12px',
                                border: '3px solid #10b981',
                                lineHeight: '1.4'
                            }}>
                                {phraseGeneree.phrase_generee}
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '15px',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => playAudio(phraseGeneree.phrase_generee)}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '15px 25px',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔊 Écouter la phrase
                                </button>

                                {!hasSucceeded && (
                                    <button
                                        onClick={handleSuccess}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            padding: '15px 25px',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✅ J'ai réussi à lire !
                                    </button>
                                )}
                            </div>

                            {hasSucceeded && (
                                <div style={{
                                    marginTop: '30px',
                                    padding: '25px',
                                    background: '#f0fdf4',
                                    borderRadius: '12px',
                                    border: '2px solid #22c55e'
                                }}>
                                    <div style={{
                                        fontSize: '24px',
                                        color: '#16a34a',
                                        fontWeight: 'bold',
                                        marginBottom: '15px'
                                    }}>
                                        🎉 Bravo ! Vous avez lu la phrase !
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        color: '#059669'
                                    }}>
                                        Nouvelle phrase dans quelques secondes...
                                    </div>
                                </div>
                            )}
                        </div>

                        {phraseGeneree.groupes_utilises && (
                            <div style={{
                                background: '#fafafa',
                                padding: '25px',
                                borderRadius: '12px',
                                marginBottom: '30px'
                            }}>
                                <h3 style={{
                                    textAlign: 'center',
                                    fontSize: '18px',
                                    marginBottom: '20px',
                                    color: '#666'
                                }}>
                                    💡 Cliquez sur les mots pour les entendre
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {phraseGeneree.phrase_generee
                                        .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
                                        .split(/\s+/)
                                        .filter(word => word.length > 0)
                                        .map((word, index) => (
                                        <div
                                            key={index}
                                            onClick={() => playWordAudio(word)}
                                            style={{
                                                padding: '15px',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                backgroundColor: getWordGroupColor(word),
                                                border: '2px solid #ddd',
                                                transition: 'transform 0.2s ease'
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            {word}
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: '20px',
                                    fontSize: '14px',
                                    color: '#666',
                                    textAlign: 'center'
                                }}>
                                    Les couleurs montrent les groupes de sens de vos textes
                                </div>
                            </div>
                        )}

                        <div style={{ 
                            textAlign: 'center',
                            marginBottom: '30px'
                        }}>
                            <button
                                onClick={nextPhrase}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    padding: '12px 25px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ➡️ Phrase suivante (sans attendre)
                            </button>
                        </div>
                    </div>
                ) : null}

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/lire/dictees-recherche')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour au choix
                    </button>
                </div>
            </div>
        </div>
    )
}