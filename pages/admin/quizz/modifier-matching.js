import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ModifierMatching() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)

  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [leftColumn, setLeftColumn] = useState([])
  const [rightColumn, setRightColumn] = useState([])
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
        setLeftColumn(question.leftColumn || [])
        setRightColumn(question.rightColumn || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    }
  }

  const handleAddLeft = () => {
    const nextLetter = String.fromCharCode(97 + leftColumn.length) // a, b, c...
    setLeftColumn([...leftColumn, { id: nextLetter, text: '' }])
  }

  const handleRemoveLeft = (index) => {
    setLeftColumn(leftColumn.filter((_, i) => i !== index))
  }

  const handleLeftChange = (index, value) => {
    const updated = [...leftColumn]
    updated[index].text = value
    setLeftColumn(updated)
  }

  const handleAddRight = () => {
    const nextNumber = (rightColumn.length + 1).toString()
    setRightColumn([...rightColumn, { id: nextNumber, text: '', matchWith: '' }])
  }

  const handleRemoveRight = (index) => {
    setRightColumn(rightColumn.filter((_, i) => i !== index))
  }

  const handleRightChange = (index, field, value) => {
    const updated = [...rightColumn]
    updated[index][field] = value
    setRightColumn(updated)
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

    if (leftColumn.length === 0) {
      alert('⚠️ Ajoutez au moins un élément dans la colonne de gauche')
      return
    }

    if (rightColumn.length === 0) {
      alert('⚠️ Ajoutez au moins un élément dans la colonne de droite')
      return
    }

    // Vérifier que chaque élément de droite a une association
    const invalidRight = rightColumn.find(item => !item.matchWith)
    if (invalidRight) {
      alert('⚠️ Tous les éléments de droite doivent avoir une association (colonne "Associe avec")')
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
          type: 'matching',
          text: questionText,
          leftColumn: leftColumn,
          rightColumn: rightColumn,
          answers: [],
          items: [],
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
        maxWidth: '1200px',
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
          ✏️ Modifier Quiz Matching
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
              placeholder="Ex: Mon identité"
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
            placeholder="Ex: Associe les bons éléments ensemble"
          />
        </div>

        {/* Colonnes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          marginBottom: '30px'
        }}>
          {/* Colonne gauche */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#3b82f6' }}>
              🔵 Colonne gauche (Questions)
            </h3>

            {leftColumn.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '10px',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {item.id.toUpperCase()}
                </div>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleLeftChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid #dbeafe',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Ex: Nom"
                />
                <button
                  onClick={() => handleRemoveLeft(index)}
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
            ))}

            <button
              onClick={handleAddLeft}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                background: '#3b82f6',
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

          {/* Colonne droite */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#10b981' }}>
              🟢 Colonne droite (Réponses)
            </h3>

            {rightColumn.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '10px',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {item.id}
                </div>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleRightChange(index, 'text', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Ex: Sylla"
                />
                <select
                  value={item.matchWith}
                  onChange={(e) => handleRightChange(index, 'matchWith', e.target.value)}
                  style={{
                    width: '120px',
                    padding: '10px',
                    border: '2px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                  title="Associe avec"
                >
                  <option value="">--</option>
                  {leftColumn.map((left) => (
                    <option key={left.id} value={left.id}>
                      {left.id.toUpperCase()}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveRight(index)}
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
            ))}

            <button
              onClick={handleAddRight}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              ➕ Ajouter une réponse
            </button>
          </div>
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
