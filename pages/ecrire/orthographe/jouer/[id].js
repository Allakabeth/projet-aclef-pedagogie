import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

const NIVEAU_COLORS = { A: '#10b981', B: '#f59e0b', C: '#ef4444' }

export default function JouerOrthographe() {
    const router = useRouter()
    const { id } = router.query
    const [user, setUser] = useState(null)
    const [exercice, setExercice] = useState(null)
    const [loading, setLoading] = useState(true)
    const [reponses, setReponses] = useState({})
    const [resultat, setResultat] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const startTime = useRef(Date.now())

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login'); return }
        if (id) loadExercice(token)
    }, [router, id])

    async function loadExercice(token) {
        try {
            setLoading(true)
            const res = await fetch(`/api/orthographe/exercice/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Exercice introuvable')
            const data = await res.json()
            setExercice(data.exercice || data)
            startTime.current = Date.now()
        } catch (err) {
            alert('Erreur : ' + err.message)
            router.push('/ecrire/orthographe')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit() {
        try {
            setSubmitting(true)
            const token = localStorage.getItem('token')
            const duree = Math.round((Date.now() - startTime.current) / 1000)

            const res = await fetch('/api/orthographe/soumettre', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ exercice_id: id, reponses, duree_secondes: duree })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erreur')
            }

            const data = await res.json()
            setResultat(data)
        } catch (err) {
            alert('Erreur : ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    function handleRejouer() {
        setReponses({})
        setResultat(null)
        startTime.current = Date.now()
    }

    if (loading) return <div style={styles.loadingScreen}>Chargement...</div>
    if (!exercice || !user) return null

    // Écran de résultat
    if (resultat) {
        const emoji = resultat.score >= 80 ? '🎉' : resultat.score >= 50 ? '👍' : '💪'
        const message = resultat.score >= 80 ? 'Excellent !' : resultat.score >= 50 ? 'Bien joué !' : 'Continue !'
        return (
            <div style={styles.container}>
                <div style={styles.resultCard}>
                    <div style={{ fontSize: '64px', marginBottom: '8px' }}>{emoji}</div>
                    <div style={styles.resultMessage}>{message}</div>
                    <div style={styles.resultScore}>{resultat.score}%</div>
                    <div style={styles.resultDetail}>
                        {resultat.bonnes} bonne{resultat.bonnes > 1 ? 's' : ''} réponse{resultat.bonnes > 1 ? 's' : ''} sur {resultat.total}
                    </div>

                    {/* Corrections détaillées */}
                    <div style={styles.corrections}>
                        {(resultat.details || []).map((d, i) => (
                            <div key={i} style={{
                                ...styles.correctionRow,
                                backgroundColor: d.correct ? '#f0fdf4' : '#fef2f2'
                            }}>
                                <span style={{ fontSize: '18px' }}>{d.correct ? '✅' : '❌'}</span>
                                <div style={{ flex: 1 }}>
                                    {!d.correct && (
                                        <div>
                                            {d.donne && <span style={styles.corrWrong}>{d.donne}</span>}
                                            {' → '}
                                            <span style={styles.corrRight}>{d.attendu}</span>
                                        </div>
                                    )}
                                    {d.correct && <span style={styles.corrRight}>{d.attendu || d.donne}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={styles.resultActions}>
                        <button onClick={handleRejouer} style={styles.replayBtn}>
                            Rejouer
                        </button>
                        <button onClick={() => router.push(`/ecrire/orthographe/${exercice.theme_grammatical}`)} style={styles.nextBtn}>
                            Autre exercice →
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={{
                    ...styles.niveauBadge,
                    backgroundColor: NIVEAU_COLORS[exercice.niveau] || '#8b5cf6'
                }}>{exercice.niveau}</span>
                <h1 style={styles.title}>{exercice.titre}</h1>
            </div>

            {exercice.consigne && (
                <div style={styles.consigne}>{exercice.consigne}</div>
            )}

            {/* Rendu selon le type */}
            {exercice.type === 'fill_blank' && <FillBlankPlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}
            {exercice.type === 'binary_choice' && <BinaryChoicePlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}
            {exercice.type === 'ordering' && <OrderingPlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}
            {exercice.type === 'matching' && <MatchingPlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}
            {exercice.type === 'classification' && <ClassificationPlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}
            {exercice.type === 'transformation' && <TransformationPlayer contenu={exercice.contenu} reponses={reponses} setReponses={setReponses} />}

            <div style={styles.submitBar}>
                <button onClick={() => router.push(`/ecrire/orthographe/${exercice.theme_grammatical}`)} style={styles.quitBtn}>
                    ← Quitter
                </button>
                <button onClick={handleSubmit} disabled={submitting} style={styles.submitBtn}>
                    {submitting ? 'Envoi...' : 'Valider mes réponses ✅'}
                </button>
            </div>
        </div>
    )
}

// ============================================================
// FILL BLANK — Texte à trous avec boutons-pills
// ============================================================
function FillBlankPlayer({ contenu, reponses, setReponses }) {
    const options = contenu.options || []
    const phrases = contenu.phrases || []

    return (
        <div>
            <div style={styles.optionsPills}>
                {options.filter(o => o).map(opt => (
                    <span key={opt} style={styles.optionPill}>{opt}</span>
                ))}
            </div>
            {phrases.map((phrase, i) => (
                <div key={i} style={styles.phraseContainer}>
                    <span style={styles.phraseText}>{phrase.avant} </span>
                    <div style={styles.pillGroup}>
                        {options.filter(o => o).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setReponses({ ...reponses, [i]: opt })}
                                style={{
                                    ...styles.pillBtn,
                                    backgroundColor: reponses[i] === opt ? '#8b5cf6' : '#fff',
                                    color: reponses[i] === opt ? '#fff' : '#374151',
                                    borderColor: reponses[i] === opt ? '#8b5cf6' : '#d1d5db'
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    <span style={styles.phraseText}> {phrase.apres}</span>
                </div>
            ))}
        </div>
    )
}

// ============================================================
// BINARY CHOICE — Choix inline dans la phrase
// ============================================================
function BinaryChoicePlayer({ contenu, reponses, setReponses }) {
    const phrases = contenu.phrases || []

    return (
        <div>
            {phrases.map((phrase, pi) => (
                <div key={pi} style={styles.phraseContainer}>
                    {(phrase.segments || []).map((seg, si) => {
                        if (seg.type === 'text') {
                            return <span key={si} style={styles.phraseText}>{seg.value}</span>
                        }
                        const key = `${pi}_${si}`
                        return (
                            <span key={si} style={styles.pillGroup}>
                                {(seg.options || []).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setReponses({ ...reponses, [key]: opt })}
                                        style={{
                                            ...styles.pillBtn,
                                            backgroundColor: reponses[key] === opt ? '#8b5cf6' : '#fff',
                                            color: reponses[key] === opt ? '#fff' : '#374151',
                                            borderColor: reponses[key] === opt ? '#8b5cf6' : '#d1d5db'
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </span>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

// ============================================================
// ORDERING — Remettre les mots en ordre (tap pour placer)
// ============================================================
function OrderingPlayer({ contenu, reponses, setReponses }) {
    const phrases = contenu.phrases || []

    // Pour chaque phrase, on maintient l'ordre choisi par l'utilisateur
    // reponses[pi] = [indices dans l'ordre choisi]

    function getShuffled(mots, pi) {
        // Mélange déterministe basé sur l'index
        const indices = mots.map((_, i) => i)
        // Simple shuffle
        const shuffled = [...indices]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = (pi * 7 + i * 13) % (i + 1)
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    return (
        <div>
            {phrases.map((phrase, pi) => {
                const mots = phrase.mots || []
                const choisis = reponses[pi] || []
                const shuffled = getShuffled(mots, pi)
                const restants = shuffled.filter(idx => !choisis.includes(idx))

                return (
                    <div key={pi} style={styles.orderingBlock}>
                        {/* Zone de réponse */}
                        <div style={styles.orderingAnswer}>
                            {choisis.length === 0 && (
                                <span style={styles.orderingPlaceholder}>Touche les mots dans l'ordre</span>
                            )}
                            {choisis.map((idx, pos) => (
                                <button
                                    key={pos}
                                    onClick={() => {
                                        // Retirer ce mot
                                        const newChoisis = choisis.filter((_, p) => p !== pos)
                                        setReponses({ ...reponses, [pi]: newChoisis })
                                    }}
                                    style={styles.orderingChosen}
                                >
                                    {mots[idx]}
                                </button>
                            ))}
                        </div>

                        {/* Mots disponibles */}
                        <div style={styles.orderingPool}>
                            {restants.map(idx => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setReponses({ ...reponses, [pi]: [...choisis, idx] })
                                    }}
                                    style={styles.orderingWord}
                                >
                                    {mots[idx]}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ============================================================
// MATCHING — Relier des paires (tap gauche puis tap droite)
// ============================================================
function MatchingPlayer({ contenu, reponses, setReponses }) {
    const pairs = contenu.pairs || []
    const [selectedLeft, setSelectedLeft] = useState(null)

    // Mélanger la colonne de droite
    const rightsShuffled = [...pairs].map(p => p.right)
        .sort((a, b) => a.length - b.length) // Simple tri différent de l'ordre original

    function handleRightClick(rightValue) {
        if (selectedLeft === null) return
        setReponses({ ...reponses, [selectedLeft]: rightValue })
        setSelectedLeft(null)
    }

    return (
        <div>
            <p style={styles.matchHint}>1. Touche un mot à gauche, puis son correspondant à droite</p>
            <div style={styles.matchGrid}>
                <div style={styles.matchCol}>
                    {pairs.map((pair, i) => {
                        const matched = reponses[pair.left] !== undefined
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedLeft(pair.left)}
                                style={{
                                    ...styles.matchItem,
                                    borderColor: selectedLeft === pair.left ? '#8b5cf6' : matched ? '#10b981' : '#d1d5db',
                                    backgroundColor: selectedLeft === pair.left ? '#f5f3ff' : matched ? '#f0fdf4' : '#fff'
                                }}
                            >
                                {pair.left}
                                {matched && <span style={styles.matchLink}> → {reponses[pair.left]}</span>}
                            </button>
                        )
                    })}
                </div>
                <div style={styles.matchCol}>
                    {rightsShuffled.map((right, i) => {
                        const used = Object.values(reponses).includes(right)
                        return (
                            <button
                                key={i}
                                onClick={() => handleRightClick(right)}
                                disabled={!selectedLeft}
                                style={{
                                    ...styles.matchItem,
                                    opacity: used ? 0.4 : 1,
                                    cursor: selectedLeft ? 'pointer' : 'default',
                                    borderColor: used ? '#10b981' : '#d1d5db'
                                }}
                            >
                                {right}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ============================================================
// CLASSIFICATION — Trier dans des catégories (tap)
// ============================================================
function ClassificationPlayer({ contenu, reponses, setReponses }) {
    const categories = (contenu.categories || []).filter(c => c)
    const items = contenu.items || []
    const [selectedItem, setSelectedItem] = useState(null)

    function handleCatClick(cat) {
        if (!selectedItem) return
        setReponses({ ...reponses, [selectedItem]: cat })
        setSelectedItem(null)
    }

    return (
        <div>
            <p style={styles.matchHint}>1. Touche un mot, puis touche sa catégorie</p>

            {/* Catégories */}
            <div style={styles.catGrid}>
                {categories.map(cat => {
                    const assigned = items.filter(item => reponses[item.text] === cat)
                    return (
                        <button
                            key={cat}
                            onClick={() => handleCatClick(cat)}
                            style={{
                                ...styles.catBox,
                                borderColor: selectedItem ? '#8b5cf6' : '#d1d5db'
                            }}
                        >
                            <div style={styles.catTitle}>{cat}</div>
                            <div style={styles.catItems}>
                                {assigned.map(item => (
                                    <span key={item.text} style={styles.catAssigned}>{item.text}</span>
                                ))}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Items à classer */}
            <div style={styles.classItems}>
                {items.map(item => {
                    const classified = reponses[item.text] !== undefined
                    return (
                        <button
                            key={item.text}
                            onClick={() => {
                                if (classified) {
                                    // Retirer
                                    const newR = { ...reponses }
                                    delete newR[item.text]
                                    setReponses(newR)
                                } else {
                                    setSelectedItem(item.text)
                                }
                            }}
                            style={{
                                ...styles.classItem,
                                backgroundColor: selectedItem === item.text ? '#8b5cf6' : classified ? '#e2e8f0' : '#fff',
                                color: selectedItem === item.text ? '#fff' : classified ? '#94a3b8' : '#374151',
                                borderColor: selectedItem === item.text ? '#8b5cf6' : '#d1d5db',
                                textDecoration: classified ? 'line-through' : 'none'
                            }}
                        >
                            {item.text}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ============================================================
// TRANSFORMATION — Transformer selon un modèle
// ============================================================
function TransformationPlayer({ contenu, reponses, setReponses }) {
    const modele = contenu.modele || {}
    const phrases = contenu.phrases || []

    return (
        <div>
            {/* Modèle */}
            <div style={styles.modeleBox}>
                <div style={styles.modeleLabel}>Modèle :</div>
                <div style={styles.modeleText}>
                    {modele.avant} <span style={styles.modeleArrow}>→</span> {modele.apres}
                </div>
            </div>

            {/* Phrases à transformer */}
            {phrases.map((phrase, i) => (
                <div key={i} style={styles.transRow}>
                    <div style={styles.transOriginal}>{phrase.originale}</div>
                    <span style={styles.transArrow}>→</span>
                    <input
                        value={reponses[i] || ''}
                        onChange={(e) => setReponses({ ...reponses, [i]: e.target.value })}
                        placeholder="Écris ta réponse"
                        style={styles.transInput}
                    />
                </div>
            ))}
        </div>
    )
}

// ============================================================
// STYLES
// ============================================================
const styles = {
    loadingScreen: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial', fontSize: '18px', color: '#888'
    },
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8f6ff',
        padding: 'clamp(16px, 4vw, 32px)',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '750px',
        margin: '0 auto'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
    },
    niveauBadge: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '6px 14px',
        borderRadius: '20px'
    },
    title: {
        fontSize: 'clamp(20px, 5vw, 28px)',
        fontWeight: 'bold',
        color: '#1e293b',
        margin: 0
    },
    consigne: {
        fontSize: 'clamp(15px, 3.5vw, 18px)',
        color: '#7c3aed',
        backgroundColor: '#f5f3ff',
        padding: '12px 16px',
        borderRadius: '12px',
        marginBottom: '24px',
        fontWeight: '500'
    },

    // Fill blank
    optionsPills: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        justifyContent: 'center'
    },
    optionPill: {
        padding: '6px 16px',
        backgroundColor: '#ede9fe',
        color: '#7c3aed',
        borderRadius: '20px',
        fontSize: 'clamp(14px, 3vw, 16px)',
        fontWeight: '600'
    },
    phraseContainer: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '14px 16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        marginBottom: '10px',
        border: '1px solid #e9e5f5'
    },
    phraseText: {
        fontSize: 'clamp(16px, 3.5vw, 19px)',
        color: '#1e293b'
    },
    pillGroup: { display: 'inline-flex', gap: '6px', flexWrap: 'wrap' },
    pillBtn: {
        padding: 'clamp(8px, 2vw, 12px) clamp(14px, 3vw, 20px)',
        border: '2px solid',
        borderRadius: '25px',
        fontSize: 'clamp(14px, 3vw, 17px)',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },

    // Ordering
    orderingBlock: {
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '14px',
        border: '1px solid #e9e5f5'
    },
    orderingAnswer: {
        minHeight: '50px',
        padding: '10px',
        backgroundColor: '#f5f3ff',
        borderRadius: '10px',
        marginBottom: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center'
    },
    orderingPlaceholder: {
        color: '#94a3b8',
        fontSize: 'clamp(13px, 2.5vw, 15px)',
        fontStyle: 'italic'
    },
    orderingChosen: {
        padding: '8px 16px',
        backgroundColor: '#8b5cf6',
        color: '#fff',
        border: 'none',
        borderRadius: '20px',
        fontSize: 'clamp(14px, 3vw, 17px)',
        fontWeight: '600',
        cursor: 'pointer'
    },
    orderingPool: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center'
    },
    orderingWord: {
        padding: '10px 18px',
        backgroundColor: '#fff',
        border: '2px solid #c4b5fd',
        borderRadius: '20px',
        fontSize: 'clamp(14px, 3vw, 17px)',
        fontWeight: '600',
        color: '#374151',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },

    // Matching
    matchHint: {
        fontSize: 'clamp(13px, 2.5vw, 15px)',
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: '16px',
        fontStyle: 'italic'
    },
    matchGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
    },
    matchCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    matchItem: {
        padding: 'clamp(10px, 2.5vw, 14px)',
        border: '2px solid',
        borderRadius: '12px',
        fontSize: 'clamp(14px, 3vw, 17px)',
        fontWeight: '600',
        backgroundColor: '#fff',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s'
    },
    matchLink: {
        fontSize: '12px',
        color: '#10b981',
        fontWeight: '500'
    },

    // Classification
    catGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
    },
    catBox: {
        padding: '16px',
        border: '2px dashed',
        borderRadius: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        minHeight: '80px',
        textAlign: 'center'
    },
    catTitle: {
        fontSize: 'clamp(15px, 3vw, 18px)',
        fontWeight: '700',
        color: '#7c3aed',
        marginBottom: '8px'
    },
    catItems: { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' },
    catAssigned: {
        padding: '4px 10px',
        backgroundColor: '#ede9fe',
        borderRadius: '12px',
        fontSize: '13px',
        color: '#7c3aed'
    },
    classItems: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center'
    },
    classItem: {
        padding: '10px 18px',
        border: '2px solid',
        borderRadius: '20px',
        fontSize: 'clamp(14px, 3vw, 16px)',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.15s'
    },

    // Transformation
    modeleBox: {
        padding: '16px',
        backgroundColor: '#f0fdf4',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '2px solid #86efac'
    },
    modeleLabel: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#16a34a',
        marginBottom: '4px'
    },
    modeleText: {
        fontSize: 'clamp(16px, 3.5vw, 20px)',
        color: '#1e293b',
        fontWeight: '500'
    },
    modeleArrow: { color: '#16a34a', fontWeight: 'bold', padding: '0 6px' },
    transRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e9e5f5'
    },
    transOriginal: {
        fontSize: 'clamp(15px, 3.2vw, 18px)',
        color: '#1e293b',
        fontWeight: '500',
        flex: 1,
        minWidth: '120px'
    },
    transArrow: { fontSize: '20px', color: '#8b5cf6', fontWeight: 'bold' },
    transInput: {
        flex: 1,
        minWidth: '150px',
        padding: '10px 14px',
        border: '2px solid #c4b5fd',
        borderRadius: '10px',
        fontSize: 'clamp(15px, 3.2vw, 18px)',
        outline: 'none'
    },

    // Submit
    submitBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '30px',
        gap: '12px',
        flexWrap: 'wrap'
    },
    quitBtn: {
        padding: '12px 24px',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: 'none',
        borderRadius: '12px',
        fontSize: 'clamp(14px, 3vw, 16px)',
        fontWeight: '600',
        cursor: 'pointer'
    },
    submitBtn: {
        padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 36px)',
        backgroundColor: '#10b981',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        fontSize: 'clamp(16px, 3.5vw, 20px)',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
    },

    // Résultat
    resultCard: {
        textAlign: 'center',
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: 'clamp(24px, 5vw, 40px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        margin: '0 auto'
    },
    resultMessage: {
        fontSize: 'clamp(22px, 5vw, 32px)',
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: '8px'
    },
    resultScore: {
        fontSize: 'clamp(40px, 10vw, 64px)',
        fontWeight: 'bold',
        color: '#8b5cf6',
        marginBottom: '4px'
    },
    resultDetail: {
        fontSize: 'clamp(14px, 3vw, 17px)',
        color: '#64748b',
        marginBottom: '24px'
    },
    corrections: {
        textAlign: 'left',
        marginBottom: '24px'
    },
    correctionRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        marginBottom: '4px',
        fontSize: 'clamp(14px, 3vw, 16px)'
    },
    corrWrong: {
        textDecoration: 'line-through',
        color: '#dc2626'
    },
    corrRight: {
        color: '#16a34a',
        fontWeight: '600'
    },
    resultActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    replayBtn: {
        padding: '14px 28px',
        backgroundColor: '#8b5cf6',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        fontSize: 'clamp(15px, 3.5vw, 18px)',
        fontWeight: '700',
        cursor: 'pointer'
    },
    nextBtn: {
        padding: '14px 28px',
        backgroundColor: '#10b981',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        fontSize: 'clamp(15px, 3.5vw, 18px)',
        fontWeight: '700',
        cursor: 'pointer'
    }
}
