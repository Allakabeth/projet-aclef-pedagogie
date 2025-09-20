import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function QuizzHome() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

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
        loadQuizzes();
    } catch (error) {
        console.error('Erreur parsing user data:', error)
        router.push('/login')
        return
    }
  }, [router]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Données temporaires en attendant la base de données
      const tempQuizzes = [
        {
          id: '1',
          title: 'Quiz de Démonstration',
          description: 'Un quiz test pour découvrir les fonctionnalités de la plateforme',
          quiz_data: {
            questions: [
              {
                id: '1',
                question: 'Quelle est la capitale de la France ?',
                type: 'multiple-choice',
                answers: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'],
                correct: 0
              },
              {
                id: '2',
                question: 'La Terre tourne autour du Soleil.',
                type: 'true-false',
                answers: ['Vrai', 'Faux'],
                correct: 0
              },
              {
                id: '3',
                question: 'Combien font 2 + 2 ?',
                type: 'multiple-choice',
                answers: ['3', '4', '5', '6'],
                correct: 1
              }
            ]
          }
        },
        {
          id: '2',
          title: 'Quiz Culture Générale',
          description: 'Testez vos connaissances en culture générale',
          quiz_data: {
            questions: [
              {
                id: '1',
                question: 'Qui a peint la Joconde ?',
                type: 'multiple-choice',
                answers: ['Michel-Ange', 'Léonard de Vinci', 'Picasso', 'Van Gogh'],
                correct: 1
              },
              {
                id: '2',
                question: 'L\'eau bout à 100°C.',
                type: 'true-false',
                answers: ['Vrai', 'Faux'],
                correct: 0
              }
            ]
          }
        }
      ];

      setQuizzes(tempQuizzes);
    } catch (err) {
      console.error('Erreur chargement quiz:', err);
      setError('Impossible de charger les quiz. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSelect = (quizId) => {
    // Navigation vers le quiz sélectionné
    router.push(`/quizz/quiz/${quizId}`);
  };

  const getQuestionCount = (quizData) => {
    if (!quizData || !quizData.questions) return 0;
    return quizData.questions.length;
  };

  // Fonction pour lire le texte
  const lireTexte = (texte) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(texte)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.8
      utterance.pitch = 0.6
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleRetourQuizz = () => {
    router.push('/quizz')
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
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: '#8b5cf6', fontSize: '18px' }}>Chargement des quiz...</div>
        </div>
      </div>
    );
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
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', fontSize: '18px', marginBottom: '20px' }}>{error}</div>
          <button
            onClick={loadQuizzes}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

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
        backgroundColor: 'white',
        padding: 'clamp(15px, 4vw, 25px)',
        maxWidth: '800px',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Titre */}
        <h1 style={{
          fontSize: 'clamp(22px, 5vw, 28px)',
          fontWeight: 'bold',
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🎯 Quiz Disponibles
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 3vw, 18px)',
          color: '#666',
          marginBottom: 'clamp(20px, 5vw, 35px)',
          lineHeight: '1.4'
        }}>
          Choisissez un quiz pour commencer à apprendre
        </p>

        {quizzes.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '20px', color: '#64748b', marginBottom: '20px' }}>
              Aucun quiz disponible pour le moment.
            </div>
            <button
              onClick={loadQuizzes}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🔄 Actualiser
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'clamp(15px, 3vw, 20px)',
            marginBottom: 'clamp(20px, 4vw, 30px)'
          }}>
            {quizzes.map((quiz, index) => {
              const questionCount = getQuestionCount(quiz.quiz_data);

              return (
                <div
                  key={quiz.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '10px'
                  }}>
                    {quiz.title}
                  </h3>

                  {quiz.description && (
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b',
                      marginBottom: '15px',
                      lineHeight: '1.4'
                    }}>
                      {quiz.description}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    <span>📝 {questionCount} questions</span>
                    <span>⏱️ ~{Math.max(1, Math.ceil(questionCount / 2))} min</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => lireTexte(`Quiz: ${quiz.title}. ${quiz.description || 'Quiz disponible'}`)}
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid #8b5cf6',
                        borderRadius: '8px',
                        width: '35px',
                        height: '35px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Écouter"
                    >
                      🔊
                    </button>

                    <button
                      onClick={() => handleQuizSelect(quiz.id)}
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        flex: 1,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                    >
                      ▶️ Commencer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton Retour */}
        <button
          onClick={handleRetourQuizz}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: '20px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
        >
          ← Retour aux quiz
        </button>

        {/* Informations utilisateur */}
        {user && (
          <div style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            Quiz ACLEF - Connecté : <strong>{user.identifiant}</strong> ({user.prenom} {user.nom})
          </div>
        )}
      </div>
    </div>
  );
}