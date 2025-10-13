import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const TYPES_EXERCICES = [
    { value: 'qcm', label: 'QCM (Choix multiple)', icon: '☑️' },
    { value: 'vrai_faux', label: 'Vrai/Faux', icon: '✓✗' },
    { value: 'association', label: 'Association terme-définition', icon: '🔗' },
    { value: 'completion', label: 'Texte à compléter', icon: '📝' }
]

const CATEGORIES = [
    'Signalisation',
    'Panneaux',
    'Marquage au sol',
    'Feux de circulation',
    'Véhicules',
    'Équipements',
    'Règles de circulation',
    'Priorités',
    'Stationnement',
    'Vitesse',
    'Documents',
    'Sanctions',
    'Sécurité routière',
    'Environnement',
    'Autre'
]

export default function ExerciceCodeRoute() {
    const router = useRouter()
    const [exercices, setExercices] = useState([])
    const [loading, setLoading] = useState(true)
    const [categorieFilter, setCategorieFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')

    useEffect(() => {
        loadExercices()
    }, [])

    async function loadExercices() {
        try {
            setLoading(true)
            const token = localStorage.getItem('quiz-admin-token')
            if (!token) {
                router.push('/admin/login')
                return
            }

            const params = new URLSearchParams()
            if (categorieFilter) params.append('categorie', categorieFilter)
            if (typeFilter) params.append('type', typeFilter)

            const response = await fetch(`/api/admin/code-route/exercices?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors du chargement')

            const data = await response.json()
            setExercices(data.exercices || [])
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id) {
        if (!confirm('Confirmer la suppression ?')) return

        try {
            const token = localStorage.getItem('quiz-admin-token')

            const response = await fetch(`/api/admin/code-route/exercices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors de la suppression')

            alert('✅ Exercice supprimé avec succès')
            loadExercices()
        } catch (err) {
            console.error('Erreur:', err)
            alert('❌ Erreur: ' + err.message)
        }
    }

    const getTypeInfo = (type) => {
        return TYPES_EXERCICES.find(t => t.value === type) || { label: type, icon: '📝' }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>✏️ Exercices Code de la Route</h1>
                <button onClick={() => router.push('/admin/code-route')} style={styles.backButton}>
                    ← Retour
                </button>
            </div>

            <div style={styles.toolbar}>
                <select
                    value={categorieFilter}
                    onChange={(e) => setCategorieFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Toutes les catégories</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Tous les types</option>
                    {TYPES_EXERCICES.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                        </option>
                    ))}
                </select>

                <button onClick={loadExercices} style={styles.refreshButton}>
                    🔄 Actualiser
                </button>

                <button onClick={() => router.push('/admin/code-route/exercice/nouveau')} style={styles.addButton}>
                    ➕ Nouvel exercice
                </button>
            </div>

            {loading ? (
                <p style={styles.loading}>Chargement...</p>
            ) : (
                <div style={styles.content}>
                    <div style={styles.grid}>
                        {exercices.map(exercice => {
                            const typeInfo = getTypeInfo(exercice.type)
                            return (
                                <div key={exercice.id} style={styles.card}>
                                    <div style={styles.cardHeader}>
                                        <span style={styles.cardType}>{typeInfo.icon} {typeInfo.label}</span>
                                        <span style={styles.cardCategorie}>{exercice.categorie}</span>
                                    </div>
                                    <h3 style={styles.cardTitle}>{exercice.titre}</h3>
                                    {exercice.description && (
                                        <p style={styles.cardDescription}>{exercice.description}</p>
                                    )}
                                    <div style={styles.cardActions}>
                                        <button
                                            onClick={() => router.push(`/admin/code-route/exercice/${exercice.id}`)}
                                            style={styles.editButton}
                                        >
                                            ✏️ Modifier
                                        </button>
                                        <button
                                            onClick={() => handleDelete(exercice.id)}
                                            style={styles.deleteButton}
                                        >
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {exercices.length === 0 && (
                        <div style={styles.empty}>
                            <div style={styles.emptyIcon}>📂</div>
                            <p style={styles.emptyText}>Aucun exercice trouvé</p>
                            <button
                                onClick={() => router.push('/admin/code-route/exercice/nouveau')}
                                style={styles.addButton}
                            >
                                ➕ Créer le premier exercice
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const styles = {
    container: { padding: '20px', fontFamily: 'Arial', maxWidth: '1400px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: 0 },
    backButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
    select: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
    refreshButton: { padding: '10px 20px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    addButton: { padding: '10px 20px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    loading: { textAlign: 'center', color: '#666', padding: '40px' },
    content: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    card: { backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '20px', border: '1px solid #e0e0e0' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
    cardType: { fontSize: '13px', backgroundColor: '#2196f3', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' },
    cardCategorie: { fontSize: '12px', color: '#666', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #ddd' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#333', margin: '0 0 8px 0' },
    cardDescription: { fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.5' },
    cardActions: { display: 'flex', gap: '8px' },
    editButton: { flex: 1, padding: '10px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    deleteButton: { flex: 1, padding: '10px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
    empty: { textAlign: 'center', padding: '80px 20px' },
    emptyIcon: { fontSize: '64px', marginBottom: '16px' },
    emptyText: { fontSize: '16px', color: '#999', marginBottom: '24px' }
}
