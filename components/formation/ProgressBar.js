/**
 * Composant pour afficher une barre de progression avec statistiques
 * Calcule le pourcentage basé sur les évaluations
 */
export default function ProgressBar({ evaluations = [], totalCompetences = 0, showDetails = true }) {
    // Calculer les statistiques
    const stats = {
        total: totalCompetences,
        evaluated: evaluations.length,
        non_acquis: evaluations.filter(e => e.niveau_atteint === 'non_acquis').length,
        en_cours: evaluations.filter(e => e.niveau_atteint === 'en_cours').length,
        acquis: evaluations.filter(e => e.niveau_atteint === 'acquis').length,
        expert: evaluations.filter(e => e.niveau_atteint === 'expert').length
    }

    // Calculer le pourcentage de progression (basé sur les compétences évaluées)
    const progressPercentage = totalCompetences > 0
        ? Math.round((stats.evaluated / totalCompetences) * 100)
        : 0

    // Calculer le pourcentage de réussite (acquis + expert)
    const successCount = stats.acquis + stats.expert
    const successPercentage = stats.evaluated > 0
        ? Math.round((successCount / stats.evaluated) * 100)
        : 0

    return (
        <div style={styles.container}>
            {/* Titre et pourcentage principal */}
            <div style={styles.header}>
                <span style={styles.title}>Progression</span>
                <span style={styles.mainPercentage}>{progressPercentage}%</span>
            </div>

            {/* Barre de progression */}
            <div style={styles.progressBarContainer}>
                <div
                    style={{
                        ...styles.progressBarFill,
                        width: `${progressPercentage}%`
                    }}
                />
            </div>

            {/* Statistiques détaillées */}
            {showDetails && (
                <div style={styles.details}>
                    <div style={styles.statsRow}>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Total compétences</span>
                            <span style={styles.statValue}>{stats.total}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Évaluées</span>
                            <span style={styles.statValue}>{stats.evaluated}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Taux de réussite</span>
                            <span style={{
                                ...styles.statValue,
                                color: successPercentage >= 70 ? '#4caf50' : successPercentage >= 40 ? '#ff9800' : '#f44336'
                            }}>
                                {successPercentage}%
                            </span>
                        </div>
                    </div>

                    {/* Répartition par niveau */}
                    <div style={styles.niveauxRow}>
                        <div style={styles.niveauItem}>
                            <span style={{ ...styles.niveauDot, backgroundColor: '#f44336' }} />
                            <span style={styles.niveauLabel}>Non acquis</span>
                            <span style={styles.niveauCount}>{stats.non_acquis}</span>
                        </div>
                        <div style={styles.niveauItem}>
                            <span style={{ ...styles.niveauDot, backgroundColor: '#ff9800' }} />
                            <span style={styles.niveauLabel}>En cours</span>
                            <span style={styles.niveauCount}>{stats.en_cours}</span>
                        </div>
                        <div style={styles.niveauItem}>
                            <span style={{ ...styles.niveauDot, backgroundColor: '#4caf50' }} />
                            <span style={styles.niveauLabel}>Acquis</span>
                            <span style={styles.niveauCount}>{stats.acquis}</span>
                        </div>
                        <div style={styles.niveauItem}>
                            <span style={{ ...styles.niveauDot, backgroundColor: '#2196f3' }} />
                            <span style={styles.niveauLabel}>Expert</span>
                            <span style={styles.niveauCount}>{stats.expert}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    title: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
    },
    mainPercentage: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#2196f3'
    },
    progressBarContainer: {
        width: '100%',
        height: '24px',
        backgroundColor: '#f0f0f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '16px'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#2196f3',
        transition: 'width 0.3s ease',
        borderRadius: '12px'
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'space-around',
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#666'
    },
    statValue: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
    },
    niveauxRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    niveauItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    niveauDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%'
    },
    niveauLabel: {
        flex: 1,
        fontSize: '13px',
        color: '#666'
    },
    niveauCount: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        minWidth: '24px',
        textAlign: 'right'
    }
}
