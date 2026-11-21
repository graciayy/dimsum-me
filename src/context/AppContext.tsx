import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BASELINE_BATCH_23_SEP,
  C45_DATASET,
  DAILY_SALES_HISTORY,
  INITIAL_PRODUCTS,
  INITIAL_QRIS_MUTATIONS,
  INITIAL_RECONCILIATIONS,
  INITIAL_REPORTS,
  INITIAL_SAW_ALTERNATIVES,
  INITIAL_SAW_CRITERIA,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../data/seedData';
import {
  C45AttributeMetric,
  C45Class,
  C45EvaluationMetrics,
  C45Record,
  C45TreeNode,
  PageId,
  PaymentMethod,
  Product,
  QrisMerchantMutation,
  ReconciliationRecord,
  ReportHistoryItem,
  SawAlternative,
  SawCalculationResult,
  SawCriterion,
  Transaction,
  TransactionItem,
  UserAccount,
  UserRole,
  VerificationStatus,
} from '../types';
import { calculateSaw } from '../utils/saw';
import { evaluateC45Model, trainC45Tree } from '../utils/c45';
import {
  getSupabaseClient,
  getSupabaseConfigError,
  isSupabaseConfigured,
} from '../services/supabaseClient';
import {
  deleteProductInSupabase,
  fetchAuthenticatedUserProfile,
  fetchOperationalStateFromSupabase,
  generateUuid,
  insertReportInSupabase,
  insertTransactionInSupabase,
  saveC45PredictionInSupabase,
  saveC45TrainingRunInSupabase,
  saveSawEvaluationInSupabase,
  signInWithSupabasePassword,
  signOutFromSupabase,
  updateTransactionVerificationInSupabase,
  upsertProductInSupabase,
  upsertQrisMutationInSupabase,
  upsertReconciliationInSupabase,
  upsertSawCriteriaInSupabase,
} from '../services/supabaseRepository';
import { formatShortDateID } from '../utils/formatters';

interface AppContextValue {
  isSupabaseMode: boolean;
  authLoading: boolean;
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  currentUser: UserAccount | null;
  users: UserAccount[];
  loginAsRole: (role: UserRole) => void;
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (product: Product) => void;
  toggleProductActive: (productId: string) => void;
  deleteProduct: (productId: string) => void;

  transactions: Transaction[];
  createTransaction: (params: {
    items: TransactionItem[];
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    qrisRef?: string;
    notes?: string;
  }) => Transaction;

  qrisMutations: QrisMerchantMutation[];
  verifyTransactionPayment: (
    txId: string,
    status: VerificationStatus,
    note?: string
  ) => void;

  reconciliations: ReconciliationRecord[];
  updateReconciliation: (
    recId: string,
    actualCash: number,
    adminNote: string
  ) => void;

  sawCriteria: SawCriterion[];
  sawAlternatives: SawAlternative[];
  sawResult: SawCalculationResult;
  updateSawWeights: (
    updatedCriteria: SawCriterion[]
  ) => Promise<{ ok: boolean; message: string }>;

  c45TrainData: C45Record[];
  c45TestData: C45Record[];
  c45Tree: C45TreeNode;
  c45RootMetrics: C45AttributeMetric[];
  c45Evaluation: C45EvaluationMetrics;
  retrainC45: (splitRatio?: number) => void;
  recordC45Prediction: (params: {
    inputFeatures: Omit<C45Record, 'id' | 'label'>;
    predictedClass: C45Class;
    path: string[];
  }) => void;

  reports: ReportHistoryItem[];
  addReportHistory: (report: Omit<ReportHistoryItem, 'id'>) => void;

  selectedDashboardDate: string;
  setSelectedDashboardDate: (d: string) => void;
  dashboardPaymentFilter: 'Semua' | PaymentMethod;
  setDashboardPaymentFilter: (f: 'Semua' | PaymentMethod) => void;

  dashboardStats: {
    totalSales: number;
    totalTransactions: number;
    qrisTotal: number;
    tunaiTotal: number;
    sesuaiCount: number;
    perluDicekCount: number;
    tidakSesuaiCount: number;
    dailyChartData: Array<{
      date: string;
      label: string;
      actual: number;
      comparison: number | null;
      qris: number;
      tunai: number;
    }>;
  };
  resetAppData: () => void;
}

const STORAGE_KEY = 'dimsum_me_app_state_v6';

