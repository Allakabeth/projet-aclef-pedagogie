/**
 * Generateur de formulaire de positionnement imprimable (HTML) + coordonnees JSON.
 *
 * Genere un document HTML avec mise en page A4 pour impression via window.print(),
 * et produit en parallele un objet JSON contenant les coordonnees exactes de chaque
 * case a cocher pour permettre la lecture OMR apres scan.
 *
 * Les coordonnees JSON utilisent le systeme PDF (points, 72 DPI, origine bas-gauche).
 */

// --- Constantes PDF (en points, 1 pt = 1/72 pouce) ---
const PT_PER_MM = 72 / 25.4  // ~2.8346 points par mm

const PAGE_W = 595.27   // A4 largeur en points
const PAGE_H = 841.89   // A4 hauteur en points

const MARGIN_LEFT = 15 * PT_PER_MM
const MARGIN_RIGHT = 15 * PT_PER_MM
const MARGIN_TOP = 12 * PT_PER_MM
const MARGIN_BOTTOM = 12 * PT_PER_MM

const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT

const MARKER_SIZE = 5 * PT_PER_MM
const MARKER_OFFSET = 8 * PT_PER_MM

const CHECKBOX_SIZE = 4.5 * PT_PER_MM
const CHECKBOX_SPACING = 2 * PT_PER_MM

const NIVEAUX = ['Non acquis', 'En cours', 'Acquis']
const NB_NIVEAUX = NIVEAUX.length

// Couleurs par domaine
const COULEURS_DOMAINES = {
    'Lecture': '#3b82f6',
    'Ecriture': '#10b981',
    'Expression orale': '#8b5cf6',
    'Mathematiques': '#f59e0b',
    'Informatique': '#6366f1',
    'Numerique': '#6366f1',
    'Vie quotidienne': '#06b6d4',
    'Vie professionnelle': '#ef4444',
    'Communication': '#8b5cf6',
    'Code': '#78716c'
}

const COULEUR_DEFAUT = '#64748b'


/**
 * Retourne la couleur associee a un domaine.
 * @param {string} nomDomaine - Nom du domaine
 * @returns {string} Couleur hex
 */
function getDomaineColor(nomDomaine) {
    const nomLower = (nomDomaine || '').toLowerCase()
    for (const [key, color] of Object.entries(COULEURS_DOMAINES)) {
        if (nomLower.includes(key.toLowerCase())) {
            return color
        }
    }
    return COULEUR_DEFAUT
}


/**
 * Convertit des millimetres en points PDF.
 * @param {number} mm - Valeur en millimetres
 * @returns {number} Valeur en points
 */
function mmToPt(mm) {
    return mm * PT_PER_MM
}


/**
 * Convertit des points PDF en millimetres (pour le CSS).
 * @param {number} pt - Valeur en points
 * @returns {number} Valeur en millimetres
 */
function ptToMm(pt) {
    return pt / PT_PER_MM
}


/**
 * Genere un formulaire de positionnement imprimable + coordonnees JSON.
 *
 * @param {Array} domaines - Tableau d'objets domaine avec categories et competences imbriquees
 *   Chaque domaine: { id, nom, emoji, categories: [{ id, nom, competences: [{ id, code, intitule, ordre }] }] }
 * @param {Object} meta - Metadonnees { apprenant_name, formateur, date, dispositif }
 * @returns {{ htmlContent: string, coordsJson: Object }}
 */
export async function generatePositionnementForm(domaines, meta = {}) {
    // Generer le HTML avec data attributes sur les checkboxes
    const htmlContent = buildPrintableHTML(domaines, meta)

    // Mesurer les positions reelles des checkboxes en rendant le HTML
    const coordsJson = await measureCoordinates(htmlContent, meta)

    return { htmlContent, coordsJson }
}


/**
 * Mesure les positions reelles des cases a cocher en rendant le HTML
 * dans un iframe cache, puis en lisant getBoundingClientRect().
 *
 * C'est l'equivalent de l'approche ReportLab en Python : les coordonnees
 * proviennent du rendu reel, donc aucun decalage possible.
 */
