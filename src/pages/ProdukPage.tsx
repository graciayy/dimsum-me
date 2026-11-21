import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ImagePlus,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ASSETS } from '../data/seedData';
import { Product, ProductCategory } from '../types';
import { formatRupiah } from '../utils/formatters';

const CATEGORIES: Array<'Semua' | ProductCategory> = [
  'Semua',
  'Cemilan',
  'Dimsum Goreng',
  'Add On',
];

const PRESET_IMAGES = [
  { label: 'Dimsum Mix', url: ASSETS.dimsumMix },
  { label: 'Dimsum Original', url: ASSETS.dimsumAyam },
  { label: 'Dimsum Udang', url: ASSETS.dimsumUdang },
  { label: 'Dimsum Saus Mentai', url: ASSETS.dimsumSausMentai },
  { label: 'Dimsum Mentai Keju', url: ASSETS.dimsumMentaiKeju },
  { label: 'Dimsum Saus Tartar', url: ASSETS.dimsumSausTartar },
  { label: 'Dimsum Mie Saus Mentai', url: ASSETS.dimsumMieMentai },
  { label: 'Dimsum Goreng Mentai', url: ASSETS.dimsumGorengMentai },
  { label: 'Dimsum Goreng Keju', url: ASSETS.dimsumGorengKeju },
  { label: 'Chili Oil', url: ASSETS.chiliOil },
  { label: 'Saus Dimsum', url: ASSETS.sausDimsum },
  { label: 'Air Mineral', url: ASSETS.airMineral },
];