function getLocalDateString(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const isSupabaseMode = isSupabaseConfigured();
  const persisted = useMemo(() => (isSupabaseMode ? null : loadPersistedState()), [isSupabaseMode]);

  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseMode);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [users, setUsers] = useState<UserAccount[]>(isSupabaseMode ? [] : INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (isSupabaseMode) return null;
    if (persisted?.currentUserId) {
      return INITIAL_USERS.find((u) => u.id === persisted.currentUserId) ?? INITIAL_USERS[0];
    }
    return INITIAL_USERS[0];
  });

  const [products, setProducts] = useState<Product[]>(
    () => persisted?.products ?? (isSupabaseMode ? [] : INITIAL_PRODUCTS)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => persisted?.transactions ?? (isSupabaseMode ? [] : INITIAL_TRANSACTIONS)
  );
  const [qrisMutations, setQrisMutations] = useState<QrisMerchantMutation[]>(
    () => persisted?.qrisMutations ?? (isSupabaseMode ? [] : INITIAL_QRIS_MUTATIONS)
  );
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>(
    () => persisted?.reconciliations ?? (isSupabaseMode ? [] : INITIAL_RECONCILIATIONS)
  );
  const [sawCriteria, setSawCriteria] = useState<SawCriterion[]>(
    () => persisted?.sawCriteria ?? (isSupabaseMode ? [] : INITIAL_SAW_CRITERIA)
  );
  const [sawAlternatives] = useState<SawAlternative[]>(
    isSupabaseMode ? [] : INITIAL_SAW_ALTERNATIVES
  );
  const [c45Dataset, setC45Dataset] = useState<C45Record[]>(
    isSupabaseMode ? [] : C45_DATASET
  );
  const [reports, setReports] = useState<ReportHistoryItem[]>(
    () => persisted?.reports ?? (isSupabaseMode ? [] : INITIAL_REPORTS)
  );

  const [selectedDashboardDate, setSelectedDashboardDate] = useState<string>(
    isSupabaseMode ? getLocalDateString() : '2026-09-23'
  );
  const [dashboardPaymentFilter, setDashboardPaymentFilter] = useState<'Semua' | PaymentMethod>(
    'Semua'
  );

  const [c45SplitIdx, setC45SplitIdx] = useState<number>(28);

  const applyRemoteState = (remote: Awaited<ReturnType<typeof fetchOperationalStateFromSupabase>>) => {
    setUsers(remote.users);
    setProducts(remote.products);
    setTransactions(remote.transactions);
    setQrisMutations(remote.qrisMutations);
    setReconciliations(remote.reconciliations);
    setSawCriteria(remote.sawCriteria);
    setReports(remote.reports);
    setC45Dataset(remote.c45Dataset ?? []);
  };

  const runSupabaseAction = async (
    action: Promise<{ ok: boolean; error?: string }>,
    actionLabel: string
  ) => {
    try {
      const result = await action;
      if (!result.ok) throw new Error(result.error || 'Operasi tidak berhasil.');
      setSupabaseError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kesalahan Supabase tidak diketahui.';
      let refreshMessage = '';
      if (currentUser) {
        try {
          applyRemoteState(await fetchOperationalStateFromSupabase(currentUser));
        } catch (refreshError) {
          refreshMessage =
            refreshError instanceof Error ? ` Gagal memuat ulang data: ${refreshError.message}` : '';
        }
      }
      setSupabaseError(`${actionLabel}: ${message}${refreshMessage}`);
    }
  };

  // Persist offline preview state only when Supabase is not configured
  useEffect(() => {
    if (isSupabaseMode) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentUserId: currentUser?.id ?? null,
          products,
          transactions,
          qrisMutations,
          reconciliations,
          sawCriteria,
          reports,
        })
      );
    } catch {
      // Ignore quota issues
    }
  }, [
    isSupabaseMode,
    currentUser,
    products,
    transactions,
    qrisMutations,
    reconciliations,
    sawCriteria,
    reports,
  ]);

  // Supabase Auth session initialization & listener
  useEffect(() => {
    if (!isSupabaseMode) return;
    let client: ReturnType<typeof getSupabaseClient>;
    try {
      client = getSupabaseClient();
    } catch (err) {
      setSupabaseError(
        err instanceof Error ? err.message : 'Konfigurasi Supabase tidak valid.'
      );
      setAuthLoading(false);
      return;
    }
    if (!client) {
      setSupabaseError(getSupabaseConfigError() ?? 'Konfigurasi Supabase belum tersedia.');
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const initSession = async () => {
      const { user, error } = await fetchAuthenticatedUserProfile();
      if (!mounted) return;
      if (error) setSupabaseError(error);
      setCurrentUser(user);
      setAuthLoading(false);
    };
    void initSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      void fetchAuthenticatedUserProfile().then(({ user, error }) => {
        if (!mounted) return;
        if (error) setSupabaseError(error);
        setCurrentUser(user);
        setAuthLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseMode]);

  // Hydrate operational state from Supabase whenever an authenticated profile is active
  useEffect(() => {
    if (!isSupabaseMode || !currentUser) return;
    let active = true;

    const loadRemoteState = async () => {
      try {
        const remote = await fetchOperationalStateFromSupabase(currentUser);
        if (!active) return;
        applyRemoteState(remote);
        setSupabaseError(null);
      } catch (err) {
        if (!active) return;
        setSupabaseError(
          err instanceof Error ? err.message : 'Gagal memuat data operasional dari Supabase.'
        );
      }
    };

    void loadRemoteState();
    return () => {
      active = false;
    };
  }, [isSupabaseMode, currentUser]);

  const sawResult = useMemo(
    () => calculateSaw(sawCriteria, sawAlternatives),
    [sawCriteria, sawAlternatives]
  );

  const c45TrainData = useMemo(
    () => c45Dataset.slice(0, c45SplitIdx),
    [c45Dataset, c45SplitIdx]
  );
  const c45TestData = useMemo(
    () => c45Dataset.slice(c45SplitIdx),
    [c45Dataset, c45SplitIdx]
  );

  const { tree: c45Tree, rootMetrics: c45RootMetrics } = useMemo(
    () => trainC45Tree(c45TrainData),
    [c45TrainData]
  );

  const c45Evaluation = useMemo(
    () => evaluateC45Model(c45Tree, c45TestData),
    [c45Tree, c45TestData]
  );

  const loginAsRole = (role: UserRole) => {
    if (isSupabaseMode) return;
    const found = users.find((u) => u.role === role) ?? users[0];
    setCurrentUser(found);
    setCurrentPage('dashboard');
  };

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseMode) {
      const res = await signInWithSupabasePassword(email, password);
      if (res.ok && res.user) {
        setCurrentUser(res.user);
        setCurrentPage('dashboard');
        return { ok: true };
      }
      return { ok: false, error: res.error || 'Gagal login ke Supabase Auth.' };
    }

    const normalized = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === normalized);
    if (!found) {
      return {
        ok: false,
        error:
          'Email tidak terdaftar. Gunakan admin@dimsumme.local, gracia@dimsumme.local, ferginia@dimsumme.local, atau julio@dimsumme.local.',
      };
    }
    if (!password.trim()) {
      return { ok: false, error: 'Masukkan kata sandi terlebih dahulu.' };
    }
    setCurrentUser(found);
    setCurrentPage('dashboard');
    return { ok: true };
  };

  const logout = async () => {
    if (!isSupabaseMode) {
      setCurrentUser(INITIAL_USERS[0]);
      setCurrentPage('dashboard');
      return;
    }
    try {
      await signOutFromSupabase();
      setCurrentUser(null);
      setSupabaseError(null);
    } catch (err) {
      setSupabaseError(
        err instanceof Error
          ? `Gagal keluar dari Supabase: ${err.message}`
          : 'Gagal keluar dari Supabase.'
      );
    }
  };

  const switchRole = (role: UserRole) => {
    if (isSupabaseMode) return;
    const target = users.find((u) => u.role === role);
    if (target) {
      setCurrentUser(target);
      if (role === 'kasir' && (currentPage === 'analisis-saw' || currentPage === 'klasifikasi-c45')) {
        setCurrentPage('dashboard');
      }
    }
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (currentUser?.role !== 'admin') return;
    const nowIso = new Date().toISOString();
    const newProd: Product = {
      ...product,
      id: `prd-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setProducts((prev) => [newProd, ...prev]);
    if (isSupabaseMode) {
      void runSupabaseAction(upsertProductInSupabase(newProd), 'Gagal menyimpan produk');
    }
  };

  const updateProduct = (updated: Product) => {
    if (currentUser?.role !== 'admin') return;
    const nowIso = new Date().toISOString();
    const saved: Product = { ...updated, updatedAt: nowIso };
    setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    if (isSupabaseMode) {
      void runSupabaseAction(upsertProductInSupabase(saved), 'Gagal memperbarui produk');
    }
  };

  const toggleProductActive = (productId: string) => {
    if (currentUser?.role !== 'admin') return;
    const nowIso = new Date().toISOString();
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const toggled: Product = { ...target, active: !target.active, updatedAt: nowIso };
    setProducts((prev) => prev.map((p) => (p.id === productId ? toggled : p)));
    if (isSupabaseMode) {
      void runSupabaseAction(upsertProductInSupabase(toggled), 'Gagal mengubah status produk');
    }
  };

  const deleteProduct = (productId: string) => {
    if (currentUser?.role !== 'admin') return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (isSupabaseMode) {
      void runSupabaseAction(deleteProductInSupabase(productId), 'Gagal menghapus produk');
    }
  };

  const createTransaction = ({
    items,
    paymentMethod,
    cashTendered,
    qrisRef,
    notes,
  }: {
    items: TransactionItem[];
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    qrisRef?: string;
    notes?: string;
  }): Transaction => {
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const nextNum = 2642 + transactions.length;
    const invoiceNo = `TRX-0${nextNum}`;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const trxDate = isSupabaseMode ? now.toISOString().slice(0, 10) : '2026-09-23';
    const cashier = currentUser ?? users[0];

    const generatedQrisRef =
      paymentMethod === 'QRIS'
        ? qrisRef?.trim() || `QRIS-DM-${90850 + transactions.length}`
        : undefined;

    const snapshotItems = items.map((item) => ({ ...item }));
    const newTx: Transaction = {
      id: isSupabaseMode ? generateUuid() : `tx-${Date.now()}`,
      invoiceNo,
      date: trxDate,
      time: `${hh}:${mm}`,
      cashierId: cashier.id,
      cashierName: cashier.name.replace(/\s*\(.*?\)/, ''),
      items: snapshotItems,
      totalAmount,
      paymentMethod,
      cashTendered: paymentMethod === 'Tunai' ? cashTendered ?? totalAmount : undefined,
      qrisRef: generatedQrisRef,
      verificationStatus: paymentMethod === 'Tunai' ? 'Terverifikasi' : 'Menunggu Verifikasi',
      status: paymentMethod === 'Tunai' ? 'Selesai' : 'Perlu Dicek',
      notes,
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (isSupabaseMode) {
      void runSupabaseAction(insertTransactionInSupabase(newTx), 'Gagal menyimpan transaksi');
      if (paymentMethod === 'QRIS' && generatedQrisRef && currentUser?.role === 'admin') {
        const mut: QrisMerchantMutation = {
          id: generateUuid(),
          merchantRef: generatedQrisRef,
          date: trxDate,
          time: `${hh}:${mm}`,
          amount: totalAmount,
          issuer: 'QRIS Merchant Gateway',
          settled: true,
          matchedTransactionId: newTx.id,
          matchedInvoiceNo: invoiceNo,
        };
        setQrisMutations((prev) => [mut, ...prev]);
        void runSupabaseAction(upsertQrisMutationInSupabase(mut), 'Gagal menyimpan mutasi QRIS');
      }
      return newTx;
    }

    if (paymentMethod === 'QRIS' && generatedQrisRef) {
      const mut: QrisMerchantMutation = {
        id: `mut-${Date.now()}`,
        merchantRef: generatedQrisRef,
        date: trxDate,
        time: `${hh}:${mm}`,
        amount: totalAmount,
        issuer: 'QRIS Merchant Gateway',
        settled: true,
        matchedTransactionId: newTx.id,
        matchedInvoiceNo: invoiceNo,
      };
      setQrisMutations((prev) => [mut, ...prev]);
    }

    const nextReconciliationsAfterTx = reconciliations.map((rec, idx) => {
      if (idx === 1 && rec.date === '2026-09-23') {
        const newTotalSales = rec.totalSales + totalAmount;
        const newRecordedCash =
          paymentMethod === 'Tunai' ? rec.recordedCash + totalAmount : rec.recordedCash;
        const newRecordedQris =
          paymentMethod === 'QRIS' ? rec.recordedQris + totalAmount : rec.recordedQris;
        const newActualCash =
          paymentMethod === 'Tunai' ? rec.actualCash + totalAmount : rec.actualCash;
        const diff = newActualCash + rec.verifiedQris - newTotalSales;
        return {
          ...rec,
          totalSales: newTotalSales,
          recordedCash: newRecordedCash,
          recordedQris: newRecordedQris,
          actualCash: newActualCash,
          difference: diff,
          status:
            diff === 0
              ? ('Sesuai' as const)
              : Math.abs(diff) <= 50000
                ? ('Perlu Dicek' as const)
                : ('Tidak Sesuai' as const),
        };
      }
      return rec;
    });
    setReconciliations(nextReconciliationsAfterTx);

    return newTx;
  };

  const verifyTransactionPayment = (
    txId: string,
    verificationStatus: VerificationStatus,
    note?: string
  ) => {
    if (currentUser?.role !== 'admin') return;
    const targetTx = transactions.find((t) => t.id === txId);
    const newStatus =
      verificationStatus === 'Terverifikasi'
        ? 'Selesai'
        : verificationStatus === 'Ditolak'
          ? 'Tidak Sesuai'
          : 'Perlu Dicek';

    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;
        return {
          ...tx,
          verificationStatus,
          status: newStatus,
          notes: note ?? tx.notes,
        };
      })
    );

    if (isSupabaseMode) {
      void runSupabaseAction(
        updateTransactionVerificationInSupabase(txId, verificationStatus, newStatus, note),
        'Gagal memperbarui verifikasi transaksi'
      );
    }

    if (targetTx && targetTx.paymentMethod === 'QRIS') {
      const syncedRecs: ReconciliationRecord[] = [];
      const nextReconciliationsAfterVerify = reconciliations.map((rec) => {
        if (rec.date === targetTx.date && rec.cashierName === targetTx.cashierName) {
          const wasVerified = targetTx.verificationStatus === 'Terverifikasi';
          let verifiedDelta = 0;
          if (!wasVerified && verificationStatus === 'Terverifikasi') {
            verifiedDelta = targetTx.totalAmount;
          } else if (wasVerified && verificationStatus !== 'Terverifikasi') {
            verifiedDelta = -targetTx.totalAmount;
          }
          const nextVerifiedQris = Math.max(0, rec.verifiedQris + verifiedDelta);
          const diff = rec.actualCash + nextVerifiedQris - rec.totalSales;
          const nextRec: ReconciliationRecord = {
            ...rec,
            verifiedQris: nextVerifiedQris,
            difference: diff,
            status:
              diff === 0 ? 'Sesuai' : Math.abs(diff) <= 50000 ? 'Perlu Dicek' : 'Tidak Sesuai',
            checkedBy: currentUser.name,
            checkedById: currentUser.id,
          };
          syncedRecs.push(nextRec);
          return nextRec;
        }
        return rec;
      });
      setReconciliations(nextReconciliationsAfterVerify);
      if (isSupabaseMode) {
        void runSupabaseAction(
          Promise.all(syncedRecs.map((r) => upsertReconciliationInSupabase(r))).then((results) => {
            const failed = results.find((result) => !result.ok);
            return failed ?? { ok: true };
          }),
          'Gagal menyimpan rekonsiliasi'
        );
      }
    }
  };

  const updateReconciliation = (recId: string, actualCash: number, adminNote: string) => {
    if (currentUser?.role !== 'admin') return;
    let savedRec: ReconciliationRecord | null = null;
    const nextReconciliations = reconciliations.map((rec) => {
      if (rec.id !== recId) return rec;
      const diff = actualCash + rec.verifiedQris - rec.totalSales;
      const status =
        diff === 0 ? 'Sesuai' : Math.abs(diff) <= 50000 ? 'Perlu Dicek' : 'Tidak Sesuai';
      const nextRec: ReconciliationRecord = {
        ...rec,
        actualCash,
        difference: diff,
        status,
        adminNote,
        checkedBy: currentUser.name,
        checkedById: currentUser.id,
      };
      savedRec = nextRec;
      return nextRec;
    });
    setReconciliations(nextReconciliations);
    if (isSupabaseMode && savedRec) {
      void runSupabaseAction(
        upsertReconciliationInSupabase(savedRec),
        'Gagal menyimpan rekonsiliasi'
      );
    }
  };

  const updateSawWeights = async (updatedCriteria: SawCriterion[]) => {
    if (currentUser?.role !== 'admin') {
      return { ok: false, message: 'Hanya Admin yang berwenang mengubah bobot kriteria SAW.' };
    }
    const total = Math.round(updatedCriteria.reduce((acc, c) => acc + c.weight, 0) * 100) / 100;
    if (Math.abs(total - 100) >= 0.01) {
      return {
        ok: false,
        message: `Total bobot saat ini ${total}%. Harus tepat 100% sebelum disimpan.`,
      };
    }
    if (isSupabaseMode) {
      try {
        const savedCriteria = await upsertSawCriteriaInSupabase(updatedCriteria);
        if (!savedCriteria.ok) {
          const message = savedCriteria.error || 'Gagal menyimpan bobot SAW.';
          setSupabaseError(message);
          return { ok: false, message };
        }
        setSupabaseError(null);
        setSawCriteria(updatedCriteria);
        if (sawAlternatives.length > 0) {
          const nextResult = calculateSaw(updatedCriteria, sawAlternatives);
          const savedEvaluation = await saveSawEvaluationInSupabase({
            periodLabel: getLocalDateString(),
            sawResult: nextResult,
            createdById: currentUser.id,
          });
          if (!savedEvaluation.ok) {
            const message = `Bobot tersimpan, tetapi evaluasi SAW gagal disimpan: ${savedEvaluation.error || 'kesalahan tidak diketahui.'}`;
            setSupabaseError(message);
            return { ok: false, message };
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal menyimpan bobot SAW.';
        setSupabaseError(message);
        return { ok: false, message };
      }
    } else {
      setSawCriteria(updatedCriteria);
    }
    return { ok: true, message: 'Bobot kriteria SAW berhasil diperbarui (100%).' };
  };

  const retrainC45 = (splitRatio = 0.7) => {
    if (currentUser?.role !== 'admin') return;
    const count = Math.max(12, Math.min(c45Dataset.length - 4, Math.round(c45Dataset.length * splitRatio)));
    setC45SplitIdx(count);

    if (isSupabaseMode) {
      const nextTrain = c45Dataset.slice(0, count);
      const nextTest = c45Dataset.slice(count);
      const { tree, rootMetrics } = trainC45Tree(nextTrain);
      const evaluation = evaluateC45Model(tree, nextTest);
      void runSupabaseAction(
        saveC45TrainingRunInSupabase({
          splitRatio,
          trainCount: nextTrain.length,
          testCount: nextTest.length,
          rootMetrics,
          tree,
          evaluation,
          trainedById: currentUser.id,
        }),
        'Gagal menyimpan hasil training C4.5'
      );
    }
  };

  const recordC45Prediction = (params: {
    inputFeatures: Omit<C45Record, 'id' | 'label'>;
    predictedClass: C45Class;
    path: string[];
  }) => {
    if (!isSupabaseMode || !currentUser || currentUser.role !== 'admin') return;
    void runSupabaseAction(
      saveC45PredictionInSupabase({
        ...params,
        predictedById: currentUser.id,
      }),
      'Gagal menyimpan prediksi C4.5'
    );
  };

  const addReportHistory = (report: Omit<ReportHistoryItem, 'id'>) => {
    if (!currentUser) return;
    if (
      currentUser.role === 'kasir' &&
      (report.type === 'Laporan Rekonsiliasi' ||
        report.type === 'Laporan Analisis SAW' ||
        report.type === 'Laporan Klasifikasi C4.5')
    ) {
      return;
    }

    const newRep: ReportHistoryItem = {
      ...report,
      id: isSupabaseMode ? generateUuid() : `rep-${Date.now()}`,
      createdById: currentUser.id,
    };
    setReports((prev) => [newRep, ...prev]);
    if (isSupabaseMode) {
      void runSupabaseAction(
        insertReportInSupabase(newRep, currentUser.id),
        'Gagal menyimpan laporan'
      );
    }
  };

  const dashboardStats = useMemo(() => {
    if (isSupabaseMode) {
      const visibleTransactions = transactions.filter((t) => {
        if (dashboardPaymentFilter !== 'Semua' && t.paymentMethod !== dashboardPaymentFilter) {
          return false;
        }
        return currentUser?.role !== 'kasir' || t.cashierId === currentUser.id;
      });
      const selectedTransactions = visibleTransactions.filter(
        (transaction) => transaction.date === selectedDashboardDate
      );
      const qrisTotal = selectedTransactions
        .filter((transaction) => transaction.paymentMethod === 'QRIS')
        .reduce((sum, transaction) => sum + transaction.totalAmount, 0);
      const tunaiTotal = selectedTransactions
        .filter((transaction) => transaction.paymentMethod === 'Tunai')
        .reduce((sum, transaction) => sum + transaction.totalAmount, 0);
      const dailyTotals = new Map<string, { actual: number; qris: number; tunai: number }>();
      for (const transaction of visibleTransactions) {
        const total = dailyTotals.get(transaction.date) ?? { actual: 0, qris: 0, tunai: 0 };
        total.actual += transaction.totalAmount;
        if (transaction.paymentMethod === 'QRIS') total.qris += transaction.totalAmount;
        if (transaction.paymentMethod === 'Tunai') total.tunai += transaction.totalAmount;
        dailyTotals.set(transaction.date, total);
      }

      return {
        totalSales: qrisTotal + tunaiTotal,
        totalTransactions: selectedTransactions.length,
        qrisTotal,
        tunaiTotal,
        sesuaiCount: selectedTransactions.filter((transaction) => transaction.status === 'Selesai').length,
        perluDicekCount: selectedTransactions.filter((transaction) => transaction.status === 'Perlu Dicek').length,
        tidakSesuaiCount: selectedTransactions.filter((transaction) => transaction.status === 'Tidak Sesuai').length,
        dailyChartData: Array.from(dailyTotals.entries())
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .slice(-7)
          .map(([date, totals]) => ({
            date,
            label: formatShortDateID(date),
            ...totals,
            comparison: null,
          })),
      };
    }

    const todayTx = transactions.filter((t) => {
      if (!isSupabaseMode && t.date !== selectedDashboardDate) return false;
      if (dashboardPaymentFilter !== 'Semua' && t.paymentMethod !== dashboardPaymentFilter) {
        return false;
      }
      if (currentUser?.role === 'kasir') {
        return t.cashierId === currentUser.id;
      }
      return true;
    });

    const isDefault23SepAdmin =
      !isSupabaseMode &&
      selectedDashboardDate === '2026-09-23' &&
      currentUser?.role !== 'kasir';

    const txQris = todayTx
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((s, t) => s + t.totalAmount, 0);
    const txTunai = todayTx
      .filter((t) => t.paymentMethod === 'Tunai')
      .reduce((s, t) => s + t.totalAmount, 0);

    const baseQris =
      isDefault23SepAdmin && dashboardPaymentFilter !== 'Tunai'
        ? BASELINE_BATCH_23_SEP.qrisAmount
        : 0;
    const baseTunai =
      isDefault23SepAdmin && dashboardPaymentFilter !== 'QRIS'
        ? BASELINE_BATCH_23_SEP.tunaiAmount
        : 0;
    const baseCount =
      isDefault23SepAdmin && dashboardPaymentFilter === 'Semua'
        ? BASELINE_BATCH_23_SEP.count
        : 0;

    const histDay = !isSupabaseMode
      ? DAILY_SALES_HISTORY.find((d) => d.date === selectedDashboardDate)
      : undefined;

    const qrisTotal = histDay
      ? dashboardPaymentFilter === 'Tunai'
        ? 0
        : histDay.qris
      : baseQris + txQris;
    const tunaiTotal = histDay
      ? dashboardPaymentFilter === 'QRIS'
        ? 0
        : histDay.tunai
      : baseTunai + txTunai;
    const totalSales = qrisTotal + tunaiTotal;
    const totalTransactions = histDay
      ? Math.round(totalSales / 24500)
      : baseCount + todayTx.length;

    const txSesuai = todayTx.filter((t) => t.status === 'Selesai').length;
    const txPerluDicek = todayTx.filter((t) => t.status === 'Perlu Dicek').length;
    const txTidakSesuai = todayTx.filter((t) => t.status === 'Tidak Sesuai').length;

    const sesuaiCount = isDefault23SepAdmin
      ? BASELINE_BATCH_23_SEP.sesuaiCount + txSesuai
      : histDay
        ? Math.round(totalTransactions * 0.9)
        : txSesuai;
    const perluDicekCount = isDefault23SepAdmin
      ? BASELINE_BATCH_23_SEP.perluDicekCount + txPerluDicek
      : histDay
        ? Math.round(totalTransactions * 0.07)
        : txPerluDicek;
    const tidakSesuaiCount = isDefault23SepAdmin
      ? BASELINE_BATCH_23_SEP.tidakSesuaiCount + txTidakSesuai
      : histDay
        ? Math.max(0, totalTransactions - sesuaiCount - perluDicekCount)
        : txTidakSesuai;

    const todayLiveTotal =
      (isSupabaseMode ? 0 : BASELINE_BATCH_23_SEP.qrisAmount + BASELINE_BATCH_23_SEP.tunaiAmount) +
      transactions
        .filter((t) => (isSupabaseMode ? true : t.date === '2026-09-23'))
        .reduce((s, t) => s + t.totalAmount, 0);

    const dailyChartData = [
      ...DAILY_SALES_HISTORY.map((d) => ({
        date: d.date,
        label: d.label,
        actual: d.qris + d.tunai,
        comparison: d.target,
        qris: d.qris,
        tunai: d.tunai,
      })),
      {
        date: '2026-09-23',
        label: '23 Sep',
        actual: todayLiveTotal,
        comparison: 2950000,
        qris:
          (isSupabaseMode ? 0 : BASELINE_BATCH_23_SEP.qrisAmount) +
          transactions
            .filter((t) => (isSupabaseMode ? true : t.date === '2026-09-23') && t.paymentMethod === 'QRIS')
            .reduce((s, t) => s + t.totalAmount, 0),
        tunai:
          (isSupabaseMode ? 0 : BASELINE_BATCH_23_SEP.tunaiAmount) +
          transactions
            .filter((t) => (isSupabaseMode ? true : t.date === '2026-09-23') && t.paymentMethod === 'Tunai')
            .reduce((s, t) => s + t.totalAmount, 0),
      },
    ];

    return {
      totalSales,
      totalTransactions,
      qrisTotal,
      tunaiTotal,
      sesuaiCount,
      perluDicekCount,
      tidakSesuaiCount,
      dailyChartData,
    };
  }, [transactions, selectedDashboardDate, dashboardPaymentFilter, currentUser, isSupabaseMode]);

  const resetAppData = () => {
    if (isSupabaseMode) {
      if (currentUser) {
        void fetchOperationalStateFromSupabase(currentUser).then((remote) => {
          applyRemoteState(remote);
          setSupabaseError(null);
        }).catch((err: unknown) => {
          setSupabaseError(
            err instanceof Error ? err.message : 'Gagal memuat ulang data dari Supabase.'
          );
        });
      }
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setQrisMutations(INITIAL_QRIS_MUTATIONS);
    setReconciliations(INITIAL_RECONCILIATIONS);
    setSawCriteria(INITIAL_SAW_CRITERIA);
    setReports(INITIAL_REPORTS);
    setSelectedDashboardDate('2026-09-23');
    setDashboardPaymentFilter('Semua');
  };

  return (
    <AppContext.Provider
      value={{
        isSupabaseMode,
        authLoading,
        currentPage,
        setCurrentPage,
        currentUser,
        users,
        loginAsRole,
        loginWithEmail,
        logout,
        switchRole,
        products,
        addProduct,
        updateProduct,
        toggleProductActive,
        deleteProduct,
        transactions,
        createTransaction,
        qrisMutations,
        verifyTransactionPayment,
        reconciliations,
        updateReconciliation,
        sawCriteria,
        sawAlternatives,
        sawResult,
        updateSawWeights,
        c45TrainData,
        c45TestData,
        c45Tree,
        c45RootMetrics,
        c45Evaluation,
        retrainC45,
        recordC45Prediction,
        reports,
        addReportHistory,
        selectedDashboardDate,
        setSelectedDashboardDate,
        dashboardPaymentFilter,
        setDashboardPaymentFilter,
        dashboardStats,
        resetAppData,
      }}
    >
    {supabaseError && (
      <div
        role="alert"
        className="fixed right-4 top-4 z-[100] flex max-w-xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg"
      >
        <span>{supabaseError}</span>
        <button
          type="button"
          onClick={() => setSupabaseError(null)}
          className="shrink-0 font-semibold underline"
        >
          Tutup
        </button>
      </div>
    )}
    {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
