import dotenv from 'dotenv';

dotenv.config();

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  supabaseUrl: process.env.SUPABASE_PROJECT_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required');
}

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  throw new Error('Supabase configuration is required');
}