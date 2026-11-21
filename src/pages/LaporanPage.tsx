import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportReportToPdf } from '../services/pdfService';
import { ReportHistoryItem } from '../types';
import { formatDateID, formatRupiah, generateCsvString } from '../utils/formatters';

type ReportType = ReportHistoryItem['type'];

const REPORT_TYPES: ReportType[] = [
  'Laporan Penjualan',
  'Laporan Penerimaan Kas',
  'Laporan QRIS',
  'Laporan Penutupan Kas Harian',
  'Laporan Rekonsiliasi',
  'Laporan Analisis SAW',
  'Laporan Klasifikasi C4.5',
];

export function LaporanPage() {
  const {
    currentUser,
    users,
    transactions,
    reconciliations,
    sawResult,
    c45Evaluation,
    addReportHistory,
  } = useApp();

  const [reportType, setReportType] = useState<ReportType>('Laporan Penjualan');
  const [startDate, setStartDate] = useState('2026-09-21');
  const [endDate, setEndDate] = useState('2026-09-23');
  const [cashierFilter, setCashierFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const isAdmin = currentUser?.role === 'admin';
  const availableReportTypes = useMemo(
    () => (isAdmin ? REPORT_TYPES : REPORT_TYPES.slice(0, 4)),
    [isAdmin]
  );
  const activeReportType = availableReportTypes.includes(reportType)
    ? reportType
    : availableReportTypes[0];

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      if (!isAdmin && t.cashierId !== currentUser?.id) return false;
      if (t.date < startDate || t.date > endDate) return false;
      if (cashierFilter !== 'Semua' && t.cashierName !== cashierFilter) return false;
      if (statusFilter !== 'Semua' && t.verificationStatus !== statusFilter) return false;
      if (activeReportType === 'Laporan QRIS' && t.paymentMethod !== 'QRIS') return false;
      return true;
    });
  }, [
    transactions,
    isAdmin,
    currentUser,
    startDate,
    endDate,
    cashierFilter,
    statusFilter,
    activeReportType,
  ]);

  const previewData = useMemo(() => {
    if (
      activeReportType === 'Laporan Rekonsiliasi' ||
      activeReportType === 'Laporan Penutupan Kas Harian'
    ) {
      const recs = reconciliations.filter(
        (r) => (isAdmin || r.cashierId === currentUser?.id) && r.date >= startDate && r.date <= endDate
      );
      return {
        headers: ['Tanggal', 'Shift', 'Kasir', 'Total Jual', 'Tunai Aktual', 'QRIS Valid', 'Selisih', 'Status'],
        rows: recs.map((r) => [
          formatDateID(r.date),
          r.shift,
          r.cashierName,
          formatRupiah(r.totalSales),
          formatRupiah(r.actualCash),
          formatRupiah(r.verifiedQris),
          formatRupiah(r.difference),
          r.status,
        ]),
        summary: [
          { label: 'Jumlah Shift', value: `${recs.length}` },
          {
            label: 'Total Penjualan',
            value: formatRupiah(recs.reduce((s, r) => s + r.totalSales, 0)),
          },
          {
            label: 'Total Selisih',
            value: formatRupiah(recs.reduce((s, r) => s + r.difference, 0)),
          },
        ],
      };
    }

    if (activeReportType === 'Laporan Analisis SAW') {
      return {
        headers: ['Rank', 'Kasir & Shift', 'Periode', 'Nilai Preferensi (V)', 'Kategori'],
        rows: sawResult.rows.map((r) => [
          `#${r.rank}`,
          r.cashierName,
          r.period,
          r.preferenceValue.toFixed(3),
          r.category,
        ]),
        summary: [
          { label: 'Rata-rata SAW', value: sawResult.averageScore.toFixed(2) },
          { label: 'Status', value: sawResult.overallStatus },
          { label: 'Alternatif', value: `${sawResult.rows.length}` },
        ],
      };
    }

    if (activeReportType === 'Laporan Klasifikasi C4.5') {
      return {
        headers: ['ID Uji', 'Selisih', 'QRIS', 'Bukti', 'Aktual', 'Prediksi C4.5'],
        rows: c45Evaluation.testPredictions.map((p) => [
          p.record.id,
          p.record.selisihNominal,
          p.record.verifikasiQris,
          p.record.kelengkapanBukti,
          p.record.label,
          p.predicted,
        ]),
        summary: [
          { label: 'Accuracy', value: `${(c45Evaluation.accuracy * 100).toFixed(1)}%` },
          { label: 'Precision', value: `${(c45Evaluation.macroPrecision * 100).toFixed(1)}%` },
          { label: 'F1-Score', value: `${(c45Evaluation.macroF1 * 100).toFixed(1)}%` },
        ],
      };
    }

    // Sales, Penerimaan Kas, QRIS
    return {
      headers: ['Invoice', 'Tanggal & Jam', 'Kasir', 'Metode', 'Nominal', 'Verifikasi'],
      rows: filteredTx.map((t) => [
        t.invoiceNo,
        `${t.date} ${t.time}`,
        t.cashierName,
        t.paymentMethod,
        formatRupiah(t.totalAmount),
        t.verificationStatus,
      ]),
      summary: [
        { label: 'Jumlah Transaksi', value: `${filteredTx.length}` },
        {
          label: 'Total Nominal',
          value: formatRupiah(filteredTx.reduce((s, t) => s + t.totalAmount, 0)),
        },
        {
          label: 'Terverifikasi',
          value: `${filteredTx.filter((t) => t.verificationStatus === 'Terverifikasi').length}`,
        },
      ],
    };
  }, [
    activeReportType,
    reconciliations,
    isAdmin,
    currentUser,
    startDate,
    endDate,
    sawResult,
    c45Evaluation,
    filteredTx,
  ]);

  const handleDownloadPdf = () => {
    exportReportToPdf({
      title: activeReportType,
      subtitle: 'Laporan Resmi Sistem Administrasi & Evaluasi Kas Dimsum Me',
      generatedBy: currentUser?.name ?? 'Admin Dimsum Me',
      periodLabel: `${formatDateID(startDate)} – ${formatDateID(endDate)}`,
      summaryLines: previewData.summary,
      headers: previewData.headers,
      rows: previewData.rows,
      filename: `${activeReportType.toLowerCase().replace(/\s+/g, '-')}-${endDate}.pdf`,
    });
    addReportHistory({
      title: activeReportType,
      type: activeReportType,
      date: endDate,
      createdBy: currentUser?.name ?? 'Admin Dimsum Me',
    });
  };

  const handleExportCsv = () => {
    const csv = generateCsvString(previewData.headers, previewData.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeReportType.toLowerCase().replace(/\s+/g, '-')}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">Pusat Laporan</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#151923] hover:bg-[#FAF2EE]"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#16A34A]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#151923] hover:bg-[#FAF2EE]"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E85D3F] px-4 py-2 text-xs font-bold text-white hover:bg-[#C93D22]"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print grid grid-cols-1 gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-[#6B7280]">
          Jenis Laporan
          <select
            value={activeReportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923]"
          >
            {availableReportTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[#6B7280]">
          Tanggal Awal
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923]"
          />
        </label>

        <label className="text-xs font-medium text-[#6B7280]">
          Tanggal Akhir
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923]"
          />
        </label>

        <label className="text-xs font-medium text-[#6B7280]">
          Kasir
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923]"
          >
            <option value="Semua">Semua Kasir</option>
            {users
              .filter((u) => u.role === 'kasir')
              .map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
          </select>
        </label>

        <label className="text-xs font-medium text-[#6B7280]">
          Status Pembayaran
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923]"
          >
            <option value="Semua">Semua Status</option>
            <option value="Terverifikasi">Terverifikasi</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </label>
      </div>

      {/* Preview Container */}
      <section className="print-only-area rounded-2xl border border-[#F0E7E2] bg-white p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[#F0E7E2] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#151923]">{activeReportType}</h2>
            <p className="text-xs text-[#6B7280]">
              Periode: {formatDateID(startDate)} – {formatDateID(endDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {previewData.summary.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3.5 py-2 text-xs"
              >
                <span className="text-[#6B7280]">{item.label}: </span>
                <strong className="tabular-nums text-[#151923]">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                {previewData.headers.map((h) => (
                  <th key={h} className="px-3.5 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {previewData.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FCF8F5]/70">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="tabular-nums px-3.5 py-2.5 text-[#151923]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {previewData.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={previewData.headers.length}
                    className="px-4 py-8 text-center text-[#6B7280]"
                  >
                    Tidak ada data pada rentang filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
