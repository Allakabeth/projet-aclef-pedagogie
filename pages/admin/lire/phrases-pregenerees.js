import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function PhrasesPregenerees() {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [apprenants, setApprenants] = useState([])
    const [selectedApprenant, setSelectedApprenant] = useState(null)
    const [combinaisons, setCombinaisons] = useState([])
    const [editingPhrase, setEditingPhrase] = useState(null)
    const [editPhrase, setEditPhrase] = useState('')
    const [editMots, setEditMots] = useState('')
    const [saving, setSaving] = useState(false)
    const [motsDisponibles, setMotsDisponibles] = useState([])
    const [loadingMots, setLoadingMots] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('quiz-admin-token')
        const userData = localStorage.getItem('quiz-admin-user')

        if (!token || !userData) {
            router.push('/aclef-pedagogie-admin')
            return
        }

        try {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            loadStats()
            loadApprenants()
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            router.push('/aclef-pedagogie-admin')
            return
        }

        setIsLoading(false)
    }, [router])

    const loadStats = async () => {
        try {
            const response = await fetch('/api/admin/phrases/stats')
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Erreur chargement stats:', error)
        }
    }

    const loadApprenants = async () => {
        try {
            const response = await fetch('/api/admin/phrases/apprenants')
            if (response.ok) {
                const data = await response.json()
                setApprenants(data.apprenants || [])
            }
        } catch (error) {
            console.error('Erreur chargement apprenants:', error)
        }
    }

    const loadCombinaisons = async (userId) => {
        try {
            const response = await fetch(`/api/admin/phrases/combinaisons?user_id=${userId}`)
            if (response.ok) {
                const data = await response.json()
                setCombinaisons(data.combinaisons || [])
            }
        } catch (error) {
            console.error('Erreur chargement combinaisons:', error)
        }
    }

    const selectApprenant = (apprenant) => {
        setSelectedApprenant(apprenant)
        loadCombinaisons(apprenant.user_id)
    }

    const startEditing = async (phrase, texteIds) => {
        setEditingPhrase(phrase.id)
        setEditPhrase(phrase.phrase)
        setEditMots(phrase.mots.join(' • '))
        setMotsDisponibles([])

        // Charger les mots disponibles
        setLoadingMots(true)
        try {
            const response = await fetch(`/api/admin/phrases/mots-disponibles?user_id=${selectedApprenant.user_id}&texte_ids=${texteIds.join(',')}`)
            if (response.ok) {
                const data = await response.json()
                setMotsDisponibles(data.mots || [])
            }
        } catch (error) {
            console.error('Erreur chargement mots:', error)
        }
        setLoadingMots(false)
    }

    const cancelEditing = () => {
        setEditingPhrase(null)
        setEditPhrase('')
        setEditMots('')
        setMotsDisponibles([])
    }

    const savePhrase = async () => {
        if (!editPhrase.trim()) {
            alert('La phrase ne peut pas être vide')
            return
        }

        const motsArray = editMots.split(/[•,\s]+/).filter(m => m.trim())
        if (motsArray.length < 3 || motsArray.length > 7) {
            alert('La phrase doit contenir entre 3 et 7 mots')
            return
        }

        setSaving(true)
        try {
            const response = await fetch('/api/admin/phrases/modifier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingPhrase,
                    phrase: editPhrase.trim(),
                    mots: motsArray
                })
            })

            if (response.ok) {
                // Mettre à jour localement
                setCombinaisons(prev => prev.map(combo => ({
                    ...combo,
                    phrases: combo.phrases.map(p =>
                        p.id === editingPhrase
                            ? { ...p, phrase: editPhrase.trim(), mots: motsArray }
                            : p
                    )
                })))
                cancelEditing()
            } else {
                const data = await response.json()
                alert(`Erreur: ${data.error || 'Erreur lors de la modification'}`)
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('Erreur lors de la sauvegarde')
        }
        setSaving(false)
    }

    const purgerCombinaison = async (texteIds, userId) => {
        if (!confirm(`⚠️ Êtes-vous sûr de vouloir SUPPRIMER toutes les phrases pour les textes [${texteIds.join(', ')}] ?\n\nCette action est irréversible !`)) {
            return
        }

        try {
            const response = await fetch('/api/admin/phrases/purger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    texte_ids: texteIds,
                    user_id: userId
                })
            })

            if (response.ok) {
                alert('✅ Phrases supprimées avec succès')
                // Recharger les données
                loadStats()
                loadApprenants()
                if (selectedApprenant) {
                    loadCombinaisons(selectedApprenant.user_id)
                }
            } else {
                const data = await response.json()
                alert(`❌ Erreur: ${data.error || 'Erreur lors de la suppression'}`)
            }
        } catch (error) {
            console.error('Erreur purge:', error)
            alert('❌ Erreur lors de la suppression')
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
                <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f9fa',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* En-tête */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: '#333'
                    }}>
                        📝 Gestion des Phrases Pré-générées
                    </h1>
                    <p style={{ color: '#666', fontSize: '16px' }}>
                        Monitoring et gestion des phrases générées pour l'exercice "Construis phrases"
                    </p>
                </div>

                {/* Stats globales */}
                <div style={{
                    background: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '30px'
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: '#8b5cf6'
                    }}>
                        📊 Statistiques globales
                    </h2>
                    {stats ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px'
                        }}>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#8b5cf6'
                                }}>
                                    {stats.total_combinaisons || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Combinaisons générées
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#10b981'
                                }}>
                                    {stats.total_phrases || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Phrases totales
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#3b82f6'
                                }}>
                                    {stats.nb_apprenants || 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Apprenants
                                </div>
                            </div>
                            <div style={{
                                background: '#f3f4f6',
                                padding: '20px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#f59e0b'
                                }}>
                                    {stats.moyenne_phrases_par_combo ? Math.round(stats.moyenne_phrases_par_combo) : 0}
                                </div>
                                <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                                    Phrases / combo (moy.)
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666' }}>
                            Chargement des statistiques...
                        </div>
                    )}
                </div>

                {/* Layout 2 colonnes */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: selectedApprenant ? '350px 1fr' : '1fr',
                    gap: '20px'
                }}>
                    {/* Liste des apprenants */}
                    <div style={{
                        background: 'white',
                        padding: '25px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        height: 'fit-content'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            color: '#333'
                        }}>
                            👥 Apprenants ({apprenants.length})
                        </h2>
                        {apprenants.length === 0 ? (
                            <p style={{ color: '#666', fontSize: '14px' }}>
                                Aucun apprenant avec des phrases générées
                            </p>
                        ) : (
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {apprenants.map((app, index) => (
                                    <div
                                        key={index}
                                        onClick={() => selectApprenant(app)}
                                        style={{
                                            padding: '12px',
                                            marginBottom: '8px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: selectedApprenant?.user_id === app.user_id ? '#f3f4f6' : 'transparent',
                                            border: selectedApprenant?.user_id === app.user_id ? '2px solid #8b5cf6' : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedApprenant?.user_id !== app.user_id) {
                                                e.currentTarget.style.background = '#f9fafb'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedApprenant?.user_id !== app.user_id) {
                                                e.currentTarget.style.background = 'transparent'
                                            }
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: '#333',
                                            marginBottom: '4px'
                                        }}>
                                            {app.identifiant || app.email || `User ${app.user_id}`}
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#666'
                                        }}>
                                            {app.nb_phrases} phrases • {app.nb_combinaisons} combinaisons
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Détail des combinaisons */}
                    {selectedApprenant && (
                        <div style={{
                            background: 'white',
                            padding: '25px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                marginBottom: '20px',
                                color: '#333'
                            }}>
                                📋 Combinaisons de {selectedApprenant.identifiant || selectedApprenant.email || `User ${selectedApprenant.user_id}`}
                            </h2>
                            {combinaisons.length === 0 ? (
                                <p style={{ color: '#666', fontSize: '14px' }}>
                                    Aucune combinaison trouvée
                                </p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {combinaisons.map((combo, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '15px',
                                                marginBottom: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                background: '#f9fafb'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '10px'
                                            }}>
                                                <div>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: '#8b5cf6',
                                                        fontSize: '14px'
                                                    }}>
                                                        Textes [{combo.texte_ids.join(', ')}]
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{
                                                        background: '#10b981',
                                                        color: 'white',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '13px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {combo.nb_phrases} phrases
                                                    </div>
                                                    <button
                                                        onClick={() => purgerCombinaison(combo.texte_ids, selectedApprenant.user_id)}
                                                        style={{
                                                            background: '#dc2626',
                                                            color: 'white',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                                                    >
                                                        🗑️ Purger
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: '#666',
                                                marginBottom: '12px'
                                            }}>
                                                Source: {combo.source || 'N/A'} •
                                                Généré le {new Date(combo.created_at).toLocaleDateString('fr-FR')}
                                            </div>

                                            {/* Liste des phrases */}
                                            {combo.phrases && combo.phrases.length > 0 && (
                                                <div style={{
                                                    background: 'white',
                                                    padding: '12px',
                                                    borderRadius: '6px',
                                                    maxHeight: '400px',
                                                    overflowY: 'auto'
                                                }}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        marginBottom: '8px',
                                                        color: '#374151',
                                                        fontSize: '13px'
                                                    }}>
                                                        📝 Phrases générées :
                                                    </div>
                                                    {combo.phrases.map((phrase, pIdx) => (
                                                        <div
                                                            key={phrase.id}
                                                            style={{
                                                                padding: '8px',
                                                                marginBottom: '6px',
                                                                background: editingPhrase === phrase.id ? '#fef3c7' : '#f9fafb',
                                                                borderRadius: '4px',
                                                                borderLeft: `3px solid ${editingPhrase === phrase.id ? '#f59e0b' : '#8b5cf6'}`,
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {editingPhrase === phrase.id ? (
                                                                // Mode édition
                                                                <div>
                                                                    <div style={{ marginBottom: '8px' }}>
                                                                        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                                                                            Phrase :
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={editPhrase}
                                                                            onChange={(e) => setEditPhrase(e.target.value)}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '8px',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '4px',
                                                                                fontSize: '14px'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ marginBottom: '8px' }}>
                                                                        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                                                                            Mots (séparés par • ou espaces) :
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={editMots}
                                                                            onChange={(e) => setEditMots(e.target.value)}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '8px',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '4px',
                                                                                fontSize: '14px'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                                        <button
                                                                            onClick={savePhrase}
                                                                            disabled={saving}
                                                                            style={{
                                                                                background: '#10b981',
                                                                                color: 'white',
                                                                                padding: '6px 12px',
                                                                                borderRadius: '4px',
                                                                                border: 'none',
                                                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                                                fontSize: '12px',
                                                                                fontWeight: 'bold',
                                                                                opacity: saving ? 0.6 : 1
                                                                            }}
                                                                        >
                                                                            {saving ? '...' : '✓ Sauvegarder'}
                                                                        </button>
                                                                        <button
                                                                            onClick={cancelEditing}
                                                                            disabled={saving}
                                                                            style={{
                                                                                background: '#6b7280',
                                                                                color: 'white',
                                                                                padding: '6px 12px',
                                                                                borderRadius: '4px',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                fontSize: '12px'
                                                                            }}
                                                                        >
                                                                            ✕ Annuler
                                                                        </button>
                                                                    </div>

                                                                    {/* Liste des mots disponibles */}
                                                                    <div style={{
                                                                        background: '#f0fdf4',
                                                                        border: '1px solid #bbf7d0',
                                                                        borderRadius: '6px',
                                                                        padding: '10px'
                                                                    }}>
                                                                        <div style={{
                                                                            fontSize: '12px',
                                                                            fontWeight: 'bold',
                                                                            color: '#166534',
                                                                            marginBottom: '8px'
                                                                        }}>
                                                                            📚 Mots disponibles ({motsDisponibles.length}) :
                                                                        </div>
                                                                        {loadingMots ? (
                                                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                                                Chargement...
                                                                            </div>
                                                                        ) : motsDisponibles.length > 0 ? (
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                flexWrap: 'wrap',
                                                                                gap: '6px',
                                                                                maxHeight: '150px',
                                                                                overflowY: 'auto'
                                                                            }}>
                                                                                {motsDisponibles.map((mot, idx) => (
                                                                                    <span
                                                                                        key={idx}
                                                                                        onClick={() => {
                                                                                            const currentMots = editMots.trim()
                                                                                            setEditMots(currentMots ? `${currentMots} • ${mot}` : mot)
                                                                                        }}
                                                                                        style={{
                                                                                            background: '#dcfce7',
                                                                                            color: '#166534',
                                                                                            padding: '3px 8px',
                                                                                            borderRadius: '4px',
                                                                                            fontSize: '12px',
                                                                                            cursor: 'pointer',
                                                                                            border: '1px solid #bbf7d0',
                                                                                            transition: 'all 0.15s'
                                                                                        }}
                                                                                        onMouseEnter={(e) => {
                                                                                            e.currentTarget.style.background = '#bbf7d0'
                                                                                            e.currentTarget.style.transform = 'scale(1.05)'
                                                                                        }}
                                                                                        onMouseLeave={(e) => {
                                                                                            e.currentTarget.style.background = '#dcfce7'
                                                                                            e.currentTarget.style.transform = 'scale(1)'
                                                                                        }}
                                                                                        title="Cliquer pour ajouter"
                                                                                    >
                                                                                        {mot}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                                                Aucun mot trouvé
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Mode affichage
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                                                            {pIdx + 1}. {phrase.phrase}
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                                                            Mots ({phrase.mots.length}) : {phrase.mots.join(' • ')}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => startEditing(phrase, combo.texte_ids)}
                                                                        style={{
                                                                            background: '#3b82f6',
                                                                            color: 'white',
                                                                            padding: '4px 10px',
                                                                            borderRadius: '4px',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            fontSize: '11px',
                                                                            fontWeight: 'bold',
                                                                            marginLeft: '8px',
                                                                            flexShrink: 0
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                                                                    >
                                                                        ✏️ Modifier
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '30px'
                }}>
                    <button
                        onClick={() => router.push('/admin/lire')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        ← Retour
                    </button>
                </div>
            </div>
        </div>
    )
}
