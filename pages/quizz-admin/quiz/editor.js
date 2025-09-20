import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import ImageUpload from '../../../components/ImageUpload';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuizEditor() {
  const router = useRouter();
  const { id: editingQuizId } = router.query; // ID du quiz a editer
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    questions: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Charger l'utilisateur admin au démarrage
  useEffect(() => {
    loadAdminUser();
  }, []);

  // Charger le quiz si mode edition
  useEffect(() => {
    if (editingQuizId) {
      loadQuiz(editingQuizId);
    }
  }, [editingQuizId]);

  const loadAdminUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (!error && data) {
        setAdminUser(data);
      } else {
        // Fallback: utiliser le premier utilisateur admin trouvé
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('email', 'admin@aclef.fr')
          .single();

        if (!adminError && adminData) {
          setAdminUser(adminData);
        } else {
          console.warn('Aucun utilisateur admin trouvé');
        }
      }
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      text: '',
      type: 'multiple-choice',
      answers: [],
      correctAnswer: '',
      image: null,
      audio: null
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const duplicateQuestion = (questionId) => {
    const questionToDuplicate = quiz.questions.find(q => q.id === questionId);
    if (!questionToDuplicate) return;

    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: Date.now(), // Nouvel ID unique
      text: `${questionToDuplicate.text} - Copie`,
      answers: questionToDuplicate.answers.map(answer => ({
        ...answer,
        id: Date.now() + Math.random() // Nouvel ID unique pour chaque reponse
      }))
    };

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, duplicatedQuestion]
    }));
  };

  const removeQuestion = (questionId) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
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

  const addAnswer = (questionId) => {
    const newAnswer = {
      id: Date.now(),
      text: '',
      isCorrect: false,
      image: null,
      audio: null
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { ...q, answers: [...(q.answers || []), newAnswer] }
          : q
      )
    }));
  };

  const removeAnswer = (questionId, answerId) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { ...q, answers: q.answers.filter(a => a.id !== answerId) }
          : q
      )
    }));
  };

  const updateAnswer = (questionId, answerId, field, value) => {
    console.log('🔧 updateAnswer appelé:', { questionId, answerId, field, value });
    
    setQuiz(prev => {
      console.log('📋 Avant mise à jour - questions:', prev.questions.length);
      prev.questions.forEach(q => {
        if (q.id === questionId) {
          console.log('📝 Question trouvée:', q.id, 'avec', q.answers.length, 'réponses');
          q.answers.forEach(a => console.log('  - Réponse:', a.id, a.text));
        }
      });
      
      const updated = {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionId 
            ? {
                ...q,
                answers: q.answers.map(a => {
                  if (a.id === answerId) {
                    console.log('✅ Mise à jour réponse:', a.id, field, '=', value);
                    return { ...a, [field]: value };
                  }
                  return a;
                })
              }
            : q
        )
      };
      
      console.log('📋 Après mise à jour terminée');
      return updated;
    });
  };

  // Validation du quiz
  const validateQuiz = () => {
    if (!quiz.title.trim()) {
      return 'Le titre du quiz est obligatoire';
    }
    
    if (quiz.questions.length === 0) {
      return 'Le quiz doit contenir au moins une question';
    }
    
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      
      if (!question.text.trim()) {
        return `La question ${i + 1} ne peut pas être vide`;
      }
      
      if (question.answers.length === 0) {
        return `La question ${i + 1} doit avoir au moins une réponse`;
      }
      
      const hasCorrectAnswer = question.answers.some(answer => answer.isCorrect);
      if (!hasCorrectAnswer) {
        return `La question ${i + 1} doit avoir au moins une bonne réponse`;
      }
    }
    
    return null; // Pas d'erreur
  };

  // Fonction de sauvegarde en base Supabase
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validation
      const validationError = validateQuiz();
      if (validationError) {
        throw new Error(validationError);
      }
      
      // Conversion vers format JSON pour Supabase
      const quizData = {
        questions: quiz.questions.map((q, index) => ({
          id: index + 1,
          text: q.text,
          image: q.image,
          image_url: q.image_url, // Ajouter le champ image_url
          audio: q.audio,
          type: q.type || 'qcm',
          answers: q.answers.map((a, aIndex) => ({
            id: String.fromCharCode(97 + aIndex), // a, b, c, d
            text: a.text,
            image: a.image,
            image_url: a.image_url, // Ajouter le champ image_url pour les réponses
            audio: a.audio,
            correct: a.isCorrect
          }))
        })),
        settings: {
          timeLimit: null,
          orderType: 'creation'
        }
      };
      
      // Recuperer ID admin (pour l'instant on utilise le premier admin)
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      let result;
      
      if (editingQuizId) {
        // Mode edition - UPDATE
        result = await supabase
          .from('quiz')
          .update({
            title: quiz.title,
            description: quiz.description,
            quiz_data: quizData,
            is_active: true
          })
          .eq('id', editingQuizId)
          .select();
      } else {
        // Mode creation - INSERT
        result = await supabase
          .from('quiz')
          .insert({
            title: quiz.title,
            description: quiz.description,
            created_by: adminUser?.id,
            quiz_data: quizData,
            is_active: true
          })
          .select();
      }
      
      const { data, error } = result;
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        alert(editingQuizId ? 'Quiz modifié avec succès!' : 'Quiz créé avec succès!');
        router.push('/admin/quiz');
      }
      
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
      alert('Erreur: ' + (err.message || 'Impossible de sauvegarder le quiz'));
    } finally {
      setSaving(false);
    }
  };

  // Fonction de chargement d'un quiz existant
  const loadQuiz = async (quizId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('quiz')
        .select('*')
        .eq('id', quizId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Conversion depuis format JSON vers state de l'editeur
        const loadedQuiz = {
          title: data.title,
          description: data.description || '',
          questions: data.quiz_data.questions.map(q => ({
            id: Date.now() + q.id,
            text: q.text,
            type: q.type || 'multiple-choice',
            image: q.image,
            image_url: q.image_url, // Charger les URLs Cloudinary
            audio: q.audio,
            answers: q.answers.map(a => ({
              id: Date.now() + Math.random(),
              text: a.text,
              isCorrect: a.correct,
              image: a.image,
              image_url: a.image_url, // Charger les URLs Cloudinary des réponses
              audio: a.audio
            }))
          }))
        };
        
        setQuiz(loadedQuiz);
      }
      
    } catch (err) {
      console.error('Erreur chargement quiz:', err);
      setError(err.message || 'Erreur lors du chargement');
      alert('Erreur: Impossible de charger le quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/quiz');
  };

  // Composant ImagePreview
  const ImagePreview = ({ src, onRemove, alt }) => {
    if (!src) return null;
    
    return (
      <div style={{ 
        position: 'relative', 
        display: 'inline-block', 
        marginTop: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        overflow: 'hidden'
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={src} 
          alt={alt} 
          style={{ 
            maxWidth: '200px', 
            maxHeight: '150px', 
            display: 'block',
            objectFit: 'cover'
          }} 
        />
        <button
          onClick={onRemove}
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '25px',
            height: '25px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}
        >
          ✕
        </button>
      </div>
    );
  };


  // Fonction de suppression d'image
  const removeImage = (type, questionId, answerIndex = null) => {
    if (type === 'question') {
      updateQuestion(questionId, 'image', null);
      updateQuestion(questionId, 'image_url', null);
    } else if (type === 'answer') {
      updateAnswer(questionId, answerIndex, 'image', null);
      updateAnswer(questionId, answerIndex, 'image_url', null);
    }
  };

  // State pour le popup TTS
  const [ttsPopup, setTtsPopup] = useState({
    isOpen: false,
    text: '',
    loading: false,
    type: null,
    questionId: null,
    answerIndex: null
  });

  // Composant AudioPreview
  const AudioPreview = ({ src, onRemove, filename }) => {
    if (!src) return null;
    
    return (
      <div style={{ 
        marginTop: '10px',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#495057', marginRight: '10px' }}>
            🔊 {filename || 'Audio file'}
          </span>
          <button
            onClick={onRemove}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            ✕
          </button>
        </div>
        <audio 
          controls 
          style={{ width: '100%', height: '32px' }}
          preload="metadata"
        >
          <source src={src} type="audio/mpeg" />
          <source src={src} type="audio/wav" />
          <source src={src} type="audio/ogg" />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </div>
    );
  };

  // Fonction de generation audio TTS
  const handleAudioGeneration = (text, type, questionId, answerIndex = null) => {
    setTtsPopup({
      isOpen: true,
      text: text || '',
      loading: false,
      type,
      questionId,
      answerIndex
    });
  };

  // Fonction d'upload audio
  const handleAudioUpload = (file, type, questionId, answerIndex = null) => {
    if (!file || !file.type.startsWith('audio/')) {
      alert('Veuillez selectionner un fichier audio valide (MP3, WAV, OGG).');
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    const audioData = {
      url: audioUrl,
      filename: file.name,
      size: file.size
    };
    
    if (type === 'question') {
      updateQuestion(questionId, 'audio', audioData);
    } else if (type === 'answer') {
      updateAnswer(questionId, answerIndex, 'audio', audioData);
    }
  };

  // Fonction de suppression audio
  const removeAudio = (type, questionId, answerIndex = null) => {
    if (type === 'question') {
      updateQuestion(questionId, 'audio', null);
    } else if (type === 'answer') {
      updateAnswer(questionId, answerIndex, 'audio', null);
    }
  };

  // Fonction pour generer TTS via API
  const generateTTS = async () => {
    if (!ttsPopup.text.trim()) {
      alert('Veuillez saisir un texte a convertir en audio.');
      return;
    }

    setTtsPopup(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: ttsPopup.text.trim() })
      });

      const data = await response.json();

      if (data.success) {
        const audioData = {
          url: data.url,
          filename: data.filename,
          size: data.size
        };

        if (ttsPopup.type === 'question') {
          updateQuestion(ttsPopup.questionId, 'audio', audioData);
        } else if (ttsPopup.type === 'answer') {
          updateAnswer(ttsPopup.questionId, ttsPopup.answerIndex, 'audio', audioData);
        }

        // Fermer le popup
        setTtsPopup({
          isOpen: false,
          text: '',
          loading: false,
          type: null,
          questionId: null,
          answerIndex: null
        });

        alert('Audio genere avec succes !');
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      alert(`Erreur reseau: ${error.message}`);
    } finally {
      setTtsPopup(prev => ({ ...prev, loading: false }));
    }
  };

  // Fermer popup TTS
  const closeTTSPopup = () => {
    setTtsPopup({
      isOpen: false,
      text: '',
      loading: false,
      type: null,
      questionId: null,
      answerIndex: null
    });
  };

  // Ajout d'un effet pour réinitialiser le scroll si bloqué
  useEffect(() => {
    // Forcer le body à être scrollable
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    return () => {
      // Nettoyer au démontage
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Éditeur de Quiz</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleBack}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Retour
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Sauvegarder
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
        <h2>Informations du Quiz</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Titre du Quiz
          </label>
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Entrez le titre du quiz"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description
          </label>
          <textarea
            value={quiz.description}
            onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Entrez la description du quiz"
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Questions ({quiz.questions.length})</h2>
          <button
            onClick={addQuestion}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            + Ajouter une question
          </button>
        </div>

        {quiz.questions.map((question, qIndex) => (
          <div 
            key={question.id} 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '1px solid #e9ecef'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Question {qIndex + 1}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => duplicateQuestion(question.id)}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Dupliquer cette question"
                >
                  📄 Dupliquer
                </button>
                <button
                  onClick={() => removeQuestion(question.id)}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Supprimer cette question"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Type de question
              </label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                style={{
                  width: '200px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
              >
                <option value="multiple-choice">QCM</option>
                <option value="true-false">Vrai/Faux</option>
                <option value="open-ended">Réponse libre</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Texte de la question
              </label>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                placeholder="Entrez votre question"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
              />
              
              <div style={{ marginTop: '10px' }}>
                <ImageUpload 
                  onUploadSuccess={(url) => {
                    updateQuestion(question.id, 'image_url', url);
                    updateQuestion(question.id, 'image', null);
                    console.log('✅ Image uploadée pour question:', question.id, url);
                  }}
                  buttonText="📷 Ajouter une image"
                  buttonStyle={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    color: '#495057',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => handleAudioGeneration(question.text, 'question', question.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 15px',
                    backgroundColor: '#17a2b8',
                    border: '1px solid #17a2b8',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
                >
                  🎤 Generer un son
                </button>

                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => e.target.files[0] && handleAudioUpload(e.target.files[0], 'question', question.id)}
                  style={{ display: 'none' }}
                  id={`question-audio-upload-${question.id}`}
                />
                <label
                  htmlFor={`question-audio-upload-${question.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 15px',
                    backgroundColor: '#6f42c1',
                    border: '1px solid #6f42c1',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#5a2d91'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#6f42c1'}
                >
                  📁 Uploader un son
                </label>
              </div>
              
              <ImagePreview 
                src={question.image_url || question.image} 
                onRemove={() => removeImage('question', question.id)}
                alt={`Image de la question ${qIndex + 1}`}
              />

              <AudioPreview 
                src={question.audio?.url} 
                onRemove={() => removeAudio('question', question.id)}
                filename={question.audio?.filename}
              />
            </div>

            {question.type === 'multiple-choice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold' }}>Réponses</label>
                  <button
                    onClick={() => addAnswer(question.id)}
                    style={{
                      padding: '5px 15px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Ajouter une réponse
                  </button>
                </div>
                
                {question.answers && question.answers.map((answer, aIndex) => (
                  <div 
                    key={answer.id}
                    style={{
                      marginBottom: '15px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '5px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(e) => updateAnswer(question.id, answer.id, 'isCorrect', e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) => updateAnswer(question.id, answer.id, 'text', e.target.value)}
                        placeholder={`Réponse ${aIndex + 1}`}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          fontSize: '16px'
                        }}
                      />
                      <ImageUpload 
                        onUploadSuccess={(url) => {
                          console.log('🚀 Début upload réponse:', question.id, answer.id, url);
                          updateAnswer(question.id, answer.id, 'image_url', url);
                          // Ne pas mettre image à null, juste vider l'ancien si nécessaire
                          if (answer.image) {
                            updateAnswer(question.id, answer.id, 'image', null);
                          }
                          console.log('✅ Image uploadée pour réponse:', question.id, answer.id, url);
                        }}
                        buttonText="📷"
                        buttonStyle={{
                          width: '32px',
                          height: '32px',
                          padding: '0',
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          color: '#495057',
                          fontSize: '16px'
                        }}
                      />

                      <button
                        onClick={() => handleAudioGeneration(answer.text, 'answer', question.id, answer.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          backgroundColor: '#17a2b8',
                          border: '1px solid #17a2b8',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'white',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
                        title="Generer un audio TTS pour cette reponse"
                      >
                        🎤
                      </button>

                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => e.target.files[0] && handleAudioUpload(e.target.files[0], 'answer', question.id, answer.id)}
                        style={{ display: 'none' }}
                        id={`answer-audio-upload-${question.id}-${answer.id}`}
                      />
                      <label
                        htmlFor={`answer-audio-upload-${question.id}-${answer.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          backgroundColor: '#6f42c1',
                          border: '1px solid #6f42c1',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'white',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a2d91'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6f42c1'}
                        title="Uploader un fichier audio pour cette reponse"
                      >
                        📁
                      </label>
                      
                      <button
                        onClick={() => removeAnswer(question.id, answer.id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Affichage de l'image de la réponse */}
                    {(answer.image_url || answer.image) && (
                      <div style={{ 
                        position: 'relative', 
                        display: 'inline-block', 
                        marginTop: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={answer.image_url || answer.image}
                          alt={`Image de la réponse ${aIndex + 1}`}
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '150px', 
                            display: 'block',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          onClick={() => removeImage('answer', question.id, answer.id)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            backgroundColor: 'rgba(220, 53, 69, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '25px',
                            height: '25px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    
                    <AudioPreview 
                      src={answer.audio?.url} 
                      onRemove={() => removeAudio('answer', question.id, answer.id)}
                      filename={answer.audio?.filename}
                    />
                  </div>
                ))}
              </div>
            )}

            {question.type === 'true-false' && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Réponse correcte
                </label>
                <select
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                  style={{
                    width: '150px',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Choisir</option>
                  <option value="true">Vrai</option>
                  <option value="false">Faux</option>
                </select>
              </div>
            )}

            {question.type === 'open-ended' && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Réponse attendue (guide)
                </label>
                <textarea
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                  placeholder="Entrez la réponse attendue ou les éléments clés"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {quiz.questions.length === 0 && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <p style={{ margin: 0, fontSize: '18px' }}>
              Aucune question ajoutée. Cliquez sur "Ajouter une question" pour commencer.
            </p>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '10px',
        borderTop: '2px solid #e9ecef',
        paddingTop: '20px'
      }}>
        <button 
          onClick={handleBack}
          style={{
            padding: '12px 30px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Annuler
        </button>
        <button 
          onClick={handleSave}
          style={{
            padding: '12px 30px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Sauvegarder le Quiz
        </button>
      </div>

      {/* Popup TTS */}
      {ttsPopup.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>
              🎤 Generer un audio TTS
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#34495e'
              }}>
                Texte a convertir en audio :
              </label>
              <textarea
                value={ttsPopup.text}
                onChange={(e) => setTtsPopup(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Saisissez le texte a convertir en audio..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'vertical'
                }}
              />
              <div style={{ 
                marginTop: '5px', 
                fontSize: '14px', 
                color: '#6c757d' 
              }}>
                Caracteres: {ttsPopup.text.length}/1000
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={closeTTSPopup}
                disabled={ttsPopup.loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: ttsPopup.loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: ttsPopup.loading ? 0.7 : 1
                }}
              >
                Annuler
              </button>
              
              <button
                onClick={generateTTS}
                disabled={ttsPopup.loading || !ttsPopup.text.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: ttsPopup.loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: ttsPopup.loading || !ttsPopup.text.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: ttsPopup.loading || !ttsPopup.text.trim() ? 0.7 : 1
                }}
              >
                {ttsPopup.loading ? '⏳ Generation...' : '🎵 Generer l\'audio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}