import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Dashboard Formation - Point d'entrée du module Formation
 * Affiche un résumé et permet de naviguer vers les différentes sections
 */
export default function DashboardFormation() {
    const router = useRouter()
    const [stats, setStats] = useState({
        totalPositionnements: 0,
        positionnements_en_cours: 0,
        positionnements_valides: 0,
        totalApprenants: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        try {
            setLoading(true)
            setError(null)

            // Récupérer le token admin
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            // Charger les statistiques
            const [positRes, apprenantsRes] = await Promise.all([
                fetch('/api/admin/formation/positionnements', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/apprenants-list', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (!positRes.ok || !apprenantsRes.ok) {
                throw new Error('Erreur lors du chargement des données')
            }

            const positData = await positRes.json()
            const apprenantsData = await apprenantsRes.json()

            const positionnements = positData.positionnements || []

            setStats({
                totalPositionnements: positionnements.length,
                positionnements_en_cours: positionnements.filter(p => p.statut === 'en_cours').length,
                positionnements_valides: positionnements.filter(p => p.statut === 'valide').length,
                totalApprenants: apprenantsData.apprenants?.length || 0
            })
        } catch (err) {
            console.error('Erreur chargement stats:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>📚 Gestion Formation</h1>
                <p style={styles.subtitle}>Module de suivi pédagogique des apprenants</p>
            </div>

            {/* Statistiques */}
            {loading ? (
                <div style={styles.loadingBox}>
                    <p>Chargement des statistiques...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadStats} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            ) : (
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>📊</div>
                        <div style={styles.statValue}>{stats.totalPositionnements}</div>
                        <div style={styles.statLabel}>Positionnements</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>⏳</div>
                        <div style={styles.statValue}>{stats.positionnements_en_cours}</div>
                        <div style={styles.statLabel}>En cours</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>✓</div>
                        <div style={styles.statValue}>{stats.positionnements_valides}</div>
                        <div style={styles.statLabel}>Validés</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>👥</div>
                        <div style={styles.statValue}>{stats.totalApprenants}</div>
                        <div style={styles.statLabel}>Apprenants</div>
                    </div>
                </div>
            )}

            {/* Menu principal */}
            <div style={styles.menuGrid}>
                {/* Référentiels */}
                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/referentiel')}
                >
                    <div style={styles.menuIcon}>📚</div>
                    <h3 style={styles.menuTitle}>Référentiels</h3>
                    <p style={styles.menuDescription}>
                        Gérer les domaines, catégories et compétences
                    </p>
                </div>

                {/* Positionnements */}
                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/positionnements')}
                >
                    <div style={styles.menuIcon}>📋</div>
                    <h3 style={styles.menuTitle}>Positionnements</h3>
                    <p style={styles.menuDescription}>
                        Créer et gérer les positionnements des apprenants
                    </p>
                </div>

                {/* Plans de Formation */}
                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/plans')}
                >
                    <div style={styles.menuIcon}>📝</div>
                    <h3 style={styles.menuTitle}>Plans de Formation</h3>
                    <p style={styles.menuDescription}>
                        Créer et gérer les plans de formation
                    </p>
                </div>

                {/* Outils Pédagogiques */}
                <div
                    style={styles.menuCard}
                    onClick={() => router.push('/admin/formation/outils-pedagogiques')}
                >
                    <div style={styles.menuIcon}>🎓</div>
                    <h3 style={styles.menuTitle}>Outils Pédagogiques</h3>
                    <p style={styles.menuDescription}>
                        Créer et assigner des exercices aux apprenants
                    </p>
                </div>

                {/* Modules à venir */}
                <div style={{ ...styles.menuCard, ...styles.menuCardDisabled }}>
                    <div style={styles.menuIcon}>📊</div>
                    <h3 style={styles.menuTitle}>Suivi pédagogique</h3>
                    <p style={styles.menuDescription}>
                        À venir - Phase 4
                    </p>
                </div>

                <div style={{ ...styles.menuCard, ...styles.menuCardDisabled }}>
                    <div style={styles.menuIcon}>📈</div>
                    <h3 style={styles.menuTitle}>Bilans</h3>
                    <p style={styles.menuDescription}>
                        À venir - Phase 5
                    </p>
                </div>
            </div>

            {/* Bouton retour */}
            <div style={styles.footer}>
                <button
                    onClick={() => router.push('/admin')}
                    style={styles.backButton}
                >
                    ← Retour au dashboard admin
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '32px',
        textAlign: 'center'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#666',
        margin: 0
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
    },
    statCard: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    statIcon: {
        fontSize: '32px',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#666'
    },
    menuGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
    },
    menuCard: {
        backgroundColor: '#fff',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    menuCardDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    menuIcon: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    menuTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 8px 0'
    },
    menuDescription: {
        fontSize: '14px',
        color: '#666',
        margin: 0,
        lineHeight: '1.4'
    },
    footer: {
        textAlign: 'center',
        marginTop: '32px'
    },
    backButton: {
        padding: '12px 24px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    loadingBox: {
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '32px'
    },
    errorBox: {
        padding: '20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
        marginBottom: '32px',
        textAlign: 'center'
    },
    retryButton: {
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '12px'
    }
}
