import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import PlanSummary from '@/components/formation/PlanSummary'
import CompetenceSelector from '@/components/formation/CompetenceSelector'
import PlanPDFExport from '@/components/formation/PlanPDFExport'

export default function DetailPlan() {
    const router = useRouter()
    const { id } = router.query
    const [plan, setPlan] = useState(null)
    const [allDomaines, setAllDomaines] = useState([])
    const [allCategories, setAllCategories] = useState([])
    const [allCompetences, setAllCompetences] = useState([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedNewCompetences, setSelectedNewCompetences] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (id) loadData()
    }, [id])

    async function loadData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [planRes, domRes, catRes, compRes] = await Promise.all([
                fetch(`/api/admin/formation/plans/${id}`, {
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

            if (!planRes.ok) throw new Error('Plan non trouvé')

            const planData = await planRes.json()
            const domData = await domRes.json()
            const catData = await catRes.json()
            const compData = await compRes.json()

            // Normaliser les données du plan pour compatibilité frontend
            const normalizedPlan = {
                ...planData.plan,
                // Mapper objectif_principal → objectifs_generaux pour le frontend
                objectifs_generaux: planData.plan.objectif_principal || planData.plan.objectifs_generaux,
                // Normaliser les compétences (priorité numérique → texte, statut)
                competences: (planData.plan.competences || []).map(comp => ({
                    ...comp,
                    // Conversion priorité: 1→'haute', 2→'moyenne', 3→'faible'
                    priorite_display: comp.priorite === 1 ? 'haute' : comp.priorite === 3 ? 'faible' : 'moyenne',
                    // Conversion statut: 'a_travailler'→'a_faire', 'acquis'→'valide'
                    statut_display: comp.statut === 'a_travailler' ? 'a_faire' : comp.statut === 'acquis' ? 'valide' : comp.statut
                }))
            }
            setPlan(normalizedPlan)
            setAllDomaines(domData.domaines || [])
            setAllCategories(catData.categories || [])
            setAllCompetences(compData.competences || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            await fetch(`/api/admin/formation/plans/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date_debut: plan.date_debut,
                    date_fin_prevue: plan.date_fin_prevue,
                    objectifs_generaux: plan.objectifs_generaux,
                    statut: plan.statut
                })
            })

            alert('✅ Plan sauvegardé')
            loadData()
        } catch (err) {
            alert('❌ Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleAddCompetences() {
        if (selectedNewCompetences.length === 0) return

        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            const maxOrdre = Math.max(0, ...(plan.competences || []).map(c => c.ordre))
            const competencesData = selectedNewCompetences.map((compId, index) => ({
                competence_id: compId,
                priorite: 'moyenne',
                ordre: maxOrdre + index + 1,
                statut: 'a_faire'
            }))

            await fetch(`/api/admin/formation/plans/${id}/competences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ competences: competencesData })
            })

            setShowAddModal(false)
            setSelectedNewCompetences([])
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleRemoveCompetence(competenceId) {
        if (!confirm('Retirer cette compétence du plan ?')) return

        try {
            const token = localStorage.getItem('quiz-admin-token')
            await fetch(`/api/admin/formation/plans/${id}/competences?competence_id=${competenceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    async function handleUpdateCompetence(planCompId, updates) {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const comp = plan.competences.find(c => c.id === planCompId)

            await fetch(`/api/admin/formation/plans/${id}/competences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    competences: [{
                        competence_id: comp.competence_id,
                        ...updates
                    }]
                })
            })
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>
    if (error || !plan) return <div style={styles.container}><p>❌ {error || 'Plan non trouvé'}</p></div>

    const competencesInPlan = (plan.competences || []).map(c => c.competence_id)
    const availableCompetences = allCompetences.filter(c => !competencesInPlan.includes(c.id))

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📝 Plan : {plan.apprenant?.prenom} {plan.apprenant?.nom}</h1>

            <PlanSummary plan={plan} competences={plan.competences || []} />

            {/* Informations générales */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Informations générales</h3>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Date début</label>
                    <input
                        type="date"
                        value={plan.date_debut}
                        onChange={(e) => setPlan({ ...plan, date_debut: e.target.value })}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Date fin prévue</label>
                    <input
                        type="date"
                        value={plan.date_fin_prevue || ''}
                        onChange={(e) => setPlan({ ...plan, date_fin_prevue: e.target.value })}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Objectifs généraux</label>
                    <textarea
                        value={plan.objectifs_generaux || ''}
                        onChange={(e) => setPlan({ ...plan, objectifs_generaux: e.target.value })}
                        style={styles.textarea}
                        rows={3}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Statut</label>
                    <select
                        value={plan.statut}
                        onChange={(e) => setPlan({ ...plan, statut: e.target.value })}
                        style={styles.select}
                    >
                        <option value="brouillon">Brouillon</option>
                        <option value="actif">Actif</option>
                        <option value="termine">Terminé</option>
                        <option value="archive">Archivé</option>
                    </select>
                </div>
            </div>

            {/* Liste des compétences */}
            <div style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>Compétences du plan ({plan.competences?.length || 0})</h3>
                    <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
                        ➕ Ajouter
                    </button>
                </div>

                {(plan.competences || []).length === 0 ? (
                    <p style={styles.empty}>Aucune compétence</p>
                ) : (
                    <div style={styles.competencesTable}>
                        {(plan.competences || []).map((comp) => {
                            const categorie = allCategories.find(c => c.id === comp.competence?.categorie_id)
                            const domaine = allDomaines.find(d => d.id === categorie?.domaine_id)

                            return (
                                <div key={comp.id} style={styles.competenceRow}>
                                    <div style={styles.competenceInfo}>
                                        <strong>{comp.competence?.intitule}</strong>
                                        <span style={styles.competenceMeta}>
                                            {domaine?.emoji} {domaine?.nom} → {categorie?.nom}
                                        </span>
                                    </div>
                                    <div style={styles.competenceControls}>
                                        <select
                                            value={comp.priorite_display || 'moyenne'}
                                            onChange={(e) => handleUpdateCompetence(comp.id, { priorite: e.target.value })}
                                            style={styles.selectSmall}
                                        >
                                            <option value="haute">Haute</option>
                                            <option value="moyenne">Moyenne</option>
                                            <option value="faible">Faible</option>
                                        </select>
                                        <select
                                            value={comp.statut_display || 'a_faire'}
                                            onChange={(e) => handleUpdateCompetence(comp.id, { statut: e.target.value })}
                                            style={styles.selectSmall}
                                        >
                                            <option value="a_faire">À faire</option>
                                            <option value="en_cours">En cours</option>
                                            <option value="valide">Validé</option>
                                        </select>
                                        <button onClick={() => handleRemoveCompetence(comp.competence_id)} style={styles.removeButton}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={styles.actions}>
                <button onClick={() => router.push('/admin/formation/plans')} style={styles.cancelButton}>
                    ← Retour
                </button>
                <PlanPDFExport
                    plan={plan}
                    competences={plan.competences || []}
                    domaines={allDomaines}
                    categories={allCategories}
                />
                <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                    {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
            </div>

            {/* Modal ajout compétences */}
            {showAddModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Ajouter des compétences</h3>
                        <CompetenceSelector
                            domaines={allDomaines}
                            categories={allCategories}
                            competences={availableCompetences}
                            selectedCompetences={selectedNewCompetences}
                            onSelect={(id) => setSelectedNewCompetences([...selectedNewCompetences, id])}
                            onDeselect={(id) => setSelectedNewCompetences(selectedNewCompetences.filter(x => x !== id))}
                        />
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowAddModal(false)} style={styles.cancelButton}>Annuler</button>
                            <button onClick={handleAddCompetences} style={styles.saveButton}>Ajouter ({selectedNewCompetences.length})</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial' },
    title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' },
    section: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '20px' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', margin: 0 },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    selectSmall: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', backgroundColor: '#fff' },
    addButton: { padding: '8px 16px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    competencesTable: { display: 'flex', flexDirection: 'column', gap: '12px' },
    competenceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px', gap: '16px' },
    competenceInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
    competenceMeta: { fontSize: '12px', color: '#666' },
    competenceControls: { display: 'flex', gap: '8px', alignItems: 'center' },
    removeButton: { padding: '6px 10px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    empty: { textAlign: 'center', color: '#999', padding: '20px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
    modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }
}
