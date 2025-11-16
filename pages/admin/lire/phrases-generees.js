import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default function PhrasesGenerees() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [phrases, setPhrases] = useState([])
    const [stats, setStats] = useState(null)
    const [filtreSource, setFiltreSource] = useState('all')
    const [filtreUser, setFiltreUser] = useState('all')
    const [users, setUsers] = useState([])

    useEffect(() => {
        chargerDonnees()
    }, [filtreSource, filtreUser])

    async function chargerDonnees() {
        try {
            setLoading(true)

            // Récupérer toutes les phrases
            let query = supabaseAdmin
                .from('phrases_pregenerees')
                .select(`
                    *,
                    users:user_id (prenom, nom)
                `)
                .order('created_at', { ascending: false })

            if (filtreSource !== 'all') {
                query = query.eq('source', filtreSource)
            }

            if (filtreUser !== 'all') {
                query = query.eq('user_id', filtreUser)
            }

            const { data: phrasesData, error } = await query

            if (error) throw error

            // Grouper par combinaison de textes
            const grouped = {}
            phrasesData.forEach(p => {
                const key = p.texte_ids.sort((a, b) => a - b).join(',')
                if (!grouped[key]) {
                    grouped[key] = {
                        texte_ids: p.texte_ids,
                        phrases: [],
                        sources: new Set(),
                        users: new Set()
                    }
                }
                grouped[key].phrases.push(p)
                grouped[key].sources.add(p.source)
                if (p.users) {
                    grouped[key].users.add(`${p.users.prenom} ${p.users.nom}`)
                }
            })

            setPhrases(Object.values(grouped))

            // Statistiques globales
            const { count: totalPhrases } = await supabaseAdmin
                .from('phrases_pregenerees')
                .select('*', { count: 'exact', head: true })

            const { count: totalCombinaisons } = await supabaseAdmin
                .from('phrases_pregenerees')
                .select('texte_ids', { count: 'exact', head: true })

            setStats({
                total_phrases: totalPhrases,
                total_combinaisons: Object.keys(grouped).length,
                par_source: phrasesData.reduce((acc, p) => {
                    acc[p.source] = (acc[p.source] || 0) + 1
                    return acc
                }, {})
            })

            // Liste des users
            const { data: usersData } = await supabaseAdmin
                .from('users')
                .select('id, prenom, nom')
                .eq('role', 'apprenant')
                .order('prenom')

            setUsers(usersData || [])

        } catch (error) {
            console.error('Erreur chargement données:', error)
            alert('Erreur lors du chargement des données')
        } finally {
            setLoading(false)
        }
    }

    async function supprimerCombinaison(texteIds) {
        if (!confirm(`Supprimer toutes les phrases pour la combinaison [${texteIds.join(', ')}] ?`)) {
            return
        }

        try {
            const { error } = await supabaseAdmin
                .from('phrases_pregenerees')
                .delete()
                .eq('texte_ids', texteIds)

            if (error) throw error

            alert('Phrases supprimées avec succès')
            chargerDonnees()
        } catch (error) {
            console.error('Erreur suppression:', error)
            alert('Erreur lors de la suppression')
        }
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>📊 Phrases Générées - Toutes Combinaisons</h1>
                <button onClick={() => router.push('/admin/lire')} style={{ padding: '0.5rem 1rem' }}>
                    ← Retour Admin Lire
                </button>
            </div>

            {/* Statistiques */}
            {stats && (
                <div style={{
                    background: '#f0f0f0',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {stats.total_phrases}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Phrases totales</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
                            {stats.total_combinaisons}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Combinaisons</div>
                    </div>
                    {Object.entries(stats.par_source).map(([source, count]) => (
                        <div key={source}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333ea' }}>
                                {count}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{source}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Source :
                    </label>
                    <select
                        value={filtreSource}
                        onChange={(e) => setFiltreSource(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="all">Toutes</option>
                        <option value="groq">Groq</option>
                        <option value="openrouter-gemini">OpenRouter (Gemini)</option>
                        <option value="openrouter-deepseek">OpenRouter (DeepSeek)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Apprenant :
                    </label>
                    <select
                        value={filtreUser}
                        onChange={(e) => setFiltreUser(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="all">Tous</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.prenom} {user.nom}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => { setFiltreSource('all'); setFiltreUser('all') }}
                    style={{ alignSelf: 'flex-end', padding: '0.5rem 1rem', borderRadius: '4px' }}
                >
                    Réinitialiser filtres
                </button>
            </div>

            {/* Liste des combinaisons */}
            {phrases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    Aucune phrase générée pour ces filtres
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {phrases.map((groupe, idx) => (
                        <div
                            key={idx}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                background: '#fff'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                                        📚 Textes : [{groupe.texte_ids.join(', ')}]
                                    </h3>
                                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                        {groupe.phrases.length} phrases •
                                        Sources : {Array.from(groupe.sources).join(', ')} •
                                        Apprenants : {Array.from(groupe.users).join(', ')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => supprimerCombinaison(groupe.texte_ids)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Supprimer
                                </button>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>
                                    📝 {groupe.phrases.length} phrases :
                                </h4>
                                <div style={{
                                    display: 'grid',
                                    gap: '0.5rem',
                                    maxHeight: '500px',
                                    overflowY: 'auto',
                                    padding: '1rem',
                                    background: '#f9fafb',
                                    borderRadius: '4px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    {groupe.phrases.map((phrase, pIdx) => (
                                        <div
                                            key={pIdx}
                                            style={{
                                                padding: '0.75rem',
                                                background: 'white',
                                                borderRadius: '4px',
                                                border: '1px solid #d1d5db',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '1.05rem' }}>
                                                {pIdx + 1}. {phrase.phrase}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>
                                                    Mots ({phrase.mots.length}) : {phrase.mots.join(' • ')}
                                                </span>
                                                <span style={{ color: '#9333ea', fontWeight: 'bold' }}>
                                                    {phrase.source}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export async function getServerSideProps() {
    // Vérifier l'authentification admin ici si nécessaire
    return { props: {} }
}
