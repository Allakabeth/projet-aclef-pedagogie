import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function GestionCategories() {
    const router = useRouter()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    // Modals
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [currentCategorie, setCurrentCategorie] = useState(null)

    // Formulaire
    const [formData, setFormData] = useState({ nom: '', emoji: '📝' })
    const [message, setMessage] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/code-route/categories')
            const data = await response.json()

            if (data.success) {
                setCategories(data.categories)
            }
        } catch (error) {
            console.error('Erreur chargement catégories:', error)
            showMessage('Erreur lors du chargement', 'error')
        } finally {
            setLoading(false)
        }
    }

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 3000)
    }

    // Ouvrir modals
    const openAddModal = () => {
        setFormData({ nom: '', emoji: '📝' })
        setShowAddModal(true)
    }

    const openEditModal = (categorie) => {
        setCurrentCategorie(categorie)
        setFormData({ nom: categorie.nom, emoji: categorie.emoji })
        setShowEditModal(true)
    }

    const openDeleteModal = (categorie) => {
        setCurrentCategorie(categorie)
        setShowDeleteModal(true)
    }

    // Créer une catégorie
    const handleAdd = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/admin/code-route/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (data.success) {
                showMessage('✅ Catégorie créée avec succès', 'success')
                setShowAddModal(false)
                loadCategories()
            } else {
                showMessage(`❌ ${data.error}`, 'error')
            }
        } catch (error) {
            console.error('Erreur création:', error)
            showMessage('❌ Erreur de connexion', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Renommer une catégorie
    const handleEdit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/admin/code-route/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ancien_nom: currentCategorie.nom,
                    nouveau_nom: formData.nom,
                    emoji: formData.emoji
                })
            })

            const data = await response.json()

            if (data.success) {
                showMessage(`✅ Catégorie renommée (${data.nb_mots_modifies} mots mis à jour)`, 'success')
                setShowEditModal(false)
                loadCategories()
            } else {
                showMessage(`❌ ${data.error}`, 'error')
            }
        } catch (error) {
            console.error('Erreur renommage:', error)
            showMessage('❌ Erreur de connexion', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Supprimer une catégorie
    const handleDelete = async () => {
        setIsSubmitting(true)

        try {
            const response = await fetch(`/api/admin/code-route/categories?nom=${encodeURIComponent(currentCategorie.nom)}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (data.success) {
                showMessage(`✅ Catégorie supprimée (${data.nb_mots_supprimes} mots supprimés)`, 'success')
                setShowDeleteModal(false)
                loadCategories()
            } else {
                showMessage('❌ Erreur lors de la suppression', 'error')
            }
        } catch (error) {
            console.error('Erreur suppression:', error)
            showMessage('❌ Erreur de connexion', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>Chargement...</div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📚 Gestion des Catégories</h1>
                    <p style={styles.subtitle}>
                        {categories.length} catégorie{categories.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openAddModal} style={styles.addButton}>
                    ➕ Nouvelle catégorie
                </button>
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    ...styles.message,
                    backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b'
                }}>
                    {message.text}
                </div>
            )}

            {/* Grille de catégories */}
            <div style={styles.grid}>
                {categories.map(cat => (
                    <div key={cat.nom} style={styles.card}>
                        <div
                            onClick={() => router.push(`/admin/code-route/vocabulaire/${encodeURIComponent(cat.nom)}`)}
                            style={styles.cardClickable}
                        >
                            <div style={styles.emoji}>{cat.emoji}</div>
                            <h3 style={styles.categorieNom}>{cat.nom}</h3>
                            <p style={styles.categorieCount}>
                                {cat.count} mot{cat.count > 1 ? 's' : ''}
                            </p>
                        </div>

                        <div style={styles.cardActions}>
                            <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(cat) }}
                                style={styles.editButton}
                                title="Renommer"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(cat) }}
                                style={styles.deleteButton}
                                title="Supprimer"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {categories.length === 0 && (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📂</div>
                    <p style={styles.emptyText}>Aucune catégorie</p>
                    <button onClick={openAddModal} style={styles.emptyButton}>
                        Créer la première catégorie
                    </button>
                </div>
            )}

            {/* Bouton retour */}
            <div style={styles.backButtonContainer}>
                <button onClick={() => router.push('/admin/code-route')} style={styles.backButton}>
                    ← Retour au menu Code de la Route
                </button>
            </div>

            {/* Modal Ajout */}
            {showAddModal && (
                <Modal onClose={() => setShowAddModal(false)}>
                    <h2 style={styles.modalTitle}>➕ Nouvelle catégorie</h2>
                    <form onSubmit={handleAdd}>
                        <FormFields formData={formData} setFormData={setFormData} />
                        <div style={styles.modalActions}>
                            <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
                                {isSubmitting ? 'Création...' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Édition */}
            {showEditModal && (
                <Modal onClose={() => setShowEditModal(false)}>
                    <h2 style={styles.modalTitle}>✏️ Renommer la catégorie</h2>
                    <form onSubmit={handleEdit}>
                        <FormFields formData={formData} setFormData={setFormData} />
                        <div style={styles.modalActions}>
                            <button type="button" onClick={() => setShowEditModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
                                {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Suppression */}
            {showDeleteModal && (
                <Modal onClose={() => setShowDeleteModal(false)}>
                    <h2 style={styles.modalTitle}>🗑️ Supprimer la catégorie</h2>
                    <p style={styles.deleteWarning}>
                        Êtes-vous sûr de vouloir supprimer la catégorie "<strong>{currentCategorie?.nom}</strong>" ?
                    </p>
                    {currentCategorie?.count > 0 && (
                        <div style={styles.warningBox}>
                            ⚠️ Cette catégorie contient <strong>{currentCategorie.count}</strong> mot{currentCategorie.count > 1 ? 's' : ''}.
                            {currentCategorie.count > 1 ? ' Ils seront tous supprimés' : ' Il sera supprimé'}.
                        </div>
                    )}
                    <div style={styles.modalActions}>
                        <button type="button" onClick={() => setShowDeleteModal(false)} style={styles.cancelButton}>
                            Annuler
                        </button>
                        <button onClick={handleDelete} disabled={isSubmitting} style={styles.deleteConfirmButton}>
                            {isSubmitting ? 'Suppression...' : 'Supprimer'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// Composant Modal
function Modal({ children, onClose }) {
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    )
}

// Composant Formulaire
function FormFields({ formData, setFormData }) {
    const emojisCodeRoute = [
        '🚗', '🚙', '🚕', '🚌', '🚎', '🚐', '🚑', '🚒',
        '🛣️', '🚦', '🚧', '🛑', '⛔', '⚠️', '🚸', '📍',
        '🅿️', '⚙️', '🔧', '🛞', '🔑', '⛽', '🔋', '💡',
        '🎯', '📝', '✏️', '📚', '📖', '🎓', '✅', '❌'
    ]

    return (
        <>
            <div style={styles.formGroup}>
                <label style={styles.label}>Nom de la catégorie *</label>
                <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                    style={styles.input}
                    placeholder="Ex: Panneaux de signalisation"
                />
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Emoji</label>
                <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                    maxLength={10}
                    style={styles.input}
                    placeholder="📝"
                />

                {/* Sélecteur d'emojis */}
                <div style={styles.emojiPicker}>
                    <div style={styles.emojiPickerLabel}>Suggestions :</div>
                    <div style={styles.emojiGrid}>
                        {emojisCodeRoute.map((emoji, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setFormData({...formData, emoji})}
                                style={{
                                    ...styles.emojiButton,
                                    backgroundColor: formData.emoji === emoji ? '#dbeafe' : 'transparent'
                                }}
                                title={`Utiliser ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px'
    },
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
    },
    loadingText: {
        fontSize: '18px',
        color: '#64748b'
    },
    header: {
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#f59e0b',
        margin: '0 0 5px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0
    },
    addButton: {
        backgroundColor: '#10b981',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    message: {
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        fontSize: '15px',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s'
    },
    cardClickable: {
        padding: '30px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    emoji: {
        fontSize: '48px',
        marginBottom: '15px'
    },
    categorieNom: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1e293b',
        margin: '0 0 8px 0'
    },
    categorieCount: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0
    },
    cardActions: {
        display: 'flex',
        borderTop: '1px solid #e2e8f0'
    },
    editButton: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRight: '1px solid #e2e8f0',
        backgroundColor: 'transparent',
        fontSize: '18px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    deleteButton: {
        flex: 1,
        padding: '12px',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '18px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: 'white',
        borderRadius: '15px'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '20px'
    },
    emptyText: {
        fontSize: '16px',
        color: '#64748b',
        marginBottom: '20px'
    },
    emptyButton: {
        backgroundColor: '#10b981',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    backButtonContainer: {
        textAlign: 'center'
    },
    backButton: {
        backgroundColor: '#6b7280',
        color: 'white',
        padding: '12px 30px',
        borderRadius: '25px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        maxWidth: '500px',
        width: '90%'
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#1e293b'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: '8px'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        boxSizing: 'border-box'
    },
    modalActions: {
        display: 'flex',
        gap: '10px',
        marginTop: '25px',
        justifyContent: 'flex-end'
    },
    cancelButton: {
        padding: '12px 24px',
        backgroundColor: '#e2e8f0',
        color: '#334155',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    submitButton: {
        padding: '12px 24px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    deleteWarning: {
        fontSize: '16px',
        color: '#475569',
        marginBottom: '20px'
    },
    warningBox: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '20px',
        border: '1px solid #fca5a5'
    },
    deleteConfirmButton: {
        padding: '12px 24px',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    emojiPicker: {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
    },
    emojiPickerLabel: {
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#64748b',
        marginBottom: '8px'
    },
    emojiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '6px'
    },
    emojiButton: {
        padding: '8px',
        fontSize: '20px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: 'transparent'
    }
}
