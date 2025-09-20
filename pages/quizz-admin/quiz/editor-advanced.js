import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import ImageUpload from '../../../components/ImageUpload';
import OrderingEditor from '../../../components/QuestionTypes/OrderingEditor';
import MatchingEditor from '../../../components/QuestionTypes/MatchingEditor';
import NumericEditor from '../../../components/QuestionTypes/NumericEditor';
import MultipleChoiceEditor from '../../../components/QuestionTypes/MultipleChoiceEditor';
import AIQuizModifier from '../../../components/AIQuizModifier';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const QUESTION_TYPES = [
  { value: 'qcm', label: '🔘 QCM (Choix unique)', description: 'Une seule bonne réponse' },
  { value: 'multiple', label: '☑️ Choix multiples', description: 'Plusieurs bonnes réponses' },
  { value: 'truefalse', label: '✅❌ Vrai/Faux', description: 'Question binaire' },
  { value: 'numeric', label: '🔢 Numérique', description: 'Réponse numérique avec tolérance' },
  { value: 'text', label: '📝 Texte libre', description: 'Réponse textuelle' },
  { value: 'ordering', label: '🔀 Remise en ordre', description: 'Glisser-déposer pour ordonner' },
  { value: 'matching', label: '🔗 Association', description: 'Associer des éléments' }
];

