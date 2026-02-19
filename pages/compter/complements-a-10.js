import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

const ROWS = 4
const COLS = 5
const SIZE = ROWS * COLS

const MODE = { LEARNING: 'learning', N1: 'n1', N2: 'n2' }

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatTime(totalSeconds) {
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const ss = String(totalSeconds % 60).padStart(2, '0')
    return `${mm}:${ss}`
}

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function generateSolvableGrid() {
    const values = []
    for (let i = 0; i < SIZE / 2; i++) {
        const a = randInt(0, 10)
        values.push(a, 10 - a)
    }
    return shuffle(values)
}

function findPairSum10(cells) {
    const filled = []
    for (let i = 0; i < SIZE; i++) if (cells[i] !== null) filled.push(i)
    for (let i = 0; i < filled.length; i++) {
        for (let j = i + 1; j < filled.length; j++) {
            if (cells[filled[i]] + cells[filled[j]] === 10) return [filled[i], filled[j]]
        }
    }
    return null
}

function findGroupSum10(cells) {
    const pair = findPairSum10(cells)
    if (pair) return pair
    const idxs = []
    for (let i = 0; i < SIZE; i++) if (cells[i] !== null) idxs.push(i)
    let found = null
    function dfs(start, sum, path) {
        if (found) return
        if (sum === 10 && path.length >= 2) { found = [...path]; return }
        if (sum > 10) return
        for (let i = start; i < idxs.length; i++) {
            path.push(idxs[i])
            dfs(i + 1, sum + cells[idxs[i]], path)
            path.pop()
            if (found) return
        }
    }
    dfs(0, 0, [])
    return found
}

