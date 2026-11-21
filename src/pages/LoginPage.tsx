import { useState } from 'react';
import { LogIn, Shield, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ASSETS } from '../data/seedData';

export function LoginPage() {
  const { isSupabaseMode, loginAsRole, loginWithEmail } = useApp();
  const [email, setEmail] = useState(isSupabaseMode ? '' : 'admin@dimsumme.local');
  const [password, setPassword] = useState(isSupabaseMode ? '' : 'dimsumme123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Masukkan kata sandi terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await loginWithEmail(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Gagal masuk ke sistem.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FCF8F5] p-5">
      <div className="w-full max-w-md rounded-2xl border border-[#F0E7E2] bg-white p-7 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={ASSETS.logo}
            alt="Dimsum Me Logo"
            className="h-16 w-16 rounded-2xl object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="mt-2 text-2xl font-extrabold text-[#C93D22]">Dimsum Me</h1>
          <p className="text-xs text-[#6B7280]">
            Sistem Informasi Penjualan &amp; Evaluasi Ketepatan Kas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block text-xs font-semibold text-[#151923]">
            Email Akun
            <input
              type="email"
              required
              value={email}
              placeholder="nama@dimsumme.local"
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3.5 py-2.5 text-xs focus:border-[#E85D3F] focus:bg-white focus:outline-none"
            />
          </label>

          <label className="block text-xs font-semibold text-[#151923]">
            Kata Sandi
            <input
              type="password"
              required
              value={password}
              placeholder="Masukkan kata sandi"
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3.5 py-2.5 text-xs focus:border-[#E85D3F] focus:bg-white focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC3C2B]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E85D3F] py-2.5 text-xs font-bold text-white hover:bg-[#C93D22] disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {submitting ? 'Memverifikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {!isSupabaseMode && (
          <div className="mt-6 border-t border-[#F0E7E2] pt-4">
            <p className="mb-2.5 text-center text-[11px] font-semibold text-[#6B7280]">
              Akses Cepat
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => loginAsRole('admin')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 text-xs font-semibold text-[#151923] hover:border-[#E85D3F]"
              >
                <Shield className="h-3.5 w-3.5 text-[#E85D3F]" />
                Masuk Admin
              </button>
              <button
                type="button"
                onClick={() => loginAsRole('kasir')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 text-xs font-semibold text-[#151923] hover:border-[#E85D3F]"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#2563EB]" />
                Masuk Kasir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
