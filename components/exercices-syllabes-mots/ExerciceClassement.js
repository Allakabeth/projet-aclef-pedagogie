import { useState, useEffect } from 'react'

export default function ExerciceClassement({ selectedTextes, retourSelection }) {
    const [mots, setMots] = useState([])
    const [paniers, setPaniers] = useState({})
    const [motEnCours, setMotEnCours] = useState(null)
    const [motActuel, setMotActuel] = useState(null)
    const [indexActuel, setIndexActuel] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (selectedTextes && selectedTextes.length > 0) {
            loadSyllabesMots()
        }
    }, [])

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
        // Créer des paniers pour toutes les lettres de l'alphabet
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

        const nouvellesPaniers = {}
        alphabet.forEach(lettre => {
            nouvellesPaniers[lettre] = []
        })

        setPaniers(nouvellesPaniers)
    }

    const playAudio = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'fr-FR'
            utterance.rate = 0.8
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
            // Normaliser la première lettre (enlever accents et mettre en majuscule)
            const initialeAttendue = motActuel.charAt(0)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()

            if (lettre === initialeAttendue) {
                // Bonne réponse
                const nouveauxPaniers = { ...paniers }
                nouveauxPaniers[lettre] = [...nouveauxPaniers[lettre], motActuel]
                setPaniers(nouveauxPaniers)

                // Passer au mot suivant
                passerAuMotSuivant()
            } else {
                // Mauvaise réponse - feedback visuel
                alert(`❌ "${motActuel}" commence par "${initialeAttendue}", pas par "${lettre}"`)
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
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#666',
                    fontSize: '16px'
                }}>
                    Glissez chaque mot dans la bonne lettre selon sa première lettre
                </p>

                {/* En-tête avec informations */}
                <div style={{
                    background: '#fee2e2',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    textAlign: 'center'
                }}>
                    <h3 style={{
                        color: '#ef4444',
                        marginBottom: '10px',
                        fontSize: '18px'
                    }}>
                        📖 {selectedTextes.length} texte{selectedTextes.length > 1 ? 's' : ''} sélectionné{selectedTextes.length > 1 ? 's' : ''}
                    </h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Mot {indexActuel + 1} sur {mots.length}
                    </p>

                    {isCompleted && (
                        <div style={{
                            marginTop: '15px',
                            padding: '15px',
                            background: '#d1fae5',
                            borderRadius: '8px',
                            border: '2px solid #10b981'
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎉</div>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#059669'
                            }}>
                                Bravo ! Tous les mots sont classés !
                            </div>
                        </div>
                    )}
                </div>

                {/* Mot actuel à classer - centré au dessus */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    padding: '20px',
                    background: '#f8f9fa',
                    borderRadius: '12px'
                }}>
                    {isCompleted ? (
                        <div style={{
                            color: '#10b981',
                            fontSize: '24px'
                        }}>
                            ✅ Tous les mots sont classés !
                        </div>
                    ) : !motActuel ? (
                        <div style={{
                            color: '#666',
                            fontSize: '16px'
                        }}>
                            Chargement du mot...
                        </div>
                    ) : (
                        <div>
                            <h3 style={{
                                fontSize: '16px',
                                marginBottom: '15px',
                                color: '#333'
                            }}>
                                📝 Glissez ce mot dans la bonne lettre :
                            </h3>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, motActuel)}
                                onClick={() => playAudio(motActuel)}
                                style={{
                                    padding: '15px 25px',
                                    background: '#fff',
                                    borderRadius: '12px',
                                    border: '3px solid #ef4444',
                                    textAlign: 'center',
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    cursor: 'grab',
                                    transition: 'transform 0.2s ease',
                                    userSelect: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    margin: '0 auto 10px auto',
                                    display: 'inline-block'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                {motActuel}
                            </div>
                            <div>
                                <button
                                    onClick={() => playAudio(motActuel)}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔊 Écouter
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Paniers de lettres - toute la largeur */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        marginBottom: '20px',
                        color: '#333',
                        textAlign: 'center'
                    }}>
                        🏷️ Paniers par lettre
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '8px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {Object.keys(paniers).map(lettre => (
                            <div
                                key={lettre}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, lettre)}
                                style={{
                                    minHeight: '80px',
                                    padding: '10px',
                                    background: '#e0f2fe',
                                    borderRadius: '8px',
                                    border: '2px dashed #0ea5e9',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#0369a1',
                                    marginBottom: '8px'
                                }}>
                                    {lettre}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}>
                                    {paniers[lettre].map((mot, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '4px',
                                                background: '#dcfce7',
                                                borderRadius: '4px',
                                                border: '1px solid #16a34a',
                                                fontSize: '10px',
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

                {/* Actions */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px',
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={resetExercice}
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
                        🔄 Recommencer
                    </button>

                    <button
                        onClick={retourSelection}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '12px 25px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        📚 Changer de textes
                    </button>
                </div>
            </div>
        </div>
    )
}
