import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ApprenantSelector from '@/components/formation/ApprenantSelector'

/**
 * Page de création d'un nouveau positionnement
 * Sélection de l'apprenant et création initiale
 */
export default function NouveauPositionnement() {
    const router = useRouter()
    const [selectedApprenantId, setSelectedApprenantId] = useState(null)
    const [datePositionnement, setDatePositionnement] = useState('')
    const [commentairesGeneraux, setCommentairesGeneraux] = useState('')
    const [formateurId, setFormateurId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Récupérer l'ID du formateur depuis le localStorage
        const adminUser = localStorage.getItem('quiz-admin-user')
        if (adminUser) {
            try {
                const user = JSON.parse(adminUser)
                setFormateurId(user.id)
            } catch (err) {
                console.error('Erreur parsing user:', err)
            }
        }

        // Initialiser la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        setDatePositionnement(today)
    }, [])

    async function handleCreate() {
        if (!selectedApprenantId) {
            alert('Veuillez sélectionner un apprenant')
            return
        }

        if (!formateurId) {
            alert('Erreur: Formateur non identifié')
            return
        }

        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/formation/positionnements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apprenant_id: selectedApprenantId,
                    formateur_id: formateurId,
                    date_positionnement: datePositionnement,
                    commentaires_generaux: commentairesGeneraux
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erreur lors de la création')
            }

            const data = await response.json()

            // Rediriger vers la page de détail pour compléter le positionnement
            router.push(`/admin/formation/positionnements/${data.positionnement.id}`)
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>➕ Nouveau positionnement</h1>
                <p style={styles.subtitle}>
                    Sélectionnez un apprenant pour démarrer un nouveau positionnement
                </p>
            </div>

            <div style={styles.form}>
                {/* Sélection de l'apprenant */}
                <ApprenantSelector
                    onSelect={setSelectedApprenantId}
                    selectedId={selectedApprenantId}
                    disabled={loading}
                />

                {/* Date du positionnement */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Date du positionnement</label>
                    <input
                        type="date"
                        value={datePositionnement}
                        onChange={(e) => setDatePositionnement(e.target.value)}
                        disabled={loading}
                        style={styles.input}
                    />
                </div>

                {/* Commentaires généraux (optionnel) */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Commentaires généraux <span style={styles.optional}>(optionnel)</span>
                    </label>
                    <textarea
                        value={commentairesGeneraux}
                        onChange={(e) => setCommentairesGeneraux(e.target.value)}
                        disabled={loading}
                        placeholder="Notes générales sur le positionnement..."
                        style={styles.textarea}
                        rows={4}
                    />
                </div>

                {/* Message d'erreur */}
                {error && (
                    <div style={styles.errorBox}>
                        <p style={styles.errorText}>❌ {error}</p>
                    </div>
                )}

                {/* Actions */}
                <div style={styles.actions}>
                    <button
                        onClick={() => router.push('/admin/formation/positionnements')}
                        disabled={loading}
                        style={styles.cancelButton}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading || !selectedApprenantId}
                        style={{
                            ...styles.createButton,
                            ...(loading || !selectedApprenantId ? styles.createButtonDisabled : {})
                        }}
                    >
                        {loading ? 'Création...' : 'Créer et commencer l\'évaluation →'}
                    </button>
                </div>

                {/* Info */}
                <div style={styles.infoBox}>
                    <p style={styles.infoText}>
                        ℹ️ Après la création, vous serez redirigé vers la page d'évaluation où vous pourrez
                        évaluer les compétences de l'apprenant domaine par domaine.
                    </p>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '32px',
        textAlign: 'center'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '15px',
        color: '#666',
        margin: 0
    },
    form: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#333'
    },
    optional: {
        fontWeight: '400',
        color: '#999'
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    textarea: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        resize: 'vertical'
    },
    errorBox: {
        padding: '12px',
        backgroundColor: '#ffebee',
        borderRadius: '6px',
        marginBottom: '20px'
    },
    errorText: {
        color: '#d32f2f',
        margin: 0,
        fontSize: '14px'
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '24px'
    },
    cancelButton: {
        padding: '12px 24px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    createButton: {
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    createButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed'
    },
    infoBox: {
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px'
    },
    infoText: {
        fontSize: '13px',
        color: '#1976d2',
        margin: 0,
        lineHeight: '1.5'
    }
}
