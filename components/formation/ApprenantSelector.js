import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Composant pour sélectionner un apprenant
 * Recherche dans la base de données et affiche une liste filtrable
 */
export default function ApprenantSelector({ onSelect, selectedId, disabled = false }) {
    const [apprenants, setApprenants] = useState([])
    const [filteredApprenants, setFilteredApprenants] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadApprenants()
    }, [])

    useEffect(() => {
        // Filtrer les apprenants en fonction de la recherche
        if (searchTerm.trim() === '') {
            setFilteredApprenants(apprenants)
        } else {
            const term = searchTerm.toLowerCase()
            const filtered = apprenants.filter(app =>
                app.prenom.toLowerCase().includes(term) ||
                app.nom.toLowerCase().includes(term) ||
                (app.email && app.email.toLowerCase().includes(term))
            )
            setFilteredApprenants(filtered)
        }
    }, [searchTerm, apprenants])

    async function loadApprenants() {
        try {
            setLoading(true)
            setError(null)

            // Récupérer tous les utilisateurs avec role 'apprenant' ou sans role
            const { data, error: fetchError } = await supabase
                .from('users')
                .select('id, prenom, nom, email')
                .or('role.is.null,role.eq.apprenant')
                .order('prenom', { ascending: true })

            if (fetchError) throw fetchError

            setApprenants(data || [])
            setFilteredApprenants(data || [])
        } catch (err) {
            console.error('Erreur chargement apprenants:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleSelect(apprenantId) {
        if (disabled) return
        onSelect(apprenantId)
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <p style={styles.loadingText}>Chargement des apprenants...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <p style={styles.errorText}>❌ Erreur: {error}</p>
                <button onClick={loadApprenants} style={styles.retryButton}>
                    Réessayer
                </button>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <label style={styles.label}>
                Sélectionner un apprenant
            </label>

            <input
                type="text"
                placeholder="Rechercher par prénom, nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
                disabled={disabled}
            />

            <div style={styles.apprenantsList}>
                {filteredApprenants.length === 0 ? (
                    <p style={styles.emptyText}>
                        {searchTerm ? 'Aucun apprenant trouvé' : 'Aucun apprenant disponible'}
                    </p>
                ) : (
                    filteredApprenants.map(app => (
                        <div
                            key={app.id}
                            onClick={() => handleSelect(app.id)}
                            style={{
                                ...styles.apprenantCard,
                                ...(selectedId === app.id ? styles.apprenantCardSelected : {}),
                                ...(disabled ? styles.apprenantCardDisabled : {})
                            }}
                        >
                            <div style={styles.apprenantInfo}>
                                <strong>{app.prenom} {app.nom}</strong>
                                {app.email && (
                                    <span style={styles.apprenantEmail}>{app.email}</span>
                                )}
                            </div>
                            {selectedId === app.id && (
                                <span style={styles.checkmark}>✓</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {filteredApprenants.length > 0 && (
                <p style={styles.countText}>
                    {filteredApprenants.length} apprenant{filteredApprenants.length > 1 ? 's' : ''}
                    {searchTerm && ` trouvé${filteredApprenants.length > 1 ? 's' : ''}`}
                </p>
            )}
        </div>
    )
}

const styles = {
    container: {
        width: '100%',
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#333'
    },
    searchInput: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '12px',
        boxSizing: 'border-box'
    },
    apprenantsList: {
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff'
    },
    apprenantCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    apprenantCardSelected: {
        backgroundColor: '#e3f2fd',
        borderLeft: '4px solid #2196F3'
    },
    apprenantCardDisabled: {
        cursor: 'not-allowed',
        opacity: 0.6
    },
    apprenantInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    apprenantEmail: {
        fontSize: '12px',
        color: '#666'
    },
    checkmark: {
        color: '#2196F3',
        fontSize: '18px',
        fontWeight: 'bold'
    },
    countText: {
        marginTop: '8px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'right'
    },
    loadingText: {
        textAlign: 'center',
        color: '#666',
        padding: '20px'
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: '12px'
    },
    retryButton: {
        padding: '8px 16px',
        backgroundColor: '#2196F3',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: '20px'
    }
}
