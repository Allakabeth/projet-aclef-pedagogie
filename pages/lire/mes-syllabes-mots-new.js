import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

// Importer les composants sans SSR
const ExerciceClassement = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceClassement'), { ssr: false })
const ExerciceOuEst = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceOuEst'), { ssr: false })
const ExerciceQuestCe = dynamic(() => import('../../components/exercices-syllabes-mots/ExerciceQuestCe'), { ssr: false })

// Styles personnalisés
const customStyles = `
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
    }

    /* Icônes exercices - mobile uniquement */
    .mobile-exercices-icons {
        display: none;
    }

    @media (max-width: 768px) {
        .mobile-exercices-icons {
            display: flex !important;
        }
    }

    /* Checkbox ronde */
    input[type="checkbox"].round-checkbox {
        appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid #10b981;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        margin: 0;
        flex-shrink: 0;
    }

    input[type="checkbox"].round-checkbox:checked {
        background-color: #10b981;
    }

    input[type="checkbox"].round-checkbox:checked::after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
`

export default function MesSyllabesMotsNew() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState(new Set())
    const [textesDetails, setTextesDetails] = useState({})
    const [activeExercice, setActiveExercice] = useState(null) // null, 'classement', 'ou-est', 'quest-ce'

    useEffect(() => {
        const initPage = async () => {
            const token = localStorage.getItem('token')
            const userData = localStorage.getItem('user')

            if (!token || !userData) {
                router.push('/login')
                return
            }

            try {
                setUser(JSON.parse(userData))
                await loadTextes()
                setIsLoading(false)
            } catch (error) {
                console.error('Erreur:', error)
                router.push('/login')
            }
        }

        initPage()
    }, [router])

    const loadTextes = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/textes/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setTextes(data.textes || [])
                loadTextesDetails(data.textes || [])
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const loadTextesDetails = async (textesListe) => {
        const token = localStorage.getItem('token')
        const details = {}

        for (const texte of textesListe) {
            try {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texte.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (response.ok) {
                    const data = await response.json()
                    details[texte.id] = {
                        nombreSyllabesMots: data.monosyllabes?.length || 0
                    }
                }
            } catch (error) {
                details[texte.id] = { nombreSyllabesMots: 0 }
            }
        }

        setTextesDetails(details)
    }

    const toggleTexteSelection = (texteId) => {
        const newSelected = new Set(selectedTextes)
        if (newSelected.has(texteId)) {
            newSelected.delete(texteId)
        } else {
            newSelected.add(texteId)
        }
        setSelectedTextes(newSelected)
    }

    const startClassement = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('classement')
    }

    const retourSelection = () => {
        setActiveExercice(null)
    }

    const startOuEst = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('ou-est')
    }

    const startQuestCe = () => {
        if (selectedTextes.size === 0) {
            alert('Sélectionnez au moins un texte avant de commencer')
            return
        }
        setActiveExercice('quest-ce')
    }

    if (isLoading) {
        return null
    }

    // Si l'exercice Classement est actif, afficher le composant
    if (activeExercice === 'classement') {
        return <ExerciceClassement
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    // Si l'exercice Où est est actif, afficher le composant
    if (activeExercice === 'ou-est') {
        return <ExerciceOuEst
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    // Si l'exercice Qu'est-ce est actif, afficher le composant
    if (activeExercice === 'quest-ce') {
        return <ExerciceQuestCe
            selectedTextes={Array.from(selectedTextes)}
            retourSelection={retourSelection}
        />
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />
            <div style={{
                maxWidth: '100%',
                margin: '0 auto',
                padding: '0 20px'
            }}>
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>📚</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Mes Syllabes-Mots
                    </span>
                </h1>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    color: '#666',
                    fontSize: '18px'
                }} className="desktop-only">
                    Jouez avec vos mots pour apprendre les syllabes !
                </p>

                {/* Navigation icônes */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '40px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📖
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#8b5cf6',
                            border: '2px solid #8b5cf6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        🏠
                    </button>

                    {/* Icônes exercices - Mobile uniquement */}
                    <button
                        onClick={startClassement}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#ef4444',
                            border: '2px solid #ef4444',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Classement"
                    >
                        🏷️
                    </button>

                    <button
                        onClick={startOuEst}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            border: '2px solid #10b981',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Où est ce mot ?"
                    >
                        🔍
                    </button>

                    <button
                        onClick={startQuestCe}
                        disabled={selectedTextes.size === 0}
                        className="mobile-exercices-icons"
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            border: '2px solid #3b82f6',
                            borderRadius: '10px',
                            fontSize: '22px',
                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: selectedTextes.size > 0 ? 1 : 0.4
                        }}
                        title="Qu'est-ce que c'est ?"
                    >
                        🤔
                    </button>
                </div>

                {textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        border: '1px solid #ffeaa7',
                        marginBottom: '40px'
                    }}>
                        <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            Créez d'abord un texte de référence dans "📚 Mes textes références"
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'block',
                        marginBottom: '40px'
                    }}>
                        {/* Liste des textes centrée */}
                        <div style={{
                            maxWidth: '940px',
                            margin: '0 auto 30px auto'
                        }}>
                            <h2 className="desktop-only" style={{
                                marginBottom: '20px',
                                color: '#333',
                                fontSize: '20px',
                                textAlign: 'center'
                            }}>
                                🎯 Choisissez vos textes ({selectedTextes.size} sélectionné{selectedTextes.size > 1 ? 's' : ''})
                            </h2>

                            <div style={{ display: 'grid', gap: '15px' }}>
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
                                    const details = textesDetails[texte.id]

                                    return (
                                        <div
                                            key={texte.id}
                                            onClick={() => toggleTexteSelection(texte.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                padding: '15px',
                                                background: couleur.bg,
                                                borderRadius: '12px',
                                                border: selectedTextes.has(texte.id) ? '3px solid #10b981' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: selectedTextes.has(texte.id)
                                                    ? `0 8px 24px ${couleur.shadow}, 0 0 0 3px rgba(16, 185, 129, 0.2)`
                                                    : `0 4px 12px ${couleur.shadow}`
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="round-checkbox desktop-only"
                                                checked={selectedTextes.has(texte.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    toggleTexteSelection(texte.id)
                                                }}
                                            />
                                            <div style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '15px'
                                            }}>
                                                <div style={{
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    {texte.titre}
                                                </div>
                                                <div className="desktop-only" style={{
                                                    fontSize: '14px',
                                                    color: 'white',
                                                    whiteSpace: 'nowrap',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                }}>
                                                    {details ?
                                                        `${details.nombreSyllabesMots} syllabes-mots` :
                                                        'Chargement...'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Cartes exercices - Desktop uniquement */}
                        <div className="desktop-only" style={{
                            maxWidth: '940px',
                            margin: '0 auto',
                            marginTop: '40px'
                        }}>
                            <h2 style={{
                                marginBottom: '30px',
                                color: '#333',
                                fontSize: '22px',
                                textAlign: 'center'
                            }}>
                                🎮 Choisissez votre exercice
                            </h2>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '20px'
                            }}>
                                {/* Carte 1: Classement */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #ef4444',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🏷️
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#ef4444',
                                        textAlign: 'center'
                                    }}>
                                        Classement
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Classez les syllabes et les mots selon leurs caractéristiques
                                    </p>
                                    <button
                                        onClick={startClassement}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#ef4444' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>

                                {/* Carte 2: Où est ce mot ? */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #10b981',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🔍
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#10b981',
                                        textAlign: 'center'
                                    }}>
                                        Où est ce mot ?
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Écoutez le mot et trouvez-le parmi les propositions
                                    </p>
                                    <button
                                        onClick={startOuEst}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#10b981' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>

                                {/* Carte 3: Qu'est-ce que c'est ? */}
                                <div style={{
                                    padding: '25px',
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '3px solid #3b82f6',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                                    transition: 'all 0.3s ease',
                                    cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                    opacity: selectedTextes.size > 0 ? 1 : 0.6
                                }}>
                                    <div style={{
                                        fontSize: '32px',
                                        marginBottom: '15px',
                                        textAlign: 'center'
                                    }}>
                                        🤔
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                        color: '#3b82f6',
                                        textAlign: 'center'
                                    }}>
                                        Qu'est-ce que c'est ?
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#666',
                                        marginBottom: '20px',
                                        textAlign: 'center',
                                        lineHeight: '1.5'
                                    }}>
                                        Lisez le mot et identifiez-le parmi les propositions audio
                                    </p>
                                    <button
                                        onClick={startQuestCe}
                                        disabled={selectedTextes.size === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: selectedTextes.size > 0 ? '#3b82f6' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: selectedTextes.size > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🚀 Commencer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
