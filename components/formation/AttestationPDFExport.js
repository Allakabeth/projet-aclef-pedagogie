import { useState } from 'react'

/**
 * Composant pour exporter une attestation de competences acquises (ACA) en PDF
 * Utilise window.print() avec styles CSS optimises pour l'impression
 */
export default function AttestationPDFExport({ attestation, competences }) {
    const [isPrinting, setIsPrinting] = useState(false)

    // Regrouper les competences par domaine_nom
    const competencesParDomaine = {}
    competences.forEach(ac => {
        const domaineName = ac.domaine_nom
            || ac.competence?.categorie?.domaine?.nom
            || 'Autre'
        if (!competencesParDomaine[domaineName]) {
            competencesParDomaine[domaineName] = []
        }
        competencesParDomaine[domaineName].push(ac)
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

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    return (
        <>
            {/* Bouton d'export (visible seulement a l'ecran) */}
            {!isPrinting && (
                <button onClick={handleExport} style={styles.exportButton}>
                    {'\uD83D\uDCC4'} Exporter en PDF
                </button>
            )}

            {/* Contenu PDF (cache a l'ecran, visible a l'impression) */}
            {isPrinting && (
                <div style={styles.printContainer}>
                    <style dangerouslySetInnerHTML={{ __html: printStyles }} />

                    {/* En-tete */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>ATTESTATION DE COMPETENCES ACQUISES</h1>
                        <p style={styles.numero}>N{'\u00B0'} {attestation.numero}</p>
                    </div>

                    {/* Organisme */}
                    <div style={styles.section}>
                        <p style={styles.organisme}>
                            Organisme de formation : <strong>ACLEF</strong>
                        </p>
                        <p style={styles.orgSubtitle}>
                            Association pour la Culture, la Langue et l'Emploi en France
                        </p>
                    </div>

                    {/* Certifie que */}
                    <div style={styles.section}>
                        <p style={styles.certifieText}>
                            Certifie que <strong style={styles.apprenantName}>
                                {attestation.apprenant?.prenom} {attestation.apprenant?.nom}
                            </strong>
                        </p>
                        <p style={styles.certifieText}>
                            a acquis les competences suivantes :
                        </p>
                    </div>

                    {/* Competences par domaine */}
                    <div style={styles.competencesSection}>
                        {Object.entries(competencesParDomaine).map(([domaineName, comps]) => (
                            <div key={domaineName} style={styles.domaineBlock}>
                                <h3 style={styles.domaineTitle}>{domaineName}</h3>
                                <ul style={styles.competencesList}>
                                    {comps.map(ac => (
                                        <li key={ac.id} style={styles.competenceItem}>
                                            {ac.competence?.intitule || 'Competence'}
                                            {ac.niveau_atteint && ac.niveau_atteint !== 'acquis' && (
                                                <span style={styles.niveauText}> ({ac.niveau_atteint})</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {competences.length === 0 && (
                            <p style={styles.emptyText}>Aucune competence attestee.</p>
                        )}
                    </div>

                    {/* Fait a / date */}
                    <div style={styles.signatureSection}>
                        <p style={styles.faitA}>
                            Fait {attestation.lieu_delivrance ? `a ${attestation.lieu_delivrance}` : ''}, le {formatDate(attestation.date_delivrance)}
                        </p>

                        {attestation.signataire_nom && (
                            <div style={styles.signataireBlock}>
                                <p style={styles.signataireNom}>
                                    {attestation.signataire_nom}
                                </p>
                                {attestation.signataire_fonction && (
                                    <p style={styles.signataireFonction}>
                                        {attestation.signataire_fonction}
                                    </p>
                                )}
                                <div style={styles.signatureSpace}>
                                    <p style={styles.signatureLabel}>Signature :</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pied de page */}
                    <div style={styles.footer}>
                        <p>Document genere le {new Date().toLocaleDateString('fr-FR')} - ACLEF</p>
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
        padding: '60px 80px',
        overflow: 'auto',
        fontFamily: 'Georgia, "Times New Roman", serif'
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
        borderBottom: '3px solid #333',
        paddingBottom: '24px'
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 12px 0',
        letterSpacing: '1px',
        textTransform: 'uppercase'
    },
    numero: {
        fontSize: '16px',
        color: '#555',
        margin: 0,
        fontStyle: 'italic'
    },
    section: {
        marginBottom: '24px',
        pageBreakInside: 'avoid'
    },
    organisme: {
        fontSize: '16px',
        color: '#333',
        margin: '0 0 4px 0',
        textAlign: 'center'
    },
    orgSubtitle: {
        fontSize: '13px',
        color: '#666',
        margin: 0,
        textAlign: 'center',
        fontStyle: 'italic'
    },
    certifieText: {
        fontSize: '16px',
        color: '#333',
        margin: '0 0 8px 0',
        textAlign: 'center',
        lineHeight: '1.6'
    },
    apprenantName: {
        fontSize: '20px',
        color: '#1a1a1a'
    },
    competencesSection: {
        marginTop: '32px',
        marginBottom: '40px',
        paddingLeft: '20px',
        paddingRight: '20px'
    },
    domaineBlock: {
        marginBottom: '20px',
        pageBreakInside: 'avoid'
    },
    domaineTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 10px 0',
        borderBottom: '1px solid #ccc',
        paddingBottom: '6px'
    },
    competencesList: {
        margin: '0 0 0 20px',
        padding: 0,
        listStyleType: 'disc'
    },
    competenceItem: {
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.8',
        marginBottom: '4px'
    },
    niveauText: {
        color: '#666',
        fontStyle: 'italic',
        fontSize: '13px'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        padding: '20px'
    },
    signatureSection: {
        marginTop: '60px',
        textAlign: 'right',
        paddingRight: '40px'
    },
    faitA: {
        fontSize: '14px',
        color: '#333',
        marginBottom: '24px'
    },
    signataireBlock: {
        textAlign: 'right'
    },
    signataireNom: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    },
    signataireFonction: {
        fontSize: '14px',
        color: '#555',
        margin: '0 0 16px 0',
        fontStyle: 'italic'
    },
    signatureSpace: {
        marginTop: '16px',
        borderTop: '1px solid #ccc',
        paddingTop: '8px',
        width: '250px',
        marginLeft: 'auto'
    },
    signatureLabel: {
        fontSize: '12px',
        color: '#999',
        margin: 0
    },
    footer: {
        marginTop: '60px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
        fontSize: '10px',
        color: '#999'
    }
}

// Styles CSS pour l'impression (appliques via <style>)
const printStyles = `
    @media print {
        @page {
            margin: 2.5cm;
            size: A4;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: Georgia, "Times New Roman", serif;
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
