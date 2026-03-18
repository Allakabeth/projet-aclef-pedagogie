import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const THEMES = [
    { value: 'articles_definis', label: 'Articles définis', desc: 'le, la, l\', les', icon: '📌' },
    { value: 'articles_indefinis', label: 'Articles indéfinis', desc: 'un, une, des', icon: '📎' },
    { value: 'possessifs', label: 'Possessifs', desc: 'mon, ma, mes, ton, ta...', icon: '🏷️' },
    { value: 'demonstratifs', label: 'Démonstratifs', desc: 'ce, cet, cette, ces', icon: '👆' },
    { value: 'pronoms', label: 'Pronoms', desc: 'je, tu, il, elle, on...', icon: '🙋' },
    { value: 'singulier_pluriel', label: 'Singulier / Pluriel', desc: 'un chat / des chats', icon: '🔢' },
    { value: 'masculin_feminin', label: 'Masculin / Féminin', desc: 'il / elle', icon: '⚡' },
    { value: 'accords_adjectifs', label: 'Accords', desc: 'petit / petite / petits', icon: '🔗' },
    { value: 'homophones_a', label: 'a / à', desc: 'Il a un chat. Je vais à Paris.', icon: '🔤' },
    { value: 'homophones_on_ont', label: 'on / ont', desc: 'On mange. Ils ont faim.', icon: '🔤' },
    { value: 'homophones_et_est', label: 'et / est', desc: 'Pain et beurre. Il est grand.', icon: '🔤' },
    { value: 'homophones_son_sont', label: 'son / sont, ou / où', desc: 'Son livre. Ils sont là.', icon: '🔤' },
    { value: 'contraires_synonymes', label: 'Contraires', desc: 'grand / petit, chaud / froid', icon: '↔️' },
    { value: 'familles_mots', label: 'Familles de mots', desc: 'lait, laitier, laitage', icon: '🌳' },
    { value: 'conjonctions', label: 'Mais, et, ou', desc: 'Relier des phrases', icon: '🔀' },
    { value: 'negation', label: 'Négation', desc: 'ne... pas, ne... plus', icon: '🚫' },
    { value: 'construction_phrases', label: 'Construire une phrase', desc: 'Remettre les mots en ordre', icon: '🧱' },
    { value: 'conjugaison_present', label: 'Présent', desc: 'je mange, tu manges...', icon: '⏰' },
    { value: 'conjugaison_passe', label: 'Passé composé', desc: 'j\'ai mangé, tu as mangé...', icon: '⏪' },
    { value: 'conjugaison_imparfait_futur', label: 'Imparfait / Futur', desc: 'je mangeais, je mangerai', icon: '⏩' }
]

export default function OrthographeThemes() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [exercices, setExercices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (!token || !userData) { router.push('/login'); return }
        try { setUser(JSON.parse(userData)) } catch { router.push('/login'); return }
        loadAll(token)
    }, [router])

    async function loadAll(token) {
        try {
            const res = await fetch('/api/orthographe/exercices', {
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

    // Stats par thème
    function getThemeStats(themeValue) {
        const exs = exercices.filter(e => e.theme_grammatical === themeValue)
        const total = exs.length
        const faits = exs.filter(e => e.deja_fait).length
        const moy = faits > 0
            ? Math.round(exs.filter(e => e.deja_fait).reduce((s, e) => s + e.meilleur_score, 0) / faits)
            : null
        return { total, faits, moy }
    }

    if (!user) return null

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Orthographe</h1>
            <p style={styles.subtitle}>Choisis un thème pour t'entraîner</p>

            {loading ? (
                <p style={styles.loading}>Chargement...</p>
            ) : (
                <div style={styles.grid}>
                    {THEMES.map(theme => {
                        const stats = getThemeStats(theme.value)
                        const hasExercices = stats.total > 0
                        return (
                            <button
                                key={theme.value}
                                onClick={() => hasExercices && router.push(`/ecrire/orthographe/${theme.value}`)}
                                style={{
                                    ...styles.card,
                                    opacity: hasExercices ? 1 : 0.45,
                                    cursor: hasExercices ? 'pointer' : 'default'
                                }}
                            >
                                <div style={styles.cardIcon}>{theme.icon}</div>
                                <div style={styles.cardLabel}>{theme.label}</div>
                                <div style={styles.cardDesc}>{theme.desc}</div>
                                {hasExercices ? (
                                    <div style={styles.progressBar}>
                                        <div style={{
                                            ...styles.progressFill,
                                            width: `${stats.total > 0 ? (stats.faits / stats.total) * 100 : 0}%`,
                                            backgroundColor: stats.faits === stats.total && stats.total > 0 ? '#10b981' : '#8b5cf6'
                                        }} />
                                    </div>
                                ) : (
                                    <div style={styles.cardSoon}>Bientôt</div>
                                )}
                                {hasExercices && (
                                    <div style={styles.cardStats}>
                                        {stats.faits}/{stats.total} fait{stats.faits > 1 ? 's' : ''}
                                        {stats.moy !== null && ` · ${stats.moy}%`}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            <button onClick={() => router.push('/ecrire')} style={styles.backBtn}>
                ← Retour
            </button>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8f6ff',
        padding: 'clamp(16px, 4vw, 32px)',
        fontFamily: 'Arial, sans-serif'
    },
    title: {
        fontSize: 'clamp(26px, 6vw, 38px)',
        fontWeight: 'bold',
        color: '#7c3aed',
        textAlign: 'center',
        margin: '0 0 6px 0'
    },
    subtitle: {
        fontSize: 'clamp(15px, 3.5vw, 18px)',
        color: '#64748b',
        textAlign: 'center',
        margin: '0 0 28px 0'
    },
    loading: { textAlign: 'center', color: '#888', padding: '40px' },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 40vw, 200px), 1fr))',
        gap: 'clamp(10px, 2.5vw, 16px)',
        maxWidth: '900px',
        margin: '0 auto 32px'
    },
    card: {
        backgroundColor: '#fff',
        border: '2px solid #e9e5f5',
        borderRadius: '16px',
        padding: 'clamp(14px, 3vw, 20px)',
        textAlign: 'center',
        transition: 'transform 0.15s, box-shadow 0.15s'
    },
    cardIcon: { fontSize: 'clamp(28px, 7vw, 40px)', marginBottom: '8px' },
    cardLabel: {
        fontSize: 'clamp(14px, 3.2vw, 17px)',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '4px'
    },
    cardDesc: {
        fontSize: 'clamp(11px, 2.5vw, 13px)',
        color: '#94a3b8',
        marginBottom: '10px',
        lineHeight: '1.3'
    },
    progressBar: {
        height: '6px',
        backgroundColor: '#e9e5f5',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '6px'
    },
    progressFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.3s'
    },
    cardStats: {
        fontSize: 'clamp(10px, 2.2vw, 12px)',
        color: '#8b5cf6',
        fontWeight: '600'
    },
    cardSoon: {
        fontSize: '11px',
        color: '#cbd5e1',
        fontStyle: 'italic'
    },
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
