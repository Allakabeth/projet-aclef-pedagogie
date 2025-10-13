import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Liste des positionnements
 * Affiche tous les positionnements avec filtres et recherche
 */
export default function ListePositionnements() {
    const router = useRouter()
    const [positionnements, setPositionnements] = useState([])
    const [filteredPositionnements, setFilteredPositionnements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filtres
    const [searchTerm, setSearchTerm] = useState('')
    const [statutFilter, setStatutFilter] = useState('tous')

    useEffect(() => {
        loadPositionnements()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, statutFilter, positionnements])

    async function loadPositionnements() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/positionnements', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des positionnements')
            }

            const data = await response.json()
            setPositionnements(data.positionnements || [])
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...positionnements]

        // Filtre par statut
        if (statutFilter !== 'tous') {
            filtered = filtered.filter(p => p.statut === statutFilter)
        }

        // Filtre par recherche (nom apprenant)
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(p => {
                const apprenantNom = `${p.apprenant?.prenom || ''} ${p.apprenant?.nom || ''}`.toLowerCase()
                const formateurNom = `${p.formateur?.prenom || ''} ${p.formateur?.nom || ''}`.toLowerCase()
                return apprenantNom.includes(term) || formateurNom.includes(term)
            })
        }

        setFilteredPositionnements(filtered)
    }

    async function handleDelete(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce positionnement ?')) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/positionnements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression')
            }

            alert('Positionnement supprimé avec succès')
            loadPositionnements()
        } catch (err) {
            console.error('Erreur:', err)
            alert('Erreur lors de la suppression: ' + err.message)
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-FR')
    }

    function getStatutBadge(statut) {
        const badges = {
            'en_cours': { label: 'En cours', color: '#ff9800' },
            'valide': { label: 'Validé', color: '#4caf50' },
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }

        return (
            <span style={{
                ...styles.badge,
                backgroundColor: badge.color
            }}>
                {badge.label}
            </span>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📋 Positionnements</h1>
                    <p style={styles.subtitle}>
                        {filteredPositionnements.length} positionnement{filteredPositionnements.length > 1 ? 's' : ''}
                        {searchTerm || statutFilter !== 'tous' ? ' (filtré' + (filteredPositionnements.length > 1 ? 's' : '') + ')' : ''}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/admin/formation/positionnements/nouveau')}
                    style={styles.createButton}
                >
                    ➕ Nouveau positionnement
                </button>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder="Rechercher par nom d'apprenant ou formateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={statutFilter}
                    onChange={(e) => setStatutFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Tous les statuts</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="en_cours">En cours</option>
                    <option value="valide">Validé</option>
                </select>
            </div>

            {/* Liste */}
            {loading ? (
                <div style={styles.loadingBox}>
                    <p>Chargement des positionnements...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadPositionnements} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            ) : filteredPositionnements.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p style={styles.emptyText}>
                        {positionnements.length === 0
                            ? 'Aucun positionnement créé'
                            : 'Aucun positionnement ne correspond aux filtres'}
                    </p>
                    {positionnements.length === 0 && (
                        <button
                            onClick={() => router.push('/admin/formation/positionnements/nouveau')}
                            style={styles.createButtonSecondary}
                        >
                            ➕ Créer le premier positionnement
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredPositionnements.map(positionnement => (
                        <div key={positionnement.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.cardTitle}>
                                        {positionnement.apprenant?.prenom} {positionnement.apprenant?.nom}
                                    </h3>
                                    <p style={styles.cardSubtitle}>
                                        Formateur: {positionnement.formateur?.prenom} {positionnement.formateur?.nom}
                                    </p>
                                </div>
                                {getStatutBadge(positionnement.statut)}
                            </div>

                            <div style={styles.cardInfo}>
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Date:</span>
                                    <span>{formatDate(positionnement.date_positionnement)}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Créé le:</span>
                                    <span>{formatDate(positionnement.created_at)}</span>
                                </div>
                            </div>

                            {positionnement.commentaires_generaux && (
                                <div style={styles.commentaires}>
                                    <p style={styles.commentairesText}>
                                        {positionnement.commentaires_generaux.length > 150
                                            ? positionnement.commentaires_generaux.substring(0, 150) + '...'
                                            : positionnement.commentaires_generaux}
                                    </p>
                                </div>
                            )}

                            <div style={styles.cardActions}>
                                <button
                                    onClick={() => router.push(`/admin/formation/positionnements/${positionnement.id}`)}
                                    style={styles.viewButton}
                                >
                                    👁️ Voir / Modifier
                                </button>
                                <button
                                    onClick={() => handleDelete(positionnement.id)}
                                    style={styles.deleteButton}
                                >
                                    🗑️ Supprimer
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
                    ← Retour au module Formation
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 4px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        margin: 0
    },
    createButton: {
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    filters: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
    },
    searchInput: {
        flex: 1,
        minWidth: '250px',
        padding: '10px 14px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px'
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    card: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '12px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    },
    cardSubtitle: {
        fontSize: '14px',
        color: '#666',
        margin: 0
    },
    badge: {
        padding: '6px 12px',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    cardInfo: {
        display: 'flex',
        gap: '24px',
        marginBottom: '12px',
        flexWrap: 'wrap'
    },
    infoItem: {
        display: 'flex',
        gap: '8px',
        fontSize: '14px'
    },
    infoLabel: {
        fontWeight: '600',
        color: '#666'
    },
    commentaires: {
        backgroundColor: '#f9f9f9',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '16px'
    },
    commentairesText: {
        fontSize: '13px',
        color: '#666',
        margin: 0,
        lineHeight: '1.4'
    },
    cardActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
    },
    viewButton: {
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500'
    },
    deleteButton: {
        padding: '8px 16px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500'
    },
    loadingBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
    },
    errorBox: {
        padding: '40px 20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
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
    },
    emptyBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
    },
    emptyText: {
        fontSize: '16px',
        color: '#666',
        marginBottom: '20px'
    },
    createButtonSecondary: {
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
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
