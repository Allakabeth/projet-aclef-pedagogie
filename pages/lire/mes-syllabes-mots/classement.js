import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ClassementSyllabesMots() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [selectedTextes, setSelectedTextes] = useState([])
    const [textesDetails, setTextesDetails] = useState({})
    const [mots, setMots] = useState([])
    const [paniers, setPaniers] = useState({})
    const [motEnCours, setMotEnCours] = useState(null)
    const [motActuel, setMotActuel] = useState(null)
    const [indexActuel, setIndexActuel] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [exerciceStarted, setExerciceStarted] = useState(false)
    const router = useRouter()

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
        } catch (error) {
            console.error('Erreur parsing user data:', error)
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
                
                // Charger le nombre de syllabes-mots pour chaque texte
                await loadTextesDetails(data.textes || [])
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const loadTextesDetails = async (textesListe) => {
        const details = {}
        const token = localStorage.getItem('token')
        
        for (const texte of textesListe) {
            try {
                const response = await fetch(`/api/mots-classifies/monosyllabes?texteId=${texte.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                
                if (response.ok) {
                    const data = await response.json()
                    details[texte.id] = {
                        nombreSyllabesMots: data.monosyllabes?.length || 0
                    }
                }
            } catch (error) {
                console.error(`Erreur chargement détails texte ${texte.id}:`, error)
                details[texte.id] = { nombreSyllabesMots: 0 }
            }
        }
        
        setTextesDetails(details)
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
                    console.log(`Monosyllabes texte ${texteId}:`, data.monosyllabes?.length || 0)
                    tousLesMonosyllabes.push(...(data.monosyllabes || []))
                }
            }
            
            // Éliminer les doublons
            const monosyllabesUniques = [...new Set(tousLesMonosyllabes)]
            console.log(`Total monosyllabes uniques: ${monosyllabesUniques.length}`)
            
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
            setExerciceStarted(true)
        } catch (error) {
            console.error('Erreur chargement monosyllabes validés:', error)
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

    const toggleTexteSelection = (texteId) => {
        setSelectedTextes(prev => {
            if (prev.includes(texteId)) {
                return prev.filter(id => id !== texteId)
            } else {
                return [...prev, texteId]
            }
        })
    }

    const startExercise = () => {
        if (selectedTextes.length === 0) {
            alert('Veuillez sélectionner au moins un texte')
            return
        }
        loadSyllabesMots()
    }

    const getTotalSyllabesMots = () => {
        return selectedTextes.reduce((total, texteId) => {
            return total + (textesDetails[texteId]?.nombreSyllabesMots || 0)
        }, 0)
    }

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
                    text: `Le mot est : ${text}`,
                    voice_id: 'AfbuxQ9DVtS4azaxN1W7'
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
            const utterance = new SpeechSynthesisUtterance(`Le mot est : ${text}`)
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
            loadSyllabesMots()
        }
    }

    const retourSelection = () => {
        setSelectedTextes([])
        setMots([])
        setMotActuel(null)
        setIndexActuel(0)
        setIsCompleted(false)
        setPaniers({})
        setExerciceStarted(false)
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
                <div style={{ color: '#ef4444', fontSize: '18px' }}>Chargement...</div>
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
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🏷️ Classement par initiale
                </h1>

                {/* Sélection des textes */}
                {!exerciceStarted && (
                    <div>
                        <p style={{ 
                            textAlign: 'center', 
                            marginBottom: '30px', 
                            color: '#666',
                            fontSize: '16px'
                        }}>
                            Choisissez un ou plusieurs textes pour classer les mots par initiale
                        </p>

                        <div style={{
                            background: '#f8f9fa',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px'
                        }}>
                            <h2 style={{ 
                                marginBottom: '20px', 
                                color: '#333',
                                fontSize: '20px',
                                textAlign: 'center'
                            }}>
                                📚 Choisissez un ou plusieurs textes
                            </h2>
                            
                            {textes.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    background: '#fff3cd',
                                    borderRadius: '8px',
                                    border: '1px solid #ffeaa7'
                                }}>
                                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 Aucun texte disponible</p>
                                    <p style={{ fontSize: '14px', color: '#666' }}>
                                        Créez d'abord un texte de référence dans "📚 Mes textes références"
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                        gap: '15px',
                                        marginBottom: '25px'
                                    }}>
                                        {textes.map(texte => {
                                            const isSelected = selectedTextes.includes(texte.id)
                                            const details = textesDetails[texte.id]
                                            
                                            return (
                                                <div
                                                    key={texte.id}
                                                    style={{
                                                        padding: '20px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ddd',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '15px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleTexteSelection(texte.id)}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ 
                                                            fontSize: '18px', 
                                                            fontWeight: 'bold',
                                                            marginBottom: '5px',
                                                            color: '#333'
                                                        }}>
                                                            {texte.titre}
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: '#666' }}>
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
                                    
                                    {/* Boutons de validation */}
                                    <div style={{ 
                                        textAlign: 'center',
                                        padding: '20px',
                                        background: '#f0f9ff',
                                        borderRadius: '8px'
                                    }}>
                                        {selectedTextes.length > 0 && (
                                            <div style={{ marginBottom: '15px' }}>
                                                <strong style={{ color: '#0284c7' }}>
                                                    {selectedTextes.length} texte{selectedTextes.length > 1 ? 's' : ''} sélectionné{selectedTextes.length > 1 ? 's' : ''} • 
                                                    {getTotalSyllabesMots()} syllabes-mots au total
                                                </strong>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                            <button
                                                onClick={startExercise}
                                                disabled={selectedTextes.length === 0}
                                                style={{
                                                    backgroundColor: selectedTextes.length > 0 ? '#10b981' : '#ccc',
                                                    color: 'white',
                                                    padding: '12px 30px',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold',
                                                    cursor: selectedTextes.length > 0 ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                🚀 Valider et commencer l'exercice
                                            </button>
                                            
                                            {selectedTextes.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedTextes([])}
                                                    style={{
                                                        backgroundColor: '#6b7280',
                                                        color: 'white',
                                                        padding: '8px 20px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🗑️ Tout décocher
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Exercice de classement */}
                {exerciceStarted && (
                    <div>
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
                )}

                {/* Bouton retour */}
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button
                        onClick={() => router.push('/lire/mes-syllabes-mots')}
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
                        ← Retour aux exercices
                    </button>
                </div>
            </div>
        </div>
    )
}