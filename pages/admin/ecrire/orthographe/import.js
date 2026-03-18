import { useState } from 'react'
import { useRouter } from 'next/router'

const TYPES_LABELS = {
    fill_blank: '📝 Texte à trous',
    binary_choice: '🔘 Choix en contexte',
    ordering: '🔢 Remettre en ordre',
    matching: '🔗 Appariement',
    classification: '📂 Classification',
    transformation: '🔄 Transformation'
}

const NIVEAUX_COLORS = { A: '#10b981', B: '#f59e0b', C: '#ef4444' }

export default function ImportOrthographe() {
    const router = useRouter()
    const [jsonText, setJsonText] = useState('')
    const [exercices, setExercices] = useState(null)
    const [parseError, setParseError] = useState('')
    const [validationResult, setValidationResult] = useState(null)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [step, setStep] = useState(1) // 1=saisie, 2=preview, 3=résultat

    function handleFileUpload(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            setJsonText(ev.target.result)
            setParseError('')
        }
        reader.readAsText(file)
    }

    function handleParse() {
        try {
            let data = JSON.parse(jsonText)

            // Accepter { exercices: [...] } ou directement [...]
            if (data.exercices && Array.isArray(data.exercices)) {
                data = data.exercices
            }

            if (!Array.isArray(data) || data.length === 0) {
                setParseError('Le JSON doit contenir un tableau non vide d\'exercices')
                return
            }

            setExercices(data)
            setParseError('')
            setStep(2)
        } catch (err) {
            setParseError('JSON invalide : ' + err.message)
        }
    }

    async function handleValidate() {
        try {
            setImporting(true)
            const token = localStorage.getItem('quiz-admin-token')

            const res = await fetch('/api/admin/ecrire/orthographe/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exercices, dry_run: true })
            })

            const data = await res.json()

            if (!res.ok) {
                setValidationResult({ ok: false, error: data.error, details: data.details || [], codes_manquants: data.codes_manquants })
            } else {
                setValidationResult({ ok: true, ...data })
            }
        } catch (err) {
            setValidationResult({ ok: false, error: err.message })
        } finally {
            setImporting(false)
        }
    }

    async function handleImport() {
        if (!confirm(`Confirmer l'import de ${exercices.length} exercice(s) ?`)) return

        try {
            setImporting(true)
            const token = localStorage.getItem('quiz-admin-token')

            const res = await fetch('/api/admin/ecrire/orthographe/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exercices })
            })

            const data = await res.json()

            if (!res.ok) {
                alert('Erreur: ' + (data.error || 'Erreur inconnue'))
                return
            }

            setImportResult(data)
            setStep(3)
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setImporting(false)
        }
    }

    // Stats rapides sur les exercices parsés
    function getStats() {
        if (!exercices) return null
        const themes = [...new Set(exercices.map(e => e.theme_grammatical))]
        const types = [...new Set(exercices.map(e => e.type))]
        const niveaux = [...new Set(exercices.map(e => e.niveau || 'A'))]
        return { themes, types, niveaux }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Import JSON - Orthographe</h1>
                    <p style={styles.subtitle}>Importer un lot d'exercices en masse</p>
                </div>
                <button onClick={() => router.push('/admin/ecrire/orthographe')} style={styles.backButton}>
                    ← Retour
                </button>
            </div>

            {/* ÉTAPE 1 : SAISIE JSON */}
            {step === 1 && (
                <div style={styles.card}>
                    <div style={styles.uploadZone}>
                        <label style={styles.uploadLabel}>
                            Charger un fichier JSON
                            <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        <span style={styles.uploadHint}>ou collez le JSON ci-dessous</span>
                    </div>

                    <textarea
                        value={jsonText}
                        onChange={(e) => { setJsonText(e.target.value); setParseError('') }}
                        placeholder={`[\n  {\n    "theme_grammatical": "possessifs",\n    "type": "fill_blank",\n    "titre": "Mon exercice",\n    "niveau": "A",\n    "consigne": "Complète avec...",\n    "competence_code": "ECR-OG-03",\n    "contenu": { ... }\n  }\n]`}
                        style={styles.textarea}
                        rows={18}
                    />

                    {parseError && <p style={styles.error}>{parseError}</p>}

                    <div style={styles.formatHelp}>
                        <strong>Format attendu :</strong> tableau JSON d'objets avec les champs :
                        <code style={styles.code}>theme_grammatical</code>, <code style={styles.code}>type</code>, <code style={styles.code}>titre</code>, <code style={styles.code}>contenu</code> (obligatoires)
                        + <code style={styles.code}>niveau</code>, <code style={styles.code}>consigne</code>, <code style={styles.code}>competence_code</code>, <code style={styles.code}>numero_boite</code>, <code style={styles.code}>difficulte</code> (optionnels)
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '16px' }}>
                        <button onClick={handleParse} disabled={!jsonText.trim()} style={{
                            ...styles.primaryBtn,
                            opacity: jsonText.trim() ? 1 : 0.5
                        }}>
                            Analyser le JSON →
                        </button>
                    </div>
                </div>
            )}

            {/* ÉTAPE 2 : PREVIEW + VALIDATION */}
            {step === 2 && exercices && (
                <div style={styles.card}>
                    {(() => {
                        const stats = getStats()
                        return (
                            <div style={styles.statsBar}>
                                <div style={styles.stat}>
                                    <span style={styles.statNum}>{exercices.length}</span>
                                    <span style={styles.statLabel}>exercice(s)</span>
                                </div>
                                <div style={styles.stat}>
                                    <span style={styles.statNum}>{stats.themes.length}</span>
                                    <span style={styles.statLabel}>thème(s)</span>
                                </div>
                                <div style={styles.stat}>
                                    <span style={styles.statNum}>{stats.types.length}</span>
                                    <span style={styles.statLabel}>type(s)</span>
                                </div>
                                <div style={styles.stat}>
                                    {stats.niveaux.map(n => (
                                        <span key={n} style={{
                                            ...styles.niveauBadge,
                                            backgroundColor: NIVEAUX_COLORS[n] || '#6b7280'
                                        }}>{n}</span>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}

                    <h3 style={styles.sectionTitle}>Aperçu des exercices</h3>
                    <div style={styles.previewList}>
                        {exercices.map((ex, i) => (
                            <div key={i} style={styles.previewItem}>
                                <span style={styles.previewIndex}>{i + 1}</span>
                                <span style={{
                                    ...styles.niveauBadge,
                                    backgroundColor: NIVEAUX_COLORS[ex.niveau] || NIVEAUX_COLORS.A
                                }}>{ex.niveau || 'A'}</span>
                                <span style={styles.previewType}>{TYPES_LABELS[ex.type] || ex.type}</span>
                                <span style={styles.previewTitle}>{ex.titre}</span>
                                <span style={styles.previewTheme}>{ex.theme_grammatical}</span>
                                {ex.competence_code && (
                                    <span style={styles.previewComp}>{ex.competence_code}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Résultat validation dry_run */}
                    {validationResult && (
                        <div style={{
                            ...styles.validationBox,
                            backgroundColor: validationResult.ok ? '#f0fdf4' : '#fef2f2',
                            borderColor: validationResult.ok ? '#86efac' : '#fca5a5'
                        }}>
                            {validationResult.ok ? (
                                <div>
                                    <strong style={{ color: '#16a34a' }}>Validation réussie</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
                                        {validationResult.total} exercice(s) prêt(s) à importer
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <strong style={{ color: '#dc2626' }}>Erreurs de validation</strong>
                                    {validationResult.details && validationResult.details.length > 0 && (
                                        <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                                            {validationResult.details.map((d, i) => (
                                                <li key={i} style={{ color: '#dc2626' }}>{d}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {validationResult.codes_manquants && (
                                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#dc2626' }}>
                                            Codes compétence introuvables : {validationResult.codes_manquants.join(', ')}
                                        </p>
                                    )}
                                    {validationResult.error && !validationResult.details && (
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#dc2626' }}>{validationResult.error}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button onClick={() => { setStep(1); setValidationResult(null) }} style={styles.backButton}>
                            ← Modifier le JSON
                        </button>
                        <button onClick={handleValidate} disabled={importing} style={styles.validateBtn}>
                            {importing ? 'Validation...' : 'Valider (dry run)'}
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || !validationResult?.ok}
                            style={{
                                ...styles.importBtn,
                                opacity: (validationResult?.ok && !importing) ? 1 : 0.4
                            }}
                        >
                            {importing ? 'Import en cours...' : `Importer ${exercices.length} exercice(s)`}
                        </button>
                    </div>
                </div>
            )}

            {/* ÉTAPE 3 : RÉSULTAT */}
            {step === 3 && importResult && (
                <div style={styles.card}>
                    <div style={styles.successBox}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                        <h2 style={{ color: '#16a34a', margin: '0 0 8px 0' }}>{importResult.message}</h2>
                        <p style={{ color: '#64748b', margin: 0 }}>{importResult.total} exercice(s) importé(s) avec succès</p>
                    </div>

                    {importResult.exercices && (
                        <div style={styles.previewList}>
                            {importResult.exercices.map((ex, i) => (
                                <div key={i} style={styles.previewItem}>
                                    <span style={styles.previewIndex}>{i + 1}</span>
                                    <span style={{
                                        ...styles.niveauBadge,
                                        backgroundColor: NIVEAUX_COLORS[ex.niveau] || NIVEAUX_COLORS.A
                                    }}>{ex.niveau}</span>
                                    <span style={styles.previewType}>{TYPES_LABELS[ex.type] || ex.type}</span>
                                    <span style={styles.previewTitle}>{ex.titre}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                        <button onClick={() => router.push('/admin/ecrire/orthographe')} style={styles.primaryBtn}>
                            Voir les exercices
                        </button>
                        <button onClick={() => { setStep(1); setJsonText(''); setExercices(null); setValidationResult(null); setImportResult(null) }} style={styles.backButton}>
                            Nouvel import
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    uploadZone: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' },
    uploadLabel: { display: 'inline-block', padding: '10px 20px', backgroundColor: '#f5f3ff', color: '#8b5cf6', border: '1px solid #c4b5fd', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    uploadHint: { fontSize: '14px', color: '#94a3b8' },
    textarea: { width: '100%', padding: '16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' },
    error: { color: '#dc2626', fontSize: '14px', marginTop: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px' },
    formatHelp: { fontSize: '13px', color: '#64748b', marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', lineHeight: '1.6' },
    code: { backgroundColor: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' },
    primaryBtn: { padding: '12px 24px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    validateBtn: { padding: '10px 20px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    importBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    statsBar: { display: 'flex', gap: '24px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
    statNum: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' },
    statLabel: { fontSize: '12px', color: '#64748b' },
    niveauBadge: { color: '#fff', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0' },
    previewList: { maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' },
    previewItem: { display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' },
    previewIndex: { fontWeight: 'bold', color: '#94a3b8', minWidth: '28px' },
    previewType: { fontSize: '12px', color: '#7c3aed', backgroundColor: '#ede9fe', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' },
    previewTitle: { fontWeight: '500', color: '#1e293b', flex: 1 },
    previewTheme: { fontSize: '12px', color: '#64748b' },
    previewComp: { fontSize: '11px', color: '#8b5cf6', backgroundColor: '#f5f3ff', padding: '2px 6px', borderRadius: '4px' },
    validationBox: { padding: '16px', borderRadius: '8px', border: '1px solid', marginTop: '16px' },
    successBox: { textAlign: 'center', padding: '30px', marginBottom: '20px' }
}
