import { useState, useEffect } from 'react'

/**
 * Composant pour evaluer les competences d'un bilan de formation
 * Affiche une grille avec 3 niveaux : non_acquis, en_cours, acquis
 * Adapte depuis EvaluationGrid.js pour les bilans (sans niveau expert)
 */
export default function BilanEvaluationGrid({
    domaine,
    categories,
    competences,
    evaluations = [],
    onChange,
    domaineComment = '',
    onDomaineCommentChange,
    readonly = false
}) {
    // Etat local des evaluations { competence_id: { statut_fin, commentaire } }
    const [localEvaluations, setLocalEvaluations] = useState({})

    useEffect(() => {
        // Initialiser l'etat local avec les evaluations existantes
        const evalMap = {}
        evaluations.forEach(evaluation => {
            evalMap[evaluation.competence_id] = {
                statut_fin: evaluation.statut_fin,
                commentaire: evaluation.commentaire || ''
            }
        })
        setLocalEvaluations(evalMap)
    }, [evaluations])

    // Filtrer les categories du domaine
    const domaineCategories = categories.filter(cat => cat.domaine_id === domaine.id)

    // Obtenir les competences d'une categorie
    function getCompetencesForCategorie(categorieId) {
        return competences.filter(comp => comp.categorie_id === categorieId)
    }

    // Changer le statut d'une competence
    function handleStatutChange(competenceId, statut) {
        if (readonly) return

        const newEval = {
            ...localEvaluations[competenceId],
            statut_fin: statut
        }

        const updated = {
            ...localEvaluations,
            [competenceId]: newEval
        }

        setLocalEvaluations(updated)

        if (onChange) {
            onChange(updated)
        }
    }

    // Changer le commentaire d'une competence
    function handleCommentaireChange(competenceId, commentaire) {
        if (readonly) return

        const newEval = {
            ...localEvaluations[competenceId],
            commentaire
        }

        const updated = {
            ...localEvaluations,
            [competenceId]: newEval
        }

        setLocalEvaluations(updated)

        if (onChange) {
            onChange(updated)
        }
    }

    const niveaux = [
        { value: 'non_evalue', label: 'Non évalué', color: '#9e9e9e' },
        { value: 'non_acquis', label: 'Non acquis', color: '#f44336' },
        { value: 'en_cours', label: 'En cours', color: '#ff9800' },
        { value: 'acquis', label: 'Acquis', color: '#4caf50' }
    ]

    return (
        <div style={styles.container}>
            {/* Header avec emoji et nom du domaine */}
            <div style={styles.header}>
                <span style={styles.emoji}>{domaine.emoji}</span>
                <h3 style={styles.domaineName}>{domaine.nom}</h3>
            </div>

            {/* Commentaire du domaine */}
            <div style={styles.domaineCommentBlock}>
                <label style={styles.domaineCommentLabel}>Commentaire sur le domaine :</label>
                <textarea
                    value={domaineComment}
                    onChange={(e) => {
                        if (!readonly && onDomaineCommentChange) {
                            onDomaineCommentChange(e.target.value)
                        }
                    }}
                    disabled={readonly}
                    placeholder="Observations generales sur ce domaine..."
                    rows={2}
                    style={{
                        ...styles.domaineCommentTextarea,
                        ...(readonly ? styles.domaineCommentTextareaDisabled : {})
                    }}
                />
            </div>

            {/* Legende des niveaux */}
            <div style={styles.legend}>
                {niveaux.map(niveau => (
                    <div key={niveau.value} style={styles.legendItem}>
                        <span style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: niveau.color,
                            marginRight: '6px'
                        }} />
                        <span style={styles.legendLabel}>{niveau.label}</span>
                    </div>
                ))}
            </div>

            {/* Categories et competences */}
            {domaineCategories.map(categorie => {
                const catCompetences = getCompetencesForCategorie(categorie.id)

                return (
                    <div key={categorie.id} style={styles.categorieBlock}>
                        <h4 style={styles.categorieName}>{categorie.nom}</h4>

                        <div style={styles.competencesTable}>
                            {catCompetences.map(competence => {
                                const evaluation = localEvaluations[competence.id] || {}
                                const statutActuel = evaluation.statut_fin

                                return (
                                    <div key={competence.id} style={styles.competenceRow}>
                                        {/* Intitule de la competence */}
                                        <div style={styles.competenceLabel}>
                                            {competence.intitule}
                                            {competence.description && (
                                                <span style={styles.competenceDescription}>
                                                    {competence.description}
                                                </span>
                                            )}
                                        </div>

                                        {/* Boutons de niveau */}
                                        <div style={styles.niveauxButtons}>
                                            {niveaux.map(niveau => {
                                                const isSelected = statutActuel === niveau.value

                                                return (
                                                    <button
                                                        key={niveau.value}
                                                        onClick={() => handleStatutChange(competence.id, niveau.value)}
                                                        disabled={readonly}
                                                        style={{
                                                            ...styles.niveauButton,
                                                            ...(isSelected ? {
                                                                backgroundColor: niveau.color,
                                                                color: '#fff',
                                                                fontWeight: 'bold'
                                                            } : {}),
                                                            ...(readonly ? styles.niveauButtonDisabled : {})
                                                        }}
                                                        title={niveau.label}
                                                    >
                                                        {niveau.label}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Champ commentaire (optionnel) */}
                                        {statutActuel && (
                                            <div style={styles.commentaireWrapper}>
                                                <input
                                                    type="text"
                                                    placeholder="Commentaire (optionnel)"
                                                    value={evaluation.commentaire || ''}
                                                    onChange={(e) => handleCommentaireChange(competence.id, e.target.value)}
                                                    disabled={readonly}
                                                    style={{
                                                        ...styles.commentaireInput,
                                                        ...(readonly ? styles.commentaireInputDisabled : {})
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
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
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f0f0f0'
    },
    emoji: {
        fontSize: '32px'
    },
    domaineName: {
        margin: 0,
        fontSize: '22px',
        fontWeight: '600',
        color: '#333'
    },
    domaineCommentBlock: {
        marginBottom: '20px'
    },
    domaineCommentLabel: {
        display: 'block',
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#555'
    },
    domaineCommentTextarea: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '13px',
        boxSizing: 'border-box',
        fontFamily: 'Arial',
        resize: 'vertical',
        backgroundColor: '#fafafa'
    },
    domaineCommentTextareaDisabled: {
        backgroundColor: '#f5f5f5',
        cursor: 'not-allowed'
    },
    legend: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        flexWrap: 'wrap'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px'
    },
    legendLabel: {
        color: '#666'
    },
    categorieBlock: {
        marginBottom: '28px'
    },
    categorieName: {
        margin: '0 0 16px 0',
        fontSize: '17px',
        fontWeight: '600',
        color: '#444',
        paddingBottom: '8px',
        borderBottom: '1px solid #e8e8e8'
    },
    competencesTable: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    competenceRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#fafafa',
        borderRadius: '6px',
        border: '1px solid #e8e8e8'
    },
    competenceLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.4'
    },
    competenceDescription: {
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
    },
    niveauxButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    niveauButton: {
        padding: '8px 16px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'all 0.2s',
        minWidth: '48px'
    },
    niveauButtonDisabled: {
        cursor: 'not-allowed',
        opacity: 0.6
    },
    commentaireWrapper: {
        marginTop: '4px'
    },
    commentaireInput: {
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '13px',
        boxSizing: 'border-box'
    },
    commentaireInputDisabled: {
        backgroundColor: '#f5f5f5',
        cursor: 'not-allowed'
    }
}