export function ProdukPage() {
  const {
    currentUser,
    products,
    addProduct,
    updateProduct,
    toggleProductActive,
    deleteProduct,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [categoryFilter, setCategoryFilter] = useState<'Semua' | ProductCategory>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [search, setSearch] = useState('');

  // Add/Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Cemilan');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState(ASSETS.dimsumMix);
  const [formActive, setFormActive] = useState(true);
  const [formVariantsText, setFormVariantsText] = useState('');
  const [formMaxVariant, setFormMaxVariant] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'Semua' && p.category !== categoryFilter) return false;
      if (statusFilter === 'Aktif' && !p.active) return false;
      if (statusFilter === 'Nonaktif' && p.active) return false;
      if (
        search.trim() &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, search]);

  const countsByCategory = useMemo(() => {
    return {
      Semua: products.length,
      Cemilan: products.filter((p) => p.category === 'Cemilan').length,
      'Dimsum Goreng': products.filter((p) => p.category === 'Dimsum Goreng').length,
      'Add On': products.filter((p) => p.category === 'Add On').length,
    };
  }, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Cemilan');
    setFormPrice('');
    setFormDesc('');
    setFormImage(ASSETS.dimsumMix);
    setFormActive(true);
    setFormVariantsText('');
    setFormMaxVariant('0');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(String(product.price));
    setFormDesc(product.description);
    setFormImage(product.image);
    setFormActive(product.active);
    setFormVariantsText((product.variantOptions ?? []).join(', '));
    setFormMaxVariant(String(product.maxVariantSelect ?? 0));
    setFormError(null);
    setModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Ukuran foto maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormImage(reader.result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    const numericPrice = Number(formPrice);
    if (!trimmedName) {
      setFormError('Nama produk wajib diisi.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setFormError('Harga produk harus berupa angka lebih dari 0.');
      return;
    }

    const parsedVariants = formVariantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const maxSel = Math.max(0, Math.min(parsedVariants.length, Number(formMaxVariant) || 0));

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: trimmedName,
        category: formCategory,
        price: numericPrice,
        description: formDesc.trim(),
        image: formImage,
        active: formActive,
        variantOptions: parsedVariants,
        maxVariantSelect: maxSel,
      });
    } else {
      addProduct({
        name: trimmedName,
        category: formCategory,
        price: numericPrice,
        description: formDesc.trim(),
        image: formImage,
        active: formActive,
        variantOptions: parsedVariants,
        maxVariantSelect: maxSel,
      });
    }

    setModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">
            Manajemen Produk
          </h1>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E85D3F] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#C93D22] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        )}
      </div>

      {/* Category Filter Buttons & Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori produk">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#E85D3F] text-white'
                  : 'border border-[#F0E7E2] bg-[#FCF8F5] text-[#374151] hover:bg-[#FDECE7] hover:text-[#C93D22]'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10.5px] ${
                  categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280]'
                }`}
              >
                {countsByCategory[cat]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[230px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk..."
              aria-label="Cari nama produk"
              className="w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 pr-3 pl-9 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Semua' | 'Aktif' | 'Nonaktif')}
            aria-label="Filter status produk"
            className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923] focus:border-[#E85D3F] focus:outline-none"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="overflow-hidden rounded-2xl border border-[#F0E7E2] bg-white shadow-[0_1px_3px_rgba(21,25,35,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Deskripsi &amp; Varian</th>
                <th className="px-4 py-3 text-right font-semibold">Harga</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[#FCF8F5]/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-12 w-12 shrink-0 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-bold text-[#151923]">{product.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#374151] whitespace-nowrap">
                      {product.category}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="line-clamp-2 text-[#6B7280]">
                      {product.description || '-'}
                    </p>
                    {product.variantOptions && product.variantOptions.length > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-[#C93D22]">
                        Varian (pilih {product.maxVariantSelect}): {product.variantOptions.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right font-bold text-[#151923] whitespace-nowrap">
                    {formatRupiah(product.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        product.active
                          ? 'bg-emerald-50 text-[#16A34A]'
                          : 'bg-gray-100 text-[#6B7280]'
                      }`}
                    >
                      {product.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          aria-label={`Edit ${product.name}`}
                          className="rounded-lg border border-[#F0E7E2] bg-white p-1.5 text-[#151923] hover:border-[#E85D3F] hover:text-[#C93D22]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProductActive(product.id)}
                          aria-label={
                            product.active
                              ? `Nonaktifkan ${product.name}`
                              : `Aktifkan ${product.name}`
                          }
                          title={product.active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
                          className={`rounded-lg border p-1.5 ${
                            product.active
                              ? 'border-[#F0E7E2] bg-white text-[#D97706] hover:bg-amber-50'
                              : 'border-emerald-200 bg-emerald-50 text-[#16A34A]'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Hapus ${product.name}`}
                          className="rounded-lg border border-[#F0E7E2] bg-white p-1.5 text-[#DC3C2B] hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-[#6B7280]">
                    Tidak ada produk yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="product-modal-title" className="text-base font-bold text-[#151923]">
                {editingProduct ? `Edit Produk · ${editingProduct.name}` : 'Tambah Produk Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal produk"
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#FCF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <label className="block font-medium text-[#6B7280]">
                Nama Produk
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 font-semibold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block font-medium text-[#6B7280]">
                  Kategori
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 font-semibold text-[#151923]"
                  >
                    <option value="Cemilan">Cemilan</option>
                    <option value="Dimsum Goreng">Dimsum Goreng</option>
                    <option value="Add On">Add On</option>
                  </select>
                </label>

                <label className="block font-medium text-[#6B7280]">
                  Harga Numerik (Rp)
                  <input
                    type="number"
                    min={500}
                    step={500}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="tabular-nums mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 font-semibold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                  />
                </label>
              </div>

              <label className="block font-medium text-[#6B7280]">
                Deskripsi Produk
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                />
              </label>

              {/* Foto Upload & Preset */}
              <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
                <p className="mb-2 font-semibold text-[#151923]">Foto Produk</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img
                    src={formImage}
                    alt="Preview produk"
                    className="h-16 w-16 shrink-0 rounded-xl border border-[#F0E7E2] bg-white object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#F0E7E2] bg-white px-3 py-1.5 font-semibold text-[#151923] hover:border-[#E85D3F]">
                      <ImagePlus className="h-3.5 w-3.5 text-[#E85D3F]" />
                      Upload Foto Baru
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <select
                      value={PRESET_IMAGES.some((i) => i.url === formImage) ? formImage : ''}
                      onChange={(e) => e.target.value && setFormImage(e.target.value)}
                      aria-label="Pilih preset foto produk"
                      className="block w-full rounded-lg border border-[#F0E7E2] bg-white px-2.5 py-1.5 text-[11px] text-[#374151]"
                    >
                      <option value="">Atau pilih preset thumbnail...</option>
                      {PRESET_IMAGES.map((img) => (
                        <option key={img.label} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Konfigurasi Varian */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block font-medium text-[#6B7280] sm:col-span-2">
                  Pilihan Varian (pisahkan koma, opsional)
                  <input
                    type="text"
                    value={formVariantsText}
                    onChange={(e) => setFormVariantsText(e.target.value)}
                    placeholder="Contoh: Mentai, Mentai Keju, Tartar, Mozzarella"
                    className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-[#151923]"
                  />
                </label>
                <label className="block font-medium text-[#6B7280]">
                  Maks Pilih Varian
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formMaxVariant}
                    onChange={(e) => setFormMaxVariant(e.target.value)}
                    className="tabular-nums mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-[#151923]"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-2 font-semibold text-[#151923]">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-4 w-4 accent-[#E85D3F]"
                  />
                  Produk Aktif (tampil di POS)
                </label>
              </div>

              {formError && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[#DC3C2B]">
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#F0E7E2] bg-white py-2.5 font-semibold text-[#151923] hover:bg-[#FCF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E85D3F] py-2.5 font-bold text-white hover:bg-[#C93D22]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#151923]">Hapus Produk?</h3>
            <p className="mt-1.5 text-xs text-[#6B7280]">
              Produk <strong>{deleteTarget.name}</strong> akan dihapus dari katalog aktif. Riwayat
              transaksi sebelumnya tetap aman tersimpan.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-[#F0E7E2] bg-white py-2 text-xs font-semibold text-[#151923]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 rounded-xl bg-[#DC3C2B] py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
