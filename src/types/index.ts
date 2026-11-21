export type UserRole = 'admin' | 'kasir';

export type PageId =
  | 'dashboard'
  | 'transaksi'
  | 'produk'
  | 'penerimaan-kas'
  | 'rekonsiliasi'
  | 'analisis-saw'
  | 'klasifikasi-c45'
  | 'laporan'
  | 'pengaturan'
  | 'profil';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shift: string;
  avatarLabel: string;
  active: boolean;
}

export type ProductCategory = 'Cemilan' | 'Dimsum Goreng' | 'Add On';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  image: string;
  active: boolean;
  variantOptions?: string[];
  maxVariantSelect?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  productId: string | null;
  productName: string;
  qty: number;
  unitPrice: number;
  image: string;
  selectedVariants?: string[];
}

export type PaymentMethod = 'Tunai' | 'QRIS';
export type TransactionStatus = 'Selesai' | 'Perlu Dicek' | 'Tidak Sesuai';
export type VerificationStatus = 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
export type ReconciliationStatus = 'Sesuai' | 'Perlu Dicek' | 'Tidak Sesuai';

export interface Transaction {
  id: string;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  cashierId: string;
  cashierName: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashTendered?: number;
  qrisRef?: string;
  verificationStatus: VerificationStatus;
  status: TransactionStatus;
  notes?: string;
}

export interface QrisMerchantMutation {
  id: string;
  merchantRef: string;
  date: string;
  time: string;
  amount: number;
  issuer: string;
  settled: boolean;
  matchedTransactionId?: string | null;
  matchedInvoiceNo?: string;
}

export interface ReconciliationRecord {
  id: string;
  date: string;
  shift: string;
  cashierId: string;
  cashierName: string;
  totalSales: number;
  recordedCash: number;
  recordedQris: number;
  actualCash: number;
  verifiedQris: number;
  difference: number;
  status: ReconciliationStatus;
  adminNote: string;
  checkedBy?: string;
  checkedById?: string | null;
}

export type SawCriterionType = 'benefit' | 'cost';

export interface SawCriterion {
  id: string;
  code: string;
  name: string;
  weight: number; // percentage 0..100
  type: SawCriterionType;
  description: string;
}

export interface SawAlternative {
  id: string;
  label: string;
  cashierName: string;
  period: string;
  scores: Record<string, number>; // criterionId -> raw value (0..100)
}

export interface SawNormalizedRow {
  alternativeId: string;
  label: string;
  cashierName: string;
  period: string;
  rawScores: Record<string, number>;
  normalizedScores: Record<string, number>;
  preferenceValue: number;
  rank: number;
  category: 'Baik' | 'Cukup' | 'Perlu Evaluasi';
}

export interface SawCalculationResult {
  criteria: SawCriterion[];
  rows: SawNormalizedRow[];
  averageScore: number;
  overallStatus: 'Baik' | 'Cukup' | 'Perlu Evaluasi';
  isWeightValid: boolean;
  totalWeight: number;
}

export type C45Class = 'Sesuai' | 'Perlu Pemeriksaan' | 'Tidak Sesuai';

export interface C45Record {
  id: string;
  selisihNominal: 'Nol' | 'Kecil (<=10rb)' | 'Besar (>10rb)';
  verifikasiQris: 'Terverifikasi' | 'Menunggu' | 'Tidak Cocok';
  kelengkapanBukti: 'Lengkap' | 'Kurang' | 'Tidak Ada';
  ketepatanWaktu: 'Tepat Waktu' | 'Terlambat';
  label: C45Class;
}

export interface C45AttributeMetric {
  attribute: string;
  attributeLabel: string;
  entropyBefore: number;
  informationGain: number;
  splitInfo: number;
  gainRatio: number;
  selected: boolean;
}

export interface C45TreeNode {
  id: string;
  type: 'internal' | 'leaf';
  attribute?: string;
  attributeLabel?: string;
  label?: C45Class;
  sampleCount: number;
  distribution: Record<C45Class, number>;
  entropy: number;
  gainRatio?: number;
  children?: Record<string, C45TreeNode>;
}

export interface C45EvaluationMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusionMatrix: Record<C45Class, Record<C45Class, number>>;
  perClass: Record<C45Class, { precision: number; recall: number; f1: number; support: number }>;
  testPredictions: Array<{
    record: C45Record;
    predicted: C45Class;
    correct: boolean;
    path: string[];
  }>;
}

export interface ReportHistoryItem {
  id: string;
  title: string;
  type:
    | 'Laporan Penjualan'
    | 'Laporan Penerimaan Kas'
    | 'Laporan QRIS'
    | 'Laporan Penutupan Kas Harian'
    | 'Laporan Rekonsiliasi'
    | 'Laporan Analisis SAW'
    | 'Laporan Klasifikasi C4.5';
  date: string;
  createdBy: string;
  createdById?: string;
}

