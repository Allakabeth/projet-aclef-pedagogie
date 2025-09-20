import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/learner.module.css';
import AudioButton from '../../components/AudioButton';

export default function ResultatPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadResults();
  }, [router.query]);

  const loadResults = () => {
    try {
      // Récupérer les résultats depuis l'URL ou localStorage
      const { quizId, quizTitle, score, total, percentage } = router.query;
      
      if (quizId && score !== undefined && total !== undefined) {
        // Résultats depuis URL (navigation normale)
        setResults({
          quizId,
          quizTitle: quizTitle || 'Quiz',
          score: parseInt(score),
          totalQuestions: parseInt(total),
          percentage: parseInt(percentage) || Math.round((parseInt(score) / parseInt(total)) * 100)
        });
      } else {
        // Fallback : récupérer depuis localStorage
        const savedResults = localStorage.getItem('lastQuizResults');
        if (savedResults) {
          const parsed = JSON.parse(savedResults);
          setResults(parsed);
        } else {
          // Aucun résultat trouvé, rediriger vers l'accueil
          router.replace('/apprenant');
          return;
        }
      }
    } catch (error) {
      console.error('Erreur chargement résultats:', error);
      router.replace('/apprenant');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryQuiz = () => {
    if (results && results.quizId) {
      router.push(`/apprenant/quiz/${results.quizId}`);
    }
  };

  const handleBackHome = () => {
    // Nettoyer les résultats stockés
    localStorage.removeItem('lastQuizResults');
    router.push('/apprenant');
  };

  const generateScoreEmojis = (score, total) => {
    let emojis = '';
    for (let i = 0; i < total; i++) {
      emojis += i < score ? '✅' : '❌';
    }
    return emojis;
  };

  const getResultMessage = (percentage) => {
    if (percentage >= 80) {
      return {
        text: '🎉 Excellent !',
        subText: 'Vous maîtrisez parfaitement !',
        audio: 'Excellent ! Vous maîtrisez parfaitement ce sujet. Félicitations !',
        class: styles.success
      };
    } else if (percentage >= 60) {
      return {
        text: '👍 Bien joué !',
        subText: 'Vous êtes sur la bonne voie',
        audio: 'Bien joué ! Vous êtes sur la bonne voie. Continuez vos efforts !',
        class: styles.success
      };
    } else if (percentage >= 40) {
      return {
        text: '💪 Pas mal !',
        subText: 'Encore un petit effort',
        audio: 'Pas mal ! Avec encore un petit effort, vous allez y arriver !',
        class: styles.retry
      };
    } else {
      return {
        text: '🌱 À revoir',
        subText: 'L\'entraînement fait le maître',
        audio: 'Ce n\'est qu\'un début ! L\'entraînement fait le maître. Recommencez pour vous améliorer !',
        class: styles.retry
      };
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Calcul des résultats...</div>
        <div className={styles.subtitle}>Patientez un moment</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Aucun résultat</div>
        <div className={styles.subtitle}>Commencez un quiz pour voir vos résultats</div>
        <button 
          className={styles.button}
          onClick={handleBackHome}
          style={{ margin: '40px auto', display: 'block' }}
        >
          🏠 Aller à l'accueil
        </button>
      </div>
    );
  }

  const message = getResultMessage(results.percentage);
  const emojis = generateScoreEmojis(results.score, results.totalQuestions);

  return (
    <div className={styles.container}>
      <div className={`${styles.resultContainer} ${styles.fadeIn}`}>
        
        {/* Titre */}
        <div className={styles.title}>
          🎯 Quiz terminé !
        </div>

        {/* Nom du quiz */}
        <div className={styles.subtitle}>
          {results.quizTitle}
        </div>

        {/* Score numérique */}
        <div className={styles.scoreDisplay}>
          {results.score} / {results.totalQuestions}
        </div>

        {/* Pourcentage */}
        <div style={{ 
          fontSize: '24px', 
          color: '#7f8c8d', 
          marginBottom: '20px' 
        }}>
          ({results.percentage}%)
        </div>

        {/* Émojis du score */}
        <div className={styles.scoreEmojis}>
          {emojis}
        </div>

        {/* Message de résultat */}
        <div className={`${styles.resultMessage} ${message.class}`}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>
            {message.text}
          </div>
          <div style={{ fontSize: '20px' }}>
            {message.subText}
          </div>
        </div>

        {/* Bouton audio pour le message */}
        <AudioButton 
          text={message.audio}
          autoPlay={true}
          size="large"
        />

        {/* Statistiques détaillées */}
        <div style={{ 
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          margin: '30px 0',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '20px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '24px', color: '#27ae60' }}>✅</div>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {results.score}
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                Correctes
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '24px', color: '#e74c3c' }}>❌</div>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {results.totalQuestions - results.score}
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                Incorrectes
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '24px', color: '#3498db' }}>📊</div>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {results.percentage}%
              </div>
              <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                Réussite
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className={styles.actionButtons}>
          <button
            className={styles.button}
            onClick={handleRetryQuiz}
            style={{ background: '#3498db' }}
          >
            🔄 Recommencer ce quiz
          </button>
          
          <button
            className={styles.button}
            onClick={handleBackHome}
            style={{ background: '#27ae60' }}
          >
            🏠 Autres quiz
          </button>
        </div>

        {/* Encouragement */}
        <div style={{ 
          marginTop: '40px', 
          textAlign: 'center',
          color: '#7f8c8d',
          fontSize: '18px'
        }}>
          {results.percentage >= 60 ? (
            <p>🌟 Bravo pour vos efforts ! Continuez ainsi !</p>
          ) : (
            <p>💪 L'apprentissage demande de la patience. Vous progressez !</p>
          )}
        </div>

        {/* Conseils selon le score */}
        {results.percentage < 60 && (
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '15px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '10px' }}>
              💡 <strong>Conseils :</strong>
            </div>
            <ul style={{ textAlign: 'left', fontSize: '16px', lineHeight: '1.6' }}>
              <li>🎧 Réécoutez les questions attentivement</li>
              <li>⏰ Prenez le temps de bien réfléchir</li>
              <li>🔄 N'hésitez pas à refaire le quiz</li>
              <li>📚 Chaque essai vous fait progresser !</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}