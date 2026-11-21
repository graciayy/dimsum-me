import { Shield, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ProfilPage() {
  const { isSupabaseMode, currentUser, switchRole } = useApp();
  const role = currentUser?.role ?? 'admin';

  return (
    <div className="mx-auto max-w-[920px] space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">Profil Pengguna</h1>
      </div>

      <div className="rounded-2xl border border-[#F0E7E2] bg-white p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FDECE7] text-xl font-extrabold text-[#C93D22]">
              {currentUser?.avatarLabel ?? 'AD'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#151923]">{currentUser?.name}</h2>
              <p className="text-xs text-[#6B7280]">{currentUser?.email}</p>
              <p className="mt-1 text-xs font-medium text-[#151923]">
                Shift: {currentUser?.shift}
              </p>
            </div>
          </div>

          <span className="rounded-xl bg-[#FDECE7] px-3.5 py-1.5 text-xs font-bold uppercase text-[#C93D22]">
            Role: {role}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#F0E7E2] pt-5 md:grid-cols-2">
          <div
            className={`rounded-2xl border p-4 ${
              role === 'admin' ? 'border-[#E85D3F] bg-[#FFF9F7]' : 'border-[#F0E7E2] bg-[#FCF8F5]'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#151923]">
                <Shield className="h-4 w-4 text-[#E85D3F]" />
                Hak Akses ADMIN
              </span>
              {role === 'admin' && (
                <span className="text-[11px] font-bold text-[#16A34A]">Sedang Aktif</span>
              )}
            </div>
            <ul className="space-y-1 text-xs text-[#6B7280]">
              <li>• Mengelola produk, pengguna, &amp; seluruh transaksi</li>
              <li>• Verifikasi pembayaran QRIS terhadap mutasi merchant</li>
              <li>• Melakukan rekonsiliasi &amp; mengatur bobot kriteria SAW</li>
              <li>• Menjalankan training/evaluasi C4.5 &amp; ekspor semua laporan</li>
            </ul>
            {!isSupabaseMode && (
              <button
                type="button"
                onClick={() => switchRole('admin')}
                disabled={role === 'admin'}
                className="mt-4 w-full rounded-xl bg-[#E85D3F] py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-[#C93D22]"
              >
                Gunakan Role Admin
              </button>
            )}
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              role === 'kasir' ? 'border-[#E85D3F] bg-[#FFF9F7]' : 'border-[#F0E7E2] bg-[#FCF8F5]'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[#151923]">
                <UserCheck className="h-4 w-4 text-[#2563EB]" />
                Hak Akses KASIR
              </span>
              {role === 'kasir' && (
                <span className="text-[11px] font-bold text-[#16A34A]">Sedang Aktif</span>
              )}
            </div>
            <ul className="space-y-1 text-xs text-[#6B7280]">
              <li>• Melihat ringkasan dashboard operasional kasir</li>
              <li>• Melakukan transaksi POS &amp; mencetak struk pembayaran</li>
              <li>• Melihat transaksi &amp; penerimaan kas miliknya sendiri</li>
              <li>• Melihat status penutupan kas (pembatasan menu SAW &amp; C4.5)</li>
            </ul>
            {!isSupabaseMode && (
              <button
                type="button"
                onClick={() => switchRole('kasir')}
                disabled={role === 'kasir'}
                className="mt-4 w-full rounded-xl border border-[#F0E7E2] bg-white py-2 text-xs font-bold text-[#151923] disabled:opacity-50 hover:bg-[#FAF2EE]"
              >
                Gunakan Role Kasir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
