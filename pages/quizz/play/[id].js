import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import QuizPlayer from '../../../components/QuizPlayer'
import QuizPlayerMatching from '../../../components/QuizPlayerMatching'
import QuizPlayerOrdering from '../../../components/QuizPlayerOrdering'

export default function PlayQuiz() {
  const [user, setUser] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    // Vérifier l'authentification
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch (error) {
      console.error('Erreur parsing user data:', error)
      router.push('/login')
      return
    }
  }, [router])

  useEffect(() => {
    if (id && user) {
      loadQuiz()
    }
  }, [id, user])

  const loadQuiz = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      const response = await fetch(`/api/quiz/get-by-id?quizId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement du quiz')
      }

      console.log('Quiz reçu:', data.quiz)
      console.log('Questions:', data.quiz?.quiz_data?.questions)

      setQuiz(data.quiz)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuizComplete = async (results) => {
    console.log('Quiz terminé:', results)

    // Marquer le quiz comme complété
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      await fetch('/api/quiz/mark-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Data': encodeURIComponent(userData)
        },
        body: JSON.stringify({
          quizId: quiz.id,
          score: results.score,
          totalQuestions: results.totalQuestions,
          percentage: results.percentage,
          answers: results.answers
        })
      })
    } catch (error) {
      console.error('Erreur sauvegarde résultats:', error)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px'
      }}>
        <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement du quiz...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px',
          padding: '40px',
          background: '#fef2f2',
          borderRadius: '12px',
          border: '2px solid #fecaca'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#dc2626', marginBottom: '15px' }}>Erreur</h2>
          <p style={{ color: '#991b1b', marginBottom: '25px' }}>{error}</p>
          <button
            onClick={() => router.push('/quizz/index')}
            style={{
              padding: '12px 24px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Retour aux quiz
          </button>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return null
  }

  // Détection du type de quiz et utilisation du player approprié
  // Le type peut être soit dans quiz_data.type, soit dans la première question
  const quizType = quiz.quiz_data?.type || quiz.quiz_data?.questions?.[0]?.type

  if (quizType === 'matching') {
    return <QuizPlayerMatching quiz={quiz} onComplete={handleQuizComplete} />
  }

  if (quizType === 'ordering') {
    return <QuizPlayerOrdering quiz={quiz} onComplete={handleQuizComplete} />
  }

  // Par défaut, utiliser QuizPlayer pour les QCM
  return <QuizPlayer quiz={quiz} onComplete={handleQuizComplete} />
}
