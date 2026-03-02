import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page plein écran de proposition de profil (3 colonnes)
 * Remplace l'ancien ProfilProposalModal
 *
 * URL: /admin/formation/positionnements/[id]/profil?code=ILL-GD&sl=12&se=5&sf=
 * - code : profil détecté
 * - sl, se, sf : scores Lecture, Écriture, FLE (%)
 */
export default function ProfilPage() {
    const router = useRouter()
    const { id, code: detectedCode, sl, se, sf } = router.query

    // Données chargées
    const [positionnement, setPositionnement] = useState(null)
    const [profils, setProfils] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [competences, setCompetences] = useState([])
    const [evaluations, setEvaluations] = useState({})

    // Sélections
    const [selectedProfilId, setSelectedProfilId] = useState(null)
    const [detectedProfilId, setDetectedProfilId] = useState(null)
    const [etapes, setEtapes] = useState([])
    const [etapeCompetences, setEtapeCompetences] = useState({})
    const [selectedEtapeId, setSelectedEtapeId] = useState(null)
    const [comment, setComment] = useState('')

    // UI
    const [loading, setLoading] = useState(true)
    const [loadingEtapes, setLoadingEtapes] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // Scores de détection depuis les query params
    const detectionScores = {
        scoreLecture: sl ? parseInt(sl) : null,
        scoreEcriture: se ? parseInt(se) : null,
        scoreFLE: sf ? parseInt(sf) : null
    }

    // Charger toutes les données au montage
    useEffect(() => {
        if (id) loadData()
    }, [id])

    // Quand les profils sont chargés, trouver le profil détecté
    useEffect(() => {
        if (!detectedCode || profils.length === 0) return
        const detected = profils.find(p => p.code === detectedCode)
        if (detected) {
            setDetectedProfilId(detected.id)
            setSelectedProfilId(detected.id)
        }
    }, [detectedCode, profils])

    // Charger les étapes quand le profil sélectionné change
    useEffect(() => {
        if (selectedProfilId) loadEtapes(selectedProfilId)
    }, [selectedProfilId])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) { router.push('/admin/login'); return }

            const [positRes, profilsRes, domainesRes, catsRes, compsRes] = await Promise.all([
                fetch(`/api/admin/formation/positionnements/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/profils', {
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

            if (!positRes.ok) throw new Error('Erreur chargement positionnement')

            const positData = await positRes.json()
            const profilsData = profilsRes.ok ? await profilsRes.json() : { profils: [] }
            const domainesData = domainesRes.ok ? await domainesRes.json() : { domaines: [] }
            const catsData = catsRes.ok ? await catsRes.json() : { categories: [] }
            const compsData = compsRes.ok ? await compsRes.json() : { competences: [] }

            setPositionnement(positData.positionnement)
            setProfils(profilsData.profils || [])
            setDomaines(domainesData.domaines || [])
            setCategories(catsData.categories || [])
            setCompetences(compsData.competences || [])

            // Initialiser les évaluations
            const evalMap = {}
            if (positData.positionnement.evaluations) {
                positData.positionnement.evaluations.forEach(ev => {
                    evalMap[ev.competence_id] = {
                        niveau_atteint: ev.evaluation || ev.niveau_atteint || '',
                        commentaire: ev.observations || ev.commentaire || ''
                    }
                })
            }
            setEvaluations(evalMap)
        } catch (err) {
            console.error('Erreur:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadEtapes(profilId) {
        setLoadingEtapes(true)
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const res = await fetch(`/api/admin/formation/etapes?profil_id=${profilId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Erreur chargement étapes')
            const data = await res.json()
            const etapesList = data.etapes || []
            setEtapes(etapesList)

            // Charger les compétences de chaque étape en parallèle
            const compsMap = {}
            await Promise.all(etapesList.map(async (etape) => {
                const compRes = await fetch(`/api/admin/formation/etapes/${etape.id}/competences`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (compRes.ok) {
                    const compData = await compRes.json()
                    compsMap[etape.id] = compData.competences || []
                } else {
                    compsMap[etape.id] = []
                }
            }))
            setEtapeCompetences(compsMap)

            // Détecter l'étape recommandée (première où < 50% acquis)
            const acquises = new Set()
            Object.entries(evaluations).forEach(([compId, ev]) => {
                if (ev.niveau_atteint === 'acquis') acquises.add(compId)
            })

            let recommendedEtape = null
            for (const etape of etapesList) {
                const etComps = compsMap[etape.id] || []
                if (etComps.length === 0) continue
                const compIds = etComps.map(ec => ec.competence_id)
                const nbAcquis = compIds.filter(cid => acquises.has(cid)).length
                const pct = nbAcquis / compIds.length
                if (pct < 0.5) {
                    recommendedEtape = etape
                    break
                }
            }
            if (!recommendedEtape && etapesList.length > 0) {
                recommendedEtape = etapesList[etapesList.length - 1]
            }
            setSelectedEtapeId(recommendedEtape?.id || null)
        } catch (err) {
            console.error('Erreur chargement étapes:', err)
        } finally {
            setLoadingEtapes(false)
        }
    }

    // Grouper les profils par type_public
    const profilGroups = {}
    profils.forEach(p => {
        const tp = p.type_public || 'Autre'
        if (!profilGroups[tp]) profilGroups[tp] = []
        profilGroups[tp].push(p)
    })

    // Stats d'une étape
    function getEtapeStats(etapeId) {
        const etComps = etapeCompetences[etapeId] || []
        let nbAcquis = 0, nbEnCours = 0, nbNonAcquis = 0, nbEvalues = 0

        for (const ec of etComps) {
            const ev = evaluations[ec.competence_id]
            const isEvaluated = ev && ev.niveau_atteint && ev.niveau_atteint !== 'non_evalue' && ev.niveau_atteint !== ''
            if (isEvaluated) {
                nbEvalues++
                if (ev.niveau_atteint === 'acquis') nbAcquis++
                else if (ev.niveau_atteint === 'en_cours') nbEnCours++
                else nbNonAcquis++
            }
        }

        return { nbAcquis, nbEnCours, nbNonAcquis, nbEvalues, total: etComps.length }
    }

    // Compétences de l'étape sélectionnée, groupées par domaine
    function getSelectedEtapeCompetences() {
        if (!selectedEtapeId) return []
        const etComps = etapeCompetences[selectedEtapeId] || []

        const allComps = etComps.map(ec => {
            const ev = evaluations[ec.competence_id]
            const isEvaluated = ev && ev.niveau_atteint && ev.niveau_atteint !== 'non_evalue' && ev.niveau_atteint !== ''
            return {
                ...ec,
                niveau: isEvaluated ? ev.niveau_atteint : null,
                comp: ec.competence
            }
        })

        // Trier : acquis, en_cours, non_acquis, non évalué
        const niveauOrder = { 'acquis': 0, 'en_cours': 1, 'non_acquis': 2 }
        allComps.sort((a, b) => {
            const oa = a.niveau ? (niveauOrder[a.niveau] ?? 3) : 4
            const ob = b.niveau ? (niveauOrder[b.niveau] ?? 3) : 4
            return oa - ob
        })

        return allComps
    }

    async function handleValidate() {
        const selectedProfil = profils.find(p => p.id === selectedProfilId)
        if (!selectedProfil) return

        setSaving(true)
        try {
            const token = localStorage.getItem('quiz-admin-token')

            // Sauvegarder le profil détecté + étape sur le positionnement
            const label = `${selectedProfil.code} - ${selectedProfil.nom}`
            const profilsDetectes = {
                [selectedProfil.type_public]: {
                    profil_id: selectedProfil.id,
                    code: selectedProfil.code,
                    nom: selectedProfil.nom,
                    couleur: selectedProfil.couleur,
                    etape_id: selectedEtapeId
                }
            }

            const updateBody = {
                profils_detectes: profilsDetectes
            }

            // Ajouter le commentaire si présent
            if (comment.trim()) {
                updateBody.commentaires_generaux = positionnement.commentaires_generaux
                    ? positionnement.commentaires_generaux + '\n' + comment.trim()
                    : comment.trim()
            }

            const res = await fetch(`/api/admin/formation/positionnements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateBody)
            })

            if (!res.ok) throw new Error('Erreur lors de la sauvegarde')

            // Retour à la page du positionnement
            router.push(`/admin/formation/positionnements/${id}`)
        } catch (err) {
            console.error('Erreur validation:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // --- RENDU ---

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <p>Chargement...</p>
            </div>
        )
    }

    if (error || !positionnement) {
        return (
            <div style={styles.loadingContainer}>
                <p>Erreur: {error || 'Positionnement non trouvé'}</p>
                <button onClick={() => router.back()} style={styles.laterBtn}>Retour</button>
            </div>
        )
    }

    const selectedProfil = profils.find(p => p.id === selectedProfilId)
    const selectedEtape = etapes.find(e => e.id === selectedEtapeId)
    const selectedComps = getSelectedEtapeCompetences()

    return (
        <div style={styles.page}>
            {/* HEADER */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.headerTitle}>
                        Proposition de profil - {positionnement.apprenant?.prenom} {positionnement.apprenant?.nom}
                    </h1>
                    <div style={styles.scoresBar}>
                        {detectionScores.scoreLecture !== null && (
                            <span style={styles.scoreTag}>Lecture: {detectionScores.scoreLecture}%</span>
                        )}
                        {detectionScores.scoreEcriture !== null && (
                            <span style={styles.scoreTag}>Ecriture: {detectionScores.scoreEcriture}%</span>
                        )}
                        {detectionScores.scoreFLE !== null && (
                            <span style={styles.scoreTag}>FLE: {detectionScores.scoreFLE}%</span>
                        )}
                    </div>
                </div>
            </div>

            {/* CORPS 3 COLONNES */}
            <div style={styles.body}>
                {/* COLONNE 1 : PROFILS */}
                <div style={styles.col1}>
                    <h3 style={styles.colTitle}>Profils</h3>
                    {Object.entries(profilGroups).map(([typeName, groupProfils]) => (
                        <div key={typeName}>
                            <div style={styles.groupLabel}>{typeName}</div>
                            {groupProfils.map(p => {
                                const isDetected = p.id === detectedProfilId
                                const isSelected = p.id === selectedProfilId

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProfilId(p.id)}
                                        style={{
                                            ...styles.profilBtn,
                                            backgroundColor: isSelected ? (p.couleur || '#1976d2') : 'transparent',
                                            color: isSelected ? '#fff' : '#333',
                                            fontWeight: isSelected || isDetected ? '700' : '400'
                                        }}
                                    >
                                        {isDetected ? '* ' : '  '}{p.code} - {p.nom}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* COLONNE 2 : ETAPES */}
                <div style={styles.col2}>
                    <h3 style={styles.colTitle}>
                        Etapes
                        {selectedProfil && (
                            <span style={{
                                ...styles.profilBadge,
                                backgroundColor: selectedProfil.couleur || '#666'
                            }}>
                                {selectedProfil.code}
                            </span>
                        )}
                    </h3>

                    {loadingEtapes ? (
                        <p style={styles.muted}>Chargement des étapes...</p>
                    ) : etapes.length === 0 ? (
                        <p style={styles.muted}>Aucune étape pour ce profil</p>
                    ) : (
                        etapes.map(etape => {
                            const stats = getEtapeStats(etape.id)
                            const isSelected = etape.id === selectedEtapeId
                            const nomEtape = etape.nom || `Étape ${etape.numero}`

                            return (
                                <button
                                    key={etape.id}
                                    onClick={() => setSelectedEtapeId(etape.id)}
                                    style={{
                                        ...styles.etapeBtn,
                                        backgroundColor: isSelected ? '#E8F5E9' : '#fff',
                                        borderColor: isSelected ? '#4CAF50' : '#e0e0e0'
                                    }}
                                >
                                    <div style={styles.etapeName}>
                                        {nomEtape}
                                        {isSelected && <span style={styles.selectedMark}> &lt;&lt;</span>}
                                    </div>
                                    <div style={styles.etapeStats}>
                                        {stats.nbEvalues > 0 ? (
                                            <>
                                                <span style={{ color: '#27AE60' }}>{stats.nbAcquis}A</span>
                                                {' / '}
                                                <span style={{ color: '#F39C12' }}>{stats.nbEnCours}EC</span>
                                                {' / '}
                                                <span style={{ color: '#E74C3C' }}>{stats.nbNonAcquis}NA</span>
                                                <span style={{ color: '#999' }}> ({stats.total} comp.)</span>
                                            </>
                                        ) : (
                                            <span style={{ color: '#999' }}>{stats.total} comp.</span>
                                        )}
                                    </div>
                                    {etape.objectifs_lecture && (
                                        <div style={styles.etapeObjectif}>
                                            Lecture: {etape.objectifs_lecture}
                                        </div>
                                    )}
                                    {etape.objectifs_ecriture && (
                                        <div style={styles.etapeObjectif}>
                                            Ecriture: {etape.objectifs_ecriture}
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>

                {/* COLONNE 3 : COMPETENCES DE L'ETAPE SELECTIONNEE */}
                <div style={styles.col3}>
                    <h3 style={styles.colTitle}>
                        Compétences
                        {selectedEtape && (
                            <span style={styles.etapeLabel}>
                                {selectedEtape.nom || `Étape ${selectedEtape.numero}`}
                            </span>
                        )}
                    </h3>

                    {!selectedEtapeId ? (
                        <p style={styles.muted}>Sélectionnez une étape</p>
                    ) : selectedComps.length === 0 ? (
                        <p style={styles.muted}>Aucune compétence liée à cette étape</p>
                    ) : (() => {
                        let currentDomaine = null
                        return selectedComps.map((item, idx) => {
                            const comp = item.comp
                            if (!comp) return null
                            const domaineNom = comp?.categorie?.domaine?.nom || ''
                            const domaineEmoji = comp?.categorie?.domaine?.emoji || ''
                            const domaineLabel = `${domaineEmoji} ${domaineNom}`.trim()
                            const showDomaine = domaineLabel !== currentDomaine
                            if (showDomaine) currentDomaine = domaineLabel

                            const niveauConfig = {
                                'acquis': { label: 'Acquis', color: '#27AE60', bg: '#E8F5E9' },
                                'en_cours': { label: 'En cours', color: '#F39C12', bg: '#FFF8E1' },
                                'non_acquis': { label: 'Non acquis', color: '#E74C3C', bg: '#FFEBEE' }
                            }
                            const nv = item.niveau
                                ? (niveauConfig[item.niveau] || { label: item.niveau, color: '#666', bg: '#f5f5f5' })
                                : { label: '-', color: '#ccc', bg: 'transparent' }

                            return (
                                <div key={idx}>
                                    {showDomaine && (
                                        <div style={styles.domaineHeader}>{domaineLabel}</div>
                                    )}
                                    <div style={{
                                        ...styles.compRow,
                                        backgroundColor: nv.bg
                                    }}>
                                        <span style={{
                                            ...styles.compNiveau,
                                            color: nv.color
                                        }}>{nv.label}</span>
                                        <span style={{
                                            ...styles.compIntitule,
                                            color: item.niveau ? '#333' : '#bbb'
                                        }}>{comp.intitule}</span>
                                    </div>
                                </div>
                            )
                        })
                    })()}
                </div>
            </div>

            {/* FOOTER */}
            <div style={styles.footer}>
                <div style={styles.footerLeft}>
                    <label style={styles.commentLabel}>Commentaire :</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        style={styles.commentInput}
                        rows={2}
                        placeholder="Commentaire optionnel..."
                    />
                </div>
                <div style={styles.footerRight}>
                    <button
                        onClick={() => router.push(`/admin/formation/positionnements/${id}`)}
                        style={styles.laterBtn}
                    >
                        Plus tard
                    </button>
                    <button
                        onClick={handleValidate}
                        disabled={saving || !selectedProfilId}
                        style={{
                            ...styles.validateBtn,
                            ...(saving || !selectedProfilId ? styles.btnDisabled : {})
                        }}
                    >
                        {saving ? 'Enregistrement...' : 'Valider'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f0f2f5'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        backgroundColor: '#fff',
        padding: '12px 20px',
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0
    },
    headerTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
    },
    scoresBar: {
        display: 'flex',
        gap: '10px',
        marginTop: '6px',
        flexWrap: 'wrap'
    },
    scoreTag: {
        fontSize: '13px',
        padding: '2px 10px',
        borderRadius: '10px',
        backgroundColor: '#f0f0f0',
        color: '#555',
        fontWeight: '500'
    },
    body: {
        flex: 1,
        display: 'flex',
        gap: '10px',
        padding: '10px',
        overflow: 'hidden'
    },
    col1: {
        width: '240px',
        minWidth: '200px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        overflowY: 'auto',
        padding: '12px'
    },
    col2: {
        width: '300px',
        minWidth: '260px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        overflowY: 'auto',
        padding: '12px'
    },
    col3: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: '10px',
        overflowY: 'auto',
        padding: '12px'
    },
    colTitle: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    groupLabel: {
        fontSize: '11px',
        color: '#888',
        padding: '10px 8px 2px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    profilBtn: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '7px 10px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        marginBottom: '2px',
        transition: 'background-color 0.15s'
    },
    profilBadge: {
        padding: '2px 8px',
        borderRadius: '4px',
        color: '#fff',
        fontWeight: '600',
        fontSize: '12px'
    },
    muted: {
        padding: '20px',
        color: '#999',
        fontSize: '14px',
        textAlign: 'center'
    },
    etapeBtn: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '8px',
        transition: 'all 0.15s',
        background: '#fff'
    },
    etapeName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '4px'
    },
    selectedMark: {
        color: '#4CAF50',
        fontWeight: '700'
    },
    etapeStats: {
        fontSize: '12px',
        color: '#666'
    },
    etapeObjectif: {
        fontSize: '11px',
        color: '#888',
        marginTop: '4px',
        fontStyle: 'italic'
    },
    etapeLabel: {
        fontSize: '12px',
        color: '#666',
        fontWeight: '400'
    },
    domaineHeader: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1976d2',
        padding: '8px 8px 2px',
        marginTop: '4px'
    },
    compRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        marginBottom: '1px',
        gap: '8px'
    },
    compNiveau: {
        fontSize: '12px',
        width: '75px',
        flexShrink: 0,
        fontWeight: '500'
    },
    compIntitule: {
        fontSize: '13px'
    },
    footer: {
        backgroundColor: '#fff',
        padding: '12px 20px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '20px',
        flexShrink: 0
    },
    footerLeft: {
        flex: 1
    },
    commentLabel: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#333',
        display: 'block',
        marginBottom: '4px'
    },
    commentInput: {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        resize: 'none',
        boxSizing: 'border-box'
    },
    footerRight: {
        display: 'flex',
        gap: '10px'
    },
    laterBtn: {
        padding: '10px 24px',
        backgroundColor: '#e0e0e0',
        color: '#333',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    validateBtn: {
        padding: '10px 24px',
        backgroundColor: '#4CAF50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    btnDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed'
    }
}
