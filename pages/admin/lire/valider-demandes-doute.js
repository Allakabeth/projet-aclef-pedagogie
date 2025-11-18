import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default function ValiderDemandesDoute() {
    const [demandes, setDemandes] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [apprenants, setApprenants] = useState({})
    const [reponseText, setReponseText] = useState({})
    const router = useRouter()

    useEffect(() => {
        // Vérifier auth admin
        const adminData = localStorage.getItem('aclef_admin')
        if (!adminData) {
            router.push('/login')
            return
        }

        chargerDemandes()
    }, [router])

    const chargerDemandes = async () => {
        setIsLoading(true)

        try {
            // Charger les demandes en attente
            const { data: demandesData, error: demandesError } = await supabaseAdmin
                .from('demandes_validation_syllabes')
                .select('*')
                .order('created_at', { ascending: false })

            if (demandesError) {
                console.error('Erreur chargement demandes:', demandesError)
                return
            }

            setDemandes(demandesData || [])

            // Charger les infos des apprenants
            const apprenantIds = [...new Set((demandesData || []).map(d => d.apprenant_id))]

            if (apprenantIds.length > 0) {
                const { data: apprenantsData } = await supabaseAdmin
                    .from('users')
                    .select('id, prenom, nom')
                    .in('id', apprenantIds)

                const apprenantsMap = {}
                apprenantsData?.forEach(a => {
                    apprenantsMap[a.id] = `${a.prenom} ${a.nom}`
                })

                setApprenants(apprenantsMap)
            }
        } catch (error) {
            console.error('Erreur:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const validerDemande = async (demandeId) => {
        if (!confirm('Valider cette segmentation ?')) return

        try {
            const { error } = await supabaseAdmin
                .from('demandes_validation_syllabes')
                .update({
                    statut: 'validee',
                    reponse_admin: reponseText[demandeId] || 'Segmentation validée',
                    updated_at: new Date().toISOString()
                })
                .eq('id', demandeId)

            if (error) {
                console.error('Erreur validation:', error)
                alert('Erreur lors de la validation')
                return
            }

            alert('✅ Demande validée !')
            chargerDemandes()
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors de la validation')
        }
    }

    const rejeterDemande = async (demandeId) => {
        const reponse = reponseText[demandeId]

        if (!reponse) {
            alert('Veuillez saisir une réponse avant de rejeter')
            return
        }

        if (!confirm('Rejeter cette segmentation ?')) return

        try {
            const { error } = await supabaseAdmin
                .from('demandes_validation_syllabes')
                .update({
                    statut: 'rejetee',
                    reponse_admin: reponse,
                    updated_at: new Date().toISOString()
                })
                .eq('id', demandeId)

            if (error) {
                console.error('Erreur rejet:', error)
                alert('Erreur lors du rejet')
                return
            }

            alert('❌ Demande rejetée')
            chargerDemandes()
        } catch (error) {
            console.error('Erreur:', error)
            alert('Erreur lors du rejet')
        }
    }

    const getStatutColor = (statut) => {
        switch (statut) {
            case 'en_attente': return '#f59e0b'
            case 'validee': return '#10b981'
            case 'rejetee': return '#ef4444'
            default: return '#6b7280'
        }
    }

    const getStatutLabel = (statut) => {
        switch (statut) {
            case 'en_attente': return '⏳ En attente'
            case 'validee': return '✅ Validée'
            case 'rejetee': return '❌ Rejetée'
            default: return statut
        }
    }

    if (isLoading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                Chargement...
            </div>
        )
    }

    const demandesEnAttente = demandes.filter(d => d.statut === 'en_attente')
    const demandesTraitees = demandes.filter(d => d.statut !== 'en_attente')

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ color: '#1f2937', marginBottom: '10px' }}>
                    ❓ Validation des demandes de doute
                </h1>
                <button
                    onClick={() => router.push('/admin/lire')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    ← Retour
                </button>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '30px'
            }}>
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d97706' }}>
                        {demandesEnAttente.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#92400e' }}>
                        En attente
                    </div>
                </div>

                <div style={{
                    padding: '20px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>
                        {demandes.filter(d => d.statut === 'validee').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#065f46' }}>
                        Validées
                    </div>
                </div>

                <div style={{
                    padding: '20px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626' }}>
                        {demandes.filter(d => d.statut === 'rejetee').length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#991b1b' }}>
                        Rejetées
                    </div>
                </div>
            </div>

            {/* Demandes en attente */}
            {demandesEnAttente.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: '#1f2937', marginBottom: '15px' }}>
                        ⏳ Demandes en attente ({demandesEnAttente.length})
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {demandesEnAttente.map(demande => (
                            <div
                                key={demande.id}
                                style={{
                                    padding: '20px',
                                    backgroundColor: '#fffbeb',
                                    border: '2px solid #fbbf24',
                                    borderRadius: '8px'
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>
                                            {apprenants[demande.apprenant_id] || `Apprenant #${demande.apprenant_id}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {new Date(demande.created_at).toLocaleString('fr-FR')}
                                        </div>
                                    </div>
                                </div>

                                {/* Contenu */}
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>Mot :</strong>{' '}
                                        <span style={{ fontSize: '20px', color: '#1e3a8a' }}>
                                            {demande.mot}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '10px' }}>
                                        <strong>Segmentation proposée :</strong>{' '}
                                        <span style={{
                                            padding: '5px 10px',
                                            backgroundColor: '#dbeafe',
                                            borderRadius: '4px',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: '#1e40af'
                                        }}>
                                            {demande.segmentation_proposee.join(' - ')}
                                        </span>
                                    </div>

                                    {demande.message_doute && (
                                        <div style={{
                                            padding: '10px',
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '6px',
                                            marginTop: '10px'
                                        }}>
                                            <strong>Message :</strong> {demande.message_doute}
                                        </div>
                                    )}
                                </div>

                                {/* Réponse admin */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Réponse (optionnelle) :
                                    </label>
                                    <textarea
                                        value={reponseText[demande.id] || ''}
                                        onChange={(e) => setReponseText({
                                            ...reponseText,
                                            [demande.id]: e.target.value
                                        })}
                                        placeholder="Explique ta décision à l'apprenant..."
                                        style={{
                                            width: '100%',
                                            minHeight: '60px',
                                            padding: '10px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>

                                {/* Boutons */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => validerDemande(demande.id)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✅ Valider cette segmentation
                                    </button>
                                    <button
                                        onClick={() => rejeterDemande(demande.id)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ❌ Rejeter
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Demandes traitées */}
            {demandesTraitees.length > 0 && (
                <div>
                    <h2 style={{ color: '#1f2937', marginBottom: '15px' }}>
                        📋 Historique ({demandesTraitees.length})
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {demandesTraitees.map(demande => (
                            <div
                                key={demande.id}
                                style={{
                                    padding: '15px',
                                    backgroundColor: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: '5px' }}>
                                            <strong>{apprenants[demande.apprenant_id]}</strong> • {demande.mot} →{' '}
                                            <span style={{ color: '#3b82f6' }}>
                                                {demande.segmentation_proposee.join('-')}
                                            </span>
                                        </div>
                                        {demande.reponse_admin && (
                                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                                                💬 {demande.reponse_admin}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: getStatutColor(demande.statut),
                                            color: 'white',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {getStatutLabel(demande.statut)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {demandes.length === 0 && (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                }}>
                    Aucune demande de doute pour le moment
                </div>
            )}
        </div>
    )
}
