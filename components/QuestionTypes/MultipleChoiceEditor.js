import { useState } from 'react';
import ImageUpload from '../ImageUpload';

const MultipleChoiceEditor = ({ question, onChange }) => {
  const [answers, setAnswers] = useState(question.answers || [
    { id: Date.now(), text: '', correct: false, image_url: null },
    { id: Date.now() + 1, text: '', correct: false, image_url: null }
  ]);
  const [minCorrect, setMinCorrect] = useState(question.minCorrect || 1);

  const addAnswer = () => {
    const newAnswer = {
      id: Date.now(),
      text: '',
      correct: false,
      image_url: null
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    onChange('answers', newAnswers);
  };

  const removeAnswer = (id) => {
    const newAnswers = answers.filter(answer => answer.id !== id);
    setAnswers(newAnswers);
    onChange('answers', newAnswers);
  };

  const updateAnswer = (id, field, value) => {
    const newAnswers = answers.map(answer =>
      answer.id === id ? { ...answer, [field]: value } : answer
    );
    setAnswers(newAnswers);
    onChange('answers', newAnswers);
  };

  const handleMinCorrectChange = (value) => {
    const numValue = parseInt(value) || 1;
    setMinCorrect(numValue);
    onChange('minCorrect', numValue);
  };

  const correctCount = answers.filter(a => a.correct).length;
  const isValid = correctCount >= minCorrect && correctCount >= 1;

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0 }}>Choix multiples (plusieurs réponses possibles) :</h4>
        <div style={{ 
          padding: '5px 10px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '15px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#1976d2'
        }}>
          ☑️ Sélection multiple
        </div>
      </div>
      
      {/* Configuration minimum de réponses */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '10px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '5px' 
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Minimum de bonnes réponses requises :</span>
          <input
            type="number"
            min="1"
            max={answers.filter(a => a.correct).length || 1}
            value={minCorrect}
            onChange={(e) => handleMinCorrectChange(e.target.value)}
            style={{
              width: '60px',
              padding: '5px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '12px', color: '#856404' }}>
            sur {correctCount} réponse{correctCount > 1 ? 's' : ''} correcte{correctCount > 1 ? 's' : ''}
          </span>
        </label>
      </div>

      {/* Liste des réponses */}
      {answers.map((answer, index) => (
        <div key={answer.id} style={{ 
          marginBottom: '15px',
          padding: '15px',
          border: answer.correct ? '2px solid #28a745' : '1px solid #dee2e6',
          borderRadius: '8px',
          backgroundColor: answer.correct ? '#f8fff9' : '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            {/* Checkbox pour réponse correcte */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={answer.correct}
                onChange={(e) => updateAnswer(answer.id, 'correct', e.target.checked)}
                style={{ 
                  transform: 'scale(1.5)',
                  accentColor: '#28a745'
                }}
              />
            </div>
            
            {/* Numéro de la réponse */}
            <div style={{ 
              minWidth: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: answer.correct ? '#28a745' : '#6c757d',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginTop: '8px'
            }}>
              {String.fromCharCode(65 + index)}
            </div>
            
            {/* Contenu de la réponse */}
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={answer.text}
                onChange={(e) => updateAnswer(answer.id, 'text', e.target.value)}
                placeholder={`Réponse ${String.fromCharCode(65 + index)}`}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '16px',
                  marginBottom: '10px'
                }}
              />
              
              {/* Upload d'image pour la réponse */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ImageUpload 
                  onUploadSuccess={(url) => updateAnswer(answer.id, 'image_url', url)}
                  buttonText="📷 Image"
                  buttonStyle={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    color: '#495057'
                  }}
                />
                
                {answer.image_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={answer.image_url} 
                      alt={`Image réponse ${index + 1}`}
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        objectFit: 'cover',
                        borderRadius: '5px',
                        border: '1px solid #ddd'
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => updateAnswer(answer.id, 'image_url', null)}
                      style={{
                        padding: '4px 8px',
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
            </div>
            
            {/* Bouton supprimer réponse */}
            {answers.length > 2 && (
              <button
                type="button"
                onClick={() => removeAnswer(answer.id)}
                style={{
                  padding: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '8px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Bouton ajouter réponse */}
      <button
        type="button"
        onClick={addAnswer}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '15px'
        }}
      >
        + Ajouter une réponse
      </button>
      
      {/* Validation et aperçu */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: isValid ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isValid ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          {isValid ? '✅ Configuration valide' : '⚠️ Configuration incomplète'}
        </div>
        
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>
            <strong>{correctCount}</strong> réponse{correctCount > 1 ? 's' : ''} correcte{correctCount > 1 ? 's' : ''} 
            {correctCount >= minCorrect ? ' ✓' : ` (minimum ${minCorrect} requis) ❌`}
          </li>
          <li>
            L'apprenant devra sélectionner <strong>au minimum {minCorrect}</strong> bonne{minCorrect > 1 ? 's' : ''} réponse{minCorrect > 1 ? 's' : ''} 
            pour valider la question
          </li>
          {correctCount > 0 && (
            <li>
              <strong>Réponses correctes :</strong> {' '}
              {answers.filter(a => a.correct).map((a, i) => (
                <span key={a.id} style={{ color: '#28a745', fontWeight: 'bold' }}>
                  {i > 0 && ', '}{String.fromCharCode(65 + answers.indexOf(a))}
                </span>
              ))}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MultipleChoiceEditor;