import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Package,
  Plus,
  QrCode,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';
import { SalesBarChart } from '../components/charts/SalesBarChart';
import { SawGaugeChart } from '../components/charts/SawGaugeChart';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { useApp } from '../context/AppContext';
import { DAILY_SALES_HISTORY } from '../data/seedData';
import { exportReportToPdf } from '../services/pdfService';
import { PaymentMethod, Transaction } from '../types';
import { formatDateID, formatRupiah, formatShortDateID } from '../utils/formatters';

export function DashboardPage() {
  const {
    isSupabaseMode,
    currentUser,
    setCurrentPage,
    transactions,
    reports,
    addReportHistory,
    sawResult,
    c45Evaluation,
    selectedDashboardDate,
    setSelectedDashboardDate,
    dashboardPaymentFilter,
    setDashboardPaymentFilter,
    dashboardStats,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'penjualan' | 'analisis'>('penjualan');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const [txPage, setTxPage] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const availableDates = useMemo(() => {
    if (!isSupabaseMode) {
      return ['2026-09-23', ...DAILY_SALES_HISTORY.map((d) => d.date).reverse()];
    }
    return [...new Set([selectedDashboardDate, ...transactions.map((t) => t.date)])]
      .sort((a, b) => b.localeCompare(a));
  }, [isSupabaseMode, selectedDashboardDate, transactions]);

  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (currentUser?.role === 'kasir' && t.cashierId !== currentUser.id) return false;
      if (isSupabaseMode && t.date !== selectedDashboardDate) return false;
      if (dashboardPaymentFilter !== 'Semua' && t.paymentMethod !== dashboardPaymentFilter) {
        return false;
      }
      return true;
    });
  }, [transactions, currentUser, dashboardPaymentFilter, isSupabaseMode, selectedDashboardDate]);

  const txPageCount = Math.max(1, Math.ceil(visibleTransactions.length / 3));
  const pagedTransactions = visibleTransactions.slice(txPage * 3, txPage * 3 + 3);
  const latestReport = reports[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleDownloadLatestPdf = () => {
    exportReportToPdf({
      title: latestReport?.title ?? 'Laporan Penutupan Kas Harian',
      subtitle: 'Ringkasan Penjualan & Evaluasi Ketepatan Penerimaan Kas Dimsum Me',
      generatedBy: currentUser?.name ?? 'Admin Dimsum Me',
      periodLabel: formatDateID(selectedDashboardDate),
      summaryLines: [
        { label: 'Total Penjualan', value: formatRupiah(dashboardStats.totalSales) },
        { label: 'Transaksi', value: `${dashboardStats.totalTransactions} trx` },
        { label: 'Skor SAW', value: `${sawResult.averageScore.toFixed(2)} (${sawResult.overallStatus})` },
        {
          label: 'Sesuai / Cek / Beda',
          value: `${dashboardStats.sesuaiCount} / ${dashboardStats.perluDicekCount} / ${dashboardStats.tidakSesuaiCount}`,
        },
      ],
      headers: ['Invoice', 'Waktu', 'Kasir', 'Metode', 'Nominal', 'Status'],
      rows: visibleTransactions
        .slice(0, 15)
        .map((t) => [
          t.invoiceNo,
          `${t.date} ${t.time}`,
          t.cashierName,
          t.paymentMethod,
          formatRupiah(t.totalAmount),
          t.status,
        ]),
      filename: `Laporan-Harian-DimsumMe-${selectedDashboardDate}.pdf`,
    });
    showToast('Laporan PDF berhasil diunduh.');
  };

  const handleCreateQuickReport = () => {
    addReportHistory({
      title: `Laporan Harian (${formatShortDateID(selectedDashboardDate)})`,
      type: 'Laporan Penutupan Kas Harian',
      date: selectedDashboardDate,
      createdBy: currentUser?.name ?? 'Admin Dimsum Me',
    });
    showToast('Laporan harian baru berhasil dibuat dan disimpan.');
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      {toastMsg && (
        <div
          role="status"
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-xl bg-[#151923] px-4 py-3 text-xs font-semibold text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">My Dashboard</h1>
          <p className="mt-0.5 text-[13.5px] text-[#6B7280]">
            Ringkasan aktivitas penjualan, penerimaan kas, dan hasil analisis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateMenuOpen((v) => !v);
                setFilterOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-xl border border-[#F0E7E2] bg-white px-4 py-2.5 text-[13px] font-medium text-[#151923] transition-colors hover:bg-[#FAF2EE]"
            >
              <Calendar className="h-4 w-4 text-[#6B7280]" />
              <span>{formatDateID(selectedDashboardDate)}</span>
              <ChevronDown className="h-4 w-4 text-[#6B7280]" />
            </button>
            {dateMenuOpen && (
              <div className="absolute right-0 z-30 mt-1.5 w-52 rounded-xl border border-[#F0E7E2] bg-white p-1.5 shadow-lg">
                {availableDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDashboardDate(d);
                      setDateMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                      selectedDashboardDate === d
                        ? 'bg-[#FDECE7] font-semibold text-[#C93D22]'
                        : 'text-[#374151] hover:bg-[#FCF8F5]'
                    }`}
                  >
                    <span>{formatDateID(d)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setDateMenuOpen(false);
              }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors ${
                dashboardPaymentFilter !== 'Semua'
                  ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                  : 'border-[#F0E7E2] bg-white text-[#151923] hover:bg-[#FAF2EE]'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>
                {dashboardPaymentFilter === 'Semua'
                  ? 'Filter'
                  : `Filter: ${dashboardPaymentFilter}`}
              </span>
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border border-[#F0E7E2] bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-[11px] font-semibold text-[#6B7280]">
                  Metode Pembayaran
                </p>
                {(['Semua', 'QRIS', 'Tunai'] as Array<'Semua' | PaymentMethod>).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDashboardPaymentFilter(opt);
                      setTxPage(0);
                      setFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                      dashboardPaymentFilter === opt
                        ? 'bg-[#FDECE7] font-semibold text-[#C93D22]'
                        : 'text-[#374151] hover:bg-[#FCF8F5]'
                    }`}
                  >
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Penjualan | Analisis */}
      <div className="border-b border-[#F0E7E2]">
        <div className="flex items-center gap-7" role="tablist" aria-label="Tab Dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'penjualan'}
            onClick={() => setActiveTab('penjualan')}
            className={`relative pb-3 text-[14px] transition-colors whitespace-nowrap ${
              activeTab === 'penjualan'
                ? 'font-bold text-[#151923]'
                : 'font-medium text-[#6B7280] hover:text-[#151923]'
            }`}
          >
            Penjualan
            {activeTab === 'penjualan' && (
              <span className="absolute right-0 bottom-0 left-0 h-[2.5px] rounded-full bg-[#E85D3F]" />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'analisis'}
            onClick={() => setActiveTab('analisis')}
            className={`relative pb-3 text-[14px] transition-colors whitespace-nowrap ${
              activeTab === 'analisis'
                ? 'font-bold text-[#151923]'
                : 'font-medium text-[#6B7280] hover:text-[#151923]'
            }`}
          >
            Analisis
            {activeTab === 'analisis' && (
              <span className="absolute right-0 bottom-0 left-0 h-[2.5px] rounded-full bg-[#E85D3F]" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'penjualan' ? (
        <div className="space-y-4">
          {/* Row 1: 4 Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Card 1: Total Penjualan */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDECE7] text-[#E85D3F]">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#6B7280]">Total Penjualan</p>
                    <p className="tabular-nums mt-0.5 whitespace-nowrap text-[19px] font-bold tracking-tight text-[#151923] xl:text-[20px]">
                      {formatRupiah(dashboardStats.totalSales)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('transaksi')}
                  aria-label="Buka halaman Transaksi"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                  ↑ +7,8% dari periode lalu
                </span>
              </div>
            </div>

            {/* Card 2: Total Transaksi */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFEAFE] text-[#6D4AFF]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#6B7280]">Total Transaksi</p>
                    <p className="tabular-nums mt-0.5 whitespace-nowrap text-[19px] font-bold tracking-tight text-[#151923] xl:text-[20px]">
                      {dashboardStats.totalTransactions}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('transaksi')}
                  aria-label="Detail Total Transaksi"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                  ↑ +6,0% dari periode lalu
                </span>
              </div>
            </div>

            {/* Card 3: Pembayaran QRIS */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F2FE] text-[#2563EB]">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#6B7280]">Pembayaran QRIS</p>
                    <p className="tabular-nums mt-0.5 whitespace-nowrap text-[19px] font-bold tracking-tight text-[#151923] xl:text-[20px]">
                      {formatRupiah(dashboardStats.qrisTotal)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('penerimaan-kas')}
                  aria-label="Detail Pembayaran QRIS"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                  ↑ +9,2% dari periode lalu
                </span>
              </div>
            </div>

            {/* Card 4: Pembayaran Tunai */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-4 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E6F8EC] text-[#16A34A]">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#6B7280]">Pembayaran Tunai</p>
                    <p className="tabular-nums mt-0.5 whitespace-nowrap text-[19px] font-bold tracking-tight text-[#151923] xl:text-[20px]">
                      {formatRupiah(dashboardStats.tunaiTotal)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('penerimaan-kas')}
                  aria-label="Detail Pembayaran Tunai"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                  ↑ +4,8% dari periode lalu
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Total Penjualan Chart | Performa Pencatatan Gauge | Status Rekonsiliasi */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr_1.1fr]">
            {/* Grafik Total Penjualan */}
            <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#151923]">Total Penjualan</h2>
                  <p className="text-[11.5px] text-[#6B7280]">
                    Perbandingan harian QRIS (oranye) &amp; Tunai (peach)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setChartMode((m) => (m === 'stacked' ? 'grouped' : 'stacked'))
                  }
                  title="Ubah mode perbandingan grafik"
                  aria-label="Ubah mode perbandingan grafik"
                  className="rounded-lg border border-[#F0E7E2] p-2 text-[#6B7280] transition-colors hover:bg-[#FCF8F5] hover:text-[#151923]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
              <SalesBarChart data={dashboardStats.dailyChartData} mode={chartMode} />
            </section>

            {/* Performa Pencatatan (SAW Gauge) */}
            <section className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#151923]">Performa Pencatatan</h2>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(currentUser?.role === 'admin' ? 'analisis-saw' : 'rekonsiliasi')
                  }
                  aria-label="Lihat detail Analisis SAW"
                  className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="my-2 flex flex-col items-center">
                <SawGaugeChart score={sawResult.averageScore} target={0.75} />

                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11.5px] font-semibold ${
                    sawResult.overallStatus === 'Baik'
                      ? 'bg-emerald-50 text-[#16A34A]'
                      : sawResult.overallStatus === 'Cukup'
                        ? 'bg-amber-50 text-[#D97706]'
                        : 'bg-red-50 text-[#DC3C2B]'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {sawResult.overallStatus}
                </span>

                <p className="mt-2.5 max-w-[230px] text-center text-[11.5px] leading-relaxed text-[#6B7280]">
                  Berdasarkan 5 kriteria penilaian ketepatan pencatatan.
                </p>
              </div>

              <div className="flex items-center justify-center gap-5 border-t border-[#F0E7E2] pt-3 text-[11.5px] text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E85D3F]" />
                  Skor SAW
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FDE047]" />
                  Target (≥ 0.75)
                </span>
              </div>
            </section>

            {/* Status Rekonsiliasi */}
            <section className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-[#151923]">Status Rekonsiliasi</h2>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('rekonsiliasi')}
                    aria-label="Menuju halaman Rekonsiliasi"
                    className="rounded-lg p-1.5 text-[#151923] transition-colors hover:bg-[#FCF8F5]"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-[11.5px] text-[#6B7280]">
                  Hasil pencocokan transaksi dan penerimaan kas.
                </p>
              </div>

              <div className="my-4 grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage('rekonsiliasi')}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#16A34A] px-2 py-5 text-white transition-transform hover:-translate-y-0.5"
                >
                  <span className="tabular-nums text-[28px] font-bold leading-none">
                    {dashboardStats.sesuaiCount}
                  </span>
                  <span className="mt-2 text-[11.5px] font-semibold">Sesuai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('rekonsiliasi')}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#F59E0B] px-2 py-5 text-white transition-transform hover:-translate-y-0.5"
                >
                  <span className="tabular-nums text-[28px] font-bold leading-none">
                    {dashboardStats.perluDicekCount}
                  </span>
                  <span className="mt-2 text-[11.5px] font-semibold">Perlu Dicek</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage('rekonsiliasi')}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#FEE2E2] px-2 py-5 text-[#DC3C2B] transition-transform hover:-translate-y-0.5"
                >
                  <span className="tabular-nums text-[28px] font-bold leading-none">
                    {dashboardStats.tidakSesuaiCount}
                  </span>
                  <span className="mt-2 text-[11px] font-semibold whitespace-nowrap">
                    Tidak Sesuai
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage('rekonsiliasi')}
                className="w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 text-xs font-semibold text-[#151923] transition-colors hover:border-[#E85D3F] hover:text-[#C93D22]"
              >
                Buka Halaman Rekonsiliasi
              </button>
            </section>
          </div>

          {/* Row 3: Laporan Terakhir | Data Pelanggan | Transaksi Terbaru */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1fr_1.15fr]">
            {/* Laporan Terakhir */}
            <section className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#151923]">Laporan Terakhir</h2>
                <button
                  type="button"
                  onClick={() => setCurrentPage('laporan')}
                  className="text-[12px] font-semibold text-[#E85D3F] underline underline-offset-2 hover:text-[#C93D22]"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center justify-center rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-4 text-center">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDECE7] text-[#E85D3F]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-[12.5px] font-bold text-[#151923]">
                    {latestReport?.title ?? 'Laporan Harian'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B7280]">
                    {formatShortDateID(latestReport?.date ?? selectedDashboardDate)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateQuickReport}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E85D3F]/45 bg-[#FFF9F7] px-3 py-4 text-center transition-colors hover:bg-[#FDECE7]/50"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#F5A27F] bg-white text-[#E85D3F]">
                    <Plus className="h-4 w-4" />
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#151923]">Buat Laporan Baru</p>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadLatestPdf}
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#DF4D33] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#C93D22]"
              >
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Unduh PDF
                </span>
                <FileText className="h-4 w-4 opacity-85" />
              </button>
            </section>

            {/* Data Pelanggan */}
            <section className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#151923]">Data Pelanggan</h2>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  aria-label="Opsi ringkasan pelanggan"
                  className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#FCF8F5]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="my-4 grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="tabular-nums text-[26px] font-bold text-[#151923]">375</p>
                  <p className="text-[12px] text-[#6B7280]">Pelanggan Aktif</p>
                </div>
                <div>
                  <p className="tabular-nums text-[26px] font-bold text-[#151923]">541</p>
                  <p className="text-[12px] text-[#6B7280]">Total Pelanggan</p>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className="h-6 w-full overflow-hidden rounded-lg bg-[#F9E1D6]"
                  aria-label="Rasio pelanggan aktif 69.3 persen"
                >
                  <div className="striped-progress h-full rounded-l-lg" style={{ width: '69.3%' }} />
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="text-[12.5px] font-semibold text-[#C93D22] underline underline-offset-4 hover:text-[#E85D3F]"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            </section>

            {/* Transaksi Terbaru */}
            <section className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#151923]">Transaksi Terbaru</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={txPage === 0}
                    onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                    aria-label="Transaksi sebelumnya"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] disabled:opacity-40 hover:bg-[#FCF8F5]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={txPage >= txPageCount - 1}
                    onClick={() => setTxPage((p) => Math.min(txPageCount - 1, p + 1))}
                    aria-label="Transaksi berikutnya"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#F0E7E2] text-[#6B7280] disabled:opacity-40 hover:bg-[#FCF8F5]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#F0E7E2]">
                {pagedTransactions.map((tx) => {
                  const firstItem = tx.items[0];
                  const extraCount = tx.items.length > 1 ? ` +${tx.items.length - 1} item` : '';
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="flex w-full items-center justify-between py-2.5 text-left transition-colors first:pt-1 last:pb-1 hover:bg-[#FCF8F5]/80"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={firstItem?.image}
                          alt={firstItem?.productName ?? 'Produk Dimsum'}
                          className="h-10 w-10 shrink-0 rounded-xl border border-[#F0E7E2] object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#151923]">
                            {firstItem?.productName} (x{firstItem?.qty}){extraCount}
                          </p>
                          <p className="font-mono text-[11px] text-[#6B7280]">{tx.invoiceNo}</p>
                        </div>
                      </div>

                      <div className="ml-3 shrink-0 text-right">
                        <p className="tabular-nums text-[13px] font-bold text-[#151923]">
                          {formatRupiah(tx.totalAmount)}
                        </p>
                        <span
                          className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                            tx.status === 'Selesai'
                              ? 'bg-emerald-50 text-[#16A34A]'
                              : tx.status === 'Perlu Dicek'
                                ? 'bg-amber-50 text-[#D97706]'
                                : 'bg-red-50 text-[#DC3C2B]'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {pagedTransactions.length === 0 && (
                  <p className="py-6 text-center text-xs text-[#6B7280]">
                    Belum ada transaksi untuk filter ini.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* TAB ANALISIS: Ringkasan Terintegrasi SAW & C4.5 */
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
              <p className="text-xs font-medium text-[#6B7280]">Rata-rata Skor SAW (5 Kriteria)</p>
              <p className="tabular-nums mt-1 text-3xl font-bold text-[#151923]">
                {sawResult.averageScore.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-[#16A34A]">
                Status: {sawResult.overallStatus} (Target ≥ 0.75)
              </p>
            </div>

            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
              <p className="text-xs font-medium text-[#6B7280]">Akurasi Model C4.5</p>
              <p className="tabular-nums mt-1 text-3xl font-bold text-[#151923]">
                {(c45Evaluation.accuracy * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-[#6B7280]">
                Macro F1-Score: {(c45Evaluation.macroF1 * 100).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
              <p className="text-xs font-medium text-[#6B7280]">Peringkat 1 Ketepatan Shift</p>
              <p className="mt-1 text-lg font-bold text-[#151923]">
                {sawResult.rows[0]?.label ?? '-'}
              </p>
              <p className="tabular-nums mt-2 text-xs font-semibold text-[#E85D3F]">
                Nilai Preferensi: {sawResult.rows[0]?.preferenceValue.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#151923]">Peringkat Ketepatan Kas (SAW)</h3>
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage('analisis-saw')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#E85D3F] hover:text-[#C93D22]"
                  >
                    Buka Analisis SAW <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F0E7E2] text-[#6B7280]">
                      <th className="py-2 font-semibold">Rank</th>
                      <th className="py-2 font-semibold">Shift / Kasir</th>
                      <th className="py-2 text-right font-semibold">Preferensi (V)</th>
                      <th className="py-2 text-right font-semibold">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E7E2]">
                    {sawResult.rows.map((r) => (
                      <tr key={r.alternativeId}>
                        <td className="tabular-nums py-2.5 font-bold text-[#E85D3F]">#{r.rank}</td>
                        <td className="py-2.5 font-medium text-[#151923]">{r.label}</td>
                        <td className="tabular-nums py-2.5 text-right font-bold">
                          {r.preferenceValue.toFixed(3)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              r.category === 'Baik'
                                ? 'bg-emerald-50 text-[#16A34A]'
                                : 'bg-amber-50 text-[#D97706]'
                            }`}
                          >
                            {r.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#151923]">
                  Ringkasan Evaluasi Klasifikasi C4.5
                </h3>
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage('klasifikasi-c45')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#E85D3F] hover:text-[#C93D22]"
                  >
                    Buka Klasifikasi C4.5 <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                  <span className="text-[#6B7280]">Accuracy</span>
                  <p className="tabular-nums mt-1 text-lg font-bold text-[#151923]">
                    {(c45Evaluation.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                  <span className="text-[#6B7280]">Macro Precision</span>
                  <p className="tabular-nums mt-1 text-lg font-bold text-[#151923]">
                    {(c45Evaluation.macroPrecision * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                  <span className="text-[#6B7280]">Macro Recall</span>
                  <p className="tabular-nums mt-1 text-lg font-bold text-[#151923]">
                    {(c45Evaluation.macroRecall * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                  <span className="text-[#6B7280]">Macro F1-Score</span>
                  <p className="tabular-nums mt-1 text-lg font-bold text-[#151923]">
                    {(c45Evaluation.macroF1 * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pelanggan */}
      {customerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#151923]">Ringkasan Data Pelanggan</h3>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                aria-label="Tutup detail pelanggan"
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#FCF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                <span className="text-[#6B7280]">Pelanggan Aktif (30 hari terakhir)</span>
                <span className="tabular-nums font-bold text-[#151923]">375</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                <span className="text-[#6B7280]">Total Pelanggan Terdaftar</span>
                <span className="tabular-nums font-bold text-[#151923]">541</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                <span className="text-[#6B7280]">Rasio Retensi</span>
                <span className="tabular-nums flex items-center gap-1 font-bold text-[#16A34A]">
                  <TrendingUp className="h-3.5 w-3.5" /> 69,3%
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="mt-5 w-full rounded-xl bg-[#E85D3F] py-2.5 text-xs font-semibold text-white hover:bg-[#C93D22]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <ReceiptModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}
