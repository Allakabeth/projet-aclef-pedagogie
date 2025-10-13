/**
 * Composant pour afficher un résumé d'un plan de formation
 * Statistiques et vue d'ensemble
 */
export default function PlanSummary({ plan, competences = [] }) {
    if (!plan) {
        return null
    }

    // Calculer les statistiques
    const stats = {
        total: competences.length,
        aFaire: competences.filter(c => c.statut === 'a_faire').length,
        enCours: competences.filter(c => c.statut === 'en_cours').length,
        valide: competences.filter(c => c.statut === 'valide').length,
        prioriteHaute: competences.filter(c => c.priorite === 'haute').length,
        prioriteMoyenne: competences.filter(c => c.priorite === 'moyenne').length,
        prioriteFaible: competences.filter(c => c.priorite === 'faible').length
    }

    // Calculer la progression
    const progression = stats.total > 0
        ? Math.round((stats.valide / stats.total) * 100)
        : 0

    // Organiser par domaine
    const parDomaine = {}
    competences.forEach(comp => {
        const domaine = comp.competence?.categorie?.domaine?.nom || 'Inconnu'
        if (!parDomaine[domaine]) {
            parDomaine[domaine] = 0
        }
        parDomaine[domaine]++
    })

    function getStatutBadge(statut) {
        const badges = {
            'brouillon': { label: 'Brouillon', color: '#9e9e9e' },
            'actif': { label: 'Actif', color: '#4caf50' },
            'termine': { label: 'Terminé', color: '#2196f3' },
            'archive': { label: 'Archivé', color: '#757575' }
        }
        const badge = badges[statut] || { label: statut, color: '#666' }

        return (
            <span style={{
                ...styles.badge,
                backgroundColor: badge.color
            }}>
                {badge.label}
            </span>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>Résumé du plan</h3>
                    <div style={styles.info}>
                        <span><strong>Apprenant:</strong> {plan.apprenant?.prenom} {plan.apprenant?.nom}</span>
                        <span><strong>Début:</strong> {new Date(plan.date_debut).toLocaleDateString('fr-FR')}</span>
                        {plan.date_fin_prevue && (
                            <span><strong>Fin prévue:</strong> {new Date(plan.date_fin_prevue).toLocaleDateString('fr-FR')}</span>
                        )}
                    </div>
                </div>
                {getStatutBadge(plan.statut)}
            </div>

            {/* Progression globale */}
            <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>Progression</span>
                    <span style={styles.progressValue}>{progression}%</span>
                </div>
                <div style={styles.progressBarContainer}>
                    <div
                        style={{
                            ...styles.progressBarFill,
                            width: `${progression}%`
                        }}
                    />
                </div>
                <div style={styles.progressStats}>
                    <span>{stats.valide}/{stats.total} compétences validées</span>
                </div>
            </div>

            {/* Statistiques */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.total}</div>
                    <div style={styles.statLabel}>Total</div>
                </div>
                <div style={{ ...styles.statCard, ...styles.statCardGrey }}>
                    <div style={styles.statValue}>{stats.aFaire}</div>
                    <div style={styles.statLabel}>À faire</div>
                </div>
                <div style={{ ...styles.statCard, ...styles.statCardOrange }}>
                    <div style={styles.statValue}>{stats.enCours}</div>
                    <div style={styles.statLabel}>En cours</div>
                </div>
                <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
                    <div style={styles.statValue}>{stats.valide}</div>
                    <div style={styles.statLabel}>Validé</div>
                </div>
            </div>

            {/* Répartition priorités */}
            {stats.total > 0 && (
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Priorités</h4>
                    <div style={styles.prioritiesGrid}>
                        <div style={styles.priorityItem}>
                            <span style={{ ...styles.priorityDot, backgroundColor: '#f44336' }} />
                            <span style={styles.priorityLabel}>Haute</span>
                            <span style={styles.priorityCount}>{stats.prioriteHaute}</span>
                        </div>
                        <div style={styles.priorityItem}>
                            <span style={{ ...styles.priorityDot, backgroundColor: '#ff9800' }} />
                            <span style={styles.priorityLabel}>Moyenne</span>
                            <span style={styles.priorityCount}>{stats.prioriteMoyenne}</span>
                        </div>
                        <div style={styles.priorityItem}>
                            <span style={{ ...styles.priorityDot, backgroundColor: '#4caf50' }} />
                            <span style={styles.priorityLabel}>Faible</span>
                            <span style={styles.priorityCount}>{stats.prioriteFaible}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Répartition par domaine */}
            {Object.keys(parDomaine).length > 0 && (
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Répartition par domaine</h4>
                    {Object.entries(parDomaine).map(([domaine, count]) => (
                        <div key={domaine} style={styles.domaineItem}>
                            <span style={styles.domaineName}>{domaine}</span>
                            <span style={styles.domaineCount}>{count} compétence{count > 1 ? 's' : ''}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Objectifs généraux */}
            {plan.objectifs_generaux && (
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Objectifs généraux</h4>
                    <p style={styles.objectifs}>{plan.objectifs_generaux}</p>
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
        alignItems: 'flex-start',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0',
        gap: '16px'
    },
    title: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 8px 0'
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '13px',
        color: '#666'
    },
    badge: {
        padding: '6px 12px',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    progressSection: {
        marginBottom: '20px'
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    progressLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333'
    },
    progressValue: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2196f3'
    },
    progressBarContainer: {
        width: '100%',
        height: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '8px'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4caf50',
        transition: 'width 0.3s ease',
        borderRadius: '10px'
    },
    progressStats: {
        fontSize: '12px',
        color: '#666',
        textAlign: 'right'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
    },
    statCard: {
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        textAlign: 'center'
    },
    statCardGrey: {
        backgroundColor: '#f5f5f5'
    },
    statCardOrange: {
        backgroundColor: '#fff3e0'
    },
    statCardGreen: {
        backgroundColor: '#e8f5e9'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#666'
    },
    section: {
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #f0f0f0'
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#666',
        margin: '0 0 12px 0'
    },
    prioritiesGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    priorityItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    priorityDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%'
    },
    priorityLabel: {
        flex: 1,
        fontSize: '13px',
        color: '#666'
    },
    priorityCount: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333'
    },
    domaineItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '13px'
    },
    domaineName: {
        color: '#333',
        fontWeight: '500'
    },
    domaineCount: {
        color: '#666'
    },
    objectifs: {
        fontSize: '13px',
        color: '#666',
        lineHeight: '1.6',
        margin: 0
    }
}
