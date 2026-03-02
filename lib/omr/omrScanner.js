/**
 * Module OMR (Optical Mark Recognition) pour la lecture de positionnements scannes.
 * Port fidele de omr_scanner.py (Python/OpenCV) en JavaScript/Canvas.
 *
 * Pipeline :
 * 1. Charger le PDF scanne via pdfjs-dist
 * 2. Detecter les 4 marqueurs d'alignement aux coins
 * 3. Calculer la transformation perspective (homographie)
 * 4. Transformer les coordonnees JSON → coordonnees scan
 * 5. Extraire les ROI et calculer les ratios de remplissage
 * 6. Determiner le niveau coche pour chaque competence
 */

// --- Constantes (identiques au Python) ---
const SCAN_DPI = 300
const PDF_POINTS_PER_INCH = 72
const CHECKBOX_FILL_THRESHOLD = 0.15
const AMBIGUITY_THRESHOLD = 0.12
const DARK_PIXEL_THRESHOLD = 160
const STD_DEV_EMPTY_THRESHOLD = 15
const INNER_MARGIN_RATIO = 0.22
const ROI_PIXEL_MARGIN = 2
const MARKER_BINARY_THRESHOLD = 128
const MARKER_CENTROID_THRESHOLD = 100
const EDGE_MARGIN_RATIO = 0.15


// =====================================================
// PDF Loading
// =====================================================

async function loadPdfJs() {
    const pdfjsLib = await import('pdfjs-dist')
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    }
    return pdfjsLib
}

async function renderPageToImageData(pdfDoc, pageNum, scale) {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    await page.render({ canvasContext: ctx, viewport }).promise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    page.cleanup()
    return { imageData, width: canvas.width, height: canvas.height }
}


// =====================================================
// Image Processing Utilities
// =====================================================

function toGray(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Convertit ImageData RGBA en tableau de gris Uint8Array. */
function toGrayscaleArray(imageData) {
    const { data, width, height } = imageData
    const gray = new Uint8Array(width * height)
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4
        gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
    }
    return gray
}

/** Image integrale pour sommes rapides de rectangles. */
function computeIntegralImage(binary, width, height) {
    const integral = new Float64Array(width * height)
    for (let y = 0; y < height; y++) {
        let rowSum = 0
        for (let x = 0; x < width; x++) {
            rowSum += binary[y * width + x]
            integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0)
        }
    }
    return integral
}

