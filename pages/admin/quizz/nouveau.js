import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AIQuizGenerator from '../../../components/AIQuizGenerator'

export default function NouveauQuiz() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manuel') // 'manuel' ou 'ia'
  const [selectedType, setSelectedType] = useState(null)
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
  }, [router])

  const quizTypes = [
    {
      id: 'qcm',
      label: '🔘 QCM (Choix unique)',
      description: 'Une seule bonne réponse parmi plusieurs',
      color: '#8b5cf6'
    },
    {
      id: 'multiple',
      label: '☑️ Choix multiples',
      description: 'Plusieurs bonnes réponses possibles',
      color: '#10b981'
    },
    {
      id: 'truefalse',
      label: '✅❌ Vrai/Faux',
      description: 'Question binaire simple',
      color: '#f59e0b'
    },
    {
      id: 'numeric',
      label: '🔢 Numérique',
      description: 'Réponse chiffrée exacte',
      color: '#3b82f6'
    },
    {
      id: 'text',
      label: '📝 Texte libre',
      description: 'Réponse courte en texte',
      color: '#ec4899'
    },
    {
      id: 'matching',
      label: '🔗 Association',
      description: 'Associer des éléments entre eux',
      color: '#06b6d4'
    },
    {
      id: 'ordering',
      label: '🔄 Remise en ordre',
      description: 'Remettre des éléments dans le bon ordre',
      color: '#84cc16'
    }
  ]

  const handleAIGenerate = async (formData) => {
    console.log('Génération IA:', formData)
    // TODO: Implémenter la génération par IA
    alert('Génération par IA - À implémenter')
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

  if (!user) return null

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
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 'bold',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            ➕ Créer un nouveau quiz
          </h1>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            Choisissez votre méthode de création
          </p>
        </div>

        {/* Onglets */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => {
              setActiveTab('manuel')
              setSelectedType(null)
            }}
            style={{
              padding: '15px 30px',
              background: activeTab === 'manuel' ? 'white' : 'transparent',
              color: activeTab === 'manuel' ? '#8b5cf6' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'manuel' ? '3px solid #8b5cf6' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            📝 Création manuelle
          </button>
          <button
            onClick={() => {
              setActiveTab('ia')
              setSelectedType(null)
            }}
            style={{
              padding: '15px 30px',
              background: activeTab === 'ia' ? 'white' : 'transparent',
              color: activeTab === 'ia' ? '#8b5cf6' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'ia' ? '3px solid #8b5cf6' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            🤖 Génération par IA
          </button>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'manuel' ? (
          <>
            {!selectedType ? (
              /* Menu de sélection du type */
              <>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  Choisissez le type de quiz
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '40px'
                }}>
                  {quizTypes.map(type => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      style={{
                        background: 'white',
                        padding: '25px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.borderColor = type.color
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                        {type.label.split(' ')[0]}
                      </div>
                      <h3 style={{
                        color: '#1f2937',
                        marginBottom: '10px',
                        fontSize: '18px'
                      }}>
                        {type.label.split(' ').slice(1).join(' ')}
                      </h3>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        margin: 0
                      }}>
                        {type.description}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Formulaire de création selon le type */
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={() => setSelectedType(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}
                >
                  ← Retour au choix du type
                </button>

                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '20px'
                }}>
                  {quizTypes.find(t => t.id === selectedType)?.label}
                </h2>

                {/* Formulaires selon le type */}
                {selectedType === 'qcm' && <FormQCM />}
                {selectedType === 'multiple' && <FormMultiple />}
                {selectedType === 'truefalse' && <FormTrueFalse />}
                {selectedType === 'numeric' && <FormNumeric />}
                {selectedType === 'text' && <FormText />}
                {selectedType === 'matching' && <FormMatching />}
                {selectedType === 'ordering' && <FormOrdering />}
              </div>
            )}
          </>
        ) : (
          /* Onglet IA */
          <AIQuizGenerator
            onGenerate={handleAIGenerate}
            processing={false}
          />
        )}

        {/* Bouton retour */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
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
            ← Retour aux quiz
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FORMULAIRES PAR TYPE DE QUIZ
// ============================================

function FormQCM() {
  const router = useRouter()
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState([{
    id: 1,
    text: '',
    image: '',
    audio: '',
    answers: [
      { id: 1, text: '', correct: true },
      { id: 2, text: '', correct: false },
      { id: 3, text: '', correct: false },
      { id: 4, text: '', correct: false }
    ]
  }])

  const addQuestion = () => {
    setQuestions([...questions, {
      id: questions.length + 1,
      text: '',
      image: '',
      audio: '',
      answers: [
        { id: 1, text: '', correct: true },
        { id: 2, text: '', correct: false },
        { id: 3, text: '', correct: false },
        { id: 4, text: '', correct: false }
      ]
    }])
  }

  const removeQuestion = (id) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id))
    }
  }

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ))
  }

  const addAnswer = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: [...q.answers, {
            id: q.answers.length + 1,
            text: '',
            correct: false
          }]
        }
      }
      return q
    }))
  }

  const removeAnswer = (questionId, answerId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.answers.length > 2) {
        return {
          ...q,
          answers: q.answers.filter(a => a.id !== answerId)
        }
      }
      return q
    }))
  }

  const updateAnswer = (questionId, answerId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: q.answers.map(a =>
            a.id === answerId ? { ...a, [field]: value } : a
          )
        }
      }
      return q
    }))
  }

  const setCorrectAnswer = (questionId, answerId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answers: q.answers.map(a => ({
            ...a,
            correct: a.id === answerId
          }))
        }
      }
      return q
    }))
  }

  const handleSave = async () => {
    // Validation
    if (!quizTitle.trim()) {
      alert('⚠️ Le titre du quiz est requis')
      return
    }

    if (questions.length === 0) {
      alert('⚠️ Ajoutez au moins une question')
      return
    }

    // Vérifier que chaque question a un texte et des réponses
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        alert(`⚠️ La question ${i + 1} doit avoir un texte`)
        return
      }
      if (q.answers.length < 2) {
        alert(`⚠️ La question ${i + 1} doit avoir au moins 2 réponses`)
        return
      }
      const hasCorrect = q.answers.some(a => a.correct)
      if (!hasCorrect) {
        alert(`⚠️ La question ${i + 1} doit avoir une réponse correcte`)
        return
      }
      const emptyAnswers = q.answers.filter(a => !a.text.trim())
      if (emptyAnswers.length > 0) {
        alert(`⚠️ La question ${i + 1} a des réponses vides`)
        return
      }
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          quizType: 'qcm',
          questions: questions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      alert('✅ Quiz créé avec succès !')
      router.push('/admin/quizz/gestion')

    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Informations générales */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>📋 Informations générales</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Titre du quiz *
          </label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Ex: Les animaux de la ferme"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Description (optionnelle)
          </label>
          <textarea
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Décrivez le contenu du quiz..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Questions */}
      <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>❓ Questions ({questions.length})</h3>

      {questions.map((question, qIndex) => (
        <div
          key={question.id}
          style={{
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: '#1f2937', margin: 0 }}>Question {qIndex + 1}</h4>
            {questions.length > 1 && (
              <button
                onClick={() => removeQuestion(question.id)}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ Supprimer
              </button>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Texte de la question *
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
              placeholder="Ex: Quel cri fait la vache ?"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Réponses */}
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#374151' }}>
              Réponses (cochez la bonne réponse)
            </label>

            {question.answers.map((answer, aIndex) => (
              <div
                key={answer.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={answer.correct}
                  onChange={() => setCorrectAnswer(question.id, answer.id)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{
                  width: '30px',
                  height: '30px',
                  background: '#8b5cf6',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {String.fromCharCode(65 + aIndex)}
                </span>
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => updateAnswer(question.id, answer.id, 'text', e.target.value)}
                  placeholder={`Réponse ${String.fromCharCode(65 + aIndex)}`}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                {question.answers.length > 2 && (
                  <button
                    onClick={() => removeAnswer(question.id, answer.id)}
                    style={{
                      padding: '6px 10px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => addAnswer(question.id)}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '5px'
              }}
            >
              + Ajouter une réponse
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addQuestion}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '30px'
        }}
      >
        ➕ Ajouter une question
      </button>

      {/* Bouton de sauvegarde */}
      <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #e5e7eb' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '15px 40px',
            background: saving ? '#6b7280' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? '⏳ Enregistrement...' : '💾 Enregistrer le quiz'}
        </button>
      </div>
    </div>
  )
}

function FormMultiple() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      <p style={{ fontSize: '18px' }}>🚧 Formulaire Choix Multiples</p>
      <p>Plusieurs réponses correctes possibles</p>
      <p style={{ fontSize: '14px', marginTop: '20px' }}>Structure à créer...</p>
    </div>
  )
}

function FormTrueFalse() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      <p style={{ fontSize: '18px' }}>🚧 Formulaire Vrai/Faux</p>
      <p>Question avec 2 réponses: Vrai ou Faux</p>
      <p style={{ fontSize: '14px', marginTop: '20px' }}>Structure à créer...</p>
    </div>
  )
}

function FormNumeric() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      <p style={{ fontSize: '18px' }}>🚧 Formulaire Numérique</p>
      <p>Réponse chiffrée exacte</p>
      <p style={{ fontSize: '14px', marginTop: '20px' }}>Structure à créer...</p>
    </div>
  )
}

