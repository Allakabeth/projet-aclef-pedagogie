import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ListePlans() {
    const router = useRouter()
    const [plans, setPlans] = useState([])
    const [filteredPlans, setFilteredPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statutFilter, setStatutFilter] = useState('tous')

    useEffect(() => {
        loadPlans()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, statutFilter, plans])

    async function loadPlans() {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur chargement plans')
            const data = await response.json()
            setPlans(data.plans || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...plans]
        if (statutFilter !== 'tous') {
            filtered = filtered.filter(p => p.statut === statutFilter)
        }
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(p => {
                const nom = `${p.apprenant?.prenom || ''} ${p.apprenant?.nom || ''}`.toLowerCase()
                return nom.includes(term)
            })
        }
        setFilteredPlans(filtered)
    }

    async function handleDelete(id) {
        if (!confirm('Supprimer ce plan ?')) return
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/plans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression')
            alert('Plan supprimé')
            loadPlans()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'actif': { label: 'Actif', color: '#4caf50' },
            'termine': { label: 'Terminé', color: '#2196f3' },
            'archive': { label: 'Archivé', color: '#757575' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>
    if (error) return <div style={styles.container}><p>❌ {error}</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📝 Plans de Formation</h1>
                    <p style={styles.subtitle}>{filteredPlans.length} plan(s)</p>
                </div>
                <button onClick={() => router.push('/admin/formation/plans/nouveau')} style={styles.createButton}>
                    ➕ Nouveau plan
                </button>
            </div>

            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder="Rechercher par apprenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} style={styles.select}>
                    <option value="tous">Tous</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="actif">Actif</option>
                    <option value="termine">Terminé</option>
                    <option value="archive">Archivé</option>
                </select>
            </div>

            {filteredPlans.length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucun plan trouvé</p>
                    {plans.length === 0 && (
                        <button onClick={() => router.push('/admin/formation/plans/nouveau')} style={styles.createButton}>
                            Créer le premier plan
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredPlans.map(plan => (
                        <div key={plan.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.cardTitle}>
                                        {plan.apprenant?.prenom} {plan.apprenant?.nom}
                                    </h3>
                                    <p style={styles.cardSubtitle}>
                                        Formateur: {plan.formateur?.prenom} {plan.formateur?.nom}
                                    </p>
                                </div>
                                {getStatutBadge(plan.statut)}
                            </div>
                            <div style={styles.cardInfo}>
                                <span><strong>Début:</strong> {new Date(plan.date_debut).toLocaleDateString('fr-FR')}</span>
                                {plan.date_fin_prevue && (
                                    <span><strong>Fin prévue:</strong> {new Date(plan.date_fin_prevue).toLocaleDateString('fr-FR')}</span>
                                )}
                            </div>
                            <div style={styles.cardActions}>
                                <button onClick={() => router.push(`/admin/formation/plans/${plan.id}`)} style={styles.viewButton}>
                                    👁️ Voir
                                </button>
                                <button onClick={() => handleDelete(plan.id)} style={styles.deleteButton}>
                                    🗑️ Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.footer}>
                <button onClick={() => router.push('/admin/formation')} style={styles.backButton}>
                    ← Retour
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    createButton: { padding: '12px 24px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    filters: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '250px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
    select: { padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' },
    list: { display: 'flex', flexDirection: 'column', gap: '16px' },
    card: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 4px 0' },
    cardSubtitle: { fontSize: '14px', color: '#666', margin: 0 },
    badge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    cardInfo: { display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '14px', flexWrap: 'wrap' },
    cardActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    viewButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    footer: { textAlign: 'center', marginTop: '32px' },
    backButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }
}
