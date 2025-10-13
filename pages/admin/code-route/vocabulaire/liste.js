import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const CATEGORIES = [
    'Signalisation',
    'Panneaux',
    'Marquage au sol',
    'Feux de circulation',
    'Véhicules',
    'Équipements',
    'Règles de circulation',
    'Priorités',
    'Stationnement',
    'Vitesse',
    'Documents',
    'Sanctions',
    'Sécurité routière',
    'Environnement',
    'Autre'
]

export default function GestionVocabulaire() {
    const router = useRouter()
    const [vocabulaire, setVocabulaire] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingTerm, setEditingTerm] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [categorieFilter, setCategorieFilter] = useState('')

    const [formData, setFormData] = useState({
        categorie: 'Signalisation',
        terme: '',
        definition: '',
        exemples: [''],
        synonymes: [''],
        image_url: ''
    })

    useEffect(() => {
        loadVocabulaire()
    }, [])

    async function loadVocabulaire() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const params = new URLSearchParams()
            if (categorieFilter) params.append('categorie', categorieFilter)
            if (searchTerm) params.append('search', searchTerm)

            const response = await fetch(`/api/admin/code-route/vocabulaire?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors du chargement')

            const data = await response.json()
            setVocabulaire(data.vocabulaire || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleNewTerm() {
        setEditingTerm(null)
        setFormData({
            categorie: 'Signalisation',
            terme: '',
            definition: '',
            exemples: [''],
            synonymes: [''],
            image_url: ''
        })
        setShowModal(true)
    }

    function handleEditTerm(term) {
        setEditingTerm(term)
        setFormData({
            categorie: term.categorie,
            terme: term.terme,
            definition: term.definition,
            exemples: term.exemples?.length > 0 ? term.exemples : [''],
            synonymes: term.synonymes?.length > 0 ? term.synonymes : [''],
            image_url: term.image_url || ''
        })
        setShowModal(true)
    }

    async function handleSave() {
        if (!formData.terme.trim() || !formData.definition.trim()) {
            alert('Le terme et la définition sont requis')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')

            // Nettoyer les tableaux vides
            const cleanedData = {
                ...formData,
                exemples: formData.exemples.filter(e => e.trim() !== ''),
                synonymes: formData.synonymes.filter(s => s.trim() !== '')
            }

            const url = editingTerm
                ? `/api/admin/code-route/vocabulaire/${editingTerm.id}`
                : '/api/admin/code-route/vocabulaire'

            const response = await fetch(url, {
                method: editingTerm ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cleanedData)
            })

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

            alert(`✅ Terme ${editingTerm ? 'modifié' : 'créé'} avec succès`)
            setShowModal(false)
            loadVocabulaire()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id) {
        if (!confirm('Confirmer la suppression ?')) return

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/code-route/vocabulaire/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors de la suppression')

            alert('✅ Terme supprimé avec succès')
            loadVocabulaire()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    function addExemple() {
        setFormData({ ...formData, exemples: [...formData.exemples, ''] })
    }

    function updateExemple(index, value) {
        const newExemples = [...formData.exemples]
        newExemples[index] = value
        setFormData({ ...formData, exemples: newExemples })
    }

    function removeExemple(index) {
        const newExemples = formData.exemples.filter((_, i) => i !== index)
        setFormData({ ...formData, exemples: newExemples.length > 0 ? newExemples : [''] })
    }

    function addSynonyme() {
        setFormData({ ...formData, synonymes: [...formData.synonymes, ''] })
    }

    function updateSynonyme(index, value) {
        const newSynonymes = [...formData.synonymes]
        newSynonymes[index] = value
        setFormData({ ...formData, synonymes: newSynonymes })
    }

    function removeSynonyme(index) {
        const newSynonymes = formData.synonymes.filter((_, i) => i !== index)
        setFormData({ ...formData, synonymes: newSynonymes.length > 0 ? newSynonymes : [''] })
    }

    // Grouper par catégorie
    const vocabByCategorie = vocabulaire.reduce((acc, term) => {
        if (!acc[term.categorie]) acc[term.categorie] = []
        acc[term.categorie].push(term)
        return acc
    }, {})

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>📚 Vocabulaire du Code de la Route</h1>
                <button onClick={() => router.push('/admin/code-route')} style={styles.backButton}>
                    ← Retour
                </button>
            </div>

            <div style={styles.toolbar}>
                <input
                    type="text"
                    placeholder="🔍 Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />

                <select
                    value={categorieFilter}
                    onChange={(e) => setCategorieFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Toutes les catégories</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <button onClick={loadVocabulaire} style={styles.refreshButton}>
                    🔄 Actualiser
                </button>

                <button onClick={handleNewTerm} style={styles.addButton}>
                    ➕ Nouveau terme
                </button>
            </div>

            {loading ? (
                <p style={styles.loading}>Chargement...</p>
            ) : (
                <div style={styles.content}>
                    {Object.entries(vocabByCategorie).map(([categorie, termes]) => (
                        <div key={categorie} style={styles.categorieSection}>
                            <h2 style={styles.categorieTitle}>
                                {categorie} ({termes.length})
                            </h2>
                            <div style={styles.termsList}>
                                {termes.map(term => (
                                    <div key={term.id} style={styles.termCard}>
                                        <div style={styles.termHeader}>
                                            <h3 style={styles.termName}>{term.terme}</h3>
                                            <div style={styles.termActions}>
                                                <button
                                                    onClick={() => handleEditTerm(term)}
                                                    style={styles.editButton}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(term.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <p style={styles.termDefinition}>{term.definition}</p>
                                        {term.exemples?.length > 0 && (
                                            <div style={styles.termExemples}>
                                                <strong>Exemples:</strong>
                                                <ul style={styles.list}>
                                                    {term.exemples.map((ex, i) => (
                                                        <li key={i}>{ex}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {term.synonymes?.length > 0 && (
                                            <div style={styles.termSynonymes}>
                                                <strong>Synonymes:</strong> {term.synonymes.join(', ')}
                                            </div>
                                        )}
                                        {term.image_url && (
                                            <img src={term.image_url} alt={term.terme} style={styles.termImage} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {vocabulaire.length === 0 && (
                        <p style={styles.empty}>Aucun terme trouvé</p>
                    )}
                </div>
            )}

            {showModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>
                            {editingTerm ? '✏️ Modifier le terme' : '➕ Nouveau terme'}
                        </h2>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Catégorie *</label>
                            <select
                                value={formData.categorie}
                                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                                style={styles.input}
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Terme *</label>
                            <input
                                type="text"
                                value={formData.terme}
                                onChange={(e) => setFormData({ ...formData, terme: e.target.value })}
                                placeholder="Ex: Stop"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Définition *</label>
                            <textarea
                                value={formData.definition}
                                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                                placeholder="Définition du terme..."
                                rows={4}
                                style={styles.textarea}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Exemples d'utilisation</label>
                            {formData.exemples.map((ex, i) => (
                                <div key={i} style={styles.arrayItem}>
                                    <input
                                        type="text"
                                        value={ex}
                                        onChange={(e) => updateExemple(i, e.target.value)}
                                        placeholder="Exemple..."
                                        style={styles.arrayInput}
                                    />
                                    <button
                                        onClick={() => removeExemple(i)}
                                        style={styles.removeButton}
                                    >
                                        ✖
                                    </button>
                                </div>
                            ))}
                            <button onClick={addExemple} style={styles.addArrayButton}>
                                ➕ Ajouter un exemple
                            </button>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Synonymes</label>
                            {formData.synonymes.map((syn, i) => (
                                <div key={i} style={styles.arrayItem}>
                                    <input
                                        type="text"
                                        value={syn}
                                        onChange={(e) => updateSynonyme(i, e.target.value)}
                                        placeholder="Synonyme..."
                                        style={styles.arrayInput}
                                    />
                                    <button
                                        onClick={() => removeSynonyme(i)}
                                        style={styles.removeButton}
                                    >
                                        ✖
                                    </button>
                                </div>
                            ))}
                            <button onClick={addSynonyme} style={styles.addArrayButton}>
                                ➕ Ajouter un synonyme
                            </button>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>URL de l'image (optionnel)</label>
                            <input
                                type="text"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button onClick={handleSave} style={styles.saveButton}>
                                {editingTerm ? '💾 Modifier' : '✅ Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '200px', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
    select: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    refreshButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    addButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    loading: { textAlign: 'center', color: '#666', padding: '40px' },
    content: { display: 'flex', flexDirection: 'column', gap: '32px' },
    categorieSection: { backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    categorieTitle: { fontSize: '20px', fontWeight: '600', color: '#2196f3', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #2196f3' },
    termsList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    termCard: { backgroundColor: '#f9f9f9', borderRadius: '6px', padding: '16px', border: '1px solid #e0e0e0' },
    termHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    termName: { fontSize: '18px', fontWeight: '600', color: '#333', margin: 0 },
    termActions: { display: 'flex', gap: '8px' },
    editButton: { padding: '6px 10px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    deleteButton: { padding: '6px 10px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    termDefinition: { fontSize: '14px', color: '#666', marginBottom: '12px', lineHeight: '1.5' },
    termExemples: { fontSize: '13px', color: '#555', marginBottom: '8px' },
    termSynonymes: { fontSize: '13px', color: '#555', marginBottom: '8px' },
    list: { marginTop: '4px', marginLeft: '20px' },
    termImage: { maxWidth: '100%', height: 'auto', borderRadius: '4px', marginTop: '12px' },
    empty: { textAlign: 'center', color: '#999', padding: '60px', fontSize: '16px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '24px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontFamily: 'Arial', resize: 'vertical', boxSizing: 'border-box' },
    arrayItem: { display: 'flex', gap: '8px', marginBottom: '8px' },
    arrayInput: { flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
    removeButton: { padding: '8px 12px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    addArrayButton: { padding: '8px 16px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginTop: '4px' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
}
