import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { formaterTemps } from '../../lib/compter/genererExercice'

export default function ProgressionCompter() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [statistiques, setStatistiques] = useState(null)
    const [progressions, setProgressions] = useState([])

    // Configuration des activités
    const activites = [
        { id: 'ranger', nom: 'Ranger', emoji: '↕️', couleur: '#8b5cf6' },
        { id: 'trier', nom: 'Trier', emoji: '📁', couleur: '#22c55e' },
        { id: 'associer', nom: 'Associer', emoji: '🔗', couleur: '#3b82f6' },
        { id: 'compter', nom: 'Compter', emoji: '🔢', couleur: '#f59e0b' },
        { id: 'memoriser', nom: 'Mémoriser', emoji: '🧠', couleur: '#ec4899' }
    ]

    // Charger la progression
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

        // Charger les statistiques
        const chargerProgression = async () => {
            try {
                const response = await fetch('/api/compter/progression', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    setStatistiques(data.statistiques)
                    setProgressions(data.progressions || [])
                }
            } catch (error) {
                console.error('Erreur chargement progression:', error)
            }

            setIsLoading(false)
        }

        chargerProgression()
    }, [router])

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
                maxWidth: '700px',
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
                        color: '#8b5cf6'
                    }}>
                        📊 Ma Progression
                    </h1>

                    <div style={{ width: '80px' }}></div>
                </div>

                {/* Statistiques globales */}
                {statistiques && (
                    <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '15px',
                        padding: '20px',
                        marginBottom: '25px'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            color: '#374151',
                            marginBottom: '15px',
                            textAlign: 'center'
                        }}>
                            Résumé global
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '15px',
                            textAlign: 'center'
                        }}>
                            <div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: '#8b5cf6'
                                }}>
                                    {statistiques.total}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Exercices
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: '#22c55e'
                                }}>
                                    {statistiques.reussites}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Réussites
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: '#ef4444'
                                }}>
                                    {statistiques.echecs}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Échecs
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: '#3b82f6'
                                }}>
                                    {statistiques.score_moyen}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Score moyen
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats par activité */}
                <h2 style={{
                    fontSize: '18px',
                    color: '#374151',
                    marginBottom: '15px'
                }}>
                    Par activité
                </h2>

                <div style={{
                    display: 'grid',
                    gap: '12px',
                    marginBottom: '25px'
                }}>
                    {activites.map((activite) => {
                        const stats = statistiques?.par_activite?.[activite.id] || {
                            total: 0,
                            reussites: 0,
                            score_moyen: 0
                        }

                        return (
                            <div
                                key={activite.id}
                                style={{
                                    backgroundColor: 'white',
                                    border: `2px solid ${activite.couleur}30`,
                                    borderRadius: '12px',
                                    padding: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}
                            >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: `${activite.couleur}20`,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px'
                                }}>
                                    {activite.emoji}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '5px'
                                    }}>
                                        {activite.nom}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: '#6b7280'
                                    }}>
                                        {stats.total} exercice{stats.total > 1 ? 's' : ''} •
                                        {stats.reussites} réussi{stats.reussites > 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div style={{
                                    textAlign: 'right'
                                }}>
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: activite.couleur
                                    }}>
                                        {stats.score_moyen}%
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#9ca3af'
                                    }}>
                                        score moyen
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Historique récent */}
                {progressions.length > 0 && (
                    <>
                        <h2 style={{
                            fontSize: '18px',
                            color: '#374151',
                            marginBottom: '15px'
                        }}>
                            Historique récent
                        </h2>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {progressions.slice(0, 10).map((prog, index) => {
                                const activite = activites.find(a => a.id === prog.activite)

                                return (
                                    <div
                                        key={prog.id || index}
                                        style={{
                                            backgroundColor: prog.reussi ? '#dcfce7' : '#fef2f2',
                                            borderRadius: '8px',
                                            padding: '12px 15px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                    >
                                        <span style={{ fontSize: '20px' }}>
                                            {activite?.emoji || '📝'}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: '#374151'
                                            }}>
                                                {activite?.nom || prog.activite}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#6b7280'
                                            }}>
                                                {prog.contexte_code || ''} •
                                                {prog.temps_secondes ? ` ${formaterTemps(prog.temps_secondes)}` : ''}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: prog.reussi ? '#22c55e' : '#ef4444'
                                        }}>
                                            {prog.score}%
                                        </div>
                                        <span style={{ fontSize: '18px' }}>
                                            {prog.reussi ? '✅' : '❌'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Message si pas de progression */}
                {(!statistiques || statistiques.total === 0) && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '15px'
                    }}>
                        <div style={{ fontSize: '60px', marginBottom: '15px' }}>📊</div>
                        <p style={{
                            fontSize: '18px',
                            color: '#6b7280',
                            marginBottom: '20px'
                        }}>
                            Pas encore de progression enregistrée
                        </p>
                        <button
                            onClick={() => router.push('/compter')}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                padding: '12px 30px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Commencer un exercice
                        </button>
                    </div>
                )}

                {/* Info utilisateur */}
                <div style={{
                    marginTop: '25px',
                    padding: '10px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#64748b',
                    textAlign: 'center'
                }}>
                    Progression de <strong>{user?.prenom}</strong>
                </div>
            </div>
        </div>
    )
}
