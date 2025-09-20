import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function VueDonneesApprenant() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [apprenants, setApprenants] = useState([])
    const [selectedApprenantId, setSelectedApprenantId] = useState('')
    const [donneesApprenant, setDonneesApprenant] = useState(null)
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
            // TEMPORAIRE : Pas de vérification admin pour le moment
            // if (parsedUser.role !== 'admin') {
            //     router.push('/dashboard')
            //     return
            // }
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
            // TEMPORAIRE : Pas de token pour le moment
            const response = await fetch('/api/admin/apprenants-list')

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

    const loadDonneesApprenant = async (apprenantId) => {
        if (!apprenantId) return

        setLoadingData(true)
        try {
            // TEMPORAIRE : Pas de token pour le moment
            const response = await fetch(`/api/admin/vue-donnees-apprenant/${apprenantId}`)

            if (response.ok) {
                const data = await response.json()
                setDonneesApprenant(data)
            } else {
                console.error('Erreur chargement données apprenant')
                setDonneesApprenant(null)
            }
        } catch (error) {
            console.error('Erreur:', error)
            setDonneesApprenant(null)
        }
        setLoadingData(false)
    }

    const handleApprenantChange = (e) => {
        const apprenantId = e.target.value
        setSelectedApprenantId(apprenantId)
        
        if (apprenantId) {
            loadDonneesApprenant(apprenantId)
        } else {
            setDonneesApprenant(null)
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

    const selectedApprenant = apprenants.find(a => a.id.toString() === selectedApprenantId)

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1400px',
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
                        marginBottom: '20px'
                    }}>
                        📊 Vue des données par apprenant
                    </h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#374151',
                                marginBottom: '8px'
                            }}>
                                Apprenant :
                            </label>
                            <select
                                value={selectedApprenantId}
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

                        <button
                            onClick={() => router.push('/admin/lire')}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                marginTop: '24px'
                            }}
                        >
                            ← Retour admin
                        </button>
                    </div>
                </div>

                {/* Chargement */}
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

                {/* Tableau des données */}
                {donneesApprenant && !loadingData && (
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        overflow: 'hidden'
                    }}>
                        {/* En-tête du tableau */}
                        <div style={{
                            background: '#f8fafc',
                            padding: '15px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h2 style={{ 
                                color: '#1f2937', 
                                margin: '0',
                                fontSize: '20px'
                            }}>
                                Données de {donneesApprenant.apprenant.identifiant} ({donneesApprenant.textes.length} textes)
                            </h2>
                        </div>

                        {/* Tableau */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse'
                            }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold',
                                            color: '#374151',
                                            minWidth: '200px'
                                        }}>
                                            📄 Texte
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold',
                                            color: '#059669',
                                            minWidth: '250px'
                                        }}>
                                            🎯 Groupes de sens
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold',
                                            color: '#dc2626',
                                            minWidth: '200px'
                                        }}>
                                            🔴 Monosyllabes
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold',
                                            color: '#059669',
                                            minWidth: '200px'
                                        }}>
                                            🟢 Multisyllabes
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donneesApprenant.textes.map((texte, index) => (
                                        <tr key={texte.id} style={{
                                            borderBottom: '1px solid #f3f4f6',
                                            background: index % 2 === 0 ? 'white' : '#fafafa'
                                        }}>
                                            {/* Colonne Texte */}
                                            <td style={{
                                                padding: '12px',
                                                verticalAlign: 'top',
                                                borderRight: '1px solid #f3f4f6'
                                            }}>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    color: '#1f2937',
                                                    marginBottom: '4px'
                                                }}>
                                                    {texte.titre}
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    marginBottom: '2px'
                                                }}>
                                                    ID: {texte.id}
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#6b7280'
                                                }}>
                                                    {new Date(texte.created_at).toLocaleDateString('fr-FR')}
                                                </div>
                                            </td>

                                            {/* Colonne Groupes de sens */}
                                            <td style={{
                                                padding: '12px',
                                                verticalAlign: 'top',
                                                borderRight: '1px solid #f3f4f6'
                                            }}>
                                                {texte.groupes_sens.length > 0 ? (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: '#059669',
                                                            fontWeight: 'bold',
                                                            marginBottom: '8px'
                                                        }}>
                                                            {texte.groupes_sens.length} groupe(s)
                                                        </div>
                                                        {texte.groupes_sens.map((groupe, gIndex) => (
                                                            <div key={gIndex} style={{
                                                                background: '#ecfdf5',
                                                                padding: '6px 8px',
                                                                borderRadius: '4px',
                                                                marginBottom: '4px',
                                                                fontSize: '11px',
                                                                color: '#065f46',
                                                                border: '1px solid #d1fae5'
                                                            }}>
                                                                <strong>G{gIndex + 1}:</strong> {groupe.contenu.substring(0, 50)}{groupe.contenu.length > 50 ? '...' : ''}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        Aucun groupe
                                                    </div>
                                                )}
                                            </td>

                                            {/* Colonne Monosyllabes */}
                                            <td style={{
                                                padding: '12px',
                                                verticalAlign: 'top',
                                                borderRight: '1px solid #f3f4f6'
                                            }}>
                                                {texte.mots_mono.length > 0 ? (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: '#dc2626',
                                                            fontWeight: 'bold',
                                                            marginBottom: '8px'
                                                        }}>
                                                            {texte.mots_mono.length} mot(s)
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '4px'
                                                        }}>
                                                            {texte.mots_mono.map((mot, mIndex) => (
                                                                <span key={mIndex} style={{
                                                                    background: '#fef2f2',
                                                                    color: '#991b1b',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontSize: '11px',
                                                                    border: '1px solid #fecaca'
                                                                }}>
                                                                    {mot.mot}{mot.valide_par_admin && ' ✓'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        Aucun monosyllabe
                                                    </div>
                                                )}
                                            </td>

                                            {/* Colonne Multisyllabes */}
                                            <td style={{
                                                padding: '12px',
                                                verticalAlign: 'top'
                                            }}>
                                                {texte.mots_multi.length > 0 ? (
                                                    <div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: '#059669',
                                                            fontWeight: 'bold',
                                                            marginBottom: '8px'
                                                        }}>
                                                            {texte.mots_multi.length} mot(s)
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '4px'
                                                        }}>
                                                            {texte.mots_multi.map((mot, mIndex) => (
                                                                <span key={mIndex} style={{
                                                                    background: '#ecfdf5',
                                                                    color: '#065f46',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '3px',
                                                                    fontSize: '11px',
                                                                    border: '1px solid #d1fae5'
                                                                }}>
                                                                    {mot.mot}{mot.valide_par_admin && ' ✓'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        Aucun multisyllabe
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Corrections centralisées */}
                        {donneesApprenant.corrections_centralisees && donneesApprenant.corrections_centralisees.length > 0 && (
                            <div style={{
                                background: '#fef3c7',
                                padding: '15px',
                                borderTop: '1px solid #e5e7eb'
                            }}>
                                <h3 style={{
                                    color: '#92400e',
                                    marginBottom: '10px',
                                    fontSize: '16px'
                                }}>
                                    🌍 Corrections centralisées appliquées ({donneesApprenant.corrections_centralisees.length})
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    {donneesApprenant.corrections_centralisees.map((correction, cIndex) => (
                                        <span key={cIndex} style={{
                                            background: '#fbbf24',
                                            color: '#92400e',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
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