import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseServiceRoleKey } from './supabaseKeySafety';

export { isSupabaseServiceRoleKey as isServiceRoleKey } from './supabaseKeySafety';

let cachedClient: SupabaseClient | null = null;

function isDemoBuild(): boolean {
  return readEnvVar('VITE_DEMO_MODE').toLowerCase() === 'true';
}

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

export function getSupabaseConfigError(): string | null {
  if (isDemoBuild()) return null;
  const rawUrl = readEnvVar('VITE_SUPABASE_URL');
  const anonKey = readEnvVar('VITE_SUPABASE_ANON_KEY');
  if (!rawUrl && !anonKey) return null;
  if (!rawUrl || !anonKey) {
    return 'Supabase memerlukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.';
  }
  if (/YOUR_/i.test(rawUrl) || /YOUR_/i.test(anonKey)) {
    return 'Konfigurasi Supabase masih menggunakan nilai placeholder.';
  }
  if (isSupabaseServiceRoleKey(anonKey)) {
    return 'service_role/secret key tidak boleh digunakan di aplikasi frontend. Gunakan anon/publishable key.';
  }
  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  if (!normalizedUrl.startsWith('https://') || !normalizedUrl.includes('supabase.')) {
    return 'VITE_SUPABASE_URL harus berupa URL HTTPS proyek Supabase yang valid.';
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  if (isDemoBuild()) return false;
  return Boolean(
    readEnvVar('VITE_SUPABASE_URL') || readEnvVar('VITE_SUPABASE_ANON_KEY')
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
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
