import { useState } from 'react';

export default function AIQuizGenerator({ onGenerate, processing }) {
  const [formData, setFormData] = useState({
    subject: '',
    level: '',
    questionCount: 10,
    questionTypes: ['qcm'],
    language: 'fr',
    difficulty: 'medium',
    includeImages: false,
    includeAudio: false,
    provider: 'gemini',
    apiKey: '',
    customInstructions: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const questionTypeOptions = [
    { value: 'qcm', label: '🔘 QCM (choix unique)', description: 'Une seule bonne réponse' },
    { value: 'multiple', label: '☑️ Choix multiples', description: 'Plusieurs bonnes réponses' },
    { value: 'truefalse', label: '✅❌ Vrai/Faux', description: 'Question binaire' },
    { value: 'numeric', label: '🔢 Numérique', description: 'Réponse chiffrée' },
    { value: 'text', label: '📝 Texte libre', description: 'Réponse courte' }
  ];

  const levelOptions = [
    { value: 'maternelle', label: '👶 Maternelle (3-6 ans)' },
    { value: 'cp', label: '📚 CP (6-7 ans)' },
    { value: 'ce1', label: '📖 CE1 (7-8 ans)' },
    { value: 'ce2', label: '📘 CE2 (8-9 ans)' },
    { value: 'cm1', label: '📙 CM1 (9-10 ans)' },
    { value: 'cm2', label: '📗 CM2 (10-11 ans)' },
    { value: '6eme', label: '🎓 6ème (11-12 ans)' },
    { value: '5eme', label: '🎓 5ème (12-13 ans)' },
    { value: '4eme', label: '🎓 4ème (13-14 ans)' },
    { value: '3eme', label: '🎓 3ème (14-15 ans)' },
    { value: 'lycee', label: '🏫 Lycée (15-18 ans)' },
    { value: 'superieur', label: '🎓 Supérieur (+18 ans)' },
    { value: 'adulte', label: '👥 Formation adulte' }
  ];

  const difficultyOptions = [
    { value: 'easy', label: '🟢 Facile', description: 'Questions de base' },
    { value: 'medium', label: '🟡 Moyen', description: 'Niveau standard' },
    { value: 'hard', label: '🔴 Difficile', description: 'Questions avancées' }
  ];

  const aiProviders = [
    { 
      value: 'openai', 
      label: '🤖 OpenAI GPT-4', 
      description: 'Le plus performant pour la génération éducative',
      keyPlaceholder: 'sk-...'
    },
    { 
      value: 'claude', 
      label: '🧠 Anthropic Claude', 
      description: 'Excellent pour les contenus pédagogiques',
      keyPlaceholder: 'sk-ant-...'
    },
    { 
      value: 'gemini', 
      label: '💎 Google Gemini', 
      description: 'Intégration native avec les services Google',
      keyPlaceholder: 'AIza...'
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionTypeToggle = (type) => {
    setFormData(prev => {
      const currentTypes = prev.questionTypes;
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      return {
        ...prev,
        questionTypes: newTypes.length > 0 ? newTypes : ['qcm'] // Au moins un type
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.subject.trim()) {
      alert('Veuillez saisir un sujet pour le quiz');
      return;
    }
    
    if (!formData.apiKey.trim()) {
      alert('Veuillez saisir votre clé API');
      return;
    }
    
    if (formData.questionCount < 1 || formData.questionCount > 50) {
      alert('Le nombre de questions doit être entre 1 et 50');
      return;
    }

    onGenerate(formData);
  };

  return (
    <div style={{ 
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '15px',
      border: '1px solid #dee2e6',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <form onSubmit={handleSubmit}>
        {/* Section Sujet Principal */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#28a745', marginBottom: '20px' }}>🎯 Sujet du Quiz</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              📚 Sujet et description *
            </label>
            <textarea
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Ex: Quiz sur les animaux de la ferme pour enfants de CE2. Inclure les cris des animaux, leur habitat et leur alimentation..."
              required
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '14px' }}>
              Plus vous êtes précis, meilleur sera le quiz généré !
            </small>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '20px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                🎓 Niveau scolaire *
              </label>
              <select
                value={formData.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Choisir un niveau</option>
                {levelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                🔢 Nombre de questions
              </label>
              <input
                type="number"
                value={formData.questionCount}
                onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value) || 1)}
                min="1"
                max="50"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#495057'
              }}>
                ⚡ Difficulté
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Types de Questions */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#495057', marginBottom: '15px' }}>❓ Types de questions</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '10px'
          }}>
            {questionTypeOptions.map(type => (
              <label key={type.value} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                backgroundColor: formData.questionTypes.includes(type.value) ? '#e3f2fd' : '#f8f9fa',
                borderRadius: '8px',
                border: `2px solid ${formData.questionTypes.includes(type.value) ? '#1976d2' : '#e9ecef'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={formData.questionTypes.includes(type.value)}
                  onChange={() => handleQuestionTypeToggle(type.value)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#495057' }}>{type.label}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Configuration IA */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#ff6b35', marginBottom: '20px' }}>🤖 Configuration IA</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              🔌 Fournisseur IA *
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '15px'
            }}>
              {aiProviders.map(provider => (
                <label key={provider.value} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '15px',
                  backgroundColor: formData.provider === provider.value ? '#fff3cd' : '#f8f9fa',
                  borderRadius: '10px',
                  border: `2px solid ${formData.provider === provider.value ? '#ffc107' : '#e9ecef'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="provider"
                    value={provider.value}
                    checked={formData.provider === provider.value}
                    onChange={(e) => handleInputChange('provider', e.target.value)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '5px' }}>
                      {provider.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      {provider.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              🔑 Clé API {aiProviders.find(p => p.value === formData.provider)?.label} *
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder={aiProviders.find(p => p.value === formData.provider)?.keyPlaceholder || 'Votre clé API'}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'monospace'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '14px' }}>
              🔒 Votre clé API n'est pas stockée et n'est utilisée que pour cette génération
            </small>
          </div>
        </div>

        {/* Options Avancées */}
        <div style={{ marginBottom: '30px' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#007bff',
              border: '2px solid #007bff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}
          >
            {showAdvanced ? '⬆️ Masquer les options avancées' : '⬇️ Afficher les options avancées'}
          </button>

          {showAdvanced && (
            <div style={{ 
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.includeImages}
                    onChange={(e) => handleInputChange('includeImages', e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#495057' }}>🖼️ Générer des images</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Via DALL-E ou recherche automatique</div>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.includeAudio}
                    onChange={(e) => handleInputChange('includeAudio', e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#495057' }}>🔊 Générer l'audio</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Synthèse vocale automatique</div>
                  </div>
                </label>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#495057'
                }}>
                  📝 Instructions personnalisées
                </label>
                <textarea
                  value={formData.customInstructions}
                  onChange={(e) => handleInputChange('customInstructions', e.target.value)}
                  placeholder="Instructions supplémentaires pour l'IA: style particulier, contraintes spécifiques, contexte additionnel..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bouton de génération */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            disabled={processing}
            style={{
              padding: '15px 40px',
              backgroundColor: processing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {processing ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Génération en cours...
              </>
            ) : (
              <>
                🚀 Générer le quiz avec l'IA
              </>
            )}
          </button>

          {!processing && (
            <p style={{ 
              marginTop: '15px', 
              color: '#6c757d', 
              fontSize: '14px' 
            }}>
              ⏱️ La génération peut prendre 30 secondes à 2 minutes selon la complexité
            </p>
          )}
        </div>
      </form>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}