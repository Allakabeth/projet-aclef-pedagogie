import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const TYPES_EXERCICES = [
    { value: 'fill_blank', label: 'Texte à trous', icon: '📝' },
    { value: 'binary_choice', label: 'Choix en contexte', icon: '🔘' },
    { value: 'ordering', label: 'Remettre en ordre', icon: '🔢' },
    { value: 'matching', label: 'Appariement', icon: '🔗' },
    { value: 'classification', label: 'Classification', icon: '📂' },
    { value: 'transformation', label: 'Transformation', icon: '🔄' }
]

const THEMES = [
    { value: 'articles_definis', label: 'Articles définis (le/la/l\'/les)' },
    { value: 'articles_indefinis', label: 'Articles indéfinis (un/une/des)' },
    { value: 'possessifs', label: 'Possessifs (mon/ma/mes...)' },
    { value: 'demonstratifs', label: 'Démonstratifs (ce/cette/ces)' },
    { value: 'pronoms', label: 'Pronoms personnels' },
    { value: 'singulier_pluriel', label: 'Singulier / Pluriel' },
    { value: 'masculin_feminin', label: 'Masculin / Féminin' },
    { value: 'accords_adjectifs', label: 'Accords des adjectifs' },
    { value: 'homophones_a', label: 'Homophones a/à' },
    { value: 'homophones_on_ont', label: 'Homophones on/ont' },
    { value: 'homophones_et_est', label: 'Homophones et/est' },
    { value: 'homophones_son_sont', label: 'Homophones son/sont, ou/où' },
    { value: 'contraires_synonymes', label: 'Contraires et synonymes' },
    { value: 'familles_mots', label: 'Familles de mots' },
    { value: 'conjonctions', label: 'Conjonctions (mais/et/ou)' },
    { value: 'negation', label: 'Négation' },
    { value: 'construction_phrases', label: 'Construction de phrases' },
    { value: 'conjugaison_present', label: 'Conjugaison présent' },
    { value: 'conjugaison_passe', label: 'Conjugaison passé composé' },
    { value: 'conjugaison_imparfait_futur', label: 'Conjugaison imparfait/futur' }
]

const NIVEAUX = [
    { value: 'A', label: 'Niveau A (bases)', color: '#10b981' },
    { value: 'B', label: 'Niveau B (intermédiaire)', color: '#f59e0b' },
    { value: 'C', label: 'Niveau C (avancé)', color: '#ef4444' }
]

