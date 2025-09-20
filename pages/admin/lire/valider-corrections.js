import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ValiderCorrections() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [corrections, setCorrections] = useState([])
    const [filtreStatut, setFiltreStatut] = useState('en_attente')
    const [searchTerm, setSearchTerm] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Vérifier l'authentification et les droits admin
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            const user = JSON.parse(userData)
            setUser(user)

            // Vérifier si l'utilisateur est admin ou salarié
            if (user.role !== 'admin' && user.role !== 'salarié') {
                alert('Accès refusé. Cette page est réservée aux administrateurs et salariés.')
                router.push('/aclef-pedagogie-admin')
                return
            }

            loadCorrections()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router, filtreStatut])

    const loadCorrections = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/corrections/lister?statut=${filtreStatut}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setCorrections(data.corrections || [])
            } else {
                console.error('Erreur chargement corrections')
                alert('Erreur lors du chargement des corrections')
            }
        } catch (error) {
            console.error('Erreur chargement corrections:', error)
            alert('Erreur lors du chargement des corrections')
        }
    }

    const traiterCorrection = async (correctionId, action, commentaire = '') => {
        setIsProcessing(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/corrections/traiter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    correctionId: correctionId,
                    action: action, // 'accepter' ou 'rejeter'
                    commentaire: commentaire
                })
            })

            if (response.ok) {
                const data = await response.json()
                alert(`✅ ${data.message}`)
                // Recharger la liste
                await loadCorrections()
            } else {
                const error = await response.json()
                alert(`❌ Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Erreur traitement correction:', error)
            alert('❌ Erreur lors du traitement')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleAccepter = (correction) => {
        const commentaire = `Correction acceptée: "${correction.mot}" reclassé de ${correction.classification_actuelle} à ${correction.correction_proposee}`
        traiterCorrection(correction.id, 'accepter', commentaire)
    }

    const handleRejeter = (correction) => {
        const commentaire = `Classification actuelle maintenue: "${correction.mot}" reste ${correction.classification_actuelle}syllabe`
        traiterCorrection(correction.id, 'rejeter', commentaire)
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

    // TEMPORAIRE : désactivé pour test
    // if (!user || user.role !== 'admin') return null
    if (!user) return null

    // Filtrer les corrections selon le statut et la recherche
    const filteredCorrections = corrections.filter(correction => {
        // Filtre par statut
        let statusMatch = true
        if (filtreStatut === 'traite') {
            statusMatch = correction.statut === 'accepte' || correction.statut === 'rejete'
        } else if (filtreStatut) {
            statusMatch = correction.statut === filtreStatut
        }

        // Filtre par recherche de mot
        const searchMatch = !searchTerm || 
            correction.mot?.toLowerCase().includes(searchTerm.toLowerCase())

        return statusMatch && searchMatch
    })

    return (
        <div style={{
            minHeight: '100vh',
            background: 'white',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: 'clamp(24px, 5vw, 32px)',
                    fontWeight: 'bold',
                    marginBottom: '30px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center'
                }}>
                    🔍 Validation des Corrections
                </h1>

                {/* Instructions */}
                <div style={{
                    background: '#e0f2fe',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ color: '#0284c7', marginBottom: '10px' }}>
                        ℹ️ Instructions
                    </h3>
                    <p style={{ margin: 0, color: '#0369a1' }}>
                        Cette page permet de valider ou rejeter les demandes de correction soumises par les utilisateurs. 
                        Chaque demande contient la classification actuelle du système et la correction proposée par l'utilisateur.
                    </p>
                </div>

                {/* Filtres */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ marginBottom: '15px' }}>📊 Filtres</h3>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            Statut :
                        </label>
                        <select
                            value={filtreStatut}
                            onChange={(e) => setFiltreStatut(e.target.value)}
                            style={{
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '14px'
                            }}
                        >
                            <option value="en_attente">En attente ({corrections.filter(c => c.statut === 'en_attente').length})</option>
                            <option value="accepte">Acceptées</option>
                            <option value="rejete">Rejetées</option>
                            <option value="traite">Traitées (Acceptées + Rejetées)</option>
                            <option value="">Toutes</option>
                        </select>
                        
                        <label style={{ fontSize: '14px', fontWeight: 'bold', marginLeft: '20px' }}>
                            Rechercher un mot :
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tapez un mot..."
                            style={{
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '14px',
                                minWidth: '200px'
                            }}
                        />
                    </div>
                </div>

                {/* Liste des corrections */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ marginBottom: '20px' }}>
                        📝 Demandes de correction ({filteredCorrections.length} sur {corrections.length})
                    </h3>

                    {filteredCorrections.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            background: 'white',
                            borderRadius: '8px',
                            color: '#666'
                        }}>
                            {searchTerm 
                                ? `Aucune correction trouvée pour "${searchTerm}"` 
                                : filtreStatut === 'en_attente' 
                                    ? 'Aucune correction en attente' 
                                    : `Aucune correction avec le statut "${filtreStatut}"`
                            }
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {filteredCorrections.map((correction) => (
                                <div key={correction.id} style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: correction.statut === 'en_attente' ? '2px solid #fbbf24' : '1px solid #e5e7eb',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 200px',
                                        gap: '20px',
                                        alignItems: 'start'
                                    }}>
                                        {/* Informations principales */}
                                        <div>
                                            <h4 style={{
                                                margin: '0 0 10px 0',
                                                fontSize: '18px',
                                                color: '#10b981'
                                            }}>
                                                📝 Mot : <strong>"{correction.mot}"</strong>
                                            </h4>
                                            <div style={{ marginBottom: '8px' }}>
                                                <strong>Classification actuelle :</strong> 
                                                <span style={{
                                                    backgroundColor: correction.classification_actuelle === 'mono' ? '#dcfce7' : '#fef3c7',
                                                    color: correction.classification_actuelle === 'mono' ? '#166534' : '#92400e',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    marginLeft: '8px'
                                                }}>
                                                    {correction.classification_actuelle === 'mono' ? 'Monosyllabe' : 'Multisyllabe'}
                                                </span>
                                            </div>
                                            <div style={{ marginBottom: '8px' }}>
                                                <strong>Correction proposée :</strong> 
                                                <span style={{
                                                    backgroundColor: correction.correction_proposee === 'mono' ? '#dcfce7' : '#fef3c7',
                                                    color: correction.correction_proposee === 'mono' ? '#166534' : '#92400e',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    marginLeft: '8px'
                                                }}>
                                                    {correction.correction_proposee === 'mono' ? 'Monosyllabe' : 'Multisyllabe'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                <strong>Demandé par :</strong> {correction.demandeur_nom} ({correction.demandeur_email})
                                            </div>
                                        </div>

                                        {/* Détails et raison */}
                                        <div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong style={{ fontSize: '12px', color: '#666' }}>RAISON :</strong>
                                                <p style={{
                                                    margin: '5px 0',
                                                    padding: '8px',
                                                    background: '#f3f4f6',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    fontStyle: 'italic'
                                                }}>
                                                    {correction.raison || 'Aucune raison fournie'}
                                                </p>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                <strong>Demandé le :</strong> {new Date(correction.created_at).toLocaleDateString('fr-FR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            <div style={{ 
                                                marginTop: '8px',
                                                fontSize: '12px',
                                                color: correction.statut === 'en_attente' ? '#f59e0b' : 
                                                       correction.statut === 'accepte' ? '#10b981' : '#ef4444'
                                            }}>
                                                <strong>Statut :</strong> {
                                                    correction.statut === 'en_attente' ? '⏳ En attente' :
                                                    correction.statut === 'accepte' ? '✅ Acceptée' : '❌ Rejetée'
                                                }
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div>
                                            {correction.statut === 'en_attente' ? (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    <button
                                                        onClick={() => handleAccepter(correction)}
                                                        disabled={isProcessing}
                                                        style={{
                                                            backgroundColor: '#10b981',
                                                            color: 'white',
                                                            padding: '8px 16px',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                            opacity: isProcessing ? 0.5 : 1
                                                        }}
                                                    >
                                                        ✅ Accepter
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejeter(correction)}
                                                        disabled={isProcessing}
                                                        style={{
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            padding: '8px 16px',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                            opacity: isProcessing ? 0.5 : 1
                                                        }}
                                                    >
                                                        ❌ Rejeter
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    padding: '12px',
                                                    background: correction.statut === 'accepte' ? '#f0fdf4' : '#fef2f2',
                                                    borderRadius: '4px',
                                                    fontSize: '12px'
                                                }}>
                                                    <div style={{ marginBottom: '5px' }}>
                                                        <strong>Traité par :</strong> {correction.traite_par_nom}
                                                    </div>
                                                    <div style={{ marginBottom: '5px' }}>
                                                        <strong>Le :</strong> {new Date(correction.traite_at).toLocaleDateString('fr-FR')}
                                                    </div>
                                                    {correction.commentaire_admin && (
                                                        <div>
                                                            <strong>Commentaire :</strong>
                                                            <p style={{ 
                                                                margin: '5px 0 0 0',
                                                                fontStyle: 'italic',
                                                                fontSize: '11px'
                                                            }}>
                                                                "{correction.commentaire_admin}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bouton retour */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/admin/lire')}
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
                        ← Retour au tableau de bord
                    </button>
                </div>
            </div>
        </div>
    )
}