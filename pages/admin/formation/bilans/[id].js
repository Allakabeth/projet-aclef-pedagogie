import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import BilanEvaluationGrid from '@/components/formation/BilanEvaluationGrid'
import BilanPDFExport from '@/components/formation/BilanPDFExport'

export default function DetailBilan() {
    const router = useRouter()
    const { id } = router.query

    const [bilan, setBilan] = useState(null)
    const [bilanCompetences, setBilanCompetences] = useState([])
    const [allDomaines, setAllDomaines] = useState([])
    const [allCategories, setAllCategories] = useState([])
    const [allCompetences, setAllCompetences] = useState([])

    // Evaluations editables par domaine : { domaine_id: { competence_id: { statut_fin, commentaire } } }
    const [evaluations, setEvaluations] = useState({})
    // Commentaires par domaine : { domaine_id: string }
    const [domaineComments, setDomaineComments] = useState({})

    // Champs editables
    const [synthese, setSynthese] = useState('')
    const [recommandations, setRecommandations] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (id) loadData()
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

            const [bilanRes, compBilanRes, domRes, catRes, compRes] = await Promise.all([
                fetch(`/api/admin/formation/bilans/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/admin/formation/bilans/${id}/competences`, {
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

            if (!bilanRes.ok) throw new Error('Bilan non trouv\u00E9')

            const bilanData = await bilanRes.json()
            const compBilanData = await compBilanRes.json()
            const domData = await domRes.json()
            const catData = await catRes.json()
            const compData = await compRes.json()

            const loadedBilan = bilanData.bilan
            const loadedCompetences = compBilanData.competences || []
            const loadedDomaines = domData.domaines || []
            const loadedCategories = catData.categories || []
            const loadedAllCompetences = compData.competences || []

            setBilan(loadedBilan)
            setBilanCompetences(loadedCompetences)
            setAllDomaines(loadedDomaines)
            setAllCategories(loadedCategories)
            setAllCompetences(loadedAllCompetences)
            setSynthese(loadedBilan.synthese || '')
            setRecommandations(loadedBilan.recommandations || '')
            setDomaineComments(loadedBilan.domaine_comments || {})

            // Organiser les evaluations par domaine
            const evalsByDomaine = {}
            loadedCompetences.forEach(bc => {
                const comp = loadedAllCompetences.find(c => c.id === bc.competence_id)
                if (!comp) return
                const cat = loadedCategories.find(c => c.id === comp.categorie_id)
                if (!cat) return
                const domaineId = cat.domaine_id

                if (!evalsByDomaine[domaineId]) {
                    evalsByDomaine[domaineId] = {}
                }
                evalsByDomaine[domaineId][bc.competence_id] = {
                    statut_fin: bc.statut_fin,
                    commentaire: bc.commentaire || ''
                }
            })
            setEvaluations(evalsByDomaine)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
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
        try {
            setSaving(true)
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

            const response = await fetch(`/api/admin/formation/bilans/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    synthese,
                    recommandations,
                    domaine_comments: domaineComments,
                    competences: competencesArray
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur sauvegarde')
            }

            alert('\u2705 Bilan sauvegard\u00E9')
            loadData()
        } catch (err) {
            alert('\u274C Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleValider() {
        if (!confirm('\u00CAtes-vous s\u00FBr de vouloir valider ce bilan ? Il ne sera plus modifiable.')) return

        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            // Sauvegarder d'abord les dernieres modifications
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

            const response = await fetch(`/api/admin/formation/bilans/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    synthese,
                    recommandations,
                    domaine_comments: domaineComments,
                    statut: 'valide',
                    competences: competencesArray
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur validation')
            }

            alert('\u2705 Bilan valid\u00E9')
            loadData()
        } catch (err) {
            alert('\u274C Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handlePasserACA() {
        if (!confirm('G\u00E9n\u00E9rer l\'Attestation de Comp\u00E9tences Acquises (ACA) \u00E0 partir de ce bilan ?')) return

        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/bilans/${id}/passer-aca`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur g\u00E9n\u00E9ration ACA')
            }

            const data = await response.json()
            alert('\u2705 Attestation cr\u00E9\u00E9e')

            if (data.attestation?.id) {
                router.push(`/admin/formation/attestations/${data.attestation.id}`)
            }
        } catch (err) {
            alert('\u274C Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    function handlePrint() {
        window.print()
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>
    if (error || !bilan) return <div style={styles.container}><p>{'\u274C'} {error || 'Bilan non trouv\u00E9'}</p></div>

    const isReadonly = bilan.statut === 'valide'

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'valide': { label: 'Valid\u00E9', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    function getTypeBadge(type) {
        const badges = {
            'direct': { label: 'Direct', color: '#2196f3' },
            'intermediaire': { label: 'Interm\u00E9diaire', color: '#ff9800' },
            'final': { label: 'Final', color: '#4caf50' }
        }
        const badge = badges[type] || { label: type, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        {'\uD83D\uDCC8'} Bilan : {bilan.apprenant?.prenom} {bilan.apprenant?.nom}
                    </h1>
                    <p style={styles.subtitle}>
                        {new Date(bilan.date_bilan).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div style={styles.headerBadges}>
                    {getTypeBadge(bilan.type)}
                    {getStatutBadge(bilan.statut)}
                </div>
            </div>

            {/* Informations du bilan */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Informations du bilan</h3>
                <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                        <strong>Date :</strong>
                        <span>{new Date(bilan.date_bilan).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Type :</strong>
                        <span>{getTypeBadge(bilan.type)}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Formateur :</strong>
                        <span>{bilan.formateur?.prenom} {bilan.formateur?.nom}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Statut :</strong>
                        <span>{getStatutBadge(bilan.statut)}</span>
                    </div>
                    {bilan.periode_debut && (
                        <div style={styles.infoItem}>
                            <strong>P\u00E9riode :</strong>
                            <span>
                                {new Date(bilan.periode_debut).toLocaleDateString('fr-FR')}
                                {bilan.periode_fin && ` au ${new Date(bilan.periode_fin).toLocaleDateString('fr-FR')}`}
                            </span>
                        </div>
                    )}
                    {bilan.duree_realisee && (
                        <div style={styles.infoItem}>
                            <strong>Dur\u00E9e r\u00E9alis\u00E9e :</strong>
                            <span>{bilan.duree_realisee} heures</span>
                        </div>
                    )}
                    {bilan.plan_id && (
                        <div style={styles.infoItem}>
                            <strong>Plan li\u00E9 :</strong>
                            <button
                                onClick={() => router.push(`/admin/formation/plans/${bilan.plan_id}`)}
                                style={styles.linkButton}
                            >
                                Voir le plan
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Synthese et recommandations */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Synth\u00E8se et recommandations</h3>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Synth\u00E8se g\u00E9n\u00E9rale</label>
                    <textarea
                        value={synthese}
                        onChange={(e) => setSynthese(e.target.value)}
                        disabled={isReadonly}
                        placeholder="Synth\u00E8se du bilan de formation..."
                        rows={4}
                        style={{
                            ...styles.textarea,
                            ...(isReadonly ? styles.textareaDisabled : {})
                        }}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Recommandations</label>
                    <textarea
                        value={recommandations}
                        onChange={(e) => setRecommandations(e.target.value)}
                        disabled={isReadonly}
                        placeholder="Recommandations pour la suite..."
                        rows={4}
                        style={{
                            ...styles.textarea,
                            ...(isReadonly ? styles.textareaDisabled : {})
                        }}
                    />
                </div>
            </div>

            {/* Evaluation des competences */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                    \u00C9valuation des comp\u00E9tences
                    {isReadonly && <span style={styles.readonlyLabel}> (lecture seule)</span>}
                </h3>

                {allDomaines.filter(d => d.actif !== false).sort((a, b) => a.ordre - b.ordre).map(domaine => {
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
                            categories={allCategories}
                            competences={allCompetences}
                            evaluations={evalsArray}
                            onChange={(evalMap) => handleEvaluationChange(domaine.id, evalMap)}
                            domaineComment={domaineComments[domaine.id] || ''}
                            onDomaineCommentChange={(comment) => handleDomaineCommentChange(domaine.id, comment)}
                            readonly={isReadonly}
                        />
                    )
                })}
            </div>

            {/* Barre d'actions */}
            <div style={styles.actionsBar}>
                <button onClick={() => router.push('/admin/formation/bilans')} style={styles.cancelButton}>
                    {'\u2190'} Retour
                </button>

                <div style={styles.actionsRight}>
                    <BilanPDFExport
                        bilan={bilan}
                        bilanCompetences={bilanCompetences}
                        domaines={allDomaines}
                        categories={allCategories}
                        allCompetences={allCompetences}
                    />

                    <button onClick={handlePrint} style={styles.printButton}>
                        {'\uD83D\uDDA8\uFE0F'} Imprimer
                    </button>

                    {!isReadonly && (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={styles.saveButton}
                            >
                                {saving ? 'Sauvegarde...' : '\uD83D\uDCBE Enregistrer'}
                            </button>

                            <button
                                onClick={handleValider}
                                disabled={saving}
                                style={styles.validateButton}
                            >
                                {'\u2705'} Valider
                            </button>
                        </>
                    )}

                    {isReadonly && (
                        <button
                            onClick={handlePasserACA}
                            disabled={saving}
                            style={styles.acaButton}
                        >
                            {'\uD83D\uDCDC'} Passer \u00E0 l'ACA
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    headerBadges: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    badge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    section: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '20px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#333' },
    readonlyLabel: { fontSize: '13px', fontWeight: '400', color: '#9e9e9e', fontStyle: 'italic' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' },
    infoItem: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', padding: '8px 12px', backgroundColor: '#f9f9f9', borderRadius: '6px' },
    linkButton: { padding: '4px 12px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    textareaDisabled: { backgroundColor: '#f5f5f5', cursor: 'not-allowed' },
    actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '40px', flexWrap: 'wrap', gap: '12px' },
    actionsRight: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    validateButton: { padding: '12px 24px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    acaButton: { padding: '12px 24px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    printButton: { padding: '12px 24px', backgroundColor: '#757575', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }
}
