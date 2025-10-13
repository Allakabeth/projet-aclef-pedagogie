import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MultipleChoiceEditor from '@/components/QuestionTypes/MultipleChoiceEditor'
import OrderingEditor from '@/components/QuestionTypes/OrderingEditor'
import MatchingEditor from '@/components/QuestionTypes/MatchingEditor'
import NumericEditor from '@/components/QuestionTypes/NumericEditor'

/**
 * Page de détail et modification d'un exercice
 */
export default function DetailExercice() {
    const router = useRouter()
    const { id } = router.query
    const [exercice, setExercice] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState(false)

    const [competences, setCompetences] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [categoriesOutils, setCategoriesOutils] = useState([])

    useEffect(() => {
        if (id) {
            loadData()
        }
    }, [id])

    async function loadData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [exoRes, compRes, domRes, catRes, catOutilsRes] = await Promise.all([
                fetch(`/api/admin/formation/exercices/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/competences', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/domaines', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/formation/categories-outils', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ])

            if (!exoRes.ok) throw new Error('Exercice non trouvé')

            const [exoData, compData, domData, catData, catOutilsData] = await Promise.all([
                exoRes.json(),
                compRes.json(),
                domRes.json(),
                catRes.json(),
                catOutilsRes.json()
            ])

            setExercice(exoData.exercice)
            setCompetences(compData.competences || [])
            setDomaines(domData.domaines || [])
            setCategories(catData.categories || [])
            setCategoriesOutils(catOutilsData.categories || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ ' + err.message)
            router.push('/admin/formation/outils-pedagogiques/exercices')
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            setSaving(true)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/formation/exercices/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(exercice)
            })

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

            const data = await response.json()
            setExercice(data.exercice)
            setEditing(false)
            alert('✅ Exercice modifié avec succès')
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    function getTypeBadge(type) {
        const badges = {
            'qcm': { label: 'QCM', color: '#2196f3' },
            'ordering': { label: 'Remise en ordre', color: '#ff9800' },
            'matching': { label: 'Appariement', color: '#9c27b0' },
            'numeric': { label: 'Numérique', color: '#4caf50' }
        }
        const badge = badges[type] || { label: type, color: '#666' }
        return <span style={{ ...styles.badge, backgroundColor: badge.color }}>{badge.label}</span>
    }

    function getDifficulteBadge(difficulte) {
        const badges = {
            'facile': { label: 'Facile', color: '#4caf50' },
            'moyen': { label: 'Moyen', color: '#ff9800' },
            'difficile': { label: 'Difficile', color: '#f44336' }
        }
        const badge = badges[difficulte] || { label: difficulte, color: '#666' }
        return <span style={{ ...styles.badgeDifficulte, backgroundColor: badge.color }}>{badge.label}</span>
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <p>Chargement...</p>
            </div>
        )
    }

    if (!exercice) {
        return (
            <div style={styles.container}>
                <p>Exercice non trouvé</p>
            </div>
        )
    }

    const competence = competences.find(c => c.id === exercice.competence_id)
    const categorieOutil = categoriesOutils.find(c => c.id === exercice.categorie_id)

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>{exercice.titre}</h1>
                    <div style={styles.badges}>
                        {getTypeBadge(exercice.type)}
                        {getDifficulteBadge(exercice.difficulte)}
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={() => router.push('/admin/formation/outils-pedagogiques/exercices')}
                        style={styles.backButton}
                    >
                        ← Retour
                    </button>
                    {!editing && (
                        <button onClick={() => setEditing(true)} style={styles.editButton}>
                            ✏️ Modifier
                        </button>
                    )}
                </div>
            </div>

            {editing ? (
                <div style={styles.form}>
                    <h2 style={styles.sectionTitle}>📋 Informations générales</h2>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Titre</label>
                        <input
                            type="text"
                            value={exercice.titre}
                            onChange={(e) => setExercice({ ...exercice, titre: e.target.value })}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea
                            value={exercice.description || ''}
                            onChange={(e) => setExercice({ ...exercice, description: e.target.value })}
                            style={styles.textarea}
                            rows={3}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Catégorie thématique</label>
                        <select
                            value={exercice.categorie_id || ''}
                            onChange={(e) => setExercice({ ...exercice, categorie_id: e.target.value || null })}
                            style={styles.select}
                        >
                            <option value="">-- Aucune catégorie --</option>
                            {categoriesOutils.filter(c => c.actif).map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.emoji} {c.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Difficulté</label>
                            <select
                                value={exercice.difficulte}
                                onChange={(e) => setExercice({ ...exercice, difficulte: e.target.value })}
                                style={styles.select}
                            >
                                <option value="facile">Facile</option>
                                <option value="moyen">Moyen</option>
                                <option value="difficile">Difficile</option>
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Compétence</label>
                            <select
                                value={exercice.competence_id}
                                onChange={(e) => setExercice({ ...exercice, competence_id: e.target.value })}
                                style={styles.select}
                            >
                                {competences.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} - {c.intitule}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <h2 style={styles.sectionTitle}>✏️ Contenu de l'exercice</h2>

                    <div style={styles.editorContainer}>
                        {exercice.type === 'qcm' && (
                            <MultipleChoiceEditor
                                question={exercice.contenu}
                                onChange={(newContent) => setExercice({ ...exercice, contenu: newContent })}
                            />
                        )}

                        {exercice.type === 'ordering' && (
                            <OrderingEditor
                                question={exercice.contenu}
                                onChange={(newContent) => setExercice({ ...exercice, contenu: newContent })}
                            />
                        )}

                        {exercice.type === 'matching' && (
                            <MatchingEditor
                                question={exercice.contenu}
                                onChange={(newContent) => setExercice({ ...exercice, contenu: newContent })}
                            />
                        )}

                        {exercice.type === 'numeric' && (
                            <NumericEditor
                                question={exercice.contenu}
                                onChange={(newContent) => setExercice({ ...exercice, contenu: newContent })}
                            />
                        )}
                    </div>

                    <div style={styles.actions}>
                        <button
                            onClick={() => {
                                setEditing(false)
                                loadData() // Recharger les données originales
                            }}
                            style={styles.cancelButton}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={styles.saveButton}
                        >
                            {saving ? 'Enregistrement...' : '✅ Enregistrer'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.viewContainer}>
                    <div style={styles.infoCard}>
                        <h2 style={styles.sectionTitle}>ℹ️ Informations</h2>

                        {exercice.description && (
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Description:</span>
                                <span style={styles.infoValue}>{exercice.description}</span>
                            </div>
                        )}

                        {categorieOutil && (
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Catégorie:</span>
                                <span style={styles.infoValue}>
                                    {categorieOutil.emoji} {categorieOutil.nom}
                                </span>
                            </div>
                        )}

                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Compétence:</span>
                            <span style={styles.infoValue}>
                                {competence ? `${competence.code} - ${competence.intitule}` : 'N/A'}
                            </span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Type:</span>
                            <span>{getTypeBadge(exercice.type)}</span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Difficulté:</span>
                            <span>{getDifficulteBadge(exercice.difficulte)}</span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Créé le:</span>
                            <span style={styles.infoValue}>
                                {new Date(exercice.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    </div>

                    <div style={styles.previewCard}>
                        <h2 style={styles.sectionTitle}>👁️ Aperçu du contenu</h2>

                        {exercice.type === 'qcm' && (
                            <div>
                                <p style={styles.questionText}>{exercice.contenu.question}</p>
                                <div style={styles.optionsList}>
                                    {exercice.contenu.options?.map((opt, idx) => (
                                        <div key={idx} style={{
                                            ...styles.option,
                                            backgroundColor: opt.correct ? '#e8f5e9' : '#fff'
                                        }}>
                                            {opt.correct && '✓ '}{opt.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exercice.type === 'ordering' && (
                            <div>
                                {exercice.contenu.instruction && (
                                    <p style={styles.instructionText}>{exercice.contenu.instruction}</p>
                                )}
                                <div style={styles.itemsList}>
                                    {exercice.contenu.items?.sort((a, b) => a.order - b.order).map((item, idx) => (
                                        <div key={idx} style={styles.item}>
                                            {item.order}. {item.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exercice.type === 'matching' && (
                            <div>
                                {exercice.contenu.instruction && (
                                    <p style={styles.instructionText}>{exercice.contenu.instruction}</p>
                                )}
                                <div style={styles.pairsList}>
                                    {exercice.contenu.pairs?.map((pair, idx) => (
                                        <div key={idx} style={styles.pair}>
                                            <div style={styles.pairLeft}>{pair.left}</div>
                                            <div style={styles.pairArrow}>↔</div>
                                            <div style={styles.pairRight}>{pair.right}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exercice.type === 'numeric' && (
                            <div>
                                <p style={styles.questionText}>{exercice.contenu.question}</p>
                                <div style={styles.numericAnswer}>
                                    <strong>Réponse:</strong> {exercice.contenu.answer}
                                    {exercice.contenu.unit && ` ${exercice.contenu.unit}`}
                                    {exercice.contenu.tolerance > 0 && ` (±${exercice.contenu.tolerance})`}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 12px 0' },
    badges: { display: 'flex', gap: '8px' },
    badge: { padding: '4px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
    badgeDifficulte: { padding: '4px 12px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
    headerActions: { display: 'flex', gap: '12px' },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    editButton: { padding: '10px 20px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    form: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    viewContainer: { display: 'grid', gap: '20px' },
    infoCard: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    previewCard: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #2196f3' },
    infoRow: { display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' },
    infoLabel: { fontWeight: '600', color: '#666', minWidth: '120px' },
    infoValue: { color: '#333' },
    formGroup: { marginBottom: '20px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' },
    editorContainer: { marginBottom: '24px' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    questionText: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#333' },
    instructionText: { fontSize: '14px', marginBottom: '16px', color: '#666', fontStyle: 'italic' },
    optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    option: { padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
    itemsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    item: { padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#f9f9f9' },
    pairsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    pair: { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#f9f9f9' },
    pairLeft: { flex: 1, padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '14px' },
    pairArrow: { fontSize: '18px', color: '#2196f3' },
    pairRight: { flex: 1, padding: '8px', backgroundColor: '#fff3e0', borderRadius: '4px', fontSize: '14px' },
    numericAnswer: { padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '6px', fontSize: '16px' }
}
