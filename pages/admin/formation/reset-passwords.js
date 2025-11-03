import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page Admin - Réinitialisation des mots de passe des apprenants
 * Permet de choisir un apprenant et de réinitialiser son mot de passe
 */
export default function ResetPasswordsApprenants() {
    const router = useRouter()
    const [apprenants, setApprenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [resettingId, setResettingId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadApprenants()
    }, [])

    async function loadApprenants() {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const response = await fetch('/api/admin/apprenants-list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des apprenants')
            }

            const data = await response.json()
            setApprenants(data.apprenants || [])
        } catch (err) {
            console.error('Erreur chargement apprenants:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function resetPassword(apprenant) {
        const confirmation = window.confirm(
            `🔄 Réinitialiser le mot de passe de ${apprenant.prenom} ${apprenant.nom} ?\n\n` +
            `Son mot de passe reviendra à : ${apprenant.nom}\n\n` +
            `Il devra se reconnecter avec ce mot de passe.`
        )

        if (!confirmation) return

        try {
            setResettingId(apprenant.id)

            const token = localStorage.getItem('quiz-admin-token')
            const response = await fetch('/api/admin/reset-passwords-apprenants', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apprenant_id: apprenant.id
                })
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la réinitialisation')
            }

            const data = await response.json()

            if (data.already_reset) {
                alert(`ℹ️ ${apprenant.prenom} ${apprenant.nom} utilise déjà son mot de passe initial.`)
            } else {
                alert(`✅ Mot de passe réinitialisé avec succès !\n\n${apprenant.prenom} ${apprenant.nom} doit maintenant se connecter avec : ${apprenant.nom}`)
            }

            // Recharger la liste pour mettre à jour l'affichage
            loadApprenants()
        } catch (err) {
            console.error('Erreur réinitialisation:', err)
            alert('❌ Erreur lors de la réinitialisation du mot de passe.')
        } finally {
            setResettingId(null)
        }
    }

    // Filtrer les apprenants selon la recherche
    const apprenantsFiltered = apprenants.filter(a => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            a.prenom.toLowerCase().includes(search) ||
            a.nom.toLowerCase().includes(search) ||
            (a.identifiant && a.identifiant.toLowerCase().includes(search))
        )
    })

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <p>Chargement des apprenants...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <p>❌ Erreur: {error}</p>
                    <button onClick={loadApprenants} style={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>🔄 Réinitialiser les mots de passe</h1>
                <p style={styles.subtitle}>
                    Choisissez un apprenant pour réinitialiser son mot de passe
                </p>
            </div>

            {/* Bouton retour */}
            <button
                onClick={() => router.push('/admin/formation')}
                style={styles.backButton}
            >
                ← Retour au menu Formation
            </button>

            {/* Recherche */}
            <div style={styles.searchBox}>
                <input
                    type="text"
                    placeholder="🔍 Rechercher un apprenant (prénom, nom, identifiant)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Info */}
            <div style={styles.infoBox}>
                <p style={styles.infoText}>
                    💡 <strong>Info :</strong> Le mot de passe initial d'un apprenant est son <strong>nom de famille</strong> (respectez les majuscules/minuscules).
                </p>
            </div>

            {/* Liste des apprenants */}
            {apprenantsFiltered.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p>Aucun apprenant trouvé</p>
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Prénom</th>
                                <th style={styles.th}>Nom</th>
                                <th style={styles.th}>Identifiant</th>
                                <th style={styles.th}>Mot de passe</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apprenantsFiltered.map(apprenant => (
                                <tr key={apprenant.id} style={styles.tableRow}>
                                    <td style={styles.td}>{apprenant.prenom}</td>
                                    <td style={styles.td}><strong>{apprenant.nom}</strong></td>
                                    <td style={styles.td}>{apprenant.identifiant || '-'}</td>
                                    <td style={styles.td}>
                                        {apprenant.password_hash ? (
                                            <span style={styles.badgeCustom}>Personnalisé</span>
                                        ) : (
                                            <span style={styles.badgeInitial}>Initial ({apprenant.nom})</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => resetPassword(apprenant)}
                                            disabled={resettingId === apprenant.id || !apprenant.password_hash}
                                            style={{
                                                ...styles.resetButton,
                                                ...(resettingId === apprenant.id && styles.resetButtonLoading),
                                                ...(!apprenant.password_hash && styles.resetButtonDisabled)
                                            }}
                                        >
                                            {resettingId === apprenant.id ? '⏳' : '🔄'} Réinitialiser
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Stats */}
            <div style={styles.statsBox}>
                <p style={styles.statsText}>
                    Total : <strong>{apprenantsFiltered.length}</strong> apprenant(s) •
                    Mot de passe personnalisé : <strong>{apprenantsFiltered.filter(a => a.password_hash).length}</strong> •
                    Mot de passe initial : <strong>{apprenantsFiltered.filter(a => !a.password_hash).length}</strong>
                </p>
            </div>
        </div>
    )
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        marginBottom: '24px',
        textAlign: 'center'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#666',
        margin: 0
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '24px'
    },
    searchBox: {
        marginBottom: '24px'
    },
    searchInput: {
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        border: '2px solid #ddd',
        borderRadius: '8px',
        outline: 'none'
    },
    infoBox: {
        padding: '16px',
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        marginBottom: '24px'
    },
    infoText: {
        margin: 0,
        color: '#1565c0',
        fontSize: '14px'
    },
    tableContainer: {
        overflowX: 'auto',
        marginBottom: '24px',
        border: '1px solid #ddd',
        borderRadius: '8px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white'
    },
    tableHeader: {
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #ddd'
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#333',
        fontSize: '14px'
    },
    tableRow: {
        borderBottom: '1px solid #eee'
    },
    td: {
        padding: '12px',
        fontSize: '14px',
        color: '#333'
    },
    badgeCustom: {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    badgeInitial: {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#d4edda',
        color: '#155724',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    resetButton: {
        padding: '8px 16px',
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    },
    resetButtonLoading: {
        backgroundColor: '#ccc',
        cursor: 'wait'
    },
    resetButtonDisabled: {
        backgroundColor: '#e0e0e0',
        color: '#999',
        cursor: 'not-allowed'
    },
    statsBox: {
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center'
    },
    statsText: {
        margin: 0,
        color: '#666',
        fontSize: '14px'
    },
    loadingBox: {
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px'
    },
    errorBox: {
        padding: '20px',
        backgroundColor: '#ffebee',
        borderRadius: '8px',
        textAlign: 'center'
    },
    retryButton: {
        padding: '8px 16px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '12px'
    },
    emptyBox: {
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        color: '#999'
    }
}
