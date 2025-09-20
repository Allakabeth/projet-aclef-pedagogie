import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { parseCSV, validateCSV, convertCSVToQuizFormat, downloadTemplate } from '../../../lib/csv-parser';
import { parseSimpleCSV, validateSimpleCSV, convertSimpleCSVToQuizFormat, downloadSimpleTemplate } from '../../../lib/csv-parser-simple';
import { parseUltraSimpleCSV, validateUltraSimpleCSV, convertUltraSimpleCSVToQuizFormat, downloadUltraSimpleTemplate, downloadOpenQuestionsTemplate } from '../../../lib/csv-parser-ultra-simple';
import { parseExcelFile, validateExcelData, convertExcelToQuizFormat, downloadExcelTemplate, downloadExcelOpenQuestionsTemplate, downloadExcelSimpleTemplate, downloadExcelAdvancedTemplate } from '../../../lib/excel-parser';
import CSVUploader from '../../../components/CSVUploader';
import AIQuizGenerator from '../../../components/AIQuizGenerator';
import CSVPreview from '../../../components/CSVPreview';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CSVCreator() {
  const router = useRouter();
  const [mode, setMode] = useState(null); // 'manual' ou 'ai'
  const [csvFormat, setCsvFormat] = useState('ultra-simple'); // 'ultra-simple', 'simple' ou 'advanced'
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [convertedQuizzes, setConvertedQuizzes] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleModeSelection = (selectedMode) => {
    setMode(selectedMode);
    setStep(2);
    setError(null);
  };

  const handleFileUpload = async (file) => {
    setProcessing(true);
    setError(null);
    
    try {
      let parsed, validation, converted;
      const isExcelFile = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      
      if (isExcelFile) {
        // Traitement des fichiers Excel
        parsed = await parseExcelFile(file);
        setCsvData(parsed);
        validation = validateExcelData(parsed);
        setValidationResult(validation);
        if (validation.isValid) {
          converted = convertExcelToQuizFormat(parsed, validation);
        }
      } else {
        // Traitement des fichiers CSV selon le format choisi
        const text = await file.text();
        
        if (csvFormat === 'ultra-simple') {
          parsed = parseUltraSimpleCSV(text);
          setCsvData(parsed);
          validation = validateUltraSimpleCSV(parsed);
          setValidationResult(validation);
          if (validation.isValid) {
            converted = convertUltraSimpleCSVToQuizFormat(parsed, validation);
          }
        } else if (csvFormat === 'simple') {
          parsed = parseSimpleCSV(text);
          setCsvData(parsed);
          validation = validateSimpleCSV(parsed);
          setValidationResult(validation);
          if (validation.isValid) {
            converted = convertSimpleCSVToQuizFormat(validation);
          }
        } else {
          parsed = parseCSV(text);
          setCsvData(parsed);
          validation = validateCSV(parsed);
          setValidationResult(validation);
          if (validation.isValid) {
            converted = convertCSVToQuizFormat(validation);
          }
        }
      }
      
      if (validation.isValid && converted) {
        setConvertedQuizzes(converted);
        setStep(3);
      } else {
        setStep(3); // Aller à la prévisualisation même avec erreurs pour les corriger
      }
    } catch (err) {
      setError('Erreur lors de la lecture du fichier: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAIGeneration = async (aiConfig) => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-quiz-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération IA');
      }

      const result = await response.json();
      
      // Parser le CSV généré
      const parsed = parseCSV(result.csvContent);
      setCsvData(parsed);
      
      // Validation
      const validation = validateCSV(parsed);
      setValidationResult(validation);
      
      // Conversion
      const converted = convertCSVToQuizFormat(validation);
      setConvertedQuizzes(converted);
      
      // Afficher une notification pour informer l'utilisateur
      setTimeout(() => {
        alert('✅ Quiz généré par IA avec succès ! \n\n🎯 Consultez l\'onglet "Prévisualisation" pour voir toutes les questions et réponses générées.\n\n✏️ Cliquez sur "Éditer dans l\'éditeur avancé" pour modifier le contenu avant de sauvegarder.');
      }, 500);
      
      setStep(3);
    } catch (err) {
      setError('Erreur génération IA: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!convertedQuizzes || !validationResult?.isValid) {
      alert('Impossible de sauvegarder : le quiz contient des erreurs');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Obtenir l'utilisateur admin
      const { data: adminData } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@aclef.fr')
        .single();

      const adminId = adminData?.id;
      
      // Sauvegarder chaque quiz
      for (const quiz of convertedQuizzes) {
        const quizData = {
          title: quiz.title,
          description: quiz.description,
          quiz_data: {
            settings: quiz.settings,
            feedback: quiz.feedback,
            accessibility: quiz.accessibility,
            questions: quiz.questions
          },
          is_active: true,
          created_by: adminId
        };

        const { error: saveError } = await supabase
          .from('quiz')
          .insert([quizData]);

        if (saveError) {
          throw saveError;
        }
      }

      alert(`${convertedQuizzes.length} quiz(s) sauvegardé(s) avec succès !`);
      router.push('/admin/quiz');

    } catch (err) {
      setError('Erreur sauvegarde: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditInAdvanced = () => {
    if (!convertedQuizzes || convertedQuizzes.length === 0) return;
    
    // Pour simplicité, on prend le premier quiz pour édition
    const firstQuiz = convertedQuizzes[0];
    
    // Stocker temporairement les données pour l'éditeur avancé
    sessionStorage.setItem('csvImportedQuiz', JSON.stringify(firstQuiz));
    
    // Rediriger vers l'éditeur avancé avec un paramètre spécial
    router.push('/admin/quiz/editor-advanced?from=csv');
  };

  const renderModeSelection = () => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '20px', color: '#007bff' }}>📊 Créateur de Quiz CSV</h1>
      <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '40px' }}>
        Choisissez votre méthode de création
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '40px', 
        maxWidth: '1000px', 
        margin: '0 auto' 
      }}>
        {/* Mode Manuel */}
        <div 
          onClick={() => handleModeSelection('manual')}
          style={{ 
            padding: '30px',
            border: '2px solid #dee2e6',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#007bff';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#dee2e6';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
        >
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>📝</div>
          <h3 style={{ color: '#007bff', marginBottom: '15px' }}>Mode Manuel</h3>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Téléchargez notre modèle CSV, remplissez-le avec vos questions 
            et importez-le pour créer vos quiz.
          </p>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h5 style={{ color: '#495057', marginBottom: '10px' }}>✅ Avantages :</h5>
            <ul style={{ textAlign: 'left', color: '#6c757d', fontSize: '14px', margin: 0 }}>
              <li>Contrôle total sur chaque question</li>
              <li>Idéal pour contenu spécialisé</li>
              <li>Possibilité de travaail hors-ligne</li>
              <li>Réutilisation de contenus existants</li>
            </ul>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'center',
            marginTop: '20px'
          }}>
            <span style={{ 
              backgroundColor: '#e3f2fd', 
              color: '#1976d2',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Excel compatible
            </span>
            <span style={{ 
              backgroundColor: '#e8f5e8', 
              color: '#2e7d32',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Validation automatique
            </span>
          </div>
        </div>

        {/* Mode IA */}
        <div 
          onClick={() => handleModeSelection('ai')}
          style={{ 
            padding: '30px',
            border: '2px solid #dee2e6',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#28a745';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#dee2e6';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
        >
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            right: '15px',
            backgroundColor: '#ff6b35',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            🚀 IA POWERED
          </div>
          
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🤖</div>
          <h3 style={{ color: '#28a745', marginBottom: '15px' }}>Mode IA Assisté</h3>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Décrivez votre sujet et laissez l'IA générer automatiquement 
            des questions adaptées avec explications et médias.
          </p>
          
          <div style={{ 
            backgroundColor: '#f0fff4', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h5 style={{ color: '#155724', marginBottom: '10px' }}>🎯 Avantages :</h5>
            <ul style={{ textAlign: 'left', color: '#155724', fontSize: '14px', margin: 0 }}>
              <li>Génération ultra-rapide</li>
              <li>Contenu éducatif optimisé</li>
              <li>Images et audio automatiques</li>
              <li>Explications pédagogiques</li>
            </ul>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'center',
            marginTop: '20px'
          }}>
            <span style={{ 
              backgroundColor: '#fff3cd', 
              color: '#856404',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              GPT-4 / Claude
            </span>
            <span style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              API Key requise
            </span>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        maxWidth: '800px',
        margin: '40px auto 0'
      }}>
        <h4 style={{ color: '#495057', marginBottom: '15px' }}>📋 Types de questions supportés :</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '10px',
          fontSize: '14px'
        }}>
          <span>🔘 QCM classique</span>
          <span>☑️ Choix multiples</span>
          <span>✅❌ Vrai/Faux</span>
          <span>🔢 Numérique</span>
          <span>📝 Texte libre</span>
          <span>🔀 Remise en ordre</span>
          <span>🔗 Association</span>
          <span>🎯 Zones cliquables</span>
        </div>
      </div>
    </div>
  );

  const renderManualMode = () => (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button
          onClick={() => {
            setMode(null);
            setCsvFormat('ultra-simple');
            setStep(1);
            setCsvData(null);
            setValidationResult(null);
            setConvertedQuizzes(null);
          }}
          style={{
            padding: '8px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '20px'
          }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, color: '#007bff' }}>📝 Mode Manuel</h1>
      </div>

      {step === 2 && (
        <div>
          <div style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '10px',
            border: '1px solid #bbdefb'
          }}>
            <h3 style={{ marginTop: 0, color: '#1976d2' }}>📋 Étapes :</h3>
            <ol style={{ marginBottom: 0, color: '#455a64' }}>
              <li>Téléchargez le modèle CSV</li>
              <li>Ouvrez-le dans Excel ou LibreOffice</li>
              <li>Remplissez vos questions et réponses</li>
              <li>Sauvegardez et importez le fichier</li>
            </ol>
          </div>

          {/* Sélection du format CSV */}
          <div style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ marginTop: 0, color: '#495057', marginBottom: '15px' }}>📋 Choisissez votre format CSV :</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              {/* Format Ultra-Simple */}
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '15px',
                backgroundColor: csvFormat === 'ultra-simple' ? '#e8f5e8' : 'white',
                borderRadius: '10px',
                border: `3px solid ${csvFormat === 'ultra-simple' ? '#28a745' : '#dee2e6'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  ⭐ RECOMMANDÉ
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    name="csvFormat"
                    value="ultra-simple"
                    checked={csvFormat === 'ultra-simple'}
                    onChange={(e) => setCsvFormat(e.target.value)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#28a745' }}>✨ Ultra-Simple</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>Comme Gimkit</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#495057', marginBottom: '8px' }}>
                  Juste : Question + Bonne Réponse + Mauvaises Réponses (optionnel)
                </div>
                <div style={{ fontSize: '11px', color: '#155724', fontStyle: 'italic' }}>
                  Parfait pour débuter rapidement !
                </div>
              </label>

              {/* Format Simple */}
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '15px',
                backgroundColor: csvFormat === 'simple' ? '#e3f2fd' : 'white',
                borderRadius: '10px',
                border: `2px solid ${csvFormat === 'simple' ? '#1976d2' : '#dee2e6'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    name="csvFormat"
                    value="simple"
                    checked={csvFormat === 'simple'}
                    onChange={(e) => setCsvFormat(e.target.value)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#007bff' }}>🟢 Format Simple</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>Équilibré</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#495057' }}>
                  Colonnes en français avec plus d'options de types de questions
                </div>
              </label>

              {/* Format Avancé */}
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '15px',
                backgroundColor: csvFormat === 'advanced' ? '#fff3cd' : 'white',
                borderRadius: '10px',
                border: `2px solid ${csvFormat === 'advanced' ? '#ffc107' : '#dee2e6'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    name="csvFormat"
                    value="advanced"
                    checked={csvFormat === 'advanced'}
                    onChange={(e) => setCsvFormat(e.target.value)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#856404' }}>🔧 Format Avancé</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>Experts</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#495057' }}>
                  Toutes les options : images, audio, paramètres JSON...
                </div>
              </label>
            </div>

            {/* Boutons de téléchargement selon le format */}
            <div style={{ textAlign: 'center' }}>
              {csvFormat === 'ultra-simple' ? (
                <div>
                  <div>
                    <h5 style={{ textAlign: 'center', color: '#28a745', marginBottom: '15px' }}>
                      🔥 Templates Excel Formatés (Style Gimkit)
                    </h5>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px' }}>
                      <button
                        onClick={downloadExcelTemplate}
                        style={{
                          padding: '12px 25px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        📊 Excel QCM
                      </button>
                      <button
                        onClick={downloadExcelOpenQuestionsTemplate}
                        style={{
                          padding: '12px 25px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        📝 Excel Questions Ouvertes
                      </button>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                      <span style={{ fontSize: '14px', color: '#6c757d' }}>ou</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                      <button
                        onClick={downloadUltraSimpleTemplate}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📄 CSV QCM
                      </button>
                      <button
                        onClick={downloadOpenQuestionsTemplate}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📄 CSV Questions
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6c757d' }}>
                    Format ultra-simple inspiré de Gimkit avec emojis visuels !
                  </p>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    backgroundColor: '#e8f5e8', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#155724'
                  }}>
                    🎯 <strong>Avec emojis colorés :</strong><br/>
                    • 📝 Question • ✅ Bonne Réponse • ❌ Mauvaises Réponses<br/>
                    • Format visuel comme Gimkit pour une compréhension immédiate !
                  </div>
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <a 
                      href="/csv/guide-gimkit-style.md" 
                      target="_blank"
                      style={{ 
                        color: '#28a745', 
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      📖 Voir le guide visuel complet avec exemples
                    </a>
                  </div>
                </div>
              ) : csvFormat === 'simple' ? (
                <div>
                  <h5 style={{ textAlign: 'center', color: '#007bff', marginBottom: '15px' }}>
                    🎓 Template Excel Simple
                  </h5>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px' }}>
                    <button
                      onClick={downloadExcelSimpleTemplate}
                      style={{
                        padding: '12px 25px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      📊 Excel Simple
                    </button>
                    <button
                      onClick={downloadSimpleTemplate}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📄 CSV Simple
                    </button>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6c757d' }}>
                    Plus d'options que Ultra-Simple : Types de questions variés, explications...
                  </p>
                </div>
              ) : (
                <div>
                  <h5 style={{ textAlign: 'center', color: '#ffc107', marginBottom: '15px' }}>
                    🚀 Template Excel Avancé
                  </h5>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px' }}>
                    <button
                      onClick={downloadExcelAdvancedTemplate}
                      style={{
                        padding: '12px 25px',
                        backgroundColor: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      🚀 Excel Avancé
                    </button>
                    <button
                      onClick={downloadTemplate}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📄 CSV Avancé
                    </button>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6c757d' }}>
                    Format technique avec toutes les options : types variés, paramètres avancés...
                  </p>
                </div>
              )}
            </div>
          </div>

          <CSVUploader onUpload={handleFileUpload} processing={processing} csvFormat={csvFormat} />

          {error && (
            <div style={{ 
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '5px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Erreur :</strong> {error}
            </div>
          )}
        </div>
      )}

      {step === 3 && csvData && validationResult && (
        <CSVPreview 
          csvData={csvData}
          validationResult={validationResult}
          convertedQuizzes={convertedQuizzes}
          onSave={handleSaveToDatabase}
          onEditAdvanced={handleEditInAdvanced}
          processing={processing}
        />
      )}
    </div>
  );

  const renderAIMode = () => (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button
          onClick={() => {
            setMode(null);
            setCsvFormat('ultra-simple');
            setStep(1);
            setCsvData(null);
            setValidationResult(null);
            setConvertedQuizzes(null);
          }}
          style={{
            padding: '8px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '20px'
          }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, color: '#28a745' }}>🤖 Mode IA Assisté</h1>
      </div>

      {step === 2 && (
        <div>
          <div style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f0fff4',
            borderRadius: '10px',
            border: '1px solid #c3e6cb'
          }}>
            <h3 style={{ marginTop: 0, color: '#155724' }}>🚀 Génération intelligente :</h3>
            <p style={{ marginBottom: 0, color: '#155724' }}>
              Décrivez votre quiz et l'IA se charge de créer des questions pertinentes, 
              des explications pédagogiques et même des médias adaptés à votre public !
            </p>
          </div>

          <AIQuizGenerator onGenerate={handleAIGeneration} processing={processing} />

          {error && (
            <div style={{ 
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '5px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Erreur :</strong> {error}
            </div>
          )}
        </div>
      )}

      {step === 3 && csvData && validationResult && (
        <CSVPreview 
          csvData={csvData}
          validationResult={validationResult}
          convertedQuizzes={convertedQuizzes}
          onSave={handleSaveToDatabase}
          onEditAdvanced={handleEditInAdvanced}
          processing={processing}
        />
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {step === 1 && renderModeSelection()}
      {mode === 'manual' && renderManualMode()}
      {mode === 'ai' && renderAIMode()}
    </div>
  );
}