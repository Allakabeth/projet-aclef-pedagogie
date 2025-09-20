import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    // Test 1: Vérifier si la table quiz_categories existe
    console.log('🔍 Test 1: Vérification de la table quiz_categories...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('quiz_categories')
      .select('id')
      .limit(1);

    if (tableError) {
      console.log('❌ Table quiz_categories introuvable:', tableError);
      return res.status(200).json({
        status: 'error',
        message: 'La table quiz_categories n\'existe pas encore',
        error: tableError,
        solution: 'Veuillez exécuter le script database/03-categories.sql dans votre dashboard Supabase'
      });
    }

    // Test 2: Compter les catégories
    const { count, error: countError } = await supabase
      .from('quiz_categories')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Erreur comptage catégories:', countError);
      return res.status(200).json({
        status: 'error',
        message: 'Erreur lors du comptage des catégories',
        error: countError
      });
    }

    // Test 3: Récupérer quelques catégories
    const { data: categories, error: dataError } = await supabase
      .from('quiz_categories')
      .select('id, name, icon, color')
      .limit(3);

    if (dataError) {
      console.log('❌ Erreur récupération catégories:', dataError);
      return res.status(200).json({
        status: 'error',
        message: 'Erreur lors de la récupération des catégories',
        error: dataError
      });
    }

    // Test 4: Vérifier si la colonne category_id existe dans la table quiz
    const { data: quizCheck, error: quizError } = await supabase
      .from('quiz')
      .select('id, category_id')
      .limit(1);

    const categoryColumnExists = !quizError || !quizError.message?.includes('category_id');

    console.log('✅ Tests réussis !');
    return res.status(200).json({
      status: 'success',
      message: 'Système de catégorisation opérationnel',
      data: {
        categoriesCount: count,
        sampleCategories: categories,
        categoryColumnExists,
        tests: {
          tableExists: true,
          canCount: !countError,
          canSelect: !dataError,
          quizColumnExists: categoryColumnExists
        }
      }
    });

  } catch (err) {
    console.error('🚨 Erreur générale:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur lors du test',
      error: err.message
    });
  }
}