async function measureCoordinates(htmlContent, meta) {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:20000px;border:none;visibility:hidden;'
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument
        iframeDoc.open()
        iframeDoc.write(htmlContent)
        iframeDoc.close()

        // Attendre que l'iframe ait fini son layout (300ms pour etre sur)
        setTimeout(() => {
                try {
                    const casesCoords = []
                    const pages = iframeDoc.querySelectorAll('.page')

                    pages.forEach((pageDiv, pageIndex) => {
                        const pageRect = pageDiv.getBoundingClientRect()
                        // Le page div fait 210mm en CSS → on calcule le ratio px/mm
                        const pxPerMm = pageRect.width / 210

                        const checkboxes = pageDiv.querySelectorAll('.checkbox[data-comp-id]')
                        checkboxes.forEach(cb => {
                            const cbRect = cb.getBoundingClientRect()
                            // Position relative au coin haut-gauche de la page
                            const relXPx = cbRect.left - pageRect.left
                            const relYPx = cbRect.top - pageRect.top
                            const widthPx = cbRect.width
                            const heightPx = cbRect.height

                            // Convertir en mm
                            const xMm = relXPx / pxPerMm
                            const yMm = relYPx / pxPerMm
                            const wMm = widthPx / pxPerMm
                            const hMm = heightPx / pxPerMm

                            // Convertir en coordonnees PDF (origine bas-gauche, en points)
                            const xPt = xMm * PT_PER_MM
                            const yPt = PAGE_H - (yMm + hMm) * PT_PER_MM
                            const wPt = wMm * PT_PER_MM
                            const hPt = hMm * PT_PER_MM

                            casesCoords.push({
                                competence_id: cb.dataset.compId,
                                competence_code: cb.dataset.compCode || '',
                                competence_intitule: cb.dataset.compIntitule || '',
                                domaine: cb.dataset.domaine || '',
                                niveau_index: parseInt(cb.dataset.niveau),
                                niveau_label: NIVEAUX[parseInt(cb.dataset.niveau)],
                                page: pageIndex + 1,
                                x: Math.round(xPt * 100) / 100,
                                y: Math.round(yPt * 100) / 100,
                                width: Math.round(wPt * 100) / 100,
                                height: Math.round(hPt * 100) / 100
                            })
                        })
                    })

                    const markers = {
                        marker_size: MARKER_SIZE,
                        top_left: { x: MARKER_OFFSET, y: PAGE_H - MARKER_OFFSET },
                        top_right: { x: PAGE_W - MARKER_OFFSET - MARKER_SIZE, y: PAGE_H - MARKER_OFFSET },
                        bottom_left: { x: MARKER_OFFSET, y: MARKER_OFFSET + MARKER_SIZE },
                        bottom_right: { x: PAGE_W - MARKER_OFFSET - MARKER_SIZE, y: MARKER_OFFSET + MARKER_SIZE }
                    }

                    resolve({
                        meta: {
                            apprenant: meta.apprenant_name || '',
                            apprenant_id: meta.apprenant_id || null,
                            formateur: meta.formateur || '',
                            date: meta.date || new Date().toISOString().split('T')[0],
                            dispositif: meta.dispositif || '',
                            generated_at: new Date().toISOString()
                        },
                        page_size: { width: PAGE_W, height: PAGE_H },
                        markers,
                        checkbox_size: CHECKBOX_SIZE,
                        niveaux: NIVEAUX,
                        cases: casesCoords,
                        total_pages: pages.length
                    })
                } catch (err) {
                    console.error('Erreur mesure coordonnees:', err)
                    resolve(null)
                } finally {
                    document.body.removeChild(iframe)
                }
        }, 300)
    })
}


/**
 * Construit le HTML imprimable avec mise en page A4.
 * @param {Array} domaines - Domaines avec categories et competences
 * @param {Object} meta - Metadonnees
 * @returns {string} Contenu HTML complet
 */
