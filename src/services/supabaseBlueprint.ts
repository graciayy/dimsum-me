export const SUPABASE_SCHEMA_SQL = `-- ============================================================================
-- 1. SCHEMA UTAMA DATABASE UMKM DIMSUM ME (PostgreSQL / Supabase)
-- Jalankan langkah ini terlebih dahulu pada SQL Editor project Supabase baru.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1.1 Tabel Profil Pengguna (terhubung 1:1 dengan auth.users via UUID FK)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'kasir')) default 'kasir',
  shift text not null default 'Shift Pagi (08:00–13:00)',
  avatar_label text not null default 'DM',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fungsi helper aman untuk memeriksa role pengguna terautentikasi
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

-- Trigger anti privilege-escalation: non-admin dilarang menaikkan role atau status active sendiri
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Akses ditolak: pengguna tidak dapat mengubah role sendiri.';
    end if;
    if new.active is distinct from old.active then
      raise exception 'Akses ditolak: pengguna tidak dapat mengubah status aktif sendiri.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on public.profiles;
create trigger trg_prevent_profile_privilege_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

-- Sinkronisasi otomatis profil saat user baru dibuat di Supabase Auth (role default selalu 'kasir')
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_name text;
  derived_avatar text;
begin
  derived_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    initcap(split_part(coalesce(new.email, 'kasir'), '@', 1))
  );
  derived_avatar := upper(left(regexp_replace(derived_name, '[^A-Za-z]', '', 'g'), 2));
  if length(derived_avatar) < 2 then
    derived_avatar := 'DM';
  end if;

  insert into public.profiles (id, full_name, email, role, shift, avatar_label, active)
  values (
    new.id,
    derived_name,
    coalesce(new.email, ''),
    'kasir',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'shift'), ''), 'Shift Pagi (08:00–13:00)'),
    derived_avatar,
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- 1.2 Tabel Katalog Produk
create table if not exists public.products (
  id text primary key,
  product_name text not null,
  category text not null check (category in ('Cemilan', 'Dimsum Goreng', 'Add On')),
  price numeric(12, 2) not null check (price >= 0),
  description text not null default '',
  image_url text not null default '',
  variant_options jsonb not null default '[]'::jsonb,
  max_variant_select integer not null default 0 check (max_variant_select >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.3 Tabel Transaksi Penjualan (terhubung ke profiles.id)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  trx_date date not null default current_date,
  trx_time text not null,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  cashier_name text not null,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('Tunai', 'QRIS')),
  cash_tendered numeric(12, 2) check (cash_tendered is null or cash_tendered >= 0),
  qris_ref text,
  verification_status text not null check (verification_status in ('Menunggu Verifikasi', 'Terverifikasi', 'Ditolak')),
  status text not null check (status in ('Selesai', 'Perlu Dicek', 'Tidak Sesuai')),
  notes text,
  created_at timestamptz not null default now()
);

-- 1.4 Tabel Detail Item Transaksi (snapshot harga & nama produk tetap aman walau produk dihapus)
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  qty integer not null check (qty > 0),
  image_url text not null default '',
  selected_variants jsonb not null default '[]'::jsonb
);

-- 1.5 Tabel Mutasi QRIS Merchant (terhubung ke transactions.id jika cocok)
create table if not exists public.qris_mutations (
  id uuid primary key default gen_random_uuid(),
  merchant_ref text unique not null,
  mut_date date not null,
  mut_time text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  issuer text not null,
  settled boolean not null default true,
  matched_transaction_id uuid references public.transactions(id) on delete set null,
  matched_invoice_no text,
  created_at timestamptz not null default now()
);

-- 1.6 Tabel Rekonsiliasi Kas Harian
create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  rec_date date not null,
  shift text not null,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  cashier_name text not null,
  total_sales numeric(12, 2) not null check (total_sales >= 0),
  recorded_cash numeric(12, 2) not null check (recorded_cash >= 0),
  recorded_qris numeric(12, 2) not null check (recorded_qris >= 0),
  actual_cash numeric(12, 2) not null check (actual_cash >= 0),
  verified_qris numeric(12, 2) not null check (verified_qris >= 0),
  difference numeric(12, 2) not null,
  status text not null check (status in ('Sesuai', 'Perlu Dicek', 'Tidak Sesuai')),
  admin_note text not null default '',
  checked_by uuid references public.profiles(id) on delete set null,
  checked_by_name text,
  updated_at timestamptz not null default now()
);

-- 1.7 Struktur Analisis Metode SAW (Kriteria + Hasil Evaluasi + Detail Normalisasi)
create table if not exists public.saw_criteria (
  id text primary key,
  code text unique not null,
  name text not null,
  weight numeric(5, 2) not null check (weight >= 0 and weight <= 100),
  type text not null check (type in ('benefit', 'cost')),
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.saw_evaluations (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  average_score numeric(6, 4) not null,
  overall_status text not null check (overall_status in ('Baik', 'Cukup', 'Perlu Evaluasi')),
  criteria_snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.saw_evaluation_details (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.saw_evaluations(id) on delete cascade,
  alternative_id text not null,
  alternative_label text not null,
  cashier_id uuid references public.profiles(id) on delete set null,
  cashier_name text not null,
  period text not null,
  raw_scores jsonb not null,
  normalized_scores jsonb not null,
  preference_value numeric(6, 4) not null,
  rank_position integer not null check (rank_position > 0),
  category text not null check (category in ('Baik', 'Cukup', 'Perlu Evaluasi'))
);

-- 1.8 Struktur Analisis Algoritma C4.5 (Dataset, Training Run, Evaluasi Model, & Prediksi)
create table if not exists public.c45_dataset_records (
  id text primary key,
  split_group text not null check (split_group in ('train', 'test')),
  selisih_nominal text not null check (selisih_nominal in ('Nol', 'Kecil (<=10rb)', 'Besar (>10rb)')),
  verifikasi_qris text not null check (verifikasi_qris in ('Terverifikasi', 'Menunggu', 'Tidak Cocok')),
  kelengkapan_bukti text not null check (kelengkapan_bukti in ('Lengkap', 'Kurang', 'Tidak Ada')),
  ketepatan_waktu text not null check (ketepatan_waktu in ('Tepat Waktu', 'Terlambat')),
  actual_label text not null check (actual_label in ('Sesuai', 'Perlu Pemeriksaan', 'Tidak Sesuai')),
  created_at timestamptz not null default now()
);

create table if not exists public.c45_training_runs (
  id uuid primary key default gen_random_uuid(),
  split_ratio numeric(4, 2) not null check (split_ratio > 0 and split_ratio < 1),
  train_count integer not null check (train_count > 0),
  test_count integer not null check (test_count >= 0),
  root_attribute text not null,
  root_entropy numeric(8, 6) not null,
  root_gain_ratio numeric(8, 6) not null,
  root_metrics jsonb not null,
  decision_tree jsonb not null,
  trained_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.c45_evaluations (
  id uuid primary key default gen_random_uuid(),
  training_run_id uuid not null references public.c45_training_runs(id) on delete cascade,
  accuracy numeric(6, 4) not null,
  macro_precision numeric(6, 4) not null,
  macro_recall numeric(6, 4) not null,
  macro_f1 numeric(6, 4) not null,
  confusion_matrix jsonb not null,
  per_class_metrics jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.c45_predictions (
  id uuid primary key default gen_random_uuid(),
  training_run_id uuid references public.c45_training_runs(id) on delete set null,
  dataset_record_id text references public.c45_dataset_records(id) on delete set null,
  input_features jsonb not null,
  predicted_class text not null check (predicted_class in ('Sesuai', 'Perlu Pemeriksaan', 'Tidak Sesuai')),
  actual_class text check (actual_class is null or actual_class in ('Sesuai', 'Perlu Pemeriksaan', 'Tidak Sesuai')),
  is_correct boolean,
  decision_path jsonb not null,
  predicted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 1.9 Tabel Riwayat Laporan (terhubung ke profiles.id)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_type text not null check (
    report_type in (
      'Laporan Penjualan',
      'Laporan Penerimaan Kas',
      'Laporan QRIS',
      'Laporan Penutupan Kas Harian',
      'Laporan Rekonsiliasi',
      'Laporan Analisis SAW',
      'Laporan Klasifikasi C4.5'
    )
  ),
  report_date date not null default current_date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

-- Indeks untuk performa kueri operasional
create index if not exists idx_transactions_date on public.transactions (trx_date desc, trx_time desc);
create index if not exists idx_transactions_cashier on public.transactions (cashier_id);
create index if not exists idx_transaction_items_tx on public.transaction_items (transaction_id);
create index if not exists idx_qris_mutations_ref on public.qris_mutations (merchant_ref);
create index if not exists idx_reconciliations_date on public.reconciliations (rec_date desc);
create index if not exists idx_reports_created_by on public.reports (created_by);
`;

