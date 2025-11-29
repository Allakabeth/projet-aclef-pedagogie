import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { melangerTableau, nombreAleatoire, calculerScore, formaterTemps } from '../../../lib/compter/genererExercice'

// Données de fallback pour ASSOCIER
const DONNEES_ASSOCIER = {
    monnaie: {
        consigne: 'Reliez le montant aux pièces ou billets',
        paires: [
            { id: 1, gauche: '1 €', droite: 'Pièce de 1 euro', paire_id: 1 },
            { id: 2, gauche: '2 €', droite: 'Pièce de 2 euros', paire_id: 2 },
            { id: 3, gauche: '5 €', droite: 'Billet de 5 euros', paire_id: 3 },
            { id: 4, gauche: '10 €', droite: 'Billet de 10 euros', paire_id: 4 },
            { id: 5, gauche: '20 €', droite: 'Billet de 20 euros', paire_id: 5 }
        ]
    },
    quantites: {
        consigne: 'Reliez le nombre au bon groupe d\'objets',
        paires: [
            { id: 1, gauche: '3', droite: '🍎🍎🍎', paire_id: 1 },
            { id: 2, gauche: '5', droite: '🍎🍎🍎🍎🍎', paire_id: 2 },
            { id: 3, gauche: '2', droite: '🍎🍎', paire_id: 3 },
            { id: 4, gauche: '4', droite: '🍎🍎🍎🍎', paire_id: 4 },
            { id: 5, gauche: '6', droite: '🍎🍎🍎🍎🍎🍎', paire_id: 5 }
        ]
    },
    panneaux: {
        consigne: 'Reliez chaque panneau à sa signification',
        paires: [
            { id: 1, gauche: '🛑', droite: 'STOP - Arrêt obligatoire', paire_id: 1 },
            { id: 2, gauche: '⛔', droite: 'Sens interdit', paire_id: 2 },
            { id: 3, gauche: '🅿️', droite: 'Parking autorisé', paire_id: 3 },
            { id: 4, gauche: '🚸', droite: 'Attention enfants', paire_id: 4 },
            { id: 5, gauche: '⚠️', droite: 'Danger', paire_id: 5 }
        ]
    },
    mots_images: {
        consigne: 'Reliez chaque mot à son image',
        paires: [
            { id: 1, gauche: 'PAIN', droite: '🥖', paire_id: 1 },
            { id: 2, gauche: 'LAIT', droite: '🥛', paire_id: 2 },
            { id: 3, gauche: 'EAU', droite: '💧', paire_id: 3 },
            { id: 4, gauche: 'POMME', droite: '🍎', paire_id: 4 },
            { id: 5, gauche: 'FROMAGE', droite: '🧀', paire_id: 5 }
        ]
    }
}

