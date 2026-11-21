import {
  C45AttributeMetric,
  C45Class,
  C45EvaluationMetrics,
  C45Record,
  C45TreeNode,
  PaymentMethod,
  Product,
  ProductCategory,
  QrisMerchantMutation,
  ReconciliationRecord,
  ReconciliationStatus,
  ReportHistoryItem,
  SawCalculationResult,
  SawCriterion,
  SawCriterionType,
  Transaction,
  TransactionItem,
  TransactionStatus,
  UserAccount,
  UserRole,
  VerificationStatus,
} from '../types';
import { getSupabaseClient } from './supabaseClient';

export interface SupabaseLoadedState {
  users: UserAccount[];
  products: Product[];
  transactions: Transaction[];
  qrisMutations: QrisMerchantMutation[];
  reconciliations: ReconciliationRecord[];
  sawCriteria: SawCriterion[];
  reports: ReportHistoryItem[];
  c45Dataset?: C45Record[];
}

export interface DbProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  shift: string;
  avatar_label: string;
  active: boolean;
}

export interface DbProductRow {
  id: string;
  product_name: string;
  category: string;
  price: number | string;
  description: string | null;
  image_url: string | null;
  variant_options: string[] | null;
  max_variant_select: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTransactionRow {
  id: string;
  invoice_no: string;
  trx_date: string;
  trx_time: string;
  cashier_id: string;
  cashier_name: string;
  total_amount: number | string;
  payment_method: string;
  cash_tendered: number | string | null;
  qris_ref: string | null;
  verification_status: string;
  status: string;
  notes: string | null;
}

export interface DbTransactionItemRow {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  qty: number;
  image_url: string | null;
  selected_variants: string[] | null;
}

export interface DbQrisMutationRow {
  id: string;
  merchant_ref: string;
  mut_date: string;
  mut_time: string;
  amount: number | string;
  issuer: string;
  settled: boolean;
  matched_transaction_id: string | null;
  matched_invoice_no: string | null;
}

export interface DbReconciliationRow {
  id: string;
  rec_date: string;
  shift: string;
  cashier_id: string;
  cashier_name: string;
  total_sales: number | string;
  recorded_cash: number | string;
  recorded_qris: number | string;
  actual_cash: number | string;
  verified_qris: number | string;
  difference: number | string;
  status: string;
  admin_note: string | null;
  checked_by: string | null;
  checked_by_name: string | null;
}

export interface DbSawCriterionRow {
  id: string;
  code: string;
  name: string;
  weight: number | string;
  type: string;
  description: string | null;
}

export interface DbReportRow {
  id: string;
  title: string;
  report_type: string;
  report_date: string;
  created_by: string;
  created_by_name: string;
}

export interface DbC45DatasetRow {
  id: string;
  split_group: string;
  selisih_nominal: string;
  verifikasi_qris: string;
  kelengkapan_bukti: string;
  ketepatan_waktu: string;
  actual_label: string;
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function mapRowToUser(row: DbProfileRow): UserAccount {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: (row.role === 'admin' ? 'admin' : 'kasir') as UserRole,
    shift: row.shift,
    avatarLabel: row.avatar_label,
    active: Boolean(row.active),
  };
}

export function mapUserToRow(user: UserAccount): DbProfileRow {
  return {
    id: user.id,
    full_name: user.name,
    email: user.email,
    role: user.role,
    shift: user.shift,
    avatar_label: user.avatarLabel,
    active: user.active,
  };
}

export function normalizeSupabaseAssetUrl(
  imageUrl: string | null,
  baseUrl = import.meta.env?.BASE_URL ?? '/'
): string {
  if (!imageUrl) return '';
  if (/^(https?:|data:|blob:)/i.test(imageUrl) || !imageUrl.startsWith('/src/assets/')) {
    return imageUrl;
  }
  return `${baseUrl.replace(/\/?$/, '/')}${imageUrl.slice(1)}`;
}

export function mapRowToProduct(row: DbProductRow): Product {
  const variants = Array.isArray(row.variant_options) ? row.variant_options : [];
  return {
    id: row.id,
    name: row.product_name,
    category: row.category as ProductCategory,
    price: Number(row.price),
    description: row.description ?? '',
    image: normalizeSupabaseAssetUrl(row.image_url),
    active: Boolean(row.is_active),
    ...(variants.length > 0 ? { variantOptions: variants } : {}),
    ...(row.max_variant_select && row.max_variant_select > 0
      ? { maxVariantSelect: row.max_variant_select }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductToRow(product: Product): DbProductRow {
  return {
    id: product.id,
    product_name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
    image_url: product.image,
    variant_options: product.variantOptions ?? [],
    max_variant_select: product.maxVariantSelect ?? 0,
    is_active: product.active,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

export function mapRowsToTransactions(
  txRows: DbTransactionRow[],
  itemRows: DbTransactionItemRow[]
): Transaction[] {
  const itemsByTx = new Map<string, TransactionItem[]>();
  for (const itemRow of itemRows) {
    const list = itemsByTx.get(itemRow.transaction_id) ?? [];
    const variants = Array.isArray(itemRow.selected_variants) ? itemRow.selected_variants : [];
    list.push({
      productId: itemRow.product_id,
      productName: itemRow.product_name_snapshot,
      qty: Number(itemRow.qty),
      unitPrice: Number(itemRow.unit_price_snapshot),
      image: normalizeSupabaseAssetUrl(itemRow.image_url),
      ...(variants.length > 0 ? { selectedVariants: variants } : {}),
    });
    itemsByTx.set(itemRow.transaction_id, list);
  }

  return txRows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    date: row.trx_date,
    time: row.trx_time,
    cashierId: row.cashier_id,
    cashierName: row.cashier_name,
    items: itemsByTx.get(row.id) ?? [],
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method as PaymentMethod,
    ...(row.cash_tendered !== null && row.cash_tendered !== undefined
      ? { cashTendered: Number(row.cash_tendered) }
      : {}),
    ...(row.qris_ref ? { qrisRef: row.qris_ref } : {}),
    verificationStatus: row.verification_status as VerificationStatus,
    status: row.status as TransactionStatus,
    ...(row.notes ? { notes: row.notes } : {}),
  }));
}

export function mapTransactionToRow(tx: Transaction): DbTransactionRow {
  return {
    id: tx.id,
    invoice_no: tx.invoiceNo,
    trx_date: tx.date,
    trx_time: tx.time,
    cashier_id: tx.cashierId,
    cashier_name: tx.cashierName,
    total_amount: tx.totalAmount,
    payment_method: tx.paymentMethod,
    cash_tendered: tx.cashTendered ?? null,
    qris_ref: tx.qrisRef ?? null,
    verification_status: tx.verificationStatus,
    status: tx.status,
    notes: tx.notes ?? null,
  };
}

export function mapTransactionItemsToRows(tx: Transaction): DbTransactionItemRow[] {
  return tx.items.map((item) => ({
    id: generateUuid(),
    transaction_id: tx.id,
    product_id: item.productId || null,
    product_name_snapshot: item.productName,
    unit_price_snapshot: item.unitPrice,
    qty: item.qty,
    image_url: item.image,
    selected_variants: item.selectedVariants ?? [],
  }));
}

export function mapRowToQrisMutation(row: DbQrisMutationRow): QrisMerchantMutation {
  return {
    id: row.id,
    merchantRef: row.merchant_ref,
    date: row.mut_date,
    time: row.mut_time,
    amount: Number(row.amount),
    issuer: row.issuer,
    settled: Boolean(row.settled),
    ...(row.matched_transaction_id ? { matchedTransactionId: row.matched_transaction_id } : {}),
    ...(row.matched_invoice_no ? { matchedInvoiceNo: row.matched_invoice_no } : {}),
  };
}

export function mapQrisMutationToRow(mut: QrisMerchantMutation): DbQrisMutationRow {
  return {
    id: mut.id,
    merchant_ref: mut.merchantRef,
    mut_date: mut.date,
    mut_time: mut.time,
    amount: mut.amount,
    issuer: mut.issuer,
    settled: mut.settled,
    matched_transaction_id: mut.matchedTransactionId ?? null,
    matched_invoice_no: mut.matchedInvoiceNo ?? null,
  };
}

export function mapRowToReconciliation(row: DbReconciliationRow): ReconciliationRecord {
  return {
    id: row.id,
    date: row.rec_date,
    shift: row.shift,
    cashierId: row.cashier_id,
    cashierName: row.cashier_name,
    totalSales: Number(row.total_sales),
    recordedCash: Number(row.recorded_cash),
    recordedQris: Number(row.recorded_qris),
    actualCash: Number(row.actual_cash),
    verifiedQris: Number(row.verified_qris),
    difference: Number(row.difference),
    status: row.status as ReconciliationStatus,
    adminNote: row.admin_note ?? '',
    ...(row.checked_by_name ? { checkedBy: row.checked_by_name } : {}),
    ...(row.checked_by ? { checkedById: row.checked_by } : {}),
  };
}

export function mapReconciliationToRow(rec: ReconciliationRecord): DbReconciliationRow {
  return {
    id: rec.id,
    rec_date: rec.date,
    shift: rec.shift,
    cashier_id: rec.cashierId,
    cashier_name: rec.cashierName,
    total_sales: rec.totalSales,
    recorded_cash: rec.recordedCash,
    recorded_qris: rec.recordedQris,
    actual_cash: rec.actualCash,
    verified_qris: rec.verifiedQris,
    difference: rec.difference,
    status: rec.status,
    admin_note: rec.adminNote,
    checked_by: rec.checkedById ?? null,
    checked_by_name: rec.checkedBy ?? null,
  };
}

export function mapRowToSawCriterion(row: DbSawCriterionRow): SawCriterion {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    weight: Number(row.weight),
    type: (row.type === 'cost' ? 'cost' : 'benefit') as SawCriterionType,
    description: row.description ?? '',
  };
}

export function mapSawCriterionToRow(c: SawCriterion): DbSawCriterionRow {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    weight: c.weight,
    type: c.type,
    description: c.description,
  };
}

export function mapRowToReport(row: DbReportRow): ReportHistoryItem {
  return {
    id: row.id,
    title: row.title,
    type: row.report_type as ReportHistoryItem['type'],
    date: row.report_date,
    createdBy: row.created_by_name,
    createdById: row.created_by,
  };
}

export function mapReportToRow(r: ReportHistoryItem, fallbackUserId: string): DbReportRow {
  return {
    id: r.id,
    title: r.title,
    report_type: r.type,
    report_date: r.date,
    created_by: r.createdById ?? fallbackUserId,
    created_by_name: r.createdBy,
  };
}

export function mapRowToC45Record(row: DbC45DatasetRow): C45Record {
  return {
    id: row.id,
    selisihNominal: row.selisih_nominal as C45Record['selisihNominal'],
    verifikasiQris: row.verifikasi_qris as C45Record['verifikasiQris'],
    kelengkapanBukti: row.kelengkapan_bukti as C45Record['kelengkapanBukti'],
    ketepatanWaktu: row.ketepatan_waktu as C45Record['ketepatanWaktu'],
    label: row.actual_label as C45Class,
  };
}

export async function fetchAuthenticatedUserProfile(): Promise<{
  user: UserAccount | null;
  error?: string;
}> {
  try {
    const client = getSupabaseClient();
    if (!client) return { user: null, error: 'Konfigurasi Supabase belum tersedia.' };

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) return { user: null, error: sessionError.message };
    if (!session?.user) return { user: null };

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      return { user: null, error: `Gagal membaca profil Supabase: ${profileError.message}` };
    }
    if (!profile) {
      return {
        user: null,
        error: 'Profil pengguna belum tersedia di tabel public.profiles.',
      };
    }

