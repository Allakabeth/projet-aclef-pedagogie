import { useState } from 'react';

const MatchingEditor = ({ question, onChange }) => {
  const [leftColumn, setLeftColumn] = useState(question.leftColumn || [
    { id: 'a', text: '' }
  ]);
  const [rightColumn, setRightColumn] = useState(question.rightColumn || [
    { id: '1', text: '', matchWith: 'a' }
  ]);

  const addLeftItem = () => {
    const newId = String.fromCharCode(97 + leftColumn.length); // a, b, c...
    const newLeftColumn = [...leftColumn, { id: newId, text: '' }];
    setLeftColumn(newLeftColumn);
    onChange('leftColumn', newLeftColumn);
  };

  const addRightItem = () => {
    const newId = (rightColumn.length + 1).toString();
    const newRightColumn = [...rightColumn, { 
      id: newId, 
      text: '', 
      matchWith: leftColumn[0]?.id || 'a' 
    }];
    setRightColumn(newRightColumn);
    onChange('rightColumn', newRightColumn);
  };

  const removeLeftItem = (id) => {
    const newLeftColumn = leftColumn.filter(item => item.id !== id);
    const newRightColumn = rightColumn.map(item => 
      item.matchWith === id ? { ...item, matchWith: newLeftColumn[0]?.id || 'a' } : item
    );
    
    setLeftColumn(newLeftColumn);
    setRightColumn(newRightColumn);
    onChange('leftColumn', newLeftColumn);
    onChange('rightColumn', newRightColumn);
  };

  const removeRightItem = (id) => {
    const newRightColumn = rightColumn.filter(item => item.id !== id);
    setRightColumn(newRightColumn);
    onChange('rightColumn', newRightColumn);
  };

  const updateLeftItem = (id, text) => {
    const newLeftColumn = leftColumn.map(item =>
      item.id === id ? { ...item, text } : item
    );
    setLeftColumn(newLeftColumn);
    onChange('leftColumn', newLeftColumn);
  };

  const updateRightItem = (id, field, value) => {
    const newRightColumn = rightColumn.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setRightColumn(newRightColumn);
    onChange('rightColumn', newRightColumn);
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
      <h4 style={{ marginTop: 0 }}>Association d'éléments :</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Colonne de gauche */}
        <div>
          <h5 style={{ color: '#007bff', marginBottom: '10px' }}>Colonne A</h5>
          {leftColumn.map((item) => (
            <div key={item.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '10px' 
            }}>
              <span style={{ 
                minWidth: '25px', 
                fontWeight: 'bold',
                backgroundColor: '#007bff',
                color: 'white',
                textAlign: 'center',
                borderRadius: '50%',
                padding: '5px'
              }}>
                {item.id.toUpperCase()}
              </span>
              
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateLeftItem(item.id, e.target.value)}
                placeholder={`Élément ${item.id.toUpperCase()}`}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
              
              {leftColumn.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLeftItem(item.id)}
                  style={{
                    padding: '5px 8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addLeftItem}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Ajouter élément A
          </button>
        </div>

        {/* Colonne de droite */}
        <div>
          <h5 style={{ color: '#28a745', marginBottom: '10px' }}>Colonne B</h5>
          {rightColumn.map((item) => (
            <div key={item.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '10px' 
            }}>
              <span style={{ 
                minWidth: '25px', 
                fontWeight: 'bold',
                backgroundColor: '#28a745',
                color: 'white',
                textAlign: 'center',
                borderRadius: '50%',
                padding: '5px'
              }}>
                {item.id}
              </span>
              
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateRightItem(item.id, 'text', e.target.value)}
                placeholder={`Élément ${item.id}`}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
              
              <select
                value={item.matchWith}
                onChange={(e) => updateRightItem(item.id, 'matchWith', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  minWidth: '60px'
                }}
              >
                {leftColumn.map(leftItem => (
                  <option key={leftItem.id} value={leftItem.id}>
                    {leftItem.id.toUpperCase()}
                  </option>
                ))}
              </select>
              
              {rightColumn.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRightItem(item.id)}
                  style={{
                    padding: '5px 8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addRightItem}
            disabled={leftColumn.length === 0}
            style={{
              padding: '6px 12px',
              backgroundColor: leftColumn.length === 0 ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: leftColumn.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            + Ajouter élément B
          </button>
        </div>
      </div>
      
      {/* Aperçu des associations */}
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <strong>Associations définies :</strong>
        <ul style={{ marginTop: '10px', marginBottom: 0 }}>
          {rightColumn.map(rightItem => {
            const leftItem = leftColumn.find(l => l.id === rightItem.matchWith);
            return (
              <li key={rightItem.id}>
                <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                  {leftItem?.text || leftItem?.id?.toUpperCase()}
                </span>
                {' ← → '}
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                  {rightItem.text || rightItem.id}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default MatchingEditor;