export default function AssocierExercice() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // État de l'exercice
    const [contexte, setContexte] = useState(null)
    const [consigne, setConsigne] = useState('')
    const [colonneGauche, setColonneGauche] = useState([])
    const [colonneDroite, setColonneDroite] = useState([])
    const [pairesCorrectes, setPairesCorrectes] = useState([])

    // État du jeu
    const [phase, setPhase] = useState('jeu')
    const [selectedGauche, setSelectedGauche] = useState(null)
    const [associations, setAssociations] = useState([]) // [{ gaucheId, droiteId }]
    const [elementsAssocies, setElementsAssocies] = useState({ gauche: [], droite: [] })

    // Statistiques
    const [tempsDebut, setTempsDebut] = useState(null)
    const [tempsEcoule, setTempsEcoule] = useState(0)
    const [nbTentatives, setNbTentatives] = useState(0)
    const [resultat, setResultat] = useState(null)

    // Couleurs pour les lignes d'association
    const couleursLignes = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444']

    // Charger les données de l'exercice
    const chargerExercice = useCallback(async (token) => {
        // Utiliser les données locales (API sera ajoutée plus tard)
        const contextesDisponibles = Object.keys(DONNEES_ASSOCIER)
        const contexteChoisi = contextesDisponibles[nombreAleatoire(0, contextesDisponibles.length - 1)]
        const donnees = DONNEES_ASSOCIER[contexteChoisi]

        // Piocher 4 à 5 paires
        const nbPaires = nombreAleatoire(4, 5)
        const pairesPiochees = melangerTableau(donnees.paires).slice(0, nbPaires)

        // Créer les deux colonnes mélangées indépendamment
        const gauche = pairesPiochees.map(p => ({
            id: p.id,
            label: p.gauche,
            paire_id: p.paire_id
        }))
        const droite = pairesPiochees.map(p => ({
            id: p.id,
            label: p.droite,
            paire_id: p.paire_id
        }))

        setContexte(contexteChoisi)
        setConsigne(donnees.consigne)
        setPairesCorrectes(pairesPiochees)
        setColonneGauche(melangerTableau(gauche))
        setColonneDroite(melangerTableau(droite))
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

    // Gérer la sélection à gauche
    const handleSelectGauche = (element) => {
        // Si déjà associé, ne rien faire
        if (elementsAssocies.gauche.includes(element.id)) return

        if (selectedGauche?.id === element.id) {
            setSelectedGauche(null)
        } else {
            setSelectedGauche(element)
        }
    }

    // Gérer la sélection à droite (créer l'association)
    const handleSelectDroite = (element) => {
        // Si déjà associé ou pas de sélection gauche, ne rien faire
        if (elementsAssocies.droite.includes(element.id) || !selectedGauche) return

        // Créer l'association
        const nouvelleAssociation = {
            gaucheId: selectedGauche.id,
            droiteId: element.id,
            couleur: couleursLignes[associations.length % couleursLignes.length]
        }

        setAssociations(prev => [...prev, nouvelleAssociation])
        setElementsAssocies(prev => ({
            gauche: [...prev.gauche, selectedGauche.id],
            droite: [...prev.droite, element.id]
        }))
        setSelectedGauche(null)
    }

    // Annuler une association
    const annulerAssociation = (association) => {
        setAssociations(prev => prev.filter(a =>
            a.gaucheId !== association.gaucheId || a.droiteId !== association.droiteId
        ))
        setElementsAssocies(prev => ({
            gauche: prev.gauche.filter(id => id !== association.gaucheId),
            droite: prev.droite.filter(id => id !== association.droiteId)
        }))
    }

    // Obtenir la couleur d'un élément associé
    const getCouleurElement = (elementId, cote) => {
        const association = associations.find(a =>
            cote === 'gauche' ? a.gaucheId === elementId : a.droiteId === elementId
        )
        return association?.couleur || null
    }

    // Vérifier la réponse
    const verifierReponse = () => {
        // Vérifier que toutes les associations sont faites
        if (associations.length < colonneGauche.length) {
            return
        }

        setNbTentatives(prev => prev + 1)

        // Vérifier chaque association
        let bonnesReponses = 0
        associations.forEach(assoc => {
            const elementGauche = colonneGauche.find(e => e.id === assoc.gaucheId)
            const elementDroite = colonneDroite.find(e => e.id === assoc.droiteId)

            if (elementGauche && elementDroite && elementGauche.paire_id === elementDroite.paire_id) {
                bonnesReponses++
            }
        })

        const score = calculerScore(bonnesReponses, colonneGauche.length)

        if (bonnesReponses === colonneGauche.length) {
            setResultat({
                reussi: true,
                score: 100,
                temps: tempsEcoule,
                tentatives: nbTentatives + 1,
                bonnesReponses,
                total: colonneGauche.length
            })
            setPhase('resultat')
            sauvegarderProgression(true, 100)
        } else {
            // Réinitialiser les associations
            setAssociations([])
            setElementsAssocies({ gauche: [], droite: [] })
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
                    activite: 'associer',
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
        setSelectedGauche(null)
        setAssociations([])
        setElementsAssocies({ gauche: [], droite: [] })

        const token = localStorage.getItem('token')
        chargerExercice(token)
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
                <div style={{ color: '#3b82f6', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '700px',
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
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🔗 ASSOCIER
                    </h1>

                    <div style={{ width: '80px' }}></div>
                </div>

                {phase === 'jeu' && (
                    <>
                        {/* Consigne */}
                        <div style={{
                            backgroundColor: '#dbeafe',
                            padding: '12px 15px',
                            borderRadius: '12px',
                            marginBottom: '15px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: 'clamp(14px, 3vw, 18px)',
                                color: '#1e40af',
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
                            marginBottom: '20px'
                        }}>
                            {selectedGauche
                                ? '👆 Maintenant, tapez sur l\'élément correspondant à droite'
                                : '👆 Tapez sur un élément à gauche pour commencer'}
                        </p>

                        {/* Zone des deux colonnes */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '20px',
                            marginBottom: '25px'
                        }}>
                            {/* Colonne gauche */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <h3 style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    textAlign: 'center',
                                    marginBottom: '5px'
                                }}>
                                    À associer
                                </h3>
                                {colonneGauche.map((element) => {
                                    const estAssocie = elementsAssocies.gauche.includes(element.id)
                                    const couleurAssociation = getCouleurElement(element.id, 'gauche')
                                    const estSelectionne = selectedGauche?.id === element.id

                                    return (
                                        <button
                                            key={element.id}
                                            onClick={() => handleSelectGauche(element)}
                                            disabled={estAssocie}
                                            style={{
                                                backgroundColor: estAssocie
                                                    ? `${couleurAssociation}20`
                                                    : estSelectionne
                                                        ? '#fef3c7'
                                                        : '#f8fafc',
                                                border: estAssocie
                                                    ? `3px solid ${couleurAssociation}`
                                                    : estSelectionne
                                                        ? '3px solid #f59e0b'
                                                        : '2px solid #e5e7eb',
                                                borderRadius: '12px',
                                                padding: '15px',
                                                cursor: estAssocie ? 'default' : 'pointer',
                                                fontSize: 'clamp(16px, 4vw, 20px)',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {element.label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Colonne droite */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <h3 style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    textAlign: 'center',
                                    marginBottom: '5px'
                                }}>
                                    Correspondance
                                </h3>
                                {colonneDroite.map((element) => {
                                    const estAssocie = elementsAssocies.droite.includes(element.id)
                                    const couleurAssociation = getCouleurElement(element.id, 'droite')

                                    return (
                                        <button
                                            key={element.id}
                                            onClick={() => handleSelectDroite(element)}
                                            disabled={estAssocie || !selectedGauche}
                                            style={{
                                                backgroundColor: estAssocie
                                                    ? `${couleurAssociation}20`
                                                    : '#f8fafc',
                                                border: estAssocie
                                                    ? `3px solid ${couleurAssociation}`
                                                    : '2px solid #e5e7eb',
                                                borderRadius: '12px',
                                                padding: '15px',
                                                cursor: estAssocie || !selectedGauche ? 'default' : 'pointer',
                                                fontSize: 'clamp(14px, 3vw, 18px)',
                                                fontWeight: '500',
                                                transition: 'all 0.2s ease',
                                                textAlign: 'center',
                                                opacity: !selectedGauche && !estAssocie ? 0.6 : 1
                                            }}
                                        >
                                            {element.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Liste des associations faites */}
                        {associations.length > 0 && (
                            <div style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                padding: '15px',
                                marginBottom: '20px'
                            }}>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    marginBottom: '10px',
                                    textAlign: 'center'
                                }}>
                                    Vos associations ({associations.length}/{colonneGauche.length}) - Cliquez pour annuler
                                </p>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    justifyContent: 'center'
                                }}>
                                    {associations.map((assoc, index) => {
                                        const gauche = colonneGauche.find(e => e.id === assoc.gaucheId)
                                        const droite = colonneDroite.find(e => e.id === assoc.droiteId)

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => annulerAssociation(assoc)}
                                                style={{
                                                    backgroundColor: `${assoc.couleur}15`,
                                                    border: `2px solid ${assoc.couleur}`,
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <span>{gauche?.label}</span>
                                                <span style={{ color: assoc.couleur }}>↔</span>
                                                <span>{droite?.label}</span>
                                                <span style={{ color: '#ef4444', marginLeft: '5px' }}>✕</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Bouton Vérifier */}
                        <button
                            onClick={verifierReponse}
                            disabled={associations.length < colonneGauche.length}
                            style={{
                                width: '100%',
                                backgroundColor: associations.length < colonneGauche.length ? '#d1d5db' : '#3b82f6',
                                color: 'white',
                                padding: '16px',
                                borderRadius: '15px',
                                border: 'none',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: associations.length < colonneGauche.length ? 'not-allowed' : 'pointer',
                                boxShadow: associations.length < colonneGauche.length ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            {associations.length < colonneGauche.length
                                ? `Associez tous les éléments (${associations.length}/${colonneGauche.length})`
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
                                ? 'Toutes les associations sont correctes !'
                                : `${resultat.bonnesReponses}/${resultat.total} correctes. Réessayez !`
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
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {resultat.score}%
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Score</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {formaterTemps(resultat.temps)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Temps</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
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
                                    backgroundColor: '#3b82f6',
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