    const mapped = mapRowToUser(profile as DbProfileRow);
    if (!mapped.active) {
      await client.auth.signOut();
      return { user: null, error: 'Akun Anda sedang dinonaktifkan oleh Admin.' };
    }

    return { user: mapped };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : 'Gagal memeriksa sesi Supabase.',
    };
  }
}

export async function signInWithSupabasePassword(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: UserAccount; error?: string }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        error:
          error?.message === 'Invalid login credentials'
            ? 'Email atau kata sandi Supabase Auth tidak valid.'
            : error?.message || 'Gagal masuk menggunakan Supabase Authentication.',
      };
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await client.auth.signOut();
      return {
        ok: false,
        error: profileError
          ? `Gagal membaca profil Supabase: ${profileError.message}`
          : 'Akun Auth ditemukan, tetapi profil pada public.profiles belum dibuat.',
      };
    }

    const mapped = mapRowToUser(profile as DbProfileRow);
    if (!mapped.active) {
      await client.auth.signOut();
      return { ok: false, error: 'Akun Anda saat ini berstatus nonaktif.' };
    }

    return { ok: true, user: mapped };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal masuk menggunakan Supabase Authentication.',
    };
  }
}

export async function signOutFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Konfigurasi Supabase belum tersedia.');
  await client.auth.signOut();
}

