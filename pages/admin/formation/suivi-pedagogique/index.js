import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page : Liste des apprenants pour suivi pédagogique
 *
 * Affiche tous les apprenants avec :
 * - Recherche par nom/prénom
 * - Filtre par statut
 * - Stats rapides par apprenant
 * - Accès au détail du suivi
 */
export default function SuiviPedagogiqueIndex() {
    const router = useRouter()
    const [apprenants, setApprenants] = useState([])
    const [apprenantsFiltered, setApprenantsFiltered] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filtreStatut, setFiltreStatut] = useState('tous')

    useEffect(() => {
        loadApprenants()
    }, [])

    useEffect(() => {
        filterApprenants()
    }, [searchTerm, filtreStatut, apprenants])

    async function loadApprenants() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const res = await fetch('/api/admin/formation/apprenants', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!res.ok) {
                throw new Error('Erreur lors du chargement des apprenants')
            }

            const data = await res.json()
            setApprenants(data.apprenants || [])
        } catch (err) {
            console.error('Erreur chargement apprenants:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function filterApprenants() {
        let filtered = [...apprenants]

        // Filtre par statut archive
        if (filtreStatut === 'actifs') {
            filtered = filtered.filter(a => !a.archive)
        } else if (filtreStatut === 'archives') {
            filtered = filtered.filter(a => a.archive)
        }
        // Si 'tous', on ne filtre pas

        // Filtre par recherche
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(a =>
                a.prenom.toLowerCase().includes(term) ||
                a.nom.toLowerCase().includes(term) ||
                a.identifiant?.toLowerCase().includes(term)
            )
        }

        setApprenantsFiltered(filtered)
    }

    function goToDetails(apprenantId) {
        router.push(`/admin/formation/suivi-pedagogique/${apprenantId}`)
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>📊 Suivi Pédagogique</h1>
                <p style={styles.subtitle}>
                    Visualisez l'activité complète de chaque apprenant
                </p>
            </div>

            {/* Filtres et recherche */}
            <div style={styles.filtersBox}>
                <div style={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un apprenant (nom, prénom, identifiant)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <div style={styles.filterButtons}>
                    <button
                        onClick={() => setFiltreStatut('tous')}
                        style={{
                            ...styles.filterButton,
                            ...(filtreStatut === 'tous' ? styles.filterButtonActive : {})
                        }}
                    >
                        Tous ({apprenants.length})
                    </button>
                    <button
                        onClick={() => setFiltreStatut('actifs')}
                        style={{
                            ...styles.filterButton,
                            ...(filtreStatut === 'actifs' ? styles.filterButtonActive : {})
                        }}
                    >
                        ✅ Actifs ({apprenants.filter(a => !a.archive).length})
                    </button>
                    <button
                        onClick={() => setFiltreStatut('archives')}
                        style={{
                            ...styles.filterButton,
                            ...(filtreStatut === 'archives' ? styles.filterButtonActive : {})
                        }}
                    >
                        📦 Archivés ({apprenants.filter(a => a.archive).length})
                    </button>
                </div>
            </div>

            {/* Résultats */}
            {loading ? (
                <div style={styles.loadingBox}>
                    <p>Chargement des apprenants...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadApprenants} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            ) : apprenantsFiltered.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p>😕 Aucun apprenant trouvé</p>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
                            Effacer la recherche
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.apprenantsGrid}>
                    {apprenantsFiltered.map(apprenant => (
                        <div
                            key={apprenant.id}
                            style={styles.apprenantCard}
                            onClick={() => goToDetails(apprenant.id)}
                        >
                            <div style={styles.apprenantHeader}>
                                <div>
                                    <h3 style={styles.apprenantName}>
                                        👤 {apprenant.prenom} {apprenant.nom}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        {apprenant.identifiant && (
                                            <span style={styles.identifiant}>
                                                {apprenant.identifiant}
                                            </span>
                                        )}
                                        {apprenant.archive && (
                                            <span style={styles.badgeArchive}>
                                                📦 Archivé
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {apprenant.email && (
                                <p style={styles.apprenantEmail}>
                                    📧 {apprenant.email}
                                </p>
                            )}

                            <div style={styles.cardFooter}>
                                <button style={styles.detailButton}>
                                    Voir le suivi détaillé →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={styles.footer}>
                <button
                    onClick={() => router.push('/admin/formation')}
                    style={styles.backButton}
                >
                    ← Retour au menu Formation
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '24px',
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
    filtersBox: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
    },
    searchBox: {
        marginBottom: '16px'
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px',
        fontSize: '16px',
        border: '2px solid #e0e0e0',
        borderRadius: '6px',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    filterButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    filterButton: {
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s'
    },
    filterButtonActive: {
        backgroundColor: '#2196f3',
        color: '#fff',
        borderColor: '#2196f3'
    },
    apprenantsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
    },
    apprenantCard: {
        backgroundColor: '#fff',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        ':hover': {
            borderColor: '#2196f3',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
        }
    },
    apprenantHeader: {
        marginBottom: '12px'
    },
    apprenantName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    },
    identifiant: {
        display: 'inline-block',
        fontSize: '12px',
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: '500'
    },
    badgeArchive: {
        display: 'inline-block',
        fontSize: '12px',
        backgroundColor: '#ffecb3',
        color: '#f57c00',
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: '500'
    },
    apprenantEmail: {
        fontSize: '14px',
        color: '#666',
        margin: '0 0 16px 0'
    },
    cardFooter: {
        borderTop: '1px solid #f0f0f0',
        paddingTop: '12px'
    },
    detailButton: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    loadingBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '32px'
    },
    errorBox: {
        padding: '40px 20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
        marginBottom: '32px',
        textAlign: 'center'
    },
    emptyBox: {
        padding: '60px 20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '32px',
        textAlign: 'center'
    },
    retryButton: {
        padding: '10px 20px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '12px'
    },
    clearButton: {
        padding: '8px 16px',
        backgroundColor: '#fff',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '12px'
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
    }
}
