import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EvaluationGrid from '@/components/formation/EvaluationGrid'
import ProgressBar from '@/components/formation/ProgressBar'

/**
 * Page de détail/modification d'un positionnement
 * Permet d'évaluer toutes les compétences par domaine
 */
export default function DetailPositionnement() {
    const router = useRouter()
    const { id } = router.query

    const [positionnement, setPositionnement] = useState(null)
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [competences, setCompetences] = useState([])
    const [evaluations, setEvaluations] = useState({}) // { competence_id: { niveau_atteint, commentaire } }

    const [selectedDomaine, setSelectedDomaine] = useState(null)
    const [commentairesGeneraux, setCommentairesGeneraux] = useState('')
    const [statut, setStatut] = useState('en_cours')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (id) {
            loadData()
        }
    }, [id])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            // Charger les données en parallèle
            const [positRes, domainesRes, catsRes, compsRes] = await Promise.all([
                fetch(`/api/admin/formation/positionnements/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/domaines', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/competences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (!positRes.ok || !domainesRes.ok || !catsRes.ok || !compsRes.ok) {
                throw new Error('Erreur lors du chargement des données')
            }

            const positData = await positRes.json()
            const domainesData = await domainesRes.json()
            const catsData = await catsRes.json()
            const compsData = await compsRes.json()

            setPositionnement(positData.positionnement)
            setDomaines(domainesData.domaines || [])
            setCategories(catsData.categories || [])
            setCompetences(compsData.competences || [])

            // Initialiser les évaluations
            const evalMap = {}
            if (positData.positionnement.evaluations) {
                positData.positionnement.evaluations.forEach(evaluation => {
                    evalMap[evaluation.competence_id] = {
                        niveau_atteint: evaluation.niveau_atteint,
                        commentaire: evaluation.commentaire || ''
                    }
                })
            }
            setEvaluations(evalMap)

            // Initialiser les champs
            setCommentairesGeneraux(positData.positionnement.commentaires_generaux || '')
            setStatut(positData.positionnement.statut || 'en_cours')

            // Sélectionner le premier domaine par défaut
            if (domainesData.domaines && domainesData.domaines.length > 0) {
                setSelectedDomaine(domainesData.domaines[0].id)
            }
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setSaving(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')

            // Sauvegarder le positionnement (commentaires + statut)
            const updateRes = await fetch(`/api/admin/formation/positionnements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    commentaires_generaux: commentairesGeneraux,
                    statut: statut
                })
            })

            if (!updateRes.ok) {
                throw new Error('Erreur lors de la mise à jour du positionnement')
            }

            // Sauvegarder les évaluations
            const evaluationsArray = Object.entries(evaluations).map(([competence_id, evaluation]) => ({
                competence_id,
                niveau_atteint: evaluation.niveau_atteint,
                commentaire: evaluation.commentaire
            }))

            const evalRes = await fetch(`/api/admin/formation/positionnements/${id}/evaluations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    evaluations: evaluationsArray
                })
            })

            if (!evalRes.ok) {
                throw new Error('Erreur lors de la sauvegarde des évaluations')
            }

            alert('✅ Positionnement sauvegardé avec succès')
            loadData() // Recharger pour voir les changements
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    function handleEvaluationChange(newEvaluations) {
        setEvaluations(newEvaluations)
    }

    // Calculer les statistiques pour la barre de progression
    function getStats() {
        const totalCompetences = competences.length
        const evaluationsArray = Object.entries(evaluations).map(([competence_id, evaluation]) => ({
            competence_id,
            ...evaluation
        }))
        return { totalCompetences, evaluationsArray }
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <p>Chargement du positionnement...</p>
                </div>
            </div>
        )
    }

    if (error || !positionnement) {
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error || 'Positionnement non trouvé'}</p>
                    <button
                        onClick={() => router.push('/admin/formation/positionnements')}
                        style={styles.backButton}
                    >
                        ← Retour à la liste
                    </button>
                </div>
            </div>
        )
    }

    const { totalCompetences, evaluationsArray } = getStats()
    const domaineActuel = domaines.find(d => d.id === selectedDomaine)

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        📝 Positionnement : {positionnement.apprenant?.prenom} {positionnement.apprenant?.nom}
                    </h1>
                    <p style={styles.subtitle}>
                        Formateur: {positionnement.formateur?.prenom} {positionnement.formateur?.nom} •
                        Date: {new Date(positionnement.date_positionnement).toLocaleDateString('fr-FR')}
                    </p>
                </div>
            </div>

            {/* Barre de progression globale */}
            <ProgressBar
                evaluations={evaluationsArray}
                totalCompetences={totalCompetences}
                showDetails={true}
            />

            {/* Commentaires généraux et statut */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Informations générales</h3>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Commentaires généraux</label>
                    <textarea
                        value={commentairesGeneraux}
                        onChange={(e) => setCommentairesGeneraux(e.target.value)}
                        disabled={saving}
                        placeholder="Notes générales sur le positionnement..."
                        style={styles.textarea}
                        rows={3}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Statut</label>
                    <select
                        value={statut}
                        onChange={(e) => setStatut(e.target.value)}
                        disabled={saving}
                        style={styles.select}
                    >
                        <option value="brouillon">Brouillon</option>
                        <option value="en_cours">En cours</option>
                        <option value="valide">Validé</option>
                    </select>
                </div>
            </div>

            {/* Sélection du domaine */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Évaluation par domaine</h3>
                <div style={styles.domainesTabs}>
                    {domaines.map(domaine => (
                        <button
                            key={domaine.id}
                            onClick={() => setSelectedDomaine(domaine.id)}
                            style={{
                                ...styles.domaineTab,
                                ...(selectedDomaine === domaine.id ? styles.domaineTabActive : {})
                            }}
                        >
                            <span style={styles.domaineEmoji}>{domaine.emoji}</span>
                            <span>{domaine.nom}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Grille d'évaluation du domaine sélectionné */}
            {domaineActuel && (
                <EvaluationGrid
                    domaine={domaineActuel}
                    categories={categories}
                    competences={competences}
                    evaluations={evaluationsArray}
                    onChange={handleEvaluationChange}
                    readonly={saving}
                />
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <button
                    onClick={() => router.push('/admin/formation/positionnements')}
                    disabled={saving}
                    style={styles.cancelButton}
                >
                    ← Retour à la liste
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        ...styles.saveButton,
                        ...(saving ? styles.saveButtonDisabled : {})
                    }}
                >
                    {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '24px'
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        margin: 0
    },
    section: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 16px 0'
    },
    formGroup: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#333'
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
    select: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        boxSizing: 'border-box'
    },
    domainesTabs: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    domaineTab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s'
    },
    domaineTabActive: {
        borderColor: '#2196f3',
        backgroundColor: '#e3f2fd',
        fontWeight: '600'
    },
    domaineEmoji: {
        fontSize: '20px'
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '2px solid #f0f0f0'
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
    saveButton: {
        padding: '12px 24px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed'
    },
    loadingBox: {
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
    },
    errorBox: {
        padding: '40px 20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
        textAlign: 'center'
    },
    backButton: {
        padding: '12px 24px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        marginTop: '16px'
    }
}
