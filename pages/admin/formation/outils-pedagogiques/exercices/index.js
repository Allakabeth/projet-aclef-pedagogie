import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Liste des exercices
 * Affiche tous les exercices avec filtres par compétence, type, difficulté
 */
export default function ListeExercices() {
    const router = useRouter()
    const [exercices, setExercices] = useState([])
    const [filteredExercices, setFilteredExercices] = useState([])
    const [competences, setCompetences] = useState([])
    const [categoriesOutils, setCategoriesOutils] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filtres
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('tous')
    const [competenceFilter, setCompetenceFilter] = useState('tous')
    const [difficulteFilter, setDifficulteFilter] = useState('tous')
    const [categorieOutilFilter, setCategorieOutilFilter] = useState('tous')

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, typeFilter, competenceFilter, difficulteFilter, categorieOutilFilter, exercices])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [exercicesRes, competencesRes, catOutilsRes] = await Promise.all([
                fetch('/api/admin/formation/exercices', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/competences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories-outils', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (!exercicesRes.ok || !competencesRes.ok || !catOutilsRes.ok) {
                throw new Error('Erreur lors du chargement des données')
            }

            const exercicesData = await exercicesRes.json()
            const competencesData = await competencesRes.json()
            const catOutilsData = await catOutilsRes.json()

            setExercices(exercicesData.exercices || [])
            setCompetences(competencesData.competences || [])
            setCategoriesOutils(catOutilsData.categories || [])
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...exercices]

        // Filtre par type
        if (typeFilter !== 'tous') {
            filtered = filtered.filter(e => e.type === typeFilter)
        }

        // Filtre par compétence
        if (competenceFilter !== 'tous') {
            filtered = filtered.filter(e => e.competence_id === competenceFilter)
        }

        // Filtre par difficulté
        if (difficulteFilter !== 'tous') {
            filtered = filtered.filter(e => e.difficulte === difficulteFilter)
        }

        // Filtre par catégorie d'outil
        if (categorieOutilFilter !== 'tous') {
            filtered = filtered.filter(e => e.categorie_id === categorieOutilFilter)
        }

        // Filtre par recherche (titre)
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(e =>
                e.titre?.toLowerCase().includes(term) ||
                e.description?.toLowerCase().includes(term)
            )
        }

        setFilteredExercices(filtered)
    }

    async function handleDelete(id, titre) {
        if (!confirm(`Supprimer l'exercice "${titre}" ?`)) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/exercices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression')
            }

            alert('✅ Exercice supprimé')
            loadData()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    function getTypeBadge(type) {
        const badges = {
            'qcm': { label: 'QCM', color: '#2196f3' },
            'ordering': { label: 'Remise en ordre', color: '#ff9800' },
            'matching': { label: 'Appariement', color: '#9c27b0' },
            'numeric': { label: 'Numérique', color: '#4caf50' }
        }
        const badge = badges[type] || { label: type, color: '#666' }

        return (
            <span style={{
                ...styles.badge,
                backgroundColor: badge.color
            }}>
                {badge.label}
            </span>
        )
    }

    function getDifficulteBadge(difficulte) {
        const badges = {
            'facile': { label: 'Facile', color: '#4caf50' },
            'moyen': { label: 'Moyen', color: '#ff9800' },
            'difficile': { label: 'Difficile', color: '#f44336' }
        }
        const badge = badges[difficulte] || { label: difficulte, color: '#666' }

        return (
            <span style={{
                ...styles.badgeDifficulte,
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
                    <h1 style={styles.title}>📝 Exercices</h1>
                    <p style={styles.subtitle}>
                        {filteredExercices.length} exercice{filteredExercices.length > 1 ? 's' : ''}
                        {searchTerm || typeFilter !== 'tous' || competenceFilter !== 'tous' || difficulteFilter !== 'tous' || categorieOutilFilter !== 'tous'
                            ? ' (filtré' + (filteredExercices.length > 1 ? 's' : '') + ')'
                            : ''}
                    </p>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={() => router.push('/admin/formation/outils-pedagogiques')}
                        style={styles.backButton}
                    >
                        ← Retour
                    </button>
                    <button
                        onClick={() => router.push('/admin/formation/outils-pedagogiques/exercices/nouveau')}
                        style={styles.createButton}
                    >
                        ➕ Nouvel exercice
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder="Rechercher par titre ou description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Tous les types</option>
                    <option value="qcm">QCM</option>
                    <option value="ordering">Remise en ordre</option>
                    <option value="matching">Appariement</option>
                    <option value="numeric">Numérique</option>
                </select>
                <select
                    value={competenceFilter}
                    onChange={(e) => setCompetenceFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Toutes les compétences</option>
                    {competences.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.code} - {c.intitule}
                        </option>
                    ))}
                </select>
                <select
                    value={difficulteFilter}
                    onChange={(e) => setDifficulteFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Toutes difficultés</option>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                </select>
                <select
                    value={categorieOutilFilter}
                    onChange={(e) => setCategorieOutilFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Toutes les catégories</option>
                    {categoriesOutils.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.emoji} {c.nom}
                        </option>
                    ))}
                </select>
            </div>

            {/* Liste */}
            {loading ? (
                <div style={styles.loadingBox}>
                    <p>Chargement des exercices...</p>
                </div>
            ) : error ? (
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadData} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            ) : filteredExercices.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p style={styles.emptyText}>
                        {exercices.length === 0
                            ? 'Aucun exercice créé'
                            : 'Aucun exercice ne correspond aux filtres'}
                    </p>
                    {exercices.length === 0 && (
                        <button
                            onClick={() => router.push('/admin/formation/outils-pedagogiques/exercices/nouveau')}
                            style={styles.createButtonSecondary}
                        >
                            ➕ Créer le premier exercice
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredExercices.map(exercice => {
                        const competence = competences.find(c => c.id === exercice.competence_id)
                        const categorieOutil = categoriesOutils.find(c => c.id === exercice.categorie_id)

                        return (
                            <div key={exercice.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div>
                                        <h3 style={styles.cardTitle}>{exercice.titre}</h3>
                                        {categorieOutil && (
                                            <p style={styles.cardCategorie}>
                                                {categorieOutil.emoji} {categorieOutil.nom}
                                            </p>
                                        )}
                                        {competence && (
                                            <p style={styles.cardCompetence}>
                                                🎯 {competence.code} - {competence.intitule}
                                            </p>
                                        )}
                                    </div>
                                    <div style={styles.badges}>
                                        {getTypeBadge(exercice.type)}
                                        {getDifficulteBadge(exercice.difficulte)}
                                    </div>
                                </div>

                                {exercice.description && (
                                    <p style={styles.description}>
                                        {exercice.description.length > 150
                                            ? exercice.description.substring(0, 150) + '...'
                                            : exercice.description}
                                    </p>
                                )}

                                <div style={styles.cardActions}>
                                    <button
                                        onClick={() => router.push(`/admin/formation/outils-pedagogiques/exercices/${exercice.id}`)}
                                        style={styles.viewButton}
                                    >
                                        👁️ Voir / Modifier
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exercice.id, exercice.titre)}
                                        style={styles.deleteButton}
                                    >
                                        🗑️ Supprimer
                                    </button>
                                </div>
                            </div>
                        )
                    })}
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
    headerActions: {
        display: 'flex',
        gap: '12px'
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
        marginBottom: '12px',
        gap: '12px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    },
    cardCategorie: {
        fontSize: '13px',
        color: '#444',
        margin: '4px 0',
        fontWeight: '500'
    },
    cardCompetence: {
        fontSize: '13px',
        color: '#666',
        margin: 0
    },
    badges: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    badgeDifficulte: {
        padding: '4px 10px',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    description: {
        fontSize: '14px',
        color: '#666',
        margin: '12px 0',
        lineHeight: '1.4'
    },
    cardActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0'
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
    }
}
