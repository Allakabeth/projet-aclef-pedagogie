import { useState } from 'react'

/**
 * Composant pour générer automatiquement un plan depuis un positionnement
 * Affiche une prévisualisation avant génération
 */
export default function PlanGenerator({ positionnement, onGenerate, loading = false }) {
    const [analyzing, setAnalyzing] = useState(false)
    const [preview, setPreview] = useState(null)

    if (!positionnement) {
        return (
            <div style={styles.emptyState}>
                <p>Aucun positionnement sélectionné</p>
            </div>
        )
    }

    // Analyser le positionnement pour générer la prévisualisation
    function analyzePositionnement() {
        setAnalyzing(true)

        const evaluations = positionnement.evaluations || []

        const nonAcquis = evaluations.filter(e => e.niveau_atteint === 'non_acquis')
        const enCours = evaluations.filter(e => e.niveau_atteint === 'en_cours')
        const totalATravailler = nonAcquis.length + enCours.length

        // Organiser par domaine
        const parDomaine = {}

        ;[...nonAcquis, ...enCours].forEach(evaluation => {
            const domaine = evaluation.competence?.categorie?.domaine?.nom || 'Inconnu'
            if (!parDomaine[domaine]) {
                parDomaine[domaine] = {
                    haute: 0,
                    moyenne: 0
                }
            }
            if (evaluation.niveau_atteint === 'non_acquis') {
                parDomaine[domaine].haute++
            } else {
                parDomaine[domaine].moyenne++
            }
        })

        setPreview({
            totalCompetences: totalATravailler,
            prioriteHaute: nonAcquis.length,
            prioriteMoyenne: enCours.length,
            parDomaine
        })

        setAnalyzing(false)
    }

    function handleGenerate() {
        if (onGenerate) {
            onGenerate(positionnement.id)
        }
    }

    return (
        <div style={styles.container}>
            {/* Informations du positionnement */}
            <div style={styles.header}>
                <h3 style={styles.title}>
                    Générer un plan depuis le positionnement
                </h3>
                <div style={styles.info}>
                    <div style={styles.infoItem}>
                        <strong>Apprenant:</strong> {positionnement.apprenant?.prenom} {positionnement.apprenant?.nom}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Date:</strong> {new Date(positionnement.date_positionnement).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={styles.infoItem}>
                        <strong>Statut:</strong> {positionnement.statut}
                    </div>
                </div>
            </div>

            {/* Bouton d'analyse */}
            {!preview && (
                <div style={styles.analyzeSection}>
                    <p style={styles.description}>
                        L'analyse du positionnement permettra d'identifier automatiquement les compétences
                        "Non acquis" et "En cours" pour créer un plan de formation personnalisé.
                    </p>
                    <button
                        onClick={analyzePositionnement}
                        disabled={analyzing}
                        style={styles.analyzeButton}
                    >
                        {analyzing ? 'Analyse...' : '🔍 Analyser le positionnement'}
                    </button>
                </div>
            )}

            {/* Prévisualisation */}
            {preview && (
                <div style={styles.preview}>
                    <h4 style={styles.previewTitle}>📊 Aperçu du plan à générer</h4>

                    {/* Statistiques globales */}
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <div style={styles.statValue}>{preview.totalCompetences}</div>
                            <div style={styles.statLabel}>Compétences au total</div>
                        </div>
                        <div style={{ ...styles.statCard, ...styles.statCardHaute }}>
                            <div style={styles.statValue}>{preview.prioriteHaute}</div>
                            <div style={styles.statLabel}>Priorité HAUTE</div>
                            <div style={styles.statSubtext}>(Non acquis)</div>
                        </div>
                        <div style={{ ...styles.statCard, ...styles.statCardMoyenne }}>
                            <div style={styles.statValue}>{preview.prioriteMoyenne}</div>
                            <div style={styles.statLabel}>Priorité MOYENNE</div>
                            <div style={styles.statSubtext}>(En cours)</div>
                        </div>
                    </div>

                    {/* Répartition par domaine */}
                    {Object.keys(preview.parDomaine).length > 0 && (
                        <div style={styles.domainesSection}>
                            <h5 style={styles.domaineSectionTitle}>Répartition par domaine:</h5>
                            {Object.entries(preview.parDomaine).map(([domaine, counts]) => (
                                <div key={domaine} style={styles.domaineItem}>
                                    <div style={styles.domaineName}>{domaine}</div>
                                    <div style={styles.domaineCounts}>
                                        {counts.haute > 0 && (
                                            <span style={styles.countHaute}>
                                                {counts.haute} haute
                                            </span>
                                        )}
                                        {counts.moyenne > 0 && (
                                            <span style={styles.countMoyenne}>
                                                {counts.moyenne} moyenne
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Message si aucune compétence */}
                    {preview.totalCompetences === 0 && (
                        <div style={styles.warningBox}>
                            <p>⚠️ Aucune compétence "Non acquis" ou "En cours" trouvée.</p>
                            <p style={styles.warningSubtext}>
                                Le plan sera créé mais sera vide. Vous pourrez ajouter des compétences manuellement.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={styles.actions}>
                        <button
                            onClick={() => setPreview(null)}
                            disabled={loading}
                            style={styles.cancelButton}
                        >
                            ← Modifier
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={styles.generateButton}
                        >
                            {loading ? 'Génération...' : '✨ Générer le plan'}
                        </button>
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
        padding: '24px',
        marginBottom: '20px'
    },
    header: {
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
    },
    title: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 12px 0'
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    infoItem: {
        fontSize: '14px',
        color: '#666'
    },
    analyzeSection: {
        textAlign: 'center',
        padding: '20px 0'
    },
    description: {
        fontSize: '14px',
        color: '#666',
        lineHeight: '1.6',
        marginBottom: '20px'
    },
    analyzeButton: {
        padding: '12px 24px',
        backgroundColor: '#2196f3',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600'
    },
    preview: {
        marginTop: '20px'
    },
    previewTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 16px 0'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
    },
    statCard: {
        padding: '16px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        textAlign: 'center'
    },
    statCardHaute: {
        backgroundColor: '#ffebee'
    },
    statCardMoyenne: {
        backgroundColor: '#fff3e0'
    },
    statValue: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '13px',
        color: '#666',
        fontWeight: '500'
    },
    statSubtext: {
        fontSize: '11px',
        color: '#999',
        marginTop: '2px'
    },
    domainesSection: {
        marginTop: '20px',
        marginBottom: '20px'
    },
    domaineSectionTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#666',
        margin: '0 0 12px 0'
    },
    domaineItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        marginBottom: '8px'
    },
    domaineName: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333'
    },
    domaineCounts: {
        display: 'flex',
        gap: '12px'
    },
    countHaute: {
        fontSize: '13px',
        color: '#d32f2f',
        fontWeight: '500'
    },
    countMoyenne: {
        fontSize: '13px',
        color: '#f57c00',
        fontWeight: '500'
    },
    warningBox: {
        padding: '16px',
        backgroundColor: '#fff3cd',
        borderRadius: '6px',
        marginBottom: '20px'
    },
    warningSubtext: {
        fontSize: '13px',
        color: '#856404',
        margin: '8px 0 0 0'
    },
    actions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #f0f0f0'
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    generateButton: {
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999'
    }
}