export default function AdminOrthographeListe() {
    const router = useRouter()
    const [exercices, setExercices] = useState([])
    const [loading, setLoading] = useState(true)
    const [themeFilter, setThemeFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [niveauFilter, setNiveauFilter] = useState('')

    useEffect(() => {
        loadExercices()
    }, [])

    async function loadExercices() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/aclef-pedagogie-admin')
                return
            }

            const params = new URLSearchParams()
            if (themeFilter) params.append('theme_grammatical', themeFilter)
            if (typeFilter) params.append('type', typeFilter)
            if (niveauFilter) params.append('niveau', niveauFilter)

            const response = await fetch(`/api/admin/ecrire/orthographe/exercices?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors du chargement')

            const data = await response.json()
            setExercices(data.exercices || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id) {
        if (!confirm('Confirmer la suppression de cet exercice ?')) return

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/ecrire/orthographe/exercices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors de la suppression')

            loadExercices()
        } catch (err) {
            console.error('Erreur:', err)
            alert('Erreur: ' + err.message)
        }
    }

    const getTypeInfo = (type) => TYPES_EXERCICES.find(t => t.value === type) || { label: type, icon: '?' }
    const getThemeLabel = (theme) => THEMES.find(t => t.value === theme)?.label || theme
    const getNiveauColor = (niveau) => NIVEAUX.find(n => n.value === niveau)?.color || '#6b7280'

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📦 Orthographe - Boîtes Bleues</h1>
                    <p style={styles.subtitle}>{exercices.length} exercice{exercices.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => router.push('/admin/ecrire')} style={styles.backButton}>
                    ← Retour
                </button>
            </div>

            <div style={styles.toolbar}>
                <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)} style={styles.select}>
                    <option value="">Tous les thèmes</option>
                    {THEMES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.select}>
                    <option value="">Tous les types</option>
                    {TYPES_EXERCICES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                </select>

                <select value={niveauFilter} onChange={(e) => setNiveauFilter(e.target.value)} style={styles.select}>
                    <option value="">Tous les niveaux</option>
                    {NIVEAUX.map(n => (
                        <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                </select>

                <button onClick={loadExercices} style={styles.refreshButton}>Actualiser</button>

                <div style={{ flex: 1 }} />

                <button onClick={() => router.push('/admin/ecrire/orthographe/import')} style={styles.importButton}>
                    Import JSON
                </button>
                <button onClick={() => router.push('/admin/ecrire/orthographe/nouveau')} style={styles.addButton}>
                    + Nouvel exercice
                </button>
            </div>

            {loading ? (
                <p style={styles.loading}>Chargement...</p>
            ) : (
                <div style={styles.content}>
                    {exercices.length > 0 ? (
                        <div style={styles.grid}>
                            {exercices.map(ex => {
                                const typeInfo = getTypeInfo(ex.type)
                                return (
                                    <div key={ex.id} style={styles.card}>
                                        <div style={styles.cardHeader}>
                                            <span style={{
                                                ...styles.niveauBadge,
                                                backgroundColor: getNiveauColor(ex.niveau)
                                            }}>
                                                {ex.niveau}
                                            </span>
                                            <span style={styles.typeBadge}>{typeInfo.icon} {typeInfo.label}</span>
                                            {ex.numero_boite && (
                                                <span style={styles.numBadge}>#{ex.numero_boite}</span>
                                            )}
                                        </div>
                                        <h3 style={styles.cardTitle}>{ex.titre}</h3>
                                        <p style={styles.cardTheme}>{getThemeLabel(ex.theme_grammatical)}</p>
                                        {ex.consigne && (
                                            <p style={styles.cardConsigne}>{ex.consigne}</p>
                                        )}
                                        {ex.formation_competences && (
                                            <p style={styles.cardCompetence}>
                                                {ex.formation_competences.code} - {ex.formation_competences.intitule}
                                            </p>
                                        )}
                                        <div style={styles.cardActions}>
                                            <button
                                                onClick={() => router.push(`/admin/ecrire/orthographe/${ex.id}`)}
                                                style={styles.editButton}
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ex.id)}
                                                style={styles.deleteButton}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div style={styles.empty}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📂</div>
                            <p style={{ fontSize: '16px', color: '#999', marginBottom: '24px' }}>
                                Aucun exercice trouvé
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button onClick={() => router.push('/admin/ecrire/orthographe/nouveau')} style={styles.addButton}>
                                    + Créer un exercice
                                </button>
                                <button onClick={() => router.push('/admin/ecrire/orthographe/import')} style={styles.importButton}>
                                    Importer un lot JSON
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', fontFamily: 'Arial', maxWidth: '1400px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#8b5cf6', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' },
    select: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    refreshButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    addButton: { padding: '10px 20px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    importButton: { padding: '10px 20px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    loading: { textAlign: 'center', color: '#666', padding: '40px' },
    content: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    card: { backgroundColor: '#f9fafb', borderRadius: '10px', padding: '20px', border: '1px solid #e5e7eb' },
    cardHeader: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' },
    niveauBadge: { color: '#fff', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' },
    typeBadge: { fontSize: '12px', backgroundColor: '#ede9fe', color: '#7c3aed', padding: '2px 10px', borderRadius: '10px', fontWeight: '600' },
    numBadge: { fontSize: '11px', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '8px' },
    cardTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0 0 6px 0' },
    cardTheme: { fontSize: '13px', color: '#8b5cf6', margin: '0 0 4px 0', fontWeight: '500' },
    cardConsigne: { fontSize: '13px', color: '#64748b', margin: '0 0 8px 0', fontStyle: 'italic' },
    cardCompetence: { fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0', padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' },
    cardActions: { display: 'flex', gap: '8px' },
    editButton: { flex: 1, padding: '8px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    deleteButton: { padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    empty: { textAlign: 'center', padding: '80px 20px' }
}
