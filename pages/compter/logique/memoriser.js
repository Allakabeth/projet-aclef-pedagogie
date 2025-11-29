import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { melangerTableau, piocherElements, nombreAleatoire, calculerScore, formaterTemps } from '../../../lib/compter/genererExercice'

// Banques d'éléments pour mémoriser (avec images réelles)
const BANQUES_MEMORISER = {
    frigo: {
        consigne: 'Regardez bien ce qu\'il y a dans le frigo !',
        mode: 'frigo', // Mode spécial avec affichage frigo
        frigoOuvert: '/images/compter/meubles/refrigerateur.png',
        frigoFerme: '/images/compter/meubles/refrigerateur-2.png',
        elements: [
            { id: 1, label: 'Lait', image: '/images/compter/aliments/lait.png' },
            { id: 2, label: 'Fromage', image: '/images/compter/aliments/fromage.png' },
            { id: 3, label: 'Œufs', image: '/images/compter/aliments/oeufs.png' },
            { id: 4, label: 'Beurre', image: '/images/compter/aliments/beurre.png' },
            { id: 5, label: 'Yaourt', image: '/images/compter/aliments/yaourt.png' },
            { id: 6, label: 'Jambon', image: '/images/compter/aliments/jambon.png' },
            { id: 7, label: 'Saumon', image: '/images/compter/aliments/saumon.png' },
            { id: 8, label: 'Crème fraîche', image: '/images/compter/aliments/creme-fraiche.png' },
            { id: 9, label: 'Camembert', image: '/images/compter/aliments/camembert.png' },
            { id: 10, label: 'Orange', image: '/images/compter/aliments/orange.png' }
        ],
        distracteurs: [
            { id: 11, label: 'Pain', image: '/images/compter/aliments/pain.png' },
            { id: 12, label: 'Croissant', image: '/images/compter/aliments/croissant.png' },
            { id: 13, label: 'Pain de mie', image: '/images/compter/aliments/pain-mie.png' },
            { id: 14, label: 'Poulet', image: '/images/compter/aliments/poulet.png' },
            { id: 15, label: 'Chocolat', emoji: '🍫' },
            { id: 16, label: 'Café', emoji: '☕' },
            { id: 17, label: 'Banane', emoji: '🍌' },
            { id: 18, label: 'Carotte', emoji: '🥕' }
        ]
    },
    liste_courses: {
        consigne: 'Mémorisez les produits de la liste de courses',
        elements: [
            { id: 1, label: 'Lait', image: '/images/compter/aliments/lait.png' },
            { id: 2, label: 'Pain', image: '/images/compter/aliments/pain.png' },
            { id: 3, label: 'Fromage', image: '/images/compter/aliments/fromage.png' },
            { id: 4, label: 'Œufs', image: '/images/compter/aliments/oeufs.png' },
            { id: 5, label: 'Beurre', image: '/images/compter/aliments/beurre.png' },
            { id: 6, label: 'Yaourt', image: '/images/compter/aliments/yaourt.png' },
            { id: 7, label: 'Jambon', image: '/images/compter/aliments/jambon.png' },
            { id: 8, label: 'Poulet', image: '/images/compter/aliments/poulet.png' },
            { id: 9, label: 'Saumon', image: '/images/compter/aliments/saumon.png' },
            { id: 10, label: 'Croissant', image: '/images/compter/aliments/croissant.png' }
        ],
        distracteurs: [
            { id: 11, label: 'Orange', image: '/images/compter/aliments/orange.png' },
            { id: 12, label: 'Camembert', image: '/images/compter/aliments/camembert.png' },
            { id: 13, label: 'Pain de mie', image: '/images/compter/aliments/pain-mie.png' },
            { id: 14, label: 'Crème fraîche', image: '/images/compter/aliments/creme-fraiche.png' },
            { id: 15, label: 'Chocolat', emoji: '🍫' },
            { id: 16, label: 'Café', emoji: '☕' },
            { id: 17, label: 'Banane', emoji: '🍌' },
            { id: 18, label: 'Carotte', emoji: '🥕' }
        ]
    },
    objets_maison: {
        consigne: 'Mémorisez les objets de la maison',
        elements: [
            { id: 1, label: 'Clés', emoji: '🔑' },
            { id: 2, label: 'Téléphone', emoji: '📱' },
            { id: 3, label: 'Lunettes', emoji: '👓' },
            { id: 4, label: 'Portefeuille', emoji: '👛' },
            { id: 5, label: 'Montre', emoji: '⌚' },
            { id: 6, label: 'Livre', emoji: '📕' },
            { id: 7, label: 'Stylo', emoji: '🖊️' },
            { id: 8, label: 'Parapluie', emoji: '☂️' },
            { id: 9, label: 'Bougie', emoji: '🕯️' },
            { id: 10, label: 'Horloge', emoji: '🕐' }
        ],
        distracteurs: [
            { id: 11, label: 'Lampe', emoji: '💡' },
            { id: 12, label: 'Coussin', emoji: '🛋️' },
            { id: 13, label: 'Vase', emoji: '🏺' },
            { id: 14, label: 'Miroir', emoji: '🪞' },
            { id: 15, label: 'Plante', emoji: '🪴' },
            { id: 16, label: 'Cadre', emoji: '🖼️' },
            { id: 17, label: 'Réveil', emoji: '⏰' },
            { id: 18, label: 'Ciseaux', emoji: '✂️' }
        ]
    }
}