/** Somme d'un rectangle [x1,y1]-[x2,y2] via image integrale. */
function integralSum(integral, width, x1, y1, x2, y2) {
    if (x2 < 0 || y2 < 0 || x1 < 0 || y1 < 0) return 0
    const a = integral[y2 * width + x2]
    const b = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0
    const c = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0
    const d = (y1 > 0 && x1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0
    return a - b - c + d
}


// =====================================================
// Marker Detection (port de _detect_markers Python)
// =====================================================

/**
 * Detecte un marqueur dans une region de l'image.
 * Utilise une fenetre glissante sur l'image integrale pour trouver
 * le carre le plus rempli de la taille attendue.
 */
function findMarkerInRegion(integral, gray, width, height, rx, ry, rw, rh, markerPx) {
    const step = Math.max(1, Math.floor(markerPx / 4))
    let bestX = -1, bestY = -1, bestSum = 0
    const minFill = markerPx * markerPx * 0.4 // Au moins 40% rempli

    for (let y = ry; y <= ry + rh - markerPx; y += step) {
        for (let x = rx; x <= rx + rw - markerPx; x += step) {
            const x2 = Math.min(x + markerPx - 1, width - 1)
            const y2 = Math.min(y + markerPx - 1, height - 1)
            const sum = integralSum(integral, width, x, y, x2, y2)
            if (sum > bestSum) {
                bestSum = sum
                bestX = x
                bestY = y
            }
        }
    }

    if (bestX < 0 || bestSum < minFill) return null

    // Affiner avec le centroide des pixels sombres (comme Python)
    let cx = 0, cy = 0, count = 0
    const pad = Math.floor(markerPx * 0.3)
    const sx = Math.max(0, bestX - pad)
    const sy = Math.max(0, bestY - pad)
    const ex = Math.min(width - 1, bestX + markerPx + pad)
    const ey = Math.min(height - 1, bestY + markerPx + pad)

    for (let y = sy; y <= ey; y++) {
        for (let x = sx; x <= ex; x++) {
            if (gray[y * width + x] < MARKER_CENTROID_THRESHOLD) {
                cx += x
                cy += y
                count++
            }
        }
    }

    if (count < markerPx * markerPx * 0.2) return null
    return { x: cx / count, y: cy / count }
}

/**
 * Detecte les 4 marqueurs d'alignement dans l'image scannee.
 * Port de OMRScanner._detect_markers (Python).
 */
function detectMarkers(imageData, markerSizePts, scale) {
    const gray = toGrayscaleArray(imageData)
    const { width, height } = imageData

    // Binariser (1 = sombre, 0 = clair)
    const binary = new Uint8Array(width * height)
    for (let i = 0; i < gray.length; i++) {
        binary[i] = gray[i] < MARKER_BINARY_THRESHOLD ? 1 : 0
    }
    const integral = computeIntegralImage(binary, width, height)

    const markerPx = Math.round(markerSizePts * scale)
    const edgeX = Math.floor(width * EDGE_MARGIN_RATIO)
    const edgeY = Math.floor(height * EDGE_MARGIN_RATIO)

    const corners = {}

    const tl = findMarkerInRegion(integral, gray, width, height, 0, 0, edgeX, edgeY, markerPx)
    if (tl) corners.top_left = [tl.x, tl.y]

    const tr = findMarkerInRegion(integral, gray, width, height, width - edgeX, 0, edgeX, edgeY, markerPx)
    if (tr) corners.top_right = [tr.x, tr.y]

    const bl = findMarkerInRegion(integral, gray, width, height, 0, height - edgeY, edgeX, edgeY, markerPx)
    if (bl) corners.bottom_left = [bl.x, bl.y]

    const br = findMarkerInRegion(integral, gray, width, height, width - edgeX, height - edgeY, edgeX, edgeY, markerPx)
    if (br) corners.bottom_right = [br.x, br.y]

    // Reconstruction du 4e marqueur si 3 detectes (port de _recover_fourth_marker)
    const found = Object.keys(corners)
    if (found.length === 3) {
        const all = ['top_left', 'top_right', 'bottom_left', 'bottom_right']
        const missing = all.find(k => !corners[k])
        // D = A + C - B (parallelogramme)
        if (missing === 'top_left') {
            corners.top_left = [
                corners.bottom_left[0] + corners.top_right[0] - corners.bottom_right[0],
                corners.bottom_left[1] + corners.top_right[1] - corners.bottom_right[1]
            ]
        } else if (missing === 'top_right') {
            corners.top_right = [
                corners.top_left[0] + corners.bottom_right[0] - corners.bottom_left[0],
                corners.top_left[1] + corners.bottom_right[1] - corners.bottom_left[1]
            ]
        } else if (missing === 'bottom_left') {
            corners.bottom_left = [
                corners.top_left[0] + corners.bottom_right[0] - corners.top_right[0],
                corners.top_left[1] + corners.bottom_right[1] - corners.top_right[1]
            ]
        } else {
            corners.bottom_right = [
                corners.top_right[0] + corners.bottom_left[0] - corners.top_left[0],
                corners.top_right[1] + corners.bottom_left[1] - corners.top_left[1]
            ]
        }
    }

    return corners
}

/**
 * Calcule les centres attendus des marqueurs en pixels image.
 * Port de _compute_expected_markers (Python).
 */
function computeExpectedMarkerCenters(markersJson, scale, pageHeight) {
    const ms = markersJson.marker_size
    const expected = {}
    for (const name of ['top_left', 'top_right', 'bottom_left', 'bottom_right']) {
        const mx = markersJson[name].x
        const my = markersJson[name].y
        // Centre du marqueur en PDF : coin + size/2, y - size/2
        const cxPdf = mx + ms / 2
        const cyPdf = my - ms / 2
        // Conversion en pixels image (y inverse)
        expected[name] = [cxPdf * scale, (pageHeight - cyPdf) * scale]
    }
    return expected
}


// =====================================================
// Homography (port de _compute_transform Python)
// =====================================================

/**
 * Resout un systeme lineaire 8x8 pour la transformation perspective.
 * Mappe 4 points source vers 4 points destination.
 * Retourne les 9 coefficients de la matrice 3x3 H.
 */
function solveHomography(src, dst) {
    // Construire la matrice augmentee 8x9
    const A = []
    for (let i = 0; i < 4; i++) {
        const [sx, sy] = src[i]
        const [dx, dy] = dst[i]
        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx])
        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy])
    }

    // Elimination de Gauss avec pivot partiel
    const n = 8
    for (let col = 0; col < n; col++) {
        let maxVal = Math.abs(A[col][col])
        let maxRow = col
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(A[row][col]) > maxVal) {
                maxVal = Math.abs(A[row][col])
                maxRow = row
            }
        }
        if (maxVal < 1e-10) return null
        if (maxRow !== col) [A[col], A[maxRow]] = [A[maxRow], A[col]]

        for (let row = col + 1; row < n; row++) {
            const factor = A[row][col] / A[col][col]
            for (let j = col; j <= n; j++) {
                A[row][j] -= factor * A[col][j]
            }
        }
    }

    // Substitution arriere
    const h = new Array(8)
    for (let row = n - 1; row >= 0; row--) {
        h[row] = A[row][n]
        for (let col = row + 1; col < n; col++) {
            h[row] -= A[row][col] * h[col]
        }
        h[row] /= A[row][row]
    }

    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

