import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CategorySelector({ 
  selectedCategory, 
  onCategoryChange, 
  allowEmpty = true,
  emptyLabel = "Toutes les catégories" 
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('quiz_categories')
        .select('id, name, icon, color')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erreur chargement catégories:', error);
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '10px', color: '#6c757d' }}>
        Chargement des catégories...
      </div>
    );
  }

  return (
    <select
      value={selectedCategory || ''}
      onChange={(e) => onCategoryChange(e.target.value || null)}
      style={{
        padding: '8px 12px',
        border: '2px solid #007bff',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: 'white',
        cursor: 'pointer',
        minWidth: '180px'
      }}
    >
      {allowEmpty && (
        <option value="">{emptyLabel}</option>
      )}
      
      {categories.map(category => (
        <option key={category.id} value={category.id}>
          {category.icon} {category.name}
        </option>
      ))}
    </select>
  );
}

// Composant pour afficher une catégorie avec style
export function CategoryBadge({ category, size = 'normal' }) {
  if (!category) {
    return (
      <span style={{
        padding: size === 'small' ? '2px 6px' : '4px 8px',
        backgroundColor: '#e9ecef',
        color: '#6c757d',
        borderRadius: '12px',
        fontSize: size === 'small' ? '11px' : '12px',
        fontWeight: 'bold'
      }}>
        📁 Sans catégorie
      </span>
    );
  }

  return (
    <span style={{
      padding: size === 'small' ? '2px 6px' : '4px 8px',
      backgroundColor: category.color + '20', // 20% opacity
      color: category.color,
      borderRadius: '12px',
      fontSize: size === 'small' ? '11px' : '12px',
      fontWeight: 'bold',
      border: `1px solid ${category.color}40`
    }}>
      {category.icon} {category.name}
    </span>
  );
}

// Hook pour gérer les catégories
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('quiz_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryById = (id) => {
    return categories.find(cat => cat.id === id) || null;
  };

  const getCategoryStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_category_stats');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Erreur statistiques catégories:', err);
      return [];
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    loadCategories,
    getCategoryById,
    getCategoryStats
  };
}