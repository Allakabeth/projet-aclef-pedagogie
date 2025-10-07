import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/learner.module.css';
import AudioButton from './AudioButton';

const QuizPlayer = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const router = useRouter();

  const questions = quiz.quiz_data?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Vérification de sécurité : s'assurer que currentQuestion.answers existe
  if (currentQuestion && !currentQuestion.answers) {
    console.error('Question sans réponses:', currentQuestion);
    currentQuestion.answers = [];
  }

  useEffect(() => {
    // Reset states when quiz changes
    if (quiz) {
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setUserAnswers([]);
      setShowFeedback(false);
      setScore(0);
      setIsComplete(false);
    }
  }, [quiz.id]);

  const handleAnswerSelect = (answerId) => {
    if (showFeedback) return; // Empêcher de changer après feedback
    
    // Sélectionner et valider immédiatement
    setSelectedAnswer(answerId);
    
    // Vérifier si la réponse est correcte
    const correctAnswer = currentQuestion.answers.find(answer => answer.correct);
    const isCorrect = answerId === correctAnswer.id;

    // Sauvegarder la réponse
    const answerRecord = {
      questionId: currentQuestion.id,
      selectedAnswerId: answerId,
      isCorrect: isCorrect,
      questionText: currentQuestion.text
    };

    const newUserAnswers = [...userAnswers, answerRecord];
    setUserAnswers(newUserAnswers);

    // Mettre à jour le score
    if (isCorrect) {
      setScore(score + 1);
    }

    // Afficher le feedback
    setShowFeedback(true);

    // Son de feedback (simple bip)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(isCorrect ? 800 : 400, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio feedback non disponible');
    }

    // Passer à la question suivante après 2 secondes
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        // Note: isMuted reste inchangé pour persister à travers les questions
      } else {
        // Quiz terminé
        const finalScore = isCorrect ? score + 1 : score;
        setIsComplete(true);
        
        // Appeler le callback avec les résultats
        if (onComplete) {
          onComplete({
            score: finalScore,
            totalQuestions: totalQuestions,
            answers: newUserAnswers,
            percentage: Math.round((finalScore / totalQuestions) * 100)
          });
        }

        // Redirection vers page résultat après 1 seconde
        setTimeout(() => {
          router.push({
            pathname: '/quizz/resultat',
            query: {
              quizId: quiz.id,
              quizTitle: quiz.title,
              score: finalScore,
              total: totalQuestions,
              percentage: Math.round((finalScore / totalQuestions) * 100)
            }
          });
        }, 1000);
      }
    }, 2000);
  };


  const getAnswerButtonClass = (answerId) => {
    let className = styles.answerButton;
    
    if (selectedAnswer === answerId) {
      className += ` ${styles.selected}`;
    }
    
    if (showFeedback) {
      const answer = currentQuestion.answers.find(a => a.id === answerId);
      if (answer && answer.correct) {
        className += ` ${styles.correct}`;
      } else if (selectedAnswer === answerId && !answer.correct) {
        className += ` ${styles.incorrect}`;
      }
    }
    
    return className;
  };

  const getFeedbackMessage = () => {
    if (!showFeedback) return null;
    
    const isCorrect = currentQuestion.answers.find(a => a.id === selectedAnswer)?.correct;
    
    return (
      <div className={`${styles.feedback} ${isCorrect ? styles.correct : styles.incorrect} ${styles.fadeIn}`}>
        {isCorrect ? (
          <>
            ✅ <strong>Bravo !</strong> Bonne réponse !
          </>
        ) : (
          <>
            ❌ <strong>Pas tout à fait.</strong> La bonne réponse était: {
              currentQuestion.answers.find(a => a.correct)?.text
            }
          </>
        )}
      </div>
    );
  };

  if (!currentQuestion) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Erreur</div>
        <div className={styles.subtitle}>Quiz non trouvé ou sans questions</div>
        <button
          className={styles.button}
          onClick={() => router.push('/quizz')}
        >
          🏠 Retour aux quiz
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.resultContainer}>
          <div className={styles.title}>🎉 Quiz terminé !</div>
          <div className={styles.subtitle}>Redirection vers vos résultats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.questionContainer}>
        {/* Barre de progression */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className={styles.progressText}>
          Question {currentQuestionIndex + 1} sur {totalQuestions}
        </div>

        {/* Question avec audio intégré */}
        <div className={`${styles.question} ${styles.fadeIn}`} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <span>{currentQuestion.text}</span>
            <AudioButton 
              text={currentQuestion.text}
              audioUrl={currentQuestion.audio_url}
              autoPlay={!isMuted}
              size="small"
              onRightClick={() => setIsMuted(!isMuted)}
              isMuted={isMuted}
            />
          </div>
        </div>

        {/* Image de la question si disponible */}
        {(currentQuestion.image_url || currentQuestion.image) && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <img 
              src={currentQuestion.image_url || currentQuestion.image}
              alt="Image de la question"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '200px', 
                borderRadius: '10px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
              onError={(e) => {
                console.error('Erreur chargement image:', e.target.src);
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Réponses */}
        <div className={styles.answersGrid}>
          {(currentQuestion.answers || []).map((answer, index) => (
            <button
              key={answer.id}
              className={getAnswerButtonClass(answer.id)}
              onClick={() => handleAnswerSelect(answer.id)}
              disabled={showFeedback}
              aria-label={`Réponse ${index + 1}: ${answer.text}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    background: '#ecf0f1', 
                    borderRadius: '50%', 
                    width: '30px', 
                    height: '30px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#2c3e50'
                  }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <span>{answer.text}</span>
                    {(answer.image_url || answer.image) && (
                      <img 
                        src={answer.image_url || answer.image}
                        alt={`Image pour la réponse ${answer.text}`}
                        style={{ 
                          maxWidth: '150px', 
                          maxHeight: '100px', 
                          borderRadius: '5px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          console.error('Erreur chargement image réponse:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Bouton audio pour chaque réponse */}
                <div onClick={(e) => e.stopPropagation()}>
                  <AudioButton 
                    text={answer.text}
                    audioUrl={answer.audio_url}
                    size="small"
                    disabled={isMuted}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {getFeedbackMessage()}


        {showFeedback && (
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e8f4fd',
            borderRadius: '10px',
            color: '#0c5460',
            fontSize: '16px'
          }}>
            {currentQuestionIndex < totalQuestions - 1 ? 
              '⏳ Question suivante dans quelques instants...' : 
              '🎯 Calcul de vos résultats...'
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;