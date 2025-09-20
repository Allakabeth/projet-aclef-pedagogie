import { useState } from 'react';

const NumericEditor = ({ question, onChange }) => {
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer || '');
  const [tolerance, setTolerance] = useState(question.tolerance || 0);
  const [unit, setUnit] = useState(question.unit || '');

  const handleAnswerChange = (value) => {
    setCorrectAnswer(value);
    onChange('correctAnswer', parseFloat(value) || 0);
  };

  const handleToleranceChange = (value) => {
    setTolerance(value);
    onChange('tolerance', parseFloat(value) || 0);
  };

  const handleUnitChange = (value) => {
    setUnit(value);
    onChange('unit', value);
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
      <h4 style={{ marginTop: 0 }}>Question numérique :</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold', 
            color: '#007bff' 
          }}>
            Réponse correcte *
          </label>
          <input
            type="number"
            step="any"
            value={correctAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Ex: 42"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #007bff',
              borderRadius: '5px',
              fontSize: '16px',
              textAlign: 'center'
            }}
          />
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            color: '#ffc107' 
          }}>
            Marge d'erreur (±)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={tolerance}
            onChange={(e) => handleToleranceChange(e.target.value)}
            placeholder="Ex: 0.5"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              fontSize: '14px',
              textAlign: 'center'
            }}
          />
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: 'bold',
            color: '#28a745' 
          }}>
            Unité (optionnel)
          </label>
          <input
            type="text"
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            placeholder="Ex: cm, €, %"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              fontSize: '14px',
              textAlign: 'center'
            }}
          />
        </div>
      </div>
      
      {/* Aperçu de la validation */}
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#e8f5e8', 
        borderRadius: '5px',
        border: '1px solid #28a745'
      }}>
        <div style={{ fontWeight: 'bold', color: '#155724', marginBottom: '5px' }}>
          📊 Réponses acceptées :
        </div>
        
        {correctAnswer && (
          <div style={{ fontSize: '14px' }}>
            <div style={{ marginBottom: '5px' }}>
              🎯 <strong>Réponse exacte :</strong> {correctAnswer}{unit && ` ${unit}`}
            </div>
            
            {tolerance > 0 && (
              <div>
                📏 <strong>Plage acceptée :</strong> 
                {' '}{(parseFloat(correctAnswer) - tolerance).toFixed(2)} 
                {' '} à {' '}
                {(parseFloat(correctAnswer) + tolerance).toFixed(2)}
                {unit && ` ${unit}`}
              </div>
            )}
            
            {tolerance === 0 && (
              <div style={{ color: '#856404' }}>
                ⚠️ Réponse exacte uniquement (pas de marge d'erreur)
              </div>
            )}
          </div>
        )}
        
        {!correctAnswer && (
          <div style={{ color: '#721c24', fontStyle: 'italic' }}>
            ⚠️ Veuillez saisir une réponse correcte
          </div>
        )}
      </div>
      
      {/* Exemples d'usage */}
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>💡 Exemples d'usage :</strong>
        <ul style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li><strong>Mathématiques :</strong> 3.14 (tolérance: 0.01) pour π</li>
          <li><strong>Mesures :</strong> 100 (unité: cm, tolérance: 5)</li>
          <li><strong>Pourcentages :</strong> 75 (unité: %, tolérance: 2)</li>
          <li><strong>Prix :</strong> 15.99 (unité: €, tolérance: 0)</li>
        </ul>
      </div>
    </div>
  );
};

export default NumericEditor;