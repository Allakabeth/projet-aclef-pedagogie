import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabaseClient'
import VoiceRecorder from '@/components/VoiceRecorder'

// Mapping mot -> { decoupage, syllabeIdx, syllabeRec }
const MOT_INFOS = {
    'mange':      { decoupage: ['man', 'ge'],          syllabeIdx: 1, syllabeRec: 'ge' },
    'gâteau':     { decoupage: ['gâ', 'teau'],         syllabeIdx: 0, syllabeRec: 'ga' },
    'gorille':    { decoupage: ['go', 'ri', 'lle'],    syllabeIdx: 0, syllabeRec: 'go' },
    'gamelle':    { decoupage: ['ga', 'melle'],        syllabeIdx: 0, syllabeRec: 'ga' },
    'gants':      { decoupage: ['gants'],              syllabeIdx: 0, syllabeRec: 'ga' },
    'garçon':     { decoupage: ['gar', 'çon'],         syllabeIdx: 0, syllabeRec: 'ga' },
    'gilet':      { decoupage: ['gi', 'let'],          syllabeIdx: 0, syllabeRec: 'gi' },
    'tigre':      { decoupage: ['ti', 'gre'],          syllabeIdx: 1, syllabeRec: 'gre' },
    'grenouille': { decoupage: ['gre', 'nou', 'ille'], syllabeIdx: 0, syllabeRec: 'gre' },
    'girafe':     { decoupage: ['gi', 'rafe'],         syllabeIdx: 0, syllabeRec: 'gi' },
    'montagne':   { decoupage: ['mon', 'tagne'],       syllabeIdx: 1, syllabeRec: 'gne' },
    'orange':     { decoupage: ['o', 'ran', 'ge'],     syllabeIdx: 2, syllabeRec: 'ge' },
    'magicien':   { decoupage: ['ma', 'gi', 'cien'],   syllabeIdx: 1, syllabeRec: 'gi' },
    'guitare':    { decoupage: ['gui', 'tare'],        syllabeIdx: 0, syllabeRec: 'gui' },
    'escargot':   { decoupage: ['es', 'car', 'got'],   syllabeIdx: 2, syllabeRec: 'go' },
    'règle':      { decoupage: ['rè', 'gle'],          syllabeIdx: 1, syllabeRec: 'gle' },
    'guêpe':      { decoupage: ['guê', 'pe'],          syllabeIdx: 0, syllabeRec: 'gue' },
    'glace':      { decoupage: ['gla', 'ce'],          syllabeIdx: 0, syllabeRec: 'gla' },
    'aigle':      { decoupage: ['ai', 'gle'],          syllabeIdx: 1, syllabeRec: 'gle' },
    'village':    { decoupage: ['vi', 'lla', 'ge'],    syllabeIdx: 2, syllabeRec: 'ge' },
    'singe':      { decoupage: ['sin', 'ge'],          syllabeIdx: 1, syllabeRec: 'ge' },
    'champignon': { decoupage: ['cham', 'pi', 'gnon'], syllabeIdx: 2, syllabeRec: 'gno' },
    'nuage':      { decoupage: ['nu', 'a', 'ge'],      syllabeIdx: 2, syllabeRec: 'ge' },
    'plage':      { decoupage: ['pla', 'ge'],          syllabeIdx: 1, syllabeRec: 'ge' },
    'vigne':      { decoupage: ['vi', 'gne'],          syllabeIdx: 1, syllabeRec: 'gne' },
    'igloo':      { decoupage: ['i', 'gloo'],          syllabeIdx: 1, syllabeRec: 'gloo' },
}

