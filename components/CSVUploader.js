import { useState, useRef } from 'react';

export default function CSVUploader({ onUpload, processing, csvFormat = 'ultra-simple' }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Veuillez sélectionner un fichier CSV ou Excel (.csv, .xlsx, .xls)');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB max pour Excel
      alert('Le fichier est trop volumineux (max 10MB)');
      return;
    }
    
    onUpload(file);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          border: dragActive ? '2px solid #007bff' : '2px dashed #dee2e6',
          borderRadius: '15px',
          padding: '40px 20px',
          cursor: processing ? 'not-allowed' : 'pointer',
          backgroundColor: dragActive ? '#f8f9ff' : 'white',
          transition: 'all 0.3s ease',
          opacity: processing ? 0.7 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={processing}
        />
        
        <div style={{ 
          fontSize: '60px', 
          marginBottom: '20px',
          color: dragActive ? '#007bff' : '#6c757d'
        }}>
          📊
        </div>
        
        <h3 style={{ 
          color: dragActive ? '#007bff' : '#495057',
          marginBottom: '15px' 
        }}>
          {dragActive ? 'Déposez votre fichier' : 'Importez votre fichier CSV ou Excel'}
        </h3>
        
        <p style={{ 
          color: '#6c757d', 
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {processing ? 'Traitement en cours...' : 'Glissez-déposez votre fichier ou cliquez pour sélectionner'}
        </p>
        
        {!processing && (
          <button
            type="button"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            📁 Sélectionner un fichier
          </button>
        )}
        
        {processing && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '6px',
            fontSize: '16px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Traitement...
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 
          csvFormat === 'ultra-simple' ? '#e8f5e8' : 
          csvFormat === 'simple' ? '#e3f2fd' : '#fff3cd',
        borderRadius: '8px',
        border: `1px solid ${
          csvFormat === 'ultra-simple' ? '#c3e6cb' :
          csvFormat === 'simple' ? '#bbdefb' : '#ffeaa7'
        }`
      }}>
        <h5 style={{ 
          color: 
            csvFormat === 'ultra-simple' ? '#155724' :
            csvFormat === 'simple' ? '#1565c0' : '#856404', 
          marginBottom: '10px' 
        }}>
          💡 Conseils :
        </h5>
        <ul style={{ 
          textAlign: 'left', 
          color: 
            csvFormat === 'ultra-simple' ? '#155724' :
            csvFormat === 'simple' ? '#1565c0' : '#856404', 
          fontSize: '14px', 
          margin: 0,
          paddingLeft: '20px'
        }}>
          {csvFormat === 'ultra-simple' ? (
            <>
              <li>🔥 <strong>Excel Formaté</strong> : Colonnes colorées, tailles optimisées comme Gimkit !</li>
              <li>📝 Ou CSV simple : Juste Question + Bonne Réponse + Mauvaises Réponses</li>
              <li>🎯 Laissez les mauvaises réponses vides pour des questions ouvertes</li>
              <li>🔄 Le système détecte automatiquement le type (QCM ou Question ouverte)</li>
            </>
          ) : csvFormat === 'simple' ? (
            <>
              <li>Utilisez le modèle simple téléchargé pour éviter les erreurs</li>
              <li>Types supportés : QCM, Choix Multiples, Vrai/Faux, Numérique, Texte</li>
              <li>Indiquez les bonnes réponses avec A, B, C, D (ex: "B" pour QCM, "A,C" pour choix multiples)</li>
              <li>Remplissez le titre et la description seulement sur la première ligne</li>
            </>
          ) : (
            <>
              <li>Utilisez le modèle CSV fourni pour éviter les erreurs</li>
              <li>Vérifiez que toutes les colonnes obligatoires sont remplies</li>
              <li>Les types de questions supportés : qcm, multiple, truefalse, numeric, text</li>
              <li>Format JSON requis pour quiz_settings et question_settings</li>
            </>
          )}
          <li>Taille maximale : 10MB (Excel), 5MB (CSV)</li>
        </ul>
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