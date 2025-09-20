import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VisualiserDonneesApprenant() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [apprenants, setApprenants] = useState([])
    const [selectedApprenant, setSelectedApprenant] = useState(null)
    const [apprenantData, setApprenantData] = useState(null)
    const [loadingData, setLoadingData] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification admin
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token || !userData) {
            router.push('/login')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            if (parsedUser.role !== 'admin') {
                router.push('/dashboard')
                return
            }
            setUser(parsedUser)
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/login')
            return
        }

        setIsLoading(false)
        loadApprenants()
    }, [router])

    const loadApprenants = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/admin/apprenants-list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setApprenants(data.apprenants || [])
            } else {
                console.error('Erreur chargement apprenants')
            }
        } catch (error) {
            console.error('Erreur:', error)
        }
    }

    const loadApprenantData = async (apprenantId) => {
        if (!apprenantId) return

        setLoadingData(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/admin/donnees-apprenant/${apprenantId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setApprenantData(data)
            } else {
                console.error('Erreur chargement données apprenant')
                setApprenantData(null)
            }
        } catch (error) {
            console.error('Erreur:', error)
            setApprenantData(null)
        }
        setLoadingData(false)
    }

    const handleApprenantChange = (e) => {
        const apprenantId = e.target.value
        const apprenant = apprenants.find(a => a.id.toString() === apprenantId)
        setSelectedApprenant(apprenant)
        
        if (apprenantId) {
            loadApprenantData(apprenantId)
        } else {
            setApprenantData(null)
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
            background: '#f8fafc',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '10px'
                    }}>
                        🔍 Visualiser les données d'un apprenant
                    </h1>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#374151',
                            marginBottom: '8px'
                        }}>
                            Sélectionner un apprenant :
                        </label>
                        <select
                            value={selectedApprenant?.id || ''}
                            onChange={handleApprenantChange}
                            style={{
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px',
                                minWidth: '300px'
                            }}
                        >
                            <option value="">-- Choisir un apprenant --</option>
                            {apprenants.map(apprenant => (
                                <option key={apprenant.id} value={apprenant.id}>
                                    {apprenant.identifiant} - {apprenant.prenom} {apprenant.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => router.push('/admin/lire')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            ← Retour admin
                        </button>
                    </div>
                </div>

                {/* Données de l'apprenant */}
                {loadingData && (
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#3b82f6', fontSize: '18px' }}>
                            Chargement des données de {selectedApprenant?.identifiant}...
                        </div>
                    </div>
                )}

                {apprenantData && !loadingData && (
                    <div>
                        {/* Informations générales */}
                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{ color: '#1f2937', marginBottom: '15px' }}>
                                📊 Informations générales
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                <div>
                                    <strong>Identifiant:</strong> {apprenantData.apprenant.identifiant}
                                </div>
                                <div>
                                    <strong>Nom:</strong> {apprenantData.apprenant.prenom} {apprenantData.apprenant.nom}
                                </div>
                                <div>
                                    <strong>Email:</strong> {apprenantData.apprenant.email}
                                </div>
                                <div>
                                    <strong>Textes:</strong> {apprenantData.textes.length}
                                </div>
                            </div>
                        </div>

                        {/* Textes et leurs données */}
                        {apprenantData.textes.map((texte, index) => (
                            <div key={texte.id} style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{
                                    color: '#1f2937',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid #e5e7eb',
                                    paddingBottom: '10px'
                                }}>
                                    📄 Texte #{index + 1}: {texte.titre}
                                </h3>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        marginBottom: '10px'
                                    }}>
                                        <strong>Description:</strong> {texte.description || 'Aucune description'}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        marginBottom: '10px'
                                    }}>
                                        <strong>Créé le:</strong> {new Date(texte.created_at).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>

                                {/* Groupes de sens */}
                                {texte.groupes_sens && texte.groupes_sens.length > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ color: '#059669', marginBottom: '10px' }}>
                                            🎯 Groupes de sens ({texte.groupes_sens.length})
                                        </h4>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                            gap: '10px'
                                        }}>
                                            {texte.groupes_sens.map((groupe, gIndex) => (
                                                <div key={gIndex} style={{
                                                    background: '#ecfdf5',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #d1fae5'
                                                }}>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        color: '#065f46',
                                                        marginBottom: '5px'
                                                    }}>
                                                        Groupe {gIndex + 1}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: '#047857'
                                                    }}>
                                                        {groupe.contenu}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mots classifiés */}
                                <div>
                                    <h4 style={{ color: '#7c3aed', marginBottom: '15px' }}>
                                        🔤 Mots classifiés
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Monosyllabes */}
                                        <div>
                                            <h5 style={{ color: '#dc2626', marginBottom: '10px' }}>
                                                Monosyllabes ({texte.mots_mono.length})
                                            </h5>
                                            <div style={{
                                                background: '#fef2f2',
                                                padding: '15px',
                                                borderRadius: '6px',
                                                border: '1px solid #fecaca',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                {texte.mots_mono.length > 0 ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '5px'
                                                    }}>
                                                        {texte.mots_mono.map((mot, mIndex) => (
                                                            <span key={mIndex} style={{
                                                                background: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                color: '#991b1b',
                                                                border: '1px solid #f87171'
                                                            }}>
                                                                {mot.mot}
                                                                {mot.valide_par_admin && ' ✓'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                                                        Aucun monosyllabe
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Multisyllabes */}
                                        <div>
                                            <h5 style={{ color: '#059669', marginBottom: '10px' }}>
                                                Multisyllabes ({texte.mots_multi.length})
                                            </h5>
                                            <div style={{
                                                background: '#ecfdf5',
                                                padding: '15px',
                                                borderRadius: '6px',
                                                border: '1px solid #d1fae5',
                                                maxHeight: '200px',
                                                overflowY: 'auto'
                                            }}>
                                                {texte.mots_multi.length > 0 ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '5px'
                                                    }}>
                                                        {texte.mots_multi.map((mot, mIndex) => (
                                                            <span key={mIndex} style={{
                                                                background: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                color: '#065f46',
                                                                border: '1px solid #6ee7b7'
                                                            }}>
                                                                {mot.mot}
                                                                {mot.valide_par_admin && ' ✓'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                                                        Aucun multisyllabe
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Corrections centralisées appliquées */}
                        {apprenantData.corrections_centralisees && apprenantData.corrections_centralisees.length > 0 && (
                            <div style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{
                                    color: '#f59e0b',
                                    marginBottom: '15px'
                                }}>
                                    🌍 Corrections centralisées qui s'appliquent ({apprenantData.corrections_centralisees.length})
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    {apprenantData.corrections_centralisees.map((correction, cIndex) => (
                                        <span key={cIndex} style={{
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            border: '1px solid #fbbf24'
                                        }}>
                                            {correction.mot} ({correction.classification})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}