export const SUPABASE_SEED_SQL = `-- ============================================================================
-- 2. SEED KATALOG RESMI 25 PRODUK DIMSUM ME, KRITERIA SAW, & DATASET C4.5
-- Semua harga sudah dikoreksi (termasuk Dimsum Mie Saus Mentai isi 2 = Rp38.000
-- dan Dimsum Goreng Mentai (3 pcs) = Rp48.000).
-- Perhatian: bila dijalankan ulang, produk dan bobot kriteria SAW disetel ulang ke nilai seed.
-- ============================================================================

insert into public.products (id, product_name, category, price, description, image_url, variant_options, max_variant_select, is_active)
values
  ('prd-01', 'Dimsum Mix isi 8', 'Cemilan', 75000, 'Dapat 4 varian : Mentai - Mentai Keju - Tartar - Mozzarella', '/src/assets/images/dimsum_mix_thumb_1795217632736.jpg', '["Mentai","Mentai Keju","Tartar","Mozzarella"]', 4, true),
  ('prd-02', 'Dimsum Mix isi 6', 'Cemilan', 58000, 'Pilih 3 varian : Mentai / Mentai Keju / Tartar / Mozzarella', '/src/assets/images/dimsum_mix_thumb_1795217632736.jpg', '["Mentai","Mentai Keju","Tartar","Mozzarella"]', 3, true),
  ('prd-03', 'Dimsum Mix isi 4', 'Cemilan', 45000, 'Pilih 2 varian : Mentai / Mentai Keju / Tartar / Mozzarella', '/src/assets/images/dimsum_mix_thumb_1795217632736.jpg', '["Mentai","Mentai Keju","Tartar","Mozzarella"]', 2, true),
  ('prd-04', 'Dimsum Saus Tartar isi 8', 'Cemilan', 70000, 'Saus tartar merupakan perpaduan rasa gurih, creamy (lembut) dan asam segar.', '/src/assets/images/dimsum_saus_tartar_1795219231922.jpg', '[]', 0, true),
  ('prd-05', 'Dimsum Saus Tartar isi 6', 'Cemilan', 53000, 'Saus tartar merupakan perpaduan rasa gurih, creamy (lembut), asam segar, dan sedikit manis.', '/src/assets/images/dimsum_saus_tartar_1795219231922.jpg', '[]', 0, true),
  ('prd-06', 'Dimsum Saus Tartar isi 4', 'Cemilan', 40000, 'Saus tartar merupakan perpaduan rasa gurih, creamy (lembut), asam segar, dan sedikit manis.', '/src/assets/images/dimsum_saus_tartar_1795219231922.jpg', '[]', 0, true),
  ('prd-07', 'Dimsum Mentai Keju isi 8', 'Cemilan', 73000, 'Dimsum lembut dilapisi saus mentai dan ditambahkan potongan keju slice diatasnya, gurih dan creamy.', '/src/assets/images/dimsum_mentai_keju_1795219003289.jpg', '[]', 0, true),
  ('prd-08', 'Dimsum Mentai Keju isi 6', 'Cemilan', 57000, 'Dimsum lembut dilapisi saus mentai dan ditambahkan potongan keju slice diatasnya, gurih dan creamy.', '/src/assets/images/dimsum_mentai_keju_1795219003289.jpg', '[]', 0, true),
  ('prd-09', 'Dimsum Mentai Keju isi 4', 'Cemilan', 43000, 'Dimsum lembut dilapisi saus mentai dan ditambahkan potongan keju slice diatasnya, gurih dan creamy.', '/src/assets/images/dimsum_mentai_keju_1795219003289.jpg', '[]', 0, true),
  ('prd-10', 'Dimsum Saus Mentai isi 16', 'Cemilan', 145000, '', '/src/assets/images/dimsum_saus_mentai_1795219004444.jpg', '[]', 0, true),
  ('prd-11', 'Dimsum Saus Mentai isi 8', 'Cemilan', 69000, 'saus yang gurih, creamy dan sedikit pedas.', '/src/assets/images/dimsum_saus_mentai_1795219004444.jpg', '[]', 0, true),
  ('prd-12', 'Dimsum Saus Mentai isi 6', 'Cemilan', 54000, 'Saus yang gurih, creamy, dan sedikit pedas.', '/src/assets/images/dimsum_saus_mentai_1795219004444.jpg', '[]', 0, true),
  ('prd-13', 'Dimsum Saus Mentai isi 4', 'Cemilan', 39500, '', '/src/assets/images/dimsum_saus_mentai_1795219004444.jpg', '[]', 0, true),
  ('prd-14', 'Dimsum Original isi 16', 'Cemilan', 129000, 'Dimsum isian daging ayam padat, lembut, nikmat, cocok untuk cemilan istimewa.', '/src/assets/images/dimsum_ayam_thumb_1795217632558.jpg', '[]', 0, true),
  ('prd-15', 'Dimsum Original isi 8', 'Cemilan', 58000, 'Dimsum isi ayam gurih dan lezat, nikmat untuk cemilan istimewa.', '/src/assets/images/dimsum_ayam_thumb_1795217632558.jpg', '[]', 0, true),
  ('prd-16', 'Dimsum Original isi 6', 'Cemilan', 45000, 'Dimsum isian daging ayam padat, lembut, nikmat, cocok untuk cemilan istimewa.', '/src/assets/images/dimsum_ayam_thumb_1795217632558.jpg', '[]', 0, true),
  ('prd-17', 'Dimsum Original isi 4', 'Cemilan', 33000, 'Dimsum isian daging ayam padat, lembut, nikmat, cocok untuk cemilan istimewa.', '/src/assets/images/dimsum_ayam_thumb_1795217632558.jpg', '[]', 0, true),
  ('prd-18', 'Dimsum Mie Saus Mentai isi 4', 'Cemilan', 52000, 'Indomie saus mentai + dimsum mentai 4 pcs', '/src/assets/images/dimsum_mie_mentai_1795219004341.jpg', '[]', 0, true),
  ('prd-19', 'Dimsum Mie Saus Mentai isi 2', 'Cemilan', 38000, 'Indomie saus mentai + dimsum mentai 2 pcs', '/src/assets/images/dimsum_mie_mentai_1795219004341.jpg', '[]', 0, true),
  ('prd-20', 'Dimsum Goreng Mentai (3 pcs)', 'Dimsum Goreng', 48000, 'Dimsum goreng yang renyah di luar dan juicy di dalam dengan siraman saus mentai yang gurih, creamy, dan beraroma smoky.', '/src/assets/images/dimsum_goreng_mentai_1795219004422.jpg', '[]', 0, true),
  ('prd-21', 'Dimsum Goreng Keju Lumer (6 pcs)', 'Dimsum Goreng', 78000, 'Dimsum ayam yang gurih dan juicy, dibungkus kulit renyah (crispy), dengan isian keju meleleh didalam.', '/src/assets/images/dimsum_goreng_keju_1795219003095.jpg', '[]', 0, true),
  ('prd-22', 'Dimsum Goreng Keju Lumer (3 pcs)', 'Dimsum Goreng', 42000, '', '/src/assets/images/dimsum_goreng_keju_1795219003095.jpg', '[]', 0, true),
  ('prd-23', 'Chili Oil', 'Add On', 7000, '', '/src/assets/images/chili_oil_pouch_1795219002696.jpg', '[]', 0, true),
  ('prd-24', 'Saus Dimsum', 'Add On', 3000, '', '/src/assets/images/saus_dimsum_cup_1795219003556.jpg', '[]', 0, true),
  ('prd-25', 'Air Mineral', 'Add On', 7000, '', '/src/assets/images/air_mineral_botol_1795219003475.jpg', '[]', 0, true)
on conflict (id) do update set
  product_name = excluded.product_name,
  category = excluded.category,
  price = excluded.price,
  description = excluded.description,
  image_url = excluded.image_url,
  variant_options = excluded.variant_options,
  max_variant_select = excluded.max_variant_select,
  updated_at = now();

insert into public.saw_criteria (id, code, name, weight, type, description)
values
  ('c1', 'C1', 'Kesesuaian nominal', 30, 'benefit', 'Tingkat kecocokan nominal penjualan POS dengan total penerimaan tercatat.'),
  ('c2', 'C2', 'Kelengkapan pencatatan', 20, 'benefit', 'Persentase transaksi dengan rincian produk, metode bayar, dan identitas kasir lengkap.'),
  ('c3', 'C3', 'Verifikasi QRIS', 20, 'benefit', 'Persentase pembayaran QRIS yang tervalidasi pada mutasi rekening merchant.'),
  ('c4', 'C4', 'Kesesuaian kas fisik', 20, 'benefit', 'Akurasi jumlah uang tunai aktual di laci kas terhadap catatan POS.'),
  ('c5', 'C5', 'Kelengkapan bukti transaksi', 10, 'benefit', 'Ketersediaan struk fisik, referensi QRIS, dan bukti setoran penutupan shift.')
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  weight = excluded.weight,
  type = excluded.type,
  description = excluded.description,
  updated_at = now();

insert into public.c45_dataset_records (id, split_group, selisih_nominal, verifikasi_qris, kelengkapan_bukti, ketepatan_waktu, actual_label)
values
  ('SIM-01', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-02', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-03', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Terlambat', 'Sesuai'),
  ('SIM-04', 'train', 'Nol', 'Terverifikasi', 'Kurang', 'Tepat Waktu', 'Sesuai'),
  ('SIM-05', 'train', 'Nol', 'Menunggu', 'Lengkap', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('SIM-06', 'train', 'Nol', 'Menunggu', 'Kurang', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('SIM-07', 'train', 'Nol', 'Tidak Cocok', 'Lengkap', 'Tepat Waktu', 'Tidak Sesuai'),
  ('SIM-08', 'train', 'Nol', 'Terverifikasi', 'Tidak Ada', 'Terlambat', 'Perlu Pemeriksaan'),
  ('SIM-09', 'train', 'Kecil (<=10rb)', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('SIM-10', 'train', 'Kecil (<=10rb)', 'Terverifikasi', 'Kurang', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('SIM-11', 'train', 'Kecil (<=10rb)', 'Menunggu', 'Lengkap', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('SIM-12', 'train', 'Kecil (<=10rb)', 'Menunggu', 'Kurang', 'Terlambat', 'Perlu Pemeriksaan'),
  ('SIM-13', 'train', 'Kecil (<=10rb)', 'Tidak Cocok', 'Kurang', 'Terlambat', 'Tidak Sesuai'),
  ('SIM-14', 'train', 'Kecil (<=10rb)', 'Terverifikasi', 'Tidak Ada', 'Terlambat', 'Tidak Sesuai'),
  ('SIM-15', 'train', 'Besar (>10rb)', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Tidak Sesuai'),
  ('SIM-16', 'train', 'Besar (>10rb)', 'Menunggu', 'Kurang', 'Terlambat', 'Tidak Sesuai'),
  ('SIM-17', 'train', 'Besar (>10rb)', 'Tidak Cocok', 'Tidak Ada', 'Terlambat', 'Tidak Sesuai'),
  ('SIM-18', 'train', 'Besar (>10rb)', 'Tidak Cocok', 'Kurang', 'Tepat Waktu', 'Tidak Sesuai'),
  ('SIM-19', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-20', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-21', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-22', 'train', 'Nol', 'Menunggu', 'Lengkap', 'Terlambat', 'Perlu Pemeriksaan'),
  ('SIM-23', 'train', 'Kecil (<=10rb)', 'Terverifikasi', 'Lengkap', 'Terlambat', 'Perlu Pemeriksaan'),
  ('SIM-24', 'train', 'Besar (>10rb)', 'Menunggu', 'Lengkap', 'Tepat Waktu', 'Tidak Sesuai'),
  ('SIM-25', 'train', 'Nol', 'Terverifikasi', 'Kurang', 'Terlambat', 'Perlu Pemeriksaan'),
  ('SIM-26', 'train', 'Nol', 'Tidak Cocok', 'Kurang', 'Terlambat', 'Tidak Sesuai'),
  ('SIM-27', 'train', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('SIM-28', 'train', 'Kecil (<=10rb)', 'Tidak Cocok', 'Tidak Ada', 'Terlambat', 'Tidak Sesuai'),
  ('TST-01', 'test', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai'),
  ('TST-02', 'test', 'Nol', 'Terverifikasi', 'Lengkap', 'Terlambat', 'Sesuai'),
  ('TST-03', 'test', 'Nol', 'Menunggu', 'Lengkap', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('TST-04', 'test', 'Kecil (<=10rb)', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Perlu Pemeriksaan'),
  ('TST-05', 'test', 'Kecil (<=10rb)', 'Menunggu', 'Kurang', 'Terlambat', 'Perlu Pemeriksaan'),
  ('TST-06', 'test', 'Besar (>10rb)', 'Tidak Cocok', 'Tidak Ada', 'Terlambat', 'Tidak Sesuai'),
  ('TST-07', 'test', 'Besar (>10rb)', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Tidak Sesuai'),
  ('TST-08', 'test', 'Nol', 'Tidak Cocok', 'Lengkap', 'Tepat Waktu', 'Tidak Sesuai'),
  ('TST-09', 'test', 'Nol', 'Terverifikasi', 'Kurang', 'Tepat Waktu', 'Sesuai'),
  ('TST-10', 'test', 'Nol', 'Terverifikasi', 'Tidak Ada', 'Terlambat', 'Perlu Pemeriksaan'),
  ('TST-11', 'test', 'Kecil (<=10rb)', 'Tidak Cocok', 'Kurang', 'Terlambat', 'Tidak Sesuai'),
  ('TST-12', 'test', 'Nol', 'Terverifikasi', 'Lengkap', 'Tepat Waktu', 'Sesuai')
on conflict (id) do nothing;
`;

