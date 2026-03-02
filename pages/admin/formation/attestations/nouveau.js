import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ApprenantSelector from '@/components/formation/ApprenantSelector'

export default function NouvelleAttestation() {
    const router = useRouter()

    // Donnees du formulaire
    const [selectedApprenantId, setSelectedApprenantId] = useState(null)
    const [selectedApprenantName, setSelectedApprenantName] = useState('')
    const [dateDelivrance, setDateDelivrance] = useState('')
    const [lieuDelivrance, setLieuDelivrance] = useState('')
    const [signataireNom, setSignataireNom] = useState('')
    const [signataireFonction, setSignataireFonction] = useState('')
    const [nextNumero, setNextNumero] = useState('')

    // Donnees referentiel
    const [apprenants, setApprenants] = useState([])

    // Etats UI
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadData()
        setDateDelivrance(new Date().toISOString().split('T')[0])
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [appRes, numRes] = await Promise.all([
                fetch('/api/admin/formation/apprenants', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/attestations/numero', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (appRes.ok) {
                const appData = await appRes.json()
                setApprenants(appData.apprenants || [])
            }
            if (numRes.ok) {
                const numData = await numRes.json()
                setNextNumero(numData.numero || '')
            }
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleApprenantSelect(id) {
        setSelectedApprenantId(id)
        const app = apprenants.find(a => a.id === id)
        if (app) {
            setSelectedApprenantName(`${app.prenom} ${app.nom}`)
        }
    }

    async function handleSave() {
        if (!selectedApprenantId) {
            alert('Veuillez selectionner un apprenant')
            return
        }
        if (!dateDelivrance) {
            alert('Veuillez saisir la date de delivrance')
            return
        }
        if (!nextNumero) {
            alert('Erreur: numero ACA non genere')
            return
        }

        try {
            setSaving(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')

            const body = {
                apprenant_id: selectedApprenantId,
                numero: nextNumero,
                date_delivrance: dateDelivrance,
                lieu_delivrance: lieuDelivrance || null,
                signataire_nom: signataireNom || null,
                signataire_fonction: signataireFonction || null,
                statut: 'brouillon'
            }

            const response = await fetch('/api/admin/formation/attestations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Erreur creation attestation')
            }

            const data = await response.json()
            alert('Attestation creee')
            router.push(`/admin/formation/attestations/${data.attestation.id}`)
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
            <h1 style={styles.title}>{'\u2795'} Nouvelle Attestation (ACA)</h1>

            {error && <div style={styles.error}>{'\u274C'} {error}</div>}

            {/* Numero auto-genere */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Numero d'attestation</h3>
                <div style={styles.numeroDisplay}>
                    <span style={styles.numeroBig}>{nextNumero || 'Chargement...'}</span>
                    <span style={styles.numeroHelp}>Numero genere automatiquement</span>
                </div>
            </div>

            {/* Selection de l'apprenant */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>1. Selectionner l'apprenant</h3>
                <ApprenantSelector
                    onSelect={handleApprenantSelect}
                    selectedId={selectedApprenantId}
                    disabled={saving}
                />
            </div>

            {/* Informations de l'attestation */}
            {selectedApprenantId && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>2. Informations de l'attestation</h3>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Date de delivrance *</label>
                            <input
                                type="date"
                                value={dateDelivrance}
                                onChange={(e) => setDateDelivrance(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Lieu de delivrance</label>
                            <input
                                type="text"
                                value={lieuDelivrance}
                                onChange={(e) => setLieuDelivrance(e.target.value)}
                                placeholder="Ex: Montauban"
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nom du signataire</label>
                            <input
                                type="text"
                                value={signataireNom}
                                onChange={(e) => setSignataireNom(e.target.value)}
                                placeholder="Nom et prenom du signataire"
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Fonction du signataire</label>
                            <input
                                type="text"
                                value={signataireFonction}
                                onChange={(e) => setSignataireFonction(e.target.value)}
                                placeholder="Ex: Directrice"
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <p style={styles.helpText}>
                        Les competences pourront etre ajoutees apres la creation de l'attestation, ou generees automatiquement depuis un bilan valide.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <button onClick={() => router.push('/admin/formation/attestations')} style={styles.cancelButton}>
                    {'\u2190'} Annuler
                </button>
                {selectedApprenantId && (
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedApprenantId || !dateDelivrance}
                        style={{
                            ...styles.saveButton,
                            ...(saving || !selectedApprenantId || !dateDelivrance ? styles.saveButtonDisabled : {})
                        }}
                    >
                        {saving ? 'Creation...' : '\uD83D\uDCBE Creer l\'attestation'}
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
    helpText: { fontSize: '14px', color: '#666', marginTop: '16px', fontStyle: 'italic' },
    numeroDisplay: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' },
    numeroBig: { fontSize: '24px', fontWeight: '700', color: '#2196f3' },
    numeroHelp: { fontSize: '13px', color: '#666' },
    formRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', marginBottom: '40px' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    saveButtonDisabled: { opacity: 0.5, cursor: 'not-allowed' }
}
