import { useState } from 'react';

const OrderingEditor = ({ question, onChange }) => {
  const [items, setItems] = useState(question.items || [
    { id: 1, text: '', correctOrder: 1 }
  ]);

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    const newItems = [...items, {
      id: newId,
      text: '',
      correctOrder: items.length + 1
    }];
    setItems(newItems);
    onChange('items', newItems);
  };

  const removeItem = (id) => {
    const newItems = items.filter(item => item.id !== id)
      .map((item, index) => ({ ...item, correctOrder: index + 1 }));
    setItems(newItems);
    onChange('items', newItems);
  };

  const updateItem = (id, field, value) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(newItems);
    onChange('items', newItems);
  };

  const moveItem = (id, direction) => {
    const index = items.findIndex(item => item.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) return;

    const newItems = [...items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Échanger les positions
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    
    // Mettre à jour les ordres corrects
    newItems.forEach((item, idx) => {
      item.correctOrder = idx + 1;
    });

    setItems(newItems);
    onChange('items', newItems);
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginTop: '10px' }}>
      <h4 style={{ marginTop: 0 }}>Éléments à remettre dans l'ordre :</h4>
      
      {items.map((item, index) => (
        <div key={item.id} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px'
        }}>
          <span style={{ 
            minWidth: '30px', 
            fontWeight: 'bold', 
            color: '#007bff' 
          }}>
            {index + 1}.
          </span>
          
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItem(item.id, 'text', e.target.value)}
            placeholder={`Élément ${index + 1}`}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          />
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              type="button"
              onClick={() => moveItem(item.id, 'up')}
              disabled={index === 0}
              style={{
                padding: '5px 8px',
                backgroundColor: index === 0 ? '#ccc' : '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: index === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ↑
            </button>
            
            <button
              type="button"
              onClick={() => moveItem(item.id, 'down')}
              disabled={index === items.length - 1}
              style={{
                padding: '5px 8px',
                backgroundColor: index === items.length - 1 ? '#ccc' : '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: index === items.length - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ↓
            </button>
            
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
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
        </div>
      ))}
      
      <button
        type="button"
        onClick={addItem}
        style={{
          padding: '8px 15px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        + Ajouter un élément
      </button>
      
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        💡 <strong>Ordre correct :</strong> {items.map(item => item.text || `Élément ${item.correctOrder}`).join(' → ')}
      </div>
    </div>
  );
};

export default OrderingEditor;