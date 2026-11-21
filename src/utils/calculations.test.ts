import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSaw, validateSawWeights } from './saw';
import { computeEntropy, evaluateC45Model, predictC45, trainC45Tree } from './c45';
import { formatCompactRupiah, formatRupiah } from './formatters';
import {
  INITIAL_PRODUCTS,
  INITIAL_RECONCILIATIONS,
  INITIAL_SAW_ALTERNATIVES,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../data/seedData';
import { C45Record, SawAlternative, SawCriterion, TransactionItem } from '../types';

test('formatters format Indonesian Rupiah accurately', () => {
  assert.equal(formatRupiah(2770000), 'Rp 2.770.000');
  assert.equal(formatRupiah(-15000), '-Rp 15.000');
  assert.equal(formatCompactRupiah(500000), 'Rp 500k');
});

test('SAW weight validation rejects non-100 totals and accepts exact 100', () => {
  const validCriteria: SawCriterion[] = [
    { id: 'c1', code: 'C1', name: 'Kesesuaian nominal', weight: 30, type: 'benefit', description: '' },
    { id: 'c2', code: 'C2', name: 'Kelengkapan pencatatan', weight: 20, type: 'benefit', description: '' },
    { id: 'c3', code: 'C3', name: 'Verifikasi QRIS', weight: 20, type: 'benefit', description: '' },
    { id: 'c4', code: 'C4', name: 'Kesesuaian kas fisik', weight: 20, type: 'benefit', description: '' },
    { id: 'c5', code: 'C5', name: 'Kelengkapan bukti', weight: 10, type: 'benefit', description: '' },
  ];
  assert.equal(validateSawWeights(validCriteria).isValid, true);

  const invalid = validCriteria.map((c, i) => (i === 0 ? { ...c, weight: 25 } : c));
  const invalidCheck = validateSawWeights(invalid);
  assert.equal(invalidCheck.isValid, false);
  assert.equal(invalidCheck.totalWeight, 95);
});

test('SAW calculation normalizes benefit & cost attributes and ranks alternatives', () => {
  const criteria: SawCriterion[] = [
    { id: 'c1', code: 'C1', name: 'Ketepatan', weight: 60, type: 'benefit', description: '' },
    { id: 'c2', code: 'C2', name: 'Selisih', weight: 40, type: 'cost', description: '' },
  ];
  const alts: SawAlternative[] = [
    { id: 'a1', label: 'Shift A', cashierName: 'Rani', period: '23 Sep', scores: { c1: 100, c2: 10 } },
    { id: 'a2', label: 'Shift B', cashierName: 'Budi', period: '23 Sep', scores: { c1: 50, c2: 20 } },
  ];

  const result = calculateSaw(criteria, alts);
  assert.equal(result.rows[0].alternativeId, 'a1');
  assert.equal(result.rows[0].preferenceValue, 1);
  // Shift B: 0.6*(50/100) + 0.4*(10/20) = 0.3 + 0.2 = 0.5
  assert.equal(result.rows[1].preferenceValue, 0.5);
  assert.equal(result.rows[0].rank, 1);
  assert.equal(result.rows[1].rank, 2);
});

test('C4.5 computes Shannon entropy, trains tree, predicts, and evaluates confusion matrix', () => {
  const train: C45Record[] = [
    { id: '1', selisihNominal: 'Nol', verifikasiQris: 'Terverifikasi', kelengkapanBukti: 'Lengkap', ketepatanWaktu: 'Tepat Waktu', label: 'Sesuai' },
    { id: '2', selisihNominal: 'Nol', verifikasiQris: 'Terverifikasi', kelengkapanBukti: 'Lengkap', ketepatanWaktu: 'Tepat Waktu', label: 'Sesuai' },
    { id: '3', selisihNominal: 'Kecil (<=10rb)', verifikasiQris: 'Menunggu', kelengkapanBukti: 'Kurang', ketepatanWaktu: 'Tepat Waktu', label: 'Perlu Pemeriksaan' },
    { id: '4', selisihNominal: 'Kecil (<=10rb)', verifikasiQris: 'Menunggu', kelengkapanBukti: 'Lengkap', ketepatanWaktu: 'Terlambat', label: 'Perlu Pemeriksaan' },
    { id: '5', selisihNominal: 'Besar (>10rb)', verifikasiQris: 'Tidak Cocok', kelengkapanBukti: 'Tidak Ada', ketepatanWaktu: 'Terlambat', label: 'Tidak Sesuai' },
    { id: '6', selisihNominal: 'Besar (>10rb)', verifikasiQris: 'Tidak Cocok', kelengkapanBukti: 'Kurang', ketepatanWaktu: 'Terlambat', label: 'Tidak Sesuai' },
  ];

  const entropy = computeEntropy(train);
  assert.ok(Math.abs(entropy - 1.585) < 0.01);

  const { tree, rootMetrics } = trainC45Tree(train);
  assert.equal(tree.type, 'internal');
  assert.ok(rootMetrics.some((m) => m.selected && m.gainRatio > 0));

  const pred = predictC45(tree, {
    selisihNominal: 'Nol',
    verifikasiQris: 'Terverifikasi',
    kelengkapanBukti: 'Lengkap',
    ketepatanWaktu: 'Tepat Waktu',
  });
  assert.equal(pred.predictedClass, 'Sesuai');

  const evalRes = evaluateC45Model(tree, train);
  assert.equal(evalRes.accuracy, 1);
  assert.equal(evalRes.confusionMatrix['Sesuai']['Sesuai'], 2);
});

test('Official Dimsum Me Lippo Plaza catalog contains exact 25 products, categories, prices, and variants', () => {
  assert.equal(INITIAL_PRODUCTS.length, 25);
  assert.equal(INITIAL_PRODUCTS.filter((p) => p.category === 'Cemilan').length, 19);
  assert.equal(INITIAL_PRODUCTS.filter((p) => p.category === 'Dimsum Goreng').length, 3);
  assert.equal(INITIAL_PRODUCTS.filter((p) => p.category === 'Add On').length, 3);

  const byName = new Map(INITIAL_PRODUCTS.map((p) => [p.name, p]));
  assert.equal(byName.get('Dimsum Mix isi 8')?.price, 75000);
  assert.equal(byName.get('Dimsum Mix isi 6')?.price, 58000);
  assert.equal(byName.get('Dimsum Mix isi 4')?.price, 45000);
  assert.equal(byName.get('Dimsum Saus Tartar isi 8')?.price, 70000);
  assert.equal(byName.get('Dimsum Saus Tartar isi 6')?.price, 53000);
  assert.equal(byName.get('Dimsum Saus Tartar isi 4')?.price, 40000);
  assert.equal(byName.get('Dimsum Saus Mentai isi 4')?.price, 39500);
  assert.equal(byName.get('Dimsum Original isi 16')?.price, 129000);
  assert.equal(byName.get('Dimsum Mie Saus Mentai isi 4')?.price, 52000);
  assert.equal(byName.get('Dimsum Mie Saus Mentai isi 2')?.price, 38000);
  assert.equal(byName.get('Dimsum Goreng Mentai (3 pcs)')?.price, 48000);
  assert.equal(byName.get('Dimsum Goreng Keju Lumer (6 pcs)')?.price, 78000);
  assert.equal(byName.get('Chili Oil')?.price, 7000);
  assert.equal(byName.get('Saus Dimsum')?.price, 3000);
  assert.equal(byName.get('Air Mineral')?.price, 7000);

  assert.equal(byName.get('Dimsum Mix isi 8')?.maxVariantSelect, 4);
  assert.equal(byName.get('Dimsum Mix isi 6')?.maxVariantSelect, 3);
  assert.equal(byName.get('Dimsum Mix isi 4')?.maxVariantSelect, 2);

  // Snapshot immutability check: changing a copied catalog product price does not alter recorded TransactionItem unitPrice
  const mentai4 = byName.get('Dimsum Saus Mentai isi 4')!;
  const snapshotItem: TransactionItem = {
    productId: mentai4.id,
    productName: mentai4.name,
    qty: 2,
    unitPrice: mentai4.price,
    image: mentai4.image,
  };
  const updatedCatalogProduct = { ...mentai4, price: 42000 };
  assert.equal(updatedCatalogProduct.price, 42000);
  assert.equal(snapshotItem.unitPrice, 39500);
  assert.equal(snapshotItem.qty * snapshotItem.unitPrice, 79000);
});

test('Cashier accounts and operational records use Gracia, Ferginia, and Julio', () => {
  const kasirNames = INITIAL_USERS.filter((u) => u.role === 'kasir').map((u) => u.name);
  assert.deepEqual(kasirNames, ['Gracia', 'Ferginia', 'Julio']);

  const allowedSet = new Set(['Gracia', 'Ferginia', 'Julio']);
  for (const tx of INITIAL_TRANSACTIONS) {
    assert.ok(allowedSet.has(tx.cashierName), `Unexpected cashier in tx: ${tx.cashierName}`);
  }
  for (const rec of INITIAL_RECONCILIATIONS) {
    assert.ok(allowedSet.has(rec.cashierName), `Unexpected cashier in rec: ${rec.cashierName}`);
  }
  for (const alt of INITIAL_SAW_ALTERNATIVES) {
    assert.ok(allowedSet.has(alt.cashierName), `Unexpected cashier in saw: ${alt.cashierName}`);
  }
});

import {
  generateUuid,
  mapProductToRow,
  mapReconciliationToRow,
  mapReportToRow,
  mapRowToProduct,
  mapRowToReconciliation,
  mapRowToReport,
  mapRowToSawCriterion,
  mapRowToUser,
  mapRowsToTransactions,
  mapSawCriterionToRow,
  mapTransactionItemsToRows,
  mapTransactionToRow,
  mapUserToRow,
} from '../services/supabaseRepository';
import {
  SUPABASE_DEMO_USERS_SQL,
  SUPABASE_RLS_SQL,
  SUPABASE_SCHEMA_SQL,
  SUPABASE_SEED_SQL,
  SUPABASE_SQL_BLUEPRINT,
} from '../services/supabaseBlueprint';
import { isSupabaseConfigured, normalizeSupabaseUrl } from '../services/supabaseClient';

test('Supabase repository mappers round-trip products, transactions (including deleted product snapshots), reconciliations, reports, SAW criteria, and profiles cleanly', () => {
  const sampleUser = INITIAL_USERS[1];
  assert.deepEqual(mapRowToUser(mapUserToRow(sampleUser)), sampleUser);

  const mixProduct = INITIAL_PRODUCTS[0];
  assert.deepEqual(mapRowToProduct(mapProductToRow(mixProduct)), mixProduct);

  const sampleTx = INITIAL_TRANSACTIONS[0];
  const txRow = mapTransactionToRow(sampleTx);
  const itemRows = mapTransactionItemsToRows(sampleTx);
  const [rebuiltTx] = mapRowsToTransactions([txRow], itemRows);
  assert.deepEqual(rebuiltTx, sampleTx);

  // Snapshot resilience when parent product is deleted (product_id becomes null in DB)
  const detachedItemRows = itemRows.map((row) => ({ ...row, product_id: null }));
  const [rebuiltDetachedTx] = mapRowsToTransactions([txRow], detachedItemRows);
  assert.equal(rebuiltDetachedTx.items[0].productId, null);
  assert.equal(rebuiltDetachedTx.items[0].productName, sampleTx.items[0].productName);
  assert.equal(rebuiltDetachedTx.items[0].unitPrice, sampleTx.items[0].unitPrice);

  const sampleRec = INITIAL_RECONCILIATIONS[1];
  assert.deepEqual(mapRowToReconciliation(mapReconciliationToRow(sampleRec)), sampleRec);

  const sampleCrit = {
    id: 'c1',
    code: 'C1',
    name: 'Kesesuaian nominal',
    weight: 30,
    type: 'benefit' as const,
    description: 'Uji bobot SAW',
  };
  assert.deepEqual(mapRowToSawCriterion(mapSawCriterionToRow(sampleCrit)), sampleCrit);

  const sampleReport = {
    id: generateUuid(),
    title: 'Laporan Penjualan',
    type: 'Laporan Penjualan' as const,
    date: '2026-09-23',
    createdBy: 'Admin Dimsum Me',
    createdById: sampleUser.id,
  };
  assert.match(sampleReport.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.deepEqual(mapRowToReport(mapReportToRow(sampleReport, sampleUser.id)), sampleReport);
});

test('Supabase SQL blueprint includes all 14 tables, strict RLS without permissive anon/true writes, 25 corrected products, and safe Auth demo procedure', () => {
  const requiredTables = [
    'public.profiles',
    'public.products',
    'public.transactions',
    'public.transaction_items',
    'public.qris_mutations',
    'public.reconciliations',
    'public.saw_criteria',
    'public.saw_evaluations',
    'public.saw_evaluation_details',
    'public.c45_dataset_records',
    'public.c45_training_runs',
    'public.c45_evaluations',
    'public.c45_predictions',
    'public.reports',
  ];
  for (const table of requiredTables) {
    assert.ok(SUPABASE_SCHEMA_SQL.includes(table), `Missing table ${table}`);
    assert.ok(SUPABASE_RLS_SQL.includes(table), `Missing RLS for ${table}`);
  }

  assert.ok(SUPABASE_SCHEMA_SQL.includes('prevent_profile_privilege_escalation'));
  assert.ok(SUPABASE_SCHEMA_SQL.includes('public.is_admin()'));
  assert.ok(SUPABASE_RLS_SQL.includes('auth.uid()'));
  assert.equal(/for\s+(all|insert|update|delete)\s+to\s+anon/i.test(SUPABASE_RLS_SQL), false);
  assert.ok(
    /products_select_active_or_admin[^;]*is_active\s*=\s*true\s+or\s+public\.is_admin\(\)/i.test(
      SUPABASE_RLS_SQL
    )
  );
  assert.equal(/with\s+check\s*\(\s*true\s*\)/i.test(SUPABASE_RLS_SQL), false);
  assert.equal(SUPABASE_SQL_BLUEPRINT.includes('service_role'), false);

  for (let i = 1; i <= 25; i++) {
    const id = `prd-${String(i).padStart(2, '0')}`;
    assert.ok(SUPABASE_SEED_SQL.includes(`'${id}'`), `Missing seed product ${id}`);
  }
  assert.ok(SUPABASE_SEED_SQL.includes("('prd-19', 'Dimsum Mie Saus Mentai isi 2', 'Cemilan', 38000"));
  assert.ok(SUPABASE_SEED_SQL.includes("('prd-20', 'Dimsum Goreng Mentai (3 pcs)', 'Dimsum Goreng', 48000"));

  assert.ok(SUPABASE_DEMO_USERS_SQL.includes('auth.users'));
  assert.ok(SUPABASE_DEMO_USERS_SQL.includes('admin@dimsumme.local'));
  assert.ok(SUPABASE_DEMO_USERS_SQL.includes('gracia@dimsumme.local'));
  assert.ok(SUPABASE_DEMO_USERS_SQL.includes('ferginia@dimsumme.local'));
  assert.ok(SUPABASE_DEMO_USERS_SQL.includes('julio@dimsumme.local'));
  assert.equal(
    normalizeSupabaseUrl('https://pypdqxcnnhwearhjlsmk.supabase.co/rest/v1/'),
    'https://pypdqxcnnhwearhjlsmk.supabase.co'
  );
  assert.equal(isSupabaseConfigured(), false);
});