function buildPrintableHTML(domaines, meta) {
    const dateStr = formatDate(meta.date)

    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Positionnement - Formation ACLEF</title>
<style>
@page {
    size: A4;
    margin: 0;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10px;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 15mm;
    position: relative;
    page-break-after: always;
    overflow: hidden;
}

.page:last-child {
    page-break-after: auto;
}

/* Marqueurs d'alignement */
.marker {
    position: absolute;
    width: 5mm;
    height: 5mm;
    background: #000;
}
.marker-tl { top: 8mm; left: 8mm; }
.marker-tr { top: 8mm; right: 8mm; }
.marker-bl { bottom: 8mm; left: 8mm; }
.marker-br { bottom: 8mm; right: 8mm; }

/* En-tete */
.header-title {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 2mm;
}
.header-subtitle {
    text-align: center;
    font-size: 9px;
    color: #64748b;
    margin-bottom: 2mm;
}
.header-separator {
    border: none;
    border-top: 0.5px solid #e2e8f0;
    margin-bottom: 2mm;
}
.header-fields {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2mm;
    font-size: 9px;
}
.header-field-label {
    font-weight: bold;
    font-size: 9px;
    color: #64748b;
    margin-right: 2mm;
}
.header-field-value {
    font-size: 10px;
    color: #1e293b;
}
.header-field-line {
    display: inline-block;
    min-width: 40mm;
    border-bottom: 1px dashed #cbd5e1;
}

/* Encart niveau etude */
.niveau-etude-box {
    border: 0.8px solid #94a3b8;
    padding: 2mm 3mm;
    margin: 2mm 0;
    font-size: 7.5px;
}
.niveau-etude-title {
    font-weight: bold;
    font-size: 8px;
    margin-bottom: 1mm;
}
.niveau-etude-line {
    border-bottom: 1px dashed #cbd5e1;
    height: 4mm;
    margin-bottom: 0.5mm;
}
.niveau-etude-grid {
    margin-top: 1.5mm;
}
.niveau-etude-row {
    display: flex;
    align-items: center;
    margin-bottom: 1mm;
    font-size: 7px;
}
.niveau-checkbox {
    width: 3.5mm;
    height: 3.5mm;
    border: 0.8px solid #64748b;
    margin-right: 2mm;
    flex-shrink: 0;
}
.niveau-right {
    margin-left: auto;
    display: flex;
    align-items: center;
}

/* Legende */
.legend {
    margin: 1.5mm 0 1.5mm 0;
    font-size: 7.5px;
}
.legend-title {
    font-weight: bold;
    color: #64748b;
    margin-bottom: 1mm;
}
.legend-items {
    display: flex;
    gap: 8mm;
    margin-left: 4mm;
}
.legend-item {
    display: flex;
    align-items: center;
    gap: 1.5mm;
}
.legend-checkbox {
    width: 4.5mm;
    height: 4.5mm;
    border: 0.8px solid #64748b;
}

/* Domaine */
.domaine-bandeau {
    color: #fff;
    font-weight: bold;
    font-size: 10px;
    padding: 1.5mm 3mm;
    border-radius: 1.5mm;
    margin-top: 2mm;
    margin-bottom: 1mm;
    text-transform: uppercase;
}

.domaine-mini-bandeau {
    font-weight: bold;
    font-size: 7.5px;
    padding: 1mm 3mm;
    margin-bottom: 0.5mm;
    opacity: 0.85;
}

/* En-tetes colonnes */
.column-headers {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5mm;
    font-size: 6px;
    padding-right: 1mm;
}
.column-header {
    width: ${ptToMm(CHECKBOX_SIZE + 12 * PT_PER_MM)}mm;
    text-align: center;
}

/* Categorie */
.categorie-title {
    font-weight: bold;
    font-size: 8px;
    margin: 1.5mm 0 0.5mm 2mm;
    padding-bottom: 0.5mm;
    border-bottom: 0.4px solid rgba(0,0,0,0.1);
}

/* Competence */
.competence-row {
    display: flex;
    align-items: center;
    min-height: 5.5mm;
    padding: 0.3mm 0;
    font-size: 8px;
}
.competence-row:nth-child(even) {
    background-color: #f8fafc;
}
.competence-label {
    flex: 1;
    padding-left: 3mm;
    padding-right: 2mm;
    color: #334155;
    line-height: 1.2;
}
.competence-cases {
    display: flex;
    flex-shrink: 0;
}
.competence-case-cell {
    width: ${ptToMm(CHECKBOX_SIZE + 12 * PT_PER_MM)}mm;
    display: flex;
    justify-content: center;
    align-items: center;
}
.checkbox {
    width: 4.5mm;
    height: 4.5mm;
    border: 0.8px solid #64748b;
    background: #fff;
}

/* Page number */
.page-number {
    position: absolute;
    bottom: 5mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7px;
    color: #999;
}

@media print {
    body { background: #fff; }
    .page { margin: 0; padding: 12mm 15mm; }
    .no-print { display: none !important; }
}
</style>
</head>
<body>
`

    // --- Premiere page : En-tete ---
    let htmlPageNum = 1
    html += `<div class="page" data-page="${htmlPageNum}">
    <div class="marker marker-tl"></div>
    <div class="marker marker-tr"></div>
    <div class="marker marker-bl"></div>
    <div class="marker marker-br"></div>

    <div class="header-title">POSITIONNEMENT</div>
    <div class="header-subtitle">Formation ACLEF</div>
    <hr class="header-separator">

    <div class="header-fields">
        <div>
            <span class="header-field-label">Apprenant(e) :</span>
            ${meta.apprenant_name
                ? `<span class="header-field-value">${escapeHtml(meta.apprenant_name)}</span>`
                : '<span class="header-field-line"></span>'}
        </div>
        <div>
            <span class="header-field-label">Date :</span>
            ${dateStr
                ? `<span class="header-field-value">${escapeHtml(dateStr)}</span>`
                : '<span class="header-field-line"></span>'}
        </div>
    </div>
    <div class="header-fields">
        <div>
            <span class="header-field-label">Formateur/trice :</span>
            ${meta.formateur
                ? `<span class="header-field-value">${escapeHtml(meta.formateur)}</span>`
                : '<span class="header-field-line"></span>'}
        </div>
        <div>
            <span class="header-field-label">Dispositif :</span>
            ${meta.dispositif
                ? `<span class="header-field-value">${escapeHtml(meta.dispositif)}</span>`
                : '<span class="header-field-line"></span>'}
        </div>
    </div>

    <div class="niveau-etude-box">
        <div class="niveau-etude-title">Niveau d'etude et certification, histoire scolaire</div>
        <div class="niveau-etude-line"></div>
        <div class="niveau-etude-line"></div>
        <div class="niveau-etude-grid">
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:8px; margin-bottom:2mm;">
                <span style="margin-left:5mm;">Derniere classe suivie :</span>
                <span style="margin-right:5mm;">Niveau :</span>
            </div>
            ${[
                ['Primaire, 6e, 5e, 4e, CPA, CPPN, ou CLIPA', '1'],
                ['3e ou premiere annee de CAP ou BEP', '2'],
                ['2de, 1re ens. generale ou 2e annee CAP ou BEP', '3'],
                ['Terminale ou +', '4 et +']
            ].map(([cls, niv]) => `
            <div class="niveau-etude-row">
                <div class="niveau-checkbox"></div>
                <span>${escapeHtml(cls)}</span>
                <div class="niveau-right">
                    <div class="niveau-checkbox"></div>
                    <span style="margin-left:2.5mm;">${escapeHtml(niv)}</span>
                </div>
            </div>`).join('')}
        </div>
    </div>

    <div class="legend">
        <div class="legend-title">Cocher la case correspondante :</div>
        <div class="legend-items">
            ${NIVEAUX.map(n => `
            <div class="legend-item">
                <div class="legend-checkbox"></div>
                <span>= ${escapeHtml(n)}</span>
            </div>`).join('')}
        </div>
    </div>

    <hr class="header-separator">
`

    // --- Contenu : Domaines, categories, competences ---
    // Suivi en mm avec marge de securite (le navigateur rend toujours un peu plus que prevu)
    const CONTENT_H_MM = 257         // 297mm - 24mm padding - 16mm securite navigateur
    const HEADER_USED_MM = 85        // Hauteur reelle de l'en-tete HTML (estimee haute)
    const ROW_MM = 6                 // Hauteur ligne competence (estime haut)
    const DOMAINE_BANDEAU_MM = 9     // Bandeau domaine + colonnes
    const CAT_TITLE_MM = 5           // Titre categorie
    const MINI_HDR_MM = 8            // Mini-header apres saut de page

    let usedMm = HEADER_USED_MM      // Premiere page : espace deja pris par l'en-tete
    let budgetMm = CONTENT_H_MM

    function remainingMm() {
        return budgetMm - usedMm
    }

    function startNewPage() {
        html += `    <div class="page-number">Page ${htmlPageNum}</div>\n</div>\n`
        htmlPageNum++
        html += `<div class="page" data-page="${htmlPageNum}">
    <div class="marker marker-tl"></div>
    <div class="marker marker-tr"></div>
    <div class="marker marker-bl"></div>
    <div class="marker marker-br"></div>\n`
        usedMm = 0
    }

    function addMiniHeader(color, emoji, domaineName) {
        html += `    <div class="domaine-mini-bandeau" style="color: ${color}; background-color: ${color}15;">${escapeHtml(emoji)} ${escapeHtml(domaineName || '')} (suite)</div>\n`
        html += `    <div class="column-headers" style="color: ${color};">\n`
        for (const n of NIVEAUX) {
            html += `        <div class="column-header">${escapeHtml(n)}</div>\n`
        }
        html += `    </div>\n`
        usedMm += MINI_HDR_MM
    }

    for (const domaine of domaines) {
        if (!domaine.categories || domaine.categories.length === 0) continue

        const color = getDomaineColor(domaine.nom)
        const emoji = domaine.emoji || ''

        // Besoin minimum : bandeau + 1 titre categorie + 1 competence
        const minNeeded = DOMAINE_BANDEAU_MM + CAT_TITLE_MM + ROW_MM
        if (remainingMm() < minNeeded) {
            startNewPage()
        }

        // Bandeau domaine
        html += `    <div class="domaine-bandeau" style="background-color: ${color};">${escapeHtml(emoji)}  ${escapeHtml((domaine.nom || '').toUpperCase())}</div>\n`

        // En-tetes colonnes
        html += `    <div class="column-headers" style="color: ${color};">\n`
        for (const n of NIVEAUX) {
            html += `        <div class="column-header">${escapeHtml(n)}</div>\n`
        }
        html += `    </div>\n`
        usedMm += DOMAINE_BANDEAU_MM

        // Categories
        for (const categorie of (domaine.categories || [])) {
            if (!categorie.competences || categorie.competences.length === 0) continue

            // Besoin minimum : titre categorie + 1 competence
            if (remainingMm() < CAT_TITLE_MM + ROW_MM) {
                startNewPage()
                addMiniHeader(color, emoji, domaine.nom)
            }

            // Titre categorie
            html += `    <div class="categorie-title" style="color: ${color};">${escapeHtml(categorie.nom || '')}</div>\n`
            usedMm += CAT_TITLE_MM

            // Competences (ajout une par une, saut de page au besoin)
            for (const comp of (categorie.competences || [])) {
                if (remainingMm() < ROW_MM) {
                    startNewPage()
                    addMiniHeader(color, emoji, domaine.nom)
                }

                html += `    <div class="competence-row">
        <div class="competence-label">${escapeHtml(comp.intitule || '')}</div>
        <div class="competence-cases">
            ${NIVEAUX.map((n, ni) => `<div class="competence-case-cell"><div class="checkbox" data-comp-id="${comp.id}" data-niveau="${ni}" data-comp-code="${escapeHtml(comp.code || '')}" data-comp-intitule="${escapeHtml(comp.intitule || '')}" data-domaine="${escapeHtml(domaine.nom || '')}"></div></div>`).join('\n            ')}
        </div>
    </div>\n`
                usedMm += ROW_MM
            }
        }
    }

    // Fermer la derniere page
    html += `    <div class="page-number">Page ${htmlPageNum}</div>
</div>
</body>
</html>`

    return html
}


/**
 * Formate une date ISO en format francais DD/MM/YYYY.
 * @param {string} dateStr - Date au format ISO (YYYY-MM-DD) ou DD/MM/YYYY
 * @returns {string} Date formatee
 */
function formatDate(dateStr) {
    if (!dateStr) return ''
    if (dateStr.length === 10 && dateStr[4] === '-') {
        const parts = dateStr.split('-')
        return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
}


/**
 * Echappe les caracteres HTML speciaux.
 * @param {string} str - Chaine a echapper
 * @returns {string} Chaine echappee
 */
function escapeHtml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}


/**
 * Ouvre une nouvelle fenetre avec le formulaire HTML et lance l'impression.
 * @param {string} htmlContent - Contenu HTML genere par generatePositionnementForm
 */
export function printForm(htmlContent) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Le navigateur a bloque la fenetre popup. Veuillez autoriser les popups pour ce site.')
        return
    }
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    // Attendre le chargement avant d'imprimer
    printWindow.onload = () => {
        printWindow.print()
    }
}
