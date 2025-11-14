import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function PhrasesPregenerees() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [apprenants, setApprenants] = useState([])
    const [selectedApprenant, setSelectedApprenant] = useState(null)
    const [combinaisons, setCombinaisons] = useState([])
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            loadStats()
            loadApprenants()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadStats = async () => {
        try {
            const response = await fetch('/api/admin/phrases/stats')
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error)
        }
    }

    const loadApprenants = async () => {
        try {
            const response = await fetch('/api/admin/phrases/apprenants')
            if (response.ok) {
                const data = await response.json()
                setApprenants(data.apprenants || [])
            }
        } catch (error) {
            console.error('Erreur chargement apprenants:', error)
        }
    }

    const loadCombinaisons = async (userId) => {
        try {
            const response = await fetch(`/api/admin/phrases/combinaisons?user_id=${userId}`)
            if (response.ok) {
                const data = await response.json()
                setCombinaisons(data.combinaisons || [])
            }
        } catch (error) {
            console.error('Erreur chargement combinaisons:', error)
        }
    }

    const selectApprenant = (apprenant) => {
        setSelectedApprenant(apprenant)
        loadCombinaisons(apprenant.user_id)
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
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: '#333'
                    }}>
                        📝 Gestion des Phrases Pré-générées
                    </h1>
                    <p style={{ color: '#666', fontSize: '16px' }}>
                        Monitoring et gestion des phrases générées pour l'exercice "Construis phrases"
                    </p>
                </div>

                {/* Stats globales */}
                <div style={{
                    background: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '30px'
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: '#8b5cf6'
                    }}>
                        📊 Statistiques globales
                    </h2>
                    {stats ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px'
                        }}>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#8b5cf6'
                                }}>
                                    {stats.total_combinaisons || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Combinaisons générées
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#10b981'
                                }}>
                                    {stats.total_phrases || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Phrases totales
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#3b82f6'
                                }}>
                                    {stats.nb_apprenants || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Apprenants
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#f59e0b'
                                }}>
                                    {stats.moyenne_phrases_par_combo ? Math.round(stats.moyenne_phrases_par_combo) : 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Phrases / combo (moy.)
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666' }}>
                            Chargement des statistiques...
                        </div>
                    )}
                </div>

                {/* Layout 2 colonnes */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: selectedApprenant ? '350px 1fr' : '1fr',
                    gap: '20px'
                }}>
                    {/* Liste des apprenants */}
                    <div style={{
                        background: 'white',
                        padding: '25px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        height: 'fit-content'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            color: '#333'
                        }}>
                            👥 Apprenants ({apprenants.length})
                        </h2>
                        {apprenants.length === 0 ? (
                            <p style={{ color: '#666', fontSize: '14px' }}>
                                Aucun apprenant avec des phrases générées
                            </p>
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {apprenants.map((app, index) => (
                                    <div
                                        key={index}
                                        onClick={() => selectApprenant(app)}
                                        style={{
                                            padding: '12px',
                                            marginBottom: '8px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: selectedApprenant?.user_id === app.user_id ? '#f3f4f6' : 'transparent',
                                            border: selectedApprenant?.user_id === app.user_id ? '2px solid #8b5cf6' : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedApprenant?.user_id !== app.user_id) {
                                                e.currentTarget.style.background = '#f9fafb'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedApprenant?.user_id !== app.user_id) {
                                                e.currentTarget.style.background = 'transparent'
                                            }
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: '#333',
                                            marginBottom: '4px'
                                        }}>
                                            {app.identifiant || app.email || `User ${app.user_id}`}
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#666'
                                        }}>
                                            {app.nb_phrases} phrases • {app.nb_combinaisons} combinaisons
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Détail des combinaisons */}
                    {selectedApprenant && (
                        <div style={{
                            background: 'white',
                            padding: '25px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                marginBottom: '20px',
                                color: '#333'
                            }}>
                                📋 Combinaisons de {selectedApprenant.identifiant || selectedApprenant.email || `User ${selectedApprenant.user_id}`}
                            </h2>
                            {combinaisons.length === 0 ? (
                                <p style={{ color: '#666', fontSize: '14px' }}>
                                    Aucune combinaison trouvée
                                </p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {combinaisons.map((combo, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '15px',
                                                marginBottom: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                background: '#f9fafb'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '10px'
                                            }}>
                                                <div>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: '#8b5cf6',
                                                        fontSize: '14px'
                                                    }}>
                                                        Textes [{combo.texte_ids.join(', ')}]
                                                    </span>
                                                </div>
                                                <div style={{
                                                    background: '#10b981',
                                                    color: 'white',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '13px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {combo.nb_phrases} phrases
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: '#666'
                                            }}>
                                                Source: {combo.source || 'N/A'} •
                                                Généré le {new Date(combo.created_at).toLocaleDateString('fr-FR')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/admin/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        ← Retour
                    </button>
                </div>
            </div>
        </div>
    )
}
