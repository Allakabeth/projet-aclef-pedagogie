import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabaseClient'

// Extrait les "tokens" (mots + ponctuation) d'un contenu, en gardant les espaces
function tokeniser(texte) {
    // Capture : mots (lettres+apostrophes+traits d'union) OU caractères non-mots
    const re = /([A-Za-zÀ-ÿ'\-]+)|([^A-Za-zÀ-ÿ'\-]+)/g
    const tokens = []
    let m
    while ((m = re.exec(texte)) !== null) {
        if (m[1]) {
            tokens.push({ type: 'mot', texte: m[1] })
        } else {
            tokens.push({ type: 'sep', texte: m[2] })
        }
    }
    return tokens
}

function contientG(mot) {
    return /g/i.test(mot)
}

export default function Module1Decouverte() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [loading, setLoading] = useState(true)
    const [textes, setTextes] = useState([]) // [{id, titre, groupes: [{contenu, ordre_groupe}]}]
    const [motsEcoutes, setMotsEcoutes] = useState(new Set()) // clés "texteId:groupeOrdre:index"
    const [motEnCours, setMotEnCours] = useState(null)

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

    // Charger les voix TTS
    useEffect(() => {
        const loadVoices = () => window.speechSynthesis?.getVoices()
        loadVoices()
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices
    }, [])

    // Charger les textes de l'apprenant
    useEffect(() => {
        if (!user?.id) return
        ;(async () => {
            setLoading(true)
            const { data: textesData, error: errT } = await supabase
                .from('textes_references')
                .select('id, titre')
                .eq('apprenant_id', user.id)
                .order('created_at', { ascending: false })

            if (errT || !textesData || textesData.length === 0) {
                setTextes([])
                setLoading(false)
                return
            }

            const ids = textesData.map(t => t.id)
            const { data: groupesData } = await supabase
                .from('groupes_sens')
                .select('texte_reference_id, ordre_groupe, contenu')
                .in('texte_reference_id', ids)
                .order('ordre_groupe', { ascending: true })

            // Regrouper les groupes par texte
            const parTexte = textesData.map(t => ({
                id: t.id,
                titre: t.titre,
                groupes: (groupesData || []).filter(g => g.texte_reference_id === t.id)
            }))

            // Ne garder que les textes qui ont au moins un mot avec g
            const avecG = parTexte.filter(t =>
                t.groupes.some(g => contientG(g.contenu || ''))
            )

            setTextes(avecG)
            setLoading(false)
        })()
    }, [user])

    const lireMot = useCallback((mot) => {
        if (!('speechSynthesis' in window)) return
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(mot)
        utterance.lang = 'fr-FR'
        utterance.rate = 0.75
        utterance.pitch = 1.0
        const voices = window.speechSynthesis.getVoices()
        const frVoice = voices.find(v =>
            v.lang.includes('fr') && (v.name.includes('Paul') || v.name.includes('Henri') || v.name.includes('Thomas'))
        ) || voices.find(v => v.lang.includes('fr') && !v.name.toLowerCase().includes('hortense'))
        || voices.find(v => v.lang.includes('fr'))
        if (frVoice) utterance.voice = frVoice
        window.speechSynthesis.speak(utterance)
    }, [])

    const handleMotClick = (texteId, ordre, idx, mot) => {
        const cle = `${texteId}:${ordre}:${idx}`
        setMotEnCours(cle)
        setMotsEcoutes(prev => {
            const next = new Set(prev)
            next.add(cle)
            return next
        })
        lireMot(mot)
        setTimeout(() => setMotEnCours(null), 900)
    }

    // Compteurs
    const { totalMotsG, motsEcoutesCount } = useMemo(() => {
        let total = 0
        textes.forEach(t => {
            t.groupes.forEach(g => {
                tokeniser(g.contenu || '').forEach(tok => {
                    if (tok.type === 'mot' && contientG(tok.texte)) total++
                })
            })
        })
        return { totalMotsG: total, motsEcoutesCount: motsEcoutes.size }
    }, [textes, motsEcoutes])

    if (!user) return null

    return (
        <>
            <Head>
                <title>Je repère les g — ACLEF</title>
            </Head>
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: isMobile ? '15px' : '30px',
                fontFamily: "'Andika', 'Comic Sans MS', sans-serif"
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => router.push('/lire/sons-du-g')}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🏠
                    </button>
                </div>

                {/* Titre */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h1 style={{
                        color: 'white',
                        fontSize: isMobile ? '26px' : '34px',
                        margin: '0 0 8px 0',
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                    }}>
                        🔍 Je repère les <span style={{ color: '#ffd700' }}>g</span>
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: isMobile ? '15px' : '18px',
                        margin: 0,
                        fontStyle: 'italic'
                    }}>
                        Clique sur les mots pour les entendre
                    </p>
                </div>

                {/* Compteur */}
                {!loading && totalMotsG > 0 && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '25px',
                        color: 'white',
                        fontSize: isMobile ? '16px' : '18px'
                    }}>
                        <span style={{
                            background: 'rgba(255,215,0,0.15)',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,215,0,0.4)'
                        }}>
                            {motsEcoutesCount} / {totalMotsG} mots écoutés
                        </span>
                    </div>
                )}

                {/* Contenu */}
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {loading && (
                        <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
                            Chargement de tes textes…
                        </div>
                    )}

                    {!loading && textes.length === 0 && (
                        <div style={{
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            padding: '40px',
                            textAlign: 'center',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📝</div>
                            <h2 style={{ marginTop: 0 }}>Tu n'as pas encore de textes avec des « g »</h2>
                            <p style={{ opacity: 0.8 }}>
                                Commence par créer ou importer un texte dans la rubrique « Mes textes ».
                            </p>
                            <button
                                onClick={() => router.push('/lire')}
                                style={{
                                    marginTop: '15px',
                                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '16px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Aller à mes textes
                            </button>
                        </div>
                    )}

                    {!loading && textes.map(texte => (
                        <div key={texte.id} style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '20px',
                            padding: isMobile ? '18px' : '28px',
                            marginBottom: '20px',
                            boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
                        }}>
                            <h2 style={{
                                color: '#ffd700',
                                fontSize: isMobile ? '18px' : '22px',
                                marginTop: 0,
                                marginBottom: '15px'
                            }}>
                                {texte.titre}
                            </h2>

                            <div style={{
                                color: 'white',
                                fontSize: isMobile ? '20px' : '24px',
                                lineHeight: 1.8
                            }}>
                                {texte.groupes.map(groupe => {
                                    const tokens = tokeniser(groupe.contenu || '')
                                    return (
                                        <span key={groupe.ordre_groupe}>
                                            {tokens.map((tok, i) => {
                                                if (tok.type !== 'mot') {
                                                    return <span key={i}>{tok.texte}</span>
                                                }
                                                if (!contientG(tok.texte)) {
                                                    return <span key={i}>{tok.texte}</span>
                                                }
                                                const cle = `${texte.id}:${groupe.ordre_groupe}:${i}`
                                                const ecoute = motsEcoutes.has(cle)
                                                const enCours = motEnCours === cle
                                                return (
                                                    <span
                                                        key={i}
                                                        onClick={() => handleMotClick(texte.id, groupe.ordre_groupe, i, tok.texte)}
                                                        style={{
                                                            display: 'inline-block',
                                                            background: enCours
                                                                ? 'linear-gradient(135deg, #f5576c, #f093fb)'
                                                                : ecoute
                                                                    ? 'rgba(255,215,0,0.35)'
                                                                    : 'rgba(255,215,0,0.15)',
                                                            border: ecoute
                                                                ? '2px solid #ffd700'
                                                                : '2px solid rgba(255,215,0,0.4)',
                                                            color: 'white',
                                                            padding: '2px 10px',
                                                            borderRadius: '10px',
                                                            cursor: 'pointer',
                                                            margin: '0 2px',
                                                            fontWeight: 'bold',
                                                            transform: enCours ? 'scale(1.08)' : 'none',
                                                            transition: 'all 0.2s ease',
                                                            userSelect: 'none'
                                                        }}
                                                    >
                                                        {tok.texte}
                                                    </span>
                                                )
                                            })}
                                            {' '}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {!loading && textes.length > 0 && motsEcoutesCount === totalMotsG && totalMotsG > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                            borderRadius: '20px',
                            padding: '30px',
                            textAlign: 'center',
                            color: 'white',
                            marginTop: '20px'
                        }}>
                            <div style={{ fontSize: '60px', marginBottom: '10px' }}>🎉</div>
                            <h2 style={{ margin: 0 }}>Tu as écouté tous les mots avec g !</h2>
                            <p style={{ opacity: 0.9, marginTop: '8px' }}>
                                Tu peux passer au module suivant.
                            </p>
                            <button
                                onClick={() => router.push('/lire/sons-du-g')}
                                style={{
                                    marginTop: '15px',
                                    background: 'rgba(255,255,255,0.25)',
                                    border: '2px solid white',
                                    color: 'white',
                                    fontSize: '16px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Retour aux modules
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
