import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ModifierOrdering() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)

  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

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
  }, [router])

  useEffect(() => {
    if (id && user) {
      loadQuiz()
    }
  }, [id, user])

  const loadQuiz = async () => {
    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch(`/api/quiz/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      const currentQuiz = data.quizzes.find(q => q.id === id)

      if (!currentQuiz) {
        alert('Quiz non trouvé')
        router.push('/admin/quizz/gestion')
        return
      }

      setQuiz(currentQuiz)
      setQuizTitle(currentQuiz.title)
      setQuizDescription(currentQuiz.description || '')

      const question = currentQuiz.quizData?.questions?.[0]

      if (question) {
        setQuestionText(question.text || '')
        setItems(question.items || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const handleAddItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
    setItems([...items, {
      id: newId,
      text: '',
      correctPosition: items.length + 1
    }])
  }

  const handleRemoveItem = (id) => {
    const newItems = items.filter(item => item.id !== id)
    // Réajuster les positions correctes
    const reindexed = newItems.map((item, index) => ({
      ...item,
      correctPosition: index + 1
    }))
    setItems(reindexed)
  }

  const handleItemChange = (id, text) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, text } : item
    ))
  }

  const moveItemUp = (index) => {
    if (index === 0) return
    const newItems = [...items]
    const temp = newItems[index - 1]
    newItems[index - 1] = newItems[index]
    newItems[index] = temp
    // Réajuster les positions correctes
    const reindexed = newItems.map((item, idx) => ({
      ...item,
      correctPosition: idx + 1
    }))
    setItems(reindexed)
  }

  const moveItemDown = (index) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    const temp = newItems[index + 1]
    newItems[index + 1] = newItems[index]
    newItems[index] = temp
    // Réajuster les positions correctes
    const reindexed = newItems.map((item, idx) => ({
      ...item,
      correctPosition: idx + 1
    }))
    setItems(reindexed)
  }

  const handleSave = async () => {
    // Validation
    if (!quizTitle.trim()) {
      alert('⚠️ Le titre du quiz est obligatoire')
      return
    }

    if (!questionText.trim()) {
      alert('⚠️ La consigne de la question est obligatoire')
      return
    }

    if (items.length < 2) {
      alert('⚠️ Ajoutez au moins 2 éléments à ordonner')
      return
    }

    // Vérifier que tous les éléments ont du texte
    const emptyItems = items.filter(item => !item.text.trim())
    if (emptyItems.length > 0) {
      alert('⚠️ Tous les éléments doivent avoir un texte')
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const updatedQuizData = {
        ...quiz.quizData,
        questions: [{
          id: 1,
          type: 'ordering',
          text: questionText,
          items: items,
          answers: [],
          leftColumn: [],
          rightColumn: [],
          explanation: '',
          correctAnswer: '',
          customMessage: { success: '', error: '' },
          tolerance: 0,
          unit: '',
          minCorrect: 1
        }]
      }

      const response = await fetch('/api/quiz/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          quizId: id,
          title: quizTitle,
          description: quizDescription,
          quizData: updatedQuizData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      alert('✅ Quiz modifié avec succès !')
      router.push('/admin/quizz/gestion')
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

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

  if (!user || !quiz) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1000px',
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
          🔄 Modifier Quiz Remise en Ordre
        </h1>

        {/* Informations du quiz */}
        <div style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#374151' }}>
              Titre du quiz *
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Ex: Les étapes de la recette"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#374151' }}>
              Description (optionnelle)
            </label>
            <textarea
              value={quizDescription}
              onChange={(e) => setQuizDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                minHeight: '80px'
              }}
              placeholder="Description du quiz..."
            />
          </div>
        </div>

        {/* Consigne */}
        <div style={{
          background: '#eff6ff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e40af' }}>
            Consigne de la question *
          </label>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '16px'
            }}
            placeholder="Ex: Remets les étapes dans le bon ordre"
          />
        </div>

        {/* Liste des éléments */}
        <div style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#8b5cf6' }}>
            📝 Éléments à ordonner (dans le bon ordre)
          </h3>

          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            💡 L'ordre ci-dessous est le <strong>bon ordre</strong>. Les éléments seront mélangés automatiquement lors du quiz.
          </p>

          {items.map((item, index) => (
            <div key={item.id} style={{
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Numéro de position */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#8b5cf6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                {/* Champ texte */}
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleItemChange(item.id, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Ex: Préchauffer le four à 180°C"
                />

                {/* Boutons de déplacement */}
                <button
                  onClick={() => moveItemUp(index)}
                  disabled={index === 0}
                  style={{
                    padding: '8px 12px',
                    background: index === 0 ? '#e5e7eb' : '#3b82f6',
                    color: index === 0 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  title="Monter"
                >
                  ▲
                </button>

                <button
                  onClick={() => moveItemDown(index)}
                  disabled={index === items.length - 1}
                  style={{
                    padding: '8px 12px',
                    background: index === items.length - 1 ? '#e5e7eb' : '#3b82f6',
                    color: index === items.length - 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  title="Descendre"
                >
                  ▼
                </button>

                {/* Bouton supprimer */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
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

          <button
            onClick={handleAddItem}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            ➕ Ajouter un élément
          </button>
        </div>

        {/* Boutons d'action */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          marginTop: '40px'
        }}>
          <button
            onClick={() => router.push('/admin/quizz/gestion')}
            style={{
              padding: '12px 30px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Annuler
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 30px',
              background: saving ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {saving ? '💾 Enregistrement...' : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
