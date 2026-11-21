import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function readEnvVar(key: string): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (metaEnv && typeof metaEnv[key] === 'string') {
      return metaEnv[key]!.trim();
    }
  } catch {
    // Ignore when executed in pure Node test context
  }
  return '';
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
  }
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(readEnvVar('VITE_SUPABASE_URL'));
  const anonKey = readEnvVar('VITE_SUPABASE_ANON_KEY');
  if (!url || !anonKey) return false;
  if (url.includes('YOUR_PROJECT_REF') || anonKey.includes('YOUR_SUPABASE_')) return false;
  return url.startsWith('https://') && url.includes('supabase.');
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    const url = normalizeSupabaseUrl(readEnvVar('VITE_SUPABASE_URL'));
    const anonKey = readEnvVar('VITE_SUPABASE_ANON_KEY');
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
}
