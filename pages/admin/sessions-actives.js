import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page Admin - Sessions Actives
 * Affiche qui est connecté en temps réel
 */
export default function SessionsActives() {
    const router = useRouter()
    const [sessions, setSessions] = useState([])
    const [stats, setStats] = useState({
        total: 0,
        actifs: 0,
        recents: 0,
        inactifs: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(true)

    useEffect(() => {
        loadSessions()

        // Auto-refresh toutes les 30 secondes si activé
        let interval
        if (autoRefresh) {
            interval = setInterval(() => {
                loadSessions()
            }, 30000) // 30 secondes
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [autoRefresh])

    async function loadSessions() {
        try {
            setLoading(true)
            setError(null)

            // Récupérer le token admin
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/sessions-actives', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()

            if (!response.ok) {
                const errorMsg = data.details || data.error || 'Erreur inconnue'
                throw new Error(`${errorMsg}${data.code ? ` (Code: ${data.code})` : ''}${data.hint ? `\n💡 ${data.hint}` : ''}`)
            }

            setSessions(data.sessions || [])
            setStats(data.stats || { total: 0, actifs: 0, recents: 0, inactifs: 0 })
        } catch (err) {
            console.error('Erreur chargement sessions:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function formatMinutesAgo(minutes) {
        if (minutes < 1) return 'À l\'instant'
        if (minutes === 1) return 'Il y a 1 minute'
        if (minutes < 60) return `Il y a ${minutes} minutes`
        const hours = Math.floor(minutes / 60)
        return hours === 1 ? 'Il y a 1 heure' : `Il y a ${hours} heures`
    }

    function getStatutIcon(statut) {
        switch (statut) {
            case 'actif': return '🟢'
            case 'récent': return '🟡'
            case 'inactif': return '⚪'
            default: return '⚪'
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>👥 Sessions Actives</h1>
                <p style={styles.subtitle}>Qui est connecté en ce moment ?</p>
            </div>

            {/* Contrôles */}
            <div style={styles.controls}>
                <button onClick={() => router.push('/admin')} style={styles.backButton}>
                    ← Retour Admin
                </button>
                <button onClick={loadSessions} style={styles.refreshButton}>
                    🔄 Actualiser
                </button>
                <label style={styles.autoRefreshLabel}>
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        style={styles.checkbox}
                    />
                    Auto-refresh (30s)
                </label>
            </div>

            {/* Statistiques */}
            {loading && sessions.length === 0 ? (
                <div style={styles.loadingBox}>
                    <p>Chargement des sessions...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadSessions} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            ) : (
                <>
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <div style={styles.statIcon}>👥</div>
                            <div style={styles.statValue}>{stats.total}</div>
                            <div style={styles.statLabel}>Total</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIcon}>🟢</div>
                            <div style={styles.statValue}>{stats.actifs}</div>
                            <div style={styles.statLabel}>Actifs ({"< 5 min"})</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIcon}>🟡</div>
                            <div style={styles.statValue}>{stats.recents}</div>
                            <div style={styles.statLabel}>Récents (5-15 min)</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIcon}>⚪</div>
                            <div style={styles.statValue}>{stats.inactifs}</div>
                            <div style={styles.statLabel}>Inactifs ({"15-30 min"})</div>
                        </div>
                    </div>

                    {/* Liste des sessions */}
                    {sessions.length === 0 ? (
                        <div style={styles.emptyBox}>
                            <p style={styles.emptyText}>Aucun utilisateur connecté actuellement</p>
                        </div>
                    ) : (
                        <div style={styles.sessionsList}>
                            {sessions.map(session => (
                                <div key={session.id} style={styles.sessionCard}>
                                    <div style={styles.sessionHeader}>
                                        <div style={styles.sessionUser}>
                                            <span style={styles.sessionIcon}>
                                                {getStatutIcon(session.statut)}
                                            </span>
                                            <span style={styles.sessionName}>
                                                {session.prenom} {session.nom}
                                            </span>
                                            <span style={styles.sessionRole}>
                                                {session.role === 'admin' ? '👑 Admin' : '📚 Apprenant'}
                                            </span>
                                        </div>
                                        <div style={styles.sessionTime}>
                                            {formatMinutesAgo(session.minutes_ago)}
                                        </div>
                                    </div>
                                    <div style={styles.sessionDetails}>
                                        <span style={styles.sessionDetail}>📧 {session.email}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '20px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '10px'
    },
    subtitle: {
        fontSize: '16px',
        color: '#6b7280'
    },
    controls: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '30px',
        flexWrap: 'wrap'
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    refreshButton: {
        padding: '10px 20px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    autoRefreshLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280'
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer'
    },
    loadingBox: {
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    errorBox: {
        textAlign: 'center',
        padding: '40px',
        backgroundColor: '#fee2e2',
        borderRadius: '12px',
        color: '#991b1b'
    },
    retryButton: {
        marginTop: '15px',
        padding: '10px 20px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
        maxWidth: '1200px',
        margin: '0 auto 30px'
    },
    statCard: {
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center'
    },
    statIcon: {
        fontSize: '36px',
        marginBottom: '10px'
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '5px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#6b7280'
    },
    emptyBox: {
        backgroundColor: 'white',
        padding: '60px 20px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    emptyText: {
        fontSize: '18px',
        color: '#6b7280'
    },
    sessionsList: {
        maxWidth: '800px',
        margin: '0 auto',
        display: 'grid',
        gap: '15px'
    },
    sessionCard: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sessionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    sessionUser: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    sessionIcon: {
        fontSize: '20px'
    },
    sessionName: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937'
    },
    sessionRole: {
        fontSize: '14px',
        color: '#6b7280',
        fontStyle: 'italic'
    },
    sessionTime: {
        fontSize: '14px',
        color: '#6b7280'
    },
    sessionDetails: {
        display: 'flex',
        gap: '15px',
        fontSize: '13px',
        color: '#9ca3af'
    },
    sessionDetail: {
        display: 'flex',
        alignItems: 'center'
    }
}
