import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page d'administration des domaines de formation
 * Permet de créer, modifier, réordonner et archiver les domaines
 */
export default function GestionDomaines() {
    const router = useRouter()
    const [domaines, setDomaines] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingDomaine, setEditingDomaine] = useState(null)
    const [formData, setFormData] = useState({
        nom: '',
        emoji: '',
        description: '',
        ordre: 1,
        actif: true
    })

    useEffect(() => {
        loadDomaines()
    }, [])

    async function loadDomaines() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/domaines', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            setDomaines(data.domaines || [])
        } catch (err) {
            console.error('Erreur:', err)
        } finally {
            setLoading(false)
        }
    }

    function handleNew() {
        setEditingDomaine(null)
        setFormData({
            nom: '',
            emoji: '',
            description: '',
            ordre: Math.max(0, ...domaines.map(d => d.ordre)) + 1,
            actif: true
        })
        setShowModal(true)
    }

    function handleEdit(domaine) {
        setEditingDomaine(domaine)
        setFormData({
            nom: domaine.nom,
            emoji: domaine.emoji || '',
            description: domaine.description || '',
            ordre: domaine.ordre,
            actif: domaine.actif
        })
        setShowModal(true)
    }

    async function handleSave() {
        if (!formData.nom.trim()) {
            alert('Le nom est requis')
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const url = editingDomaine
                ? `/api/admin/formation/domaines/${editingDomaine.id}`
                : '/api/admin/formation/domaines'

            const response = await fetch(url, {
                method: editingDomaine ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

            alert(editingDomaine ? '✅ Domaine modifié' : '✅ Domaine créé')
            setShowModal(false)
            loadDomaines()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleDelete(id, nom) {
        if (!confirm(`Supprimer le domaine "${nom}" ?\nToutes les catégories et compétences associées seront également supprimées.`)) {
            return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/domaines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur suppression')

            alert('✅ Domaine supprimé')
            loadDomaines()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    async function handleToggleActif(domaine) {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            await fetch(`/api/admin/formation/domaines/${domaine.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ actif: !domaine.actif })
            })

            loadDomaines()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        }
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📚 Gestion des Domaines</h1>
                    <p style={styles.subtitle}>{domaines.length} domaine(s)</p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={() => router.push('/admin/formation')} style={styles.backButton}>
                        ← Retour
                    </button>
                    <button onClick={handleNew} style={styles.createButton}>
                        ➕ Nouveau domaine
                    </button>
                </div>
            </div>

            {domaines.length === 0 ? (
                <div style={styles.empty}>
                    <p>Aucun domaine créé</p>
                    <button onClick={handleNew} style={styles.createButton}>
                        Créer le premier domaine
                    </button>
                </div>
            ) : (
                <div style={styles.list}>
                    {domaines.map(domaine => (
                        <div key={domaine.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={styles.cardTitle}>
                                    <span style={styles.emoji}>{domaine.emoji || '📁'}</span>
                                    <span style={styles.nom}>{domaine.nom}</span>
                                    <span style={styles.ordre}>Ordre: {domaine.ordre}</span>
                                </div>
                                <div style={styles.badges}>
                                    {domaine.actif ? (
                                        <span style={styles.badgeActif}>Actif</span>
                                    ) : (
                                        <span style={styles.badgeInactif}>Archivé</span>
                                    )}
                                </div>
                            </div>

                            {domaine.description && (
                                <p style={styles.description}>{domaine.description}</p>
                            )}

                            <div style={styles.cardActions}>
                                <button onClick={() => handleEdit(domaine)} style={styles.editButton}>
                                    ✏️ Modifier
                                </button>
                                <button
                                    onClick={() => handleToggleActif(domaine)}
                                    style={domaine.actif ? styles.archiveButton : styles.restoreButton}
                                >
                                    {domaine.actif ? '📦 Archiver' : '↩️ Restaurer'}
                                </button>
                                <button onClick={() => handleDelete(domaine.id, domaine.nom)} style={styles.deleteButton}>
                                    🗑️ Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Création/Édition */}
            {showModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>
                            {editingDomaine ? 'Modifier le domaine' : 'Nouveau domaine'}
                        </h3>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nom *</label>
                            <input
                                type="text"
                                value={formData.nom}
                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                placeholder="Ex: Lecture, Écriture, Mathématiques"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Emoji</label>
                            <input
                                type="text"
                                value={formData.emoji}
                                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                                placeholder="Ex: 📖 (un seul caractère)"
                                style={styles.input}
                                maxLength={10}
                            />
                            <small style={styles.hint}>Copie un emoji depuis emojipedia.org</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Description du domaine..."
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
                            <small style={styles.hint}>Détermine l'ordre d'affichage dans les listes</small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.actif}
                                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                                />
                                <span>Domaine actif</span>
                            </label>
                        </div>

                        <div style={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button onClick={handleSave} style={styles.saveButton}>
                                {editingDomaine ? 'Modifier' : 'Créer'}
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
    list: { display: 'flex', flexDirection: 'column', gap: '16px' },
    card: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
    emoji: { fontSize: '32px' },
    nom: { fontSize: '20px', fontWeight: '600', color: '#333' },
    ordre: { fontSize: '14px', color: '#999', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' },
    badges: { display: 'flex', gap: '8px' },
    badgeActif: { padding: '4px 12px', backgroundColor: '#4caf50', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    badgeInactif: { padding: '4px 12px', backgroundColor: '#999', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    description: { fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.5' },
    cardActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f0f0f0' },
    editButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    archiveButton: { padding: '8px 16px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    restoreButton: { padding: '8px 16px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    hint: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#999' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    saveButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
}
