import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MultipleChoiceEditor from '@/components/QuestionTypes/MultipleChoiceEditor'
import OrderingEditor from '@/components/QuestionTypes/OrderingEditor'
import MatchingEditor from '@/components/QuestionTypes/MatchingEditor'
import NumericEditor from '@/components/QuestionTypes/NumericEditor'

/**
 * Page de création d'un nouvel exercice
 * Réutilise les composants quiz existants pour l'édition du contenu
 */
export default function NouvelExercice() {
    const router = useRouter()
    const [step, setStep] = useState(1) // 1: Info de base, 2: Contenu
    const [loading, setLoading] = useState(false)
    const [competences, setCompetences] = useState([])
    const [domaines, setDomaines] = useState([])
    const [categories, setCategories] = useState([])
    const [categoriesOutils, setCategoriesOutils] = useState([])

    // Filtres pour la sélection de compétence
    const [domaineFilter, setDomaineFilter] = useState('')
    const [categorieFilter, setCategorieFilter] = useState('')

    // Données du formulaire
    const [formData, setFormData] = useState({
        competence_id: '',
        categorie_id: '', // Catégorie d'outils pédagogiques
        type: 'qcm',
        titre: '',
        description: '',
        difficulte: 'moyen',
        contenu: {}
    })

    useEffect(() => {
        loadReferentiel()
    }, [])

    useEffect(() => {
        // Réinitialiser le contenu quand le type change
        setFormData(prev => ({ ...prev, contenu: getDefaultContenu(prev.type) }))
    }, [formData.type])

    async function loadReferentiel() {
        try {
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const [compRes, domRes, catRes, catOutilsRes] = await Promise.all([
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

            const [compData, domData, catData, catOutilsData] = await Promise.all([
                compRes.json(),
                domRes.json(),
                catRes.json(),
                catOutilsRes.json()
            ])

            setCompetences(compData.competences || [])
            setDomaines(domData.domaines || [])
            setCategories(catData.categories || [])
            setCategoriesOutils(catOutilsData.categories || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur lors du chargement du référentiel')
        }
    }

    function getDefaultContenu(type) {
        switch (type) {
            case 'qcm':
                return {
                    question: '',
                    options: [
                        { text: '', correct: false },
                        { text: '', correct: false }
                    ]
                }
            case 'ordering':
                return {
                    instruction: '',
                    items: [
                        { text: '', order: 1 },
                        { text: '', order: 2 }
                    ]
                }
            case 'matching':
                return {
                    instruction: '',
                    pairs: [
                        { left: '', right: '' },
                        { left: '', right: '' }
                    ]
                }
            case 'numeric':
                return {
                    question: '',
                    answer: 0,
                    tolerance: 0,
                    unit: ''
                }
            default:
                return {}
        }
    }

    function handleNext() {
        if (!formData.titre.trim()) {
            alert('Le titre est requis')
            return
        }
        if (!formData.competence_id) {
            alert('Veuillez sélectionner une compétence')
            return
        }
        setStep(2)
    }

    async function handleSave() {
        if (!validateContenu()) {
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch('/api/admin/formation/exercices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la création')
            }

            const data = await response.json()
            alert('✅ Exercice créé avec succès')
            router.push(`/admin/formation/outils-pedagogiques/exercices/${data.exercice.id}`)
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    function validateContenu() {
        const { type, contenu } = formData

        switch (type) {
            case 'qcm':
                if (!contenu.question?.trim()) {
                    alert('La question est requise')
                    return false
                }
                if (!contenu.options || contenu.options.length < 2) {
                    alert('Au moins 2 options sont requises')
                    return false
                }
                if (!contenu.options.some(opt => opt.correct)) {
                    alert('Au moins une option doit être correcte')
                    return false
                }
                return true

            case 'ordering':
                if (!contenu.items || contenu.items.length < 2) {
                    alert('Au moins 2 items sont requis')
                    return false
                }
                return true

            case 'matching':
                if (!contenu.pairs || contenu.pairs.length < 2) {
                    alert('Au moins 2 paires sont requises')
                    return false
                }
                return true

            case 'numeric':
                if (!contenu.question?.trim()) {
                    alert('La question est requise')
                    return false
                }
                if (contenu.answer === undefined || contenu.answer === null) {
                    alert('La réponse est requise')
                    return false
                }
                return true

            default:
                return true
        }
    }

    // Filtrer les compétences selon les filtres
    const competencesFiltered = competences.filter(comp => {
        if (categorieFilter && comp.categorie_id !== categorieFilter) return false
        if (domaineFilter && !categorieFilter) {
            const categorie = categories.find(c => c.id === comp.categorie_id)
            if (!categorie || categorie.domaine_id !== domaineFilter) return false
        }
        return true
    })

    // Filtrer les catégories selon le domaine
    const categoriesFiltered = domaineFilter
        ? categories.filter(c => c.domaine_id === domaineFilter)
        : categories

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>➕ Nouvel Exercice</h1>
                <p style={styles.subtitle}>Étape {step}/2</p>
            </div>

            {step === 1 ? (
                <div style={styles.form}>
                    <h2 style={styles.sectionTitle}>📋 Informations générales</h2>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Titre de l'exercice *</label>
                        <input
                            type="text"
                            value={formData.titre}
                            onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                            placeholder="Ex: Les homophones a/à"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Description de l'exercice..."
                            style={styles.textarea}
                            rows={3}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Catégorie thématique</label>
                        <select
                            value={formData.categorie_id}
                            onChange={(e) => setFormData({ ...formData, categorie_id: e.target.value })}
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
                            <label style={styles.label}>Type d'exercice *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                style={styles.select}
                            >
                                <option value="qcm">QCM (Choix multiple)</option>
                                <option value="ordering">Remise en ordre</option>
                                <option value="matching">Appariement</option>
                                <option value="numeric">Numérique</option>
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Difficulté *</label>
                            <select
                                value={formData.difficulte}
                                onChange={(e) => setFormData({ ...formData, difficulte: e.target.value })}
                                style={styles.select}
                            >
                                <option value="facile">Facile</option>
                                <option value="moyen">Moyen</option>
                                <option value="difficile">Difficile</option>
                            </select>
                        </div>
                    </div>

                    <h2 style={styles.sectionTitle}>🎯 Compétence associée</h2>

                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Filtrer par domaine</label>
                            <select
                                value={domaineFilter}
                                onChange={(e) => {
                                    setDomaineFilter(e.target.value)
                                    setCategorieFilter('')
                                }}
                                style={styles.select}
                            >
                                <option value="">Tous les domaines</option>
                                {domaines.filter(d => d.actif).map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.emoji} {d.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Filtrer par catégorie</label>
                            <select
                                value={categorieFilter}
                                onChange={(e) => setCategorieFilter(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">Toutes les catégories</option>
                                {categoriesFiltered.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Compétence *</label>
                        <select
                            value={formData.competence_id}
                            onChange={(e) => setFormData({ ...formData, competence_id: e.target.value })}
                            style={styles.select}
                        >
                            <option value="">-- Sélectionner une compétence --</option>
                            {competencesFiltered.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.code} - {c.intitule}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.actions}>
                        <button
                            onClick={() => router.push('/admin/formation/outils-pedagogiques/exercices')}
                            style={styles.cancelButton}
                        >
                            Annuler
                        </button>
                        <button onClick={handleNext} style={styles.nextButton}>
                            Suivant →
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.form}>
                    <h2 style={styles.sectionTitle}>✏️ Contenu de l'exercice</h2>

                    <div style={styles.editorContainer}>
                        {formData.type === 'qcm' && (
                            <MultipleChoiceEditor
                                question={formData.contenu}
                                onChange={(newContent) => setFormData({ ...formData, contenu: newContent })}
                            />
                        )}

                        {formData.type === 'ordering' && (
                            <OrderingEditor
                                question={formData.contenu}
                                onChange={(newContent) => setFormData({ ...formData, contenu: newContent })}
                            />
                        )}

                        {formData.type === 'matching' && (
                            <MatchingEditor
                                question={formData.contenu}
                                onChange={(newContent) => setFormData({ ...formData, contenu: newContent })}
                            />
                        )}

                        {formData.type === 'numeric' && (
                            <NumericEditor
                                question={formData.contenu}
                                onChange={(newContent) => setFormData({ ...formData, contenu: newContent })}
                            />
                        )}
                    </div>

                    <div style={styles.actions}>
                        <button onClick={() => setStep(1)} style={styles.backButton}>
                            ← Précédent
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={styles.saveButton}
                        >
                            {loading ? 'Création...' : '✅ Créer l\'exercice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial' },
    header: { marginBottom: '32px', textAlign: 'center' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#666', margin: 0 },
    form: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #2196f3' },
    formGroup: { marginBottom: '20px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Arial', resize: 'vertical' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' },
    editorContainer: { marginBottom: '24px' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #f0f0f0' },
    cancelButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    backButton: { padding: '12px 24px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    nextButton: { padding: '12px 24px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    saveButton: { padding: '12px 24px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
}