/**
 * Applique la transformation perspective a un point.
 * H = [h0..h8] → matrice 3x3 [[h0,h1,h2],[h3,h4,h5],[h6,h7,h8]]
 */
function transformPoint(H, x, y) {
    const w = H[6] * x + H[7] * y + H[8]
    if (Math.abs(w) < 1e-10) return { x, y }
    return {
        x: (H[0] * x + H[1] * y + H[2]) / w,
        y: (H[3] * x + H[4] * y + H[5]) / w
    }
}

/**
 * Inverse une matrice 3x3 (pour inverser l'homographie).
 */
function invertHomography(H) {
    const [a, b, c, d, e, f, g, h, i] = H
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    if (Math.abs(det) < 1e-10) return null
    const invDet = 1 / det
    return [
        (e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet,
        (f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet,
        (d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet
    ]
}


// =====================================================
// Fill Ratio (port de _compute_fill_ratio Python)
// =====================================================

function computeFillRatio(imageData, roiX, roiY, roiW, roiH) {
    const data = imageData.data
    const imgWidth = imageData.width
    const imgHeight = imageData.height

    const x0 = Math.max(0, Math.floor(roiX))
    const y0 = Math.max(0, Math.floor(roiY))
    const x1 = Math.min(imgWidth, Math.floor(roiX + roiW))
    const y1 = Math.min(imgHeight, Math.floor(roiY + roiH))

    const actualW = x1 - x0
    const actualH = y1 - y0
    if (actualW <= 0 || actualH <= 0) return 0

    const mx = Math.max(2, Math.floor(actualW * INNER_MARGIN_RATIO))
    const my = Math.max(2, Math.floor(actualH * INNER_MARGIN_RATIO))

    const innerX0 = x0 + mx
    const innerY0 = y0 + my
    const innerX1 = x1 - mx
    const innerY1 = y1 - my
    if (innerX1 <= innerX0 || innerY1 <= innerY0) return 0

    let darkCount = 0, totalPixels = 0, sum = 0, sumSq = 0

    for (let py = innerY0; py < innerY1; py++) {
        for (let px = innerX0; px < innerX1; px++) {
            const idx = (py * imgWidth + px) * 4
            const gray = toGray(data[idx], data[idx + 1], data[idx + 2])
            sum += gray
            sumSq += gray * gray
            if (gray < DARK_PIXEL_THRESHOLD) darkCount++
            totalPixels++
        }
    }

    if (totalPixels === 0) return 0

    const mean = sum / totalPixels
    const variance = (sumSq / totalPixels) - (mean * mean)
    const stdDev = Math.sqrt(Math.max(0, variance))
    if (stdDev < STD_DEV_EMPTY_THRESHOLD) return 0

    return darkCount / totalPixels
}


// =====================================================
// Competence Analysis (port de _analyze_competence Python)
// =====================================================

/**
 * Analyse une competence par COMPARAISON RELATIVE entre ses 3 cases.
 *
 * Principe : les 3 cases vides sont identiques (meme bordure, meme fond).
 * Celle qui a ete cochee a PLUS de pixels sombres que les autres.
 * On compare les ratios entre eux, pas contre un seuil absolu.
 * C'est l'equivalent de "comparer le PDF vierge au PDF rempli" :
 * les cases non cochees = reference, la case cochee = difference.
 */
function analyzeCompetence(competenceId, casesWithRatios) {
    const sorted = [...casesWithRatios].sort(
        (a, b) => a.caseData.niveau_index - b.caseData.niveau_index
    )
    const ratios = sorted.map(c => c.ratio)

    const firstCase = sorted.length > 0 ? sorted[0].caseData : {}
    const baseInfo = {
        competence_id: competenceId,
        competence_code: firstCase.competence_code || '',
        competence_intitule: firstCase.competence_intitule || '',
        domaine: firstCase.domaine || '',
        fill_ratios: ratios
    }

    if (ratios.length === 0) {
        return { ...baseInfo, detected_niveau: null, confidence: 'none', status: 'empty' }
    }

    // Trouver le max et calculer la "baseline" (moyenne des autres)
    const maxRatio = Math.max(...ratios)
    const maxIndex = ratios.indexOf(maxRatio)
    const others = ratios.filter((_, i) => i !== maxIndex)
    const otherMax = others.length > 0 ? Math.max(...others) : 0
    const otherMean = others.length > 0 ? others.reduce((s, v) => s + v, 0) / others.length : 0

    // L'ecart entre la case la plus remplie et les autres
    const gapVsMax = maxRatio - otherMax
    const gapVsMean = maxRatio - otherMean

    // Cas 1 : toutes les cases sont quasi identiques (vides ou bruit uniforme)
    // → rien n'est coche
    if (maxRatio < 0.02 || gapVsMean < 0.02) {
        return { ...baseInfo, detected_niveau: null, confidence: 'none', status: 'empty' }
    }

    // Cas 2 : une case se demarque nettement (ecart > 0.05 ou 2x la baseline)
    // → detection sure
    if (gapVsMax > 0.05 || (maxRatio > 0.05 && maxRatio > otherMax * 2)) {
        const confidence = gapVsMax > 0.10 ? 'high' : 'medium'
        return { ...baseInfo, detected_niveau: maxIndex, confidence, status: 'ok' }
    }

    // Cas 3 : une case a un peu plus que les autres mais pas beaucoup
    // → detection probable mais ambigue
    if (gapVsMean > 0.03) {
        return { ...baseInfo, detected_niveau: maxIndex, confidence: 'low', status: 'ambiguous' }
    }

    // Cas 4 : pas de difference significative
    return { ...baseInfo, detected_niveau: null, confidence: 'none', status: 'empty' }
}


// =====================================================
// Validation
// =====================================================

function validateJson(data) {
    const required = ['page_size', 'markers', 'cases']
    for (const key of required) {
        if (!(key in data)) throw new Error(`Cle manquante dans le JSON : '${key}'`)
    }
    if (!data.cases || data.cases.length === 0) throw new Error('Le JSON ne contient aucune case')
    if (!data.page_size.width || !data.page_size.height) throw new Error('page_size doit contenir width et height')
    if (!data.markers.marker_size) throw new Error('markers doit contenir marker_size')
    return data
}


// =====================================================
// Main OMR Function
// =====================================================

/**
 * Scan OMR complet : PDF scanne + JSON coordonnees → evaluations detectees.
 *
 * Pipeline identique au Python :
 * 1. Charger et rendre le PDF
 * 2. Detecter les marqueurs d'alignement
 * 3. Calculer l'homographie (transformation perspective)
 * 4. Transformer chaque coordonnee de case
 * 5. Extraire les ROI et calculer les ratios
 * 6. Determiner les niveaux par competence
 */
export async function scanOMR(pdfFile, coordsJson, onProgress = null) {
    const coords = validateJson(coordsJson)
    const pageSize = coords.page_size
    const cases = coords.cases
    const scale = SCAN_DPI / PDF_POINTS_PER_INCH
    const errors = []

    // Charger le PDF
    if (onProgress) onProgress(0.05)
    const pdfjsLib = await loadPdfJs()
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const numPages = pdfDoc.numPages
    if (onProgress) onProgress(0.1)

    // Grouper les cases par page
    const casesByPage = {}
    for (const c of cases) {
        if (!casesByPage[c.page]) casesByPage[c.page] = []
        casesByPage[c.page].push(c)
    }

    // Calculer les positions attendues des marqueurs (en pixels image ideale)
    const expectedMarkers = computeExpectedMarkerCenters(coords.markers, scale, pageSize.height)

    const allCaseRatios = []
    const pageNums = Object.keys(casesByPage).map(Number).sort((a, b) => a - b)

    for (let i = 0; i < pageNums.length; i++) {
        const pageNum = pageNums[i]
        if (pageNum > numPages) {
            errors.push(`Page ${pageNum} absente du scan (PDF n'a que ${numPages} pages)`)
            continue
        }

        if (onProgress) onProgress(0.1 + (i / pageNums.length) * 0.6)

        // Rendre la page
        let pageData
        try {
            pageData = await renderPageToImageData(pdfDoc, pageNum, scale)
        } catch (err) {
            errors.push(`Erreur rendu page ${pageNum}: ${err.message}`)
            continue
        }

        const { imageData } = pageData

        // --- ALIGNEMENT : detecter les marqueurs et calculer la transformation ---
        let H_inv = null // Homographie inverse : ideal → scan
        try {
            const detected = detectMarkers(imageData, coords.markers.marker_size, scale)
            const detectedCount = Object.keys(detected).length

            console.log(`[OMR] Page ${pageNum}: ${detectedCount} marqueurs detectes`, detected)
            console.log(`[OMR] Page ${pageNum}: marqueurs attendus`, expectedMarkers)
            console.log(`[OMR] Page ${pageNum}: image ${imageData.width}x${imageData.height}px`)

            if (detectedCount >= 4) {
                // 4 marqueurs : homographie perspective
                const srcPts = ['top_left', 'top_right', 'bottom_right', 'bottom_left']
                    .map(k => expectedMarkers[k])
                const dstPts = ['top_left', 'top_right', 'bottom_right', 'bottom_left']
                    .map(k => detected[k])

                const H = solveHomography(srcPts, dstPts)
                if (H) {
                    H_inv = H
                    console.log(`[OMR] Page ${pageNum}: homographie OK`)
                }
            } else if (detectedCount >= 2) {
                // 2-3 marqueurs : transformation affine simplifiee
                const common = Object.keys(detected).filter(k => expectedMarkers[k])
                if (common.length >= 2) {
                    // Calculer echelle + rotation + translation depuis 2 points
                    const [k1, k2] = common
                    const s1 = expectedMarkers[k1], s2 = expectedMarkers[k2]
                    const d1 = detected[k1], d2 = detected[k2]

                    const svx = s2[0] - s1[0], svy = s2[1] - s1[1]
                    const dvx = d2[0] - d1[0], dvy = d2[1] - d1[1]
                    const sLen = Math.sqrt(svx * svx + svy * svy)
                    const dLen = Math.sqrt(dvx * dvx + dvy * dvy)

                    if (sLen > 1 && dLen > 1) {
                        const scaleFactor = dLen / sLen
                        const sAngle = Math.atan2(svy, svx)
                        const dAngle = Math.atan2(dvy, dvx)
                        const angle = dAngle - sAngle
                        const cosA = scaleFactor * Math.cos(angle)
                        const sinA = scaleFactor * Math.sin(angle)
                        const tx = d1[0] - (cosA * s1[0] - sinA * s1[1])
                        const ty = d1[1] - (sinA * s1[0] + cosA * s1[1])

                        // Matrice affine encodee comme homographie
                        H_inv = [cosA, -sinA, tx, sinA, cosA, ty, 0, 0, 1]
                    }
                }
                errors.push(`Page ${pageNum}: ${detectedCount} marqueurs (affine)`)
            } else {
                errors.push(`Page ${pageNum}: ${detectedCount} marqueur(s), pas d'alignement`)
            }
        } catch (err) {
            errors.push(`Page ${pageNum}: erreur alignement: ${err.message}`)
        }

        // Analyser chaque case sur cette page
        const pageCases = casesByPage[pageNum]
        for (const caseData of pageCases) {
            // Coordonnees ideales de la case en pixels image
            const imgX = caseData.x * scale
            const imgY = (pageSize.height - caseData.y - caseData.height) * scale
            const imgW = caseData.width * scale
            const imgH = caseData.height * scale

            let finalX, finalY, finalW, finalH

            if (H_inv) {
                // Transformer le centre de la case vers les coordonnees scan
                const centerIdeal = { x: imgX + imgW / 2, y: imgY + imgH / 2 }
                const centerScan = transformPoint(H_inv, centerIdeal.x, centerIdeal.y)
                finalX = centerScan.x - imgW / 2 - ROI_PIXEL_MARGIN
                finalY = centerScan.y - imgH / 2 - ROI_PIXEL_MARGIN
                finalW = imgW + ROI_PIXEL_MARGIN * 2
                finalH = imgH + ROI_PIXEL_MARGIN * 2
            } else {
                // Pas d'alignement : utiliser les coordonnees directes (fallback)
                finalX = imgX - ROI_PIXEL_MARGIN
                finalY = imgY - ROI_PIXEL_MARGIN
                finalW = imgW + ROI_PIXEL_MARGIN * 2
                finalH = imgH + ROI_PIXEL_MARGIN * 2
            }

            const ratio = computeFillRatio(imageData, finalX, finalY, finalW, finalH)
            allCaseRatios.push({ caseData, ratio })
        }
    }

    if (onProgress) onProgress(0.85)

    // Log des premiers ratios pour diagnostic
    const first10 = allCaseRatios.slice(0, 12)
    console.log('[OMR] Premiers ratios:', first10.map(cr =>
        `${cr.caseData.competence_intitule?.substring(0, 25)} [niv${cr.caseData.niveau_index}] = ${(cr.ratio * 100).toFixed(1)}%`
    ))

    // Grouper par competence et analyser
    const competenceGroups = {}
    for (const cr of allCaseRatios) {
        const compId = cr.caseData.competence_id
        if (!competenceGroups[compId]) competenceGroups[compId] = []
        competenceGroups[compId].push(cr)
    }

    const competenceResults = {}
    for (const [compId, group] of Object.entries(competenceGroups)) {
        competenceResults[compId] = analyzeCompetence(compId, group)
    }

    if (onProgress) onProgress(0.95)
    await pdfDoc.destroy()

    const resultValues = Object.values(competenceResults)
    if (onProgress) onProgress(1.0)

    return {
        meta: coords.meta || {},
        competenceResults,
        errors,
        totalCompetences: resultValues.length,
        detectedCount: resultValues.filter(r => r.status === 'ok').length,
        emptyCount: resultValues.filter(r => r.status === 'empty').length,
        ambiguousCount: resultValues.filter(r => r.status === 'ambiguous').length
    }
}


// =====================================================
// Exports utilitaires
// =====================================================

export function getEvaluationsFromResults(competenceResults) {
    const NIVEAU_MAP = { 0: 'non_acquis', 1: 'en_cours', 2: 'acquis' }
    const evaluations = {}
    for (const [compId, analysis] of Object.entries(competenceResults)) {
        if (analysis.detected_niveau !== null && analysis.detected_niveau !== undefined) {
            evaluations[compId] = NIVEAU_MAP[analysis.detected_niveau] || 'non_acquis'
        }
    }
    return evaluations
}

export const NIVEAUX = ['Non acquis', 'En cours', 'Acquis']
export const NIVEAU_INDEX_TO_DB = { 0: 'non_acquis', 1: 'en_cours', 2: 'acquis' }
export const NIVEAU_DB_TO_INDEX = { 'non_acquis': 0, 'en_cours': 1, 'acquis': 2 }
