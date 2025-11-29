import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { melangerTableau, piocherElements, nombreAleatoire, verifierClassementTrier, calculerScore, formaterTemps, DONNEES_FALLBACK } from '../../../lib/compter/genererExercice'

export default function TrierExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // État de l'exercice
    const [contexte, setContexte] = useState(null)
    const [categories, setCategories] = useState([])
    const [elementsATrier, setElementsATrier] = useState([])
    const [classement, setClassement] = useState({}) // { categorie: [elements] }
    const [consigne, setConsigne] = useState('')

    // État du jeu
    const [phase, setPhase] = useState('jeu') // 'jeu', 'resultat'
    const [draggedItem, setDraggedItem] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null) // Pour le tap mobile

    // Statistiques
    const [tempsDebut, setTempsDebut] = useState(null)
    const [tempsEcoule, setTempsEcoule] = useState(0)
    const [nbTentatives, setNbTentatives] = useState(0)
    const [resultat, setResultat] = useState(null)
    const [elementsOriginaux, setElementsOriginaux] = useState([])

    // Couleurs pour les catégories
    const couleursCategories = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']

    // Charger les données de l'exercice
    const chargerExercice = useCallback(async (token) => {
        try {
            // Essayer de charger depuis l'API
            const response = await fetch('/api/compter/trier/generer', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                setContexte(data.contexte)
                setConsigne(data.consigne)
                setCategories(data.categories)
                setElementsOriginaux(data.elements)
                setElementsATrier(melangerTableau(data.elements))
                // Initialiser le classement vide
                const classementInitial = {}
                data.categories.forEach(cat => {
                    classementInitial[cat] = []
                })
                setClassement(classementInitial)
                return
            }
        } catch (error) {
            console.log('API non disponible, utilisation des données locales')
        }

        // Fallback : utiliser les données locales
        const contextesDisponibles = Object.keys(DONNEES_FALLBACK.trier)
        const contexteChoisi = contextesDisponibles[nombreAleatoire(0, contextesDisponibles.length - 1)]
        const donnees = DONNEES_FALLBACK.trier[contexteChoisi]

        // Piocher entre 6 et 8 éléments
        const nbElements = nombreAleatoire(6, 8)
        const elementsPioches = piocherElements(donnees.elements, nbElements)

        setContexte(contexteChoisi)
        setConsigne(donnees.consigne)
        setCategories(donnees.categories)
        setElementsOriginaux(elementsPioches)
        setElementsATrier(melangerTableau(elementsPioches))

        // Initialiser le classement vide
        const classementInitial = {}
        donnees.categories.forEach(cat => {
            classementInitial[cat] = []
        })
        setClassement(classementInitial)
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

    // Drag & Drop
    const handleDragStart = (e, element, source) => {
        setDraggedItem({ element, source })
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDropOnCategory = (e, categorie) => {
        e.preventDefault()
        if (!draggedItem) return

        const { element, source } = draggedItem

        if (source === 'pool') {
            // Retirer de la pool
            setElementsATrier(prev => prev.filter(el => el.id !== element.id))
            // Ajouter à la catégorie
            setClassement(prev => ({
                ...prev,
                [categorie]: [...prev[categorie], element]
            }))
        } else if (source !== categorie) {
            // Déplacer d'une catégorie à une autre
            setClassement(prev => ({
                ...prev,
                [source]: prev[source].filter(el => el.id !== element.id),
                [categorie]: [...prev[categorie], element]
            }))
        }

        setDraggedItem(null)
    }

    const handleDropOnPool = (e) => {
        e.preventDefault()
        if (!draggedItem || draggedItem.source === 'pool') return

        const { element, source } = draggedItem

        // Retirer de la catégorie
        setClassement(prev => ({
            ...prev,
            [source]: prev[source].filter(el => el.id !== element.id)
        }))
        // Remettre dans la pool
        setElementsATrier(prev => [...prev, element])

        setDraggedItem(null)
    }

    // Touch/Click pour mobile
    const handleTapElement = (element, source) => {
        if (selectedItem && selectedItem.element.id === element.id) {
            // Désélectionner
            setSelectedItem(null)
        } else {
            // Sélectionner
            setSelectedItem({ element, source })
        }
    }

    const handleTapCategory = (categorie) => {
        if (!selectedItem) return

        const { element, source } = selectedItem

        if (source === 'pool') {
            setElementsATrier(prev => prev.filter(el => el.id !== element.id))
            setClassement(prev => ({
                ...prev,
                [categorie]: [...prev[categorie], element]
            }))
        } else if (source !== categorie) {
            setClassement(prev => ({
                ...prev,
                [source]: prev[source].filter(el => el.id !== element.id),
                [categorie]: [...prev[categorie], element]
            }))
        }

        setSelectedItem(null)
    }

    const handleTapPool = () => {
        if (!selectedItem || selectedItem.source === 'pool') return

        const { element, source } = selectedItem

        setClassement(prev => ({
            ...prev,
            [source]: prev[source].filter(el => el.id !== element.id)
        }))
        setElementsATrier(prev => [...prev, element])

        setSelectedItem(null)
    }

    // Vérifier la réponse
    const verifierReponse = () => {
        // Vérifier que tous les éléments sont placés
        if (elementsATrier.length > 0) {
            return
        }

        setNbTentatives(prev => prev + 1)
        const verification = verifierClassementTrier(classement, elementsOriginaux)

        if (verification.correct) {
            const score = calculerScore(elementsOriginaux.length - verification.erreurs, elementsOriginaux.length)
            setResultat({
                reussi: true,
                score: 100,
                temps: tempsEcoule,
                tentatives: nbTentatives + 1
            })
            setPhase('resultat')
            sauvegarderProgression(true, 100)
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
                    activite: 'trier',
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

    // Recommencer
    const recommencer = () => {
        setPhase('jeu')
        setResultat(null)
        setNbTentatives(0)
        setTempsDebut(Date.now())
        setTempsEcoule(0)
        setSelectedItem(null)

        const token = localStorage.getItem('token')
        chargerExercice(token)
    }

    // Placeholder d'image
    const ImagePlaceholder = ({ label, couleur = '#22c55e', small = false }) => (
        <div style={{
            width: small ? '40px' : '50px',
            height: small ? '40px' : '50px',
            backgroundColor: `${couleur}20`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${couleur}40`,
            flexShrink: 0
        }}>
            <span style={{ fontSize: small ? '16px' : '20px' }}>🖼️</span>
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
                <div style={{ color: '#22c55e', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px'
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
                        color: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        📁 TRIER
                    </h1>

                    <div style={{ width: '80px' }}></div>
                </div>

                {phase === 'jeu' && (
                    <>
                        {/* Consigne */}
                        <div style={{
                            backgroundColor: '#dcfce7',
                            padding: '12px 15px',
                            borderRadius: '12px',
                            marginBottom: '15px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: 'clamp(14px, 3vw, 18px)',
                                color: '#166534',
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
                            fontSize: '13px',
                            marginBottom: '15px'
                        }}>
                            {selectedItem
                                ? '👆 Tapez sur une catégorie pour y placer l\'élément'
                                : '👆 Tapez sur un élément puis sur une catégorie'}
                        </p>

                        {/* Zone des éléments à trier */}
                        <div
                            onClick={handleTapPool}
                            onDragOver={handleDragOver}
                            onDrop={handleDropOnPool}
                            style={{
                                backgroundColor: '#f9fafb',
                                border: '2px dashed #d1d5db',
                                borderRadius: '12px',
                                padding: '10px',
                                marginBottom: '15px',
                                minHeight: '80px'
                            }}
                        >
                            <p style={{
                                fontSize: '12px',
                                color: '#9ca3af',
                                marginBottom: '8px',
                                textAlign: 'center'
                            }}>
                                Éléments à trier ({elementsATrier.length})
                            </p>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                justifyContent: 'center'
                            }}>
                                {elementsATrier.map((element) => (
                                    <div
                                        key={element.id}
                                        draggable
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleTapElement(element, 'pool')
                                        }}
                                        onDragStart={(e) => handleDragStart(e, element, 'pool')}
                                        style={{
                                            backgroundColor: selectedItem?.element.id === element.id
                                                ? '#fef3c7'
                                                : 'white',
                                            border: selectedItem?.element.id === element.id
                                                ? '3px solid #f59e0b'
                                                : '2px solid #e5e7eb',
                                            borderRadius: '10px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'grab',
                                            userSelect: 'none',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <ImagePlaceholder label={element.label} small />
                                        {element.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zones de catégories */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            {categories.map((categorie, index) => {
                                const couleur = couleursCategories[index % couleursCategories.length]
                                return (
                                    <div
                                        key={categorie}
                                        onClick={() => handleTapCategory(categorie)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnCategory(e, categorie)}
                                        style={{
                                            backgroundColor: `${couleur}10`,
                                            border: `2px solid ${couleur}50`,
                                            borderRadius: '12px',
                                            padding: '12px',
                                            minHeight: '120px',
                                            cursor: selectedItem ? 'pointer' : 'default',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <h3 style={{
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: couleur,
                                            marginBottom: '10px',
                                            textAlign: 'center',
                                            padding: '5px',
                                            backgroundColor: `${couleur}20`,
                                            borderRadius: '6px'
                                        }}>
                                            {categorie}
                                        </h3>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                        }}>
                                            {classement[categorie]?.map((element) => (
                                                <div
                                                    key={element.id}
                                                    draggable
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleTapElement(element, categorie)
                                                    }}
                                                    onDragStart={(e) => handleDragStart(e, element, categorie)}
                                                    style={{
                                                        backgroundColor: selectedItem?.element.id === element.id
                                                            ? '#fef3c7'
                                                            : 'white',
                                                        border: selectedItem?.element.id === element.id
                                                            ? '2px solid #f59e0b'
                                                            : '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        padding: '6px 10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        cursor: 'grab',
                                                        userSelect: 'none',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <ImagePlaceholder label={element.label} couleur={couleur} small />
                                                    {element.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Bouton Vérifier */}
                        <button
                            onClick={verifierReponse}
                            disabled={elementsATrier.length > 0}
                            style={{
                                width: '100%',
                                backgroundColor: elementsATrier.length > 0 ? '#d1d5db' : '#22c55e',
                                color: 'white',
                                padding: '16px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: elementsATrier.length > 0 ? 'not-allowed' : 'pointer',
                                boxShadow: elementsATrier.length > 0 ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            {elementsATrier.length > 0
                                ? `Placez tous les éléments (${elementsATrier.length} restant${elementsATrier.length > 1 ? 's' : ''})`
                                : '✓ Vérifier'
                            }
                        </button>

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
                        <div style={{ fontSize: '80px', marginBottom: '20px' }}>
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
                                ? 'Tout est bien trié !'
                                : 'Réessayez pour trouver le bon classement.'
                            }
                        </p>

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
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                                        {resultat.score}%
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Score</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                                        {formaterTemps(resultat.temps)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Temps</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                                        {resultat.tentatives}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Tentative{resultat.tentatives > 1 ? 's' : ''}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <button
                                onClick={recommencer}
                                style={{
                                    backgroundColor: '#22c55e',
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
