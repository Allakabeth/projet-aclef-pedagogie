import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

function formatDateFR(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('fr-FR')
}

const STATUT_CYCLE = ['a_travailler', 'en_cours', 'acquis']
const STATUT_COLORS = { a_travailler: '#f44336', en_cours: '#ff9800', acquis: '#4caf50' }
const STATUT_LABELS = { a_travailler: 'Non acquis', en_cours: 'En cours', acquis: 'Acquis' }

export default function DetailPlan() {
    const router = useRouter()
    const { id } = router.query
    const [plan, setPlan] = useState(null)
    const [competences, setCompetences] = useState([])
    const [dateDebut, setDateDebut] = useState('')
    const [dateFin, setDateFin] = useState('')
    const [profilInfo, setProfilInfo] = useState(null) // { typePublic, nom, code }
    const [tempsInfo, setTempsInfo] = useState(null)
    const [observations, setObservations] = useState([]) // [{ domaine, competence, observation }]
    const [commentairePositionnement, setCommentairePositionnement] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [allCompetences, setAllCompetences] = useState([])
    const [allDomaines, setAllDomaines] = useState([])
    const [allCategories, setAllCategories] = useState([])
    const [selectedToAdd, setSelectedToAdd] = useState(new Set())

    useEffect(() => {
        if (id) loadData()
    }, [id])

    async function loadData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) { router.push('/admin/login'); return }

            const res = await fetch(`/api/admin/formation/plans/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Plan non trouvé')
            const data = await res.json()
            const p = data.plan

            setPlan(p)
            setDateDebut(p.date_debut || '')
            setDateFin(p.date_fin_prevue || '')

            // Profil détecté
            if (p.positionnement?.profils_detectes) {
                const profils = p.positionnement.profils_detectes
                if (typeof profils === 'object' && !Array.isArray(profils)) {
                    const entries = Object.entries(profils)
                    if (entries.length > 0) {
                        const [typePublic, d] = entries[0]
                        setProfilInfo({ typePublic, nom: d.nom || '', code: d.code || '' })
                    }
                }
            }

            // Commentaire général du positionnement
            setCommentairePositionnement(p.positionnement?.commentaires_generaux || '')

            // Observations du positionnement (évaluations avec observations non vides)
            const evals = p.positionnement?.evaluations || []
            const obs = evals
                .filter(ev => ev.observations && ev.observations.trim())
                .map(ev => ({
                    domaine: ev.competence?.categorie?.domaine?.nom || '',
                    domaineEmoji: ev.competence?.categorie?.domaine?.emoji || '',
                    domaineOrdre: ev.competence?.categorie?.domaine?.ordre || 0,
                    competence: ev.competence?.intitule || '',
                    observation: ev.observations,
                    evaluation: ev.evaluation
                }))
                .sort((a, b) => a.domaineOrdre - b.domaineOrdre)
            setObservations(obs)

            // Trier les compétences : domaine > statut > catégorie > compétence
            const statutOrdre = { en_cours: 0, a_travailler: 1, acquis: 2 }
            const comps = (p.competences || []).sort((a, b) => {
                const da = a.competence?.categorie?.domaine?.ordre || 0
                const dbo = b.competence?.categorie?.domaine?.ordre || 0
                if (da !== dbo) return da - dbo
                const sa = statutOrdre[a.statut] ?? 0
                const sb = statutOrdre[b.statut] ?? 0
                if (sa !== sb) return sa - sb
                const ca = a.competence?.categorie?.ordre || 0
                const cb = b.competence?.categorie?.ordre || 0
                if (ca !== cb) return ca - cb
                return (a.competence?.ordre || 0) - (b.competence?.ordre || 0)
            })
            setCompetences(comps)

            // Charger les infos temps
            await loadTempsInfo(p, data.planning_seances || [], token)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function loadTempsInfo(plan, planningSeances, token) {
        try {
            let etapeId = null
            const profils = plan.positionnement?.profils_detectes
            if (profils && typeof profils === 'object') {
                const entries = Object.entries(profils)
                if (entries.length > 0) {
                    const [, d] = entries[0]
                    etapeId = d.etape_id
                }
            }
            if (!etapeId) { setTempsInfo(null); return }

            const etapeRes = await fetch(`/api/admin/formation/etapes/${etapeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!etapeRes.ok) { setTempsInfo(null); return }
            const etapeData = await etapeRes.json()
            const etape = etapeData.etape

            const seancesParSemaine = planningSeances.length
            const heuresParSemaine = seancesParSemaine * 3

            let nbSemaines = 0
            if (plan.date_debut && plan.date_fin_prevue) {
                const d1 = new Date(plan.date_debut)
                const d2 = new Date(plan.date_fin_prevue)
                nbSemaines = Math.round((d2 - d1) / (7 * 24 * 60 * 60 * 1000))
            }

            const totalHeures = heuresParSemaine * nbSemaines

            const dispositif = plan.apprenant?.dispositif || ''
            const contraintesDispositif = { 'HSP': 150, 'PIC': 400, 'OEPRE': 120 }
            const maxHeures = contraintesDispositif[dispositif] || null

            setTempsInfo({
                etapeNom: etape.nom || `Étape ${etape.numero}`,
                etapeNumero: etape.numero,
                dureeMin: etape.duree_min,
                dureeMax: etape.duree_max,
                dispositif,
                maxHeures,
                seancesParSemaine,
                heuresParSemaine,
                nbSemaines,
                totalHeures
            })
        } catch (err) {
            console.error('Erreur chargement temps:', err)
            setTempsInfo(null)
        }
    }

    // Sauvegarder le commentaire du positionnement (au blur)
    async function saveCommentairePositionnement() {
        const positionnementId = plan?.positionnement?.id
        if (!positionnementId) return
        try {
            const token = localStorage.getItem('quiz-admin-token')
            await fetch(`/api/admin/formation/positionnements/${positionnementId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ commentaires_generaux: commentairePositionnement })
            })
        } catch (err) {
            console.error('Erreur sauvegarde commentaire:', err)
        }
    }

    // Cycle statut
    async function cycleStatut(comp) {
        const current = comp.statut || 'a_travailler'
        const nextIdx = (STATUT_CYCLE.indexOf(current) + 1) % STATUT_CYCLE.length
        const newStatut = STATUT_CYCLE[nextIdx]

        setCompetences(prev => prev.map(c =>
            c.id === comp.id ? { ...c, statut: newStatut } : c
        ))

        const token = localStorage.getItem('quiz-admin-token')
        await fetch(`/api/admin/formation/plans/${id}/competences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                competences: [{ competence_id: comp.competence_id, statut: newStatut }]
            })
        })
    }

    // Enregistrer le plan
    async function savePlan() {
        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')
            await fetch(`/api/admin/formation/plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    date_debut: dateDebut,
                    date_fin_prevue: dateFin || null
                })
            })
            alert('Plan enregistré')
        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Terminer le plan
    async function terminerPlan() {
        const total = competences.length
        const acq = competences.filter(c => c.statut === 'acquis').length

        if (acq < total) {
            if (!confirm(`Seulement ${acq}/${total} compétences sont acquises.\n\nTerminer le plan et générer le bilan ?`)) return
        }

        try {
            const token = localStorage.getItem('quiz-admin-token')
            await fetch(`/api/admin/formation/plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ statut: 'termine' })
            })
            alert('Plan terminé')
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    // Modal ajout compétences
    async function openAddModal() {
        const token = localStorage.getItem('quiz-admin-token')
        const [domRes, catRes, compRes] = await Promise.all([
            fetch('/api/admin/formation/domaines', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/admin/formation/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/admin/formation/competences', { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        setAllDomaines((await domRes.json()).domaines || [])
        setAllCategories((await catRes.json()).categories || [])
        setAllCompetences((await compRes.json()).competences || [])
        setSelectedToAdd(new Set())
        setShowAddModal(true)
    }

    async function addCompetences() {
        if (selectedToAdd.size === 0) return
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const compsToAdd = Array.from(selectedToAdd).map(compId => ({
                competence_id: compId, statut: 'a_travailler', priorite: 2
            }))
            await fetch(`/api/admin/formation/plans/${id}/competences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ competences: compsToAdd })
            })
            setShowAddModal(false)
            loadData()
        } catch (err) {
            alert('Erreur: ' + err.message)
        }
    }

    // ========== PDF COMPLET ==========
    async function exportPDFComplet() {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF('p', 'mm', 'a4')
        const PW = 210
        let y = 40

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('ACLEF', PW / 2, y, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('Association Calcul Lecture Ecriture Formation', PW / 2, y + 6, { align: 'center' })
        y += 20

        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Plan de Formation Individualis\u00e9', PW / 2, y, { align: 'center' })
        y += 15

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Apprenant(e) : ${nom}`, 20, y)
        y += 8

        if (profilInfo) {
            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.text(`Profil : ${profilInfo.typePublic} - ${profilInfo.nom}`, 20, y)
            y += 8
        }

        if (tempsInfo) {
            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.text(`${tempsInfo.etapeNom} (${tempsInfo.dureeMin || '?'}-${tempsInfo.dureeMax || '?'}h)  |  Parcours pr\u00e9visionnel : ~${tempsInfo.totalHeures}h`, 20, y)
            y += 8
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(`Du ${dateDebut ? formatDateFR(dateDebut) : '?'} au ${dateFin ? formatDateFR(dateFin) : '?'}`, 20, y)
        y += 10

        doc.setDrawColor(200, 200, 200)
        doc.line(20, y, PW - 20, y)
        y += 8

        // Observations du positionnement
        if (commentairePositionnement) {
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('Observations du positionnement', 20, y)
            y += 7
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            const lignes = doc.splitTextToSize(commentairePositionnement, PW - 44)
            lignes.forEach(ligne => {
                if (y > 272) { doc.addPage(); y = 25 }
                doc.text(ligne, 22, y, { align: 'justify', maxWidth: PW - 44 })
                y += 5
            })
            y += 8
            doc.setDrawColor(200, 200, 200)
            doc.line(20, y, PW - 20, y)
            y += 8
        }

        // Compétences
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`Comp\u00e9tences (${total})`, 20, y)
        y += 10

        let currentDom = null
        competences.forEach(comp => {
            const domaine = comp.competence?.categorie?.domaine
            if (y > 267) { doc.addPage(); y = 25 }

            if (domaine && domaine.nom !== currentDom) {
                currentDom = domaine.nom
                y += 5
                doc.setFontSize(11)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(38, 100, 235)
                doc.text(`${stripEmoji(domaine.emoji || '')} ${domaine.nom}`, 20, y)
                doc.setTextColor(0, 0, 0)
                y += 7
            }

            const statut = comp.statut || 'a_travailler'
            const statutLabel = STATUT_LABELS[statut] || statut
            const statutRGB = { a_travailler: [244, 67, 54], en_cours: [255, 152, 0], acquis: [76, 175, 80] }
            const rgb = statutRGB[statut] || [100, 100, 100]
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(rgb[0], rgb[1], rgb[2])
            doc.text(statutLabel, 22, y)
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            let text = comp.competence?.intitule || ''
            const statusW = doc.getTextWidth('Non acquis  ')
            const textX = 22 + statusW
            const maxW = PW - 20 - textX
            if (doc.getTextWidth(text) > maxW) {
                while (doc.getTextWidth(text + '...') > maxW && text.length > 10) text = text.slice(0, -1)
                text += '...'
            }
            doc.text(text, textX, y)
            y += 5.5
        })

        const nomFichier = nom.replace(/\s+/g, '_')
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
        doc.save(`Plan_Formation_${nomFichier}_${today}.pdf`)
    }

    // ========== PDF CAHIER ==========
    async function exportPDFCahier() {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF('p', 'mm', 'a4')
        const PW = 210
        const PH = 297
        let y = 20

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(nom, 15, y)

        const datesParts = []
        if (dateDebut) datesParts.push(`D\u00e9but : ${formatDateFR(dateDebut)}`)
        if (dateFin) datesParts.push(`Fin : ${formatDateFR(dateFin)}`)
        if (datesParts.length) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text(datesParts.join('  |  '), PW - 15, y, { align: 'right' })
        }

        y += 8
        doc.setDrawColor(200, 200, 200)
        doc.line(15, y, PW - 15, y)
        y += 6

        const colX = PW - 15 - 3 * 14
        const headers = ['A faire', 'En cours', 'Acquis']
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        headers.forEach((h, i) => {
            doc.text(h, colX + i * 14 + 7, y + 1, { align: 'center' })
        })
        y += 4

        const availableH = PH - 15 - y
        const domainesSet = new Set(competences.map(c => c.competence?.categorie?.domaine?.nom))
        const nbDomaines = domainesSet.size
        const totalLines = total + nbDomaines * 2.5
        let lineH = Math.min(7.5, availableH / Math.max(totalLines, 1))
        lineH = Math.max(lineH, 4.0)
        let fontSize = Math.min(9, Math.max(6.5, lineH * 1.2))
        const boxSz = 3.5

        let currentDom = null
        competences.forEach(comp => {
            if (y > PH - 12) return
            const domaine = comp.competence?.categorie?.domaine

            if (domaine && domaine.nom !== currentDom) {
                currentDom = domaine.nom
                y += lineH
                doc.setFontSize(fontSize + 0.5)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(38, 100, 235)
                doc.text(`${stripEmoji(domaine.emoji || '')} ${domaine.nom}`, 15, y)
                doc.setTextColor(0, 0, 0)
                y += lineH * 1.2
            }

            let intitule = comp.competence?.intitule || ''
            doc.setFontSize(fontSize)
            doc.setFont('helvetica', 'normal')
            const maxW = colX - 20
            if (doc.getTextWidth(intitule) > maxW) {
                while (doc.getTextWidth(intitule + '...') > maxW && intitule.length > 10) intitule = intitule.slice(0, -1)
                intitule += '...'
            }
            doc.text(intitule, 18, y)

            const boxY = y - boxSz * 0.7
            for (let i = 0; i < 3; i++) {
                const bx = colX + i * 14 + 7 - boxSz / 2
                doc.rect(bx, boxY, boxSz, boxSz)
            }
            y += lineH * 1.15
        })

        const nomFichier = nom.replace(/\s+/g, '_')
        const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
        doc.save(`Plan_Cahier_${nomFichier}_${today}.pdf`)
    }

    function stripEmoji(str) {
        return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '').trim()
    }

    // Valeurs calculées
    const total = competences.length
    const acquis = competences.filter(c => c.statut === 'acquis').length
    const nom = plan ? `${plan.apprenant?.prenom || ''} ${plan.apprenant?.nom || ''}` : ''

    // Grouper compétences par domaine
    const competencesParDomaine = []
    let currentDomaineId = null
    competences.forEach(comp => {
        const domaine = comp.competence?.categorie?.domaine
        if (!domaine) return
        if (currentDomaineId !== domaine.id) {
            currentDomaineId = domaine.id
            competencesParDomaine.push({ domaine, comps: [] })
        }
        competencesParDomaine[competencesParDomaine.length - 1].comps.push(comp)
    })

    // Grouper observations par domaine
    const observationsParDomaine = {}
    observations.forEach(obs => {
        const key = obs.domaine || 'Autre'
        if (!observationsParDomaine[key]) {
            observationsParDomaine[key] = { emoji: obs.domaineEmoji, ordre: obs.domaineOrdre, obs: [] }
        }
        observationsParDomaine[key].obs.push(obs)
    })

    // Modal : compétences disponibles
    const existingIds = new Set(competences.map(c => c.competence_id))
    const availableComps = allCompetences.filter(c => !existingIds.has(c.id))
    const availableParDomaine = {}
    availableComps.forEach(comp => {
        const cat = allCategories.find(c => c.id === comp.categorie_id)
        const dom = cat ? allDomaines.find(d => d.id === cat.domaine_id) : null
        if (!dom) return
        if (!availableParDomaine[dom.id]) {
            availableParDomaine[dom.id] = { domaine: dom, comps: [] }
        }
        availableParDomaine[dom.id].comps.push(comp)
    })

    if (loading) return <div style={s.loadingPage}><p>Chargement...</p></div>
    if (!plan) return <div style={s.loadingPage}><p>Plan non trouvé</p></div>

    return (
        <div style={s.page}>
            {/* ===== EN-TÊTE ===== */}
            <div style={s.header}>
                <div style={s.headerRow}>
                    <h1 style={s.title}>Plan de formation - {nom}</h1>
                    <div style={s.headerButtons}>
                        <button onClick={exportPDFCahier} style={s.btnPrimary}>PDF cahier</button>
                        <button onClick={exportPDFComplet} style={s.btnPrimary}>PDF complet</button>
                        <button onClick={openAddModal} style={s.btnGray}>+ Ajouter</button>
                        <button onClick={savePlan} disabled={saving} style={s.btnPrimary}>
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button onClick={terminerPlan} style={s.btnGreen}>Bilan</button>
                        <button onClick={() => router.back()} style={s.btnGray}>Fermer</button>
                    </div>
                </div>
            </div>

            <div style={s.body}>
                {/* ===== SECTION PROFIL + ÉTAPE + TEMPS ===== */}
                <div style={s.section}>
                    <div style={s.profilRow}>
                        {profilInfo && (
                            <div style={s.profilBlock}>
                                <span style={s.profilType}>{profilInfo.typePublic}</span>
                                <span style={s.profilNom}>{profilInfo.nom}</span>
                                {profilInfo.code && <span style={s.profilCode}>{profilInfo.code}</span>}
                            </div>
                        )}

                        {tempsInfo && (
                            <div style={s.etapeBlock}>
                                <span style={s.etapeNom}>{tempsInfo.etapeNom}</span>
                                <span style={s.etapeDuree}>
                                    {tempsInfo.dureeMin && tempsInfo.dureeMax
                                        ? `${tempsInfo.dureeMin}h - ${tempsInfo.dureeMax}h`
                                        : tempsInfo.dureeMin ? `${tempsInfo.dureeMin}h min` : ''}
                                </span>
                            </div>
                        )}

                        {tempsInfo && (
                            <div style={s.tempsBlock}>
                                <span style={s.tempsDetail}>
                                    {tempsInfo.seancesParSemaine} séance{tempsInfo.seancesParSemaine > 1 ? 's' : ''}/sem
                                    {' = '}{tempsInfo.heuresParSemaine}h/sem
                                </span>
                                {tempsInfo.nbSemaines > 0 && (
                                    <span style={s.tempsDetail}>
                                        Parcours pr&eacute;visionnel : {tempsInfo.nbSemaines} sem. = <strong>~{tempsInfo.totalHeures}h</strong>
                                    </span>
                                )}
                                {tempsInfo.dispositif && tempsInfo.maxHeures && (
                                    <span style={s.tempsDetail}>
                                        {tempsInfo.dispositif} : max {tempsInfo.maxHeures}h
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={s.datesBlock}>
                            <span style={s.dateText}>
                                Du {dateDebut ? formatDateFR(dateDebut) : '?'} au {dateFin ? formatDateFR(dateFin) : '?'}
                            </span>
                        </div>
                    </div>

                    {/* Alertes temps */}
                    {tempsInfo && tempsInfo.totalHeures > 0 && tempsInfo.dureeMin && (
                        <div style={{
                            ...s.alerte,
                            backgroundColor: tempsInfo.totalHeures < tempsInfo.dureeMin ? '#fef2f2' : '#f0fdf4',
                            color: tempsInfo.totalHeures < tempsInfo.dureeMin ? '#dc2626' : '#16a34a'
                        }}>
                            {tempsInfo.totalHeures < tempsInfo.dureeMin
                                ? `Temps insuffisant : ~${tempsInfo.totalHeures}h disponibles pour ${tempsInfo.dureeMin}-${tempsInfo.dureeMax}h recommandées`
                                : `~${tempsInfo.totalHeures}h disponibles pour ${tempsInfo.dureeMin}-${tempsInfo.dureeMax}h recommandées`
                            }
                        </div>
                    )}
                    {tempsInfo && tempsInfo.maxHeures && tempsInfo.totalHeures > tempsInfo.maxHeures && (
                        <div style={{ ...s.alerte, backgroundColor: '#fef2f2', color: '#dc2626' }}>
                            Dépasse le max {tempsInfo.dispositif} : ~{tempsInfo.totalHeures}h &gt; {tempsInfo.maxHeures}h
                        </div>
                    )}
                </div>

                {/* ===== OBSERVATIONS DU POSITIONNEMENT ===== */}
                <div style={s.section}>
                    <h3 style={s.sectionTitle}>Observations du positionnement</h3>

                    <textarea
                        value={commentairePositionnement}
                        onChange={e => setCommentairePositionnement(e.target.value)}
                        onBlur={saveCommentairePositionnement}
                        style={s.commentaireTextarea}
                        placeholder="Observations générales du positionnement..."
                        rows={4}
                    />

                        {Object.entries(observationsParDomaine)
                            .sort(([, a], [, b]) => a.ordre - b.ordre)
                            .map(([domNom, { emoji, obs: obsList }]) => (
                                <div key={domNom} style={s.obsDomaineBlock}>
                                    <div style={s.obsDomaineTitle}>{emoji} {domNom}</div>
                                    {obsList.map((o, i) => (
                                        <div key={i} style={s.obsRow}>
                                            <span style={{
                                                ...s.obsEvalBadge,
                                                backgroundColor: STATUT_COLORS[o.evaluation] || '#9e9e9e'
                                            }}>
                                                {STATUT_LABELS[o.evaluation] || o.evaluation}
                                            </span>
                                            <span style={s.obsCompetence}>{o.competence}</span>
                                            <span style={s.obsText}>{o.observation}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        }
                </div>

                {/* ===== COMPÉTENCES PAR DOMAINE ===== */}
                <div style={s.section}>
                    <div style={s.compHeaderRow}>
                        <h3 style={s.sectionTitle}>Compétences à travailler</h3>
                        <div style={s.legend}>
                            {STATUT_CYCLE.map(st => (
                                <span key={st} style={{ ...s.legendBadge, backgroundColor: STATUT_COLORS[st] }}>
                                    {STATUT_LABELS[st]}
                                </span>
                            ))}
                        </div>
                        <span style={{
                            ...s.progress,
                            color: acquis === total && total > 0 ? '#22c55e' : acquis > 0 ? '#f59e0b' : '#94a3b8'
                        }}>
                            {acquis}/{total} acquises
                        </span>
                    </div>

                    {competencesParDomaine.length === 0 && (
                        <p style={s.empty}>Aucune compétence dans ce plan</p>
                    )}
                    {competencesParDomaine.map(({ domaine, comps }) => (
                        <div key={domaine.id}>
                            <div style={s.domaineTitle}>
                                {domaine.emoji} {domaine.nom}
                            </div>
                            {comps.map(comp => {
                                const statut = comp.statut || 'a_travailler'
                                return (
                                    <div key={comp.id} style={s.compRow}>
                                        <button
                                            onClick={() => cycleStatut(comp)}
                                            style={{
                                                ...s.statutBtn,
                                                backgroundColor: STATUT_COLORS[statut]
                                            }}
                                        >
                                            {STATUT_LABELS[statut]}
                                        </button>
                                        <span style={s.compIntitule}>
                                            {comp.competence?.intitule}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== MODAL AJOUT COMPÉTENCES ===== */}
            {showAddModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <h3 style={s.modalTitle}>Ajouter des compétences</h3>
                        <div style={s.modalScroll}>
                            {Object.keys(availableParDomaine).length === 0 ? (
                                <p style={s.empty}>Toutes les compétences sont déjà dans le plan.</p>
                            ) : (
                                Object.values(availableParDomaine)
                                    .sort((a, b) => (a.domaine.ordre || 0) - (b.domaine.ordre || 0))
                                    .map(({ domaine, comps }) => (
                                        <div key={domaine.id}>
                                            <div style={s.modalDomaineTitle}>
                                                {domaine.emoji} {domaine.nom}
                                            </div>
                                            {comps.map(comp => (
                                                <label key={comp.id} style={s.checkboxRow}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedToAdd.has(comp.id)}
                                                        onChange={e => {
                                                            const next = new Set(selectedToAdd)
                                                            if (e.target.checked) next.add(comp.id)
                                                            else next.delete(comp.id)
                                                            setSelectedToAdd(next)
                                                        }}
                                                    />
                                                    <span style={s.checkboxLabel}>{comp.intitule}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ))
                            )}
                        </div>
                        <div style={s.modalButtons}>
                            <button onClick={() => setShowAddModal(false)} style={s.btnGray}>Annuler</button>
                            <button onClick={addCompetences} style={s.btnPrimary}>
                                Ajouter ({selectedToAdd.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const s = {
    loadingPage: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', fontFamily: 'Arial, sans-serif'
    },
    page: {
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f1f5f9',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
    },
    // Header
    header: {
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px'
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
    },
    title: {
        margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b'
    },
    headerButtons: {
        display: 'flex', gap: '6px', flexWrap: 'wrap'
    },
    btnPrimary: {
        padding: '7px 14px', backgroundColor: '#2563eb', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '500'
    },
    btnGray: {
        padding: '7px 14px', backgroundColor: '#64748b', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
    },
    btnGreen: {
        padding: '7px 14px', backgroundColor: '#22c55e', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '500'
    },
    // Body
    body: {
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flex: 1,
        overflowY: 'auto'
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '16px 20px'
    },
    sectionTitle: {
        margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b'
    },
    // Profil + étape + temps
    profilRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
    },
    profilBlock: {
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    profilType: {
        fontSize: '13px', color: '#64748b', fontWeight: '500'
    },
    profilNom: {
        fontSize: '15px', color: '#1e293b', fontWeight: '600'
    },
    profilCode: {
        fontSize: '12px', color: '#94a3b8', fontStyle: 'italic'
    },
    etapeBlock: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '4px 12px',
        backgroundColor: '#eff6ff',
        borderRadius: '6px'
    },
    etapeNom: {
        fontSize: '14px', color: '#2563eb', fontWeight: '600'
    },
    etapeDuree: {
        fontSize: '13px', color: '#3b82f6'
    },
    tempsBlock: {
        display: 'flex', flexDirection: 'column', gap: '2px'
    },
    tempsDetail: {
        fontSize: '13px', color: '#475569'
    },
    datesBlock: {
        marginLeft: 'auto'
    },
    dateText: {
        fontSize: '13px', color: '#64748b'
    },
    alerte: {
        marginTop: '10px',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500'
    },
    // Observations
    commentaireTextarea: {
        width: '100%', boxSizing: 'border-box',
        fontSize: '14px', color: '#334155', lineHeight: '1.6',
        padding: '10px 14px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px', border: '1px solid #e2e8f0',
        borderLeft: '3px solid #2563eb',
        marginBottom: '12px',
        resize: 'vertical', fontFamily: 'Arial, sans-serif',
        minHeight: '80px',
        textAlign: 'justify'
    },
    obsDomaineBlock: {
        marginBottom: '10px'
    },
    obsDomaineTitle: {
        fontSize: '14px', fontWeight: '600', color: '#2563eb',
        padding: '4px 0'
    },
    obsRow: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '4px 8px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        marginBottom: '2px'
    },
    obsEvalBadge: {
        padding: '2px 6px', borderRadius: '3px',
        color: '#fff', fontSize: '10px', fontWeight: '600',
        minWidth: '60px', textAlign: 'center', flexShrink: 0
    },
    obsCompetence: {
        fontSize: '12px', color: '#64748b', minWidth: '150px', flexShrink: 0
    },
    obsText: {
        fontSize: '13px', color: '#1e293b', fontStyle: 'italic'
    },
    // Compétences
    compHeaderRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '8px', flexWrap: 'wrap'
    },
    legend: {
        display: 'flex', gap: '6px'
    },
    legendBadge: {
        fontSize: '11px', color: '#fff', padding: '2px 8px', borderRadius: '4px'
    },
    progress: {
        marginLeft: 'auto', fontSize: '14px', fontWeight: '500'
    },
    domaineTitle: {
        fontSize: '15px', fontWeight: '600', color: '#2563eb',
        padding: '12px 5px 5px 5px'
    },
    compRow: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '5px 10px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        marginBottom: '2px'
    },
    statutBtn: {
        padding: '3px 0', width: '80px', minWidth: '80px',
        border: 'none', borderRadius: '4px', color: '#fff',
        fontSize: '12px', fontWeight: '500', cursor: 'pointer', textAlign: 'center'
    },
    compIntitule: {
        fontSize: '13px', color: '#334155', lineHeight: '1.3'
    },
    empty: {
        textAlign: 'center', color: '#94a3b8', padding: '40px 20px'
    },
    // Modal
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modalContent: {
        backgroundColor: '#fff', borderRadius: '10px', padding: '20px',
        width: '700px', maxWidth: '90vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column'
    },
    modalTitle: {
        margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600'
    },
    modalScroll: {
        flex: 1, overflowY: 'auto', marginBottom: '15px',
        backgroundColor: '#f8fafc', borderRadius: '6px', padding: '10px'
    },
    modalDomaineTitle: {
        fontSize: '14px', fontWeight: '600', color: '#2563eb',
        padding: '10px 0 5px 10px'
    },
    checkboxRow: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '3px 20px', cursor: 'pointer', fontSize: '13px'
    },
    checkboxLabel: { color: '#334155' },
    modalButtons: {
        display: 'flex', gap: '10px', justifyContent: 'flex-end'
    }
}