export const SUPABASE_RLS_SQL = `-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES KETAT BERBASIS auth.uid() & ROLE
-- Tidak ada akses CRUD terbuka untuk anon / USING (true) untuk data sensitif.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.qris_mutations enable row level security;
alter table public.reconciliations enable row level security;
alter table public.saw_criteria enable row level security;
alter table public.saw_evaluations enable row level security;
alter table public.saw_evaluation_details enable row level security;
alter table public.c45_dataset_records enable row level security;
alter table public.c45_training_runs enable row level security;
alter table public.c45_evaluations enable row level security;
alter table public.c45_predictions enable row level security;
alter table public.reports enable row level security;

-- 3.1 PROFILES: baca profil sendiri / Admin semua; update aman tanpa eskalasi role
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin_or_self_kasir" on public.profiles;
create policy "profiles_insert_admin_or_self_kasir"
  on public.profiles for insert to authenticated
  with check (public.is_admin() or (id = auth.uid() and role = 'kasir'));

drop policy if exists "profiles_update_self_safe_or_admin" on public.profiles;
create policy "profiles_update_self_safe_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (id = auth.uid() and role = public.current_user_role()));

drop policy if exists "profiles_delete_admin_only" on public.profiles;
create policy "profiles_delete_admin_only"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- 3.2 PRODUCTS: publik/user hanya membaca produk aktif; hanya Admin boleh CRUD
drop policy if exists "products_select_active_or_admin" on public.products;
create policy "products_select_active_or_admin"
  on public.products for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "products_insert_admin_only" on public.products;
create policy "products_insert_admin_only"
  on public.products for insert to authenticated
  with check (public.is_admin());

drop policy if exists "products_update_admin_only" on public.products;
create policy "products_update_admin_only"
  on public.products for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_delete_admin_only" on public.products;
create policy "products_delete_admin_only"
  on public.products for delete to authenticated
  using (public.is_admin());

-- 3.3 TRANSACTIONS: kasir hanya baca/buat miliknya sendiri; Admin penuh & verifikasi
drop policy if exists "transactions_select_own_or_admin" on public.transactions;
create policy "transactions_select_own_or_admin"
  on public.transactions for select to authenticated
  using (cashier_id = auth.uid() or public.is_admin());

drop policy if exists "transactions_insert_own_or_admin" on public.transactions;
create policy "transactions_insert_own_or_admin"
  on public.transactions for insert to authenticated
  with check (cashier_id = auth.uid() or public.is_admin());

drop policy if exists "transactions_update_admin_only" on public.transactions;
create policy "transactions_update_admin_only"
  on public.transactions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "transactions_delete_admin_only" on public.transactions;
create policy "transactions_delete_admin_only"
  on public.transactions for delete to authenticated
  using (public.is_admin());

-- 3.4 TRANSACTION_ITEMS: mengikuti hak akses transaksi induknya
drop policy if exists "transaction_items_select_by_parent" on public.transaction_items;
create policy "transaction_items_select_by_parent"
  on public.transaction_items for select to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.cashier_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "transaction_items_insert_by_parent" on public.transaction_items;
create policy "transaction_items_insert_by_parent"
  on public.transaction_items for insert to authenticated
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.cashier_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "transaction_items_update_admin_only" on public.transaction_items;
create policy "transaction_items_update_admin_only"
  on public.transaction_items for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "transaction_items_delete_admin_only" on public.transaction_items;
create policy "transaction_items_delete_admin_only"
  on public.transaction_items for delete to authenticated
  using (public.is_admin());

-- 3.5 QRIS_MUTATIONS: hanya Admin yang boleh mengelola & memverifikasi
drop policy if exists "qris_mutations_admin_only" on public.qris_mutations;
create policy "qris_mutations_admin_only"
  on public.qris_mutations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3.6 RECONCILIATIONS: kasir dapat melihat miliknya; hanya Admin memeriksa & mengubah
drop policy if exists "reconciliations_select_own_or_admin" on public.reconciliations;
create policy "reconciliations_select_own_or_admin"
  on public.reconciliations for select to authenticated
  using (cashier_id = auth.uid() or public.is_admin());

drop policy if exists "reconciliations_insert_admin_only" on public.reconciliations;
create policy "reconciliations_insert_admin_only"
  on public.reconciliations for insert to authenticated
  with check (public.is_admin());

drop policy if exists "reconciliations_update_admin_only" on public.reconciliations;
create policy "reconciliations_update_admin_only"
  on public.reconciliations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reconciliations_delete_admin_only" on public.reconciliations;
create policy "reconciliations_delete_admin_only"
  on public.reconciliations for delete to authenticated
  using (public.is_admin());

-- 3.7 SAW (Criteria, Evaluations, Details): baca terautentikasi untuk metrik, ubah hanya Admin
drop policy if exists "saw_criteria_select_authenticated" on public.saw_criteria;
create policy "saw_criteria_select_authenticated"
  on public.saw_criteria for select to authenticated
  using (true);

drop policy if exists "saw_criteria_admin_write" on public.saw_criteria;
create policy "saw_criteria_admin_write"
  on public.saw_criteria for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "saw_evaluations_admin_only" on public.saw_evaluations;
create policy "saw_evaluations_admin_only"
  on public.saw_evaluations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "saw_evaluation_details_admin_only" on public.saw_evaluation_details;
create policy "saw_evaluation_details_admin_only"
  on public.saw_evaluation_details for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3.8 C4.5 (Dataset, Training, Evaluasi, Prediksi): khusus Admin
drop policy if exists "c45_dataset_admin_only" on public.c45_dataset_records;
create policy "c45_dataset_admin_only"
  on public.c45_dataset_records for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "c45_training_runs_admin_only" on public.c45_training_runs;
create policy "c45_training_runs_admin_only"
  on public.c45_training_runs for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "c45_evaluations_admin_only" on public.c45_evaluations;
create policy "c45_evaluations_admin_only"
  on public.c45_evaluations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "c45_predictions_admin_only" on public.c45_predictions;
create policy "c45_predictions_admin_only"
  on public.c45_predictions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3.9 REPORTS: akses sesuai role (Kasir hanya laporan operasional miliknya; Admin penuh)
drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists "reports_insert_by_role" on public.reports;
create policy "reports_insert_by_role"
  on public.reports for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_admin()
      or report_type in (
        'Laporan Penjualan',
        'Laporan Penerimaan Kas',
        'Laporan QRIS',
        'Laporan Penutupan Kas Harian'
      )
    )
  );

drop policy if exists "reports_update_delete_admin_only" on public.reports;
drop policy if exists "reports_update_admin_only" on public.reports;
create policy "reports_update_admin_only"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reports_delete_admin_only" on public.reports;
create policy "reports_delete_admin_only"
  on public.reports for delete to authenticated
  using (public.is_admin());
`;

