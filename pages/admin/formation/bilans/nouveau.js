import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ApprenantSelector from '@/components/formation/ApprenantSelector'
import BilanEvaluationGrid from '@/components/formation/BilanEvaluationGrid'

export default function NouveauBilan() {
    const router = useRouter()

    // Etape et donnees du formulaire
    const [selectedApprenantId, setSelectedApprenantId] = useState(null)
    const [selectedApprenantName, setSelectedApprenantName] = useState('')
    const [typeBilan, setTypeBilan] = useState('direct')
    const [selectedPlanId, setSelectedPlanId] = useState('')
    const [dateBilan, setDateBilan] = useState('')
    const [periodeDebut, setPeriodeDebut] = useState('')
    const [periodeFin, setPeriodeFin] = useState('')
    const [dureeRealisee, setDureeRealisee] = useState('')
    const [synthese, setSynthese] = useState('')
    const [recommandations, setRecommandations] = useState('')

    // Donnees referentiel
    const [apprenants, setApprenants] = useState([])
    const [plans, setPlans] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [competences, setCompetences] = useState([])

    // Evaluations par domaine : { domaine_id: { competence_id: { statut_fin, commentaire } } }
    const [evaluations, setEvaluations] = useState({})
    // Commentaires par domaine : { domaine_id: string }
    const [domaineComments, setDomaineComments] = useState({})

    // Formateur
    const [formateurId, setFormateurId] = useState(null)

    // Etats UI
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadReferentiel()
        const user = localStorage.getItem('quiz-admin-user')
        if (user) {
            try {
                setFormateurId(JSON.parse(user).id)
            } catch (e) {}
        }
        setDateBilan(new Date().toISOString().split('T')[0])
    }, [])

    useEffect(() => {
        if (selectedApprenantId && (typeBilan === 'intermediaire' || typeBilan === 'final')) {
            loadPlans(selectedApprenantId)
        }
    }, [selectedApprenantId, typeBilan])

    async function loadReferentiel() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [domRes, catRes, compRes, appRes] = await Promise.all([
                fetch('/api/admin/formation/domaines', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/competences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/apprenants', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            const domData = await domRes.json()
            const catData = await catRes.json()
            const compData = await compRes.json()
            const appData = await appRes.json()

            setDomaines(domData.domaines || [])
            setCategories(catData.categories || [])
            setCompetences(compData.competences || [])
            setApprenants(appData.apprenants || [])
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadPlans(apprenantId) {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/formation/plans?apprenant_id=${apprenantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setPlans(data.plans || [])
            }
        } catch (err) {
            console.error('Erreur chargement plans:', err)
        }
    }

    function handleApprenantSelect(id) {
        setSelectedApprenantId(id)
        const app = apprenants.find(a => a.id === id)
        if (app) {
            setSelectedApprenantName(`${app.prenom} ${app.nom}`)
        }
        setSelectedPlanId('')
    }

    function handleEvaluationChange(domaineId, evalMap) {
        setEvaluations(prev => ({
            ...prev,
            [domaineId]: evalMap
        }))
    }

    function handleDomaineCommentChange(domaineId, comment) {
        setDomaineComments(prev => ({
            ...prev,
            [domaineId]: comment
        }))
    }

    async function handleSave() {
        if (!selectedApprenantId) {
            alert('Veuillez s\u00E9lectionner un apprenant')
            return
        }
        if (!formateurId) {
            alert('Erreur: formateur non identifi\u00E9')
            return
        }
        if (!dateBilan) {
            alert('Veuillez saisir la date du bilan')
            return
        }

        try {
            setSaving(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')

            // Construire la liste des competences evaluees
            const competencesArray = []
            Object.entries(evaluations).forEach(([domaineId, evalMap]) => {
                Object.entries(evalMap).forEach(([competenceId, evalData]) => {
                    if (evalData.statut_fin) {
                        competencesArray.push({
                            competence_id: competenceId,
                            statut_fin: evalData.statut_fin,
                            commentaire: evalData.commentaire || ''
                        })
                    }
                })
            })

            const body = {
                apprenant_id: selectedApprenantId,
                formateur_id: formateurId,
                plan_id: selectedPlanId || null,
                date_bilan: dateBilan,
                type: typeBilan,
                periode_debut: periodeDebut || null,
                periode_fin: periodeFin || null,
                duree_realisee: dureeRealisee ? parseFloat(dureeRealisee) : null,
                synthese: synthese || null,
                recommandations: recommandations || null,
                domaine_comments: domaineComments,
                competences: competencesArray
            }

            const response = await fetch('/api/admin/formation/bilans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur cr\u00E9ation bilan')
            }

            const data = await response.json()
            alert('Bilan cr\u00E9\u00E9 avec succ\u00E8s')
            router.push(`/admin/formation/bilans/${data.bilan.id}`)
        } catch (err) {
            setError(err.message)
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>{'\u2795'} Nouveau Bilan de Formation</h1>

            {error && <div style={styles.error}>{'\u274C'} {error}</div>}

            {/* Etape 1: Selection de l'apprenant */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>1. S\u00E9lectionner l'apprenant</h3>
                <ApprenantSelector
                    onSelect={handleApprenantSelect}
                    selectedId={selectedApprenantId}
                    disabled={saving}
                />
            </div>

            {/* Etape 2: Type de bilan */}
            {selectedApprenantId && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>2. Type de bilan</h3>
                    <div style={styles.typeOptions}>
                        {[
                            { value: 'direct', label: 'Direct', description: 'Bilan sans plan de formation associ\u00E9', color: '#2196f3' },
                            { value: 'intermediaire', label: 'Interm\u00E9diaire', description: 'Bilan en cours de formation', color: '#ff9800' },
                            { value: 'final', label: 'Final', description: 'Bilan de fin de formation', color: '#4caf50' }
                        ].map(option => (
                            <div
                                key={option.value}
                                onClick={() => setTypeBilan(option.value)}
                                style={{
                                    ...styles.typeCard,
                                    ...(typeBilan === option.value ? { borderColor: option.color, backgroundColor: option.color + '10' } : {})
                                }}
                            >
                                <div style={styles.typeRadio}>
                                    <div style={{
                                        ...styles.radioOuter,
                                        borderColor: typeBilan === option.value ? option.color : '#ccc'
                                    }}>
                                        {typeBilan === option.value && (
                                            <div style={{ ...styles.radioInner, backgroundColor: option.color }} />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <strong style={styles.typeLabel}>{option.label}</strong>
                                    <p style={styles.typeDescription}>{option.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Selection du plan si intermediaire ou final */}
                    {(typeBilan === 'intermediaire' || typeBilan === 'final') && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Plan de formation (optionnel)</label>
                            <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                style={styles.selectInput}
                            >
                                <option value="">-- Aucun plan --</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.apprenant?.prenom} {plan.apprenant?.nom} - {new Date(plan.date_debut).toLocaleDateString('fr-FR')} ({plan.statut})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Etape 3: Informations du bilan */}
            {selectedApprenantId && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>3. Informations du bilan</h3>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Date du bilan *</label>
                            <input
                                type="date"
                                value={dateBilan}
                                onChange={(e) => setDateBilan(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Dur\u00E9e r\u00E9alis\u00E9e (heures)</label>
                            <input
                                type="number"
                                value={dureeRealisee}
                                onChange={(e) => setDureeRealisee(e.target.value)}
                                placeholder="Ex: 120"
                                min="0"
                                step="0.5"
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>D\u00E9but de p\u00E9riode</label>
                            <input
                                type="date"
                                value={periodeDebut}
                                onChange={(e) => setPeriodeDebut(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Fin de p\u00E9riode</label>
                            <input
                                type="date"
                                value={periodeFin}
                                onChange={(e) => setPeriodeFin(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Etape 4: Evaluation des competences */}
            {selectedApprenantId && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>4. \u00C9valuation des comp\u00E9tences</h3>
                    <p style={styles.helpText}>
                        Pour chaque comp\u00E9tence, indiquez le niveau atteint en fin de p\u00E9riode.
                    </p>

                    {domaines.filter(d => d.actif !== false).sort((a, b) => a.ordre - b.ordre).map(domaine => {
                        // Preparer les evaluations pour ce domaine
                        const domaineEvals = evaluations[domaine.id] || {}
                        const evalsArray = Object.entries(domaineEvals).map(([compId, evalData]) => ({
                            competence_id: compId,
                            statut_fin: evalData.statut_fin,
                            commentaire: evalData.commentaire
                        }))

                        return (
                            <BilanEvaluationGrid
                                key={domaine.id}
                                domaine={domaine}
                                categories={categories}
                                competences={competences}
                                evaluations={evalsArray}
                                onChange={(evalMap) => handleEvaluationChange(domaine.id, evalMap)}
                                domaineComment={domaineComments[domaine.id] || ''}
                                onDomaineCommentChange={(comment) => handleDomaineCommentChange(domaine.id, comment)}
                                readonly={false}
                            />
                        )
                    })}
                </div>
            )}

            {/* Etape 5: Synthese et recommandations */}
            {selectedApprenantId && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>5. Synth\u00E8se et recommandations</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Synth\u00E8se g\u00E9n\u00E9rale</label>
                        <textarea
                            value={synthese}
                            onChange={(e) => setSynthese(e.target.value)}
                            placeholder="Synth\u00E8se du bilan de formation..."
                            rows={4}
                            style={styles.textarea}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Recommandations</label>
                        <textarea
                            value={recommandations}
                            onChange={(e) => setRecommandations(e.target.value)}
                            placeholder="Recommandations pour la suite de la formation..."
                            rows={4}
                            style={styles.textarea}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <button onClick={() => router.push('/admin/formation/bilans')} style={styles.cancelButton}>
                    {'\u2190'} Annuler
                </button>
                {selectedApprenantId && (
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedApprenantId || !dateBilan}
                        style={{
                            ...styles.saveButton,
                            ...(saving || !selectedApprenantId || !dateBilan ? styles.saveButtonDisabled : {})
                        }}
                    >
                        {saving ? 'Cr\u00E9ation...' : '\uD83D\uDCBE Cr\u00E9er le bilan'}
                    </button>
                )}
            </div>
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '24px' },
    section: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', marginBottom: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#333' },
    error: { padding: '12px', backgroundColor: '#ffebee', borderRadius: '6px', marginBottom: '20px', color: '#d32f2f' },
    helpText: { fontSize: '14px', color: '#666', marginBottom: '20px', fontStyle: 'italic' },
    typeOptions: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    typeCard: { flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
    typeRadio: { flexShrink: 0 },
    radioOuter: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: '10px', height: '10px', borderRadius: '50%' },
    typeLabel: { fontSize: '15px', color: '#333' },
    typeDescription: { fontSize: '12px', color: '#666', margin: '4px 0 0 0' },
    formRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    selectInput: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', marginBottom: '40px' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    saveButtonDisabled: { opacity: 0.5, cursor: 'not-allowed' }
}
