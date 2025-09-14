import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VoirPaniers() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [paniers, setPaniers] = useState({})
    const [totalMots, setTotalMots] = useState(0)
    const [selectedLetter, setSelectedLetter] = useState('A')
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
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
        loadPaniers()
    }, [router])

    const loadPaniers = async () => {
        try {
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                
                // Transformer la structure des paniers : paniers[lettre][nom_panier] = [syllabes] 
                // vers : paniers[lettre] = [{nom: nom_panier, mots: [syllabes]}]
                const transformedPaniers = {}
                Object.keys(data.paniers || {}).forEach(lettre => {
                    transformedPaniers[lettre] = []
                    Object.keys(data.paniers[lettre] || {}).forEach(nomPanier => {
                        transformedPaniers[lettre].push({
                            nom: nomPanier,
                            mots: data.paniers[lettre][nomPanier] || []
                        })
                    })
                })
                
                setPaniers(transformedPaniers)
                
                // Calculer le nombre total de mots avec la nouvelle structure
                const total = Object.values(transformedPaniers).reduce((acc, letterPaniers) => {
                    return acc + letterPaniers.reduce((letterAcc, panier) => {
                        return letterAcc + (panier.mots ? panier.mots.length : 0)
                    }, 0)
                }, 0)
                setTotalMots(total)
            }
        } catch (error) {
            console.error('Erreur chargement paniers:', error)
        }
    }



    // Sélectionner automatiquement la première lettre avec des paniers
    useEffect(() => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AUTRES'])
        const firstLetterWithPaniers = alphabet.find(letter => paniers[letter] && paniers[letter].length > 0)
        if (firstLetterWithPaniers && (!paniers[selectedLetter] || paniers[selectedLetter].length === 0)) {
            setSelectedLetter(firstLetterWithPaniers)
        }
    }, [paniers, selectedLetter])

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#84cc16', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AUTRES', 'SONS_COMPLEXES', 'RESEGMENTATION'])
    const lettresAvecPaniers = alphabet.filter(letter => paniers[letter] && paniers[letter].length > 0)

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '10px'
                    }}>
                        🗂️ Mes Paniers de Syllabes
                    </h1>
                    <p style={{ color: '#666', fontSize: '16px' }}>
                        Consultez l'organisation de vos syllabes par textes
                    </p>
                </div>

                {/* Résumé */}
                {Object.keys(paniers).length > 0 && (
                    <div style={{
                        background: '#e0f2fe',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#0369a1'
                        }}>
                            📊 {lettresAvecPaniers.length} lettres • {Object.values(paniers).reduce((acc, letterPaniers) => acc + letterPaniers.length, 0)} paniers • {totalMots} mots organisés
                        </div>
                    </div>
                )}

                {/* Navigation alphabet */}
                {Object.keys(paniers).length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ color: '#333', marginBottom: '15px', textAlign: 'center' }}>🔤 Choisissez une lettre</h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
                            gap: '10px',
                            maxWidth: '800px',
                            margin: '0 auto'
                        }}>
                            {alphabet.map(letter => {
                                const hasData = paniers[letter] && paniers[letter].length > 0
                                const isSelected = selectedLetter === letter
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => setSelectedLetter(letter)}
                                        disabled={!hasData}
                                        style={{
                                            padding: '12px 8px',
                                            borderRadius: '8px',
                                            border: isSelected ? '3px solid #84cc16' : hasData ? '2px solid #e5e7eb' : '2px solid #f3f4f6',
                                            background: isSelected ? '#dcfce7' : hasData ? 'white' : '#f9fafb',
                                            color: isSelected ? '#16a34a' : hasData ? '#333' : '#9ca3af',
                                            fontWeight: isSelected ? 'bold' : hasData ? 'normal' : 'normal',
                                            cursor: hasData ? 'pointer' : 'not-allowed',
                                            fontSize: '16px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {letter === 'RESEGMENTATION' ? '✂️' : letter === 'SONS_COMPLEXES' ? '🤔' : letter === 'AUTRES' ? '✦' : letter}
                                        {hasData && (
                                            <div style={{ fontSize: '10px', color: '#84cc16' }}>
                                                {paniers[letter].length}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Affichage des paniers de la lettre sélectionnée */}
                {paniers[selectedLetter] && paniers[selectedLetter].length > 0 ? (
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: selectedLetter === 'SONS_COMPLEXES' ? '#c2410c' : '#84cc16',
                            marginBottom: '15px',
                            textAlign: 'center',
                            background: selectedLetter === 'SONS_COMPLEXES' ? '#fed7aa' : '#f0f9ff',
                            padding: '10px',
                            borderRadius: '8px'
                        }}>
                            {selectedLetter === 'RESEGMENTATION' ? '✂️ RESEGMENTATION' :
                             selectedLetter === 'SONS_COMPLEXES' ? '🤔 SONS COMPLEXES' : 
                             selectedLetter === 'AUTRES' ? '🔤 AUTRES' : 
                             `🔤 ${selectedLetter}`}
                            <div style={{ fontSize: '16px', color: '#666', marginTop: '5px' }}>
                                {paniers[selectedLetter].length} panier{paniers[selectedLetter].length > 1 ? 's' : ''}
                            </div>
                        </h2>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '15px'
                        }}>
                            {paniers[selectedLetter].map((panier, index) => (
                                <div key={index} style={{
                                    background: '#fefce8',
                                    border: '2px solid #84cc16',
                                    borderRadius: '8px',
                                    padding: '15px'
                                }}>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        color: '#365314',
                                        marginBottom: '10px'
                                    }}>
                                        📂 {panier.nom} ({panier.mots ? panier.mots.length : 0} mots)
                                    </h3>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px'
                                    }}>
                                        {(panier.mots || []).map((mot, motIndex) => (
                                            <span key={motIndex} style={{
                                                background: '#84cc16',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}>
                                                {mot}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
                        <h3 style={{ color: '#666', marginBottom: '10px' }}>Aucun panier trouvé</h3>
                        <p style={{ color: '#999' }}>
                            Commencez par organiser vos syllabes dans l'exercice "Mes Syllabes"
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/lire/syllabes-paniers')}
                        style={{
                            backgroundColor: '#84cc16',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginRight: '15px'
                        }}
                    >
                        🚀 Organiser mes syllabes
                    </button>
                    
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour aux activités
                    </button>
                </div>
            </div>
        </div>
    )
}