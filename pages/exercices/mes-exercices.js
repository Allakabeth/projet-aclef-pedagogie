import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page apprenant : Liste des exercices assignés
 * Affiche les exercices avec filtres par statut
 */
export default function MesExercices() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [exercices, setExercices] = useState([])
    const [filterStatut, setFilterStatut] = useState('tous')

    useEffect(() => {
        loadExercices()
    }, [])

    async function loadExercices() {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth-token')
            if (!token) {
                router.push('/login')
                return
            }

            const response = await fetch('/api/exercices/mes-exercices', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors du chargement')
            }

            const data = await response.json()
            setExercices(data.exercices || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function getTypeBadge(type) {
        const badges = {
            'qcm': { label: 'QCM', color: '#2196f3' },
            'ordering': { label: 'Remise en ordre', color: '#ff9800' },
            'matching': { label: 'Appariement', color: '#9c27b0' },
            'numeric': { label: 'Numérique', color: '#4caf50' }
        }
        const badge = badges[type] || { label: type, color: '#999' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    function getStatutBadge(statut) {
        const badges = {
            'a_faire': { label: 'À faire', color: '#ff9800' },
            'en_cours': { label: 'En cours', color: '#2196f3' },
            'termine': { label: 'Terminé', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#999' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    function getDifficultyBadge(difficulte) {
        const badges = {
            'facile': { label: 'Facile', color: '#4caf50' },
            'moyen': { label: 'Moyen', color: '#ff9800' },
            'difficile': { label: 'Difficile', color: '#f44336' }
        }
        const badge = badges[difficulte] || { label: difficulte, color: '#999' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    // Filtrer les exercices
    const exercicesFiltered = filterStatut === 'tous'
        ? exercices
        : exercices.filter(ex => ex.statut === filterStatut)

    if (loading) {
        return <div style={styles.container}><p>Chargement...</p></div>
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>📚 Mes Exercices</h1>
                <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
                    ← Retour au tableau de bord
                </button>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <button
                    onClick={() => setFilterStatut('tous')}
                    style={{
                        ...styles.filterButton,
                        ...(filterStatut === 'tous' ? styles.filterButtonActive : {})
                    }}
                >
                    Tous ({exercices.length})
                </button>
                <button
                    onClick={() => setFilterStatut('a_faire')}
                    style={{
                        ...styles.filterButton,
                        ...(filterStatut === 'a_faire' ? styles.filterButtonActive : {})
                    }}
                >
                    À faire ({exercices.filter(ex => ex.statut === 'a_faire').length})
                </button>
                <button
                    onClick={() => setFilterStatut('en_cours')}
                    style={{
                        ...styles.filterButton,
                        ...(filterStatut === 'en_cours' ? styles.filterButtonActive : {})
                    }}
                >
                    En cours ({exercices.filter(ex => ex.statut === 'en_cours').length})
                </button>
                <button
                    onClick={() => setFilterStatut('termine')}
                    style={{
                        ...styles.filterButton,
                        ...(filterStatut === 'termine' ? styles.filterButtonActive : {})
                    }}
                >
                    Terminés ({exercices.filter(ex => ex.statut === 'termine').length})
                </button>
            </div>

            {/* Liste des exercices */}
            {exercicesFiltered.length === 0 ? (
                <div style={styles.emptyState}>
                    <p>Aucun exercice trouvé</p>
                </div>
            ) : (
                <div style={styles.exercicesList}>
                    {exercicesFiltered.map(ex => (
                        <div key={ex.id} style={styles.exerciceCard}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.exerciceTitle}>{ex.exercice?.titre}</h3>
                                <div style={styles.badges}>
                                    {getTypeBadge(ex.exercice?.type)}
                                    {getDifficultyBadge(ex.exercice?.difficulte)}
                                    {getStatutBadge(ex.statut)}
                                </div>
                            </div>

                            {ex.exercice?.description && (
                                <p style={styles.description}>{ex.exercice.description}</p>
                            )}

                            <div style={styles.cardInfo}>
                                <div>
                                    <strong>Compétence:</strong> {ex.exercice?.competence?.code}
                                </div>
                                {ex.date_limite && (
                                    <div>
                                        <strong>Date limite:</strong>{' '}
                                        {new Date(ex.date_limite).toLocaleDateString('fr-FR')}
                                    </div>
                                )}
                                {ex.tentatives > 0 && (
                                    <div>
                                        <strong>Tentatives:</strong> {ex.tentatives}
                                    </div>
                                )}
                                {ex.score !== null && ex.score !== undefined && (
                                    <div>
                                        <strong>Score:</strong> {ex.score}%
                                    </div>
                                )}
                            </div>

                            <div style={styles.cardActions}>
                                {ex.statut === 'termine' ? (
                                    <button
                                        onClick={() => router.push(`/exercices/realiser/${ex.id}`)}
                                        style={styles.viewButton}
                                    >
                                        👁️ Voir les résultats
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => router.push(`/exercices/realiser/${ex.id}`)}
                                        style={styles.startButton}
                                    >
                                        {ex.statut === 'en_cours' ? '▶️ Continuer' : '🚀 Commencer'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Arial'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        margin: 0
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    filters: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
    },
    filterButton: {
        padding: '10px 20px',
        backgroundColor: '#fff',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    filterButtonActive: {
        backgroundColor: '#2196f3',
        color: '#fff',
        borderColor: '#2196f3',
        fontWeight: '600'
    },
    exercicesList: {
        display: 'grid',
        gap: '20px'
    },
    exerciceCard: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #f0f0f0'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
        gap: '16px'
    },
    exerciceTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        margin: 0,
        flex: 1
    },
    badges: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#fff',
        whiteSpace: 'nowrap'
    },
    description: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '16px',
        lineHeight: '1.5'
    },
    cardInfo: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '14px'
    },
    cardActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
    },
    startButton: {
        padding: '12px 24px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    viewButton: {
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        color: '#666'
    }
}
