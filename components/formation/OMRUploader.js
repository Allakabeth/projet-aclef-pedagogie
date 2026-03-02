import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Composant de verification OMR (Optical Mark Recognition).
 *
 * Permet de :
 * 1. Charger un PDF scanne
 * 2. Lancer le scan OMR avec les coordonnees JSON stockees
 * 3. Afficher les resultats dans une grille de verification interactive
 * 4. Corriger manuellement les detections ambigues ou erronees
 * 5. Sauvegarder les evaluations corrigees
 *
 * Props:
 * - positionnementId : UUID du positionnement en cours
 * - coordsJson : Objet JSON des coordonnees des cases (depuis formation_pdf_coordonnees)
 * - domaines : Tableau des domaines avec categories et competences imbriquees
 * - categories : Tableau de toutes les categories
 * - competences : Tableau de toutes les competences
 * - onSave : Callback(evaluations) quand l'utilisateur valide
 * - onCancel : Callback() quand l'utilisateur annule
 */
export default function OMRUploader({
    positionnementId,
    coordsJson,
    domaines = [],
    categories = [],
    competences = [],
    onSave,
    onCancel
}) {
    const [file, setFile] = useState(null)
    const [scanning, setScanning] = useState(false)
    const [progress, setProgress] = useState(0)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [filter, setFilter] = useState('all') // 'all' | 'ambiguous' | 'empty'
    const [editedEvaluations, setEditedEvaluations] = useState({}) // { competence_id: niveau_index }
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef(null)

    const NIVEAUX = [
        { value: 'non_evalue', label: 'Non évalué', color: '#9e9e9e', index: -1 },
        { value: 'non_acquis', label: 'Non acquis', color: '#f44336', index: 0 },
        { value: 'en_cours', label: 'En cours', color: '#ff9800', index: 1 },
        { value: 'acquis', label: 'Acquis', color: '#4caf50', index: 2 }
    ]

    // Quand les resultats arrivent, initialiser les evaluations editables
    useEffect(() => {
        if (results && results.competenceResults) {
            const initial = {}
            for (const [compId, analysis] of Object.entries(results.competenceResults)) {
                if (analysis.detected_niveau !== null && analysis.detected_niveau !== undefined) {
                    initial[compId] = analysis.detected_niveau
                } else {
                    // Rien coche = non evalue
                    initial[compId] = -1
                }
            }
            setEditedEvaluations(initial)
        }
    }, [results])

    // Gestion du fichier
    function handleFileChange(e) {
        const selected = e.target.files[0]
        if (selected) {
            if (!selected.name.toLowerCase().endsWith('.pdf')) {
                setError('Veuillez selectionner un fichier PDF.')
                return
            }
            setFile(selected)
            setError(null)
            setResults(null)
        }
    }

    // Lancer le scan OMR
    async function handleScan() {
        if (!file) {
            setError('Veuillez selectionner un fichier PDF scanne.')
            return
        }
        if (!coordsJson) {
            setError('Aucun fichier de coordonnees JSON disponible pour ce positionnement.')
            return
        }

        setScanning(true)
        setProgress(0)
        setError(null)
        setResults(null)

        try {
            // Import dynamique pour eviter le chargement au SSR
            const { scanOMR } = await import('@/lib/omr/omrScanner')

            const omrResults = await scanOMR(file, coordsJson, (p) => {
                setProgress(Math.round(p * 100))
            })

            setResults(omrResults)

            if (omrResults.errors && omrResults.errors.length > 0) {
                console.warn('Avertissements OMR:', omrResults.errors)
            }
        } catch (err) {
            console.error('Erreur OMR:', err)
            setError(`Erreur lors du scan : ${err.message}`)
        } finally {
            setScanning(false)
        }
    }

    // Changer le niveau d'une competence
    function handleNiveauChange(competenceId, niveauIndex) {
        setEditedEvaluations(prev => ({
            ...prev,
            [competenceId]: niveauIndex
        }))
    }

    // Effacer la selection d'une competence
    function handleClearCompetence(competenceId) {
        setEditedEvaluations(prev => {
            const updated = { ...prev }
            delete updated[competenceId]
            return updated
        })
    }

    // Sauvegarder les resultats
    async function handleSave() {
        if (!onSave) return

        setSaving(true)
        try {
            // Convertir index -> valeur base de donnees
            const NIVEAU_MAP = { '-1': 'non_evalue', 0: 'non_acquis', 1: 'en_cours', 2: 'acquis' }
            const evaluations = {}

            // Inclure TOUTES les competences scannees (y compris vides = non_evalue)
            if (results && results.competenceResults) {
                for (const compId of Object.keys(results.competenceResults)) {
                    const niveauIndex = editedEvaluations[compId]
                    evaluations[compId] = {
                        niveau_atteint: niveauIndex !== undefined ? (NIVEAU_MAP[niveauIndex] || 'non_evalue') : 'non_evalue',
                        commentaire: ''
                    }
                }
            }
            await onSave(evaluations)
        } catch (err) {
            setError(`Erreur lors de la sauvegarde : ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    // Filtrer les resultats
    const getFilteredResults = useCallback(() => {
        if (!results || !results.competenceResults) return []

        const entries = Object.entries(results.competenceResults)

        switch (filter) {
            case 'ambiguous':
                return entries.filter(([_, a]) => a.status === 'ambiguous' || a.confidence === 'medium')
            case 'empty':
                return entries.filter(([_, a]) => a.status === 'empty')
            default:
                return entries
        }
    }, [results, filter])

    // Organiser les resultats par domaine pour l'affichage
    const getResultsByDomaine = useCallback(() => {
        const filtered = getFilteredResults()
        if (filtered.length === 0) return []

        // Creer un map competence_id -> domaine
        const compToDomaine = {}
        const compToCategorie = {}
        for (const domaine of domaines) {
            const domCats = categories.filter(c => c.domaine_id === domaine.id)
            for (const cat of domCats) {
                const catComps = competences.filter(c => c.categorie_id === cat.id)
                for (const comp of catComps) {
                    compToDomaine[comp.id] = domaine
                    compToCategorie[comp.id] = cat
                }
            }
        }

        // Grouper par domaine
        const grouped = {}
        for (const [compId, analysis] of filtered) {
            const domaine = compToDomaine[compId]
            const domaineName = domaine ? domaine.nom : (analysis.domaine || 'Autre')
            const domaineId = domaine ? domaine.id : 'unknown'

            if (!grouped[domaineId]) {
                grouped[domaineId] = {
                    domaine: domaine || { id: 'unknown', nom: domaineName, emoji: '' },
                    competences: []
                }
            }
            grouped[domaineId].competences.push({
                compId,
                analysis,
                categorie: compToCategorie[compId]
            })
        }

        return Object.values(grouped)
    }, [getFilteredResults, domaines, categories, competences])

    // Statistiques
    const stats = results ? {
        total: results.totalCompetences,
        detected: results.detectedCount,
        ambiguous: results.ambiguousCount,
        empty: results.emptyCount,
        edited: Object.keys(editedEvaluations).length
    } : null

    // --- RENDU ---

    return (
        <div style={styles.container}>
            {/* Titre */}
            <div style={styles.header}>
                <h3 style={styles.title}>Scanner OMR - Lecture automatique</h3>
                <p style={styles.subtitle}>
                    Chargez le PDF scanne du positionnement pour detecter automatiquement les cases cochees.
                </p>
            </div>

            {/* Zone de chargement du fichier */}
            <div style={styles.uploadSection}>
                <div style={styles.uploadBox}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        style={styles.fileInput}
                        id="omr-pdf-upload"
                    />
                    <label htmlFor="omr-pdf-upload" style={styles.uploadLabel}>
                        <div style={styles.uploadIcon}>
                            {file ? '\u2705' : '\ud83d\udcc4'}
                        </div>
                        <span style={styles.uploadText}>
                            {file ? file.name : 'Cliquer pour selectionner un PDF scanne'}
                        </span>
                        {file && (
                            <span style={styles.uploadSize}>
                                {(file.size / 1024).toFixed(0)} Ko
                            </span>
                        )}
                    </label>
                </div>

                {/* Bouton scanner */}
                <button
                    onClick={handleScan}
                    disabled={!file || !coordsJson || scanning}
                    style={{
                        ...styles.scanButton,
                        ...(!file || !coordsJson || scanning ? styles.scanButtonDisabled : {})
                    }}
                >
                    {scanning ? 'Analyse en cours...' : 'Lancer le scan OMR'}
                </button>

                {!coordsJson && (
                    <p style={styles.warningText}>
                        Aucun fichier de coordonnees JSON associe. Generez d'abord un PDF vierge
                        pour obtenir les coordonnees de reference.
                    </p>
                )}
            </div>

            {/* Barre de progression */}
            {scanning && (
                <div style={styles.progressSection}>
                    <div style={styles.progressBarBg}>
                        <div
                            style={{
                                ...styles.progressBarFill,
                                width: `${progress}%`
                            }}
                        />
                    </div>
                    <span style={styles.progressText}>{progress}%</span>
                </div>
            )}

            {/* Erreur */}
            {error && (
                <div style={styles.errorBox}>
                    <strong>Erreur :</strong> {error}
                </div>
            )}

            {/* Avertissements OMR */}
            {results && results.errors && results.errors.length > 0 && (
                <div style={styles.warningBox}>
                    <strong>Avertissements :</strong>
                    <ul style={styles.warningList}>
                        {results.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Resultats */}
            {results && (
                <div style={styles.resultsSection}>
                    {/* Barre de statistiques */}
                    <div style={styles.statsBar}>
                        <div style={styles.statItem}>
                            <span style={styles.statValue}>{stats.total}</span>
                            <span style={styles.statLabel}>Total</span>
                        </div>
                        <div style={{ ...styles.statItem, ...styles.statDetected }}>
                            <span style={styles.statValue}>{stats.detected}</span>
                            <span style={styles.statLabel}>Detectes</span>
                        </div>
                        <div style={{ ...styles.statItem, ...styles.statAmbiguous }}>
                            <span style={styles.statValue}>{stats.ambiguous}</span>
                            <span style={styles.statLabel}>Ambigus</span>
                        </div>
                        <div style={{ ...styles.statItem, ...styles.statEmpty }}>
                            <span style={styles.statValue}>{stats.empty}</span>
                            <span style={styles.statLabel}>Vides</span>
                        </div>
                        <div style={{ ...styles.statItem, ...styles.statEdited }}>
                            <span style={styles.statValue}>{stats.edited}</span>
                            <span style={styles.statLabel}>Selectionnes</span>
                        </div>
                    </div>

                    {/* Filtres */}
                    <div style={styles.filterBar}>
                        <span style={styles.filterLabel}>Filtrer :</span>
                        {[
                            { key: 'all', label: 'Tout', count: stats.total },
                            { key: 'ambiguous', label: 'Ambigus', count: stats.ambiguous },
                            { key: 'empty', label: 'Vides', count: stats.empty }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    ...styles.filterButton,
                                    ...(filter === f.key ? styles.filterButtonActive : {})
                                }}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                    </div>

                    {/* Grille de verification */}
                    <div style={styles.verificationGrid}>
                        {getResultsByDomaine().map(group => (
                            <div key={group.domaine.id} style={styles.domaineBlock}>
                                {/* Header domaine */}
                                <div style={styles.domaineHeader}>
                                    <span style={styles.domaineEmoji}>{group.domaine.emoji}</span>
                                    <h4 style={styles.domaineName}>{group.domaine.nom}</h4>
                                </div>

                                {/* Competences */}
                                {group.competences.map(({ compId, analysis, categorie }) => {
                                    const currentNiveau = editedEvaluations[compId]
                                    const confidenceStyle = getConfidenceStyle(analysis)

                                    return (
                                        <div
                                            key={compId}
                                            style={{
                                                ...styles.competenceRow,
                                                ...confidenceStyle.border
                                            }}
                                        >
                                            {/* Intitule */}
                                            <div style={styles.competenceInfo}>
                                                {categorie && (
                                                    <span style={styles.categorieTag}>
                                                        {categorie.nom}
                                                    </span>
                                                )}
                                                <span style={styles.competenceIntitule}>
                                                    {analysis.competence_intitule}
                                                </span>
                                                {analysis.competence_code && (
                                                    <span style={styles.competenceCode}>
                                                        [{analysis.competence_code}]
                                                    </span>
                                                )}
                                                {/* Badge confiance */}
                                                <span style={{
                                                    ...styles.confidenceBadge,
                                                    ...confidenceStyle.badge
                                                }}>
                                                    {confidenceStyle.label}
                                                </span>
                                            </div>

                                            {/* Ratios de remplissage (debug info) */}
                                            <div style={styles.ratiosBar}>
                                                {analysis.fill_ratios && analysis.fill_ratios.map((ratio, i) => (
                                                    <div key={i} style={styles.ratioItem}>
                                                        <div style={styles.ratioBarBg}>
                                                            <div style={{
                                                                ...styles.ratioBarFill,
                                                                width: `${Math.min(100, ratio * 100 / 0.5)}%`,
                                                                backgroundColor: ratio >= 0.15 ? '#4caf50' : '#e0e0e0'
                                                            }} />
                                                        </div>
                                                        <span style={styles.ratioValue}>
                                                            {(ratio * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Radio buttons pour les niveaux */}
                                            <div style={styles.niveauxRow}>
                                                {NIVEAUX.map(niveau => {
                                                    const isSelected = currentNiveau === niveau.index
                                                    const wasDetected = analysis.detected_niveau === niveau.index

                                                    return (
                                                        <button
                                                            key={niveau.index}
                                                            onClick={() => handleNiveauChange(compId, niveau.index)}
                                                            style={{
                                                                ...styles.niveauButton,
                                                                ...(isSelected ? {
                                                                    backgroundColor: niveau.color,
                                                                    color: '#fff',
                                                                    borderColor: niveau.color,
                                                                    fontWeight: 'bold'
                                                                } : {}),
                                                                ...(wasDetected && !isSelected ? {
                                                                    borderColor: niveau.color,
                                                                    borderStyle: 'dashed'
                                                                } : {})
                                                            }}
                                                            title={`${niveau.label}${wasDetected ? ' (detecte par OMR)' : ''}`}
                                                        >
                                                            {niveau.label}
                                                        </button>
                                                    )
                                                })}
                                                {/* Bouton effacer */}
                                                <button
                                                    onClick={() => handleClearCompetence(compId)}
                                                    style={styles.clearButton}
                                                    title="Effacer la selection"
                                                >
                                                    x
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}

                        {getFilteredResults().length === 0 && (
                            <p style={styles.emptyText}>
                                Aucune competence dans ce filtre.
                            </p>
                        )}
                    </div>

                    {/* Boutons d'action */}
                    <div style={styles.actionBar}>
                        <button
                            onClick={handleSave}
                            disabled={saving || !results}
                            style={{
                                ...styles.saveButton,
                                ...(saving || !results ? styles.saveButtonDisabled : {})
                            }}
                        >
                            {saving ? 'Sauvegarde...' : `Sauvegarder (${results ? Object.keys(results.competenceResults).length : 0} evaluations)`}
                        </button>
                        <button
                            onClick={onCancel}
                            style={styles.cancelButton}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Si pas encore de resultats et pas en cours de scan */}
            {!results && !scanning && !error && (
                <div style={styles.infoBox}>
                    <strong>Comment utiliser le scanner OMR :</strong>
                    <ol style={styles.infoList}>
                        <li>Generez un PDF vierge de positionnement (les coordonnees JSON sont crees automatiquement)</li>
                        <li>Imprimez le PDF et faites-le remplir par le formateur</li>
                        <li>Scannez le document rempli en PDF (300 DPI recommande)</li>
                        <li>Chargez le PDF scanne ci-dessus et lancez le scan</li>
                        <li>Verifiez et corrigez les detections si necessaire</li>
                        <li>Sauvegardez pour importer les evaluations dans le positionnement</li>
                    </ol>
                </div>
            )}
        </div>
    )
}


/**
 * Retourne le style de confiance pour une analyse.
 */
function getConfidenceStyle(analysis) {
    if (analysis.status === 'empty') {
        return {
            border: { borderLeft: '4px solid #9e9e9e' },
            badge: { backgroundColor: '#9e9e9e', color: '#fff' },
            label: 'Vide'
        }
    }
    if (analysis.status === 'ambiguous') {
        return {
            border: { borderLeft: '4px solid #ff9800' },
            badge: { backgroundColor: '#ff9800', color: '#fff' },
            label: 'Ambigu'
        }
    }
    if (analysis.confidence === 'high') {
        return {
            border: { borderLeft: '4px solid #4caf50' },
            badge: { backgroundColor: '#4caf50', color: '#fff' },
            label: 'OK'
        }
    }
    if (analysis.confidence === 'medium') {
        return {
            border: { borderLeft: '4px solid #ff9800' },
            badge: { backgroundColor: '#ff9800', color: '#fff' },
            label: 'Moyen'
        }
    }
    return {
        border: { borderLeft: '4px solid #e0e0e0' },
        badge: { backgroundColor: '#e0e0e0', color: '#333' },
        label: '?'
    }
}


// --- Styles ---
const styles = {
    container: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '20px'
    },
    header: {
        marginBottom: '20px'
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: '#1e293b'
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b'
    },

    // Upload
    uploadSection: {
        marginBottom: '20px'
    },
    uploadBox: {
        marginBottom: '12px'
    },
    fileInput: {
        display: 'none'
    },
    uploadLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: '#f8fafc',
        transition: 'border-color 0.2s'
    },
    uploadIcon: {
        fontSize: '24px'
    },
    uploadText: {
        fontSize: '14px',
        color: '#475569',
        flex: 1
    },
    uploadSize: {
        fontSize: '12px',
        color: '#94a3b8'
    },
    scanButton: {
        padding: '12px 24px',
        backgroundColor: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    scanButtonDisabled: {
        backgroundColor: '#94a3b8',
        cursor: 'not-allowed'
    },
    warningText: {
        marginTop: '8px',
        fontSize: '13px',
        color: '#d97706',
        fontStyle: 'italic'
    },

    // Progress
    progressSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
    },
    progressBarBg: {
        flex: 1,
        height: '8px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: '4px',
        transition: 'width 0.3s ease'
    },
    progressText: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        minWidth: '40px',
        textAlign: 'right'
    },

    // Error / Warning
    errorBox: {
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        color: '#991b1b',
        fontSize: '14px',
        marginBottom: '16px'
    },
    warningBox: {
        padding: '12px 16px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fed7aa',
        borderRadius: '6px',
        color: '#92400e',
        fontSize: '13px',
        marginBottom: '16px'
    },
    warningList: {
        margin: '8px 0 0 20px',
        padding: 0
    },

    // Results section
    resultsSection: {
        marginTop: '20px'
    },

    // Stats bar
    statsBar: {
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        minWidth: '80px'
    },
    statDetected: {
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0'
    },
    statAmbiguous: {
        backgroundColor: '#fffbeb',
        border: '1px solid #fed7aa'
    },
    statEmpty: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb'
    },
    statEdited: {
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe'
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b'
    },
    statLabel: {
        fontSize: '11px',
        color: '#64748b',
        marginTop: '2px'
    },

    // Filters
    filterBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
    },
    filterLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        marginRight: '4px'
    },
    filterButton: {
        padding: '6px 14px',
        border: '1px solid #d1d5db',
        borderRadius: '20px',
        backgroundColor: '#fff',
        fontSize: '13px',
        cursor: 'pointer',
        color: '#475569',
        transition: 'all 0.2s'
    },
    filterButtonActive: {
        backgroundColor: '#2563eb',
        color: '#fff',
        borderColor: '#2563eb'
    },

    // Verification grid
    verificationGrid: {
        maxHeight: '600px',
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
    },
    domaineBlock: {
        marginBottom: '20px'
    },
    domaineHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        marginBottom: '10px'
    },
    domaineEmoji: {
        fontSize: '22px'
    },
    domaineName: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#1e293b'
    },

    // Competence row
    competenceRow: {
        padding: '10px 12px',
        marginBottom: '6px',
        backgroundColor: '#fafafa',
        borderRadius: '6px',
        border: '1px solid #e8e8e8',
        borderLeft: '4px solid #e0e0e0'
    },
    competenceInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '6px'
    },
    categorieTag: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#6366f1',
        backgroundColor: '#eef2ff',
        padding: '2px 6px',
        borderRadius: '3px'
    },
    competenceIntitule: {
        fontSize: '13px',
        color: '#334155',
        flex: 1,
        lineHeight: '1.3'
    },
    competenceCode: {
        fontSize: '11px',
        color: '#94a3b8'
    },
    confidenceBadge: {
        fontSize: '10px',
        fontWeight: '600',
        padding: '2px 8px',
        borderRadius: '10px',
        whiteSpace: 'nowrap'
    },

    // Ratios bar
    ratiosBar: {
        display: 'flex',
        gap: '8px',
        marginBottom: '6px'
    },
    ratioItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flex: 1
    },
    ratioBarBg: {
        flex: 1,
        height: '4px',
        backgroundColor: '#e5e7eb',
        borderRadius: '2px',
        overflow: 'hidden'
    },
    ratioBarFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.3s'
    },
    ratioValue: {
        fontSize: '10px',
        color: '#94a3b8',
        minWidth: '28px',
        textAlign: 'right'
    },

    // Niveaux buttons
    niveauxRow: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        alignItems: 'center'
    },
    niveauButton: {
        padding: '6px 14px',
        border: '2px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        color: '#475569'
    },
    clearButton: {
        padding: '4px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        backgroundColor: '#f9fafb',
        fontSize: '12px',
        cursor: 'pointer',
        color: '#94a3b8',
        marginLeft: '4px'
    },

    // Action buttons
    actionBar: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb'
    },
    saveButton: {
        padding: '12px 28px',
        backgroundColor: '#059669',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    saveButtonDisabled: {
        backgroundColor: '#94a3b8',
        cursor: 'not-allowed'
    },
    cancelButton: {
        padding: '12px 28px',
        backgroundColor: '#fff',
        color: '#64748b',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '15px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },

    // Info box
    infoBox: {
        padding: '16px 20px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#0c4a6e'
    },
    infoList: {
        margin: '10px 0 0 0',
        paddingLeft: '20px',
        lineHeight: '1.8'
    },

    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        padding: '20px',
        fontSize: '14px'
    }
}
