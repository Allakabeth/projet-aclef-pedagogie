import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page admin : Résultats et statistiques des exercices
 * Vue d'ensemble des performances des apprenants
 */
export default function ResultatsExercices() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [assignations, setAssignations] = useState([])
    const [apprenants, setApprenants] = useState([])
    const [exercices, setExercices] = useState([])

    // Filtres
    const [filterApprenant, setFilterApprenant] = useState('')
    const [filterExercice, setFilterExercice] = useState('')
    const [filterStatut, setFilterStatut] = useState('tous')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [statsRes, assignationsRes, apprenantsRes, exercicesRes] = await Promise.all([
                fetch('/api/admin/formation/exercices/statistiques', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/exercices/assignations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/apprenants', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/exercices', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const [statsData, assignationsData, apprenantsData, exercicesData] = await Promise.all([
                statsRes.json(),
                assignationsRes.json(),
                apprenantsRes.json(),
                exercicesRes.json()
            ])

            setStats(statsData)
            setAssignations(assignationsData.assignations || [])
            setApprenants(apprenantsData.apprenants || [])
            setExercices(exercicesData.exercices || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    // Filtrer les assignations
    const assignationsFiltered = assignations.filter(a => {
        if (filterApprenant && a.apprenant_id !== filterApprenant) return false
        if (filterExercice && a.exercice_id !== filterExercice) return false
        if (filterStatut !== 'tous' && a.statut !== filterStatut) return false
        return true
    })

    function getStatutBadge(statut) {
        const badges = {
            'a_faire': { label: 'À faire', color: '#ff9800' },
            'en_cours': { label: 'En cours', color: '#2196f3' },
            'termine': { label: 'Terminé', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#999' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    function getScoreColor(score) {
        if (score >= 80) return '#4caf50'
        if (score >= 50) return '#ff9800'
        return '#f44336'
    }

    if (loading) {
        return <div style={styles.container}><p>Chargement...</p></div>
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>📊 Résultats et Statistiques</h1>
                <button onClick={() => router.push('/admin/formation/outils-pedagogiques')} style={styles.backButton}>
                    ← Retour au menu
                </button>
            </div>

            {/* Vue d'ensemble */}
            {stats && (
                <div style={styles.statsOverview}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.total_assignations || 0}</div>
                        <div style={styles.statLabel}>Assignations totales</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.termine || 0}</div>
                        <div style={styles.statLabel}>Terminés</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.en_cours || 0}</div>
                        <div style={styles.statLabel}>En cours</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.a_faire || 0}</div>
                        <div style={styles.statLabel}>À faire</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {stats.moyenne_score !== null ? `${stats.moyenne_score}%` : 'N/A'}
                        </div>
                        <div style={styles.statLabel}>Score moyen</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {stats.taux_completion !== null ? `${stats.taux_completion}%` : 'N/A'}
                        </div>
                        <div style={styles.statLabel}>Taux de complétion</div>
                    </div>
                </div>
            )}

            {/* Filtres */}
            <div style={styles.filters}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Apprenant</label>
                    <select
                        value={filterApprenant}
                        onChange={(e) => setFilterApprenant(e.target.value)}
                        style={styles.select}
                    >
                        <option value="">Tous les apprenants</option>
                        {apprenants.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.prenom} {a.nom}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Exercice</label>
                    <select
                        value={filterExercice}
                        onChange={(e) => setFilterExercice(e.target.value)}
                        style={styles.select}
                    >
                        <option value="">Tous les exercices</option>
                        {exercices.map(ex => (
                            <option key={ex.id} value={ex.id}>
                                {ex.titre}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Statut</label>
                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                        style={styles.select}
                    >
                        <option value="tous">Tous</option>
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                    </select>
                </div>
            </div>

            {/* Tableau des résultats */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Apprenant</th>
                            <th style={styles.th}>Exercice</th>
                            <th style={styles.th}>Type</th>
                            <th style={styles.th}>Statut</th>
                            <th style={styles.th}>Tentatives</th>
                            <th style={styles.th}>Score</th>
                            <th style={styles.th}>Date assignation</th>
                            <th style={styles.th}>Date limite</th>
                            <th style={styles.th}>Date fin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assignationsFiltered.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={styles.emptyCell}>
                                    Aucune assignation trouvée
                                </td>
                            </tr>
                        ) : (
                            assignationsFiltered.map(a => (
                                <tr key={a.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        {a.apprenant?.prenom} {a.apprenant?.nom}
                                    </td>
                                    <td style={styles.td}>{a.exercice?.titre}</td>
                                    <td style={styles.td}>
                                        <span style={styles.typeBadge}>
                                            {a.exercice?.type}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{getStatutBadge(a.statut)}</td>
                                    <td style={styles.td}>{a.tentatives}</td>
                                    <td style={styles.td}>
                                        {a.score !== null && a.score !== undefined ? (
                                            <span style={{
                                                ...styles.scoreBadge,
                                                backgroundColor: getScoreColor(a.score)
                                            }}>
                                                {a.score}%
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {new Date(a.date_assignation).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td style={styles.td}>
                                        {a.date_limite
                                            ? new Date(a.date_limite).toLocaleDateString('fr-FR')
                                            : '-'
                                        }
                                    </td>
                                    <td style={styles.td}>
                                        {a.date_fin
                                            ? new Date(a.date_fin).toLocaleDateString('fr-FR')
                                            : '-'
                                        }
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    statsOverview: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' },
    statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#2196f3', marginBottom: '8px' },
    statLabel: { fontSize: '14px', color: '#666' },
    filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    filterLabel: { fontSize: '14px', fontWeight: '600', color: '#333' },
    select: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    tableContainer: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #f0f0f0', fontWeight: '600', fontSize: '14px', color: '#333', backgroundColor: '#f9f9f9' },
    tr: { borderBottom: '1px solid #f0f0f0' },
    td: { padding: '12px', fontSize: '14px', color: '#666' },
    emptyCell: { padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' },
    badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', display: 'inline-block' },
    typeBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#f0f0f0', color: '#666', textTransform: 'uppercase' },
    scoreBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', display: 'inline-block' }
}
