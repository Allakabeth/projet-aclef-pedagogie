import { useState } from 'react'

/**
 * Composant pour exporter un bilan de formation en PDF
 * Utilise window.print() avec styles CSS optimises pour l'impression
 */
export default function BilanPDFExport({ bilan, bilanCompetences, domaines, categories, allCompetences }) {
    const [isPrinting, setIsPrinting] = useState(false)

    // Convertir statut technique vers texte et emoji
    const getStatutLabel = (statut) => {
        const labels = {
            'non_acquis': 'Non acquis',
            'en_cours': 'En cours',
            'acquis': 'Acquis'
        }
        return labels[statut] || statut || '-'
    }

    const getStatutEmoji = (statut) => {
        const emojis = {
            'non_acquis': '\u274C',
            'en_cours': '\u23F3',
            'acquis': '\u2713'
        }
        return emojis[statut] || '-'
    }

    // Convertir type de bilan vers texte
    const getTypeLabel = (type) => {
        const labels = {
            'direct': 'Bilan direct',
            'intermediaire': 'Bilan interm\u00E9diaire',
            'final': 'Bilan final'
        }
        return labels[type] || type
    }

    // Calculer statistiques
    const stats = {
        total: bilanCompetences.length,
        nonAcquis: bilanCompetences.filter(c => c.statut_fin === 'non_acquis').length,
        enCours: bilanCompetences.filter(c => c.statut_fin === 'en_cours').length,
        acquis: bilanCompetences.filter(c => c.statut_fin === 'acquis').length,
        nonEvalue: bilanCompetences.filter(c => !c.statut_fin).length
    }

    // Organiser competences par domaine
    const competencesParDomaine = {}
    bilanCompetences.forEach(bc => {
        const comp = allCompetences.find(c => c.id === bc.competence_id)
        if (!comp) return
        const cat = categories.find(c => c.id === comp.categorie_id)
        if (!cat) return
        const dom = domaines.find(d => d.id === cat.domaine_id)
        if (!dom) return

        if (!competencesParDomaine[dom.id]) {
            competencesParDomaine[dom.id] = {
                domaine: dom,
                competences: []
            }
        }
        competencesParDomaine[dom.id].competences.push({
            ...bc,
            intitule: comp.intitule,
            categorie_nom: cat.nom
        })
    })

    const handleExport = () => {
        setIsPrinting(true)

        // Attendre que le composant se mette a jour avec le contenu imprimable
        setTimeout(() => {
            window.print()

            // Remettre l'etat apres l'impression
            setTimeout(() => {
                setIsPrinting(false)
            }, 500)
        }, 100)
    }

    return (
        <>
            {/* Bouton d'export (visible seulement a l'ecran) */}
            {!isPrinting && (
                <button onClick={handleExport} style={styles.exportButton}>
                    \uD83D\uDCC4 Exporter en PDF
                </button>
            )}

            {/* Contenu PDF (cache a l'ecran, visible a l'impression) */}
            {isPrinting && (
                <div style={styles.printContainer}>
                    <style dangerouslySetInnerHTML={{ __html: printStyles }} />

                    {/* En-tete */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>BILAN DE FORMATION</h1>
                        <p style={styles.subtitle}>ACLEF - Association pour la Culture, la Langue et l'Emploi en France</p>
                    </div>

                    {/* Informations apprenant */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Informations</h2>
                        <table style={styles.infoTable}>
                            <tbody>
                                <tr>
                                    <td style={styles.labelCell}><strong>Apprenant :</strong></td>
                                    <td>{bilan.apprenant?.prenom} {bilan.apprenant?.nom}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Formateur :</strong></td>
                                    <td>{bilan.formateur?.prenom} {bilan.formateur?.nom}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Date du bilan :</strong></td>
                                    <td>{new Date(bilan.date_bilan).toLocaleDateString('fr-FR')}</td>
                                </tr>
                                <tr>
                                    <td style={styles.labelCell}><strong>Type :</strong></td>
                                    <td>{getTypeLabel(bilan.type)}</td>
                                </tr>
                                {bilan.periode_debut && (
                                    <tr>
                                        <td style={styles.labelCell}><strong>P\u00E9riode :</strong></td>
                                        <td>
                                            {new Date(bilan.periode_debut).toLocaleDateString('fr-FR')}
                                            {bilan.periode_fin && ` au ${new Date(bilan.periode_fin).toLocaleDateString('fr-FR')}`}
                                        </td>
                                    </tr>
                                )}
                                {bilan.duree_realisee && (
                                    <tr>
                                        <td style={styles.labelCell}><strong>Dur\u00E9e r\u00E9alis\u00E9e :</strong></td>
                                        <td>{bilan.duree_realisee} heures</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Statistiques */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Vue d'ensemble</h2>
                        <div style={styles.statsGrid}>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{stats.total}</div>
                                <div style={styles.statLabel}>Comp\u00E9tences \u00E9valu\u00E9es</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={{ ...styles.statNumber, color: '#4caf50' }}>{stats.acquis}</div>
                                <div style={styles.statLabel}>Acquises</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={{ ...styles.statNumber, color: '#ff9800' }}>{stats.enCours}</div>
                                <div style={styles.statLabel}>En cours</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={{ ...styles.statNumber, color: '#f44336' }}>{stats.nonAcquis}</div>
                                <div style={styles.statLabel}>Non acquises</div>
                            </div>
                        </div>
                    </div>

                    {/* Competences par domaine */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionTitle}>Comp\u00E9tences d\u00E9taill\u00E9es</h2>

                        {Object.values(competencesParDomaine).map(({ domaine, competences: comps }) => (
                            <div key={domaine.id} style={styles.domaineSection}>
                                <h3 style={styles.domaineTitle}>
                                    {domaine.emoji} {domaine.nom}
                                </h3>

                                {/* Commentaire domaine */}
                                {bilan.domaine_comments && bilan.domaine_comments[domaine.id] && (
                                    <p style={styles.domaineComment}>
                                        {bilan.domaine_comments[domaine.id]}
                                    </p>
                                )}

                                <table style={styles.competencesTable}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Comp\u00E9tence</th>
                                            <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>Statut</th>
                                            <th style={{ ...styles.th, width: '200px' }}>Commentaire</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comps.map(comp => (
                                            <tr key={comp.id || comp.competence_id}>
                                                <td style={styles.td}>{comp.intitule}</td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    {getStatutEmoji(comp.statut_fin)} {getStatutLabel(comp.statut_fin)}
                                                </td>
                                                <td style={styles.td}>{comp.commentaire || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Synthese */}
                    {bilan.synthese && (
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>Synth\u00E8se</h2>
                            <p style={styles.objectifText}>{bilan.synthese}</p>
                        </div>
                    )}

                    {/* Recommandations */}
                    {bilan.recommandations && (
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>Recommandations</h2>
                            <p style={styles.objectifText}>{bilan.recommandations}</p>
                        </div>
                    )}

                    {/* Pied de page */}
                    <div style={styles.footer}>
                        <p>Document g\u00E9n\u00E9r\u00E9 le {new Date().toLocaleDateString('fr-FR')} \u00E0 {new Date().toLocaleTimeString('fr-FR')}</p>
                        <p>ACLEF - Bilan de formation</p>
                    </div>
                </div>
            )}
        </>
    )
}

// Styles pour l'affichage a l'ecran
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
        borderRadius: '4px',
        whiteSpace: 'pre-wrap'
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
        marginBottom: '8px',
        backgroundColor: '#f5f5f5',
        padding: '8px 12px',
        borderRadius: '4px'
    },
    domaineComment: {
        fontSize: '13px',
        color: '#555',
        fontStyle: 'italic',
        padding: '8px 12px',
        marginBottom: '12px',
        backgroundColor: '#fafafa',
        borderLeft: '3px solid #2196f3',
        borderRadius: '2px'
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

// Styles CSS pour l'impression (appliques via <style>)
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
