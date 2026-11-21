import { Printer, Download, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ASSETS } from '../../data/seedData';
import { exportReceiptToPdf } from '../../services/pdfService';
import { Transaction } from '../../types';
import { formatDateID, formatRupiah } from '../../utils/formatters';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

  const changeAmount =
    transaction.paymentMethod === 'Tunai' && transaction.cashTendered
      ? Math.max(0, transaction.cashTendered - transaction.totalAmount)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-[#F0E7E2] px-5 py-3.5">
          <h3 id="receipt-modal-title" className="text-base font-bold text-[#151923]">
            Struk Pembayaran
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal struk"
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#FCF8F5] hover:text-[#151923]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="print-only-area max-h-[72vh] overflow-y-auto p-6">
          <div className="flex flex-col items-center border-b border-dashed border-[#E5D8D1] pb-4 text-center">
            <img
              src={ASSETS.logo}
              alt="Logo Dimsum Me"
              className="mb-2 h-14 w-14 rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-lg font-extrabold tracking-tight text-[#C93D22]">Dimsum Me</p>
            <p className="text-xs text-[#6B7280]">Dimsum &amp; Snack House</p>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-[#E5D8D1] py-3.5 text-xs text-[#151923]">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">No. Invoice</span>
              <span className="font-mono font-semibold">{transaction.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Tanggal &amp; Waktu</span>
              <span className="tabular-nums font-medium">
                {formatDateID(transaction.date)}, {transaction.time} WIB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Kasir</span>
              <span className="font-medium">{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Metode Bayar</span>
              <span className="font-semibold">{transaction.paymentMethod}</span>
            </div>
            {transaction.qrisRef && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Ref. QRIS</span>
                <span className="font-mono text-[11px]">{transaction.qrisRef}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-b border-dashed border-[#E5D8D1] py-3.5">
            {transaction.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex items-start justify-between text-xs">
                <div>
                  <p className="font-semibold text-[#151923]">{item.productName}</p>
                  {item.selectedVariants && item.selectedVariants.length > 0 && (
                    <p className="text-[11px] font-medium text-[#C93D22]">
                      Varian: {item.selectedVariants.join(', ')}
                    </p>
                  )}
                  <p className="tabular-nums text-[#6B7280]">
                    {item.qty} x {formatRupiah(item.unitPrice)}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-[#151923]">
                  {formatRupiah(item.qty * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-3.5 text-xs">
            <div className="flex justify-between text-sm font-bold text-[#151923]">
              <span>Total Pembayaran</span>
              <span className="tabular-nums">{formatRupiah(transaction.totalAmount)}</span>
            </div>
            {transaction.paymentMethod === 'Tunai' && transaction.cashTendered !== undefined && (
              <>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Tunai Diterima</span>
                  <span className="tabular-nums">{formatRupiah(transaction.cashTendered)}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Kembalian</span>
                  <span className="tabular-nums">{formatRupiah(changeAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[#6B7280]">Status Pembayaran</span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  transaction.verificationStatus === 'Terverifikasi'
                    ? 'bg-emerald-50 text-emerald-700'
                    : transaction.verificationStatus === 'Ditolak'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {transaction.verificationStatus === 'Terverifikasi' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : transaction.verificationStatus === 'Ditolak' ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {transaction.verificationStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="no-print flex items-center gap-2.5 border-t border-[#F0E7E2] bg-[#FCF8F5] px-5 py-3.5">
          <button
            type="button"
            onClick={() => exportReceiptToPdf(transaction)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#F0E7E2] bg-white px-4 py-2.5 text-xs font-semibold text-[#151923] transition-colors hover:bg-[#FAF2EE]"
          >
            <Download className="h-4 w-4" />
            Unduh PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E85D3F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#C93D22]"
          >
            <Printer className="h-4 w-4" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
