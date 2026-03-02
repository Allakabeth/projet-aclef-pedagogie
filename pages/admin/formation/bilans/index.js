import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ListeBilans() {
    const router = useRouter()
    const [bilans, setBilans] = useState([])
    const [filteredBilans, setFilteredBilans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statutFilter, setStatutFilter] = useState('tous')
    const [typeFilter, setTypeFilter] = useState('tous')

    useEffect(() => {
        loadBilans()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, statutFilter, typeFilter, bilans])

    async function loadBilans() {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/bilans', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur chargement bilans')
            const data = await response.json()
            setBilans(data.bilans || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...bilans]
        if (statutFilter !== 'tous') {
            filtered = filtered.filter(b => b.statut === statutFilter)
        }
        if (typeFilter !== 'tous') {
            filtered = filtered.filter(b => b.type === typeFilter)
        }
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(b => {
                const nom = `${b.apprenant?.prenom || ''} ${b.apprenant?.nom || ''}`.toLowerCase()
                return nom.includes(term)
            })
        }
        setFilteredBilans(filtered)
    }

    async function handleDelete(id) {
        if (!confirm('Supprimer ce bilan ?')) return
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/bilans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression')
            alert('Bilan supprim\u00E9')
            loadBilans()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'valide': { label: 'Valid\u00E9', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    function getTypeBadge(type) {
        const badges = {
            'direct': { label: 'Direct', color: '#2196f3' },
            'intermediaire': { label: 'Interm\u00E9diaire', color: '#ff9800' },
            'final': { label: 'Final', color: '#4caf50' }
        }
        const badge = badges[type] || { label: type, color: '#666' }
        return (
            <span style={{ ...styles.typeBadge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>
    if (error) return <div style={styles.container}><p>{'\u274C'} {error}</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>{'\uD83D\uDCC8'} Bilans de Formation</h1>
                    <p style={styles.subtitle}>{filteredBilans.length} bilan(s)</p>
                </div>
                <button onClick={() => router.push('/admin/formation/bilans/nouveau')} style={styles.createButton}>
                    {'\u2795'} Nouveau bilan
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
                    <option value="tous">Tous les statuts</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="valide">Valid\u00E9</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.select}>
                    <option value="tous">Tous les types</option>
                    <option value="direct">Direct</option>
                    <option value="intermediaire">Interm\u00E9diaire</option>
                    <option value="final">Final</option>
                </select>
            </div>

            {filteredBilans.length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucun bilan trouv\u00E9</p>
                    {bilans.length === 0 && (
                        <button onClick={() => router.push('/admin/formation/bilans/nouveau')} style={styles.createButton}>
                            Cr\u00E9er le premier bilan
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredBilans.map(bilan => (
                        <div key={bilan.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.cardTitle}>
                                        {bilan.apprenant?.prenom} {bilan.apprenant?.nom}
                                    </h3>
                                    <p style={styles.cardSubtitle}>
                                        Formateur: {bilan.formateur?.prenom} {bilan.formateur?.nom}
                                    </p>
                                </div>
                                <div style={styles.badges}>
                                    {getTypeBadge(bilan.type)}
                                    {getStatutBadge(bilan.statut)}
                                </div>
                            </div>
                            <div style={styles.cardInfo}>
                                <span><strong>Date:</strong> {new Date(bilan.date_bilan).toLocaleDateString('fr-FR')}</span>
                                {bilan.periode_debut && (
                                    <span>
                                        <strong>P\u00E9riode:</strong> {new Date(bilan.periode_debut).toLocaleDateString('fr-FR')}
                                        {bilan.periode_fin && ` - ${new Date(bilan.periode_fin).toLocaleDateString('fr-FR')}`}
                                    </span>
                                )}
                                {bilan.duree_realisee && (
                                    <span><strong>Dur\u00E9e:</strong> {bilan.duree_realisee}h</span>
                                )}
                            </div>
                            <div style={styles.cardActions}>
                                <button onClick={() => router.push(`/admin/formation/bilans/${bilan.id}`)} style={styles.viewButton}>
                                    {'\uD83D\uDC41\uFE0F'} Voir
                                </button>
                                <button onClick={() => handleDelete(bilan.id)} style={styles.deleteButton}>
                                    {'\uD83D\uDDD1\uFE0F'} Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.footer}>
                <button onClick={() => router.push('/admin/formation')} style={styles.backButton}>
                    {'\u2190'} Retour
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
    badges: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    badge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    typeBadge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    cardInfo: { display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '14px', flexWrap: 'wrap' },
    cardActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    viewButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    footer: { textAlign: 'center', marginTop: '32px' },
    backButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }
}