function normaliseSyll(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function Module2DansLaPhrase() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [loading, setLoading] = useState(true)
    const [phrases, setPhrases] = useState([])
    const [phraseIdx, setPhraseIdx] = useState(0)
    const [phase, setPhase] = useState('association')

    // Sons de référence (admin) et enregistrements apprenant
    const [sonsReference, setSonsReference] = useState({})
    const [audioUrls, setAudioUrls] = useState({})
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState(null)

    // Phase Association — drag-drop
    const [assoc, setAssoc] = useState({ slot1: null, slot2: null, selectedMot: null, shownWords: [] })
    const [assocFeedback, setAssocFeedback] = useState(null)
    const [dragging, setDragging] = useState(null)
    const slot1Ref = useRef(null)
    const slot2Ref = useRef(null)

    // Phase Enregistrement
    const [recIdx, setRecIdx] = useState(0)

    // Phase Discrimination
    const [reponseMemeSon, setReponseMemeSon] = useState(null)
    const [discrimFeedback, setDiscrimFeedback] = useState(null)
    const [carteEnLecture, setCarteEnLecture] = useState(null) // 0 | 1 | null

    const [score, setScore] = useState({ associations: 0, discrim: 0 })

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

    useEffect(() => {
        const loadVoices = () => window.speechSynthesis?.getVoices()
        loadVoices()
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices
    }, [])

    const lireMot = useCallback((mot, onEnd) => {
        if (!('speechSynthesis' in window)) { onEnd && onEnd(); return }
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(mot)
        u.lang = 'fr-FR'
        u.rate = 0.7
        u.pitch = 1.0
        const voices = window.speechSynthesis.getVoices()
        const v = voices.find(v => v.lang.includes('fr') && (v.name.includes('Paul') || v.name.includes('Henri') || v.name.includes('Thomas')))
            || voices.find(v => v.lang.includes('fr') && !v.name.toLowerCase().includes('hortense'))
            || voices.find(v => v.lang.includes('fr'))
        if (v) u.voice = v
        u.onend = () => onEnd && onEnd()
        u.onerror = () => onEnd && onEnd()
        window.speechSynthesis.speak(u)
    }, [])

    // Jouer un son de référence (admin) ou fallback TTS
    const jouerSonReference = useCallback((syllabe) => {
        const key = normaliseSyll(syllabe)
        const url = sonsReference[key]
        if (url) {
            const audio = new Audio(url)
            audio.play()
        } else {
            lireMot(syllabe)
        }
    }, [sonsReference, lireMot])

    // Jouer en priorité la voix de l'apprenant, sinon le modèle, sinon TTS
    // onEnd est appelé quand la lecture se termine (pour chaîner les sons)
    const jouerVoixApprenant = useCallback((syllabe, onEnd) => {
        const key = normaliseSyll(syllabe)
        const voixUrl = audioUrls[key]
        const modelUrl = sonsReference[key]
        const url = voixUrl || modelUrl
        if (url) {
            const audio = new Audio(url)
            audio.onended = () => onEnd && onEnd()
            audio.onerror = () => onEnd && onEnd()
            audio.play().catch(() => onEnd && onEnd())
        } else {
            lireMot(syllabe, onEnd)
        }
    }, [audioUrls, sonsReference, lireMot])

    // Fetch phrases + sons reference + enregistrements apprenant
    useEffect(() => {
        if (!user) return
        ;(async () => {
            setLoading(true)
            const [phraseRes, refRes, recRes] = await Promise.all([
                supabase.from('phrases_sons_g').select('*').eq('actif', true).order('ordre', { ascending: true }),
                supabase.from('sons_reference_g').select('syllabe, audio_url'),
                supabase.from('enregistrements_sons_g').select('syllabe, audio_url').eq('apprenant_id', user.id)
            ])
            setPhrases(phraseRes.data || [])
            const refMap = {}
            ;(refRes.data || []).forEach(r => { refMap[r.syllabe] = r.audio_url })
            setSonsReference(refMap)
            const recMap = {}
            ;(recRes.data || []).forEach(r => { recMap[r.syllabe] = r.audio_url })
            setAudioUrls(recMap)
            setLoading(false)
        })()
    }, [user])

    const phrase = phrases[phraseIdx]
    const mot1Info = phrase && MOT_INFOS[phrase.mot1]
    const mot2Info = phrase && MOT_INFOS[phrase.mot2]

    // Nouvelle phrase
    useEffect(() => {
        if (!phrase) return
        const mots = [phrase.mot1, phrase.mot2].sort(() => Math.random() - 0.5)
        setAssoc({ slot1: null, slot2: null, selectedMot: null, shownWords: mots })
        setAssocFeedback(null)
        setRecIdx(0)
        setReponseMemeSon(null)
        setDiscrimFeedback(null)
        setPhase('association')
        setTimeout(() => lireMot(phrase.phrase), 500)
    }, [phrase, lireMot])

    // ============ DRAG & DROP (pointer events) ============
    const handlePointerDown = (e, mot) => {
        if (assocFeedback) return
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        setDragging({
            mot,
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        })
        // Tap/click basique : sélection secondaire
        setAssoc(a => ({ ...a, selectedMot: a.selectedMot === mot ? null : mot }))
    }

    useEffect(() => {
        if (!dragging) return

        const handleMove = (e) => {
            setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null)
        }

        const handleUp = (e) => {
            // Chercher si on est sur un slot
            const check = (ref, slotNum) => {
                if (!ref.current) return false
                const r = ref.current.getBoundingClientRect()
                return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
            }
            let targetSlot = null
            if (check(slot1Ref, 1)) targetSlot = 1
            else if (check(slot2Ref, 2)) targetSlot = 2

            if (targetSlot && dragging) {
                const slotKey = `slot${targetSlot}`
                setAssoc(a => {
                    const autreSlot = targetSlot === 1 ? 'slot2' : 'slot1'
                    const next = { ...a, [slotKey]: dragging.mot, selectedMot: null }
                    if (next[autreSlot] === dragging.mot) next[autreSlot] = null
                    return next
                })
            }
            setDragging(null)
        }

        document.addEventListener('pointermove', handleMove)
        document.addEventListener('pointerup', handleUp)
        document.addEventListener('pointercancel', handleUp)
        return () => {
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
            document.removeEventListener('pointercancel', handleUp)
        }
    }, [dragging])

    // Tap sur slot : retirer le mot si déjà posé (permet d'annuler)
    const handleSlotClick = (slotNum) => {
        if (assocFeedback) return
        const slotKey = `slot${slotNum}`
        setAssoc(a => {
            if (a[slotKey]) return { ...a, [slotKey]: null, selectedMot: null }
            // Fallback tap : si un mot est sélectionné, le poser
            if (a.selectedMot) {
                const autreSlot = slotNum === 1 ? 'slot2' : 'slot1'
                const next = { ...a, [slotKey]: a.selectedMot, selectedMot: null }
                if (next[autreSlot] === a.selectedMot) next[autreSlot] = null
                return next
            }
            return a
        })
    }

    const validerAssociation = () => {
        if (!assoc.slot1 || !assoc.slot2) return
        const ok = assoc.slot1 === phrase.mot1 && assoc.slot2 === phrase.mot2
        setAssocFeedback(ok ? 'ok' : 'ko')
        if (ok) setScore(s => ({ ...s, associations: s.associations + 1 }))
        if (ok) {
            setTimeout(() => setPhase('segmentation'), 1200)
        } else {
            setTimeout(() => setAssocFeedback(null), 1500)
        }
    }

    // ============ ENREGISTREMENT ============
    const motCourantRec = recIdx === 0 ? phrase?.mot1 : phrase?.mot2
    const infoCourantRec = recIdx === 0 ? mot1Info : mot2Info
    const syllabeNormCourante = infoCourantRec ? normaliseSyll(infoCourantRec.syllabeRec) : null

    const handleRecordingComplete = async (blob) => {
        if (!infoCourantRec || !motCourantRec || !user) return
        setUploading(true)
        setUploadError(null)

        try {
            const formData = new FormData()
            formData.append('audio', blob, `${syllabeNormCourante}.webm`)
            formData.append('syllabe', syllabeNormCourante)
            formData.append('mot_source', motCourantRec)
            formData.append('son_g', recIdx === 0 ? phrase.son1 : phrase.son2)
            const token = localStorage.getItem('token')
            const res = await fetch('/api/enregistrements-sons-g/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (res.status === 401) {
                setUploadError('Ta session a expiré. Tu vas être redirigé vers la connexion.')
                setTimeout(() => router.push('/login'), 2500)
                return
            }

            const data = await res.json().catch(() => ({ error: 'Réponse invalide' }))
            if (res.ok && data.success && data.enregistrement?.audio_url) {
                setAudioUrls(prev => ({ ...prev, [syllabeNormCourante]: data.enregistrement.audio_url }))
            } else {
                setUploadError(`Erreur : ${data.error || data.details || `HTTP ${res.status}`}`)
            }
        } catch (e) {
            setUploadError(`Erreur réseau : ${e.message}`)
        } finally {
            setUploading(false)
        }
    }

    const ecouterMaVoix = (syllNorm) => {
        const url = audioUrls[syllNorm]
        if (!url) return
        const a = new Audio(url); a.play()
    }

    const passerEnregistrementSuivant = () => {
        if (recIdx === 0) setRecIdx(1)
        else setPhase('discrimination')
    }

    // ============ DISCRIMINATION ============
    // Auto-lecture séquentielle des 2 sons à l'arrivée en phase discrimination
    useEffect(() => {
        if (phase !== 'discrimination' || !mot1Info || !mot2Info) return
        let cancelled = false
        const t = setTimeout(() => {
            if (cancelled) return
            setCarteEnLecture(0)
            jouerVoixApprenant(mot1Info.syllabeRec, () => {
                if (cancelled) return
                setTimeout(() => {
                    if (cancelled) return
                    setCarteEnLecture(1)
                    jouerVoixApprenant(mot2Info.syllabeRec, () => {
                        if (cancelled) return
                        setCarteEnLecture(null)
                    })
                }, 600)
            })
        }, 500)
        return () => { cancelled = true; clearTimeout(t); setCarteEnLecture(null) }
    }, [phase, mot1Info, mot2Info, jouerVoixApprenant])

    const reecouterLes2 = () => {
        if (!mot1Info || !mot2Info) return
        setCarteEnLecture(0)
        jouerVoixApprenant(mot1Info.syllabeRec, () => {
            setTimeout(() => {
                setCarteEnLecture(1)
                jouerVoixApprenant(mot2Info.syllabeRec, () => setCarteEnLecture(null))
            }, 600)
        })
    }

    const handleReponseMemeSon = (rep) => {
        if (!phrase) return
        const ok = rep === phrase.meme_son
        setReponseMemeSon(rep)
        setDiscrimFeedback(ok ? 'ok' : 'ko')
        if (ok) setScore(s => ({ ...s, discrim: s.discrim + 1 }))
        setTimeout(() => setPhase('fin-phrase'), 1800)
    }

    const phraseSuivante = () => {
        if (phraseIdx < phrases.length - 1) setPhraseIdx(i => i + 1)
        else setPhase('fin')
    }

    if (!user) return null

    const btnRetour = (
        <button onClick={() => router.push('/lire/sons-du-g')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '16px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>← Retour</button>
    )
    const btnHome = (
        <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '16px', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>🏠</button>
    )

    const phaseLabels = {
        'association': 'Glisse chaque mot sur son image',
        'segmentation': 'Regarde et écoute chaque morceau',
        'enregistrement': 'À ton tour de parler !',
        'discrimination': 'Est-ce que c\'est le même son ?',
        'fin-phrase': 'Bien joué !',
        'fin': 'C\'est fini !'
    }

    return (
        <>
            <Head><title>Dans la phrase — ACLEF</title></Head>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: isMobile ? '15px' : '30px',
                fontFamily: "'Andika', 'Comic Sans MS', sans-serif",
                touchAction: dragging ? 'none' : 'auto',
                userSelect: dragging ? 'none' : 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    {btnRetour}
                    {phrase && phase !== 'fin' && (
                        <div style={{ color: 'white', fontSize: isMobile ? '14px' : '16px', background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px' }}>
                            Phrase {phraseIdx + 1} / {phrases.length}
                        </div>
                    )}
                    {btnHome}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h1 style={{ color: 'white', fontSize: isMobile ? '24px' : '30px', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        Dans la phrase
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: isMobile ? '15px' : '18px', margin: 0, fontStyle: 'italic' }}>
                        {phaseLabels[phase]}
                    </p>
                </div>

                {loading && (<div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>Chargement…</div>)}

                {!loading && phrase && phase !== 'fin' && (
                    <div style={{
                        maxWidth: '800px', margin: '0 auto 20px auto',
                        background: 'rgba(255,255,255,0.1)', borderRadius: '16px',
                        padding: '15px 20px', textAlign: 'center',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'
                    }}>
                        <button onClick={() => lireMot(phrase.phrase)}
                            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '18px', padding: '6px 14px', borderRadius: '30px', cursor: 'pointer' }}>🔊</button>
                        <div style={{ color: 'white', fontSize: isMobile ? '20px' : '26px', fontWeight: 'bold' }}>
                            {phrase.phrase}
                        </div>
                    </div>
                )}

                {/* === PHASE 1 : ASSOCIATION DRAG-DROP === */}
                {!loading && phrase && phase === 'association' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                            {[{ num: 1, ref: slot1Ref }, { num: 2, ref: slot2Ref }].map(({ num, ref }) => {
                                const slotKey = `slot${num}`
                                const motPose = assoc[slotKey]
                                const emoji = num === 1 ? phrase.emoji1 : phrase.emoji2
                                const motAttendu = num === 1 ? phrase.mot1 : phrase.mot2
                                let bg = 'rgba(255,255,255,0.1)'
                                let border = '3px dashed rgba(255,255,255,0.3)'
                                if (assocFeedback && motPose) {
                                    const ok = motPose === motAttendu
                                    bg = ok ? 'rgba(67,233,123,0.25)' : 'rgba(245,87,108,0.25)'
                                    border = ok ? '3px solid #43e97b' : '3px solid #f5576c'
                                } else if (dragging) {
                                    border = '3px dashed #ffd700'
                                    bg = 'rgba(255,215,0,0.08)'
                                }
                                return (
                                    <div key={num} ref={ref}
                                        onClick={() => handleSlotClick(num)}
                                        style={{
                                            background: bg, border, borderRadius: '20px',
                                            padding: isMobile ? '20px' : '30px',
                                            textAlign: 'center',
                                            cursor: motPose && !assocFeedback ? 'pointer' : 'default',
                                            minHeight: '180px',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s ease'
                                        }}>
                                        <div style={{ fontSize: isMobile ? '70px' : '100px', marginBottom: '10px' }}>
                                            {emoji}
                                        </div>
                                        {motPose ? (
                                            <div style={{
                                                background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                                                color: 'white', fontWeight: 'bold',
                                                fontSize: isMobile ? '22px' : '28px',
                                                padding: '8px 20px', borderRadius: '30px'
                                            }}>
                                                {motPose}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontStyle: 'italic' }}>
                                                Dépose un mot ici
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Mots à draguer */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', minHeight: '70px' }}>
                            {assoc.shownWords.map(mot => {
                                const enSlot = assoc.slot1 === mot || assoc.slot2 === mot
                                const selected = assoc.selectedMot === mot
                                if (enSlot) return null
                                const enDrag = dragging?.mot === mot
                                return (
                                    <div key={mot}
                                        onPointerDown={(e) => handlePointerDown(e, mot)}
                                        style={{
                                            background: selected
                                                ? 'linear-gradient(135deg, #f5576c, #f093fb)'
                                                : 'linear-gradient(135deg, #667eea, #764ba2)',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: isMobile ? '22px' : '30px',
                                            padding: isMobile ? '14px 24px' : '18px 32px',
                                            borderRadius: '40px',
                                            cursor: 'grab',
                                            boxShadow: selected ? '0 6px 20px rgba(245,87,108,0.5)' : '0 4px 12px rgba(0,0,0,0.2)',
                                            transform: selected ? 'scale(1.05)' : 'none',
                                            transition: 'all 0.2s ease',
                                            touchAction: 'none',
                                            opacity: enDrag ? 0.3 : 1,
                                            userSelect: 'none'
                                        }}>
                                        {mot}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Clone flottant pendant le drag */}
                        {dragging && (
                            <div style={{
                                position: 'fixed',
                                left: dragging.x - dragging.offsetX,
                                top: dragging.y - dragging.offsetY,
                                background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                                color: 'white', fontWeight: 'bold',
                                fontSize: isMobile ? '22px' : '30px',
                                padding: isMobile ? '14px 24px' : '18px 32px',
                                borderRadius: '40px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                                pointerEvents: 'none',
                                zIndex: 9999,
                                userSelect: 'none'
                            }}>
                                {dragging.mot}
                            </div>
                        )}

                        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '13px', marginBottom: '15px' }}>
                            Glisse un mot sur l'image qui lui correspond
                        </p>

                        {assoc.slot1 && assoc.slot2 && !assocFeedback && (
                            <div style={{ textAlign: 'center' }}>
                                <button onClick={validerAssociation}
                                    style={{
                                        background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                        border: 'none', color: 'white',
                                        fontSize: '20px', padding: '14px 32px',
                                        borderRadius: '30px', cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}>Valider ✓</button>
                            </div>
                        )}
                    </div>
                )}

                {/* === PHASE 2 : SEGMENTATION === */}
                {!loading && phrase && phase === 'segmentation' && mot1Info && mot2Info && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <p style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: isMobile ? '16px' : '18px', marginBottom: '20px' }}>
                            Clique sur les morceaux pour les entendre
                        </p>
                        {[{ mot: phrase.mot1, info: mot1Info, emoji: phrase.emoji1 },
                          { mot: phrase.mot2, info: mot2Info, emoji: phrase.emoji2 }].map((w, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '20px',
                                padding: '20px',
                                marginBottom: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                flexWrap: 'wrap',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: isMobile ? '40px' : '50px' }}>{w.emoji}</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {w.info.decoupage.map((syll, j) => {
                                        const isG = j === w.info.syllabeIdx
                                        return (
                                            <div key={j}
                                                onClick={() => isG ? jouerSonReference(w.info.syllabeRec) : lireMot(syll)}
                                                style={{
                                                    background: isG ? 'linear-gradient(135deg, #ffd700, #ffa500)' : 'rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: isMobile ? '24px' : '32px',
                                                    padding: isMobile ? '10px 16px' : '12px 20px',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    border: isG ? '2px solid white' : '2px solid transparent'
                                                }}>
                                                {syll}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button onClick={() => setPhase('enregistrement')}
                                style={{
                                    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                    border: 'none', color: 'white',
                                    fontSize: '20px', padding: '14px 32px',
                                    borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold'
                                }}>Continuer →</button>
                        </div>
                    </div>
                )}

                {/* === PHASE 3 : ENREGISTREMENT === */}
                {!loading && phrase && phase === 'enregistrement' && infoCourantRec && (
                    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                        <div style={{ color: 'white', fontSize: isMobile ? '16px' : '18px', marginBottom: '10px' }}>
                            Mot {recIdx + 1} / 2
                        </div>
                        <div style={{
                            background: 'rgba(255,255,255,0.1)', borderRadius: '20px',
                            padding: isMobile ? '20px' : '30px', marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: isMobile ? '50px' : '70px', marginBottom: '10px' }}>
                                {recIdx === 0 ? phrase.emoji1 : phrase.emoji2}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '10px' }}>
                                Dans ce mot :
                            </div>
                            <div style={{ color: 'white', fontSize: isMobile ? '24px' : '32px', fontWeight: 'bold', marginBottom: '20px' }}>
                                {motCourantRec}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? '18px' : '22px', marginBottom: '10px' }}>
                                Dis ce son à voix haute :
                            </div>
                            <div style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                                color: 'white', fontWeight: 'bold',
                                fontSize: isMobile ? '40px' : '56px',
                                padding: '10px 30px', borderRadius: '20px', marginBottom: '20px'
                            }}>{infoCourantRec.syllabeRec}</div>
                            <div style={{ marginBottom: '15px' }}>
                                <button onClick={() => jouerSonReference(infoCourantRec.syllabeRec)}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid white', color: 'white', fontSize: '16px', padding: '8px 18px', borderRadius: '30px', cursor: 'pointer' }}>
                                    🔊 Écouter le modèle
                                </button>
                            </div>

                            <VoiceRecorder maxDuration={5} onRecordingComplete={handleRecordingComplete} />

                            {audioUrls[syllabeNormCourante] && (
                                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(67,233,123,0.15)', borderRadius: '12px' }}>
                                    <div style={{ color: '#43e97b', marginBottom: '8px' }}>✓ Enregistré !</div>
                                    <button onClick={() => ecouterMaVoix(syllabeNormCourante)}
                                        style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid white', color: 'white', fontSize: '14px', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer' }}>
                                        🎧 Écouter ma voix
                                    </button>
                                </div>
                            )}
                            {uploading && <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '10px', fontSize: '13px' }}>Sauvegarde…</div>}
                            {uploadError && (
                                <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(245,87,108,0.25)', border: '2px solid #f5576c', borderRadius: '12px', color: 'white', fontSize: '14px' }}>
                                    ❌ {uploadError}
                                </div>
                            )}
                        </div>
                        <button onClick={passerEnregistrementSuivant}
                            style={{
                                background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                border: 'none', color: 'white',
                                fontSize: '18px', padding: '14px 32px',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}>
                            {audioUrls[syllabeNormCourante]
                                ? (recIdx === 0 ? 'Passer au 2ème mot →' : 'Terminer →')
                                : (recIdx === 0 ? 'Sauter et passer au 2ème mot →' : 'Sauter et terminer →')}
                        </button>
                    </div>
                )}

                {/* === PHASE 4 : DISCRIMINATION === */}
                {!loading && phrase && phase === 'discrimination' && mot1Info && mot2Info && (
                    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                        <p style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: isMobile ? '17px' : '20px', marginBottom: '20px' }}>
                            Écoute bien les 2 sons
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            {[{ info: mot1Info, emoji: phrase.emoji1 }, { info: mot2Info, emoji: phrase.emoji2 }].map((w, i) => {
                                const enLecture = carteEnLecture === i
                                return (
                                    <div key={i} style={{
                                        background: enLecture
                                            ? 'linear-gradient(135deg, #f5576c, #f093fb)'
                                            : 'rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        padding: '20px', textAlign: 'center',
                                        border: enLecture ? '3px solid #ffd700' : '3px solid transparent',
                                        transform: enLecture ? 'scale(1.05)' : 'none',
                                        transition: 'all 0.25s ease',
                                        boxShadow: enLecture ? '0 10px 30px rgba(245,87,108,0.5)' : 'none'
                                    }}>
                                        <div style={{ fontSize: isMobile ? '50px' : '70px', marginBottom: '10px' }}>{w.emoji}</div>
                                        <div style={{
                                            background: enLecture
                                                ? 'rgba(255,255,255,0.3)'
                                                : 'linear-gradient(135deg, #ffd700, #ffa500)',
                                            color: 'white', fontWeight: 'bold',
                                            fontSize: isMobile ? '26px' : '36px',
                                            padding: '8px 20px', borderRadius: '15px',
                                            display: 'inline-block'
                                        }}>{w.info.syllabeRec}</div>
                                        {enLecture && (
                                            <div style={{ color: 'white', fontSize: '22px', marginTop: '8px' }}>🔊</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <button onClick={reecouterLes2}
                                disabled={carteEnLecture !== null}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: '2px solid white',
                                    color: 'white',
                                    fontSize: '16px',
                                    padding: '10px 24px',
                                    borderRadius: '30px',
                                    cursor: carteEnLecture !== null ? 'wait' : 'pointer',
                                    opacity: carteEnLecture !== null ? 0.6 : 1
                                }}>
                                ▶️ Réécouter les 2 sons
                            </button>
                        </div>

                        {!discrimFeedback ? (
                            <>
                                <p style={{ color: 'white', textAlign: 'center', fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                                    Est-ce le même son ?
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <button onClick={() => handleReponseMemeSon(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                                            border: 'none', color: 'white',
                                            fontSize: isMobile ? '22px' : '28px',
                                            padding: isMobile ? '22px' : '28px',
                                            borderRadius: '20px', cursor: 'pointer',
                                            fontWeight: 'bold',
                                            boxShadow: '0 6px 15px rgba(67,233,123,0.4)'
                                        }}>✓ Oui, pareil</button>
                                    <button onClick={() => handleReponseMemeSon(false)}
                                        style={{
                                            background: 'linear-gradient(135deg, #f5576c, #f093fb)',
                                            border: 'none', color: 'white',
                                            fontSize: isMobile ? '22px' : '28px',
                                            padding: isMobile ? '22px' : '28px',
                                            borderRadius: '20px', cursor: 'pointer',
                                            fontWeight: 'bold',
                                            boxShadow: '0 6px 15px rgba(245,87,108,0.4)'
                                        }}>✗ Non, pas pareil</button>
                                </div>
                            </>
                        ) : (
                            <div style={{
                                background: discrimFeedback === 'ok'
                                    ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                                    : 'linear-gradient(135deg, #f5576c, #f093fb)',
                                borderRadius: '20px', padding: '25px', textAlign: 'center', color: 'white'
                            }}>
                                <div style={{ fontSize: '60px', marginBottom: '10px' }}>
                                    {discrimFeedback === 'ok' ? '✓' : '✗'}
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                                    {discrimFeedback === 'ok'
                                        ? 'Bravo !'
                                        : phrase.meme_son
                                            ? 'En fait, c\'est bien le même son.'
                                            : 'En fait, ce ne sont pas les mêmes sons.'}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* === FIN PHRASE === */}
                {!loading && phrase && phase === 'fin-phrase' && (
                    <div style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
                        <div style={{ fontSize: '70px', marginBottom: '10px' }}>👍</div>
                        <h2 style={{ color: 'white', marginBottom: '25px' }}>Phrase terminée !</h2>
                        <button onClick={phraseSuivante}
                            style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                border: 'none', color: 'white', fontSize: '20px',
                                padding: '15px 32px', borderRadius: '30px',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}>
                            {phraseIdx < phrases.length - 1 ? 'Phrase suivante →' : 'Voir le résultat'}
                        </button>
                    </div>
                )}

                {/* === FIN TOTALE === */}
                {phase === 'fin' && (
                    <div style={{ maxWidth: '600px', margin: '40px auto', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', borderRadius: '20px', padding: '40px', textAlign: 'center', color: 'white' }}>
                        <div style={{ fontSize: '70px', marginBottom: '15px' }}>🎉</div>
                        <h2 style={{ margin: '0 0 15px 0', fontSize: '28px' }}>Bravo !</h2>
                        <p style={{ fontSize: '18px', margin: '0 0 8px 0' }}>
                            Associations réussies : <strong>{score.associations}</strong> / {phrases.length}
                        </p>
                        <p style={{ fontSize: '18px', margin: '0 0 20px 0' }}>
                            Bonnes réponses "même son" : <strong>{score.discrim}</strong> / {phrases.length}
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
