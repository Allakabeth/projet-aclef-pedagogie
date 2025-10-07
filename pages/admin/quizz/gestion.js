import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function GestionQuizzes() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [saving, setSaving] = useState(false)
  const [apprenants, setApprenants] = useState([])
  const [loadingApprenants, setLoadingApprenants] = useState(false)
  const [selectedApprenants, setSelectedApprenants] = useState([])
  const [currentAssignments, setCurrentAssignments] = useState([])

  // États pour les filtres
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState('tous')
  const [filterApprenant, setFilterApprenant] = useState('tous')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')

  const router = useRouter()

  useEffect(() => {
    // Vérifier l'authentification admin
    const token = localStorage.getItem('quiz-admin-token')
    const userData = localStorage.getItem('quiz-admin-user')

    if (!token || !userData) {
      router.push('/aclef-pedagogie-admin')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUser(user)

      if (user.role !== 'admin' && user.role !== 'salarié') {
        alert('Accès refusé. Cette page est réservée aux administrateurs et salariés.')
        router.push('/aclef-pedagogie-admin')
        return
      }
    } catch (error) {
      console.error('Erreur parsing user data:', error)
      router.push('/aclef-pedagogie-admin')
      return
    }

    setIsLoading(false)
    loadQuizzes()
    loadApprenants() // Charger les apprenants pour le filtre
  }, [router])

  const loadQuizzes = async () => {
    setLoadingQuizzes(true)
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/quiz/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      setQuizzes(data.quizzes)
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const handleDuplicate = async (quiz) => {
    if (!confirm(`Dupliquer le quiz "${quiz.title}" ?`)) {
      return
    }

    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')
      const user = JSON.parse(userData)

      const response = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          title: `${quiz.title} - Copie`,
          description: quiz.description ? `${quiz.description} (copie)` : null,
          quizType: quiz.quizData?.type || quiz.quizData?.questions?.[0]?.type,
          questions: quiz.quizData?.questions || [],
          categoryId: quiz.categoryId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la duplication')
      }

      alert('✅ Quiz dupliqué avec succès')
      loadQuizzes()
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const handleDelete = (quiz) => {
    setSelectedQuiz(quiz)
    setShowDeleteModal(true)
  }

  const handleAssign = async (quiz) => {
    setSelectedQuiz(quiz)
    setSelectedApprenants([])
    setShowAssignModal(true)

    // Charger la liste des apprenants
    await loadApprenants()

    // Charger les attributions actuelles pour ce quiz
    await loadCurrentAssignments(quiz.id)
  }

  const loadApprenants = async () => {
    setLoadingApprenants(true)
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/apprenants/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      setApprenants(data.apprenants)
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setLoadingApprenants(false)
    }
  }

  const loadCurrentAssignments = async (quizId) => {
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch(`/api/quiz/assignments?quizId=${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        }
      })

      if (response.ok) {
        const data = await response.json()
        const assignedIds = data.assignments?.map(a => a.user_id) || []
        setSelectedApprenants(assignedIds)
        setCurrentAssignments(assignedIds)
      }
    } catch (error) {
      console.error('Erreur chargement attributions:', error)
    }
  }

  const toggleApprenant = (apprenantId) => {
    setSelectedApprenants(prev => {
      if (prev.includes(apprenantId)) {
        return prev.filter(id => id !== apprenantId)
      } else {
        return [...prev, apprenantId]
      }
    })
  }

  const selectAll = () => {
    setSelectedApprenants(apprenants.map(a => a.id))
  }

  const selectNone = () => {
    setSelectedApprenants([])
  }

  const confirmAssign = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/quiz/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          quizId: selectedQuiz.id,
          apprenantIds: selectedApprenants
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'attribution')
      }

      alert('✅ Attribution enregistrée avec succès')
      setShowAssignModal(false)
      loadQuizzes()
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }


  const confirmDelete = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/quiz/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          quizId: selectedQuiz.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      alert('✅ Quiz supprimé avec succès')
      setShowDeleteModal(false)
      loadQuizzes()
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const getQuizTypeLabel = (type) => {
    const types = {
      'qcm': '🔘 QCM',
      'multiple': '☑️ Choix multiples',
      'truefalse': '✅❌ Vrai/Faux',
      'numeric': '🔢 Numérique',
      'text': '📝 Texte libre',
      'matching': '🔗 Association',
      'ordering': '🔄 Remise en ordre'
    }
    return types[type] || type
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fonction de filtrage
  const getFilteredQuizzes = () => {
    return quizzes.filter(quiz => {
      // Filtre par titre
      if (searchText && !quiz.title.toLowerCase().includes(searchText.toLowerCase())) {
        return false
      }

      // Filtre par type
      if (filterType !== 'tous' && quiz.type !== filterType) {
        return false
      }

      // Filtre par apprenant
      if (filterApprenant !== 'tous') {
        // Vérifier si le quiz est assigné à cet apprenant
        if (!quiz.assignedApprenants || !quiz.assignedApprenants.includes(filterApprenant)) {
          return false
        }
      }

      // Filtre par date de début
      if (filterDateDebut) {
        const quizDate = new Date(quiz.createdAt)
        const dateDebut = new Date(filterDateDebut)
        if (quizDate < dateDebut) {
          return false
        }
      }

      // Filtre par date de fin
      if (filterDateFin) {
        const quizDate = new Date(quiz.createdAt)
        const dateFin = new Date(filterDateFin)
        dateFin.setHours(23, 59, 59, 999) // Fin de journée
        if (quizDate > dateFin) {
          return false
        }
      }

      return true
    })
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchText('')
    setFilterType('tous')
    setFilterApprenant('tous')
    setFilterDateDebut('')
    setFilterDateFin('')
  }

  const filteredQuizzes = getFilteredQuizzes()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* En-tête */}
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 'bold',
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          📋 Gestion des Quiz
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>
          {filteredQuizzes.length} quiz affiché{filteredQuizzes.length > 1 ? 's' : ''} sur {quizzes.length}
        </p>

        {/* Filtres */}
        <div style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
            gap: '15px',
            alignItems: 'end'
          }}>
            {/* Recherche par titre */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px', color: '#374151' }}>
                🔍 Rechercher
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Titre du quiz..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Filtre par type */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px', color: '#374151' }}>
                📋 Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="tous">Tous les types</option>
                <option value="matching">🔗 Association</option>
                <option value="qcm">🔘 QCM</option>
                <option value="multiple">☑️ Choix multiples</option>
                <option value="truefalse">✅❌ Vrai/Faux</option>
                <option value="numeric">🔢 Numérique</option>
                <option value="text">📝 Texte libre</option>
                <option value="ordering">🔄 Remise en ordre</option>
              </select>
            </div>

            {/* Filtre par apprenant */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px', color: '#374151' }}>
                👤 Apprenant
              </label>
              <select
                value={filterApprenant}
                onChange={(e) => setFilterApprenant(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="tous">Tous</option>
                {apprenants.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.prenom} {a.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Date de début */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px', color: '#374151' }}>
                📅 Du
              </label>
              <input
                type="date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Date de fin */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px', color: '#374151' }}>
                📅 Au
              </label>
              <input
                type="date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Bouton réinitialiser */}
            <div>
              <button
                onClick={resetFilters}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des quiz */}
        {loadingQuizzes ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Chargement des quiz...
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '2px dashed #e5e7eb'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>
              {quizzes.length === 0 ? 'Aucun quiz créé' : 'Aucun quiz ne correspond aux filtres'}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              {quizzes.length === 0
                ? 'Commencez par créer votre premier quiz'
                : 'Essayez de modifier les critères de recherche'
              }
            </p>
            {quizzes.length === 0 ? (
              <button
                onClick={() => router.push('/admin/quizz/nouveau')}
                style={{
                  padding: '12px 24px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ➕ Créer un quiz
              </button>
            ) : (
              <button
                onClick={resetFilters}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                🔄 Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            {/* En-têtes du tableau */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 100px 120px 150px 100px 300px',
              gap: '15px',
              padding: '15px 20px',
              background: '#f9fafb',
              borderBottom: '2px solid #e5e7eb',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <div>Titre</div>
              <div>Type</div>
              <div style={{ textAlign: 'center' }}>Questions</div>
              <div style={{ textAlign: 'center' }}>Apprenants</div>
              <div>Date création</div>
              <div style={{ textAlign: 'center' }}>Statut</div>
              <div style={{ textAlign: 'center' }}>Actions</div>
            </div>

            {/* Lignes du tableau */}
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 100px 120px 150px 100px 300px',
                  gap: '15px',
                  padding: '20px',
                  borderBottom: '1px solid #e5e7eb',
                  alignItems: 'center',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                {/* Titre */}
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                    {quiz.title}
                  </div>
                  {quiz.description && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {quiz.description.substring(0, 60)}
                      {quiz.description.length > 60 ? '...' : ''}
                    </div>
                  )}
                </div>

                {/* Type */}
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  {getQuizTypeLabel(quiz.type)}
                </div>

                {/* Nombre de questions */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {quiz.questionsCount}
                </div>

                {/* Nombre d'apprenants */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: quiz.assignedCount > 0 ? '#dbeafe' : '#f3f4f6',
                    color: quiz.assignedCount > 0 ? '#1e40af' : '#6b7280',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {quiz.assignedCount} 👥
                  </span>
                </div>

                {/* Date */}
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(quiz.createdAt)}
                </div>

                {/* Statut */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: quiz.isActive ? '#d1fae5' : '#fee2e2',
                    color: quiz.isActive ? '#065f46' : '#991b1b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {quiz.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      // Le type est déjà détecté par l'API
                      if (quiz.type === 'matching') {
                        router.push(`/admin/quizz/modifier-matching?id=${quiz.id}`)
                      } else if (quiz.type === 'ordering') {
                        router.push(`/admin/quizz/modifier-ordering?id=${quiz.id}`)
                      } else {
                        alert('⚠️ Modification non disponible pour ce type de quiz pour le moment')
                      }
                    }}
                    title="Modifier le contenu du quiz"
                    style={{
                      padding: '8px 12px',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    📝
                  </button>

                  <button
                    onClick={() => handleDuplicate(quiz)}
                    title="Dupliquer le quiz"
                    style={{
                      padding: '8px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    📄
                  </button>

                  <button
                    onClick={() => handleAssign(quiz)}
                    title="Attribuer aux apprenants"
                    style={{
                      padding: '8px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    👥
                  </button>

                  <button
                    onClick={() => handleDelete(quiz)}
                    title="Supprimer"
                    style={{
                      padding: '8px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Boutons navigation */}
        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/admin/quizz/nouveau')}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ➕ Nouveau quiz
          </button>

          <button
            onClick={() => router.push('/admin/quizz')}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ← Retour
          </button>
        </div>
      </div>


      {/* Modal Supprimer */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, color: '#ef4444' }}>🗑️ Supprimer le quiz</h2>
            <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6' }}>
              Êtes-vous sûr de vouloir supprimer le quiz <strong>"{selectedQuiz?.title}"</strong> ?
            </p>
            <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '15px' }}>
              ⚠️ Cette action est irréversible. Toutes les attributions et résultats seront également supprimés.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: saving ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {saving ? '⏳ Suppression...' : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Attribuer */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>👥 Attribuer aux apprenants</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Quiz : <strong>{selectedQuiz?.title}</strong>
            </p>

            {loadingApprenants ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                Chargement des apprenants...
              </div>
            ) : apprenants.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                background: '#f9fafb',
                borderRadius: '8px',
                color: '#6b7280'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>Aucun apprenant trouvé</p>
                <p style={{ fontSize: '14px' }}>Créez d'abord des comptes apprenants</p>
              </div>
            ) : (
              <>
                {/* Boutons Tous/Aucun */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={selectAll}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✅ Tous ({apprenants.length})
                  </button>
                  <button
                    onClick={selectNone}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    ❌ Aucun
                  </button>
                  <div style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#1f2937' }}>{selectedApprenants.length}</strong>
                    &nbsp;sélectionné{selectedApprenants.length > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Liste des apprenants */}
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  {apprenants.map((apprenant) => (
                    <label
                      key={apprenant.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        background: selectedApprenants.includes(apprenant.id) ? '#e0f2fe' : 'white',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        border: `2px solid ${selectedApprenants.includes(apprenant.id) ? '#0ea5e9' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!selectedApprenants.includes(apprenant.id)) {
                          e.currentTarget.style.background = '#f9fafb'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!selectedApprenants.includes(apprenant.id)) {
                          e.currentTarget.style.background = 'white'
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedApprenants.includes(apprenant.id)}
                        onChange={() => toggleApprenant(apprenant.id)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          marginRight: '12px'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#1f2937',
                          fontSize: '15px'
                        }}>
                          {apprenant.prenom} {apprenant.nom}
                        </div>
                        {apprenant.email && (
                          <div style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {apprenant.email}
                          </div>
                        )}
                      </div>
                      {currentAssignments.includes(apprenant.id) && (
                        <span style={{
                          padding: '4px 8px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          Déjà attribué
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmAssign}
                disabled={saving || loadingApprenants}
                style={{
                  padding: '10px 20px',
                  background: saving ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (saving || loadingApprenants) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {saving ? '⏳ Enregistrement...' : `✅ Attribuer (${selectedApprenants.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
