import { useState } from 'react';

export default function TemplateDownloader({ csvFormat }) {
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);

  const handleDownload = async (downloadFunction, templateName) => {
    setDownloadingTemplate(templateName);
    
    try {
      await downloadFunction();
      
      // Feedback visuel
      setTimeout(() => {
        setDownloadingTemplate(null);
      }, 1500);
      
    } catch (error) {
      console.error(`Erreur téléchargement ${templateName}:`, error);
      setDownloadingTemplate(null);
      alert(`Erreur lors du téléchargement du template ${templateName}`);
    }
  };

  const templates = {
    'ultra-simple': [
      {
        name: 'Excel QCM',
        icon: '📊',
        color: '#28a745',
        description: 'Template Excel coloré style Gimkit pour QCM',
        downloadFn: () => import('../lib/excel-parser').then(m => m.downloadExcelTemplate()),
        premium: false
      },
      {
        name: 'Excel Questions Ouvertes',
        icon: '📝',
        color: '#17a2b8',
        description: 'Template Excel pour questions à réponse libre',
        downloadFn: () => import('../lib/excel-parser').then(m => m.downloadExcelOpenQuestionsTemplate()),
        premium: false
      },
      {
        name: 'CSV QCM',
        icon: '📄',
        color: '#6c757d',
        description: 'Version CSV simple (fallback)',
        downloadFn: () => import('../lib/csv-parser-ultra-simple').then(m => m.downloadUltraSimpleTemplate()),
        premium: false
      },
      {
        name: 'CSV Questions Ouvertes',
        icon: '📄',
        color: '#6c757d',
        description: 'Version CSV pour questions ouvertes',
        downloadFn: () => import('../lib/csv-parser-ultra-simple').then(m => m.downloadOpenQuestionsTemplate()),
        premium: false
      }
    ],
    'simple': [
      {
        name: 'Excel Simple',
        icon: '🎓',
        color: '#007bff',
        description: 'Template Excel avec plus d\'options que Ultra-Simple',
        downloadFn: () => import('../lib/excel-parser').then(m => m.downloadExcelSimpleTemplate()),
        premium: false
      },
      {
        name: 'CSV Simple',
        icon: '📄',
        color: '#6c757d',
        description: 'Version CSV équivalente',
        downloadFn: () => import('../lib/csv-parser-simple').then(m => m.downloadSimpleTemplate()),
        premium: false
      }
    ],
    'advanced': [
      {
        name: 'Excel Avancé',
        icon: '🚀',
        color: '#ffc107',
        description: 'Template Excel complet avec tous les paramètres',
        downloadFn: () => import('../lib/excel-parser').then(m => m.downloadExcelAdvancedTemplate()),
        premium: false
      },
      {
        name: 'CSV Avancé',
        icon: '📄',
        color: '#6c757d',
        description: 'Version CSV complète pour utilisateurs avancés',
        downloadFn: () => import('../lib/csv-parser').then(m => m.downloadTemplate()),
        premium: false
      }
    ]
  };

  const currentTemplates = templates[csvFormat] || [];

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '20px', 
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <h4 style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        color: '#495057'
      }}>
        📥 Templates disponibles ({csvFormat.toUpperCase()})
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '15px'
      }}>
        {currentTemplates.map((template, index) => (
          <div key={index} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '15px',
            border: '2px solid #e9ecef',
            transition: 'all 0.2s',
            cursor: 'pointer',
            ':hover': { transform: 'translateY(-2px)' }
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{
                fontSize: '24px',
                marginRight: '10px'
              }}>
                {template.icon}
              </span>
              <h5 style={{
                margin: 0,
                color: template.color,
                fontWeight: 'bold'
              }}>
                {template.name}
                {template.premium && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    fontSize: '10px',
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }}>
                    PRO
                  </span>
                )}
              </h5>
            </div>
            
            <p style={{
              fontSize: '13px',
              color: '#6c757d',
              marginBottom: '12px'
            }}>
              {template.description}
            </p>
            
            <button
              onClick={() => handleDownload(template.downloadFn, template.name)}
              disabled={downloadingTemplate === template.name}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: downloadingTemplate === template.name ? 
                  '#28a745' : template.color,
                color: template.color === '#ffc107' ? '#212529' : 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: downloadingTemplate === template.name ? 
                  'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              {downloadingTemplate === template.name ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Téléchargement...
                </>
              ) : (
                <>
                  📥 Télécharger
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div style={{
        marginTop: '15px',
        textAlign: 'center',
        padding: '10px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#1565c0'
      }}>
        💡 <strong>Conseil :</strong> Commencez par Excel qui offre un formatage visuel optimal. 
        Utilisez CSV uniquement si vous ne pouvez pas ouvrir Excel.
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}