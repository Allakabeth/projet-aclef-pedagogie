import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EvaluationGrid from '@/components/formation/EvaluationGrid'
import OMRUploader from '@/components/formation/OMRUploader'

/**
 * Page de détail/modification d'un positionnement
 * Permet d'évaluer toutes les compétences par domaine
 * Détecte automatiquement le profil de l'apprenant basé sur les compétences évaluées
 */
export default function DetailPositionnement() {
    const router = useRouter()
    const { id } = router.query

    const [positionnement, setPositionnement] = useState(null)
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [competences, setCompetences] = useState([])
    const [evaluations, setEvaluations] = useState({}) // { competence_id: { niveau_atteint, commentaire } }
    const [profils, setProfils] = useState([]) // Liste des profils de référence
    const [profilsDetectes, setProfilsDetectes] = useState({}) // { type_public: { profil_id, code, nom, score } }

    const [selectedDomaine, setSelectedDomaine] = useState(null)
    const [commentairesGeneraux, setCommentairesGeneraux] = useState('')
    const [statut, setStatut] = useState('en_cours')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [showOMR, setShowOMR] = useState(false)
    const [omrCoordsJson, setOmrCoordsJson] = useState(null)
    const [showPdfDialog, setShowPdfDialog] = useState(false)
    const [showOmrDomaineDialog, setShowOmrDomaineDialog] = useState(false)
    const [pdfDomainesSelection, setPdfDomainesSelection] = useState({})

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
            const [positRes, domainesRes, catsRes, compsRes, profilsRes] = await Promise.all([
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
                }),
                fetch('/api/admin/formation/profils', {
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
            const profilsData = profilsRes.ok ? await profilsRes.json() : { profils: [] }

            setPositionnement(positData.positionnement)
            setDomaines(domainesData.domaines || [])
            setCategories(catsData.categories || [])
            setCompetences(compsData.competences || [])
            setProfils(profilsData.profils || [])

            // Charger les profils détectés existants
            if (positData.positionnement.profils_detectes) {
                setProfilsDetectes(positData.positionnement.profils_detectes)
            }

            // Initialiser les évaluations
            // DB utilise 'evaluation'/'observations', code interne utilise 'niveau_atteint'/'commentaire'
            const evalMap = {}
            if (positData.positionnement.evaluations) {
                positData.positionnement.evaluations.forEach(evalData => {
                    evalMap[evalData.competence_id] = {
                        niveau_atteint: evalData.evaluation || evalData.niveau_atteint || '',
                        commentaire: evalData.observations || evalData.commentaire || ''
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

            // Sauvegarder le positionnement (commentaires + statut + profils détectés)
            const updateRes = await fetch(`/api/admin/formation/positionnements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    commentaires_generaux: commentairesGeneraux,
                    statut: statut,
                    profils_detectes: Object.keys(profilsDetectes).length > 0 ? profilsDetectes : null
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

            // Vérifier aussi les erreurs dans le body (l'API renvoie 200 même avec des erreurs partielles)
            const evalResult = await evalRes.json()
            if (evalResult.errors > 0) {
                console.warn(`${evalResult.errors} évaluations en erreur:`, evalResult.failed)
                throw new Error(`${evalResult.errors} évaluations n'ont pas pu être sauvegardées`)
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

    /**
     * Détecte les profils correspondant aux compétences évaluées
     * Analyse par type de public (FLE, Illettrisme, Lecture, etc.)
     * et suggère le profil le plus adapté basé sur le degré ANLCI dominant
     */
    function detecterProfil() {
        // Port exact de _detect_profil() + _calc_score_domaine() de positionnements.py

        // Calcule le % de compétences acquises (niveau=='acquis') pour un domaine donné
        function calcScoreDomaine(domaineId) {
            const domaineComps = competences.filter(c => {
                const cat = categories.find(ct => ct.id === c.categorie_id)
                return cat && cat.domaine_id === domaineId
            })
            if (domaineComps.length === 0) return null

            let count = 0
            let acquis = 0
            for (const comp of domaineComps) {
                const ev = evaluations[comp.id]
                if (ev && ev.niveau_atteint && ev.niveau_atteint !== 'non_evalue' && ev.niveau_atteint !== '') {
                    count++
                    if (ev.niveau_atteint === 'acquis') acquis++
                }
            }
            if (count === 0) return null
            return acquis / count
        }

        const domLecture = domaines.find(d => d.nom === 'Lecture')
        const domEcriture = domaines.find(d => d.nom === 'Écriture')
        const domsFLE = domaines.filter(d => d.nom.includes('(FLE)') || d.nom.includes('FLE'))

        let scoreLecture = domLecture ? calcScoreDomaine(domLecture.id) : null
        let scoreEcriture = domEcriture ? calcScoreDomaine(domEcriture.id) : null

        const scoresFLE = []
        for (const d of domsFLE) {
            const s = calcScoreDomaine(d.id)
            if (s !== null) scoresFLE.push(s)
        }
        const hasFLE = scoresFLE.length > 0
        const scoreFLE = hasFLE ? scoresFLE.reduce((a, b) => a + b, 0) / scoresFLE.length : 0

        if (scoreLecture === null) scoreLecture = 0
        if (scoreEcriture === null) scoreEcriture = 0

        // Arbre de décision identique au Python
        let profilCode
        if (hasFLE) {
            if (scoreFLE < 0.20) {
                if (scoreLecture < 0.15) profilCode = 'A1'
                else if (scoreLecture < 0.40) profilCode = 'B1'
                else profilCode = 'A2'
            } else if (scoreFLE < 0.50) {
                if (scoreLecture < 0.40) profilCode = 'A2'
                else if (scoreEcriture < 0.20) profilCode = 'B2'
                else profilCode = 'A3'
            } else {
                if (scoreEcriture < 0.30) profilCode = 'BA'
                else profilCode = 'A3'
            }
        } else {
            if (scoreLecture < 0.15) profilCode = 'ILL-GD'
            else if (scoreLecture < 0.35) profilCode = 'ILL-PD'
            else if (scoreEcriture < 0.15) profilCode = 'ILL-DE'
            else if (scoreLecture < 0.60 && scoreEcriture < 0.20) profilCode = 'ILL-PLNS'
            else profilCode = 'ILL-LPS'
        }

        // Naviguer vers la page de proposition de profil
        const sl = scoreLecture !== null ? Math.round(scoreLecture * 100) : ''
        const se = scoreEcriture !== null ? Math.round(scoreEcriture * 100) : ''
        const sf = hasFLE ? Math.round(scoreFLE * 100) : ''
        router.push(`/admin/formation/positionnements/${id}/profil?code=${profilCode}&sl=${sl}&se=${se}&sf=${sf}`)
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/admin/formation/positionnements')}
                        disabled={saving}
                        style={styles.backButtonTop}
                    >
                        Retour
                    </button>
                    <div>
                        <h1 style={styles.title}>
                            Positionnement : {positionnement.apprenant?.prenom} {positionnement.apprenant?.nom}
                        </h1>
                        <p style={styles.subtitle}>
                            Formateur: {positionnement.formateur?.prenom} {positionnement.formateur?.nom} •
                            Date: {new Date(positionnement.date_positionnement).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={() => {
                            const sel = {}
                            domaines.forEach(d => { sel[d.id] = true })
                            setPdfDomainesSelection(sel)
                            setShowPdfDialog(true)
                        }}
                        style={styles.pdfButton}
                    >
                        PDF vierge
                    </button>
                    <button
                        onClick={() => {
                            const sel = {}
                            domaines.forEach(d => { sel[d.id] = true })
                            setPdfDomainesSelection(sel)
                            setShowOmrDomaineDialog(true)
                        }}
                        style={styles.omrButton}
                    >
                        Scanner OMR
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            ...styles.saveButtonTop,
                            ...(saving ? styles.saveButtonDisabled : {})
                        }}
                    >
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            {/* Dialog selection domaines pour OMR */}
            {showOmrDomaineDialog && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '500px' }}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0 }}>Domaines du PDF scanné</h2>
                            <button onClick={() => setShowOmrDomaineDialog(false)} style={styles.modalClose}>X</button>
                        </div>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0' }}>
                            Sélectionnez les domaines qui étaient dans le PDF vierge imprimé :
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button onClick={() => {
                                const sel = {}; domaines.forEach(d => { sel[d.id] = true }); setPdfDomainesSelection(sel)
                            }} style={styles.smallButton}>Tout cocher</button>
                            <button onClick={() => setPdfDomainesSelection({})} style={styles.smallButton}>Tout décocher</button>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                            {domaines.map(d => (
                                <label key={d.id} style={styles.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={!!pdfDomainesSelection[d.id]}
                                        onChange={e => setPdfDomainesSelection(prev => ({ ...prev, [d.id]: e.target.checked }))}
                                    />
                                    <span>{d.emoji} {d.nom}</span>
                                </label>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowOmrDomaineDialog(false)} style={styles.cancelButton}>Annuler</button>
                            <button
                                onClick={async () => {
                                    const selectedIds = Object.entries(pdfDomainesSelection).filter(([, v]) => v).map(([k]) => k)
                                    if (selectedIds.length === 0) { alert('Sélectionnez au moins un domaine'); return }
                                    setShowOmrDomaineDialog(false)

                                    const { generatePositionnementForm } = await import('@/lib/omr/pdfGenerator')
                                    const domainesStructures = domaines
                                        .filter(d => selectedIds.includes(d.id))
                                        .map(d => ({
                                            ...d,
                                            categories: categories
                                                .filter(c => c.domaine_id === d.id)
                                                .map(cat => ({ ...cat, competences: competences.filter(comp => comp.categorie_id === cat.id) }))
                                                .filter(cat => cat.competences.length > 0)
                                        })).filter(d => d.categories.length > 0)

                                    const { coordsJson } = await generatePositionnementForm(domainesStructures, {
                                        apprenant_name: positionnement.apprenant?.prenom + ' ' + positionnement.apprenant?.nom,
                                        formateur: positionnement.formateur?.prenom + ' ' + positionnement.formateur?.nom,
                                        date: positionnement.date_positionnement,
                                        dispositif: positionnement.apprenant?.dispositif || ''
                                    })

                                    setOmrCoordsJson(coordsJson)
                                    setShowOMR(true)
                                }}
                                style={styles.saveButton}
                            >
                                Ouvrir le scanner
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale OMR */}
            {showOMR && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0 }}>Scanner OMR</h2>
                            <button onClick={() => setShowOMR(false)} style={styles.modalClose}>X</button>
                        </div>
                        <OMRUploader
                            positionnementId={id}
                            coordsJson={omrCoordsJson}
                            domaines={domaines}
                            categories={categories}
                            competences={competences}
                            onSave={(results) => {
                                // Fusionner les résultats OMR dans les évaluations
                                const newEvals = { ...evaluations }
                                Object.entries(results).forEach(([compId, result]) => {
                                    newEvals[compId] = {
                                        ...newEvals[compId],
                                        niveau_atteint: result.niveau_atteint,
                                        commentaire: result.commentaire || newEvals[compId]?.commentaire || ''
                                    }
                                })
                                setEvaluations(newEvals)
                                setShowOMR(false)
                                alert('Evaluations importées depuis le scan OMR. Pensez à sauvegarder.')
                            }}
                            onCancel={() => setShowOMR(false)}
                        />
                    </div>
                </div>
            )}

            {/* Dialogue sélection domaines pour PDF */}
            {showPdfDialog && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '500px' }}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0 }}>Domaines à inclure dans le PDF</h2>
                            <button onClick={() => setShowPdfDialog(false)} style={styles.modalClose}>X</button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button
                                onClick={() => {
                                    const sel = {}
                                    domaines.forEach(d => { sel[d.id] = true })
                                    setPdfDomainesSelection(sel)
                                }}
                                style={styles.smallButton}
                            >
                                Tout cocher
                            </button>
                            <button
                                onClick={() => setPdfDomainesSelection({})}
                                style={styles.smallButton}
                            >
                                Tout décocher
                            </button>
                        </div>

                        <div style={{ maxHeight: '350px', overflow: 'auto', marginBottom: '20px' }}>
                            {domaines.map(d => (
                                <label key={d.id} style={styles.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={!!pdfDomainesSelection[d.id]}
                                        onChange={(e) => {
                                            setPdfDomainesSelection(prev => ({
                                                ...prev,
                                                [d.id]: e.target.checked
                                            }))
                                        }}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '18px', marginRight: '8px' }}>{d.emoji}</span>
                                    <span style={{ fontSize: '15px' }}>{d.nom}</span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPdfDialog(false)}
                                style={styles.cancelButton}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    const selectedIds = Object.entries(pdfDomainesSelection)
                                        .filter(([, v]) => v)
                                        .map(([k]) => k)

                                    if (selectedIds.length === 0) {
                                        alert('Sélectionnez au moins un domaine')
                                        return
                                    }

                                    setShowPdfDialog(false)

                                    const { generatePositionnementForm, printForm } = await import('@/lib/omr/pdfGenerator')

                                    const domainesStructures = domaines
                                        .filter(d => selectedIds.includes(d.id))
                                        .map(d => ({
                                            ...d,
                                            categories: categories
                                                .filter(c => c.domaine_id === d.id)
                                                .map(cat => ({
                                                    ...cat,
                                                    competences: competences.filter(comp => comp.categorie_id === cat.id)
                                                }))
                                                .filter(cat => cat.competences.length > 0)
                                        })).filter(d => d.categories.length > 0)

                                    const { htmlContent, coordsJson } = await generatePositionnementForm(domainesStructures, {
                                        apprenant_name: positionnement.apprenant?.prenom + ' ' + positionnement.apprenant?.nom,
                                        formateur: positionnement.formateur?.prenom + ' ' + positionnement.formateur?.nom,
                                        date: positionnement.date_positionnement,
                                        dispositif: positionnement.apprenant?.dispositif || ''
                                    })

                                    printForm(htmlContent)
                                }}
                                style={styles.saveButton}
                            >
                                Générer le PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Section Détection de profil */}
            <div style={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                            {profilsDetectes && Object.keys(profilsDetectes).length > 0 ? 'Profil validé' : 'Profil détecté'}
                        </h3>
                        {profilsDetectes && Object.keys(profilsDetectes).length > 0 && (
                            Object.entries(profilsDetectes).map(([typePublic, profil]) => (
                                <span key={typePublic} style={{
                                    display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
                                    backgroundColor: profil.couleur || '#666', color: '#fff',
                                    fontWeight: '600', fontSize: '14px'
                                }}>
                                    {profil.code} - {profil.nom}
                                </span>
                            ))
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={detecterProfil}
                            disabled={saving || Object.keys(evaluations).length === 0}
                            style={{
                                ...styles.detectButton,
                                ...(Object.keys(evaluations).length === 0 ? styles.detectButtonDisabled : {})
                            }}
                        >
                            {profilsDetectes && Object.keys(profilsDetectes).length > 0 ? 'Modifier le profil' : 'Détecter le profil'}
                        </button>
                        {profilsDetectes && Object.keys(profilsDetectes).length > 0 && (
                            <button
                                onClick={async () => {
                                    if (!confirm('Créer le plan de formation avec les compétences non acquises du positionnement ?')) return
                                    try {
                                        const token = localStorage.getItem('quiz-admin-token')
                                        const res = await fetch('/api/admin/formation/plans/generer-depuis-positionnement', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ positionnement_id: id })
                                        })
                                        if (!res.ok) {
                                            const err = await res.json()
                                            throw new Error(err.error || 'Erreur création plan')
                                        }
                                        const data = await res.json()
                                        router.push(`/admin/formation/plans/${data.plan.id}`)
                                    } catch (err) {
                                        alert('Erreur: ' + err.message)
                                    }
                                }}
                                style={styles.planButton}
                            >
                                Faire le plan de formation
                            </button>
                        )}
                    </div>
                </div>
            </div>

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
        padding: '12px 20px',
        maxWidth: '100%',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px'
    },
    headerActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    backButtonTop: {
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: 'nowrap'
    },
    saveButtonTop: {
        padding: '10px 18px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    planButton: {
        padding: '10px 20px',
        backgroundColor: '#ff9800',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    pdfButton: {
        padding: '10px 18px',
        backgroundColor: '#1976d2',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    omrButton: {
        padding: '10px 18px',
        backgroundColor: '#7b1fa2',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '40px',
        zIndex: 1000,
        overflow: 'auto'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e0e0e0'
    },
    modalClose: {
        padding: '8px 14px',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    smallButton: {
        padding: '6px 14px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px'
    },
    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer'
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
    },
    // Styles pour la détection de profil
    profilHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    detectButton: {
        padding: '10px 20px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    detectButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed'
    },
    noProfilText: {
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px'
    },
    profilsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px'
    },
    profilCard: {
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px'
    },
    profilCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    profilCode: {
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '700'
    },
    profilType: {
        fontSize: '12px',
        color: '#666',
        backgroundColor: '#e0e0e0',
        padding: '4px 8px',
        borderRadius: '4px'
    },
    profilNom: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: '8px 0 12px 0'
    },
    profilStats: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    profilStat: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #eee',
        flex: '1',
        minWidth: '60px'
    },
    profilStatLabel: {
        fontSize: '10px',
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: '4px'
    },
    profilStatValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#333'
    }
}
