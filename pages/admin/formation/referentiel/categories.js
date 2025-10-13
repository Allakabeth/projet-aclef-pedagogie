import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page d'administration des catégories de compétences
 */
export default function GestionCategories() {
    const router = useRouter()
    const [categories, setCategories] = useState([])
    const [domaines, setDomaines] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCategorie, setEditingCategorie] = useState(null)
    const [formData, setFormData] = useState({
        domaine_id: '',
        nom: '',
        description: '',
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

            const [catRes, domRes] = await Promise.all([
                fetch('/api/admin/formation/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/domaines', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const catData = await catRes.json()
            const domData = await domRes.json()

            setCategories(catData.categories || [])
            setDomaines(domData.domaines || [])
        } catch (err) {
            console.error('Erreur:', err)
        } finally {
            setLoading(false)
        }
    }

    function handleNew() {
        setEditingCategorie(null)
        setFormData({
            domaine_id: domaines.length > 0 ? domaines[0].id : '',
            nom: '',
            description: '',
            ordre: 1
        })
        setShowModal(true)
    }

    function handleEdit(categorie) {
        setEditingCategorie(categorie)
        setFormData({
            domaine_id: categorie.domaine_id,
            nom: categorie.nom,
            description: categorie.description || '',
            ordre: categorie.ordre
        })
        setShowModal(true)
    }

    async function handleSave() {
        if (!formData.nom.trim() || !formData.domaine_id) {
            alert('Le nom et le domaine sont requis')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const url = editingCategorie
                ? `/api/admin/formation/categories/${editingCategorie.id}`
                : '/api/admin/formation/categories'

            const response = await fetch(url, {
                method: editingCategorie ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

            alert(editingCategorie ? '✅ Catégorie modifiée' : '✅ Catégorie créée')
            setShowModal(false)
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id, nom) {
        if (!confirm(`Supprimer la catégorie "${nom}" ?\nToutes les compétences associées seront également supprimées.`)) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur suppression')

            alert('✅ Catégorie supprimée')
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    // Organiser par domaine
    const categoriesParDomaine = {}
    categories.forEach(cat => {
        const domaine = domaines.find(d => d.id === cat.domaine_id)
        if (domaine) {
            if (!categoriesParDomaine[domaine.id]) {
                categoriesParDomaine[domaine.id] = {
                    domaine,
                    categories: []
                }
            }
            categoriesParDomaine[domaine.id].categories.push(cat)
        }
    })

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📂 Gestion des Catégories</h1>
                    <p style={styles.subtitle}>{categories.length} catégorie(s)</p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={() => router.push('/admin/formation')} style={styles.backButton}>
                        ← Retour
                    </button>
                    <button onClick={handleNew} style={styles.createButton}>
                        ➕ Nouvelle catégorie
                    </button>
                </div>
            </div>

            {Object.keys(categoriesParDomaine).length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucune catégorie créée</p>
                    <button onClick={handleNew} style={styles.createButton}>
                        Créer la première catégorie
                    </button>
                </div>
            ) : (
                Object.values(categoriesParDomaine).map(({ domaine, categories: cats }) => (
                    <div key={domaine.id} style={styles.domaineSection}>
                        <h2 style={styles.domaineTitle}>
                            {domaine.emoji} {domaine.nom}
                        </h2>

                        <div style={styles.list}>
                            {cats.map(categorie => (
                                <div key={categorie.id} style={styles.card}>
                                    <div style={styles.cardHeader}>
                                        <div>
                                            <span style={styles.nom}>{categorie.nom}</span>
                                            <span style={styles.ordre}>Ordre: {categorie.ordre}</span>
                                        </div>
                                    </div>

                                    {categorie.description && (
                                        <p style={styles.description}>{categorie.description}</p>
                                    )}

                                    <div style={styles.cardActions}>
                                        <button onClick={() => handleEdit(categorie)} style={styles.editButton}>
                                            ✏️ Modifier
                                        </button>
                                        <button onClick={() => handleDelete(categorie.id, categorie.nom)} style={styles.deleteButton}>
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
                            {editingCategorie ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                        </h3>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Domaine *</label>
                            <select
                                value={formData.domaine_id}
                                onChange={(e) => setFormData({ ...formData, domaine_id: e.target.value })}
                                style={styles.select}
                            >
                                <option value="">-- Sélectionner --</option>
                                {domaines.filter(d => d.actif).map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.emoji} {d.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nom *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                placeholder="Ex: Acquisition, Textes références..."
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Description de la catégorie..."
                                style={styles.textarea}
                                rows={3}
                            />
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
                                {editingCategorie ? 'Modifier' : 'Créer'}
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
    createButton: { padding: '10px 20px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    domaineSection: { marginBottom: '32px' },
    domaineTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #2196f3' },
    list: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    card: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardHeader: { marginBottom: '8px' },
    nom: { fontSize: '16px', fontWeight: '600', color: '#333', marginRight: '12px' },
    ordre: { fontSize: '13px', color: '#999', backgroundColor: '#f5f5f5', padding: '2px 8px', borderRadius: '4px' },
    description: { fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.4' },
    cardActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
    editButton: { padding: '6px 12px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    deleteButton: { padding: '6px 12px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    saveButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
}
