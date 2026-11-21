export function isSupabaseServiceRoleKey(key: string): boolean {
  if (/^sb_secret_/i.test(key)) return true;
  const payload = key.split('.')[1];
  if (!payload || typeof atob !== 'function') return false;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return decoded.role === 'service_role';
  } catch {
    return false;
  }
}
