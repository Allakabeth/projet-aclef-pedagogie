import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return await getCategories(req, res);
    case 'POST':
      // Vérifier si c'est une duplication
      if (req.body.action === 'duplicate') {
        return await duplicateCategory(req, res);
      }
      return await createCategory(req, res);
    case 'PUT':
      return await updateCategory(req, res);
    case 'DELETE':
      return await deleteCategory(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Récupérer toutes les catégories
async function getCategories(req, res) {
  try {
    const { data, error } = await supabase
      .from('quiz_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Erreur récupération catégories:', error);
      return res.status(500).json({ error: 'Erreur récupération catégories' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Dupliquer une catégorie
async function duplicateCategory(req, res) {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: 'ID de la catégorie à dupliquer requis' });
    }

    // Récupérer la catégorie source
    const { data: sourceCategory, error: fetchError } = await supabase
      .from('quiz_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (fetchError || !sourceCategory) {
      return res.status(404).json({ error: 'Catégorie source non trouvée' });
    }

    // Créer un nom unique pour la copie
    let copyName = `${sourceCategory.name} (Copie)`;
    let counter = 1;
    
    // Vérifier si le nom existe déjà et ajouter un numéro si nécessaire
    while (true) {
      const { data: existingCategory } = await supabase
        .from('quiz_categories')
        .select('id')
        .eq('name', copyName)
        .single();

      if (!existingCategory) break;
      
      counter++;
      copyName = `${sourceCategory.name} (Copie ${counter})`;
    }

    // Dupliquer la catégorie
    const { data, error } = await supabase
      .from('quiz_categories')
      .insert([{
        name: copyName,
        description: sourceCategory.description,
        icon: sourceCategory.icon,
        color: sourceCategory.color,
        order_index: sourceCategory.order_index + 1
      }])
      .select()
      .single();

    if (error) {
      console.error('Erreur duplication catégorie:', error);
      return res.status(500).json({ error: 'Erreur duplication catégorie' });
    }

    return res.status(201).json({
      ...data,
      message: 'Catégorie dupliquée avec succès'
    });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Créer une nouvelle catégorie
async function createCategory(req, res) {
  try {
    const { name, description, icon, color, order_index } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
    }

    const { data, error } = await supabase
      .from('quiz_categories')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || '📁',
        color: color || '#6c757d',
        order_index: order_index || 0
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Cette catégorie existe déjà' });
      }
      console.error('Erreur création catégorie:', error);
      return res.status(500).json({ error: 'Erreur création catégorie' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Mettre à jour une catégorie
async function updateCategory(req, res) {
  try {
    const { id, name, description, icon, color, order_index, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID de la catégorie requis' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('quiz_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Cette catégorie existe déjà' });
      }
      console.error('Erreur mise à jour catégorie:', error);
      return res.status(500).json({ error: 'Erreur mise à jour catégorie' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Supprimer une catégorie (soft delete)
async function deleteCategory(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de la catégorie requis' });
    }

    // Soft delete - marquer comme inactif
    const { data, error } = await supabase
      .from('quiz_categories')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur suppression catégorie:', error);
      return res.status(500).json({ error: 'Erreur suppression catégorie' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    return res.status(200).json({ message: 'Catégorie supprimée avec succès' });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}