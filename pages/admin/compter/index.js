import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const MODE_NAMES = {
    learning: 'Apprentissage',
    n1: 'Niveau 1',
    n2: 'Niveau 2'
}

function formatDuree(totalSeconds) {
    if (!totalSeconds) return '0s'
    const min = Math.floor(totalSeconds / 60)
    const sec = totalSeconds % 60
    if (min === 0) return `${sec}s`
    return sec > 0 ? `${min}min ${sec}s` : `${min}min`
}

function formatDate(isoString) {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export default function AdminCompter() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [apprenants, setApprenants] = useState([])
    const [selectedApprenantId, setSelectedApprenantId] = useState('')
    const [allLearnersData, setAllLearnersData] = useState(null)
    const [resultats, setResultats] = useState(null)
    const [loadingData, setLoadingData] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')
        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }
        setIsLoading(false)
        loadApprenants()
        loadAllLearnersData()
    }, [router])

    const loadApprenants = async () => {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch('/api/admin/apprenants-list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setApprenants(data.apprenants || [])
            }
        } catch (error) {
            console.error('Erreur chargement apprenants:', error)
        }
    }

    const loadAllLearnersData = async () => {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch('/api/admin/compter/resultats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setAllLearnersData(data.apprenants || [])
            }
        } catch (error) {
            console.error('Erreur chargement donnees:', error)
        }
    }

    const loadResultatsApprenant = async (apprenantId) => {
        if (!apprenantId) {
            setResultats(null)
            return
        }
        setLoadingData(true)
        try {
            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch(`/api/admin/compter/resultats?apprenant_id=${apprenantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setResultats(data)
            }
        } catch (error) {
            console.error('Erreur chargement resultats:', error)
        }
        setLoadingData(false)
    }

    const handleApprenantChange = (e) => {
        const id = e.target.value
        setSelectedApprenantId(id)
        loadResultatsApprenant(id)
    }

    const selectApprenant = (id) => {
        setSelectedApprenantId(id)
        loadResultatsApprenant(id)
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '18px', color: '#64748b' }}>Chargement...</p>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => router.push('/admin')}
                        style={{
                            backgroundColor: '#6b7280', color: 'white', padding: '10px 20px',
                            border: 'none', borderRadius: '10px', fontSize: '14px',
                            fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        ← Retour
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                        Module Compter - Resultats
                    </h1>
                </div>

                {/* Sélecteur d'apprenant */}
                <div style={{
                    background: 'white', padding: '16px', borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px'
                }}>
                    <label style={{ fontWeight: 'bold', marginRight: '10px', color: '#374151' }}>
                        Apprenant :
                    </label>
                    <select
                        value={selectedApprenantId}
                        onChange={handleApprenantChange}
                        style={{
                            padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px',
                            fontSize: '15px', minWidth: '300px', maxWidth: '100%'
                        }}
                    >
                        <option value="">-- Vue d'ensemble --</option>
                        {apprenants.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.identifiant} - {a.prenom} {a.nom}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Loading */}
                {loadingData && (
                    <div style={{
                        background: 'white', padding: '40px', borderRadius: '12px',
                        textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <p style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>
                            Chargement des resultats...
                        </p>
                    </div>
                )}

                {/* Vue d'ensemble (aucun apprenant sélectionné) */}
                {!selectedApprenantId && !loadingData && (
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151', marginTop: 0, marginBottom: '16px' }}>
                            Vue d'ensemble - Tous les apprenants
                        </h2>

                        {(!allLearnersData || allLearnersData.length === 0) ? (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                                Aucune session enregistree pour le moment.
                            </p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#fef3c7' }}>
                                            <th style={thStyle}>Apprenant</th>
                                            <th style={thStyle}>Sessions</th>
                                            <th style={thStyle}>Temps total</th>
                                            <th style={thStyle}>Score moyen</th>
                                            <th style={thStyle}>Terminees</th>
                                            <th style={thStyle}>Derniere session</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allLearnersData.map((a, i) => (
                                            <tr
                                                key={a.id}
                                                style={{
                                                    background: i % 2 === 0 ? '#fff' : '#f9fafb',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => selectApprenant(a.id)}
                                            >
                                                <td style={tdStyle}>
                                                    <strong>{a.prenom} {a.nom}</strong>
                                                    <br />
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>{a.identifiant}</span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{a.stats.nombre_sessions}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDuree(a.stats.temps_total_secondes)}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{a.stats.score_moyen}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    {a.stats.sessions_terminees}/{a.stats.nombre_sessions}
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center', fontSize: '13px' }}>
                                                    {formatDate(a.stats.derniere_session)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Vue détaillée d'un apprenant */}
                {selectedApprenantId && resultats && !loadingData && (
                    <>
                        {/* Cartes de stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                            <StatCard
                                label="Sessions"
                                value={resultats.stats.nombre_sessions}
                                color="#3b82f6"
                            />
                            <StatCard
                                label="Temps total"
                                value={formatDuree(resultats.stats.temps_total_secondes)}
                                color="#10b981"
                            />
                            <StatCard
                                label="Score moyen"
                                value={resultats.stats.score_moyen}
                                color="#f59e0b"
                            />
                            <StatCard
                                label="Taux completion"
                                value={`${resultats.stats.taux_completion}%`}
                                color="#8b5cf6"
                            />
                        </div>

                        {/* Détail par exercice */}
                        {Object.entries(resultats.stats.par_exercice || {}).map(([exercice, exStats]) => (
                            <div key={exercice} style={{
                                background: 'white', borderRadius: '12px', padding: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px',
                                borderLeft: '4px solid #f59e0b'
                            }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#374151' }}>
                                    {exercice === 'complements-a-10' ? 'Complements a 10' : exercice}
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {Object.entries(exStats.par_mode || {}).map(([mode, modeStats]) => (
                                        <div key={mode} style={{
                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: '8px', padding: '10px 14px', minWidth: '160px'
                                        }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#475569', marginBottom: '4px' }}>
                                                {MODE_NAMES[mode] || mode}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                {modeStats.nombre} session{modeStats.nombre > 1 ? 's' : ''} - Score moy. {modeStats.score_moyen}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {exStats.meilleur_temps && (
                                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
                                        Meilleur temps (termine) : {formatDuree(exStats.meilleur_temps)}
                                    </p>
                                )}
                            </div>
                        ))}

                        {/* Historique des sessions */}
                        <div style={{
                            background: 'white', borderRadius: '12px', padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#374151' }}>
                                Historique des sessions
                            </h3>

                            {resultats.sessions.length === 0 ? (
                                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                                    Aucune session enregistree.
                                </p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ background: '#fef3c7' }}>
                                                <th style={thStyle}>Date</th>
                                                <th style={thStyle}>Exercice</th>
                                                <th style={thStyle}>Mode</th>
                                                <th style={thStyle}>Score</th>
                                                <th style={thStyle}>Duree</th>
                                                <th style={thStyle}>Termine</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultats.sessions.map((s, i) => (
                                                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                    <td style={tdStyle}>{formatDate(s.created_at)}</td>
                                                    <td style={tdStyle}>
                                                        {s.exercice === 'complements-a-10' ? 'Complements a 10' : s.exercice}
                                                    </td>
                                                    <td style={tdStyle}>{MODE_NAMES[s.mode] || s.mode}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{s.score}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDuree(s.duree_secondes)}</td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <span style={{
                                                            background: s.termine ? '#dcfce7' : '#fef2f2',
                                                            color: s.termine ? '#166534' : '#991b1b',
                                                            padding: '3px 8px', borderRadius: '6px',
                                                            fontSize: '12px', fontWeight: 'bold'
                                                        }}>
                                                            {s.termine ? 'Oui' : 'Non'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, color }) {
    return (
        <div style={{
            background: 'white', borderRadius: '12px', padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: `3px solid ${color}`, textAlign: 'center'
        }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                {label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>
                {value}
            </div>
        </div>
    )
}

const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#92400e',
    borderBottom: '2px solid #fde68a'
}

const tdStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9'
}
