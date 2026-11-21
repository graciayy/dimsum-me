import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReconciliationRecord, ReconciliationStatus } from '../types';
import { formatDateID, formatRupiah } from '../utils/formatters';

export function RekonsiliasiPage() {
  const { currentUser, reconciliations, updateReconciliation } = useApp();
  const [statusFilter, setStatusFilter] = useState<'Semua' | ReconciliationStatus>('Semua');
  const [editingRec, setEditingRec] = useState<ReconciliationRecord | null>(null);
  const [actualCashInput, setActualCashInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const filtered = useMemo(() => {
    return reconciliations.filter((r) => {
      if (!isAdmin && r.cashierId !== currentUser?.id) return false;
      if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reconciliations, isAdmin, currentUser, statusFilter]);

  const counts = useMemo(() => {
    const base = isAdmin
      ? reconciliations
      : reconciliations.filter((r) => r.cashierId === currentUser?.id);
    return {
      sesuai: base.filter((r) => r.status === 'Sesuai').length,
      perluDicek: base.filter((r) => r.status === 'Perlu Dicek').length,
      tidakSesuai: base.filter((r) => r.status === 'Tidak Sesuai').length,
    };
  }, [reconciliations, isAdmin, currentUser]);

  const openInspect = (rec: ReconciliationRecord) => {
    setEditingRec(rec);
    setActualCashInput(String(rec.actualCash));
    setNoteInput(rec.adminNote);
  };

  const handleSave = () => {
    if (!editingRec || !isAdmin) return;
    const parsedCash = Math.max(0, parseInt(actualCashInput.replace(/\D/g, ''), 10) || 0);
    updateReconciliation(editingRec.id, parsedCash, noteInput.trim() || 'Diperiksa.');
    setEditingRec(null);
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">
            Rekonsiliasi Penjualan &amp; Kas
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {(['Semua', 'Sesuai', 'Perlu Dicek', 'Tidak Sesuai'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#E85D3F] text-white'
                  : 'border border-[#F0E7E2] bg-white text-[#6B7280] hover:bg-[#FAF2EE]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <span className="text-xs font-medium text-[#6B7280]">Shift Sesuai</span>
          <span className="tabular-nums rounded-lg bg-emerald-50 px-3 py-1 text-base font-bold text-[#16A34A]">
            {counts.sesuai}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <span className="text-xs font-medium text-[#6B7280]">Shift Perlu Dicek</span>
          <span className="tabular-nums rounded-lg bg-amber-50 px-3 py-1 text-base font-bold text-[#D97706]">
            {counts.perluDicek}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <span className="text-xs font-medium text-[#6B7280]">Shift Tidak Sesuai</span>
          <span className="tabular-nums rounded-lg bg-red-50 px-3 py-1 text-base font-bold text-[#DC3C2B]">
            {counts.tidakSesuai}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">Tanggal &amp; Shift</th>
                <th className="px-4 py-3 font-semibold">Kasir</th>
                <th className="px-4 py-3 text-right font-semibold">Total Penjualan</th>
                <th className="px-4 py-3 text-right font-semibold">Tunai Tercatat</th>
                <th className="px-4 py-3 text-right font-semibold">QRIS Tercatat</th>
                <th className="px-4 py-3 text-right font-semibold">Tunai Aktual</th>
                <th className="px-4 py-3 text-right font-semibold">QRIS Terverifikasi</th>
                <th className="px-4 py-3 text-right font-semibold">Selisih</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#FCF8F5]/70">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#151923]">{formatDateID(rec.date)}</p>
                    <p className="text-[11px] text-[#6B7280]">{rec.shift}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#151923]">{rec.cashierName}</td>
                  <td className="tabular-nums px-4 py-3 text-right font-semibold">
                    {formatRupiah(rec.totalSales)}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right text-[#6B7280]">
                    {formatRupiah(rec.recordedCash)}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right text-[#6B7280]">
                    {formatRupiah(rec.recordedQris)}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right font-semibold text-[#151923]">
                    {formatRupiah(rec.actualCash)}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right font-semibold text-[#151923]">
                    {formatRupiah(rec.verifiedQris)}
                  </td>
                  <td
                    className={`tabular-nums px-4 py-3 text-right font-bold ${
                      rec.difference === 0
                        ? 'text-[#16A34A]'
                        : Math.abs(rec.difference) <= 50000
                          ? 'text-[#D97706]'
                          : 'text-[#DC3C2B]'
                    }`}
                  >
                    {formatRupiah(rec.difference)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                        rec.status === 'Sesuai'
                          ? 'bg-emerald-50 text-[#16A34A]'
                          : rec.status === 'Perlu Dicek'
                            ? 'bg-amber-50 text-[#D97706]'
                            : 'bg-red-50 text-[#DC3C2B]'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openInspect(rec)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#F0E7E2] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#151923] hover:border-[#E85D3F] hover:text-[#C93D22]"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {isAdmin ? 'Periksa' : 'Lihat Detail'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Pemeriksaan & Catatan Admin */}
      {editingRec && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#151923]">
                  Detail Rekonsiliasi · {editingRec.cashierName}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {formatDateID(editingRec.date)} · {editingRec.shift}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRec(null)}
                aria-label="Tutup modal rekonsiliasi"
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#FCF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3.5 text-xs">
              <div>
                <p className="text-[#6B7280]">Total Penjualan POS</p>
                <p className="tabular-nums font-bold text-[#151923]">
                  {formatRupiah(editingRec.totalSales)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">QRIS Terverifikasi</p>
                <p className="tabular-nums font-bold text-[#151923]">
                  {formatRupiah(editingRec.verifiedQris)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Tunai Tercatat POS</p>
                <p className="tabular-nums font-bold text-[#151923]">
                  {formatRupiah(editingRec.recordedCash)}
                </p>
              </div>
              <div>
                <p className="text-[#6B7280]">Estimasi Selisih</p>
                <p className="tabular-nums font-bold text-[#E85D3F]">
                  {formatRupiah(
                    (parseInt(actualCashInput.replace(/\D/g, ''), 10) || 0) +
                      editingRec.verifiedQris -
                      editingRec.totalSales
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-[#6B7280]">
                Total Uang Tunai Aktual di Laci (Rp)
                <input
                  type="number"
                  min={0}
                  disabled={!isAdmin}
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="tabular-nums mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-75"
                />
              </label>

              <label className="block text-xs font-medium text-[#6B7280]">
                Catatan Pemeriksaan / Penutupan Kas
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-75"
                />
              </label>

              {!isAdmin && (
                <p className="rounded-xl bg-[#FCF8F5] px-3 py-2 text-[11px] font-medium text-[#6B7280]">
                  Hanya Admin yang berwenang memeriksa dan mengubah hasil rekonsiliasi.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setEditingRec(null)}
                className="flex-1 rounded-xl border border-[#F0E7E2] bg-white py-2.5 text-xs font-semibold text-[#151923] hover:bg-[#FCF8F5]"
              >
                {isAdmin ? 'Batal' : 'Tutup'}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E85D3F] py-2.5 text-xs font-bold text-white hover:bg-[#C93D22]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Simpan Rekonsiliasi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
