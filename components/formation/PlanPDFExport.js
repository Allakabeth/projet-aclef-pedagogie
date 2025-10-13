import { useState } from 'react'

/**
 * Composant pour exporter un plan de formation en PDF
 * Utilise window.print() avec styles CSS optimisés pour l'impression
 */
export default function PlanPDFExport({ plan, competences, domaines, categories }) {
    const [isPrinting, setIsPrinting] = useState(false)

    // Convertir priorité numérique vers texte
    const getPrioriteLabel = (priorite) => {
        if (priorite === 1) return 'Haute'
        if (priorite === 3) return 'Faible'
        return 'Moyenne'
    }

    // Convertir statut technique vers texte
    const getStatutLabel = (statut) => {
        const labels = {
            'a_travailler': 'À travailler',
            'en_cours': 'En cours',
            'acquis': 'Acquis'
        }
        return labels[statut] || statut
    }

    // Convertir statut plan
    const getStatutPlanLabel = (statut) => {
        const labels = {
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'abandonne': 'Archivé'
        }
        return labels[statut] || statut
    }

    // Calculer statistiques
    const stats = {
        total: competences.length,
        aTravailler: competences.filter(c => c.statut === 'a_travailler').length,
        enCours: competences.filter(c => c.statut === 'en_cours').length,
        acquis: competences.filter(c => c.statut === 'acquis').length,
        prioriteHaute: competences.filter(c => c.priorite === 1).length,
        prioriteMoyenne: competences.filter(c => c.priorite === 2).length,
        prioriteFaible: competences.filter(c => c.priorite === 3).length
    }

    const progression = stats.total > 0 ? Math.round((stats.acquis / stats.total) * 100) : 0

    // Organiser compétences par domaine
    const competencesParDomaine = {}
    competences.forEach(comp => {
        const domaine = comp.competence?.categorie?.domaine
        if (domaine) {
            if (!competencesParDomaine[domaine.id]) {
                competencesParDomaine[domaine.id] = {
                    domaine,
                    competences: []
                }
            }
            competencesParDomaine[domaine.id].competences.push(comp)
        }
    })

    const handleExport = () => {
        setIsPrinting(true)

        // Attendre que le composant se mette à jour avec le contenu imprimable
        setTimeout(() => {
            window.print()

            // Remettre l'état après l'impression
            setTimeout(() => {
                setIsPrinting(false)
            }, 500)
        }, 100)
    }

    return (
        <>
            {/* Bouton d'export (visible seulement à l'écran) */}
            {!isPrinting && (
                <button onClick={handleExport} style={styles.exportButton}>
                    📄 Exporter en PDF
                </button>
            )}

            {/* Contenu PDF (caché à l'écran, visible à l'impression) */}
            {isPrinting && (
                <div style={styles.printContainer}>
                    <style dangerouslySetInnerHTML={{ __html: printStyles }} />

                    {/* En-tête */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>Plan de Formation Individualisé</h1>
                        <p style={styles.subtitle}>ACLEF - Association pour la Culture, la Langue et l'Emploi en France</p>
                    </div>

                    {/* Informations apprenant */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Informations de l'apprenant</h2>
                        <table style={styles.infoTable}>
                            <tbody>
                                <tr>
                                    <td style={styles.labelCell}><strong>Apprenant :</strong></td>
                                    <td>{plan.apprenant?.prenom} {plan.apprenant?.nom}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Formateur référent :</strong></td>
                                    <td>{plan.formateur?.prenom} {plan.formateur?.nom}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Date de début :</strong></td>
                                    <td>{new Date(plan.date_debut).toLocaleDateString('fr-FR')}</td>
                                </tr>
                                {plan.date_fin_prevue && (
                                    <tr>
                                        <td style={styles.labelCell}><strong>Date de fin prévue :</strong></td>
                                        <td>{new Date(plan.date_fin_prevue).toLocaleDateString('fr-FR')}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={styles.labelCell}><strong>Statut :</strong></td>
                                    <td>{getStatutPlanLabel(plan.statut)}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Progression :</strong></td>
                                    <td>{stats.acquis} / {stats.total} compétences acquises ({progression}%)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Objectifs */}
                    {plan.objectif_principal && (
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>Objectifs généraux</h2>
                            <p style={styles.objectifText}>{plan.objectif_principal}</p>
                        </div>
                    )}

                    {/* Statistiques */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Vue d'ensemble</h2>
                        <div style={styles.statsGrid}>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{stats.total}</div>
                                <div style={styles.statLabel}>Compétences totales</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{stats.aTravailler}</div>
                                <div style={styles.statLabel}>À travailler</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{stats.enCours}</div>
                                <div style={styles.statLabel}>En cours</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{stats.acquis}</div>
                                <div style={styles.statLabel}>Acquises</div>
                            </div>
                        </div>
                    </div>

                    {/* Compétences par domaine */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Compétences détaillées</h2>

                        {Object.values(competencesParDomaine).map(({ domaine, competences: comps }) => (
                            <div key={domaine.id} style={styles.domaineSection}>
                                <h3 style={styles.domaineTitle}>
                                    {domaine.emoji} {domaine.nom}
                                </h3>

                                <table style={styles.competencesTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Compétence</th>
                                            <th style={styles.th}>Priorité</th>
                                            <th style={styles.th}>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comps.map(comp => (
                                            <tr key={comp.id}>
                                                <td style={styles.td}>{comp.competence?.intitule}</td>
                                                <td style={styles.td}>{getPrioriteLabel(comp.priorite)}</td>
                                                <td style={styles.td}>{getStatutLabel(comp.statut)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Pied de page */}
                    <div style={styles.footer}>
                        <p>Document généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
                        <p>ACLEF - Plan de formation individualisé</p>
                    </div>
                </div>
            )}
        </>
    )
}

// Styles pour l'affichage à l'écran
const styles = {
    exportButton: {
        padding: '12px 24px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    printContainer: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 9999,
        padding: '40px',
        overflow: 'auto'
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
        borderBottom: '3px solid #2196f3',
        paddingBottom: '20px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        margin: 0
    },
    section: {
        marginBottom: '30px',
        pageBreakInside: 'avoid'
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: '16px',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '8px'
    },
    infoTable: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    labelCell: {
        width: '200px',
        padding: '8px 12px',
        verticalAlign: 'top'
    },
    objectifText: {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#333',
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
    },
    statBox: {
        textAlign: 'center',
        padding: '16px',
        border: '1px solid #e0e0e0',
        borderRadius: '4px'
    },
    statNumber: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#666'
    },
    domaineSection: {
        marginBottom: '24px',
        pageBreakInside: 'avoid'
    },
    domaineTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '12px',
        backgroundColor: '#f5f5f5',
        padding: '8px 12px',
        borderRadius: '4px'
    },
    competencesTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
    },
    th: {
        backgroundColor: '#f5f5f5',
        padding: '10px',
        textAlign: 'left',
        fontWeight: '600',
        borderBottom: '2px solid #ddd'
    },
    td: {
        padding: '10px',
        borderBottom: '1px solid #eee'
    },
    footer: {
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '2px solid #e0e0e0',
        textAlign: 'center',
        fontSize: '11px',
        color: '#999'
    }
}

// Styles CSS pour l'impression (appliqués via <style>)
const printStyles = `
    @media print {
        @page {
            margin: 2cm;
            size: A4;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
        }

        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .no-print {
            display: none !important;
        }

        h1, h2, h3 {
            page-break-after: avoid;
        }

        table {
            page-break-inside: avoid;
        }

        tr {
            page-break-inside: avoid;
        }
    }
`
