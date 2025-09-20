import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import QuizPlayer from '../../../components/QuizPlayer';
import styles from '../../../styles/learner.module.css';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuizPlayPage() {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      loadQuiz();
      createQuizSession();
    }
  }, [id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Quiz non trouvé ou inactif');
      }

      // Valider que le quiz a des questions
      if (!data.quiz_data || !data.quiz_data.questions || data.quiz_data.questions.length === 0) {
        throw new Error('Ce quiz ne contient aucune question');
      }

      setQuiz(data);
    } catch (err) {
      console.error('Erreur chargement quiz:', err);
      setError(err.message || 'Impossible de charger le quiz');
    } finally {
      setLoading(false);
    }
  };

  const createQuizSession = async () => {
    try {
      // Pour cette version simple, on utilise un utilisateur factice
      // Dans une vraie app, on récupérerait l'ID de l'utilisateur connecté
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'apprenant@aclef.fr')
        .single();

      if (users) {
        const { data: session, error } = await supabase
          .from('quiz_sessions')
          .insert({
            quiz_id: id,
            user_id: users.id,
            score: 0,
            total_questions: 0,
            completed: false,
            session_data: {}
          })
          .select()
          .single();

        if (!error && session) {
          setSessionId(session.id);
        }
      }
    } catch (err) {
      console.error('Erreur création session:', err);
      // Non bloquant, on continue sans session
    }
  };

  const handleQuizComplete = async (results) => {
    try {
      // Mettre à jour la session avec les résultats
      if (sessionId) {
        await supabase
          .from('quiz_sessions')
          .update({
            score: results.score,
            total_questions: results.totalQuestions,
            completed: true,
            session_data: {
              answers: results.answers,
              percentage: results.percentage,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', sessionId);
      }

      // Sauvegarder aussi en localStorage pour la page résultat
      localStorage.setItem('lastQuizResults', JSON.stringify({
        quizId: quiz.id,
        quizTitle: quiz.title,
        score: results.score,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        answers: results.answers,
        sessionId: sessionId
      }));

    } catch (err) {
      console.error('Erreur sauvegarde résultats:', err);
      // Non bloquant, on continue vers les résultats
    }
  };

  const handleBackHome = () => {
    router.push('/quizz');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Chargement...</div>
        <div className={styles.subtitle}>Préparation de votre quiz</div>
        
        {/* Animation de chargement simple */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ 
            fontSize: '40px', 
            animation: 'pulse 1.5s infinite',
            color: '#3498db'
          }}>
            📚
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Oops ! 😕</div>
        <div className={styles.subtitle} style={{ color: '#e74c3c' }}>
          {error}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            className={styles.button}
            onClick={loadQuiz}
            style={{ marginRight: '15px' }}
          >
            🔄 Réessayer
          </button>
          
          <button 
            className={styles.button}
            onClick={handleBackHome}
            style={{ background: '#95a5a6' }}
          >
            🏠 Retour accueil
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Quiz introuvable</div>
        <div className={styles.subtitle}>
          Le quiz demandé n'existe pas ou n'est plus disponible
        </div>
        
        <button 
          className={styles.button}
          onClick={handleBackHome}
          style={{ margin: '40px auto', display: 'block' }}
        >
          🏠 Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Meta tags pour partage et accessibilité */}
      <head>
        <title>{quiz.title} - Quiz ACLEF</title>
        <meta name="description" content={`Jouez au quiz: ${quiz.title}. ${quiz.description || 'Quiz éducatif ACLEF'}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>

      <QuizPlayer 
        quiz={quiz}
        onComplete={handleQuizComplete}
      />
      
      {/* Bouton de sortie d'urgence */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        left: '20px',
        zIndex: 1000 
      }}>
        <button
          className={styles.button}
          onClick={handleBackHome}
          style={{ 
            background: '#95a5a6', 
            padding: '10px 15px',
            fontSize: '16px',
            minHeight: 'auto'
          }}
          aria-label="Quitter le quiz et retourner à l'accueil"
          title="Quitter le quiz"
        >
          🚪 Quitter
        </button>
      </div>
    </>
  );
}