import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DebugTextes() {
    const [debugData, setDebugData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadDebugData()
    }, [])

    const loadDebugData = async () => {
        try {
            const token = localStorage.getItem('token')
            const userData = localStorage.getItem('user')
            
            if (!token) {
                alert('Pas de token trouvé - Veuillez vous connecter')
                router.push('/login')
                return
            }

            console.log('Token utilisé:', token)
            console.log('User data:', userData)

            const response = await fetch('/api/debug/check-textes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            console.log('Réponse debug:', data)
            setDebugData(data)
        } catch (error) {
            console.error('Erreur debug:', error)
            alert('Erreur lors du debug')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Chargement des données de debug...</div>
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '20px'
        }}>
            <h1>🔍 Debug - Où sont mes textes ?</h1>
            
            {debugData && debugData.debug && (
                <div>
                    <div style={{
                        background: '#f0f0f0',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h2>Informations utilisateur</h2>
                        <p><strong>Apprenant ID:</strong> {debugData.debug.apprenant_id}</p>
                        <p><strong>Type ID:</strong> {debugData.debug.apprenant_id_type}</p>
                        <p><strong>Nombre total de textes dans la base:</strong> {debugData.debug.nombre_textes_total}</p>
                        <p><strong>Nombre de vos textes:</strong> {debugData.debug.nombre_textes_utilisateur}</p>
                    </div>

                    <div style={{
                        background: '#e8f5e9',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h2>Vos textes ({debugData.debug.nombre_textes_utilisateur})</h2>
                        {debugData.debug.textes_utilisateur.length === 0 ? (
                            <p>Aucun texte trouvé pour votre compte</p>
                        ) : (
                            <ul>
                                {debugData.debug.textes_utilisateur.map(texte => (
                                    <li key={texte.id}>
                                        <strong>{texte.titre}</strong> (ID: {texte.id})
                                        <br />Créé le: {new Date(texte.created_at).toLocaleString('fr-FR')}
                                        <br />Apprenant ID: {texte.apprenant_id}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={{
                        background: '#fff3e0',
                        padding: '15px',
                        borderRadius: '8px'
                    }}>
                        <h2>Tous les textes dans la base ({debugData.debug.nombre_textes_total})</h2>
                        {debugData.debug.tous_les_textes.length === 0 ? (
                            <p>Aucun texte dans la base de données</p>
                        ) : (
                            <ul>
                                {debugData.debug.tous_les_textes.map(texte => (
                                    <li key={texte.id}>
                                        <strong>{texte.titre}</strong> (ID: {texte.id})
                                        <br />Apprenant ID: {texte.apprenant_id}
                                        <br />Créé le: {new Date(texte.created_at).toLocaleString('fr-FR')}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            onClick={() => router.push('/lire/creer-texte')}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '5px',
                                marginRight: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Créer un nouveau texte
                        </button>
                        
                        <button
                            onClick={() => router.push('/lire/voir-mes-textes')}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '5px',
                                marginRight: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Voir mes textes
                        </button>

                        <button
                            onClick={loadDebugData}
                            style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Rafraîchir
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}