export default function ComplementsA10() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [, setTick] = useState(0)
    const render = () => setTick(t => t + 1)

    // Tout l'état du jeu dans un ref unique (comme le state vanilla JS original)
    const g = useRef({
        mode: MODE.LEARNING,
        cells: generateSolvableGrid(),
        selected: [],
        hintIndices: [],
        score: 0,
        errorStreak: 0,
        locked: false,
        finished: false,
        seconds: 0,
        message: { text: 'Sélectionnez des cases pour faire 10.', type: 'info' },
        showEndModal: false,
        endText: '',
        saved: false
    }).current

    const timerRef = useRef(null)

    // Auth check
    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) {
            router.push('/login')
            return
        }
        setIsLoading(false)
    }, [router])

    // Timer
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            if (!g.finished) {
                g.seconds += 1
                render()
            }
        }, 1000)
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function setMessage(text, type = 'info') {
        g.message = { text, type }
    }

    function encouragement(score) {
        if (score === 1) return ' Bravo !'
        if (score === 3) return ' Très bien, vous progressez !'
        if (score === 5) return ' Excellent travail !'
        return ''
    }

    function onError(text) {
        g.errorStreak += 1
        if (g.errorStreak >= 3) {
            g.errorStreak = 0
            setMessage('Prenez votre temps.', 'warn')
            return
        }
        setMessage(text, 'bad')
    }

    function onSuccess(text) {
        g.errorStreak = 0
        setMessage(text + encouragement(g.score), 'ok')
    }

    function saveSession(sessionMode, sessionScore, sessionSeconds, sessionFinished) {
        try {
            const token = localStorage.getItem('token')
            if (!token) return
            fetch('/api/compter/sauvegarder-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exercice: 'complements-a-10',
                    mode: sessionMode,
                    score: sessionScore,
                    duree_secondes: sessionSeconds,
                    termine: sessionFinished
                })
            })
        } catch (err) {
            console.error('Erreur sauvegarde session:', err)
        }
    }

    function removeCells(indices) {
        for (const i of indices) g.cells[i] = null
        g.selected = []
        g.hintIndices = []
        g.locked = false

        if (g.cells.every(v => v === null)) {
            g.finished = true
            if (timerRef.current) clearInterval(timerRef.current)
            const t = formatTime(g.seconds)
            setMessage(`Félicitations, vous avez terminé en ${t}.`, 'ok')
            g.endText = `Votre temps : ${t}. Choisissez un niveau pour rejouer.`
            g.showEndModal = true
            if (!g.saved) {
                g.saved = true
                saveSession(g.mode, g.score, g.seconds, true)
            }
        }
        render()
    }

    function findLearningCandidates(firstIdx) {
        const x = g.cells[firstIdx]
        const need = 10 - x
        const out = []
        for (let i = 0; i < SIZE; i++) {
            if (i !== firstIdx && g.cells[i] !== null && g.cells[i] === need) out.push(i)
        }
        return out
    }

    function handleLearningClick(idx) {
        if (g.selected.length === 0) {
            g.selected = [idx]
            const x = g.cells[idx]
            const need = 10 - x
            const candidates = findLearningCandidates(idx)
            if (candidates.length === 0) {
                setMessage('Aucun complément visible. Choisissez une autre case.', 'info')
            } else {
                setMessage(`Cherchez ${need} pour faire 10.`, 'info')
            }
            render()
            return
        }

        const first = g.selected[0]
        if (idx === first) {
            g.selected = []
            setMessage('Sélection annulée.', 'info')
            render()
            return
        }

        const x = g.cells[first]
        const y = g.cells[idx]
        if (x + y === 10) {
            g.score += 1
            onSuccess(`Bravo ! ${x} + ${y} = 10.`)
            removeCells([first, idx])
        } else {
            onError('Cherchez le complément pour faire 10.')
            g.selected = []
            render()
        }
    }

    function handleN1Click(idx) {
        if (g.locked) return

        if (g.selected.length === 0) {
            g.selected = [idx]
            setMessage('Choisissez une deuxième case.', 'info')
            render()
            return
        }

        if (idx === g.selected[0]) {
            g.selected = []
            setMessage('Sélection annulée.', 'info')
            render()
            return
        }

        g.selected.push(idx)
        const a = g.selected[0]
        const b = g.selected[1]
        const x = g.cells[a]
        const y = g.cells[b]

        if (x + y === 10) {
            g.score += 1
            onSuccess(`Bravo ! ${x} + ${y} = 10.`)
            removeCells([a, b])
            return
        }

        g.locked = true
        onError(`Essayez encore : ${x} + ${y} = ${x + y}.`)
        render()
        setTimeout(() => {
            g.selected = []
            g.hintIndices = []
            g.locked = false
            render()
        }, 700)
    }

    function handleN2Click(idx) {
        if (g.locked) return

        const pos = g.selected.indexOf(idx)
        if (pos >= 0) g.selected.splice(pos, 1)
        else g.selected.push(idx)

        const sum = g.selected.reduce((acc, i) => acc + (g.cells[i] ?? 0), 0)

        if (sum < 10) {
            const selectedValues = g.selected.map(i => g.cells[i]).filter(v => v !== null)
            setMessage(`Somme en cours : ${selectedValues.join(' + ')}.`, 'info')
            render()
            return
        }

        if (sum === 10 && g.selected.length >= 2) {
            g.score += 1
            onSuccess('Bravo ! Vous avez fait 10.')
            removeCells([...g.selected])
            return
        }

        if (sum === 10 && g.selected.length < 2) {
            onError('Choisissez au moins 2 cases.')
            render()
            return
        }

        // sum > 10
        g.locked = true
        onError(`Trop grand : somme = ${sum}. Recommencez.`)
        render()
        setTimeout(() => {
            g.selected = []
            g.hintIndices = []
            g.locked = false
            render()
        }, 700)
    }

    function onCellClick(idx) {
        if (g.finished || g.locked) return
        if (g.cells[idx] === null) return

        if (g.mode === MODE.LEARNING) return handleLearningClick(idx)
        if (g.mode === MODE.N1) return handleN1Click(idx)
        return handleN2Click(idx)
    }

    function showHint() {
        if (g.finished) return
        let combo = null
        if (g.mode === MODE.N1) combo = findPairSum10(g.cells)
        if (g.mode === MODE.N2) combo = findGroupSum10(g.cells)

        if (!combo || combo.length < 2) {
            setMessage('Aucune combinaison possible. Terminez ou changez de niveau.', 'warn')
            render()
            return
        }

        g.hintIndices = combo
        setMessage('Indice affiché.', 'info')
        render()

        setTimeout(() => {
            g.hintIndices = []
            render()
        }, 2400)
    }

    function newGame(newMode) {
        // Sauvegarder la session précédente si activité
        if (!g.saved && (g.score > 0 || g.seconds > 0)) {
            saveSession(g.mode, g.score, g.seconds, g.finished)
        }
        g.saved = false
        g.finished = false
        g.score = 0
        g.errorStreak = 0
        g.selected = []
        g.hintIndices = []
        g.locked = false
        g.showEndModal = false
        g.endText = ''
        g.seconds = 0
        g.cells = generateSolvableGrid()
        g.mode = newMode
        setMessage('Faites 10.', 'info')

        // Relancer le timer
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            if (!g.finished) {
                g.seconds += 1
                render()
            }
        }, 1000)

        render()
    }

    // Calcul affichage somme N2
    const sumDisplay = g.mode === MODE.N2
        ? (g.selected.map(i => g.cells[i]).filter(v => v !== null).join(' + ') || '—')
        : null

    if (isLoading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>Chargement...</p>
        </div>
    }

    return (
        <>
            <style jsx global>{`
                .c10-root {
                    --bg: #f2f5f9;
                    --panel: #ffffff;
                    --text: #122033;
                    --muted: #4e5f75;
                    --line: #c9d6e5;
                    --primary: #0a5ad4;
                    --primary-2: #0848ab;
                    --ok: #157d3f;
                    --warn: #a04a00;
                    --bad: #a31f2f;
                    --cell: #eaf2ff;
                    --cell-border: #7798c4;
                    --cell-empty: #dde4ec;
                    --selected: #ffd76a;
                    --candidate: #9fe6bd;
                    --hint: #ffa57f;
                    --focus: #6fb2ff;
                }

                .c10-root * { box-sizing: border-box; }

                .c10-root {
                    margin: 0;
                    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
                    color: var(--text);
                    background: radial-gradient(1200px 500px at 20% -5%, #dce9ff 0, var(--bg) 60%);
                    min-height: 100vh;
                }

                .c10-app {
                    max-width: 1040px;
                    margin: 0 auto;
                    padding: 14px;
                    display: grid;
                    gap: 12px;
                }

                .c10-panel {
                    background: var(--panel);
                    border: 2px solid var(--line);
                    border-radius: 14px;
                    padding: 12px;
                }

                .c10-root h1 {
                    margin: 0;
                    font-size: 1.5rem;
                }

                .c10-sub {
                    margin: 6px 0 0;
                    color: var(--muted);
                    font-weight: 700;
                }

                .c10-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    margin-top: 10px;
                }

                .c10-btn {
                    border: 2px solid var(--primary);
                    background: var(--primary);
                    color: #fff;
                    border-radius: 10px;
                    min-height: 52px;
                    padding: 10px 14px;
                    font-size: 1.03rem;
                    font-weight: 800;
                    cursor: pointer;
                }

                .c10-btn:hover { background: var(--primary-2); border-color: var(--primary-2); }
                .c10-btn:disabled { opacity: .55; cursor: not-allowed; }

                .c10-btn.c10-mode {
                    background: #fff;
                    color: var(--primary);
                }

                .c10-btn.c10-mode.c10-active {
                    background: var(--primary);
                    color: #fff;
                }

                .c10-stat {
                    background: #edf4ff;
                    border: 2px solid #cfe0f5;
                    border-radius: 10px;
                    padding: 8px 12px;
                    font-size: 1.02rem;
                    font-weight: 800;
                    min-width: 150px;
                    text-align: center;
                }

                .c10-message {
                    min-height: 56px;
                    border: 2px solid var(--line);
                    border-radius: 10px;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    font-size: 1.08rem;
                    font-weight: 800;
                    background: #f8fbff;
                }

                .c10-message.c10-info { color: var(--text); }
                .c10-message.c10-ok { color: var(--ok); border-color: #bde5cb; background: #f1fbf4; }
                .c10-message.c10-warn { color: var(--warn); border-color: #f1d2ba; background: #fff8f3; }
                .c10-message.c10-bad { color: var(--bad); border-color: #efc0c5; background: #fff6f7; }

                .c10-grid {
                    display: grid;
                    gap: 10px;
                }

                .c10-cell {
                    min-height: 72px;
                    border: 2px solid var(--cell-border);
                    border-radius: 12px;
                    background: var(--cell);
                    color: #1b3046;
                    font-size: 2rem;
                    font-weight: 900;
                    cursor: pointer;
                }

                .c10-cell:focus { outline: 4px solid var(--focus); }
                .c10-cell.c10-selected { background: var(--selected); border-color: #ba8b00; }
                .c10-cell.c10-candidate { background: var(--candidate); border-color: #2f8f59; }
                .c10-cell.c10-hint { background: var(--hint); border-color: #c35528; }

                .c10-cell.c10-empty {
                    background: var(--cell-empty);
                    border-color: #afbccb;
                    color: transparent;
                    cursor: not-allowed;
                }

                .c10-end-modal {
                    position: fixed;
                    inset: 0;
                    background: rgba(10, 20, 35, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    z-index: 1000;
                }

                .c10-end-box {
                    width: min(520px, 100%);
                    background: #fff;
                    border: 2px solid var(--line);
                    border-radius: 14px;
                    padding: 16px;
                }

                .c10-end-box h2 {
                    margin: 0 0 8px;
                    font-size: 1.3rem;
                }

                .c10-end-box p {
                    margin: 0 0 12px;
                    font-weight: 700;
                    color: var(--muted);
                }

                .c10-back-btn {
                    border: none;
                    background: none;
                    color: var(--muted);
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 6px 10px;
                    border-radius: 8px;
                }

                .c10-back-btn:hover {
                    background: #edf2f7;
                }

                @media (max-width: 860px) {
                    .c10-cell { min-height: 62px; font-size: 1.7rem; }
                    .c10-btn { font-size: 1rem; }
                }

                @media (max-width: 640px) {
                    .c10-cell { min-height: 54px; font-size: 1.45rem; }
                    .c10-root h1 { font-size: 1.25rem; }
                    .c10-stat { min-width: 130px; }
                }
            `}</style>

            <div className="c10-root">
                <main className="c10-app">
                    {/* Header panel */}
                    <section className="c10-panel">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                className="c10-back-btn"
                                onClick={() => router.push('/compter')}
                            >
                                ← Retour
                            </button>
                            <h1>Compléments à 10</h1>
                        </div>
                        <p className="c10-sub">Objectif : trouver des combinaisons de nombres qui font 10.</p>

                        <div className="c10-row" role="group" aria-label="Modes de jeu">
                            <button
                                className={`c10-btn c10-mode ${g.mode === MODE.LEARNING ? 'c10-active' : ''}`}
                                onClick={() => newGame(MODE.LEARNING)}
                            >
                                Apprentissage
                            </button>
                            <button
                                className={`c10-btn c10-mode ${g.mode === MODE.N1 ? 'c10-active' : ''}`}
                                onClick={() => newGame(MODE.N1)}
                            >
                                Niveau 1
                            </button>
                            <button
                                className={`c10-btn c10-mode ${g.mode === MODE.N2 ? 'c10-active' : ''}`}
                                onClick={() => newGame(MODE.N2)}
                            >
                                Niveau 2
                            </button>
                        </div>

                        {g.mode !== MODE.LEARNING && (
                            <div className="c10-row">
                                <button className="c10-btn" onClick={showHint}>
                                    Indice
                                </button>
                            </div>
                        )}

                        <div className="c10-row">
                            <div className="c10-stat">Score : {g.score}</div>
                            <div className="c10-stat">Temps : {formatTime(g.seconds)}</div>
                            {g.mode === MODE.N2 && (
                                <div className="c10-stat">Somme : {sumDisplay}</div>
                            )}
                        </div>
                    </section>

                    {/* Message panel */}
                    <section className="c10-panel">
                        <div className={`c10-message c10-${g.message.type}`}>
                            {g.message.text}
                        </div>
                    </section>

                    {/* Grid panel */}
                    <section className="c10-panel">
                        <div
                            className="c10-grid"
                            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
                            aria-label={`Grille ${COLS} colonnes x ${ROWS} lignes`}
                        >
                            {g.cells.map((v, i) => {
                                let className = 'c10-cell'
                                if (v === null) className += ' c10-empty'
                                if (g.selected.includes(i)) className += ' c10-selected'
                                if (g.mode === MODE.LEARNING && g.selected.length === 1 && v !== null) {
                                    const first = g.selected[0]
                                    if (i !== first && g.cells[first] + v === 10) {
                                        className += ' c10-candidate'
                                    }
                                }
                                if (g.hintIndices.includes(i)) className += ' c10-hint'

                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        className={className}
                                        disabled={v === null}
                                        onClick={() => onCellClick(i)}
                                    >
                                        {v !== null ? String(v) : ''}
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                </main>

                {/* End modal */}
                {g.showEndModal && (
                    <div className="c10-end-modal" role="dialog" aria-modal="true" aria-labelledby="endTitle">
                        <div className="c10-end-box">
                            <h2 id="endTitle">Partie terminée</h2>
                            <p>{g.endText}</p>
                            <div className="c10-row">
                                <button className="c10-btn" onClick={() => newGame(MODE.N1)}>
                                    Rejouer niveau 1
                                </button>
                                <button className="c10-btn" onClick={() => newGame(MODE.N2)}>
                                    Rejouer niveau 2
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
