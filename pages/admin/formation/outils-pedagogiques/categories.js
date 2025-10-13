import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page admin : Gestion des catégories d'outils pédagogiques
 */
export default function CategoriesOutils() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState({
        nom: '',
        description: '',
        emoji: '📁',
        couleur: '#6b7280',
        ordre: 0
    })

    useEffect(() => {
        loadCategories()
    }, [])

    async function loadCategories() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/categories-outils', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors du chargement')
            }

            const data = await response.json()
            setCategories(data.categories || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function openModal(categorie = null) {
        if (categorie) {
            setEditingId(categorie.id)
            setFormData({
                nom: categorie.nom,
                description: categorie.description || '',
                emoji: categorie.emoji || '📁',
                couleur: categorie.couleur || '#6b7280',
                ordre: categorie.ordre || 0
            })
        } else {
            setEditingId(null)
            setFormData({
                nom: '',
                description: '',
                emoji: '📁',
                couleur: '#6b7280',
                ordre: categories.length
            })
        }
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditingId(null)
        setFormData({ nom: '', description: '', emoji: '📁', couleur: '#6b7280', ordre: 0 })
    }

    async function handleSave() {
        if (!formData.nom.trim()) {
            alert('Le nom est requis')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')

            if (editingId) {
                // Modification
                const response = await fetch(`/api/admin/formation/categories-outils/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                })

                if (!response.ok) {
                    throw new Error('Erreur lors de la modification')
                }

                alert('✅ Catégorie modifiée avec succès')
            } else {
                // Création
                const response = await fetch('/api/admin/formation/categories-outils', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                })

                if (!response.ok) {
                    throw new Error('Erreur lors de la création')
                }

                alert('✅ Catégorie créée avec succès')
            }

            closeModal()
            loadCategories()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id, nom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${nom}" ?`)) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/categories-outils/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erreur lors de la suppression')
            }

            alert('✅ Catégorie supprimée avec succès')
            loadCategories()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ ' + err.message)
        }
    }

    async function toggleActif(id, actif) {
        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/categories-outils/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ actif: !actif })
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la modification')
            }

            loadCategories()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    if (loading) {
        return <div style={styles.container}><p>Chargement...</p></div>
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>🗂️ Catégories d'Outils Pédagogiques</h1>
                <div style={styles.headerActions}>
                    <button onClick={() => openModal()} style={styles.createButton}>
                        ➕ Nouvelle catégorie
                    </button>
                    <button onClick={() => router.push('/admin/formation/outils-pedagogiques')} style={styles.backButton}>
                        ← Retour
                    </button>
                </div>
            </div>

            {categories.length === 0 ? (
                <div style={styles.emptyState}>
                    <p>Aucune catégorie trouvée</p>
                    <button onClick={() => openModal()} style={styles.createButton}>
                        Créer la première catégorie
                    </button>
                </div>
            ) : (
                <div style={styles.categoriesList}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{
                            ...styles.categorieCard,
                            opacity: cat.actif ? 1 : 0.5
                        }}>
                            <div style={styles.cardHeader}>
                                <div style={styles.cardTitle}>
                                    <span style={styles.emoji}>{cat.emoji}</span>
                                    <h3 style={styles.categoryName}>{cat.nom}</h3>
                                    <span
                                        style={{
                                            ...styles.colorIndicator,
                                            backgroundColor: cat.couleur
                                        }}
                                    />
                                </div>
                                <div style={styles.cardBadges}>
                                    <span style={styles.orderBadge}>Ordre: {cat.ordre}</span>
                                    {!cat.actif && <span style={styles.inactiveBadge}>Inactif</span>}
                                </div>
                            </div>

                            {cat.description && (
                                <p style={styles.description}>{cat.description}</p>
                            )}

                            <div style={styles.cardActions}>
                                <button
                                    onClick={() => toggleActif(cat.id, cat.actif)}
                                    style={cat.actif ? styles.deactivateButton : styles.activateButton}
                                >
                                    {cat.actif ? '👁️ Désactiver' : '✓ Activer'}
                                </button>
                                <button onClick={() => openModal(cat)} style={styles.editButton}>
                                    ✏️ Modifier
                                </button>
                                <button onClick={() => handleDelete(cat.id, cat.nom)} style={styles.deleteButton}>
                                    🗑️ Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de création/édition */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>
                            {editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                        </h2>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nom *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                placeholder="Ex: Lecture"
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

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Emoji</label>
                                <input
                                    type="text"
                                    value={formData.emoji}
                                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                                    placeholder="📁"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Couleur</label>
                                <input
                                    type="color"
                                    value={formData.couleur}
                                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                                    style={styles.colorInput}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Ordre d'affichage</label>
                                <input
                                    type="number"
                                    value={formData.ordre}
                                    onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) })}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={closeModal} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button onClick={handleSave} style={styles.saveButton}>
                                {editingId ? 'Modifier' : 'Créer'}
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
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: 0 },
    headerActions: { display: 'flex', gap: '12px' },
    createButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    backButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    categoriesList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    categorieCard: { backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #f0f0f0' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '16px' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
    emoji: { fontSize: '32px' },
    categoryName: { fontSize: '18px', fontWeight: '600', color: '#333', margin: 0 },
    colorIndicator: { width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px #ddd' },
    cardBadges: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' },
    orderBadge: { padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px', color: '#666' },
    inactiveBadge: { padding: '4px 8px', backgroundColor: '#ff9800', borderRadius: '4px', fontSize: '12px', color: '#fff', fontWeight: '600' },
    description: { fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.5' },
    cardActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    editButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    deactivateButton: { padding: '8px 16px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    activateButton: { padding: '8px 16px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' },
    modalTitle: { fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '24px', margin: '0 0 24px 0' },
    formGroup: { marginBottom: '20px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    colorInput: { width: '100%', height: '42px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', boxSizing: 'border-box' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
}
