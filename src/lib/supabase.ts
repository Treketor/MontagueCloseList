import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const isSecretKey = supabaseAnonKey?.startsWith('sb_secret_') ?? false

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !isSecretKey,
)

if (import.meta.env.DEV && isSecretKey) {
  console.warn(
    'Supabase is using a secret key in VITE_SUPABASE_ANON_KEY. Use the public anon or publishable key in browser code.',
  )
}

if (import.meta.env.DEV && !isSupabaseConfigured && !isSecretKey) {
  console.warn(
    'Supabase env vars are missing. CloseList is running in local-only mode.',
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null
