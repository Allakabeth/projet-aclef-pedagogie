import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ListeAttestations() {
    const router = useRouter()
    const [attestations, setAttestations] = useState([])
    const [filteredAttestations, setFilteredAttestations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [statutFilter, setStatutFilter] = useState('tous')

    useEffect(() => {
        loadAttestations()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [searchTerm, statutFilter, attestations])

    async function loadAttestations() {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/attestations', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur chargement attestations')
            const data = await response.json()
            setAttestations(data.attestations || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function applyFilters() {
        let filtered = [...attestations]
        if (statutFilter !== 'tous') {
            filtered = filtered.filter(a => a.statut === statutFilter)
        }
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(a => {
                const nom = `${a.apprenant?.prenom || ''} ${a.apprenant?.nom || ''}`.toLowerCase()
                const numero = (a.numero || '').toLowerCase()
                return nom.includes(term) || numero.includes(term)
            })
        }
        setFilteredAttestations(filtered)
    }

    async function handleDelete(id) {
        if (!confirm('Supprimer cette attestation ?')) return
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/attestations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression')
            alert('Attestation supprimee')
            loadAttestations()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'valide': { label: 'Valide', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
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
                    <h1 style={styles.title}>{'\uD83C\uDF93'} Attestations (ACA)</h1>
                    <p style={styles.subtitle}>{filteredAttestations.length} attestation(s)</p>
                </div>
                <button onClick={() => router.push('/admin/formation/attestations/nouveau')} style={styles.createButton}>
                    {'\u2795'} Nouvelle attestation
                </button>
            </div>

            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder="Rechercher par apprenant ou numero..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} style={styles.select}>
                    <option value="tous">Tous les statuts</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="valide">Valide</option>
                </select>
            </div>

            {filteredAttestations.length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucune attestation trouvee</p>
                    {attestations.length === 0 && (
                        <button onClick={() => router.push('/admin/formation/attestations/nouveau')} style={styles.createButton}>
                            Creer la premiere attestation
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {filteredAttestations.map(attestation => (
                        <div key={attestation.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.cardNumero}>{attestation.numero}</h3>
                                    <p style={styles.cardApprenant}>
                                        {attestation.apprenant?.prenom} {attestation.apprenant?.nom}
                                    </p>
                                </div>
                                <div style={styles.badges}>
                                    {attestation.nb_competences > 0 && (
                                        <span style={styles.competencesBadge}>
                                            {attestation.nb_competences} competence{attestation.nb_competences > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {getStatutBadge(attestation.statut)}
                                </div>
                            </div>
                            <div style={styles.cardInfo}>
                                <span>
                                    <strong>Date de delivrance :</strong>{' '}
                                    {new Date(attestation.date_delivrance).toLocaleDateString('fr-FR')}
                                </span>
                                {attestation.lieu_delivrance && (
                                    <span>
                                        <strong>Lieu :</strong> {attestation.lieu_delivrance}
                                    </span>
                                )}
                                {attestation.signataire_nom && (
                                    <span>
                                        <strong>Signataire :</strong> {attestation.signataire_nom}
                                    </span>
                                )}
                            </div>
                            <div style={styles.cardActions}>
                                <button onClick={() => router.push(`/admin/formation/attestations/${attestation.id}`)} style={styles.viewButton}>
                                    {'\uD83D\uDC41\uFE0F'} Consulter
                                </button>
                                <button onClick={() => handleDelete(attestation.id)} style={styles.deleteButton}>
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
    cardNumero: { fontSize: '18px', fontWeight: '700', color: '#2196f3', margin: '0 0 4px 0' },
    cardApprenant: { fontSize: '15px', color: '#333', margin: 0, fontWeight: '500' },
    badges: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
    badge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    competencesBadge: { padding: '6px 12px', borderRadius: '12px', backgroundColor: '#4caf50', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    cardInfo: { display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '14px', flexWrap: 'wrap' },
    cardActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    viewButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    footer: { textAlign: 'center', marginTop: '32px' },
    backButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }
}