export async function fetchOperationalStateFromSupabase(
  currentUser: UserAccount
): Promise<SupabaseLoadedState> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Konfigurasi Supabase belum tersedia.');

  const isAdmin = currentUser.role === 'admin';

  const [profilesRes, productsRes, txRes, itemsRes, recRes, sawRes, repRes] = await Promise.all([
    client.from('profiles').select('*').order('role', { ascending: true }),
    client.from('products').select('*').order('id', { ascending: true }),
    client
      .from('transactions')
      .select('*')
      .order('trx_date', { ascending: false })
      .order('trx_time', { ascending: false }),
    client.from('transaction_items').select('*'),
    client.from('reconciliations').select('*').order('rec_date', { ascending: false }),
    client.from('saw_criteria').select('*').order('code', { ascending: true }),
    client.from('reports').select('*').order('report_date', { ascending: false }),
  ]);

  const requiredResults = [
    ['profiles', profilesRes],
    ['products', productsRes],
    ['transactions', txRes],
    ['transaction_items', itemsRes],
    ['reconciliations', recRes],
    ['saw_criteria', sawRes],
    ['reports', repRes],
  ] as const;
  const failedQuery = requiredResults.find(([, result]) => result.error);
  if (failedQuery?.[1].error) {
    throw new Error(`Gagal membaca tabel ${failedQuery[0]}: ${failedQuery[1].error.message}`);
  }

  let qrisMutations: QrisMerchantMutation[] = [];
  let c45Dataset: C45Record[] = [];

  if (isAdmin) {
    const [mutRes, c45Res] = await Promise.all([
      client
        .from('qris_mutations')
        .select('*')
        .order('mut_date', { ascending: false })
        .order('mut_time', { ascending: false }),
      client.from('c45_dataset_records').select('*').order('id', { ascending: true }),
    ]);
    if (mutRes.error) throw new Error(`Gagal membaca tabel qris_mutations: ${mutRes.error.message}`);
    if (c45Res.error) throw new Error(`Gagal membaca tabel c45_dataset_records: ${c45Res.error.message}`);
    qrisMutations = (mutRes.data as DbQrisMutationRow[]).map(mapRowToQrisMutation);
    c45Dataset = (c45Res.data as DbC45DatasetRow[]).map(mapRowToC45Record);
  }

  return {
    users: (profilesRes.data as DbProfileRow[]).map(mapRowToUser),
    products: (productsRes.data as DbProductRow[]).map(mapRowToProduct),
    transactions: mapRowsToTransactions(
      txRes.data as DbTransactionRow[],
      (itemsRes.data ?? []) as DbTransactionItemRow[]
    ),
    qrisMutations,
    reconciliations: (recRes.data as DbReconciliationRow[]).map(mapRowToReconciliation),
    sawCriteria: (sawRes.data as DbSawCriterionRow[]).map(mapRowToSawCriterion),
    reports: (repRes.data as DbReportRow[]).map(mapRowToReport),
    c45Dataset,
  };
}

