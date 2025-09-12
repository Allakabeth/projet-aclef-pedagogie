import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VoirMesTextes() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [textes, setTextes] = useState([])
    const [isLoadingTextes, setIsLoadingTextes] = useState(false)
    const [stats, setStats] = useState({ nombre_mots_differents: 0, nombre_textes: 0 })
    const [confirmSupprimer, setConfirmSupprimer] = useState(null) // ID du texte à confirmer
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            setUser(JSON.parse(userData))
            loadTextes()
            loadStats()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadTextes = async () => {
        setIsLoadingTextes(true)
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
            } else {
                console.error('Erreur chargement textes')
            }
        } catch (error) {
            console.error('Erreur chargement textes:', error)
        } finally {
            setIsLoadingTextes(false)
        }
    }

    const loadStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/textes/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setStats(data.stats || { nombre_mots_differents: 0, nombre_textes: 0 })
            } else {
                console.error('Erreur chargement statistiques')
            }
        } catch (error) {
            console.error('Erreur chargement statistiques:', error)
        }
    }

    const demanderConfirmationSupprimer = (texteId) => {
        console.log('🚨 Demande confirmation suppression pour texte:', texteId)
        setConfirmSupprimer(texteId)
        // Auto-annulation après 10 secondes
        setTimeout(() => {
            setConfirmSupprimer(null)
        }, 10000)
    }

    const annulerSupprimer = () => {
        console.log('❌ Suppression annulée')
        setConfirmSupprimer(null)
    }

    const confirmerSupprimer = async (texteId) => {
        console.log('🚀 SUPPRESSION CONFIRMÉE pour texte ID:', texteId)
        setConfirmSupprimer(null)

        try {
            const token = localStorage.getItem('token')
            console.log('🔑 Token présent:', !!token)
            
            const response = await fetch(`/api/textes/supprimer-simple/${texteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: texteId })
            })

            console.log('📡 Response status:', response.status)
            
            if (response.ok) {
                const result = await response.json()
                console.log('✅ Suppression réussie:', result)
                alert('Texte supprimé avec succès !')
                loadTextes()
                loadStats()
            } else {
                const errorText = await response.text()
                console.error('❌ Erreur suppression:', response.status, errorText)
                alert(`Erreur lors de la suppression: ${response.status}`)
            }
        } catch (error) {
            console.error('💥 Erreur suppression:', error)
            alert('Erreur lors de la suppression: ' + error.message)
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
                <div style={{ color: '#10b981', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '15px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(22px, 5vw, 28px)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    📖 Mes textes références
                    <span style={{
                        fontSize: 'clamp(14px, 3vw, 16px)',
                        color: '#666',
                        fontWeight: 'normal',
                        display: 'block',
                        marginTop: '5px'
                    }}>
                        {stats.nombre_mots_differents} mots différents au total
                    </span>
                </h1>


                {/* Liste des textes */}
                {isLoadingTextes ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        fontSize: '16px',
                        color: '#666'
                    }}>
                        Chargement des textes...
                    </div>
                ) : textes.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '2px dashed #dee2e6'
                    }}>
                        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                            Aucun texte de référence créé
                        </p>
                        <p style={{ fontSize: '14px', color: '#888' }}>
                            Commencez par créer votre premier texte !
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '15px'
                    }}>
                        {textes.map((texte, index) => (
                            <div key={texte.id} style={{
                                background: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '20px'
                            }}>
                                <div style={{
                                    marginBottom: '10px'
                                }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: 'clamp(16px, 4vw, 20px)',
                                        color: '#333',
                                        fontWeight: 'bold'
                                    }}>
                                        {texte.titre}
                                    </h3>
                                </div>
                                
                                <div style={{
                                    display: 'flex',
                                    gap: '20px',
                                    flexWrap: 'wrap',
                                    fontSize: '14px',
                                    color: '#666',
                                    marginBottom: '10px'
                                }}>
                                    <span>📊 {texte.nombre_groupes || 0} groupes</span>
                                    <span>📝 {texte.nombre_mots_total || 0} mots</span>
                                </div>
                                
                                <div style={{
                                    fontSize: '12px',
                                    color: '#888'
                                }}>
                                    Créé le {new Date(texte.created_at).toLocaleDateString('fr-FR')}
                                </div>
                                
                                {/* Boutons d'actions */}
                                <div style={{
                                    marginTop: '15px',
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <button
                                        onClick={() => router.push(`/lire/texte/${texte.id}`)}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        👁️ Voir
                                    </button>
                                    <button
                                        onClick={() => router.push(`/lire/modifier-texte/${texte.id}`)}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✏️ Modifier
                                    </button>
                                    {confirmSupprimer === texte.id ? (
                                        // Mode confirmation
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => confirmerSupprimer(texte.id)}
                                                style={{
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✅ CONFIRMER
                                            </button>
                                            <button
                                                onClick={annulerSupprimer}
                                                style={{
                                                    backgroundColor: '#6b7280',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ❌ ANNULER
                                            </button>
                                        </div>
                                    ) : (
                                        // Mode normal
                                        <button
                                            onClick={() => demanderConfirmationSupprimer(texte.id)}
                                            style={{
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Supprimer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/lire/mes-textes-references')}
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
                        ← Retour aux textes références
                    </button>
                </div>
            </div>
        </div>
    )
}