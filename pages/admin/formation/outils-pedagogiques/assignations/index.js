import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page de gestion des assignations d'exercices
 * Liste des assignations avec possibilité d'en créer de nouvelles
 */
export default function GestionAssignations() {
    const router = useRouter()
    const [assignations, setAssignations] = useState([])
    const [exercices, setExercices] = useState([])
    const [apprenants, setApprenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    // Filtres
    const [filterApprenant, setFilterApprenant] = useState('tous')
    const [filterStatut, setFilterStatut] = useState('tous')
    const [filterExercice, setFilterExercice] = useState('tous')

    // Formulaire d'assignation
    const [formData, setFormData] = useState({
        exercice_id: '',
        apprenant_ids: [],
        date_limite: ''
    })

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

            const [assignRes, exoRes, appRes] = await Promise.all([
                fetch('/api/admin/formation/exercices/assignations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/exercices', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/apprenants-list', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const [assignData, exoData, appData] = await Promise.all([
                assignRes.json(),
                exoRes.json(),
                appRes.json()
            ])

            setAssignations(assignData.assignations || [])
            setExercices(exoData.exercices || [])
            setApprenants(appData.apprenants || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    async function handleAssign() {
        if (!formData.exercice_id) {
            alert('Veuillez sélectionner un exercice')
            return
        }
        if (formData.apprenant_ids.length === 0) {
            alert('Veuillez sélectionner au moins un apprenant')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch('/api/admin/formation/exercices/assignations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Erreur lors de l\'assignation')

            alert(`✅ Exercice assigné à ${formData.apprenant_ids.length} apprenant(s)`)
            setShowModal(false)
            setFormData({ exercice_id: '', apprenant_ids: [], date_limite: '' })
            loadData()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('Supprimer cette assignation ?')) return

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/exercices/assignations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur suppression')

            alert('✅ Assignation supprimée')
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    function toggleApprenant(apprenantId) {
        setFormData(prev => ({
            ...prev,
            apprenant_ids: prev.apprenant_ids.includes(apprenantId)
                ? prev.apprenant_ids.filter(id => id !== apprenantId)
                : [...prev.apprenant_ids, apprenantId]
        }))
    }

    function getStatutBadge(statut) {
        const badges = {
            'a_faire': { label: 'À faire', color: '#9e9e9e' },
            'en_cours': { label: 'En cours', color: '#ff9800' },
            'termine': { label: 'Terminé', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    // Filtrer les assignations
    const assignationsFiltered = assignations.filter(a => {
        if (filterApprenant !== 'tous' && a.apprenant_id !== filterApprenant) return false
        if (filterStatut !== 'tous' && a.statut !== filterStatut) return false
        if (filterExercice !== 'tous' && a.exercice_id !== filterExercice) return false
        return true
    })

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>👥 Assignations d'Exercices</h1>
                    <p style={styles.subtitle}>{assignationsFiltered.length} assignation(s)</p>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={() => router.push('/admin/formation/outils-pedagogiques')}
                        style={styles.backButton}
                    >
                        ← Retour
                    </button>
                    <button onClick={() => setShowModal(true)} style={styles.createButton}>
                        ➕ Nouvelle assignation
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <select
                    value={filterApprenant}
                    onChange={(e) => setFilterApprenant(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Tous les apprenants</option>
                    {apprenants.map(a => (
                        <option key={a.id} value={a.id}>
                            {a.prenom} {a.nom}
                        </option>
                    ))}
                </select>

                <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Tous les statuts</option>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                </select>

                <select
                    value={filterExercice}
                    onChange={(e) => setFilterExercice(e.target.value)}
                    style={styles.select}
                >
                    <option value="tous">Tous les exercices</option>
                    {exercices.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.titre}
                        </option>
                    ))}
                </select>
            </div>

            {/* Liste */}
            {loading ? (
                <div style={styles.loadingBox}>Chargement...</div>
            ) : assignationsFiltered.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p>Aucune assignation trouvée</p>
                    {assignations.length === 0 && (
                        <button onClick={() => setShowModal(true)} style={styles.createButton}>
                            Créer la première assignation
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.list}>
                    {assignationsFiltered.map(assignation => {
                        const exercice = exercices.find(e => e.id === assignation.exercice_id)
                        const apprenant = apprenants.find(a => a.id === assignation.apprenant_id)

                        return (
                            <div key={assignation.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div>
                                        <h3 style={styles.cardTitle}>
                                            {exercice?.titre || 'Exercice supprimé'}
                                        </h3>
                                        <p style={styles.cardApprenant}>
                                            👤 {apprenant?.prenom} {apprenant?.nom}
                                        </p>
                                    </div>
                                    {getStatutBadge(assignation.statut)}
                                </div>

                                <div style={styles.cardInfo}>
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>Assigné le:</span>
                                        <span>{new Date(assignation.date_assignation).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    {assignation.date_limite && (
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoLabel}>Date limite:</span>
                                            <span>{new Date(assignation.date_limite).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    )}
                                    {assignation.statut === 'termine' && assignation.score !== null && (
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoLabel}>Score:</span>
                                            <span style={styles.score}>{assignation.score}/100</span>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.cardActions}>
                                    <button
                                        onClick={() => handleDelete(assignation.id)}
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

            {/* Modal d'assignation */}
            {showModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>➕ Nouvelle assignation</h3>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Exercice *</label>
                            <select
                                value={formData.exercice_id}
                                onChange={(e) => setFormData({ ...formData, exercice_id: e.target.value })}
                                style={styles.select}
                            >
                                <option value="">-- Sélectionner un exercice --</option>
                                {exercices.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.titre} ({e.type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Date limite (optionnel)</label>
                            <input
                                type="date"
                                value={formData.date_limite}
                                onChange={(e) => setFormData({ ...formData, date_limite: e.target.value })}
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Apprenants * ({formData.apprenant_ids.length} sélectionné{formData.apprenant_ids.length > 1 ? 's' : ''})
                            </label>
                            <div style={styles.apprenantsList}>
                                {apprenants.map(apprenant => (
                                    <div
                                        key={apprenant.id}
                                        style={{
                                            ...styles.apprenantItem,
                                            backgroundColor: formData.apprenant_ids.includes(apprenant.id)
                                                ? '#e3f2fd'
                                                : '#fff'
                                        }}
                                        onClick={() => toggleApprenant(apprenant.id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.apprenant_ids.includes(apprenant.id)}
                                            onChange={() => {}}
                                            style={styles.checkbox}
                                        />
                                        <span>{apprenant.prenom} {apprenant.nom}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                onClick={() => {
                                    setShowModal(false)
                                    setFormData({ exercice_id: '', apprenant_ids: [], date_limite: '' })
                                }}
                                style={styles.cancelButton}
                            >
                                Annuler
                            </button>
                            <button onClick={handleAssign} style={styles.saveButton}>
                                ✅ Assigner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    headerActions: { display: 'flex', gap: '12px' },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    createButton: { padding: '12px 24px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    filters: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
    select: { flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    list: { display: 'flex', flexDirection: 'column', gap: '16px' },
    card: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 4px 0' },
    cardApprenant: { fontSize: '14px', color: '#666', margin: 0 },
    badge: { padding: '4px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
    cardInfo: { display: 'flex', gap: '24px', marginBottom: '12px', flexWrap: 'wrap' },
    infoItem: { display: 'flex', gap: '8px', fontSize: '14px' },
    infoLabel: { fontWeight: '600', color: '#666' },
    score: { fontWeight: 'bold', color: '#4caf50' },
    cardActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    loadingBox: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    emptyBox: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    apprenantsList: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' },
    apprenantItem: { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '6px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' },
    checkbox: { cursor: 'pointer' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    saveButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
}
