-- Run only after creating the listed users in Supabase Auth.
-- ============================================================================
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
