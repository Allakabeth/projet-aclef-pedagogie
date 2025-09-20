import { useState, useEffect } from 'react';
import Head from 'next/head';

const EMOJI_LIST = ['📁', '🔢', '📚', '🏛️', '🌍', '🔬', '🧠', '⚽', '💻', '🎨', '🎵', '🎬', '🍔', '🚗', '✈️', '🏠', '🌸', '🎯'];
const COLOR_LIST = ['#dc3545', '#28a745', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#6c757d', '#343a40', '#007bff', '#e83e8c', '#f8f9fa'];

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📁',
    color: '#6c757d',
    order_index: 0
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des catégories');
      }
      
      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger les catégories. Assurez-vous que le script SQL a été exécuté.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        color: category.color,
        order_index: category.order_index
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: '📁',
        color: '#6c757d',
        order_index: Math.max(...categories.map(c => c.order_index), -1) + 1
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: '📁',
      color: '#6c757d',
      order_index: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Le nom de la catégorie est requis');
      return;
    }

    try {
      const url = '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const body = editingCategory 
        ? { ...formData, id: editingCategory.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await loadCategories();
      closeModal();
      alert(editingCategory ? 'Catégorie modifiée avec succès!' : 'Catégorie créée avec succès!');
    } catch (err) {
      console.error('Erreur:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      await loadCategories();
      alert('Catégorie supprimée avec succès!');
    } catch (err) {
      console.error('Erreur:', err);
      alert(err.message);
    }
  };

  const handleDuplicate = async (categoryId) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'duplicate',
          categoryId: categoryId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la duplication');
      }

      await loadCategories();
      alert('Catégorie dupliquée avec succès!');
    } catch (err) {
      console.error('Erreur:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Chargement des catégories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h3>Erreur</h3>
        <p>{error}</p>
        <button onClick={loadCategories} style={{ padding: '10px 20px', marginTop: '10px' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Gestion des Catégories - ACLEF Quiz</title>
      </Head>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0 }}>🏷️ Gestion des Catégories</h1>
          <button 
            onClick={() => openModal()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Nouvelle Catégorie
          </button>
        </div>

        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Aucune catégorie</h3>
            <p>Créez votre première catégorie pour organiser vos quiz.</p>
            <button 
              onClick={() => openModal()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Créer une catégorie
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {categories.map(category => (
              <div 
                key={category.id}
                style={{
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px', marginRight: '10px' }}>{category.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, color: category.color }}>{category.name}</h3>
                    <small style={{ color: '#6c757d' }}>Ordre: {category.order_index}</small>
                  </div>
                </div>
                
                {category.description && (
                  <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
                    {category.description}
                  </p>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: '15px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => openModal(category)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Modifier
                  </button>
                  
                  <button
                    onClick={() => handleDuplicate(category.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📋 Dupliquer
                  </button>
                  
                  <button
                    onClick={() => handleDelete(category.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>

                {/* Pastille de couleur */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: category.color,
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  title={`Couleur: ${category.color}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Modal de création/édition */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginTop: 0 }}>
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Icône
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      {EMOJI_LIST.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: emoji })}
                          style={{
                            padding: '8px',
                            border: formData.icon === emoji ? '2px solid #007bff' : '2px solid #e9ecef',
                            borderRadius: '6px',
                            backgroundColor: formData.icon === emoji ? '#e7f3ff' : 'white',
                            cursor: 'pointer',
                            fontSize: '18px'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Ou saisissez un emoji"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '2px solid #e9ecef',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Couleur
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      {COLOR_LIST.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          style={{
                            width: '30px',
                            height: '30px',
                            border: formData.color === color ? '3px solid #333' : '2px solid #ddd',
                            borderRadius: '6px',
                            backgroundColor: color,
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{
                        width: '100%',
                        height: '40px',
                        border: '2px solid #e9ecef',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: '#6c757d' }}>Plus le nombre est petit, plus la catégorie apparaît en premier</small>
                </div>

                {/* Prévisualisation */}
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Prévisualisation :</h4>
                  <div style={{ 
                    display: 'inline-block',
                    padding: '4px 8px',
                    backgroundColor: formData.color + '20',
                    color: formData.color,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: `1px solid ${formData.color}40`
                  }}>
                    {formData.icon} {formData.name || 'Nom de la catégorie'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {editingCategory ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}