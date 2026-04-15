import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabaseClient'

// Configuration des manches : chaque manche cible un son_g avec un distracteur d'un autre son_g
const MANCHES_CONFIG = [
    { cible: 'g_dur',  distracteur: 'g_doux', ancreMot: 'gâteau' },
    { cible: 'g_doux', distracteur: 'g_dur',  ancreMot: 'girafe' },
    { cible: 'gn',     distracteur: 'g_doux', ancreMot: 'montagne' },
    { cible: 'gu',     distracteur: 'g_doux', ancreMot: 'guitare' },
    { cible: 'gl',     distracteur: 'gr',     ancreMot: 'glace' },
]

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
function pick(arr, n) { return shuffle(arr).slice(0, n) }

export default function Module2MemeSon() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [loading, setLoading] = useState(true)
    const [manches, setManches] = useState([])
    const [mancheIdx, setMancheIdx] = useState(0)
    const [candidatIdx, setCandidatIdx] = useState(0)
    const [phase, setPhase] = useState('ancre') // 'ancre' | 'candidat' | 'feedback' | 'fin-manche' | 'fin'
    const [feedbackType, setFeedbackType] = useState(null) // 'correct' | 'faux'
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [ttsSpeaking, setTtsSpeaking] = useState(false)
    const voicesReadyRef = useRef(false)

    // Auth
    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login') }
        setIsMobile(window.innerWidth <= 768)
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [router])

    // Voix TTS
    useEffect(() => {
        const loadVoices = () => {
            const v = window.speechSynthesis?.getVoices()
            if (v && v.length) voicesReadyRef.current = true
        }
        loadVoices()
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices
    }, [])

    const lireMot = useCallback((mot, onEnd) => {
        if (!('speechSynthesis' in window)) { onEnd && onEnd(); return }
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(mot)
        utterance.lang = 'fr-FR'
        utterance.rate = 0.7
        utterance.pitch = 1.0
        const voices = window.speechSynthesis.getVoices()
        const frVoice = voices.find(v =>
            v.lang.includes('fr') && (v.name.includes('Paul') || v.name.includes('Henri') || v.name.includes('Thomas'))
        ) || voices.find(v => v.lang.includes('fr') && !v.name.toLowerCase().includes('hortense'))
        || voices.find(v => v.lang.includes('fr'))
        if (frVoice) utterance.voice = frVoice
        setTtsSpeaking(true)
        utterance.onend = () => { setTtsSpeaking(false); onEnd && onEnd() }
        utterance.onerror = () => { setTtsSpeaking(false); onEnd && onEnd() }
        window.speechSynthesis.speak(utterance)
    }, [])

    // Charger banque + générer manches
    useEffect(() => {
        if (!user) return
        ;(async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('mots_sons_g')
                .select('mot, son_g')
                .eq('actif', true)
            if (error || !data) { setLoading(false); return }
            const parSon = {}
            data.forEach(m => {
                if (!parSon[m.son_g]) parSon[m.son_g] = []
                parSon[m.son_g].push(m.mot)
            })
            const mArr = MANCHES_CONFIG.map(cfg => {
                const cibles = (parSon[cfg.cible] || []).filter(m => m !== cfg.ancreMot)
                const distracteurs = parSon[cfg.distracteur] || []
                const bons = pick(cibles, 3).map(mot => ({ mot, estBonne: true }))
                const faux = pick(distracteurs, 3).map(mot => ({ mot, estBonne: false }))
                return { ancre: cfg.ancreMot, candidats: shuffle([...bons, ...faux]) }
            })
            setManches(mArr)
            setLoading(false)
        })()
    }, [user])

    const manche = manches[mancheIdx]
    const candidat = manche?.candidats[candidatIdx]

    // Au démarrage d'une manche : prononcer l'ancre automatiquement
    useEffect(() => {
        if (!manche || phase !== 'ancre') return
        const t = setTimeout(() => lireMot(manche.ancre), 600)
        return () => clearTimeout(t)
    }, [manche, phase, lireMot])

    // Au démarrage d'un candidat : prononcer automatiquement
    useEffect(() => {
        if (!candidat || phase !== 'candidat') return
        const t = setTimeout(() => lireMot(candidat.mot), 400)
        return () => clearTimeout(t)
    }, [candidat, phase, lireMot])

    const passerAuxCandidats = () => {
        window.speechSynthesis?.cancel()
        setPhase('candidat')
    }

    const handleReponse = (reponsePareil) => {
        if (phase !== 'candidat') return
        window.speechSynthesis?.cancel()
        const correct = reponsePareil === candidat.estBonne
        setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
        setFeedbackType(correct ? 'correct' : 'faux')
        setPhase('feedback')
        setTimeout(() => {
            if (candidatIdx < manche.candidats.length - 1) {
                setCandidatIdx(i => i + 1)
                setPhase('candidat')
            } else {
                setPhase('fin-manche')
            }
            setFeedbackType(null)
        }, 1500)
    }

    const mancheSuivante = () => {
        if (mancheIdx < manches.length - 1) {
            setMancheIdx(i => i + 1)
            setCandidatIdx(0)
            setPhase('ancre')
        } else {
            setPhase('fin')
        }
    }

    const rejouerAncre = () => lireMot(manche.ancre)
    const rejouerCandidat = () => lireMot(candidat.mot)

    if (!user) return null

    const btnRetour = (
        <button onClick={() => router.push('/lire/sons-du-g')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '16px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>
            ← Retour
        </button>
    )
    const btnHome = (
        <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '16px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>
            🏠
        </button>
    )

    return (
        <>
            <Head><title>Le même son — ACLEF</title></Head>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: isMobile ? '15px' : '30px',
                fontFamily: "'Andika', 'Comic Sans MS', sans-serif"
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    {btnRetour}
                    {manche && phase !== 'fin' && (
                        <div style={{ color: 'white', fontSize: isMobile ? '14px' : '16px', background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px' }}>
                            Manche {mancheIdx + 1} / {manches.length}
                        </div>
                    )}
                    {btnHome}
                </div>

                {loading && (<div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>Chargement…</div>)}

                {!loading && manche && phase !== 'fin' && (
                    <div style={{ maxWidth: '700px', margin: '0 auto' }}>

                        {/* Zone ANCRE (toujours visible) */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            borderRadius: '20px',
                            padding: isMobile ? '18px' : '25px',
                            textAlign: 'center',
                            marginBottom: '20px',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                                Le mot à retenir
                            </div>
                            <div style={{
                                color: 'white',
                                fontSize: isMobile ? '40px' : '56px',
                                fontWeight: 'bold',
                                marginBottom: '10px',
                                transform: ttsSpeaking && phase === 'ancre' ? 'scale(1.05)' : 'none',
                                transition: 'transform 0.2s ease'
                            }}>
                                {manche.ancre}
                            </div>
                            <button onClick={rejouerAncre}
                                style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid white', color: 'white', fontSize: '20px', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer' }}>
                                🔊 Écouter
                            </button>
                        </div>

                        {/* Phase ANCRE : gros bouton "Commencer" */}
                        {phase === 'ancre' && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <p style={{ color: 'white', fontSize: isMobile ? '18px' : '22px', marginBottom: '20px' }}>
                                    Écoute bien ce mot, puis on va comparer.
                                </p>
                                <button onClick={passerAuxCandidats}
                                    style={{
                                        background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: isMobile ? '22px' : '26px',
                                        padding: '18px 40px',
                                        borderRadius: '50px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        boxShadow: '0 8px 20px rgba(67,233,123,0.4)'
                                    }}>
                                    C'est parti ! →
                                </button>
                            </div>
                        )}

                        {/* Phase CANDIDAT ou FEEDBACK : afficher le mot candidat */}
                        {(phase === 'candidat' || phase === 'feedback') && candidat && (
                            <>
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>
                                    Mot {candidatIdx + 1} / {manche.candidats.length}
                                </div>
                                <div style={{
                                    background: feedbackType === 'correct' ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                                              : feedbackType === 'faux' ? 'linear-gradient(135deg, #f5576c, #f093fb)'
                                              : 'rgba(255,255,255,0.12)',
                                    borderRadius: '20px',
                                    padding: isMobile ? '25px' : '40px',
                                    textAlign: 'center',
                                    marginBottom: '25px',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    transform: ttsSpeaking && phase === 'candidat' ? 'scale(1.03)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{ color: 'white', fontSize: isMobile ? '42px' : '58px', fontWeight: 'bold', marginBottom: '12px' }}>
                                        {candidat.mot}
                                    </div>
                                    {phase === 'candidat' && (
                                        <button onClick={rejouerCandidat}
                                            style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid white', color: 'white', fontSize: '20px', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer' }}>
                                            🔊 Réécouter
                                        </button>
                                    )}
                                    {phase === 'feedback' && (
                                        <div style={{ color: 'white', fontSize: '40px', marginTop: '5px' }}>
                                            {feedbackType === 'correct' ? '✓ Bravo !' : '✗'}
                                        </div>
                                    )}
                                </div>

                                {/* Les 2 gros boutons de choix */}
                                {phase === 'candidat' && (
                                    <>
                                        <div style={{ textAlign: 'center', color: 'white', fontSize: isMobile ? '18px' : '22px', marginBottom: '15px', fontWeight: 'bold' }}>
                                            Le même son que « {manche.ancre} » ?
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <button onClick={() => handleReponse(true)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontSize: isMobile ? '22px' : '28px',
                                                    padding: isMobile ? '22px' : '28px',
                                                    borderRadius: '20px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 6px 15px rgba(67,233,123,0.4)'
                                                }}>
                                                ✓ Oui, pareil
                                            </button>
                                            <button onClick={() => handleReponse(false)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #f5576c, #f093fb)',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontSize: isMobile ? '22px' : '28px',
                                                    padding: isMobile ? '22px' : '28px',
                                                    borderRadius: '20px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 6px 15px rgba(245,87,108,0.4)'
                                                }}>
                                                ✗ Non, pas pareil
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Fin de manche */}
                        {phase === 'fin-manche' && (
                            <div style={{ textAlign: 'center', padding: '30px' }}>
                                <div style={{ fontSize: '60px', marginBottom: '10px' }}>👍</div>
                                <h2 style={{ color: 'white', marginBottom: '15px' }}>Manche terminée !</h2>
                                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '25px' }}>
                                    Score : {score.correct} / {score.total}
                                </p>
                                <button onClick={mancheSuivante}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                        border: 'none', color: 'white', fontSize: '20px',
                                        padding: '15px 32px', borderRadius: '30px',
                                        cursor: 'pointer', fontWeight: 'bold'
                                    }}>
                                    {mancheIdx < manches.length - 1 ? 'Manche suivante →' : 'Voir le résultat final'}
                                </button>
                            </div>
                        )}

                    </div>
                )}

                {/* Fin totale */}
                {phase === 'fin' && (
                    <div style={{ maxWidth: '600px', margin: '40px auto', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', borderRadius: '20px', padding: '40px', textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: '70px', marginBottom: '15px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 15px 0', fontSize: '28px' }}>Bravo !</h2>
                        <p style={{ fontSize: '22px', margin: '0 0 20px 0' }}>
                            <strong>{score.correct}</strong> bonnes réponses sur <strong>{score.total}</strong>
                        </p>
                        <button onClick={() => router.push('/lire/sons-du-g')}
                            style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid white', color: 'white', fontSize: '16px', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Retour aux modules
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
