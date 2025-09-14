import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function StatsCompletion() {
    const [stats, setStats] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            // Charger les paniers et mots traités
            const response = await fetch('/api/paniers/charger', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                
                // Compter les syllabes total dans les paniers
                let totalSyllabes = 0
                let syllabesEnAttente = 0
                
                Object.entries(data.paniers || {}).forEach(([cle, lettreArray]) => {
                    if (cle === 'RESEGMENTATION' || cle === 'SONS_COMPLEXES') {
                        // Compter les syllabes en attente - ces paniers sont des tableaux directs
                        if (Array.isArray(lettreArray)) {
                            const syllabesValidesEnAttente = lettreArray.filter(s => s && typeof s === 'string' && s.trim())
                            syllabesEnAttente += syllabesValidesEnAttente.length
                            totalSyllabes += syllabesValidesEnAttente.length
                        }
                    } else {
                        // Compter les syllabes récoltées normalement - structure par lettres
                        if (lettreArray && typeof lettreArray === 'object') {
                            Object.values(lettreArray).forEach(syllabesArray => {
                                if (Array.isArray(syllabesArray)) {
                                    totalSyllabes += syllabesArray.length
                                }
                            })
                        }
                    }
                })

                // Nombre de mots traités
                const motsTraites = data.motsTraites || []
                
                setStats({
                    motsTraites: motsTraites.length,
                    syllabesRecoltees: totalSyllabes,
                    syllabesEnAttente: syllabesEnAttente,
                    motsTraitesList: motsTraites
                })
            }
            setIsLoading(false)
        } catch (error) {
            console.error('Erreur chargement stats:', error)
            setIsLoading(false)
        }
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
                <div style={{ color: '#84cc16', fontSize: '18px' }}>Chargement des statistiques...</div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    background: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#16a34a',
                        marginBottom: '10px'
                    }}>
                        🎉 Félicitations !
                    </h1>
                    <p style={{ 
                        color: '#666', 
                        fontSize: '18px',
                        marginBottom: '30px'
                    }}>
                        Vous avez terminé l'organisation de vos syllabes !
                    </p>
                </div>

                {/* Statistiques principales */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr 1fr',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    {/* Mots traités */}
                    <div style={{
                        background: '#dcfce7',
                        border: '3px solid #16a34a',
                        borderRadius: '12px',
                        padding: '25px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#16a34a',
                            marginBottom: '10px'
                        }}>
                            {stats?.motsTraites || 0}
                        </div>
                        <div style={{
                            fontSize: '18px',
                            color: '#14532d',
                            fontWeight: 'bold'
                        }}>
                            Mots entièrement traités
                        </div>
                    </div>

                    {/* Syllabes récoltées */}
                    <div style={{
                        background: '#dbeafe',
                        border: '3px solid #2563eb',
                        borderRadius: '12px',
                        padding: '25px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#2563eb',
                            marginBottom: '10px'
                        }}>
                            {stats?.syllabesRecoltees || 0}
                        </div>
                        <div style={{
                            fontSize: '18px',
                            color: '#1e40af',
                            fontWeight: 'bold'
                        }}>
                            Syllabes récoltées
                        </div>
                    </div>

                    {/* Syllabes en attente */}
                    <div style={{
                        background: '#fef3c7',
                        border: '3px solid #f59e0b',
                        borderRadius: '12px',
                        padding: '25px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#f59e0b',
                            marginBottom: '10px'
                        }}>
                            {stats?.syllabesEnAttente || 0}
                        </div>
                        <div style={{
                            fontSize: '18px',
                            color: '#92400e',
                            fontWeight: 'bold'
                        }}>
                            Syllabes en attente
                        </div>
                    </div>
                </div>

                {/* Liste des mots traités */}
                {stats?.motsTraitesList && stats.motsTraitesList.length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '25px',
                        borderRadius: '12px',
                        marginBottom: '30px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{
                            color: '#16a34a',
                            textAlign: 'center',
                            marginBottom: '20px',
                            fontSize: '24px',
                            fontWeight: 'bold'
                        }}>
                            🏆 Mots que vous avez entièrement organisés
                        </h2>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            justifyContent: 'center'
                        }}>
                            {stats.motsTraitesList.map((mot, index) => (
                                <span
                                    key={index}
                                    style={{
                                        background: '#16a34a',
                                        color: 'white',
                                        padding: '10px 16px',
                                        borderRadius: '20px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {mot}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Boutons d'action */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => router.push('/lire/voir-paniers')}
                        style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🗂️ Voir mes syllabes
                    </button>
                    
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
                            transition: 'all 0.2s ease'
                        }}
                    >
                        📝 Choisir un autre texte
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