export async function upsertProductInSupabase(product: Product): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('products')
      .upsert(mapProductToRow(product), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan produk.' };
  }
}

export async function deleteProductInSupabase(productId: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client.from('products').delete().eq('id', productId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menghapus produk.' };
  }
}

export async function insertTransactionInSupabase(
  tx: Transaction
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error: txErr } = await client
      .from('transactions')
      .insert(mapTransactionToRow(tx));
    if (txErr) return { ok: false, error: txErr.message };

    const itemRows = mapTransactionItemsToRows(tx);
    if (itemRows.length > 0) {
      const { error: itemErr } = await client.from('transaction_items').insert(itemRows);
      if (itemErr) return { ok: false, error: itemErr.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan transaksi.' };
  }
}

export async function updateTransactionVerificationInSupabase(
  txId: string,
  verificationStatus: VerificationStatus,
  status: TransactionStatus,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('transactions')
      .update({
        verification_status: verificationStatus,
        status,
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq('id', txId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal memperbarui transaksi.' };
  }
}

export async function upsertQrisMutationInSupabase(
  mut: QrisMerchantMutation
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('qris_mutations')
      .upsert(mapQrisMutationToRow(mut), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan mutasi QRIS.' };
  }
}

export async function upsertReconciliationInSupabase(
  rec: ReconciliationRecord
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('reconciliations')
      .upsert(mapReconciliationToRow(rec), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan rekonsiliasi.' };
  }
}

export async function upsertSawCriteriaInSupabase(
  criteria: SawCriterion[]
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('saw_criteria')
      .upsert(criteria.map(mapSawCriterionToRow), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan kriteria SAW.' };
  }
}

export async function saveSawEvaluationInSupabase(params: {
  periodLabel: string;
  sawResult: SawCalculationResult;
  createdById: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };

  try {
    const evaluationId = generateUuid();
    const { error: evalErr } = await client.from('saw_evaluations').insert({
      id: evaluationId,
      period_label: params.periodLabel,
      average_score: params.sawResult.averageScore,
      overall_status: params.sawResult.overallStatus,
      criteria_snapshot: params.sawResult.criteria,
      created_by: params.createdById,
    });
    if (evalErr) return { ok: false, error: evalErr.message };

    if (params.sawResult.rows.length > 0) {
      const detailRows = params.sawResult.rows.map((row) => ({
        id: generateUuid(),
        evaluation_id: evaluationId,
        alternative_id: row.alternativeId,
        alternative_label: row.label,
        cashier_name: row.cashierName,
        period: row.period,
        raw_scores: row.rawScores,
        normalized_scores: row.normalizedScores,
        preference_value: row.preferenceValue,
        rank_position: row.rank,
        category: row.category,
      }));
      const { error: detErr } = await client.from('saw_evaluation_details').insert(detailRows);
      if (detErr) return { ok: false, error: detErr.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan evaluasi SAW.' };
  }
}

export async function saveC45TrainingRunInSupabase(params: {
  splitRatio: number;
  trainCount: number;
  testCount: number;
  rootMetrics: C45AttributeMetric[];
  tree: C45TreeNode;
  evaluation: C45EvaluationMetrics;
  trainedById: string;
}): Promise<{ ok: boolean; trainingRunId?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };

  try {
    const trainingRunId = generateUuid();
    const bestRoot = params.rootMetrics.find((m) => m.selected) ?? params.rootMetrics[0];

    const { error: runErr } = await client.from('c45_training_runs').insert({
      id: trainingRunId,
      split_ratio: params.splitRatio,
      train_count: params.trainCount,
      test_count: params.testCount,
      root_attribute: bestRoot?.attributeLabel ?? '-',
      root_entropy: bestRoot?.entropyBefore ?? 0,
      root_gain_ratio: bestRoot?.gainRatio ?? 0,
      root_metrics: params.rootMetrics,
      decision_tree: params.tree,
      trained_by: params.trainedById,
    });
    if (runErr) return { ok: false, error: runErr.message };

    const { error: evalErr } = await client.from('c45_evaluations').insert({
      id: generateUuid(),
      training_run_id: trainingRunId,
      accuracy: params.evaluation.accuracy,
      macro_precision: params.evaluation.macroPrecision,
      macro_recall: params.evaluation.macroRecall,
      macro_f1: params.evaluation.macroF1,
      confusion_matrix: params.evaluation.confusionMatrix,
      per_class_metrics: params.evaluation.perClass,
    });
    if (evalErr) return { ok: false, error: evalErr.message };

    return { ok: true, trainingRunId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan training C4.5.' };
  }
}

export async function saveC45PredictionInSupabase(params: {
  inputFeatures: Omit<C45Record, 'id' | 'label'>;
  predictedClass: C45Class;
  path: string[];
  predictedById: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };

  try {
    const { error } = await client.from('c45_predictions').insert({
      id: generateUuid(),
      input_features: params.inputFeatures,
      predicted_class: params.predictedClass,
      decision_path: params.path,
      predicted_by: params.predictedById,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan prediksi C4.5.' };
  }
}

export async function insertReportInSupabase(
  report: ReportHistoryItem,
  fallbackUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Konfigurasi Supabase belum tersedia.' };
  try {
    const { error } = await client
      .from('reports')
      .insert(mapReportToRow(report, fallbackUserId));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan laporan.' };
  }
}