export const SUPABASE_DEMO_USERS_SQL = `-- ============================================================================
-- 4. PROSEDUR PEMBUATAN AKUN AUTH & SEED PROFIL DEMO YANG AMAN
-- CATATAN:
--   Cara terbaik (disarankan) adalah membuat ke-4 user melalui menu
--   Supabase Dashboard -> Authentication -> Users -> Add User (Auto Confirm),
--   lalu jalankan langkah UPDATE/UPSERT profil di bawah ini.
--   Script di bawah juga menautkan profil Admin, Gracia, Ferginia, dan Julio
--   berdasarkan email yang sudah terdaftar di auth.users.
--   (Segera ganti kata sandi awal di Dashboard Auth sebelum dipakai produksi.)
-- ============================================================================

-- Pastikan ke-4 user berikut sudah dibuat di Authentication -> Users terlebih dahulu:
-- 1) admin@dimsumme.local     (Role: admin)
-- 2) gracia@dimsumme.local    (Role: kasir, Shift Pagi)
-- 3) ferginia@dimsumme.local  (Role: kasir, Shift Siang)
-- 4) julio@dimsumme.local     (Role: kasir, Shift Sore)

do $$
declare
  v_admin_id uuid;
  v_gracia_id uuid;
  v_ferginia_id uuid;
  v_julio_id uuid;
begin
  select id into v_admin_id from auth.users where email = 'admin@dimsumme.local' limit 1;
  select id into v_gracia_id from auth.users where email = 'gracia@dimsumme.local' limit 1;
  select id into v_ferginia_id from auth.users where email = 'ferginia@dimsumme.local' limit 1;
  select id into v_julio_id from auth.users where email = 'julio@dimsumme.local' limit 1;

  if v_admin_id is not null then
    insert into public.profiles (id, full_name, email, role, shift, avatar_label, active)
    values (v_admin_id, 'Admin Dimsum Me', 'admin@dimsumme.local', 'admin', 'Manajemen Pusat', 'AD', true)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = 'admin',
      shift = excluded.shift,
      avatar_label = excluded.avatar_label,
      active = true;
  end if;

  if v_gracia_id is not null then
    insert into public.profiles (id, full_name, email, role, shift, avatar_label, active)
    values (v_gracia_id, 'Gracia', 'gracia@dimsumme.local', 'kasir', 'Shift Pagi (08:00–13:00)', 'GR', true)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = 'kasir',
      shift = excluded.shift,
      avatar_label = excluded.avatar_label,
      active = true;
  end if;

  if v_ferginia_id is not null then
    insert into public.profiles (id, full_name, email, role, shift, avatar_label, active)
    values (v_ferginia_id, 'Ferginia', 'ferginia@dimsumme.local', 'kasir', 'Shift Siang (13:00–17:30)', 'FG', true)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = 'kasir',
      shift = excluded.shift,
      avatar_label = excluded.avatar_label,
      active = true;
  end if;

  if v_julio_id is not null then
    insert into public.profiles (id, full_name, email, role, shift, avatar_label, active)
    values (v_julio_id, 'Julio', 'julio@dimsumme.local', 'kasir', 'Shift Sore (17:30–22:00)', 'JL', true)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = 'kasir',
      shift = excluded.shift,
      avatar_label = excluded.avatar_label,
      active = true;
  end if;
end $$;
`;

export const SUPABASE_SQL_BLUEPRINT = `${SUPABASE_SCHEMA_SQL}

${SUPABASE_SEED_SQL}

${SUPABASE_RLS_SQL}`;
