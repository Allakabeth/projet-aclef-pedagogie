import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const THEMES_LABELS = {
    articles_definis: 'Articles définis',
    articles_indefinis: 'Articles indéfinis',
    possessifs: 'Possessifs',
    demonstratifs: 'Démonstratifs',
    pronoms: 'Pronoms',
    singulier_pluriel: 'Singulier / Pluriel',
    masculin_feminin: 'Masculin / Féminin',
    accords_adjectifs: 'Accords',
    homophones_a: 'a / à',
    homophones_on_ont: 'on / ont',
    homophones_et_est: 'et / est',
    homophones_son_sont: 'son / sont, ou / où',
    contraires_synonymes: 'Contraires',
    familles_mots: 'Familles de mots',
    conjonctions: 'Mais, et, ou',
    negation: 'Négation',
    construction_phrases: 'Construire une phrase',
    conjugaison_present: 'Présent',
    conjugaison_passe: 'Passé composé',
    conjugaison_imparfait_futur: 'Imparfait / Futur'
}

const NIVEAUX = [
    { value: '', label: 'Tous' },
    { value: 'A', label: 'Niveau A', color: '#10b981' },
    { value: 'B', label: 'Niveau B', color: '#f59e0b' },
    { value: 'C', label: 'Niveau C', color: '#ef4444' }
]

const NIVEAU_COLORS = { A: '#10b981', B: '#f59e0b', C: '#ef4444' }

export default function ThemeExercices() {
    const router = useRouter()
    const { theme } = router.query
    const [user, setUser] = useState(null)
    const [exercices, setExercices] = useState([])
    const [loading, setLoading] = useState(true)
    const [niveauFilter, setNiveauFilter] = useState('')

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login'); return }
        if (theme) loadExercices(token)
    }, [router, theme])

    async function loadExercices(token) {
        try {
            setLoading(true)
            const res = await fetch(`/api/orthographe/exercices?theme=${theme}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setExercices(data.exercices || [])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!user || !theme) return null

    const themeLabel = THEMES_LABELS[theme] || theme
    const filtered = niveauFilter ? exercices.filter(e => e.niveau === niveauFilter) : exercices

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>{themeLabel}</h1>

            {/* Filtres par niveau */}
            <div style={styles.niveauBar}>
                {NIVEAUX.map(n => (
                    <button
                        key={n.value}
                        onClick={() => setNiveauFilter(n.value)}
                        style={{
                            ...styles.niveauBtn,
                            backgroundColor: niveauFilter === n.value ? (n.color || '#8b5cf6') : '#fff',
                            color: niveauFilter === n.value ? '#fff' : '#64748b',
                            borderColor: n.color || '#8b5cf6'
                        }}
                    >
                        {n.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p style={styles.loading}>Chargement...</p>
            ) : filtered.length === 0 ? (
                <div style={styles.empty}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
                    <p>Pas encore d'exercices ici</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {filtered.map(ex => (
                        <button
                            key={ex.id}
                            onClick={() => router.push(`/ecrire/orthographe/jouer/${ex.id}`)}
                            style={styles.exCard}
                        >
                            <div style={styles.exLeft}>
                                <span style={{
                                    ...styles.niveauDot,
                                    backgroundColor: NIVEAU_COLORS[ex.niveau] || '#8b5cf6'
                                }}>
                                    {ex.niveau}
                                </span>
                                <div>
                                    <div style={styles.exTitle}>{ex.titre}</div>
                                    {ex.consigne && <div style={styles.exConsigne}>{ex.consigne}</div>}
                                </div>
                            </div>
                            <div style={styles.exRight}>
                                {ex.deja_fait ? (
                                    <span style={{
                                        ...styles.scoreBadge,
                                        backgroundColor: ex.meilleur_score >= 80 ? '#dcfce7' : ex.meilleur_score >= 50 ? '#fef3c7' : '#fee2e2',
                                        color: ex.meilleur_score >= 80 ? '#16a34a' : ex.meilleur_score >= 50 ? '#d97706' : '#dc2626'
                                    }}>
                                        {ex.meilleur_score}%
                                    </span>
                                ) : (
                                    <span style={styles.newBadge}>Nouveau</span>
                                )}
                                <span style={styles.arrow}>›</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <button onClick={() => router.push('/ecrire/orthographe')} style={styles.backBtn}>
                ← Retour aux thèmes
            </button>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8f6ff',
        padding: 'clamp(16px, 4vw, 32px)',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '700px',
        margin: '0 auto'
    },
    title: {
        fontSize: 'clamp(24px, 6vw, 34px)',
        fontWeight: 'bold',
        color: '#7c3aed',
        textAlign: 'center',
        margin: '0 0 20px 0'
    },
    niveauBar: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap'
    },
    niveauBtn: {
        padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
        border: '2px solid',
        borderRadius: '25px',
        fontSize: 'clamp(13px, 3vw, 15px)',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    loading: { textAlign: 'center', color: '#888', padding: '40px' },
    empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' },
    exCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        border: '2px solid #e9e5f5',
        borderRadius: '14px',
        padding: 'clamp(12px, 3vw, 18px)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.15s, box-shadow 0.15s',
        width: '100%'
    },
    exLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
    niveauDot: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 'clamp(12px, 2.5vw, 14px)',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    exTitle: {
        fontSize: 'clamp(14px, 3.2vw, 17px)',
        fontWeight: '600',
        color: '#1e293b'
    },
    exConsigne: {
        fontSize: 'clamp(12px, 2.5vw, 14px)',
        color: '#94a3b8',
        marginTop: '2px'
    },
    exRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
    scoreBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 'bold'
    },
    newBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#ede9fe',
        color: '#7c3aed'
    },
    arrow: { fontSize: '22px', color: '#c4b5fd', fontWeight: 'bold' },
    backBtn: {
        display: 'block',
        margin: '0 auto',
        padding: '14px 32px',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: 'none',
        borderRadius: '12px',
        fontSize: 'clamp(14px, 3vw, 16px)',
        fontWeight: '600',
        cursor: 'pointer'
    }
}