// Positions des aliments dans le frigo (en pourcentage)
const POSITIONS_FRIGO = [
    { top: '12%', left: '15%' },  // Étagère haute gauche
    { top: '12%', left: '55%' },  // Étagère haute droite
    { top: '32%', left: '10%' },  // 2e étagère gauche
    { top: '32%', left: '45%' },  // 2e étagère milieu
    { top: '32%', left: '70%' },  // 2e étagère droite
    { top: '52%', left: '15%' },  // 3e étagère gauche
    { top: '52%', left: '55%' },  // 3e étagère droite
    { top: '72%', left: '20%' },  // Bac gauche
    { top: '72%', left: '60%' },  // Bac droite
]

// Niveaux de difficulté
const NIVEAUX = [
    { id: 1, nbElements: 3, tempsAffichage: 5, nbDistracteurs: 3, nom: 'Facile' },
    { id: 2, nbElements: 4, tempsAffichage: 4, nbDistracteurs: 4, nom: 'Moyen' },
    { id: 3, nbElements: 5, tempsAffichage: 3, nbDistracteurs: 5, nom: 'Difficile' }
]

export default function MemoriserExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Configuration
    const [niveau, setNiveau] = useState(NIVEAUX[0])
    const [contexte, setContexte] = useState(null)

    // État de l'exercice
    const [elementsAMeroriser, setElementsAMemoriser] = useState([])
    const [tousElements, setTousElements] = useState([]) // Mémorisés + distracteurs
    const [phase, setPhase] = useState('choix_niveau') // 'choix_niveau', 'memorisation', 'fermeture', 'selection', 'resultat'
    const [tempsRestant, setTempsRestant] = useState(0)
    const [selectionsUtilisateur, setSelectionsUtilisateur] = useState([])
    const [banqueActuelle, setBanqueActuelle] = useState(null) // Pour accéder aux images frigo

    // Statistiques
    const [tempsDebut, setTempsDebut] = useState(null)
    const [tempsTotal, setTempsTotal] = useState(0)
    const [resultat, setResultat] = useState(null)

    // Préparer l'exercice
    const preparerExercice = useCallback((niveauChoisi) => {
        // Choisir un contexte aléatoire
        const contextesDisponibles = Object.keys(BANQUES_MEMORISER)
        const contexteChoisi = contextesDisponibles[nombreAleatoire(0, contextesDisponibles.length - 1)]
        const banque = BANQUES_MEMORISER[contexteChoisi]

        setContexte(contexteChoisi)
        setBanqueActuelle(banque) // Stocker la banque pour accéder aux images frigo

        // Piocher les éléments à mémoriser
        const aMemoriser = piocherElements(banque.elements, niveauChoisi.nbElements)
        setElementsAMemoriser(aMemoriser)

        // Piocher les distracteurs
        const distracteurs = piocherElements(banque.distracteurs, niveauChoisi.nbDistracteurs)

        // Mélanger tous les éléments
        const tous = melangerTableau([...aMemoriser, ...distracteurs])
        setTousElements(tous)

        setSelectionsUtilisateur([])
        // Plus de temps pour le mode frigo
        setTempsRestant(banque.mode === 'frigo' ? niveauChoisi.tempsAffichage + 2 : niveauChoisi.tempsAffichage)
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

        setIsLoading(false)
    }, [router])

    // Timer pour la phase de mémorisation
    useEffect(() => {
        if (phase === 'memorisation' && tempsRestant > 0) {
            const timer = setTimeout(() => {
                setTempsRestant(prev => prev - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (phase === 'memorisation' && tempsRestant === 0) {
            // Mode frigo : passer par la phase fermeture
            if (banqueActuelle?.mode === 'frigo') {
                setPhase('fermeture')
                // Après 2 secondes, passer à la sélection
                setTimeout(() => {
                    setPhase('selection')
                    setTempsDebut(Date.now())
                }, 2000)
            } else {
                // Mode normal : passer directement à la sélection
                setPhase('selection')
                setTempsDebut(Date.now())
            }
        }
    }, [phase, tempsRestant, banqueActuelle])

    // Démarrer avec un niveau
    const demarrerAvecNiveau = (niveauChoisi) => {
        setNiveau(niveauChoisi)
        preparerExercice(niveauChoisi)
        setPhase('memorisation')
    }

    // Sélectionner/Désélectionner un élément
    const toggleSelection = (element) => {
        setSelectionsUtilisateur(prev => {
            if (prev.some(e => e.id === element.id)) {
                return prev.filter(e => e.id !== element.id)
            } else {
                return [...prev, element]
            }
        })
    }

    // Vérifier les réponses
    const verifierReponses = () => {
        const tempsEcoule = Math.floor((Date.now() - tempsDebut) / 1000)
        setTempsTotal(tempsEcoule)

        // Compter les bonnes et mauvaises réponses
        let bonnesReponses = 0
        let faussesReponses = 0

        selectionsUtilisateur.forEach(selection => {
            const estCorrect = elementsAMeroriser.some(e => e.id === selection.id)
            if (estCorrect) {
                bonnesReponses++
            } else {
                faussesReponses++
            }
        })

        // Éléments oubliés
        const oublies = elementsAMeroriser.filter(e =>
            !selectionsUtilisateur.some(s => s.id === e.id)
        )

        const score = calculerScore(bonnesReponses, elementsAMeroriser.length)
        const parfait = bonnesReponses === elementsAMeroriser.length && faussesReponses === 0

        setResultat({
            bonnesReponses,
            faussesReponses,
            oublies,
            score,
            parfait,
            temps: tempsEcoule
        })
        setPhase('resultat')

        // Sauvegarder
        sauvegarderProgression(parfait, score, tempsEcoule)
    }

    // Sauvegarder la progression
    const sauvegarderProgression = async (reussi, score, temps) => {
        try {
            const token = localStorage.getItem('token')
            await fetch('/api/compter/progression', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    activite: 'memoriser',
                    contexte_code: contexte,
                    reussi,
                    score,
                    temps_secondes: temps,
                    nb_erreurs: resultat?.faussesReponses || 0,
                    nb_tentatives: 1,
                    details: { niveau: niveau.id }
                })
            })
        } catch (error) {
            console.error('Erreur sauvegarde progression:', error)
        }
    }

    // Recommencer
    const recommencer = () => {
        setResultat(null)
        setPhase('choix_niveau')
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
                <div style={{ color: '#ec4899', fontSize: '18px' }}>Chargement...</div>
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
                        color: '#ec4899',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🧠 MÉMORISER
                    </h1>

                    <div style={{ width: '80px' }}></div>
                </div>

                {/* Phase : Choix du niveau */}
                {phase === 'choix_niveau' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#fce7f3',
                            padding: '20px',
                            borderRadius: '15px',
                            marginBottom: '25px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 20px)',
                                color: '#9d174d',
                                fontWeight: '500'
                            }}>
                                Choisissez votre niveau de difficulté
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px'
                        }}>
                            {NIVEAUX.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => demarrerAvecNiveau(n)}
                                    style={{
                                        backgroundColor: '#ec4899',
                                        color: 'white',
                                        padding: '20px',
                                        borderRadius: '15px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{
                                        fontSize: 'clamp(18px, 4vw, 22px)',
                                        fontWeight: 'bold',
                                        marginBottom: '8px'
                                    }}>
                                        {n.nom}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        opacity: 0.9
                                    }}>
                                        {n.nbElements} éléments • {n.tempsAffichage} secondes
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Phase : Mémorisation */}
                {phase === 'memorisation' && (
                    <div style={{ textAlign: 'center' }}>
                        {/* Timer */}
                        <div style={{
                            backgroundColor: '#ec4899',
                            color: 'white',
                            padding: '15px',
                            borderRadius: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: 'bold'
                            }}>
                                {tempsRestant}
                            </div>
                            <div style={{ fontSize: '14px' }}>secondes restantes</div>
                        </div>

                        <p style={{
                            fontSize: '18px',
                            color: '#9d174d',
                            fontWeight: '500',
                            marginBottom: '20px'
                        }}>
                            {banqueActuelle?.mode === 'frigo'
                                ? '🧊 Regardez bien ce qu\'il y a dans le frigo !'
                                : `🧠 Mémorisez ces ${elementsAMeroriser.length} éléments !`
                            }
                        </p>

                        {/* Mode FRIGO : affichage spécial */}
                        {banqueActuelle?.mode === 'frigo' ? (
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '350px',
                                margin: '0 auto',
                                backgroundColor: '#e0f2fe',
                                borderRadius: '15px',
                                padding: '10px'
                            }}>
                                {/* Image du frigo ouvert */}
                                <img
                                    src={banqueActuelle.frigoOuvert}
                                    alt="Frigo ouvert"
                                    style={{
                                        width: '100%',
                                        borderRadius: '10px'
                                    }}
                                />
                                {/* Aliments positionnés dans le frigo */}
                                {elementsAMeroriser.map((element, index) => {
                                    const position = POSITIONS_FRIGO[index % POSITIONS_FRIGO.length]
                                    return (
                                        <div
                                            key={element.id}
                                            style={{
                                                position: 'absolute',
                                                top: position.top,
                                                left: position.left,
                                                transform: 'translate(-50%, -50%)',
                                                zIndex: 10
                                            }}
                                        >
                                            <img
                                                src={element.image}
                                                alt={element.label}
                                                style={{
                                                    width: '70px',
                                                    height: '70px',
                                                    objectFit: 'contain',
                                                    filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.3))'
                                                }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            /* Mode NORMAL : grille des éléments */
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                gap: '15px',
                                padding: '20px',
                                backgroundColor: '#fce7f3',
                                borderRadius: '15px'
                            }}>
                                {elementsAMeroriser.map((element) => (
                                    <div
                                        key={element.id}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            padding: '15px',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <div style={{ fontSize: '48px', marginBottom: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px' }}>
                                            {element.image ? (
                                                <img src={element.image} alt={element.label} style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} />
                                            ) : (
                                                element.emoji
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#374151'
                                        }}>
                                            {element.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Phase : Fermeture du frigo */}
                {phase === 'fermeture' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '20px',
                            borderRadius: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚪</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                                Le frigo se ferme...
                            </div>
                        </div>

                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '350px',
                            margin: '0 auto',
                            backgroundColor: '#e0f2fe',
                            borderRadius: '15px',
                            padding: '10px'
                        }}>
                            <img
                                src={banqueActuelle?.frigoFerme || banqueActuelle?.frigoOuvert}
                                alt="Frigo fermé"
                                style={{
                                    width: '100%',
                                    borderRadius: '10px'
                                }}
                            />
                        </div>

                        <p style={{
                            fontSize: '16px',
                            color: '#6b7280',
                            marginTop: '20px'
                        }}>
                            Qu'y avait-il dedans ? 🤔
                        </p>
                    </div>
                )}

                {/* Phase : Sélection */}
                {phase === 'selection' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#dbeafe',
                            padding: '15px',
                            borderRadius: '15px',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                color: '#1e40af',
                                fontWeight: '500',
                                margin: 0
                            }}>
                                {banqueActuelle?.mode === 'frigo'
                                    ? `🧊 Qu'y avait-il dans le frigo ? (${elementsAMeroriser.length} aliments)`
                                    : `Retrouvez les ${elementsAMeroriser.length} éléments mémorisés`
                                }
                            </p>
                            <p style={{
                                fontSize: '14px',
                                color: '#3b82f6',
                                marginTop: '5px'
                            }}>
                                Sélectionnés : {selectionsUtilisateur.length}/{elementsAMeroriser.length}
                            </p>
                        </div>

                        {/* Grille de tous les éléments */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                            gap: '12px',
                            marginBottom: '25px'
                        }}>
                            {tousElements.map((element) => {
                                const estSelectionne = selectionsUtilisateur.some(e => e.id === element.id)

                                return (
                                    <button
                                        key={element.id}
                                        onClick={() => toggleSelection(element)}
                                        style={{
                                            backgroundColor: estSelectionne ? '#ec4899' : '#f8fafc',
                                            color: estSelectionne ? 'white' : '#374151',
                                            border: estSelectionne
                                                ? '3px solid #be185d'
                                                : '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '12px 8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontSize: '48px', marginBottom: '3px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70px' }}>
                                            {element.image ? (
                                                <img src={element.image} alt={element.label} style={{ maxWidth: '70px', maxHeight: '70px', objectFit: 'contain' }} />
                                            ) : (
                                                element.emoji
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}>
                                            {element.label}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Bouton Vérifier */}
                        <button
                            onClick={verifierReponses}
                            style={{
                                width: '100%',
                                backgroundColor: '#ec4899',
                                color: 'white',
                                padding: '16px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                            }}
                        >
                            ✓ Vérifier mes réponses
                        </button>
                    </div>
                )}

                {/* Phase : Résultat */}
                {phase === 'resultat' && resultat && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                            {resultat.parfait ? '🎉' : resultat.score >= 50 ? '👍' : '💪'}
                        </div>

                        <h2 style={{
                            fontSize: 'clamp(24px, 6vw, 32px)',
                            color: resultat.parfait ? '#22c55e' : '#ec4899',
                            marginBottom: '15px'
                        }}>
                            {resultat.parfait ? 'PARFAIT !' : resultat.score >= 50 ? 'Bien joué !' : 'Continuez !'}
                        </h2>

                        {/* Détail des résultats */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '15px',
                            padding: '20px',
                            marginBottom: '25px'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '15px',
                                marginBottom: '20px'
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: '#22c55e'
                                    }}>
                                        {resultat.bonnesReponses}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Trouvés</div>
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: '#ef4444'
                                    }}>
                                        {resultat.faussesReponses}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Erreurs</div>
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: '#f59e0b'
                                    }}>
                                        {resultat.oublies.length}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Oubliés</div>
                                </div>
                            </div>

                            {/* Éléments oubliés */}
                            {resultat.oublies.length > 0 && (
                                <div>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        marginBottom: '10px'
                                    }}>
                                        Vous avez oublié :
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {resultat.oublies.map((e) => (
                                            <span key={e.id} style={{
                                                backgroundColor: '#fef3c7',
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                {e.image ? (
                                                    <img src={e.image} alt={e.label} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                                                ) : (
                                                    e.emoji
                                                )} {e.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{
                                marginTop: '15px',
                                paddingTop: '15px',
                                borderTop: '1px solid #e5e7eb'
                            }}>
                                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Temps : <strong>{formaterTemps(resultat.temps)}</strong> •
                                    Score : <strong>{resultat.score}%</strong>
                                </p>
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
                                    backgroundColor: '#ec4899',
                                    color: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Rejouer
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
                                    cursor: 'pointer'
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
