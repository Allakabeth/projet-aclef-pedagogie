import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Page apprenant : Réaliser un exercice
 * Affiche l'exercice selon son type et permet de soumettre les réponses
 */
export default function RealiserExercice() {
    const router = useRouter()
    const { id } = router.query

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [assignation, setAssignation] = useState(null)
    const [exercice, setExercice] = useState(null)
    const [reponses, setReponses] = useState(null)
    const [resultat, setResultat] = useState(null)

    useEffect(() => {
        if (id) {
            loadExercice()
        }
    }, [id])

    async function loadExercice() {
        try {
            setLoading(true)
            const token = localStorage.getItem('auth-token')
            if (!token) {
                router.push('/login')
                return
            }

            const response = await fetch(`/api/exercices/assignation/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error('Erreur lors du chargement')
            }

            const data = await response.json()
            setAssignation(data.assignation)
            setExercice(data.assignation.exercice)

            // Initialiser les réponses selon le type
            initReponses(data.assignation.exercice)

            // Si déjà terminé, charger les réponses existantes
            if (data.assignation.statut === 'termine' && data.assignation.reponses) {
                setReponses(data.assignation.reponses)
                setResultat({
                    score: data.assignation.score,
                    reponses: data.assignation.reponses
                })
            }
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function initReponses(exercice) {
        if (!exercice) return

        switch (exercice.type) {
            case 'qcm':
                setReponses({ selectedOptions: [] })
                break
            case 'ordering':
                setReponses({ orderedItems: exercice.contenu.items?.map((item, idx) => idx) || [] })
                break
            case 'matching':
                setReponses({ pairs: {} })
                break
            case 'numeric':
                setReponses({ answer: '' })
                break
        }
    }

    async function handleSubmit() {
        if (!reponses) {
            alert('Veuillez répondre à l\'exercice')
            return
        }

        try {
            setSubmitting(true)
            const token = localStorage.getItem('auth-token')

            const response = await fetch('/api/exercices/soumettre', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    assignation_id: id,
                    reponses
                })
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la soumission')
            }

            const data = await response.json()
            setResultat(data)
            setAssignation({ ...assignation, statut: 'termine', score: data.score })
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div style={styles.container}><p>Chargement...</p></div>
    }

    if (!exercice) {
        return <div style={styles.container}><p>Exercice non trouvé</p></div>
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => router.push('/exercices/mes-exercices')} style={styles.backButton}>
                    ← Retour à mes exercices
                </button>
            </div>

            <div style={styles.exerciceContainer}>
                <div style={styles.exerciceHeader}>
                    <h1 style={styles.title}>{exercice.titre}</h1>
                    <div style={styles.badges}>
                        {getTypeBadge(exercice.type)}
                        {getDifficultyBadge(exercice.difficulte)}
                    </div>
                </div>

                {exercice.description && (
                    <p style={styles.description}>{exercice.description}</p>
                )}

                {assignation.statut === 'termine' && resultat ? (
                    <ResultatView resultat={resultat} exercice={exercice} />
                ) : (
                    <>
                        {exercice.type === 'qcm' && (
                            <QCMPlayer
                                exercice={exercice}
                                reponses={reponses}
                                setReponses={setReponses}
                            />
                        )}

                        {exercice.type === 'ordering' && (
                            <OrderingPlayer
                                exercice={exercice}
                                reponses={reponses}
                                setReponses={setReponses}
                            />
                        )}

                        {exercice.type === 'matching' && (
                            <MatchingPlayer
                                exercice={exercice}
                                reponses={reponses}
                                setReponses={setReponses}
                            />
                        )}

                        {exercice.type === 'numeric' && (
                            <NumericPlayer
                                exercice={exercice}
                                reponses={reponses}
                                setReponses={setReponses}
                            />
                        )}

                        <div style={styles.actions}>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={styles.submitButton}
                            >
                                {submitting ? 'Envoi en cours...' : '✅ Valider mes réponses'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

/**
 * Composant QCM Player
 */
function QCMPlayer({ exercice, reponses, setReponses }) {
    function toggleOption(index) {
        const selected = reponses.selectedOptions || []
        if (selected.includes(index)) {
            setReponses({ selectedOptions: selected.filter(i => i !== index) })
        } else {
            setReponses({ selectedOptions: [...selected, index] })
        }
    }

    return (
        <div style={styles.questionContainer}>
            <h3 style={styles.questionText}>{exercice.contenu.question}</h3>
            <div style={styles.optionsList}>
                {exercice.contenu.options?.map((option, idx) => (
                    <div
                        key={idx}
                        onClick={() => toggleOption(idx)}
                        style={{
                            ...styles.option,
                            backgroundColor: reponses.selectedOptions?.includes(idx)
                                ? '#e3f2fd'
                                : '#fff'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={reponses.selectedOptions?.includes(idx) || false}
                            readOnly
                        />
                        <span>{option.text}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Composant Ordering Player
 */
function OrderingPlayer({ exercice, reponses, setReponses }) {
    function moveUp(index) {
        if (index === 0) return
        const newOrder = [...reponses.orderedItems]
        const temp = newOrder[index]
        newOrder[index] = newOrder[index - 1]
        newOrder[index - 1] = temp
        setReponses({ orderedItems: newOrder })
    }

    function moveDown(index) {
        if (index === reponses.orderedItems.length - 1) return
        const newOrder = [...reponses.orderedItems]
        const temp = newOrder[index]
        newOrder[index] = newOrder[index + 1]
        newOrder[index + 1] = temp
        setReponses({ orderedItems: newOrder })
    }

    const items = exercice.contenu.items || []

    return (
        <div style={styles.questionContainer}>
            <h3 style={styles.questionText}>{exercice.contenu.instruction || 'Remettez les éléments dans le bon ordre :'}</h3>
            <div style={styles.orderingList}>
                {reponses.orderedItems?.map((itemIndex, displayIndex) => (
                    <div key={displayIndex} style={styles.orderingItem}>
                        <span style={styles.orderingNumber}>{displayIndex + 1}</span>
                        <span style={styles.orderingText}>{items[itemIndex]?.text}</span>
                        <div style={styles.orderingActions}>
                            <button
                                onClick={() => moveUp(displayIndex)}
                                disabled={displayIndex === 0}
                                style={styles.orderingButton}
                            >
                                ↑
                            </button>
                            <button
                                onClick={() => moveDown(displayIndex)}
                                disabled={displayIndex === reponses.orderedItems.length - 1}
                                style={styles.orderingButton}
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Composant Matching Player
 */
function MatchingPlayer({ exercice, reponses, setReponses }) {
    const pairs = exercice.contenu.pairs || []
    const leftItems = pairs.map(p => p.left)
    const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5)

    function handleMatch(leftIndex, rightValue) {
        setReponses({
            pairs: {
                ...reponses.pairs,
                [leftIndex]: rightValue
            }
        })
    }

    return (
        <div style={styles.questionContainer}>
            <h3 style={styles.questionText}>{exercice.contenu.instruction || 'Associez les éléments :'}</h3>
            <div style={styles.matchingContainer}>
                {leftItems.map((left, idx) => (
                    <div key={idx} style={styles.matchingRow}>
                        <div style={styles.matchingLeft}>{left}</div>
                        <select
                            value={reponses.pairs?.[idx] || ''}
                            onChange={(e) => handleMatch(idx, e.target.value)}
                            style={styles.matchingSelect}
                        >
                            <option value="">-- Choisir --</option>
                            {rightItems.map((right, ridx) => (
                                <option key={ridx} value={right}>{right}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Composant Numeric Player
 */
function NumericPlayer({ exercice, reponses, setReponses }) {
    return (
        <div style={styles.questionContainer}>
            <h3 style={styles.questionText}>{exercice.contenu.question}</h3>
            <div style={styles.numericInput}>
                <input
                    type="number"
                    value={reponses.answer}
                    onChange={(e) => setReponses({ answer: e.target.value })}
                    placeholder="Entrez votre réponse"
                    style={styles.input}
                />
                {exercice.contenu.unit && (
                    <span style={styles.unit}>{exercice.contenu.unit}</span>
                )}
            </div>
        </div>
    )
}

/**
 * Composant ResultatView
 */
function ResultatView({ resultat, exercice }) {
    return (
        <div style={styles.resultatContainer}>
            <div style={styles.scoreCard}>
                <h2 style={styles.scoreTitle}>Votre score</h2>
                <div style={styles.scoreValue}>{resultat.score}%</div>
                {resultat.score >= 80 && <p style={styles.scoreMessage}>🎉 Excellent travail !</p>}
                {resultat.score >= 50 && resultat.score < 80 && <p style={styles.scoreMessage}>👍 Bon travail !</p>}
                {resultat.score < 50 && <p style={styles.scoreMessage}>💪 Continuez vos efforts !</p>}
            </div>

            {exercice.type === 'qcm' && resultat.details && (
                <div style={styles.detailsContainer}>
                    <h3>Détails des réponses</h3>
                    {exercice.contenu.options?.map((option, idx) => {
                        const wasSelected = resultat.reponses.selectedOptions?.includes(idx)
                        const isCorrect = option.correct
                        let status = ''
                        let color = '#fff'

                        if (wasSelected && isCorrect) {
                            status = '✅ Correct'
                            color = '#e8f5e9'
                        } else if (wasSelected && !isCorrect) {
                            status = '❌ Incorrect'
                            color = '#ffebee'
                        } else if (!wasSelected && isCorrect) {
                            status = '💡 Réponse attendue'
                            color = '#fff3e0'
                        }

                        return (
                            <div key={idx} style={{ ...styles.resultOption, backgroundColor: color }}>
                                <span>{option.text}</span>
                                {status && <span style={styles.resultStatus}>{status}</span>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function getTypeBadge(type) {
    const badges = {
        'qcm': { label: 'QCM', color: '#2196f3' },
        'ordering': { label: 'Remise en ordre', color: '#ff9800' },
        'matching': { label: 'Appariement', color: '#9c27b0' },
        'numeric': { label: 'Numérique', color: '#4caf50' }
    }
    const badge = badges[type] || { label: type, color: '#999' }
    return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
}

function getDifficultyBadge(difficulte) {
    const badges = {
        'facile': { label: 'Facile', color: '#4caf50' },
        'moyen': { label: 'Moyen', color: '#ff9800' },
        'difficile': { label: 'Difficile', color: '#f44336' }
    }
    const badge = badges[difficulte] || { label: difficulte, color: '#999' }
    return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
}

const styles = {
    container: { padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial' },
    header: { marginBottom: '24px' },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    exerciceContainer: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    exerciceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0, flex: 1 },
    badges: { display: 'flex', gap: '8px' },
    badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap' },
    description: { fontSize: '14px', color: '#666', marginBottom: '24px', lineHeight: '1.5' },
    questionContainer: { marginBottom: '32px' },
    questionText: { fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '20px' },
    optionsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    option: { padding: '16px', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' },
    orderingList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    orderingItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' },
    orderingNumber: { fontWeight: 'bold', fontSize: '18px', color: '#2196f3', minWidth: '30px' },
    orderingText: { flex: 1, fontSize: '16px' },
    orderingActions: { display: 'flex', gap: '8px' },
    orderingButton: { padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    matchingContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
    matchingRow: { display: 'flex', alignItems: 'center', gap: '16px' },
    matchingLeft: { flex: 1, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontWeight: '600' },
    matchingSelect: { flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    numericInput: { display: 'flex', alignItems: 'center', gap: '12px' },
    input: { flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' },
    unit: { fontSize: '16px', fontWeight: '600', color: '#666' },
    actions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #f0f0f0' },
    submitButton: { padding: '14px 32px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' },
    resultatContainer: { marginTop: '24px' },
    scoreCard: { textAlign: 'center', padding: '32px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '24px' },
    scoreTitle: { fontSize: '20px', color: '#666', margin: '0 0 16px 0' },
    scoreValue: { fontSize: '48px', fontWeight: 'bold', color: '#2196f3', margin: '0 0 16px 0' },
    scoreMessage: { fontSize: '18px', color: '#333', margin: 0 },
    detailsContainer: { padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    resultOption: { padding: '12px', marginBottom: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    resultStatus: { fontWeight: '600', fontSize: '14px' }
}
