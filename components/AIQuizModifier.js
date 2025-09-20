import { useState } from 'react';

export default function AIQuizModifier({ currentQuiz, onModificationComplete, onCancel }) {
  const [modificationRequest, setModificationRequest] = useState('');
  const [apiKey, setApiKey] = useState('AIzaSyDuSYWa7d2wKjmflh1Vwu1DsRWaIh-fDfA'); // Pré-rempli
  const [isModifying, setIsModifying] = useState(false);
  const [error, setError] = useState('');

  const exampleRequests = [
    {
      title: "Reformuler les réponses mathématiques",
      description: "Remplacer les résultats par des calculs",
      example: "Dans les réponses mathématiques, remplace les résultats simples par des calculs équivalents. Par exemple: '20' devient '4×5' ou '10+10', '15' devient '3×5' ou '20-5', etc."
    },
    {
      title: "Ajouter des explications détaillées", 
      description: "Enrichir les explications existantes",
      example: "Ajoute des explications plus détaillées pour chaque question, avec des exemples concrets et des méthodes de calcul étape par étape."
    },
    {
      title: "Modifier le niveau de difficulté",
      description: "Ajuster la complexité des questions",
      example: "Rends les questions plus faciles en simplifiant les nombres et les calculs pour un niveau CE1."
    },
    {
      title: "Personnaliser le vocabulaire",
      description: "Adapter les termes utilisés",
      example: "Remplace tous les mots techniques par des termes plus simples et ajoute des synonymes entre parenthèses."
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!modificationRequest.trim()) {
      setError('Veuillez décrire la modification souhaitée');
      return;
    }

    if (!apiKey.trim()) {
      setError('Clé API Gemini requise');
      return;
    }

    setIsModifying(true);
    setError('');

    try {
      const response = await fetch('/api/modify-quiz-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingQuiz: currentQuiz,
          modificationRequest,
          provider: 'gemini',
          apiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification');
      }

      const result = await response.json();
      onModificationComplete(result);

    } catch (err) {
      console.error('Erreur modification:', err);
      setError(err.message);
    } finally {
      setIsModifying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px' }}>
          <span style={{ fontSize: '32px', marginRight: '15px' }}>🤖</span>
          <h2 style={{ margin: 0, color: '#007bff' }}>Modifier le Quiz avec l'IA</h2>
          <button
            onClick={onCancel}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '10px', 
          marginBottom: '25px',
          border: '1px solid #bbdefb'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>📋 Quiz actuel</h4>
          <div style={{ fontSize: '14px', color: '#455a64' }}>
            <strong>Titre:</strong> {currentQuiz.title}<br />
            <strong>Questions:</strong> {currentQuiz.questions?.length || 0}<br />
            <strong>Types:</strong> {[...new Set(currentQuiz.questions?.map(q => q.type))].join(', ')}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              🎯 Décrivez la modification souhaitée *
            </label>
            <textarea
              value={modificationRequest}
              onChange={(e) => setModificationRequest(e.target.value)}
              placeholder="Exemple: Remplace les réponses '20' par '4×5' et '15' par '3×5' dans toutes les questions de mathématiques..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #007bff',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              disabled={isModifying}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#495057', marginBottom: '15px' }}>💡 Exemples de modifications</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {exampleRequests.map((example, index) => (
                <div 
                  key={index}
                  onClick={() => setModificationRequest(example.example)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
                    {example.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                    {example.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              🔑 Clé API Gemini
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={isModifying}
            />
          </div>

          {error && (
            <div style={{ 
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Erreur:</strong> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isModifying}
              style={{
                padding: '12px 25px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isModifying ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isModifying ? 0.6 : 1
              }}
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={isModifying || !modificationRequest.trim()}
              style={{
                padding: '12px 25px',
                backgroundColor: isModifying ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isModifying || !modificationRequest.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: (isModifying || !modificationRequest.trim()) ? 0.6 : 1,
                minWidth: '140px'
              }}
            >
              {isModifying ? '🤖 Modification...' : '🚀 Modifier avec l\'IA'}
            </button>
          </div>
        </form>

        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '6px',
          fontSize: '12px',
          color: '#856404',
          border: '1px solid #ffeaa7'
        }}>
          💡 <strong>Conseil:</strong> Soyez précis dans votre demande. L'IA modifiera uniquement ce que vous demandez et conservera le reste intact.
        </div>
      </div>
    </div>
  );
}