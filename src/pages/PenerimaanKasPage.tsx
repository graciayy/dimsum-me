import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, Transaction, VerificationStatus } from '../types';
import { formatDateID, formatRupiah } from '../utils/formatters';

export function PenerimaanKasPage() {
  const { currentUser, transactions, qrisMutations, verifyTransactionPayment } = useApp();

  const [methodFilter, setMethodFilter] = useState<'Semua' | PaymentMethod>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | VerificationStatus>('Semua');
  const [search, setSearch] = useState('');
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const scopedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!isAdmin && t.cashierId !== currentUser?.id) return false;
      if (methodFilter !== 'Semua' && t.paymentMethod !== methodFilter) return false;
      if (statusFilter !== 'Semua' && t.verificationStatus !== statusFilter) return false;
      if (
        search.trim() &&
        !t.invoiceNo.toLowerCase().includes(search.toLowerCase()) &&
        !t.cashierName.toLowerCase().includes(search.toLowerCase()) &&
        !(t.qrisRef ?? '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, isAdmin, currentUser, methodFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const base = isAdmin
      ? transactions
      : transactions.filter((t) => t.cashierId === currentUser?.id);

    return {
      tunaiTotal: base
        .filter((t) => t.paymentMethod === 'Tunai')
        .reduce((s, t) => s + t.totalAmount, 0),
      qrisTotal: base
        .filter((t) => t.paymentMethod === 'QRIS')
        .reduce((s, t) => s + t.totalAmount, 0),
      pendingCount: base.filter((t) => t.verificationStatus === 'Menunggu Verifikasi').length,
      verifiedCount: base.filter((t) => t.verificationStatus === 'Terverifikasi').length,
    };
  }, [transactions, isAdmin, currentUser]);

  const matchedMutation = useMemo(() => {
    if (!inspectingTx || inspectingTx.paymentMethod !== 'QRIS') return null;
    return (
      qrisMutations.find(
        (m) =>
          m.merchantRef === inspectingTx.qrisRef ||
          m.matchedInvoiceNo === inspectingTx.invoiceNo
      ) ?? null
    );
  }, [inspectingTx, qrisMutations]);

  const handleDecision = (status: VerificationStatus) => {
    if (!inspectingTx) return;
    verifyTransactionPayment(
      inspectingTx.id,
      status,
      adminNote.trim() ||
        (status === 'Terverifikasi'
          ? 'Cocok dengan mutasi QRIS merchant.'
          : 'Tidak ditemukan pada mutasi merchant QRIS.')
    );
    setInspectingTx(null);
    setAdminNote('');
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">Penerimaan Kas</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F8EC] text-[#16A34A]">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Penerimaan Tunai</p>
              <p className="tabular-nums text-lg font-bold text-[#151923]">
                {formatRupiah(summary.tunaiTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F2FE] text-[#2563EB]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Penerimaan QRIS</p>
              <p className="tabular-nums text-lg font-bold text-[#151923]">
                {formatRupiah(summary.qrisTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-[#D97706]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Menunggu Verifikasi</p>
              <p className="tabular-nums text-lg font-bold text-[#151923]">
                {summary.pendingCount} transaksi
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Terverifikasi</p>
              <p className="tabular-nums text-lg font-bold text-[#151923]">
                {summary.verifiedCount} transaksi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari invoice, kasir, atau ref QRIS..."
            className="w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 pr-3 pl-9 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'Semua' | PaymentMethod)}
            aria-label="Filter metode pembayaran"
            className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-medium text-[#151923] focus:border-[#E85D3F] focus:outline-none"
          >
            <option value="Semua">Semua Metode</option>
            <option value="Tunai">Tunai</option>
            <option value="QRIS">QRIS</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Semua' | VerificationStatus)}
            aria-label="Filter status verifikasi"
            className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-medium text-[#151923] focus:border-[#E85D3F] focus:outline-none"
          >
            <option value="Semua">Semua Status</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Terverifikasi">Terverifikasi</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">No. Transaksi</th>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Kasir</th>
                <th className="px-4 py-3 font-semibold">Metode</th>
                <th className="px-4 py-3 font-semibold">Bukti / Ref. Merchant</th>
                <th className="px-4 py-3 text-right font-semibold">Nominal</th>
                <th className="px-4 py-3 font-semibold">Status Verifikasi</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {scopedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#FCF8F5]/70">
                  <td className="px-4 py-3 font-mono font-bold text-[#151923]">{tx.invoiceNo}</td>
                  <td className="tabular-nums px-4 py-3 text-[#6B7280]">
                    {formatDateID(tx.date)} · {tx.time}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#151923]">{tx.cashierName}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#151923]">{tx.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#6B7280]">
                    {tx.paymentMethod === 'QRIS' ? tx.qrisRef : 'Kas Laci POS'}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right font-bold text-[#151923]">
                    {formatRupiah(tx.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        tx.verificationStatus === 'Terverifikasi'
                          ? 'bg-emerald-50 text-[#16A34A]'
                          : tx.verificationStatus === 'Ditolak'
                            ? 'bg-red-50 text-[#DC3C2B]'
                            : 'bg-amber-50 text-[#D97706]'
                      }`}
                    >
                      {tx.verificationStatus === 'Terverifikasi' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : tx.verificationStatus === 'Ditolak' ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {tx.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tx.paymentMethod === 'QRIS' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingTx(tx);
                          setAdminNote(tx.notes ?? '');
                        }}
                        className="rounded-lg border border-[#F0E7E2] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#C93D22] hover:border-[#E85D3F] hover:bg-[#FDECE7]"
                      >
                        {isAdmin ? 'Periksa QRIS' : 'Lihat Bukti'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">Tercatat Tunai</span>
                    )}
                  </td>
                </tr>
              ))}
              {scopedTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">
                    Tidak ada catatan penerimaan kas yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Verifikasi QRIS Merchant */}
      {inspectingTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qris-verify-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="qris-verify-title" className="text-base font-bold text-[#151923]">
                Verifikasi Pembayaran QRIS · {inspectingTx.invoiceNo}
              </h3>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                aria-label="Tutup modal verifikasi"
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#FCF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3.5 text-xs">
                <p className="mb-2 font-bold text-[#151923]">Catatan POS Kasir</p>
                <p className="text-[#6B7280]">
                  Kasir: <strong className="text-[#151923]">{inspectingTx.cashierName}</strong>
                </p>
                <p className="text-[#6B7280]">
                  Ref QRIS: <strong className="font-mono text-[#151923]">{inspectingTx.qrisRef}</strong>
                </p>
                <p className="mt-1 text-[#6B7280]">
                  Nominal:{' '}
                  <strong className="tabular-nums text-[#C93D22]">
                    {formatRupiah(inspectingTx.totalAmount)}
                  </strong>
                </p>
              </div>

              <div
                className={`rounded-xl border p-3.5 text-xs ${
                  matchedMutation
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-red-200 bg-red-50/70'
                }`}
              >
                <p className="mb-2 flex items-center gap-1.5 font-bold text-[#151923]">
                  {matchedMutation ? (
                    <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[#DC3C2B]" />
                  )}
                  Mutasi QRIS Merchant
                </p>
                {matchedMutation ? (
                  <>
                    <p className="text-[#374151]">
                      Issuer: <strong>{matchedMutation.issuer}</strong>
                    </p>
                    <p className="font-mono text-[11px] text-[#374151]">
                      Ref: {matchedMutation.merchantRef}
                    </p>
                    <p className="mt-1 text-[#16A34A]">
                      Dana Masuk:{' '}
                      <strong className="tabular-nums">{formatRupiah(matchedMutation.amount)}</strong>{' '}
                      (Settled)
                    </p>
                  </>
                ) : (
                  <p className="text-[#DC3C2B]">
                    Tidak ditemukan mutasi settlement pada riwayat QRIS merchant untuk referensi{' '}
                    <span className="font-mono">{inspectingTx.qrisRef}</span>.
                  </p>
                )}
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-[#6B7280]">
                  Catatan Verifikasi Admin
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Tambahkan catatan hasil pencocokan mutasi..."
                    className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                  />
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDecision('Ditolak')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-[#DC3C2B] hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('Terverifikasi')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verifikasi Sah
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-[#FCF8F5] p-3 text-xs text-[#6B7280]">
                Hanya Admin yang memiliki kewenangan mengubah status verifikasi mutasi QRIS.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
