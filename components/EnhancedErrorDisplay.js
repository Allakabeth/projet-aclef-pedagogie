import { useState } from 'react';

export default function EnhancedErrorDisplay({ errors, warnings, onRetry, processing }) {
  const [expandedErrors, setExpandedErrors] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState(false);

  if (!errors?.length && !warnings?.length) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Erreurs critiques */}
      {errors?.length > 0 && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <h4 style={{
              color: '#721c24',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ❌ Erreurs critiques ({errors.length})
            </h4>
            {errors.length > 3 && (
              <button
                onClick={() => setExpandedErrors(!expandedErrors)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#721c24',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                {expandedErrors ? 'Réduire' : 'Voir tout'}
              </button>
            )}
          </div>
          
          <div style={{ color: '#721c24', fontSize: '14px' }}>
            {(expandedErrors ? errors : errors.slice(0, 3)).map((error, index) => (
              <div key={index} style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(114, 28, 36, 0.1)',
                borderRadius: '4px',
                marginBottom: '8px',
                borderLeft: '3px solid #721c24'
              }}>
                <strong>• {error}</strong>
              </div>
            ))}
            
            {!expandedErrors && errors.length > 3 && (
              <div style={{ 
                textAlign: 'center', 
                fontStyle: 'italic', 
                marginTop: '10px' 
              }}>
                ... et {errors.length - 3} autre(s) erreur(s)
              </div>
            )}
          </div>
          
          <div style={{
            marginTop: '15px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={onRetry}
              disabled={processing}
              style={{
                padding: '8px 16px',
                backgroundColor: processing ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {processing ? '⏳ Traitement...' : '🔄 Corriger et réessayer'}
            </button>
            
            <span style={{ 
              fontSize: '12px', 
              color: '#721c24',
              fontStyle: 'italic'
            }}>
              Corrigez ces erreurs avant de continuer
            </span>
          </div>
        </div>
      )}

      {/* Avertissements */}
      {warnings?.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <h4 style={{
              color: '#856404',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ Avertissements ({warnings.length})
            </h4>
            {warnings.length > 3 && (
              <button
                onClick={() => setExpandedWarnings(!expandedWarnings)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#856404',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                {expandedWarnings ? 'Réduire' : 'Voir tout'}
              </button>
            )}
          </div>
          
          <div style={{ color: '#856404', fontSize: '14px' }}>
            {(expandedWarnings ? warnings : warnings.slice(0, 3)).map((warning, index) => (
              <div key={index} style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(133, 100, 4, 0.1)',
                borderRadius: '4px',
                marginBottom: '8px',
                borderLeft: '3px solid #856404'
              }}>
                • {warning}
              </div>
            ))}
            
            {!expandedWarnings && warnings.length > 3 && (
              <div style={{ 
                textAlign: 'center', 
                fontStyle: 'italic', 
                marginTop: '10px' 
              }}>
                ... et {warnings.length - 3} autre(s) avertissement(s)
              </div>
            )}
          </div>
          
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#856404'
          }}>
            💡 Ces avertissements n'empêchent pas la création du quiz, mais vous devriez les vérifier.
          </div>
        </div>
      )}
    </div>
  );
}