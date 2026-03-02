import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AttestationPDFExport from '@/components/formation/AttestationPDFExport'

export default function DetailAttestation() {
    const router = useRouter()
    const { id } = router.query

    const [attestation, setAttestation] = useState(null)
    const [competences, setCompetences] = useState([])

    // Champs editables
    const [dateDelivrance, setDateDelivrance] = useState('')
    const [lieuDelivrance, setLieuDelivrance] = useState('')
    const [signataireNom, setSignataireNom] = useState('')
    const [signataireFonction, setSignataireFonction] = useState('')

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

            const response = await fetch(`/api/admin/formation/attestations/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Attestation non trouvee')

            const data = await response.json()
            const att = data.attestation

            setAttestation(att)
            setCompetences(att.competences || [])
            setDateDelivrance(att.date_delivrance || '')
            setLieuDelivrance(att.lieu_delivrance || '')
            setSignataireNom(att.signataire_nom || '')
            setSignataireFonction(att.signataire_fonction || '')
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

            const response = await fetch(`/api/admin/formation/attestations/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date_delivrance: dateDelivrance,
                    lieu_delivrance: lieuDelivrance,
                    signataire_nom: signataireNom,
                    signataire_fonction: signataireFonction
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur sauvegarde')
            }

            alert('Attestation enregistree')
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleValider() {
        if (!confirm('Valider cette attestation ? Elle ne sera plus modifiable.')) return

        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/attestations/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date_delivrance: dateDelivrance,
                    lieu_delivrance: lieuDelivrance,
                    signataire_nom: signataireNom,
                    signataire_fonction: signataireFonction,
                    statut: 'valide'
                })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur validation')
            }

            alert('Attestation validee')
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Regrouper les competences par domaine_nom
    function getCompetencesParDomaine() {
        const grouped = {}
        competences.forEach(ac => {
            // domaine_nom est stocke directement dans attestation_competences
            // Sinon, remonter via competence -> categorie -> domaine
            const domaineName = ac.domaine_nom
                || ac.competence?.categorie?.domaine?.nom
                || 'Autre'
            if (!grouped[domaineName]) {
                grouped[domaineName] = []
            }
            grouped[domaineName].push(ac)
        })
        return grouped
    }

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'valide': { label: 'Valide', color: '#4caf50' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }
        return (
            <span style={{ ...styles.badge, backgroundColor: badge.color }}>
                {badge.label}
            </span>
        )
    }

    if (loading) return <div style={styles.container}><p>Chargement...</p></div>
    if (error || !attestation) return <div style={styles.container}><p>{'\u274C'} {error || 'Attestation non trouvee'}</p></div>

    const isReadonly = attestation.statut === 'valide'
    const competencesParDomaine = getCompetencesParDomaine()

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        {'\uD83C\uDF93'} Attestation : <span style={styles.numero}>{attestation.numero}</span>
                    </h1>
                    <p style={styles.subtitle}>
                        {attestation.apprenant?.prenom} {attestation.apprenant?.nom}
                        {' - '}
                        {new Date(attestation.date_delivrance).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div style={styles.headerBadges}>
                    {getStatutBadge(attestation.statut)}
                </div>
            </div>

            {/* Informations */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Informations de l'attestation</h3>
                <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                        <strong>Numero :</strong>
                        <span style={{ color: '#2196f3', fontWeight: '600' }}>{attestation.numero}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Statut :</strong>
                        <span>{getStatutBadge(attestation.statut)}</span>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Date de delivrance</label>
                        <input
                            type="date"
                            value={dateDelivrance}
                            onChange={(e) => setDateDelivrance(e.target.value)}
                            disabled={isReadonly}
                            style={{
                                ...styles.input,
                                ...(isReadonly ? styles.inputDisabled : {})
                            }}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lieu de delivrance</label>
                        <input
                            type="text"
                            value={lieuDelivrance}
                            onChange={(e) => setLieuDelivrance(e.target.value)}
                            disabled={isReadonly}
                            placeholder="Ex: Montauban"
                            style={{
                                ...styles.input,
                                ...(isReadonly ? styles.inputDisabled : {})
                            }}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nom du signataire</label>
                        <input
                            type="text"
                            value={signataireNom}
                            onChange={(e) => setSignataireNom(e.target.value)}
                            disabled={isReadonly}
                            placeholder="Nom et prenom du signataire"
                            style={{
                                ...styles.input,
                                ...(isReadonly ? styles.inputDisabled : {})
                            }}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Fonction du signataire</label>
                        <input
                            type="text"
                            value={signataireFonction}
                            onChange={(e) => setSignataireFonction(e.target.value)}
                            disabled={isReadonly}
                            placeholder="Ex: Directrice"
                            style={{
                                ...styles.input,
                                ...(isReadonly ? styles.inputDisabled : {})
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Competences attestees */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>
                    Competences attestees
                    <span style={styles.countLabel}> ({competences.length} competence{competences.length > 1 ? 's' : ''})</span>
                </h3>

                {competences.length === 0 ? (
                    <p style={styles.emptyCompetences}>Aucune competence attestee pour le moment.</p>
                ) : (
                    Object.entries(competencesParDomaine).map(([domaineName, comps]) => (
                        <div key={domaineName} style={styles.domaineBlock}>
                            <h4 style={styles.domaineTitle}>{domaineName}</h4>
                            <div style={styles.competencesList}>
                                {comps.map(ac => (
                                    <div key={ac.id} style={styles.competenceRow}>
                                        <span style={styles.competenceIntitule}>
                                            {ac.competence?.intitule || `Competence #${ac.competence_id?.substring(0, 8)}`}
                                        </span>
                                        {ac.niveau_atteint && (
                                            <span style={styles.niveauBadge}>
                                                {ac.niveau_atteint}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Barre d'actions */}
            <div style={styles.actionsBar}>
                <button onClick={() => router.push('/admin/formation/attestations')} style={styles.cancelButton}>
                    {'\u2190'} Retour
                </button>

                <div style={styles.actionsRight}>
                    <AttestationPDFExport
                        attestation={attestation}
                        competences={competences}
                    />

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
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    numero: { color: '#2196f3' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    headerBadges: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    badge: { padding: '6px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    section: { backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '20px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#333' },
    countLabel: { fontSize: '14px', fontWeight: '400', color: '#666' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
    infoItem: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', padding: '8px 12px', backgroundColor: '#f9f9f9', borderRadius: '6px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#555' },
    input: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial' },
    inputDisabled: { backgroundColor: '#f5f5f5', cursor: 'not-allowed', color: '#666' },
    domaineBlock: { marginBottom: '20px', border: '1px solid #e8e8e8', borderRadius: '6px', overflow: 'hidden' },
    domaineTitle: { fontSize: '15px', fontWeight: '600', color: '#333', margin: 0, padding: '12px 16px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #e8e8e8' },
    competencesList: { padding: '0' },
    competenceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' },
    competenceIntitule: { flex: 1, color: '#333' },
    niveauBadge: { padding: '4px 10px', borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '12px', fontWeight: '600', marginLeft: '12px', whiteSpace: 'nowrap' },
    emptyCompetences: { textAlign: 'center', padding: '24px', color: '#999', fontStyle: 'italic' },
    actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '40px', flexWrap: 'wrap', gap: '12px' },
    actionsRight: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    validateButton: { padding: '12px 24px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }
}