export default function AdvancedQuizEditor() {
  const router = useRouter();
  const { id: editingQuizId } = router.query;
  
  // États principaux
  const [activeTab, setActiveTab] = useState('info');
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    questions: [],
    settings: {
      timeLimit: { enabled: false, type: 'quiz', duration: 300 },
      questionOrder: 'creation',
      maxAttempts: 0,
      passingScore: 50,
      shuffleAnswers: false
    },
    feedback: {
      timing: 'immediate',
      showExplanations: true,
      customSounds: { success: '', error: '' }
    },
    accessibility: {
      audio: { speechRate: 1.0, language: 'fr-FR', autoplay: true },
      visual: { fontSize: 'normal', contrast: 'normal', theme: 'light' }
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [showAIModifier, setShowAIModifier] = useState(false);

  // Charger l'utilisateur admin
  useEffect(() => {
    loadAdminUser();
  }, []);

  // Charger le quiz en mode édition
  useEffect(() => {
    if (editingQuizId) {
      loadQuiz(editingQuizId);
    }
  }, [editingQuizId]);

  // Charger un quiz depuis l'import CSV
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'csv') {
      const csvImportedQuiz = sessionStorage.getItem('csvImportedQuiz');
      if (csvImportedQuiz) {
        try {
          const importedData = JSON.parse(csvImportedQuiz);
          setQuiz(prev => ({
            ...prev,
            title: importedData.title,
            description: importedData.description,
            questions: importedData.questions || [],
            settings: { ...prev.settings, ...importedData.settings },
            feedback: { ...prev.feedback, ...importedData.feedback },
            accessibility: { ...prev.accessibility, ...importedData.accessibility }
          }));
          sessionStorage.removeItem('csvImportedQuiz');
          
          // Afficher une notification d'import réussi
          setTimeout(() => {
            alert('✅ Quiz importé depuis CSV avec succès ! Vous pouvez maintenant le modifier et le sauvegarder.');
          }, 500);
        } catch (err) {
          console.error('Erreur lors de l\'import CSV:', err);
        }
      }
    }
  }, []);

  const loadAdminUser = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', 'admin@aclef.fr')
        .single();
      if (data) setAdminUser(data);
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    }
  };

  const loadQuiz = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;

      if (data && data.quiz_data) {
        setQuiz(prev => ({
          title: data.title,
          description: data.description,
          questions: data.quiz_data.questions?.map(q => ({
            id: q.id || Date.now() + Math.random(),
            text: q.text,
            type: q.type || 'qcm',
            image_url: q.image_url,
            explanation: q.explanation || '',
            customMessage: q.customMessage || { success: '', error: '' },
            
            // QCM/Multiple answers
            answers: q.answers?.map(a => ({
              id: Date.now() + Math.random(),
              text: a.text,
              correct: a.correct,
              image_url: a.image_url
            })) || [],
            
            // Numeric
            correctAnswer: q.correctAnswer || '',
            tolerance: q.tolerance || 0,
            unit: q.unit || '',
            
            // Ordering
            items: q.items || [],
            
            // Matching
            leftColumn: q.leftColumn || [],
            rightColumn: q.rightColumn || [],
            
            // Multiple choice
            minCorrect: q.minCorrect || 1
          })) || [],
          settings: {
            ...prev.settings,
            ...data.quiz_data.settings
          },
          feedback: {
            ...prev.feedback,
            ...data.quiz_data.feedback
          },
          accessibility: {
            ...prev.accessibility,
            ...data.quiz_data.accessibility
          }
        }));
      }
    } catch (err) {
      console.error('Erreur chargement quiz:', err);
      alert('Erreur lors du chargement du quiz');
    }
  };

  const updateQuizField = (field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const updateSettings = (field, value) => {
    setQuiz(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value }
    }));
  };

  const updateFeedback = (field, value) => {
    setQuiz(prev => ({
      ...prev,
      feedback: { ...prev.feedback, [field]: value }
    }));
  };

  const updateAccessibility = (category, field, value) => {
    setQuiz(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        [category]: { ...prev.accessibility[category], [field]: value }
      }
    }));
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now() + Math.random(),
      text: '',
      type: 'qcm',
      image_url: null,
      explanation: '',
      customMessage: { success: '', error: '' },
      answers: [
        { id: Date.now(), text: '', correct: false, image_url: null },
        { id: Date.now() + 1, text: '', correct: false, image_url: null }
      ]
    };
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId, field, value) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (questionId) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const duplicateQuestion = (questionId) => {
    const questionToDuplicate = quiz.questions.find(q => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: Date.now() + Math.random(),
        text: questionToDuplicate.text + ' (copie)',
        answers: questionToDuplicate.answers?.map(a => ({
          ...a,
          id: Date.now() + Math.random()
        }))
      };
      
      const questionIndex = quiz.questions.findIndex(q => q.id === questionId);
      const newQuestions = [...quiz.questions];
      newQuestions.splice(questionIndex + 1, 0, duplicatedQuestion);
      
      setQuiz(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  const handleAIModification = async (result) => {
    try {
      // Parser le CSV résultant
      const { parseCSV, validateCSV, convertCSVToQuizFormat } = await import('../../../lib/csv-parser');
      
      const parsed = parseCSV(result.csvContent);
      const validation = validateCSV(parsed);
      
      if (validation.isValid) {
        const converted = convertCSVToQuizFormat(validation);
        
        if (converted && converted.length > 0) {
          const modifiedQuiz = converted[0];
          
          // Mettre à jour le quiz avec les modifications
          setQuiz(prev => ({
            title: modifiedQuiz.title,
            description: modifiedQuiz.description,
            questions: modifiedQuiz.questions?.map(q => ({
              id: Date.now() + Math.random(),
              text: q.text,
              type: q.type || 'qcm',
              image_url: q.image_url,
              explanation: q.explanation || '',
              customMessage: q.customMessage || { success: '', error: '' },
              
              // QCM/Multiple answers
              answers: q.answers?.map(a => ({
                id: Date.now() + Math.random(),
                text: a.text,
                correct: a.correct,
                image_url: a.image_url
              })) || [],
              
              // Numeric
              correctAnswer: q.correctAnswer || '',
              tolerance: q.tolerance || 0,
              unit: q.unit || '',
              
              // Other types
              items: q.items || [],
              leftColumn: q.leftColumn || [],
              rightColumn: q.rightColumn || [],
              minCorrect: q.minCorrect || 1
            })) || [],
            settings: { ...prev.settings, ...modifiedQuiz.settings },
            feedback: { ...prev.feedback, ...modifiedQuiz.feedback },
            accessibility: { ...prev.accessibility, ...modifiedQuiz.accessibility }
          }));
          
          setShowAIModifier(false);
          alert('✅ Quiz modifié avec succès par l\'IA !\n\n🎯 Modification appliquée: ' + result.modificationApplied);
        } else {
          throw new Error('Impossible de convertir le quiz modifié');
        }
      } else {
        throw new Error('Le quiz modifié contient des erreurs: ' + validation.errors.join(', '));
      }
      
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('❌ Erreur lors de la modification: ' + error.message);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!quiz.title.trim()) {
      alert('Le titre du quiz est obligatoire');
      setActiveTab('info');
      return;
    }

    if (quiz.questions.length === 0) {
      alert('Le quiz doit contenir au moins une question');
      setActiveTab('questions');
      return;
    }

    // Validation des questions
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.text.trim()) {
        alert(`La question ${i + 1} doit avoir un texte`);
        setActiveTab('questions');
        return;
      }

      if (['qcm', 'multiple', 'truefalse'].includes(q.type)) {
        const correctAnswers = q.answers?.filter(a => a.correct) || [];
        if (correctAnswers.length === 0) {
          alert(`La question ${i + 1} doit avoir au moins une bonne réponse`);
          setActiveTab('questions');
          return;
        }
      }

      if (q.type === 'numeric' && (q.correctAnswer === '' || q.correctAnswer === null)) {
        alert(`La question ${i + 1} (numérique) doit avoir une réponse correcte`);
        setActiveTab('questions');
        return;
      }
    }

    setSaving(true);
    try {
      const quizData = {
        title: quiz.title,
        description: quiz.description,
        quiz_data: {
          settings: quiz.settings,
          feedback: quiz.feedback,
          accessibility: quiz.accessibility,
          questions: quiz.questions.map((q, index) => ({
            id: index + 1,
            text: q.text,
            type: q.type,
            image_url: q.image_url,
            explanation: q.explanation,
            customMessage: q.customMessage,
            
            // QCM/Multiple answers
            answers: q.answers?.map((a, aIndex) => ({
              id: String.fromCharCode(97 + aIndex),
              text: a.text,
              correct: a.correct,
              image_url: a.image_url
            })),
            
            // Numeric
            correctAnswer: q.correctAnswer,
            tolerance: q.tolerance,
            unit: q.unit,
            
            // Ordering
            items: q.items,
            
            // Matching
            leftColumn: q.leftColumn,
            rightColumn: q.rightColumn,
            
            // Multiple choice
            minCorrect: q.minCorrect
          }))
        },
        is_active: true,
        created_by: adminUser?.id
      };

      let result;
      if (editingQuizId) {
        result = await supabase
          .from('quiz')
          .update(quizData)
          .eq('id', editingQuizId);
      } else {
        result = await supabase
          .from('quiz')
          .insert([quizData]);
      }

      if (result.error) throw result.error;

      alert(editingQuizId ? 'Quiz modifié avec succès !' : 'Quiz créé avec succès !');
      router.push('/admin/quiz');

    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFeedbackTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>💬 Options de Feedback</h3>
      
      {/* Timing du feedback */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>⏰ Moment du feedback</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '10px',
            border: '2px solid ' + (quiz.feedback.timing === 'immediate' ? '#007bff' : '#dee2e6'),
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: quiz.feedback.timing === 'immediate' ? '#e3f2fd' : 'white'
          }}>
            <input
              type="radio"
              name="feedbackTiming"
              checked={quiz.feedback.timing === 'immediate'}
              onChange={() => updateFeedback('timing', 'immediate')}
              style={{ transform: 'scale(1.2)' }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>⚡ Immédiat</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Feedback affiché après chaque question
              </div>
            </div>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '10px',
            border: '2px solid ' + (quiz.feedback.timing === 'end' ? '#007bff' : '#dee2e6'),
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: quiz.feedback.timing === 'end' ? '#e3f2fd' : 'white'
          }}>
            <input
              type="radio"
              name="feedbackTiming"
              checked={quiz.feedback.timing === 'end'}
              onChange={() => updateFeedback('timing', 'end')}
              style={{ transform: 'scale(1.2)' }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>📋 À la fin</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Feedback affiché à la fin du quiz
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Explications */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>📖 Explications</h4>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={quiz.feedback.showExplanations}
            onChange={(e) => updateFeedback('showExplanations', e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontWeight: 'bold' }}>Afficher les explications des réponses</span>
        </label>
        
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          💡 Les explications saisies dans chaque question seront affichées avec le feedback
        </div>
      </div>

      {/* Sons personnalisés */}
      <div style={{ 
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>🔊 Sons personnalisés</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#28a745' }}>
              Son de succès
            </label>
            <input
              type="text"
              value={quiz.feedback.customSounds.success}
              onChange={(e) => updateFeedback('customSounds', {
                ...quiz.feedback.customSounds,
                success: e.target.value
              })}
              placeholder="/audio/success.mp3"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#dc3545' }}>
              Son d'erreur
            </label>
            <input
              type="text"
              value={quiz.feedback.customSounds.error}
              onChange={(e) => updateFeedback('customSounds', {
                ...quiz.feedback.customSounds,
                error: e.target.value
              })}
              placeholder="/audio/error.mp3"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#fff3cd',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#856404'
        }}>
          🎵 Laissez vide pour utiliser les sons par défaut. Formats supportés : MP3, WAV, OGG
        </div>
      </div>
    </div>
  );

  const renderAccessibilityTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>♿ Options d'Accessibilité</h3>
      
      {/* Options audio */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>🔊 Synthèse vocale</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Vitesse de lecture
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={quiz.accessibility.audio.speechRate}
              onChange={(e) => updateAccessibility('audio', 'speechRate', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
              {quiz.accessibility.audio.speechRate}x
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Langue
            </label>
            <select
              value={quiz.accessibility.audio.language}
              onChange={(e) => updateAccessibility('audio', 'language', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            >
              <option value="fr-FR">Français (France)</option>
              <option value="fr-CA">Français (Canada)</option>
              <option value="fr-CH">Français (Suisse)</option>
              <option value="fr-BE">Français (Belgique)</option>
            </select>
          </div>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={quiz.accessibility.audio.autoplay}
            onChange={(e) => updateAccessibility('audio', 'autoplay', e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontWeight: 'bold' }}>Lecture automatique des questions</span>
        </label>
      </div>

      {/* Options visuelles */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>👁️ Options visuelles</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Taille de police
            </label>
            <select
              value={quiz.accessibility.visual.fontSize}
              onChange={(e) => updateAccessibility('visual', 'fontSize', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            >
              <option value="small">Petite</option>
              <option value="normal">Normale</option>
              <option value="large">Grande</option>
              <option value="xl">Très grande</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Contraste
            </label>
            <select
              value={quiz.accessibility.visual.contrast}
              onChange={(e) => updateAccessibility('visual', 'contrast', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            >
              <option value="normal">Normal</option>
              <option value="high">Élevé</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Thème
            </label>
            <select
              value={quiz.accessibility.visual.theme}
              onChange={(e) => updateAccessibility('visual', 'theme', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="dyslexia">Dyslexie</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aperçu des paramètres */}
      <div style={{ 
        padding: '15px',
        backgroundColor: '#e8f5e8',
        border: '1px solid #28a745',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#155724' }}>✅ Configuration actuelle</h4>
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Synthèse vocale :</strong> {quiz.accessibility.audio.language} à {quiz.accessibility.audio.speechRate}x</li>
          <li><strong>Lecture auto :</strong> {quiz.accessibility.audio.autoplay ? 'Activée' : 'Désactivée'}</li>
          <li><strong>Interface :</strong> Police {quiz.accessibility.visual.fontSize}, contraste {quiz.accessibility.visual.contrast}, thème {quiz.accessibility.visual.theme}</li>
        </ul>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>👁️ Aperçu du Quiz</h3>
      
      {quiz.questions.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '50px',
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
          <h4>Aucune question à prévisualiser</h4>
          <p>Ajoutez des questions pour voir l'aperçu du quiz</p>
        </div>
      ) : (
        <div>
          {/* En-tête du quiz */}
          <div style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '1px solid #bbdefb'
          }}>
            <h2 style={{ marginTop: 0, color: '#1976d2' }}>{quiz.title || 'Titre du quiz'}</h2>
            {quiz.description && (
              <p style={{ marginBottom: '15px', color: '#455a64' }}>{quiz.description}</p>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px' }}>
              <div><strong>📊 Questions :</strong> {quiz.questions.length}</div>
              <div><strong>⏱️ Temps :</strong> {
                quiz.settings.timeLimit.enabled 
                  ? `${Math.floor(quiz.settings.timeLimit.duration / 60)}:${String(quiz.settings.timeLimit.duration % 60).padStart(2, '0')}`
                  : 'Illimité'
              }</div>
              <div><strong>🎯 Score min. :</strong> {quiz.settings.passingScore}%</div>
              <div><strong>🔄 Tentatives :</strong> {quiz.settings.maxAttempts || 'Illimitées'}</div>
            </div>
          </div>

          {/* Aperçu des questions */}
          {quiz.questions.map((question, index) => (
            <div key={question.id} style={{ 
              marginBottom: '25px',
              padding: '20px',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              backgroundColor: 'white'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  minWidth: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#007bff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, color: '#495057' }}>{question.text || 'Question sans texte'}</h4>
                  <div style={{
                    marginTop: '5px',
                    padding: '4px 8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#6c757d',
                    display: 'inline-block'
                  }}>
                    {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                  </div>
                </div>
              </div>

              {/* Image de la question */}
              {question.image_url && (
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                  <img 
                    src={question.image_url}
                    alt="Question"
                    style={{ 
                      maxWidth: '300px', 
                      maxHeight: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}

              {/* Réponses selon le type */}
              {(['qcm', 'truefalse', 'multiple'].includes(question.type)) && question.answers && (
                <div style={{ paddingLeft: '20px' }}>
                  <strong style={{ display: 'block', marginBottom: '10px', color: '#495057' }}>
                    Réponses :
                  </strong>
                  {question.answers.map((answer, aIndex) => (
                    <div key={answer.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '8px',
                      padding: '8px',
                      backgroundColor: answer.correct ? '#d4edda' : '#f8f9fa',
                      borderRadius: '5px',
                      border: answer.correct ? '1px solid #c3e6cb' : '1px solid #dee2e6'
                    }}>
                      <span style={{ 
                        width: '25px',
                        height: '25px',
                        borderRadius: '50%',
                        backgroundColor: answer.correct ? '#28a745' : '#6c757d',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {String.fromCharCode(65 + aIndex)}
                      </span>
                      <span style={{ flex: 1 }}>{answer.text}</span>
                      {answer.correct && <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}
                      {answer.image_url && (
                        <img 
                          src={answer.image_url} 
                          alt="Réponse"
                          style={{ 
                            width: '30px', 
                            height: '30px', 
                            objectFit: 'cover',
                            borderRadius: '3px'
                          }} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Réponse numérique */}
              {question.type === 'numeric' && (
                <div style={{ paddingLeft: '20px' }}>
                  <strong style={{ color: '#495057' }}>Réponse correcte :</strong>{' '}
                  <span style={{ 
                    padding: '4px 8px',
                    backgroundColor: '#d4edda',
                    borderRadius: '15px',
                    fontWeight: 'bold',
                    color: '#155724'
                  }}>
                    {question.correctAnswer}
                    {question.tolerance > 0 && ` (±${question.tolerance})`}
                    {question.unit && ` ${question.unit}`}
                  </span>
                </div>
              )}

              {/* Éléments à ordonner */}
              {question.type === 'ordering' && question.items && (
                <div style={{ paddingLeft: '20px' }}>
                  <strong style={{ display: 'block', marginBottom: '10px', color: '#495057' }}>
                    Ordre correct :
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {question.items
                      .sort((a, b) => a.correctOrder - b.correctOrder)
                      .map((item, index) => (
                        <div key={item.id} style={{
                          padding: '8px 12px',
                          backgroundColor: '#e3f2fd',
                          border: '1px solid #bbdefb',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}. {item.text}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Associations */}
              {question.type === 'matching' && question.leftColumn && question.rightColumn && (
                <div style={{ paddingLeft: '20px' }}>
                  <strong style={{ display: 'block', marginBottom: '10px', color: '#495057' }}>
                    Associations correctes :
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                    {question.rightColumn.map(rightItem => {
                      const leftItem = question.leftColumn.find(l => l.id === rightItem.matchWith);
                      return (
                        <div key={rightItem.id} style={{
                          padding: '10px',
                          backgroundColor: '#fff3cd',
                          border: '1px solid #ffeaa7',
                          borderRadius: '5px',
                          fontSize: '14px'
                        }}>
                          <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                            {leftItem?.text || leftItem?.id?.toUpperCase()}
                          </span>
                          {' ↔ '}
                          <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                            {rightItem.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explication */}
              {question.explanation && (
                <div style={{ 
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '5px',
                  fontSize: '13px',
                  borderLeft: '4px solid #007bff'
                }}>
                  <strong style={{ color: '#007bff' }}>💡 Explication :</strong> {question.explanation}
                </div>
              )}
            </div>
          ))}

          {/* Actions d'aperçu */}
          <div style={{ 
            textAlign: 'center',
            marginTop: '30px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ 
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#1976d2'
            }}>
              💡 <strong>Astuce :</strong> Utilisez l'IA pour améliorer automatiquement vos questions !
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAIModifier(true)}
                style={{
                  padding: '12px 25px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,123,255,0.3)'
                }}
              >
                🤖 Modifier avec l'IA
              </button>
              
              <button
                onClick={handleSave}
                style={{
                  padding: '12px 25px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                💾 Sauvegarder et tester
              </button>
              
              <button
                onClick={() => {
                  if (quiz.questions.length > 0) {
                    window.open(`/apprenant/quiz/test-preview?data=${encodeURIComponent(JSON.stringify({
                      title: quiz.title,
                      description: quiz.description,
                      questions: quiz.questions,
                      settings: quiz.settings
                    }))}`, '_blank');
                  } else {
                    alert('Ajoutez au moins une question pour tester le quiz');
                  }
                }}
                style={{
                  padding: '12px 25px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🚀 Tester maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Styles pour les onglets
  const tabStyle = (tabName) => ({
    padding: '12px 20px',
    border: 'none',
    backgroundColor: activeTab === tabName ? '#007bff' : '#f8f9fa',
    color: activeTab === tabName ? 'white' : '#495057',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    fontWeight: activeTab === tabName ? 'bold' : 'normal',
    transition: 'all 0.2s ease'
  });

  const renderInfoTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>📝 Informations générales</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Titre du Quiz *
        </label>
        <input
          type="text"
          value={quiz.title}
          onChange={(e) => updateQuizField('title', e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #007bff',
            borderRadius: '8px',
            fontSize: '16px'
          }}
          placeholder="Ex: Quiz de Français - Les couleurs"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Description
        </label>
        <textarea
          value={quiz.description}
          onChange={(e) => updateQuizField('description', e.target.value)}
          rows="4"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical'
          }}
          placeholder="Description optionnelle du quiz..."
        />
      </div>

      <div style={{ 
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ marginTop: 0, color: '#1976d2' }}>📊 Aperçu du quiz</h4>
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Questions :</strong> {quiz.questions.length}</li>
          <li><strong>Types utilisés :</strong> {
            [...new Set(quiz.questions.map(q => QUESTION_TYPES.find(t => t.value === q.type)?.label))].join(', ') || 'Aucun'
          }</li>
          <li><strong>Temps limite :</strong> {
            quiz.settings?.timeLimit?.enabled 
              ? `${Math.floor(quiz.settings.timeLimit.duration / 60)}:${String(quiz.settings.timeLimit.duration % 60).padStart(2, '0')}`
              : 'Aucune limite'
          }</li>
        </ul>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>⚙️ Paramètres du Quiz</h3>
      
      {/* Temps limite */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>⏱️ Temps limite</h4>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={quiz.settings.timeLimit.enabled}
              onChange={(e) => updateSettings('timeLimit', {
                ...quiz.settings.timeLimit,
                enabled: e.target.checked
              })}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontWeight: 'bold' }}>Activer la limitation de temps</span>
          </label>
        </div>
        
        {quiz.settings.timeLimit.enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Type de limite
              </label>
              <select
                value={quiz.settings.timeLimit.type}
                onChange={(e) => updateSettings('timeLimit', {
                  ...quiz.settings.timeLimit,
                  type: e.target.value
                })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '5px'
                }}
              >
                <option value="quiz">Pour tout le quiz</option>
                <option value="question">Par question</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Durée (secondes)
              </label>
              <input
                type="number"
                min="30"
                max="3600"
                value={quiz.settings.timeLimit.duration}
                onChange={(e) => updateSettings('timeLimit', {
                  ...quiz.settings.timeLimit,
                  duration: parseInt(e.target.value) || 300
                })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '5px'
                }}
              />
              <small style={{ color: '#6c757d' }}>
                {Math.floor(quiz.settings.timeLimit.duration / 60)}:{String(quiz.settings.timeLimit.duration % 60).padStart(2, '0')}
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Ordre des questions */}
      <div style={{ 
        marginBottom: '25px',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>🔀 Ordre des questions</h4>
        
        <select
          value={quiz.settings.questionOrder}
          onChange={(e) => updateSettings('questionOrder', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          <option value="creation">Ordre de création</option>
          <option value="random">Ordre aléatoire</option>
          <option value="level">Par niveau de difficulté</option>
        </select>
      </div>

      {/* Tentatives et score */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginBottom: '25px'
      }}>
        <div style={{ 
          padding: '15px',
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}>
          <h4 style={{ marginTop: 0, color: '#495057' }}>🔄 Tentatives max.</h4>
          <input
            type="number"
            min="0"
            max="10"
            value={quiz.settings.maxAttempts}
            onChange={(e) => updateSettings('maxAttempts', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              fontSize: '16px',
              textAlign: 'center'
            }}
          />
          <small style={{ color: '#6c757d' }}>0 = illimité</small>
        </div>
        
        <div style={{ 
          padding: '15px',
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}>
          <h4 style={{ marginTop: 0, color: '#495057' }}>🎯 Score minimum (%)</h4>
          <input
            type="range"
            min="0"
            max="100"
            value={quiz.settings.passingScore}
            onChange={(e) => updateSettings('passingScore', parseInt(e.target.value))}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <div style={{ 
            textAlign: 'center', 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: quiz.settings.passingScore >= 50 ? '#28a745' : '#dc3545'
          }}>
            {quiz.settings.passingScore}%
          </div>
        </div>
      </div>

      {/* Randomisation */}
      <div style={{ 
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginTop: 0, color: '#495057' }}>🎲 Randomisation</h4>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={quiz.settings.shuffleAnswers}
            onChange={(e) => updateSettings('shuffleAnswers', e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span>Mélanger l'ordre des réponses</span>
        </label>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px' 
      }}>
        <h1 style={{ margin: 0 }}>
          {editingQuizId ? '✏️ Éditer le Quiz' : '➕ Créer un Quiz'}
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Bouton IA - disponible dès qu'il y a des questions ou un titre */}
          {(quiz.questions.length > 0 || quiz.title.trim()) && (
            <button
              onClick={() => setShowAIModifier(true)}
              disabled={saving || quiz.questions.length === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: quiz.questions.length === 0 ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (saving || quiz.questions.length === 0) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: (saving || quiz.questions.length === 0) ? 0.6 : 1,
                boxShadow: quiz.questions.length > 0 ? '0 2px 4px rgba(0,123,255,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title={quiz.questions.length === 0 ? 'Ajoutez au moins une question pour utiliser l\'IA' : 'Modifier ce quiz avec l\'IA'}
            >
              🤖 Modifier avec l'IA
            </button>
          )}
          
          <button 
            onClick={() => router.push('/admin/quiz')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #dee2e6',
        marginBottom: '0'
      }}>
        <button onClick={() => setActiveTab('info')} style={tabStyle('info')}>
          📝 Informations
        </button>
        <button onClick={() => setActiveTab('questions')} style={tabStyle('questions')}>
          ❓ Questions ({quiz.questions.length})
        </button>
        <button onClick={() => setActiveTab('settings')} style={tabStyle('settings')}>
          ⚙️ Paramètres
        </button>
        <button onClick={() => setActiveTab('feedback')} style={tabStyle('feedback')}>
          💬 Feedback
        </button>
        <button onClick={() => setActiveTab('accessibility')} style={tabStyle('accessibility')}>
          ♿ Accessibilité
        </button>
        <button onClick={() => setActiveTab('preview')} style={tabStyle('preview')}>
          👁️ Aperçu
        </button>
      </div>

      {/* Contenu des onglets */}
      <div style={{ 
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        minHeight: '500px'
      }}>
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'questions' && (
          <div style={{ padding: '20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#007bff' }}>❓ Questions du Quiz</h3>
              <button
                onClick={addQuestion}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ➕ Ajouter une question
              </button>
            </div>

            {quiz.questions.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '50px',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>❓</div>
                <h4>Aucune question pour le moment</h4>
                <p>Cliquez sur "Ajouter une question" pour commencer</p>
              </div>
            ) : (
              quiz.questions.map((question, index) => (
                <QuestionEditor 
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={(field, value) => updateQuestion(question.id, field, value)}
                  onRemove={() => removeQuestion(question.id)}
                  onDuplicate={() => duplicateQuestion(question.id)}
                />
              ))
            )}
          </div>
        )}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'feedback' && renderFeedbackTab()}
        {activeTab === 'accessibility' && renderAccessibilityTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </div>

      {/* Composant de modification IA */}
      {showAIModifier && (
        <AIQuizModifier
          currentQuiz={quiz}
          onModificationComplete={handleAIModification}
          onCancel={() => setShowAIModifier(false)}
        />
      )}
    </div>
  );
}

// Composant éditeur de question
function QuestionEditor({ question, index, onUpdate, onRemove, onDuplicate }) {
  const [collapsed, setCollapsed] = useState(false);

  const renderQuestionTypeEditor = () => {
    switch (question.type) {
      case 'ordering':
        return (
          <OrderingEditor 
            question={question}
            onChange={onUpdate}
          />
        );
      case 'matching':
        return (
          <MatchingEditor
            question={question}
            onChange={onUpdate}
          />
        );
      case 'numeric':
        return (
          <NumericEditor
            question={question}
            onChange={onUpdate}
          />
        );
      case 'multiple':
        return (
          <MultipleChoiceEditor
            question={question}
            onChange={onUpdate}
          />
        );
      default:
        // QCM classique
        return (
          <div style={{ marginTop: '15px' }}>
            {question.answers?.map((answer, aIndex) => (
              <div key={answer.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                marginBottom: '10px'
              }}>
                <input
                  type={question.type === 'truefalse' ? 'radio' : 'radio'}
                  name={`correct-${question.id}`}
                  checked={answer.correct}
                  onChange={() => {
                    const newAnswers = question.answers.map(a => ({
                      ...a,
                      correct: a.id === answer.id
                    }));
                    onUpdate('answers', newAnswers);
                  }}
                />
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => {
                    const newAnswers = question.answers.map(a =>
                      a.id === answer.id ? { ...a, text: e.target.value } : a
                    );
                    onUpdate('answers', newAnswers);
                  }}
                  placeholder={`Réponse ${String.fromCharCode(65 + aIndex)}`}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '5px'
                  }}
                />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div style={{ 
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      marginBottom: '20px',
      backgroundColor: 'white'
    }}>
      {/* En-tête de la question */}
      <div style={{ 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            {collapsed ? '▶️' : '🔽'}
          </button>
          <h4 style={{ margin: 0 }}>Question {index + 1}</h4>
          <div style={{
            padding: '4px 8px',
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {QUESTION_TYPES.find(t => t.value === question.type)?.label}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={onDuplicate}
            style={{
              padding: '5px 10px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📋 Dupliquer
          </button>
          <button
            onClick={onRemove}
            style={{
              padding: '5px 10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>

      {/* Contenu de la question */}
      {!collapsed && (
        <div style={{ padding: '20px' }}>
          {/* Texte de la question */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Texte de la question *
            </label>
            <textarea
              value={question.text}
              onChange={(e) => onUpdate('text', e.target.value)}
              rows="2"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                fontSize: '14px'
              }}
              placeholder="Saisissez votre question ici..."
            />
          </div>

          {/* Type de question */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Type de question
            </label>
            <select
              value={question.type}
              onChange={(e) => onUpdate('type', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            >
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Image de la question */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Image (optionnel)
            </label>
            <ImageUpload 
              onUploadSuccess={(url) => onUpdate('image_url', url)}
              buttonText="📷 Ajouter une image"
              buttonStyle={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #ddd',
                color: '#495057'
              }}
            />
            {question.image_url && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={question.image_url} 
                  alt="Question" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '150px',
                    borderRadius: '5px',
                    border: '1px solid #ddd'
                  }} 
                />
                <button
                  onClick={() => onUpdate('image_url', null)}
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Éditeur spécialisé par type */}
          {renderQuestionTypeEditor()}

          {/* Explication */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Explication (optionnel)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => onUpdate('explanation', e.target.value)}
              rows="2"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                fontSize: '12px'
              }}
              placeholder="Explication de la réponse (affichée après validation)"
            />
          </div>
        </div>
      )}
    </div>
  );
}