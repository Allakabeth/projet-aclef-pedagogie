import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { melangerTableau, piocherElements, nombreAleatoire, verifierOrdreRanger, calculerScore, formaterTemps, DONNEES_FALLBACK } from '../../../lib/compter/genererExercice'

export default function RangerExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // État de l'exercice
    const [contexte, setContexte] = useState(null)
    const [elements, setElements] = useState([])
    const [elementsOriginaux, setElementsOriginaux] = useState([])
    const [consigne, setConsigne] = useState('')

    // État du jeu
    const [phase, setPhase] = useState('jeu') // 'jeu', 'resultat'
    const [draggedItem, setDraggedItem] = useState(null)
    const [touchStartY, setTouchStartY] = useState(null)
    const [touchedIndex, setTouchedIndex] = useState(null)

    // Statistiques
    const [tempsDebut, setTempsDebut] = useState(null)
    const [tempsEcoule, setTempsEcoule] = useState(0)
    const [nbTentatives, setNbTentatives] = useState(0)
    const [resultat, setResultat] = useState(null)

    // Charger les données de l'exercice
    const chargerExercice = useCallback(async (token) => {
        try {
            // Essayer de charger depuis l'API
            const response = await fetch('/api/compter/ranger/generer', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                setContexte(data.contexte)
                setConsigne(data.consigne)
                setElementsOriginaux(data.elements)
                setElements(melangerTableau(data.elements))
                return
            }
        } catch (error) {
            console.log('API non disponible, utilisation des données locales')
        }

        // Fallback : utiliser les données locales
        const contextesDisponibles = Object.keys(DONNEES_FALLBACK.ranger)
        const contexteChoisi = contextesDisponibles[nombreAleatoire(0, contextesDisponibles.length - 1)]
        const donnees = DONNEES_FALLBACK.ranger[contexteChoisi]

        // Piocher entre 4 et 5 éléments
        const nbElements = nombreAleatoire(4, 5)
        const elementsPioches = piocherElements(donnees.elements, nbElements)

        setContexte(contexteChoisi)
        setConsigne(donnees.consigne)
        setElementsOriginaux(elementsPioches)
        setElements(melangerTableau(elementsPioches))
    }, [])

    // Initialisation
    useEffect(() => {
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

        chargerExercice(token)
        setTempsDebut(Date.now())
        setIsLoading(false)
    }, [router, chargerExercice])

    // Timer
    useEffect(() => {
        if (phase === 'jeu' && tempsDebut) {
            const interval = setInterval(() => {
                setTempsEcoule(Math.floor((Date.now() - tempsDebut) / 1000))
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [phase, tempsDebut])

    // Drag & Drop - Desktop
    const handleDragStart = (e, index) => {
        setDraggedItem(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e, targetIndex) => {
        e.preventDefault()
        if (draggedItem === null || draggedItem === targetIndex) return

        const newElements = [...elements]
        const [removed] = newElements.splice(draggedItem, 1)
        newElements.splice(targetIndex, 0, removed)
        setElements(newElements)
        setDraggedItem(null)
    }

    const handleDragEnd = () => {
        setDraggedItem(null)
    }

    // Touch - Mobile
    const handleTouchStart = (e, index) => {
        setTouchedIndex(index)
        setTouchStartY(e.touches[0].clientY)
    }

    const handleTouchMove = (e) => {
        if (touchedIndex === null || touchStartY === null) return

        const currentY = e.touches[0].clientY
        const diff = currentY - touchStartY

        // Si déplacement significatif (> 50px)
        if (Math.abs(diff) > 50) {
            const direction = diff > 0 ? 1 : -1
            const newIndex = touchedIndex + direction

            if (newIndex >= 0 && newIndex < elements.length) {
                const newElements = [...elements]
                const [removed] = newElements.splice(touchedIndex, 1)
                newElements.splice(newIndex, 0, removed)
                setElements(newElements)
                setTouchedIndex(newIndex)
                setTouchStartY(currentY)
            }
        }
    }

    const handleTouchEnd = () => {
        setTouchedIndex(null)
        setTouchStartY(null)
    }

    // Vérifier la réponse
    const verifierReponse = () => {
        setNbTentatives(prev => prev + 1)
        const estCorrect = verifierOrdreRanger(elements)

        if (estCorrect) {
            const score = calculerScore(elements.length, elements.length)
            setResultat({
                reussi: true,
                score,
                temps: tempsEcoule,
                tentatives: nbTentatives + 1
            })
            setPhase('resultat')

            // Sauvegarder la progression
            sauvegarderProgression(true, score)
        }
    }

    // Sauvegarder la progression
    const sauvegarderProgression = async (reussi, score) => {
        try {
            const token = localStorage.getItem('token')
            await fetch('/api/compter/progression', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    activite: 'ranger',
                    contexte_code: contexte,
                    reussi,
                    score,
                    temps_secondes: tempsEcoule,
                    nb_erreurs: nbTentatives,
                    nb_tentatives: nbTentatives + 1
                })
            })
        } catch (error) {
            console.error('Erreur sauvegarde progression:', error)
        }
    }

    // Recommencer avec un nouvel exercice
    const recommencer = () => {
        setPhase('jeu')
        setResultat(null)
        setNbTentatives(0)
        setTempsDebut(Date.now())
        setTempsEcoule(0)

        const token = localStorage.getItem('token')
        chargerExercice(token)
    }

    // Affichage du placeholder d'image
    const ImagePlaceholder = ({ label, couleur = '#8b5cf6' }) => (
        <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: `${couleur}20`,
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${couleur}40`
        }}>
            <span style={{ fontSize: '24px' }}>🖼️</span>
        </div>
    )

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => router.push('/compter')}
                        style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>

                    <h1 style={{
                        fontSize: 'clamp(18px, 5vw, 24px)',
                        fontWeight: 'bold',
                        color: '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        ↕️ RANGER
                    </h1>

                    <div style={{ width: '80px' }}></div>
                </div>

                {phase === 'jeu' && (
                    <>
                        {/* Consigne */}
                        <div style={{
                            backgroundColor: '#f3e8ff',
                            padding: '15px 20px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 20px)',
                                color: '#6b21a8',
                                fontWeight: '500',
                                margin: 0
                            }}>
                                {consigne}
                            </p>
                        </div>

                        {/* Instructions */}
                        <p style={{
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            👆 Glissez les éléments pour les ranger dans l'ordre
                        </p>

                        {/* Zone de tri - Liste verticale */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                marginBottom: '25px',
                                minHeight: '300px'
                            }}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {elements.map((element, index) => (
                                <div
                                    key={element.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onTouchStart={(e) => handleTouchStart(e, index)}
                                    style={{
                                        backgroundColor: draggedItem === index || touchedIndex === index
                                            ? '#e9d5ff'
                                            : '#faf5ff',
                                        border: draggedItem === index || touchedIndex === index
                                            ? '3px solid #8b5cf6'
                                            : '2px solid #e9d5ff',
                                        borderRadius: '15px',
                                        padding: '15px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        cursor: 'grab',
                                        transition: 'all 0.2s ease',
                                        userSelect: 'none',
                                        touchAction: 'none'
                                    }}
                                >
                                    {/* Numéro de position */}
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        flexShrink: 0
                                    }}>
                                        {index + 1}
                                    </div>

                                    {/* Image placeholder */}
                                    <ImagePlaceholder label={element.label} />

                                    {/* Label et valeur */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: 'clamp(16px, 4vw, 18px)',
                                            fontWeight: '600',
                                            color: '#1f2937'
                                        }}>
                                            {element.label}
                                        </div>
                                        {element.valeur && (
                                            <div style={{
                                                fontSize: '14px',
                                                color: '#6b7280',
                                                marginTop: '2px'
                                            }}>
                                                {typeof element.valeur === 'number' && element.valeur < 100
                                                    ? `${element.valeur.toFixed(2)}€`
                                                    : ''}
                                            </div>
                                        )}
                                    </div>

                                    {/* Icône de déplacement */}
                                    <div style={{
                                        color: '#a78bfa',
                                        fontSize: '20px'
                                    }}>
                                        ⋮⋮
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bouton Vérifier */}
                        <button
                            onClick={verifierReponse}
                            style={{
                                width: '100%',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '18px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            ✓ Vérifier
                        </button>

                        {/* Compteur de tentatives */}
                        {nbTentatives > 0 && (
                            <p style={{
                                textAlign: 'center',
                                color: '#ef4444',
                                marginTop: '15px',
                                fontSize: '14px'
                            }}>
                                {nbTentatives} tentative{nbTentatives > 1 ? 's' : ''} - Continuez !
                            </p>
                        )}
                    </>
                )}

                {/* Écran de résultat */}
                {phase === 'resultat' && resultat && (
                    <div style={{
                        textAlign: 'center',
                        padding: '30px 20px'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px'
                        }}>
                            {resultat.reussi ? '🎉' : '😕'}
                        </div>

                        <h2 style={{
                            fontSize: 'clamp(24px, 6vw, 32px)',
                            color: resultat.reussi ? '#22c55e' : '#ef4444',
                            marginBottom: '15px'
                        }}>
                            {resultat.reussi ? 'BRAVO !' : 'Pas tout à fait...'}
                        </h2>

                        <p style={{
                            fontSize: '18px',
                            color: '#6b7280',
                            marginBottom: '25px'
                        }}>
                            {resultat.reussi
                                ? 'Vous avez trouvé le bon ordre !'
                                : 'Réessayez pour trouver le bon ordre.'
                            }
                        </p>

                        {/* Statistiques */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '20px',
                            borderRadius: '15px',
                            marginBottom: '25px'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '15px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                        {resultat.score}%
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Score</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                        {formaterTemps(resultat.temps)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Temps</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                        {resultat.tentatives}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Tentative{resultat.tentatives > 1 ? 's' : ''}</div>
                                </div>
                            </div>
                        </div>

                        {/* Boutons d'action */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <button
                                onClick={recommencer}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                🔄 Encore un exercice
                            </button>

                            <button
                                onClick={() => router.push('/compter')}
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                🏠 Retour au menu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
