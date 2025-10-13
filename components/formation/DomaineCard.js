import { useState } from 'react'

/**
 * Composant pour afficher un domaine avec ses catégories et compétences
 * Permet de visualiser la structure hiérarchique et de sélectionner des compétences
 */
export default function DomaineCard({ domaine, categories, competences, onCompetenceClick, readonly = false }) {
    const [expanded, setExpanded] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState({})

    // Filtrer les catégories du domaine
    const domaineCategories = categories.filter(cat => cat.domaine_id === domaine.id)

    // Obtenir les compétences d'une catégorie
    function getCompetencesForCategorie(categorieId) {
        return competences.filter(comp => comp.categorie_id === categorieId)
    }

    // Toggle expansion d'une catégorie
    function toggleCategorie(categorieId) {
        setExpandedCategories(prev => ({
            ...prev,
            [categorieId]: !prev[categorieId]
        }))
    }

    return (
        <div style={styles.card}>
            {/* Header du domaine */}
            <div
                style={styles.domaineHeader}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={styles.domaineTitle}>
                    <span style={styles.emoji}>{domaine.emoji}</span>
                    <h3 style={styles.domaineName}>{domaine.nom}</h3>
                    <span style={styles.expandIcon}>
                        {expanded ? '▼' : '▶'}
                    </span>
                </div>
                {domaine.description && (
                    <p style={styles.domaineDescription}>{domaine.description}</p>
                )}
            </div>

            {/* Contenu (catégories et compétences) */}
            {expanded && (
                <div style={styles.domaineContent}>
                    {domaineCategories.length === 0 ? (
                        <p style={styles.emptyText}>Aucune catégorie</p>
                    ) : (
                        domaineCategories.map(categorie => {
                            const catCompetences = getCompetencesForCategorie(categorie.id)
                            const isExpanded = expandedCategories[categorie.id] !== false // Par défaut ouvert

                            return (
                                <div key={categorie.id} style={styles.categorieBlock}>
                                    {/* Header de la catégorie */}
                                    <div
                                        style={styles.categorieHeader}
                                        onClick={() => toggleCategorie(categorie.id)}
                                    >
                                        <span style={styles.expandIconSmall}>
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                        <h4 style={styles.categorieName}>{categorie.nom}</h4>
                                        <span style={styles.countBadge}>
                                            {catCompetences.length}
                                        </span>
                                    </div>

                                    {/* Liste des compétences */}
                                    {isExpanded && (
                                        <div style={styles.competencesList}>
                                            {catCompetences.length === 0 ? (
                                                <p style={styles.emptyTextSmall}>Aucune compétence</p>
                                            ) : (
                                                catCompetences.map(competence => (
                                                    <div
                                                        key={competence.id}
                                                        style={{
                                                            ...styles.competenceItem,
                                                            ...(onCompetenceClick && !readonly ? styles.competenceItemClickable : {})
                                                        }}
                                                        onClick={() => {
                                                            if (onCompetenceClick && !readonly) {
                                                                onCompetenceClick(competence)
                                                            }
                                                        }}
                                                    >
                                                        <div style={styles.competenceContent}>
                                                            <span style={styles.competenceIntitule}>
                                                                {competence.intitule}
                                                            </span>
                                                            {competence.description && (
                                                                <span style={styles.competenceDescription}>
                                                                    {competence.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

const styles = {
    card: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        marginBottom: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    domaineHeader: {
        padding: '16px 20px',
        backgroundColor: '#f5f5f5',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    domaineTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px'
    },
    emoji: {
        fontSize: '24px'
    },
    domaineName: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        flex: 1
    },
    expandIcon: {
        fontSize: '14px',
        color: '#666'
    },
    domaineDescription: {
        margin: '8px 0 0 0',
        fontSize: '13px',
        color: '#666',
        fontStyle: 'italic'
    },
    domaineContent: {
        padding: '16px 20px'
    },
    categorieBlock: {
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
    },
    categorieHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    expandIconSmall: {
        fontSize: '12px',
        color: '#666'
    },
    categorieName: {
        margin: 0,
        fontSize: '15px',
        fontWeight: '600',
        color: '#444',
        flex: 1
    },
    countBadge: {
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
    },
    competencesList: {
        marginTop: '12px',
        paddingLeft: '24px'
    },
    competenceItem: {
        padding: '10px 12px',
        marginBottom: '6px',
        backgroundColor: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: '4px',
        transition: 'all 0.2s'
    },
    competenceItemClickable: {
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: '#2196F3'
        }
    },
    competenceContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    competenceIntitule: {
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.4'
    },
    competenceDescription: {
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: '20px',
        fontSize: '14px'
    },
    emptyTextSmall: {
        textAlign: 'center',
        color: '#999',
        padding: '12px',
        fontSize: '13px'
    }
}
