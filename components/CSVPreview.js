import { useState } from 'react';

export default function CSVPreview({ 
  csvData, 
  validationResult, 
  convertedQuizzes,
  onSave,
  onEditAdvanced,
  processing 
}) {
  // Automatiquement afficher l'onglet prévisualisation si le quiz est valide
  const [activeTab, setActiveTab] = useState(
    validationResult?.isValid && convertedQuizzes ? 'preview' : 'validation'
  );

  const renderValidationResults = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '10px 15px',
          borderRadius: '20px',
          backgroundColor: validationResult.isValid ? '#d4edda' : '#f8d7da',
          color: validationResult.isValid ? '#155724' : '#721c24',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {validationResult.isValid ? '✅ CSV Valide' : '❌ Erreurs détectées'}
        </div>
        
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          {validationResult.quizCount} quiz • {validationResult.questionCount} questions
        </div>
      </div>

      {/* Erreurs */}
      {validationResult.errors.length > 0 && (
        <div style={{ 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#f8d7da',
          borderRadius: '10px',
          border: '1px solid #f5c6cb'
        }}>
          <h4 style={{ color: '#721c24', marginTop: 0 }}>🚨 Erreurs à corriger :</h4>
          <ul style={{ marginBottom: 0 }}>
            {validationResult.errors.map((error, index) => (
              <li key={index} style={{ color: '#721c24', marginBottom: '5px' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Avertissements */}
      {validationResult.warnings.length > 0 && (
        <div style={{ 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#fff3cd',
          borderRadius: '10px',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ color: '#856404', marginTop: 0 }}>⚠️ Avertissements :</h4>
          <ul style={{ marginBottom: 0 }}>
            {validationResult.warnings.map((warning, index) => (
              <li key={index} style={{ color: '#856404', marginBottom: '5px' }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Récapitulatif par quiz */}
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ color: '#495057', marginTop: 0 }}>📊 Récapitulatif :</h4>
        {Object.entries(validationResult.quizGroups).map(([quizTitle, questions]) => (
          <div key={quizTitle} style={{ 
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h5 style={{ margin: 0, color: '#007bff' }}>{quizTitle}</h5>
              <span style={{ 
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                padding: '5px 10px',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {questions.length} questions
              </span>
            </div>
            <p style={{ margin: '10px 0 0', color: '#6c757d', fontSize: '14px' }}>
              {questions[0]?.quiz_description || 'Pas de description'}
            </p>
            
            {/* Types de questions */}
            <div style={{ marginTop: '10px' }}>
              {[...new Set(questions.map(q => q.question_type))].map(type => (
                <span key={type} style={{
                  display: 'inline-block',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  marginRight: '5px',
                  marginTop: '5px',
                  border: '1px solid #dee2e6'
                }}>
                  {type}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRawData = () => (
    <div>
      <h4 style={{ color: '#495057', marginBottom: '20px' }}>📋 Données CSV brutes</h4>
      
      <div style={{ 
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid #dee2e6',
        marginBottom: '20px'
      }}>
        <h5 style={{ color: '#495057', marginTop: 0 }}>En-têtes détectés :</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {csvData.headers.map((header, index) => (
            <span key={index} style={{
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {header}
            </span>
          ))}
        </div>
      </div>

      <div style={{ 
        maxHeight: '400px', 
        overflow: 'auto',
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '10px'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ 
                padding: '10px', 
                textAlign: 'left',
                borderBottom: '1px solid #dee2e6',
                position: 'sticky',
                top: 0,
                backgroundColor: '#f8f9fa'
              }}>
                #
              </th>
              {csvData.headers.map((header, index) => (
                <th key={index} style={{ 
                  padding: '10px', 
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f8f9fa',
                  minWidth: '120px'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ 
                backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f8f9fa' 
              }}>
                <td style={{ 
                  padding: '8px', 
                  borderBottom: '1px solid #e9ecef',
                  fontWeight: 'bold',
                  color: '#6c757d'
                }}>
                  {rowIndex + 1}
                </td>
                {csvData.headers.map((header, cellIndex) => (
                  <td key={cellIndex} style={{ 
                    padding: '8px', 
                    borderBottom: '1px solid #e9ecef',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {row[header] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!convertedQuizzes || convertedQuizzes.length === 0) {
      return (
        <div style={{ 
          padding: '40px',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <p>Impossible de générer la prévisualisation car le CSV contient des erreurs.</p>
          <p>Veuillez corriger les erreurs dans l'onglet "Validation" et réimporter votre fichier.</p>
        </div>
      );
    }

    return (
      <div>
        {/* Banner d'information pour les quiz générés par IA */}
        <div style={{
          padding: '15px 20px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #28a745',
          borderRadius: '10px',
          marginBottom: '25px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <h4 style={{ margin: 0, color: '#155724' }}>Contenu généré par Intelligence Artificielle</h4>
          </div>
          <p style={{ margin: '8px 0', color: '#155724', fontSize: '14px' }}>
            ✅ Voici toutes les <strong>questions et réponses</strong> que l'IA a générées pour votre quiz.
            <br />
            🎯 Vous pouvez <strong>voir chaque détail</strong> : texte des questions, réponses correctes/incorrectes, explications.
            <br />
            ✏️ Pour <strong>modifier ce contenu</strong>, cliquez sur le bouton "Modifier les questions et réponses" en haut.
          </p>
        </div>
        
        <h4 style={{ color: '#495057', marginBottom: '20px' }}>👀 Prévisualisation détaillée</h4>
        
        {convertedQuizzes.map((quiz, quizIndex) => (
          <div key={quizIndex} style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              borderBottom: '1px solid #e9ecef',
              paddingBottom: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#007bff' }}>{quiz.title}</h3>
              {quiz.description && (
                <p style={{ margin: '10px 0 0', color: '#6c757d' }}>{quiz.description}</p>
              )}
              <div style={{ 
                marginTop: '10px',
                display: 'flex',
                gap: '15px',
                fontSize: '14px',
                color: '#495057'
              }}>
                <span>⏱️ {quiz.settings.timeLimit.enabled ? `${quiz.settings.timeLimit.duration}s` : 'Pas de limite'}</span>
                <span>🎯 Note minimale: {quiz.settings.passingScore}%</span>
                <span>🔄 Tentatives: {quiz.settings.maxAttempts || 'Illimitées'}</span>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '15px' 
            }}>
              {quiz.questions.map((question, qIndex) => (
                <div key={qIndex} style={{ 
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <span style={{ 
                      backgroundColor: '#007bff',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {qIndex + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {question.type.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ 
                        margin: '0 0 10px 0', 
                        fontWeight: 'bold',
                        color: '#495057'
                      }}>
                        {question.text}
                      </p>
                      
                      {/* Réponses pour QCM/Multiple/TrueFalse */}
                      {question.answers && (
                        <div style={{ marginBottom: '10px' }}>
                          {question.answers.map((answer, aIndex) => (
                            <div key={aIndex} style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px',
                              backgroundColor: answer.correct ? '#d4edda' : 'white',
                              borderRadius: '5px',
                              marginBottom: '3px',
                              border: '1px solid ' + (answer.correct ? '#c3e6cb' : '#e9ecef')
                            }}>
                              <span style={{
                                color: answer.correct ? '#155724' : '#495057',
                                fontWeight: answer.correct ? 'bold' : 'normal'
                              }}>
                                {answer.correct ? '✅' : '⭕'} {answer.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Réponse numérique */}
                      {question.type === 'numeric' && (
                        <div style={{ 
                          padding: '8px',
                          backgroundColor: '#d4edda',
                          borderRadius: '5px',
                          border: '1px solid #c3e6cb',
                          marginBottom: '10px'
                        }}>
                          <span style={{ color: '#155724', fontWeight: 'bold' }}>
                            ✅ Réponse correcte: {question.correctAnswer}
                            {question.unit && ` ${question.unit}`}
                            {question.tolerance > 0 && ` (±${question.tolerance})`}
                          </span>
                        </div>
                      )}

                      {/* Réponse texte */}
                      {question.type === 'text' && (
                        <div style={{ 
                          padding: '8px',
                          backgroundColor: '#d4edda',
                          borderRadius: '5px',
                          border: '1px solid #c3e6cb',
                          marginBottom: '10px'
                        }}>
                          <span style={{ color: '#155724', fontWeight: 'bold' }}>
                            ✅ Réponse attendue: "{question.correctAnswer}"
                          </span>
                        </div>
                      )}

                      {/* Explication */}
                      {question.explanation && (
                        <div style={{ 
                          padding: '8px',
                          backgroundColor: '#fff3cd',
                          borderRadius: '5px',
                          border: '1px solid #ffeaa7',
                          fontSize: '13px'
                        }}>
                          <strong style={{ color: '#856404' }}>💡 Explication:</strong>
                          <span style={{ color: '#856404', marginLeft: '5px' }}>
                            {question.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header avec actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, color: '#495057' }}>📊 Analyse du fichier CSV</h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {validationResult.isValid && convertedQuizzes && (
            <>
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1976d2',
                fontWeight: 'bold',
                marginRight: '10px'
              }}>
                💡 Vous pouvez maintenant éditer ou sauvegarder
              </div>
              
              <button
                onClick={onEditAdvanced}
                disabled={processing}
                style={{
                  padding: '12px 25px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  opacity: processing ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(0,123,255,0.3)'
                }}
              >
                ✏️ Modifier les questions et réponses
              </button>
              
              <button
                onClick={onSave}
                disabled={processing}
                style={{
                  padding: '12px 25px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  opacity: processing ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(40,167,69,0.3)'
                }}
              >
                {processing ? '💾 Sauvegarde...' : '💾 Sauvegarder tel quel'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #e9ecef',
          backgroundColor: 'white',
          borderRadius: '10px 10px 0 0',
          overflow: 'hidden'
        }}>
          {[
            { id: 'validation', label: '🔍 Validation', icon: '🔍' },
            { id: 'preview', label: '👀 Prévisualisation', icon: '👀' },
            { id: 'raw', label: '📋 Données brutes', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '15px 25px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#495057',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                position: 'relative'
              }}
            >
              {tab.label}
              {tab.id === 'preview' && convertedQuizzes && (
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '10px',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  !
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu des onglets */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '0 0 10px 10px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {activeTab === 'validation' && renderValidationResults()}
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'raw' && renderRawData()}
      </div>
    </div>
  );
}