import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import PlanGenerator from '@/components/formation/PlanGenerator'
import ApprenantSelector from '@/components/formation/ApprenantSelector'
import CompetenceSelector from '@/components/formation/CompetenceSelector'

export default function NouveauPlan() {
    const router = useRouter()
    const [mode, setMode] = useState('auto') // 'auto' ou 'manuel'
    const [positionnements, setPositionnements] = useState([])
    const [selectedPositionnement, setSelectedPositionnement] = useState(null)
    const [selectedApprenantId, setSelectedApprenantId] = useState(null)
    const [selectedCompetences, setSelectedCompetences] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [competences, setCompetences] = useState([])
    const [dateDebut, setDateDebut] = useState('')
    const [dateFinPrevue, setDateFinPrevue] = useState('')
    const [objectifsGeneraux, setObjectifsGeneraux] = useState('')
    const [formateurId, setFormateurId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadData()
        const user = localStorage.getItem('quiz-admin-user')
        if (user) {
            try {
                setFormateurId(JSON.parse(user).id)
            } catch (e) {}
        }
        setDateDebut(new Date().toISOString().split('T')[0])
    }, [])

    async function loadData() {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [positRes, domRes, catRes, compRes] = await Promise.all([
                fetch('/api/admin/formation/positionnements?statut=valide', {
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

            const positData = await positRes.json()
            const domData = await domRes.json()
            const catData = await catRes.json()
            const compData = await compRes.json()

            setPositionnements(positData.positionnements || [])
            setDomaines(domData.domaines || [])
            setCategories(catData.categories || [])
            setCompetences(compData.competences || [])
        } catch (err) {
            console.error('Erreur:', err)
        }
    }

    async function handleGenerateAuto(positionnementId) {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch('/api/admin/formation/plans/generer-depuis-positionnement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ positionnement_id: positionnementId })
            })

            if (!response.ok) throw new Error('Erreur génération')
            const data = await response.json()
            router.push(`/admin/formation/plans/${data.plan.id}`)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateManuel() {
        if (!selectedApprenantId || !formateurId) {
            alert('Apprenant requis')
            return
        }

        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')

            // Créer le plan
            const planRes = await fetch('/api/admin/formation/plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    apprenant_id: selectedApprenantId,
                    formateur_id: formateurId,
                    date_debut: dateDebut,
                    date_fin_prevue: dateFinPrevue || null,
                    objectifs_generaux: objectifsGeneraux
                })
            })

            if (!planRes.ok) throw new Error('Erreur création plan')
            const planData = await planRes.json()

            // Ajouter les compétences si sélectionnées
            if (selectedCompetences.length > 0) {
                const competencesData = selectedCompetences.map((compId, index) => ({
                    competence_id: compId,
                    priorite: 'moyenne',
                    ordre: index + 1,
                    statut: 'a_faire'
                }))

                await fetch(`/api/admin/formation/plans/${planData.plan.id}/competences`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ competences: competencesData })
                })
            }

            router.push(`/admin/formation/plans/${planData.plan.id}`)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>➕ Nouveau Plan de Formation</h1>

            {/* Toggle mode */}
            <div style={styles.modeToggle}>
                <button
                    onClick={() => setMode('auto')}
                    style={{ ...styles.modeButton, ...(mode === 'auto' ? styles.modeButtonActive : {}) }}
                >
                    ✨ Générer depuis positionnement
                </button>
                <button
                    onClick={() => setMode('manuel')}
                    style={{ ...styles.modeButton, ...(mode === 'manuel' ? styles.modeButtonActive : {}) }}
                >
                    ✏️ Création manuelle
                </button>
            </div>

            {error && <div style={styles.error}>❌ {error}</div>}

            {/* Mode automatique */}
            {mode === 'auto' && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Sélectionner un positionnement validé</h3>
                    {positionnements.length === 0 ? (
                        <p style={styles.empty}>Aucun positionnement validé disponible</p>
                    ) : (
                        <>
                            <select
                                value={selectedPositionnement?.id || ''}
                                onChange={(e) => {
                                    const p = positionnements.find(x => x.id === e.target.value)
                                    setSelectedPositionnement(p)
                                }}
                                style={styles.select}
                            >
                                <option value="">-- Choisir un positionnement --</option>
                                {positionnements.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.apprenant?.prenom} {p.apprenant?.nom} - {new Date(p.date_positionnement).toLocaleDateString('fr-FR')}
                                    </option>
                                ))}
                            </select>

                            {selectedPositionnement && (
                                <PlanGenerator
                                    positionnement={selectedPositionnement}
                                    onGenerate={handleGenerateAuto}
                                    loading={loading}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Mode manuel */}
            {mode === 'manuel' && (
                <div style={styles.section}>
                    <ApprenantSelector
                        onSelect={setSelectedApprenantId}
                        selectedId={selectedApprenantId}
                        disabled={loading}
                    />

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Date de début</label>
                        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={styles.input} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Date de fin prévue (optionnel)</label>
                        <input type="date" value={dateFinPrevue} onChange={(e) => setDateFinPrevue(e.target.value)} style={styles.input} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Objectifs généraux (optionnel)</label>
                        <textarea
                            value={objectifsGeneraux}
                            onChange={(e) => setObjectifsGeneraux(e.target.value)}
                            style={styles.textarea}
                            rows={3}
                        />
                    </div>

                    <CompetenceSelector
                        domaines={domaines}
                        categories={categories}
                        competences={competences}
                        selectedCompetences={selectedCompetences}
                        onSelect={(id) => setSelectedCompetences([...selectedCompetences, id])}
                        onDeselect={(id) => setSelectedCompetences(selectedCompetences.filter(x => x !== id))}
                    />

                    <div style={styles.actions}>
                        <button onClick={() => router.push('/admin/formation/plans')} style={styles.cancelButton}>
                            Annuler
                        </button>
                        <button onClick={handleCreateManuel} disabled={loading || !selectedApprenantId} style={styles.createButton}>
                            {loading ? 'Création...' : 'Créer le plan'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '24px' },
    modeToggle: { display: 'flex', gap: '12px', marginBottom: '24px' },
    modeButton: { flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' },
    modeButtonActive: { backgroundColor: '#e3f2fd', borderColor: '#2196f3', color: '#2196f3' },
    section: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
    createButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    error: { padding: '12px', backgroundColor: '#ffebee', borderRadius: '6px', marginBottom: '20px', color: '#d32f2f' },
    empty: { padding: '20px', textAlign: 'center', color: '#999' }
}
