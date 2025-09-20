// Types générés pour les tables quiz
// Basé sur la structure de la base de données Supabase

export interface QuizCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  quiz_data: QuizData;
  is_active?: boolean;
  created_at?: string;
  category_id?: string;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  user_id: string;
  score?: number;
  total_questions?: number;
  completed?: boolean;
  session_data?: any;
  created_at?: string;
}

export interface User {
  id: string;
  prenom?: string;
  nom?: string;
  role?: string;
  email?: string;
  dispositif?: string;
  initiales?: string;
  date_debut?: string;
  date_fin?: string;
  archive?: boolean;
  created_at?: string;
  password_hash?: string;
  must_change_password?: boolean;
  password_changed_at?: string;
  last_login?: string;
  custom_password?: string;
  date_entree_formation?: string;
  date_sortie_previsionnelle?: string;
  date_fin_formation_reelle?: string;
  lieu_formation_id?: string;
  statut_formation?: string;
  date_suspension?: string;
  motif_suspension?: string;
  date_reprise_prevue?: string;
  identifiant?: string;
}

// Structure des données de quiz (stockées en JSONB)
export interface QuizData {
  questions: QuizQuestion[];
  settings?: QuizSettings;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'text' | 'audio';
  answers: QuizAnswer[];
  correct_answer?: string | number;
  explanation?: string;
  audio_url?: string;
  image_url?: string;
  points?: number;
}

export interface QuizAnswer {
  id: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

export interface QuizSettings {
  time_limit?: number;
  show_correct_answers?: boolean;
  shuffle_questions?: boolean;
  shuffle_answers?: boolean;
  allow_retries?: boolean;
  passing_score?: number;
}

// Types pour les réponses de l'API
export interface QuizWithCategory extends Quiz {
  quiz_categories?: QuizCategory;
}

export interface QuizSessionWithDetails extends QuizSession {
  quiz?: Quiz;
  users?: User;
}

// Types pour les formulaires
export interface CreateQuizForm {
  title: string;
  description?: string;
  category_id?: string;
  quiz_data: QuizData;
}

export interface QuizResult {
  session_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  answers: UserAnswer[];
}

export interface UserAnswer {
  question_id: string;
  answer: string | number;
  is_correct: boolean;
  points_earned: number;
}