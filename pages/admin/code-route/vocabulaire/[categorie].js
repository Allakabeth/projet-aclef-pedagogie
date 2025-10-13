import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function GestionMotsCategorie() {
    const router = useRouter()
    const { categorie } = router.query
    const [vocabulaire, setVocabulaire] = useState([])
    const [loading, setLoading] = useState(true)

    // Modals
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [currentMot, setCurrentMot] = useState(null)

    // Formulaire
    const [formData, setFormData] = useState({
        mot: '',
        definition_simple: '',
        emoji: '📝',
        ordre_categorie: ''
    })

    const [message, setMessage] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (categorie) {
            loadVocabulaire()
        }
    }, [categorie])

    const loadVocabulaire = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/admin/code-route/vocabulaire?categorie=${encodeURIComponent(categorie)}`)
            const data = await response.json()

            if (data.success) {
                // Filtrer le placeholder si présent
                const mots = data.vocabulaire.filter(m => m.mot !== '_placeholder_')
                setVocabulaire(mots)
            }
        } catch (error) {
            console.error('Erreur chargement vocabulaire:', error)
            showMessage('Erreur lors du chargement', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Filtrer le vocabulaire par recherche
    const vocabulaireFiltré = vocabulaire.filter(mot =>
        mot.mot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mot.definition_simple.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 3000)
    }

    // Ouvrir modals
    const openAddModal = () => {
        setFormData({
            mot: '',
            definition_simple: '',
            emoji: vocabulaire[0]?.emoji || '📝',
            ordre_categorie: ''
        })
        setShowAddModal(true)
    }

    const openEditModal = (mot) => {
        setCurrentMot(mot)
        setFormData({
            mot: mot.mot,
            definition_simple: mot.definition_simple,
            emoji: mot.emoji || '📝',
            ordre_categorie: mot.ordre_categorie || ''
        })
        setShowEditModal(true)
    }

    const openDeleteModal = (mot) => {
        setCurrentMot(mot)
        setShowDeleteModal(true)
    }

    // Ajouter un mot
    const handleAdd = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/admin/code-route/vocabulaire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    categorie
                })
            })

            const data = await response.json()

            if (data.success) {
                showMessage('✅ Mot ajouté avec succès', 'success')
                setShowAddModal(false)
                loadVocabulaire()
            } else {
                showMessage('❌ Erreur lors de l\'ajout', 'error')
            }
        } catch (error) {
            console.error('Erreur ajout:', error)
            showMessage('❌ Erreur de connexion', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Modifier un mot
    const handleEdit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/admin/code-route/vocabulaire', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentMot.id,
                    ...formData,
                    categorie
                })
            })

            const data = await response.json()

            if (data.success) {
                showMessage('✅ Mot modifié avec succès', 'success')
                setShowEditModal(false)
                loadVocabulaire()
            } else {
                showMessage('❌ Erreur lors de la modification', 'error')
            }
        } catch (error) {
            console.error('Erreur modification:', error)
            showMessage('❌ Erreur de connexion', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Supprimer un mot
    const handleDelete = async () => {
        setIsSubmitting(true)

        try {
            const response = await fetch(`/api/admin/code-route/vocabulaire?id=${currentMot.id}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (data.success) {
                const msg = data.nb_definitions_supprimees > 0
                    ? `✅ Mot supprimé (${data.nb_definitions_supprimees} définitions d'apprenants supprimées)`
                    : '✅ Mot supprimé avec succès'
                showMessage(msg, 'success')
                setShowDeleteModal(false)
                loadVocabulaire()
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

    // Dupliquer un mot
    const handleDuplicate = async (mot) => {
        try {
            const response = await fetch('/api/admin/code-route/dupliquer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: mot.id })
            })

            const data = await response.json()

            if (data.success) {
                showMessage('✅ Mot dupliqué avec succès', 'success')
                loadVocabulaire()
                setTimeout(() => openEditModal(data.vocabulaire), 500)
            } else {
                showMessage('❌ Erreur lors de la duplication', 'error')
            }
        } catch (error) {
            console.error('Erreur duplication:', error)
            showMessage('❌ Erreur de connexion', 'error')
        }
    }

    if (!categorie) {
        return null
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
                    <h1 style={styles.title}>📝 {decodeURIComponent(categorie)}</h1>
                    <p style={styles.subtitle}>
                        {vocabulaire.length} mot{vocabulaire.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openAddModal} style={styles.addButton}>
                    ➕ Nouveau mot
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

            {/* Recherche */}
            {vocabulaire.length > 0 && (
                <div style={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un mot..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
                            ✖
                        </button>
                    )}
                </div>
            )}

            {/* Grille de cartes */}
            {vocabulaireFiltré.length > 0 ? (
                <div style={styles.grid}>
                    {vocabulaireFiltré.map(mot => (
                        <div key={mot.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={styles.emoji}>{mot.emoji}</div>
                                <div style={styles.ordreBadge}>#{mot.ordre_categorie}</div>
                            </div>

                            <div style={styles.cardBody}>
                                <h3 style={styles.motTitle}>{mot.mot}</h3>
                                <p style={styles.definition}>{mot.definition_simple}</p>

                                {mot.nb_definitions > 0 && (
                                    <div style={styles.statsContainer}>
                                        <span style={styles.statsBadge}>
                                            👥 {mot.nb_definitions} définition{mot.nb_definitions > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={styles.cardActions}>
                                <button
                                    onClick={() => openEditModal(mot)}
                                    style={styles.actionButton}
                                    title="Modifier"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDuplicate(mot)}
                                    style={styles.actionButton}
                                    title="Dupliquer"
                                >
                                    📋
                                </button>
                                <button
                                    onClick={() => openDeleteModal(mot)}
                                    style={styles.actionButton}
                                    title="Supprimer"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : vocabulaire.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📭</div>
                    <p style={styles.emptyText}>Aucun mot dans cette catégorie</p>
                    <button onClick={openAddModal} style={styles.emptyButton}>
                        Ajouter le premier mot
                    </button>
                </div>
            ) : (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🔍</div>
                    <p style={styles.emptyText}>Aucun mot trouvé</p>
                </div>
            )}

            {/* Bouton retour */}
            <div style={styles.backButtonContainer}>
                <button onClick={() => router.push('/admin/code-route/vocabulaire')} style={styles.backButton}>
                    ← Retour aux catégories
                </button>
            </div>

            {/* Modal Ajout */}
            {showAddModal && (
                <Modal onClose={() => setShowAddModal(false)}>
                    <h2 style={styles.modalTitle}>➕ Ajouter un mot</h2>
                    <form onSubmit={handleAdd}>
                        <FormFields formData={formData} setFormData={setFormData} />
                        <div style={styles.modalActions}>
                            <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
                                {isSubmitting ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Édition */}
            {showEditModal && (
                <Modal onClose={() => setShowEditModal(false)}>
                    <h2 style={styles.modalTitle}>✏️ Modifier le mot</h2>
                    <form onSubmit={handleEdit}>
                        <FormFields formData={formData} setFormData={setFormData} />
                        <div style={styles.modalActions}>
                            <button type="button" onClick={() => setShowEditModal(false)} style={styles.cancelButton}>
                                Annuler
                            </button>
                            <button type="submit" disabled={isSubmitting} style={styles.submitButton}>
                                {isSubmitting ? 'Modification...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Suppression */}
            {showDeleteModal && (
                <Modal onClose={() => setShowDeleteModal(false)}>
                    <h2 style={styles.modalTitle}>🗑️ Supprimer le mot</h2>
                    <p style={styles.deleteWarning}>
                        Êtes-vous sûr de vouloir supprimer "<strong>{currentMot?.mot}</strong>" ?
                    </p>
                    {currentMot?.nb_definitions > 0 && (
                        <div style={styles.warningBox}>
                            ⚠️ <strong>{currentMot.nb_definitions}</strong> apprenant{currentMot.nb_definitions > 1 ? 's ont' : ' a'} créé une définition pour ce mot.
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
                <label style={styles.label}>Mot *</label>
                <input
                    type="text"
                    value={formData.mot}
                    onChange={(e) => setFormData({...formData, mot: e.target.value})}
                    required
                    style={styles.input}
                />
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Définition simple *</label>
                <textarea
                    value={formData.definition_simple}
                    onChange={(e) => setFormData({...formData, definition_simple: e.target.value})}
                    required
                    rows={3}
                    style={styles.textarea}
                />
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Emoji</label>
                    <input
                        type="text"
                        value={formData.emoji}
                        onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                        maxLength={10}
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Ordre</label>
                    <input
                        type="number"
                        value={formData.ordre_categorie}
                        onChange={(e) => setFormData({...formData, ordre_categorie: e.target.value})}
                        min={1}
                        style={styles.input}
                    />
                </div>
            </div>

            {/* Sélecteur d'emojis */}
            <div style={styles.emojiPicker}>
                <div style={styles.emojiPickerLabel}>Suggestions d'emojis :</div>
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
        </>
    )
}

// Styles (identiques à la page catégories)
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
    searchContainer: {
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    },
    searchInput: {
        flex: 1,
        padding: '10px 15px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none'
    },
    clearButton: {
        padding: '10px 15px',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#f8fafc'
    },
    emoji: {
        fontSize: '32px'
    },
    ordreBadge: {
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    cardBody: {
        padding: '15px'
    },
    motTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1e293b',
        margin: '0 0 10px 0'
    },
    definition: {
        fontSize: '14px',
        color: '#64748b',
        margin: '0 0 10px 0',
        lineHeight: '1.5'
    },
    statsContainer: {
        marginTop: '10px'
    },
    statsBadge: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold'
    },
    cardActions: {
        display: 'flex',
        borderTop: '1px solid #e2e8f0'
    },
    actionButton: {
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
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
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
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
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
    textarea: {
        width: '100%',
        padding: '10px 12px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
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
        backgroundColor: '#fef3c7',
        color: '#92400e',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '20px',
        border: '1px solid #fbbf24'
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
