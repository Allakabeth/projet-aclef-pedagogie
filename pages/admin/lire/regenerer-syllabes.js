import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function RegenereSyllabes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRegenerating, setIsRegenerating] = useState(false)
    const [result, setResult] = useState(null)
    const [textes, setTextes] = useState([])
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadTextes()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/textes/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setTextes(data.textes || [])
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        }
    }

    const regenererTous = async () => {
        setIsRegenerating(true)
        setResult(null)

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/syllabes-mots/regenerer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({}) // Tous les textes
            })

            if (response.ok) {
                const data = await response.json()
                setResult(data)
            } else {
                const error = await response.json()
                setResult({ error: error.error || 'Erreur inconnue' })
            }
        } catch (error) {
            console.error('Erreur régénération:', error)
            setResult({ error: 'Erreur de connexion' })
        } finally {
            setIsRegenerating(false)
        }
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#3b82f6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    color: '#1f2937',
                    textAlign: 'center'
                }}>
                    🔧 Régénération des Monosyllabes
                </h1>

                <div style={{
                    background: '#fef3c7',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ color: '#92400e', marginBottom: '15px' }}>⚠️ Attention</h3>
                    <p style={{ color: '#92400e', lineHeight: '1.5' }}>
                        Cette opération va :
                    </p>
                    <ul style={{ color: '#92400e', marginLeft: '20px', marginTop: '10px' }}>
                        <li>Supprimer tous les monosyllabes existants</li>
                        <li>Recalculer et régénérer les monosyllabes corrects</li>
                        <li>Corriger les erreurs comme "seront" (2 syllabes)</li>
                    </ul>
                </div>

                <div style={{
                    background: '#f8f9fa',
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#333' }}>📚 Vos textes actels :</h3>
                    
                    {textes.length === 0 ? (
                        <p style={{ color: '#666' }}>Aucun texte trouvé</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {textes.map(texte => (
                                <div key={texte.id} style={{
                                    padding: '15px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                }}>
                                    <strong>{texte.titre}</strong>
                                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                                        {texte.nombre_mots_total} mots total
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={regenererTous}
                        disabled={isRegenerating || textes.length === 0}
                        style={{
                            backgroundColor: isRegenerating ? '#9ca3af' : '#dc2626',
                            color: 'white',
                            padding: '15px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: isRegenerating ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isRegenerating ? '🔄 Régénération en cours...' : '🚀 Régénérer tous les monosyllabes'}
                    </button>
                </div>

                {result && (
                    <div style={{
                        background: result.error ? '#fee2e2' : '#d1fae5',
                        padding: '25px',
                        borderRadius: '12px',
                        border: `2px solid ${result.error ? '#dc2626' : '#10b981'}`
                    }}>
                        {result.error ? (
                            <div>
                                <h3 style={{ color: '#dc2626', marginBottom: '10px' }}>❌ Erreur</h3>
                                <p style={{ color: '#dc2626' }}>{result.error}</p>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ color: '#059669', marginBottom: '15px' }}>✅ Régénération terminée !</h3>
                                <p style={{ color: '#059669', marginBottom: '15px' }}>
                                    <strong>{result.total_monosyllabes_generes}</strong> monosyllabes générés pour <strong>{result.resultats?.length}</strong> texte(s)
                                </p>
                                
                                {result.resultats && (
                                    <div style={{ marginTop: '15px' }}>
                                        <h4 style={{ color: '#059669', marginBottom: '10px' }}>Détails par texte :</h4>
                                        {result.resultats.map((r, index) => (
                                            <div key={index} style={{
                                                background: 'white',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                marginBottom: '8px',
                                                border: '1px solid #a7f3d0'
                                            }}>
                                                <strong>{r.titre}</strong>: {r.monosyllabes_generes} monosyllabes 
                                                ({r.mots_examines} mots examinés)
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button
                        onClick={() => router.push('/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 30px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        ← Retour au menu Lire
                    </button>
                </div>
            </div>
        </div>
    )
}