function FormText() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      <p style={{ fontSize: '18px' }}>🚧 Formulaire Texte Libre</p>
      <p>Réponse courte en texte</p>
      <p style={{ fontSize: '14px', marginTop: '20px' }}>Structure à créer...</p>
    </div>
  )
}

function FormMatching() {
  const router = useRouter()
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState([{
    id: 1,
    text: '',
    leftColumn: [
      { id: 'a', text: '' },
      { id: 'b', text: '' }
    ],
    rightColumn: [
      { id: '1', text: '', matchWith: 'a' },
      { id: '2', text: '', matchWith: 'b' }
    ]
  }])

  const addQuestion = () => {
    setQuestions([...questions, {
      id: questions.length + 1,
      text: '',
      leftColumn: [
        { id: 'a', text: '' },
        { id: 'b', text: '' }
      ],
      rightColumn: [
        { id: '1', text: '', matchWith: 'a' },
        { id: '2', text: '', matchWith: 'b' }
      ]
    }])
  }

  const removeQuestion = (id) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id))
    }
  }

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ))
  }

  const addLeftItem = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newId = String.fromCharCode(97 + q.leftColumn.length)
        return {
          ...q,
          leftColumn: [...q.leftColumn, { id: newId, text: '' }]
        }
      }
      return q
    }))
  }

  const removeLeftItem = (questionId, itemId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.leftColumn.length > 1) {
        const newLeftColumn = q.leftColumn.filter(item => item.id !== itemId)
        const newRightColumn = q.rightColumn.map(item =>
          item.matchWith === itemId ? { ...item, matchWith: newLeftColumn[0]?.id || 'a' } : item
        )
        return { ...q, leftColumn: newLeftColumn, rightColumn: newRightColumn }
      }
      return q
    }))
  }

  const updateLeftItem = (questionId, itemId, text) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          leftColumn: q.leftColumn.map(item =>
            item.id === itemId ? { ...item, text } : item
          )
        }
      }
      return q
    }))
  }

  const addRightItem = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newId = (q.rightColumn.length + 1).toString()
        return {
          ...q,
          rightColumn: [...q.rightColumn, {
            id: newId,
            text: '',
            matchWith: q.leftColumn[0]?.id || 'a'
          }]
        }
      }
      return q
    }))
  }

  const removeRightItem = (questionId, itemId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.rightColumn.length > 1) {
        return {
          ...q,
          rightColumn: q.rightColumn.filter(item => item.id !== itemId)
        }
      }
      return q
    }))
  }

  const updateRightItem = (questionId, itemId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          rightColumn: q.rightColumn.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
          )
        }
      }
      return q
    }))
  }

  const handleSave = async () => {
    // Validation
    if (!quizTitle.trim()) {
      alert('⚠️ Le titre du quiz est requis')
      return
    }

    if (questions.length === 0) {
      alert('⚠️ Ajoutez au moins une question')
      return
    }

    // Vérifier que chaque question a des éléments dans les deux colonnes
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.leftColumn || q.leftColumn.length === 0) {
        alert(`⚠️ La question ${i + 1} doit avoir des éléments dans la colonne A`)
        return
      }
      if (!q.rightColumn || q.rightColumn.length === 0) {
        alert(`⚠️ La question ${i + 1} doit avoir des éléments dans la colonne B`)
        return
      }
      // Vérifier que les textes sont remplis
      const emptyLeft = q.leftColumn.filter(item => !item.text.trim())
      if (emptyLeft.length > 0) {
        alert(`⚠️ La question ${i + 1} a des éléments vides dans la colonne A`)
        return
      }
      const emptyRight = q.rightColumn.filter(item => !item.text.trim())
      if (emptyRight.length > 0) {
        alert(`⚠️ La question ${i + 1} a des éléments vides dans la colonne B`)
        return
      }
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('quiz-admin-token')
      const userData = localStorage.getItem('quiz-admin-user')

      const response = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          quizType: 'matching',
          questions: questions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      alert('✅ Quiz créé avec succès !')
      router.push('/admin/quizz/gestion')

    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Informations générales */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>📋 Informations générales</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Titre du quiz *
          </label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Ex: Associer les animaux et leurs cris"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Description (optionnelle)
          </label>
          <textarea
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Décrivez le contenu du quiz..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Questions */}
      <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>🔗 Questions d'association ({questions.length})</h3>

      {questions.map((question, qIndex) => (
        <div
          key={question.id}
          style={{
            background: '#f9fafb',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: '#1f2937', margin: 0 }}>Question {qIndex + 1}</h4>
            {questions.length > 1 && (
              <button
                onClick={() => removeQuestion(question.id)}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ Supprimer
              </button>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
              Consigne (optionnelle)
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
              placeholder="Ex: Associez chaque animal à son cri"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Colonnes d'association */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* Colonne A (gauche) */}
            <div>
              <h5 style={{ color: '#3b82f6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📋 Colonne A
              </h5>
              {question.leftColumn.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{
                    minWidth: '30px',
                    height: '30px',
                    fontWeight: 'bold',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    {item.id.toUpperCase()}
                  </span>

                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateLeftItem(question.id, item.id, e.target.value)}
                    placeholder={`Élément ${item.id.toUpperCase()}`}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />

                  {question.leftColumn.length > 1 && (
                    <button
                      onClick={() => removeLeftItem(question.id, item.id)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => addLeftItem(question.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                + Ajouter élément A
              </button>
            </div>

            {/* Colonne B (droite) */}
            <div>
              <h5 style={{ color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📋 Colonne B
              </h5>
              {question.rightColumn.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{
                    minWidth: '30px',
                    height: '30px',
                    fontWeight: 'bold',
                    backgroundColor: '#10b981',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    {item.id}
                  </span>

                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateRightItem(question.id, item.id, 'text', e.target.value)}
                    placeholder={`Élément ${item.id}`}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />

                  <select
                    value={item.matchWith}
                    onChange={(e) => updateRightItem(question.id, item.id, 'matchWith', e.target.value)}
                    style={{
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      minWidth: '60px'
                    }}
                  >
                    {question.leftColumn.map(leftItem => (
                      <option key={leftItem.id} value={leftItem.id}>
                        {leftItem.id.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {question.rightColumn.length > 1 && (
                    <button
                      onClick={() => removeRightItem(question.id, item.id)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => addRightItem(question.id)}
                disabled={question.leftColumn.length === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: question.leftColumn.length === 0 ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: question.leftColumn.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                + Ajouter élément B
              </button>
            </div>
          </div>

          {/* Aperçu des associations */}
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#e0f2fe',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <strong>💡 Associations définies :</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              {question.rightColumn.map(rightItem => {
                const leftItem = question.leftColumn.find(l => l.id === rightItem.matchWith)
                return (
                  <li key={rightItem.id}>
                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                      {leftItem?.text || leftItem?.id?.toUpperCase() || '?'}
                    </span>
                    {' ↔ '}
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                      {rightItem.text || rightItem.id}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ))}

      <button
        onClick={addQuestion}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '30px'
        }}
      >
        ➕ Ajouter une question
      </button>

      {/* Bouton de sauvegarde */}
      <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #e5e7eb' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '15px 40px',
            background: saving ? '#6b7280' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? '⏳ Enregistrement...' : '💾 Enregistrer le quiz'}
        </button>
      </div>
    </div>
  )
}

function FormOrdering() {
  const router = useRouter()
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [items, setItems] = useState([
    { id: 1, text: '', correctPosition: 1 },
    { id: 2, text: '', correctPosition: 2 }
  ])
  const [saving, setSaving] = useState(false)

  const handleAddItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
    setItems([...items, {
      id: newId,
      text: '',
      correctPosition: items.length + 1
    }])
  }

  const handleRemoveItem = (id) => {
    if (items.length <= 2) {
      alert('⚠️ Il faut au moins 2 éléments')
      return
    }
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
      alert('⚠️ Le titre du quiz est requis')
      return
    }

    if (!questionText.trim()) {
      alert('⚠️ La consigne est requise')
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

      const response = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          quizType: 'ordering',
          questions: [{
            id: 1,
            type: 'ordering',
            text: questionText,
            items: items
          }]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      alert('✅ Quiz créé avec succès !')
      router.push('/admin/quizz/gestion')

    } catch (error) {
      console.error('Erreur:', error)
      alert(`❌ Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Informations générales */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>📋 Informations générales</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Titre du quiz *
          </label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Ex: Les étapes de la recette"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Description (optionnelle)
          </label>
          <textarea
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Décrivez le contenu du quiz..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
            Consigne *
          </label>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ex: Remets les étapes dans le bon ordre"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>
      </div>

      {/* Éléments à ordonner */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#1f2937', marginBottom: '15px' }}>🔄 Éléments à ordonner (dans le bon ordre)</h3>

        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', background: '#fef3c7', padding: '10px', borderRadius: '6px' }}>
          💡 L'ordre ci-dessous est le <strong>bon ordre</strong>. Les éléments seront mélangés automatiquement lors du quiz.
        </p>

        {items.map((item, index) => (
          <div key={item.id} style={{
            background: '#f9fafb',
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
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push('/admin/quizz/gestion')}
          disabled={saving}
          style={{
            padding: '12px 24px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Annuler
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 24px',
            background: saving ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {saving ? '💾 Création...' : '✅ Créer le quiz'}
        </button>
      </div>
    </div>
  )
}
