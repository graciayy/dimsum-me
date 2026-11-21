import { useState } from 'react';
import { ArrowUpRight, Copy, Check, Database, Plus, RotateCcw, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ASSETS } from '../data/seedData';
import { SUPABASE_DEMO_USERS_SQL, SUPABASE_SQL_BLUEPRINT } from '../services/supabaseBlueprint';
import { ProductCategory } from '../types';
import { formatRupiah } from '../utils/formatters';

export function PengaturanPage() {
  const {
    isSupabaseMode,
    currentUser,
    products,
    addProduct,
    toggleProductActive,
    users,
    resetAppData,
    setCurrentPage,
  } = useApp();

  const [tab, setTab] = useState<'produk' | 'pengguna' | 'supabase'>('produk');
  const [sqlSection, setSqlSection] = useState<'blueprint' | 'demo'>('blueprint');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Cemilan');
  const [price, setPrice] = useState('45000');
  const [description, setDescription] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const defaultImage =
      category === 'Dimsum Goreng'
        ? ASSETS.dimsumGorengMentai
        : category === 'Add On'
          ? ASSETS.sausDimsum
          : ASSETS.dimsumMix;

    addProduct({
      name: name.trim(),
      category,
      price: Math.max(0, Number(price) || 0),
      description: description.trim() || `Menu resmi ${category} Dimsum Me Lippo Plaza.`,
      image: defaultImage,
      active: true,
    });
    setName('');
    setDescription('');
  };

  const activeSqlText =
    sqlSection === 'blueprint' ? SUPABASE_SQL_BLUEPRINT : SUPABASE_DEMO_USERS_SQL;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(activeSqlText);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">Pengaturan Sistem</h1>
        </div>

        <button
          type="button"
          onClick={resetAppData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#151923] hover:bg-[#FAF2EE]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isSupabaseMode ? 'Muat Ulang Data' : 'Pulihkan Data Awal'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#F0E7E2] pb-3">
        <button
          type="button"
          onClick={() => setTab('produk')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === 'produk'
              ? 'bg-[#E85D3F] text-white'
              : 'border border-[#F0E7E2] bg-white text-[#6B7280]'
          }`}
        >
          Kelola Produk
        </button>
        <button
          type="button"
          onClick={() => setTab('pengguna')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === 'pengguna'
              ? 'bg-[#E85D3F] text-white'
              : 'border border-[#F0E7E2] bg-white text-[#6B7280]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Pengguna &amp; Role
        </button>
        <button
          type="button"
          onClick={() => setTab('supabase')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === 'supabase'
              ? 'bg-[#E85D3F] text-white'
              : 'border border-[#F0E7E2] bg-white text-[#6B7280]'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          Skema Supabase &amp; RLS
        </button>
      </div>

      {tab === 'produk' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold text-[#151923]">
                Katalog Resmi Dimsum Me Lippo Plaza ({products.length} Produk)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('produk')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FDECE7] px-3.5 py-2 text-xs font-semibold text-[#C93D22] hover:bg-[#fbdad0]"
            >
              Buka Manajemen Produk
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isAdmin && (
            <form
              onSubmit={handleAddProduct}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 sm:grid-cols-6"
            >
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama produk baru..."
                className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs sm:col-span-2"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs"
              >
                <option value="Cemilan">Cemilan</option>
                <option value="Dimsum Goreng">Dimsum Goreng</option>
                <option value="Add On">Add On</option>
              </select>
              <input
                type="number"
                min={500}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Harga"
                className="tabular-nums rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E85D3F] px-4 py-2 text-xs font-bold text-white hover:bg-[#C93D22]"
              >
                <Plus className="h-4 w-4" />
                Tambah Cepat
              </button>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produk</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 text-right font-semibold">Harga</th>
                  <th className="px-4 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E7E2]">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="flex items-center gap-3 px-4 py-2.5 font-semibold text-[#151923]">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-9 w-9 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span>{p.name}</span>
                        {p.variantOptions && p.variantOptions.length > 0 && (
                          <p className="text-[10.5px] font-normal text-[#6B7280]">
                            Pilih {p.maxVariantSelect} varian: {p.variantOptions.join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{p.category}</td>
                    <td className="tabular-nums px-4 py-2.5 text-right font-semibold">
                      {formatRupiah(p.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => toggleProductActive(p.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            p.active
                              ? 'bg-emerald-50 text-[#16A34A]'
                              : 'bg-gray-100 text-[#6B7280]'
                          }`}
                        >
                          {p.active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      ) : (
                        <span
                          className={`text-[11px] font-semibold ${
                            p.active ? 'text-[#16A34A]' : 'text-[#6B7280]'
                          }`}
                        >
                          {p.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pengguna' && (
        <div className="overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Pengguna</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Shift Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-semibold text-[#151923]">{u.name}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-[#FDECE7] text-[#C93D22]'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.shift}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'supabase' && (
        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-[#151923]">
                Skema Basis Data PostgreSQL &amp; Row Level Security (RLS)
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSqlSection('blueprint');
                  setCopiedSql(false);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  sqlSection === 'blueprint'
                    ? 'bg-[#FDECE7] text-[#C93D22]'
                    : 'border border-[#F0E7E2] bg-white text-[#6B7280]'
                }`}
              >
                Skema SQL + Seed + RLS
              </button>
              <button
                type="button"
                onClick={() => {
                  setSqlSection('demo');
                  setCopiedSql(false);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  sqlSection === 'demo'
                    ? 'bg-[#FDECE7] text-[#C93D22]'
                    : 'border border-[#F0E7E2] bg-white text-[#6B7280]'
                }`}
              >
                Prosedur Akun Demo Auth
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-1.5 text-xs font-semibold text-[#151923]"
              >
                {copiedSql ? (
                  <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedSql ? 'Tersalin' : 'Salin SQL'}
              </button>
            </div>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded-xl bg-[#151923] p-4 font-mono text-[11px] leading-relaxed text-gray-100">
            {activeSqlText}
          </pre>
        </div>
      )}
    </div>
  );
}
