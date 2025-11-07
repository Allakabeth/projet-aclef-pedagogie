import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger manuellement .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
  const userId = '420ed1cc-def4-48e9-b68b-bf1dfa65185b';
  const prenom = 'Alain';
  const nom = 'Couchy';

  // Normalisation selon la logique de l'app
  const defaultPassword = (prenom + nom)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  console.log(`🔐 Réinitialisation du mot de passe pour ${prenom} ${nom}`);
  console.log(`📝 Mot de passe par défaut : ${defaultPassword}`);

  // Hashage avec bcrypt (salt rounds: 10)
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Mise à jour dans la base
  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      custom_password: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }

  console.log('✅ Mot de passe réinitialisé avec succès !');
  console.log(`\n📋 Informations de connexion :`);
  console.log(`   Login : ${defaultPassword}`);
  console.log(`   Mot de passe : ${defaultPassword}`);
  console.log(`   custom_password : false`);
}

resetPassword();
