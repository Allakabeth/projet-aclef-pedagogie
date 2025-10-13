import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page d'administration des compétences
 */
export default function GestionCompetences() {
    const router = useRouter()
    const [competences, setCompetences] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCompetence, setEditingCompetence] = useState(null)
    const [filterDomaine, setFilterDomaine] = useState('tous')
    const [filterCategorie, setFilterCategorie] = useState('tous')
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        categorie_id: '',
        code: '',
        intitule: '',
        description: '',
        contexte: '',
        ordre: 1
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

            const [compRes, domRes, catRes] = await Promise.all([
                fetch('/api/admin/formation/competences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/domaines', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const compData = await compRes.json()
            const domData = await domRes.json()
            const catData = await catRes.json()

            setCompetences(compData.competences || [])
            setDomaines(domData.domaines || [])
            setCategories(catData.categories || [])
        } catch (err) {
            console.error('Erreur:', err)
        } finally {
            setLoading(false)
        }
    }

    function handleNew() {
        setEditingCompetence(null)
        setFormData({
            categorie_id: categories.length > 0 ? categories[0].id : '',
            code: '',
            intitule: '',
            description: '',
            contexte: '',
            ordre: 1
        })
        setShowModal(true)
    }

    function handleEdit(competence) {
        setEditingCompetence(competence)
        setFormData({
            categorie_id: competence.categorie_id,
            code: competence.code || '',
            intitule: competence.intitule,
            description: competence.description || '',
            contexte: competence.contexte || '',
            ordre: competence.ordre
        })
        setShowModal(true)
    }

    async function handleSave() {
        if (!formData.intitule.trim() || !formData.categorie_id) {
            alert('L\'intitulé et la catégorie sont requis')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const url = editingCompetence
                ? `/api/admin/formation/competences/${editingCompetence.id}`
                : '/api/admin/formation/competences'

            const response = await fetch(url, {
                method: editingCompetence ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

            alert(editingCompetence ? '✅ Compétence modifiée' : '✅ Compétence créée')
            setShowModal(false)
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id, intitule) {
        if (!confirm(`Supprimer la compétence "${intitule}" ?`)) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/competences/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur suppression')

            alert('✅ Compétence supprimée')
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    // Filtrer compétences
    const categoriesFiltered = filterDomaine === 'tous'
        ? categories
        : categories.filter(c => c.domaine_id === filterDomaine)

    let competencesFiltered = competences

    if (filterCategorie !== 'tous') {
        competencesFiltered = competencesFiltered.filter(c => c.categorie_id === filterCategorie)
    } else if (filterDomaine !== 'tous') {
        const categorieIds = categoriesFiltered.map(c => c.id)
        competencesFiltered = competencesFiltered.filter(c => categorieIds.includes(c.categorie_id))
    }

    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        competencesFiltered = competencesFiltered.filter(c =>
            c.intitule.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term) ||
            c.code?.toLowerCase().includes(term)
        )
    }

    // Organiser par catégorie
    const competencesParCategorie = {}
    competencesFiltered.forEach(comp => {
        const categorie = categories.find(c => c.id === comp.categorie_id)
        if (categorie) {
            if (!competencesParCategorie[categorie.id]) {
                const domaine = domaines.find(d => d.id === categorie.domaine_id)
                competencesParCategorie[categorie.id] = {
                    categorie,
                    domaine,
                    competences: []
                }
            }
            competencesParCategorie[categorie.id].competences.push(comp)
        }
    })

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>🎯 Gestion des Compétences</h1>
                    <p style={styles.subtitle}>{competences.length} compétence(s) • {competencesFiltered.length} affichée(s)</p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={() => router.push('/admin/formation')} style={styles.backButton}>
                        ← Retour
                    </button>
                    <button onClick={handleNew} style={styles.createButton}>
                        ➕ Nouvelle compétence
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div style={styles.filters}>
                <input
                    type="text"
                    placeholder="Rechercher par intitulé, description ou code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select value={filterDomaine} onChange={(e) => { setFilterDomaine(e.target.value); setFilterCategorie('tous') }} style={styles.select}>
                    <option value="tous">Tous les domaines</option>
                    {domaines.filter(d => d.actif).map(d => (
                        <option key={d.id} value={d.id}>{d.emoji} {d.nom}</option>
                    ))}
                </select>
                <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)} style={styles.select}>
                    <option value="tous">Toutes les catégories</option>
                    {categoriesFiltered.map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                </select>
            </div>

            {Object.keys(competencesParCategorie).length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucune compétence trouvée</p>
                    <button onClick={handleNew} style={styles.createButton}>
                        Créer une compétence
                    </button>
                </div>
            ) : (
                Object.values(competencesParCategorie).map(({ categorie, domaine, competences: comps }) => (
                    <div key={categorie.id} style={styles.categorieSection}>
                        <h2 style={styles.categorieTitle}>
                            {domaine?.emoji} {domaine?.nom} → {categorie.nom}
                        </h2>

                        <div style={styles.list}>
                            {comps.map(competence => (
                                <div key={competence.id} style={styles.card}>
                                    <div style={styles.cardHeader}>
                                        <div style={styles.cardHeaderLeft}>
                                            {competence.code && (
                                                <span style={styles.code}>{competence.code}</span>
                                            )}
                                            <span style={styles.intitule}>{competence.intitule}</span>
                                        </div>
                                        <span style={styles.ordre}>#{competence.ordre}</span>
                                    </div>

                                    {competence.description && (
                                        <p style={styles.description}>{competence.description}</p>
                                    )}

                                    {competence.contexte && (
                                        <p style={styles.contexte}>
                                            <strong>Contexte :</strong> {competence.contexte}
                                        </p>
                                    )}

                                    <div style={styles.cardActions}>
                                        <button onClick={() => handleEdit(competence)} style={styles.editButton}>
                                            ✏️ Modifier
                                        </button>
                                        <button onClick={() => handleDelete(competence.id, competence.intitule)} style={styles.deleteButton}>
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>
                            {editingCompetence ? 'Modifier la compétence' : 'Nouvelle compétence'}
                        </h3>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Catégorie *</label>
                            <select
                                value={formData.categorie_id}
                                onChange={(e) => setFormData({ ...formData, categorie_id: e.target.value })}
                                style={styles.select}
                            >
                                <option value="">-- Sélectionner --</option>
                                {categories.map(c => {
                                    const d = domaines.find(dom => dom.id === c.domaine_id)
                                    return (
                                        <option key={c.id} value={c.id}>
                                            {d?.emoji} {d?.nom} → {c.nom}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Code (optionnel)</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Ex: LECT-ACQ-01"
                                style={styles.input}
                            />
                            <small style={styles.hint}>Identifiant unique pour la compétence</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Intitulé *</label>
                            <input
                                type="text"
                                value={formData.intitule}
                                onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                                placeholder="Ex: Connaître les lettres de l'alphabet"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Description détaillée de la compétence..."
                                style={styles.textarea}
                                rows={3}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Contexte d'évaluation</label>
                            <input
                                type="text"
                                value={formData.contexte}
                                onChange={(e) => setFormData({ ...formData, contexte: e.target.value })}
                                placeholder="Ex: avec ses outils, sans ses outils..."
                                style={styles.input}
                            />
                            <small style={styles.hint}>Contexte dans lequel la compétence doit être évaluée</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Ordre d'affichage</label>
                            <input
                                type="number"
                                value={formData.ordre}
                                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 1 })}
                                style={styles.input}
                                min="1"
                            />
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button onClick={handleSave} style={styles.saveButton}>
                                {editingCompetence ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    headerActions: { display: 'flex', gap: '12px' },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    createButton: { padding: '10px 20px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    filters: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '300px', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    select: { padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer', boxSizing: 'border-box' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    categorieSection: { marginBottom: '32px' },
    categorieTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #2196f3', color: '#333' },
    list: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' },
    card: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' },
    cardHeaderLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
    code: { fontSize: '11px', color: '#fff', backgroundColor: '#2196f3', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: '600', letterSpacing: '0.5px' },
    intitule: { fontSize: '15px', fontWeight: '600', color: '#333', lineHeight: '1.4' },
    ordre: { fontSize: '12px', color: '#999', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' },
    description: { fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: '1.4' },
    contexte: { fontSize: '12px', color: '#666', marginBottom: '12px', backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '4px', fontStyle: 'italic' },
    cardActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
    editButton: { padding: '6px 12px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    deleteButton: { padding: '6px 12px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    hint: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#999' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    saveButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
}
