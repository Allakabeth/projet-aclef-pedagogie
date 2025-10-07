import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import CategorySelector, { CategoryBadge, useCategories } from '../../components/CategorySelector';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuizManagement() {
  const router = useRouter();
  
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizSessions, setQuizSessions] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hook des catégories
  const { categories, getCategoryById } = useCategories();

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Filtrer les quiz selon la catégorie et la recherche
  useEffect(() => {
    let filtered = [...quizzes];

    // Filtrer par catégorie
    if (selectedCategory) {
      filtered = filtered.filter(quiz => quiz.category_id === selectedCategory);
    }

    // Filtrer par terme de recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(term) ||
        (quiz.description && quiz.description.toLowerCase().includes(term))
      );
    }

    setFilteredQuizzes(filtered);
  }, [quizzes, selectedCategory, searchTerm]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quiz')
        .select(`
          id,
          title,
          description,
          quiz_data,
          is_active,
          created_at,
          category_id,
          quiz_categories:category_id (
            id,
            name,
            icon,
            color
          ),
          users:created_by (
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setQuizzes(data || []);
      
      // Charger le nombre de sessions par quiz
      if (data && data.length > 0) {
        const sessionsCount = {};
        for (const quiz of data) {
          const { count } = await supabase
            .from('quiz_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);
          sessionsCount[quiz.id] = count || 0;
        }
        setQuizSessions(sessionsCount);
      }
    } catch (err) {
      console.error('Erreur chargement quiz:', err);
      setError(err.message || 'Erreur lors du chargement des quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    router.push('/quizz-admin/quiz/editor-advanced');
  };

  const handleEditQuiz = (quizId) => {
    router.push(`/quizz-admin/quiz/editor-advanced?id=${quizId}`);
  };

  const handlePreviewQuiz = (quizId) => {
    // Ouvrir dans un nouvel onglet l'interface apprenant
    window.open(`/apprenant/quiz/${quizId}`, '_blank');
  };

  const handleDuplicateQuiz = async (quiz) => {
    if (!confirm(`Dupliquer le quiz "${quiz.title}" ?`)) {
      return;
    }

    try {
      const duplicatedQuiz = {
        title: `${quiz.title} - Copie`,
        description: quiz.description ? `${quiz.description} (copie)` : null,
        quiz_data: { ...quiz.quiz_data }, // Copie profonde des questions
        is_active: false, // Les copies sont inactives par defaut
        created_by: quiz.created_by
      };

      const { error } = await supabase
        .from('quiz')
        .insert(duplicatedQuiz);

      if (error) {
        throw error;
      }

      alert('Quiz duplique avec succes');
      loadQuizzes(); // Recharger la liste
    } catch (err) {
      console.error('Erreur duplication:', err);
      alert('Erreur: Impossible de dupliquer le quiz');
    }
  };

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    // Suppression directe sans confirmation
    try {
      // 1. Supprimer les sessions liées
      await supabase
        .from('quiz_sessions')
        .delete()
        .eq('quiz_id', quizId);
      
      // 2. Supprimer le quiz
      const { error } = await supabase
        .from('quiz')
        .delete()
        .eq('id', quizId);

      if (error) {
        alert(`Erreur: ${error.message}`);
        return;
      }

      // Recharger la liste
      loadQuizzes();
      
    } catch (err) {
      alert(`Erreur: ${err.message || 'Erreur de suppression'}`);
    }
  };

  const handleToggleActive = async (quizId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('quiz')
        .update({ is_active: !currentStatus })
        .eq('id', quizId);

      if (error) {
        throw error;
      }

      loadQuizzes(); // Recharger la liste
    } catch (err) {
      console.error('Erreur modification statut:', err);
      alert('Erreur: Impossible de modifier le statut du quiz');
    }
  };

  const handleCategoryChange = async (quizId, newCategoryId) => {
    try {
      const { error } = await supabase
        .from('quiz')
        .update({ category_id: newCategoryId })
        .eq('id', quizId);

      if (error) {
        throw error;
      }

      loadQuizzes(); // Recharger la liste
    } catch (err) {
      console.error('Erreur modification catégorie:', err);
      alert('Erreur: Impossible de modifier la catégorie du quiz');
    }
  };

  const handleBack = () => {
    router.push('/admin');
  };

  const getQuestionCount = (quizData) => {
    if (!quizData || !quizData.questions) return 0;
    return quizData.questions.length;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className='container'>
        <div className='card'>
          <h1>Gestion des Quiz</h1>
          <p>Chargement des quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <div className='card'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Gestion des Quiz</h1>
          <button onClick={handleBack} className='btn btn-secondary'>
            Retour
          </button>
        </div>
        
        <div style={{ marginTop: '30px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCreateQuiz} 
            className='btn btn-primary' 
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
            📝 Créer un nouveau quiz
          </button>
          
          <button 
            onClick={() => router.push('/admin/quiz/editor-advanced')} 
            className='btn btn-success' 
            style={{ 
              fontSize: '16px', 
              padding: '15px 25px',
              backgroundColor: '#28a745',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <div>🚀 Éditeur Avancé</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 'normal' }}>
              Nouveaux types • Paramètres • Accessibilité
            </div>
          </button>

          <button 
            onClick={() => router.push('/admin/quiz/csv-creator')} 
            className='btn' 
            style={{ 
              fontSize: '16px', 
              padding: '15px 25px',
              backgroundColor: '#ff6b35',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              backgroundColor: '#ffc107',
              color: '#000',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              ✨ NOUVEAU
            </div>
            <div>📊 Créateur CSV</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 'normal' }}>
              Import manuel • Génération IA • Modèles
            </div>
          </button>

          <button 
            onClick={() => router.push('/admin/categories')} 
            className='btn btn-info' 
            style={{ 
              fontSize: '16px', 
              padding: '15px 25px',
              backgroundColor: '#17a2b8',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <div>🏷️ Catégories</div>
            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 'normal' }}>
              Créer • Modifier • Organiser
            </div>
          </button>
        </div>
        
        {error && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '5px',
            border: '1px solid #f5c6cb'
          }}>
            Erreur: {error}
            <button 
              onClick={loadQuizzes}
              style={{ marginLeft: '15px' }}
              className='btn btn-sm btn-secondary'
            >
              Reessayer
            </button>
          </div>
        )}
        
        <div style={{ marginTop: '40px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <h3 style={{ margin: 0 }}>
              Quiz existants ({filteredQuizzes.length}{filteredQuizzes.length !== quizzes.length ? ` sur ${quizzes.length}` : ''})
            </h3>
            
            {/* Filtres */}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Recherche */}
              <input
                type="text"
                placeholder="🔍 Rechercher un quiz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #28a745',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
              
              {/* Filtre par catégorie */}
              <CategorySelector
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                allowEmpty={true}
                emptyLabel="🏷️ Toutes les catégories"
              />
              
              {/* Bouton reset */}
              {(selectedCategory || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Reset
                </button>
              )}
            </div>
          </div>
          
          {quizzes.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Aucun quiz cree pour le moment.
            </p>
          ) : filteredQuizzes.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
              <h4>Aucun quiz trouvé</h4>
              <p>Essayez de modifier vos critères de recherche ou de filtre.</p>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              {filteredQuizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '15px',
                    backgroundColor: quiz.is_active ? 'white' : '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        margin: '0 0 10px 0', 
                        color: quiz.is_active ? '#333' : '#6c757d'
                      }}>
                        {quiz.title}
                        {!quiz.is_active && <span style={{ color: '#dc3545', marginLeft: '10px' }}>🚫 Inactif</span>}
                      </h4>
                      
                      {quiz.description && (
                        <p style={{ color: '#666', margin: '0 0 15px 0' }}>
                          {quiz.description}
                        </p>
                      )}
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '10px' 
                      }}>
                        <CategoryBadge 
                          category={quiz.quiz_categories} 
                          size="small"
                        />
                        
                        <div style={{
                          fontSize: '12px',
                          color: '#007bff',
                          cursor: 'pointer'
                        }}>
                          <CategorySelector
                            selectedCategory={quiz.category_id}
                            onCategoryChange={(newCategoryId) => handleCategoryChange(quiz.id, newCategoryId)}
                            allowEmpty={true}
                            emptyLabel="📁 Aucune catégorie"
                          />
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#888' }}>
                        📝 {getQuestionCount(quiz.quiz_data)} questions • 
                        📅 Cree le {formatDate(quiz.created_at)}
                        {quizSessions[quiz.id] > 0 && (
                          <span> • 📊 {quizSessions[quiz.id]} sessions</span>
                        )}
                        {quiz.users && (
                          <span> • 👤 {quiz.users.email}</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEditQuiz(quiz.id)}
                        className='btn btn-sm btn-primary'
                        title="Modifier le quiz avec l'éditeur avancé (IA disponible)"
                        style={{
                          position: 'relative',
                          fontWeight: 'bold'
                        }}
                      >
                        ✏️🤖 Modifier
                        <span style={{
                          position: 'absolute',
                          top: '-3px',
                          right: '-3px',
                          backgroundColor: '#ffc107',
                          color: '#000',
                          borderRadius: '8px',
                          padding: '1px 4px',
                          fontSize: '8px',
                          fontWeight: 'bold'
                        }}>
                          IA
                        </span>
                      </button>
                      
                      <button
                        onClick={() => handlePreviewQuiz(quiz.id)}
                        className='btn btn-sm btn-success'
                        title='Tester le quiz'
                        disabled={!quiz.is_active}
                      >
                        👁️ Apercu
                      </button>
                      
                      <button
                        onClick={() => handleDuplicateQuiz(quiz)}
                        className='btn btn-sm btn-secondary'
                        title='Dupliquer le quiz'
                      >
                        📄 Dupliquer
                      </button>
                      
                      <button
                        onClick={() => handleToggleActive(quiz.id, quiz.is_active)}
                        className={`btn btn-sm ${quiz.is_active ? 'btn-warning' : 'btn-info'}`}
                        title={quiz.is_active ? 'Desactiver' : 'Activer'}
                      >
                        {quiz.is_active ? '⏸️ Pause' : '▶️ Activer'}
                      </button>
                      
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Suppression directe au clic
                          try {
                            // Supprimer sessions
                            await supabase
                              .from('quiz_sessions')
                              .delete()
                              .eq('quiz_id', quiz.id);
                            
                            // Supprimer quiz
                            const { error } = await supabase
                              .from('quiz')
                              .delete()
                              .eq('id', quiz.id);
                            
                            if (!error) {
                              loadQuizzes(); // Recharger
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className='btn btn-sm btn-danger'
                        style={{ fontWeight: 'bold' }}
                      >
                        ❌ Effacer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}