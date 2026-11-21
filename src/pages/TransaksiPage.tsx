import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { useApp } from '../context/AppContext';
import {
  PaymentMethod,
  Product,
  ProductCategory,
  Transaction,
  TransactionItem,
} from '../types';
import { formatRupiah } from '../utils/formatters';

function getCartItemKey(productId: string | null, selectedVariants?: string[]): string {
  const vKey = selectedVariants && selectedVariants.length > 0 ? selectedVariants.join('|') : '';
  return `${productId ?? 'deleted-product'}__${vKey}`;
}

export function TransaksiPage() {
  const { products, createTransaction } = useApp();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'Semua' | ProductCategory>('Semua');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [qrisRef, setQrisRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Variant picker modal state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [chosenVariants, setChosenVariants] = useState<string[]>([]);
  const [variantError, setVariantError] = useState<string | null>(null);

  // Produk nonaktif tidak tampil untuk transaksi baru
  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      if (category !== 'Semua' && p.category !== category) return false;
      if (
        search.trim() &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [products, category, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [cart]
  );

  const commitItemToCart = (product: Product, selectedVariants?: string[]) => {
    setErrorMsg(null);
    const targetKey = getCartItemKey(product.id, selectedVariants);

    setCart((prev) => {
      const existing = prev.find(
        (i) => getCartItemKey(i.productId, i.selectedVariants) === targetKey
      );
      if (existing) {
        return prev.map((i) =>
          getCartItemKey(i.productId, i.selectedVariants) === targetKey
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          qty: 1,
          unitPrice: product.price, // Harga diambil otomatis dari data produk
          image: product.image,
          selectedVariants,
        },
      ];
    });
  };

  const handleProductClick = (product: Product) => {
    if (product.variantOptions && product.variantOptions.length > 0) {
      setVariantProduct(product);
      const maxSel = product.maxVariantSelect || 1;
      setChosenVariants(
        maxSel >= product.variantOptions.length ? [...product.variantOptions] : []
      );
      setVariantError(null);
      return;
    }
    commitItemToCart(product);
  };

  const toggleVariantOption = (opt: string) => {
    if (!variantProduct) return;
    const maxSel = variantProduct.maxVariantSelect || variantProduct.variantOptions?.length || 1;
    setVariantError(null);
    setChosenVariants((prev) => {
      if (prev.includes(opt)) {
        return prev.filter((x) => x !== opt);
      }
      if (prev.length >= maxSel) {
        return [...prev.slice(1), opt];
      }
      return [...prev, opt];
    });
  };

  const confirmVariantAdd = () => {
    if (!variantProduct) return;
    const requiredCount = variantProduct.maxVariantSelect || 1;
    if (chosenVariants.length < requiredCount) {
      setVariantError(`Silakan pilih ${requiredCount} varian terlebih dahulu.`);
      return;
    }
    commitItemToCart(variantProduct, chosenVariants);
    setVariantProduct(null);
    setChosenVariants([]);
  };

  const updateQty = (itemKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          getCartItemKey(i.productId, i.selectedVariants) === itemKey
            ? { ...i, qty: i.qty + delta }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (itemKey: string) => {
    setCart((prev) =>
      prev.filter((i) => getCartItemKey(i.productId, i.selectedVariants) !== itemKey)
    );
  };

  const numericCash = parseInt(cashTendered.replace(/\D/g, ''), 10) || 0;
  const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, numericCash - subtotal) : 0;

  const handleSaveTransaction = () => {
    if (cart.length === 0) {
      setErrorMsg('Keranjang masih kosong. Pilih minimal satu produk dimsum.');
      return;
    }
    if (paymentMethod === 'Tunai' && numericCash > 0 && numericCash < subtotal) {
      setErrorMsg('Nominal uang tunai yang diterima kurang dari total pembayaran.');
      return;
    }

    const created = createTransaction({
      items: cart,
      paymentMethod,
      cashTendered: paymentMethod === 'Tunai' ? numericCash || subtotal : undefined,
      qrisRef: paymentMethod === 'QRIS' ? qrisRef : undefined,
      notes: notes.trim() || undefined,
    });

    setCart([]);
    setCashTendered('');
    setQrisRef('');
    setNotes('');
    setErrorMsg(null);
    setReceiptTx(created);
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">
            Transaksi Penjualan (POS)
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Left: Product Catalog */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#F0E7E2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu Dimsum Me (contoh: Mentai, Keju, Mix)..."
                aria-label="Cari produk"
                className="w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] py-2 pr-3 pl-9 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['Semua', 'Cemilan', 'Dimsum Goreng', 'Add On'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    category === cat
                      ? 'bg-[#E85D3F] text-white'
                      : 'bg-[#FCF8F5] text-[#6B7280] hover:bg-[#FDECE7] hover:text-[#C93D22]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {activeProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-3.5 shadow-[0_1px_2px_rgba(21,25,35,0.03)] transition-colors hover:border-[#F5A27F]"
              >
                <div>
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#FCF8F5]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[11px] font-medium text-[#6B7280]">{product.category}</p>
                  <h3 className="text-sm font-bold text-[#151923]">{product.name}</h3>
                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6B7280]">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#F0E7E2] pt-3">
                  <div>
                    <p className="tabular-nums text-sm font-bold text-[#C93D22]">
                      {formatRupiah(product.price)}
                    </p>
                    {product.variantOptions && product.variantOptions.length > 0 && (
                      <p className="text-[10.5px] font-medium text-[#6B7280]">
                        Pilih {product.maxVariantSelect} varian
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProductClick(product)}
                    aria-label={`Tambah ${product.name} ke keranjang`}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#FDECE7] px-3 py-2 text-xs font-semibold text-[#C93D22] transition-colors hover:bg-[#E85D3F] hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </button>
                </div>
              </div>
            ))}
          </div>
          {activeProducts.length === 0 && (
            <div className="rounded-2xl border border-[#F0E7E2] bg-white p-8 text-center text-xs text-[#6B7280]">
              Tidak ada produk aktif yang cocok dengan pencarian Anda.
            </div>
          )}
        </section>

        {/* Right: Cart & Payment */}
        <aside className="flex h-fit flex-col rounded-2xl border border-[#F0E7E2] bg-white p-5 shadow-[0_1px_3px_rgba(21,25,35,0.03)] lg:sticky lg:top-20">
          <div className="mb-4 flex items-center justify-between border-b border-[#F0E7E2] pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#E85D3F]" />
              <h2 className="text-base font-bold text-[#151923]">Keranjang Pesanan</h2>
            </div>
            <span className="tabular-nums text-xs font-semibold text-[#6B7280]">
              {cart.reduce((s, i) => s + i.qty, 0)} item
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs font-medium text-[#6B7280]">
                Belum ada item di keranjang. Klik tombol Tambah pada produk di sebelah kiri.
              </p>
            </div>
          ) : (
            <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
              {cart.map((item) => {
                const key = getCartItemKey(item.productId, item.selectedVariants);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#151923]">
                          {item.productName}
                        </p>
                        {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="truncate text-[10.5px] font-medium text-[#C93D22]">
                            Varian: {item.selectedVariants.join(', ')}
                          </p>
                        )}
                        <p className="tabular-nums text-[11px] text-[#6B7280]">
                          {formatRupiah(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(key, -1)}
                        aria-label={`Kurangi ${item.productName}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[#F0E7E2] bg-white text-[#151923] hover:bg-[#FAF2EE]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="tabular-nums w-6 text-center text-xs font-bold">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(key, 1)}
                        aria-label={`Tambah ${item.productName}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[#F0E7E2] bg-white text-[#151923] hover:bg-[#FAF2EE]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(key)}
                        aria-label={`Hapus ${item.productName}`}
                        className="ml-1 rounded-md p-1 text-[#DC3C2B] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subtotal & Total */}
          <div className="mt-4 space-y-2 border-t border-[#F0E7E2] pt-4 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-[#151923]">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#151923]">
              <span>Total Bayar</span>
              <span className="tabular-nums text-[#C93D22]" data-testid="pos-total">
                {formatRupiah(subtotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-4 space-y-3 border-t border-[#F0E7E2] pt-4">
            <p className="text-xs font-semibold text-[#151923]">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('Tunai')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                  paymentMethod === 'Tunai'
                    ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                    : 'border-[#F0E7E2] bg-white text-[#6B7280] hover:bg-[#FCF8F5]'
                }`}
              >
                <Banknote className="h-4 w-4" />
                Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                  paymentMethod === 'QRIS'
                    ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                    : 'border-[#F0E7E2] bg-white text-[#6B7280] hover:bg-[#FCF8F5]'
                }`}
              >
                <QrCode className="h-4 w-4" />
                QRIS
              </button>
            </div>

            {paymentMethod === 'Tunai' ? (
              <div className="space-y-2">
                <label className="block text-[11.5px] font-medium text-[#6B7280]">
                  Uang Tunai Diterima (Rp)
                  <input
                    type="number"
                    min={0}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={subtotal > 0 ? String(subtotal) : '0'}
                    className="tabular-nums mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashTendered(String(subtotal))}
                    className="rounded-lg border border-[#F0E7E2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#151923] hover:bg-[#FCF8F5]"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered('50000')}
                    className="rounded-lg border border-[#F0E7E2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#151923] hover:bg-[#FCF8F5]"
                  >
                    Rp 50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered('100000')}
                    className="rounded-lg border border-[#F0E7E2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#151923] hover:bg-[#FCF8F5]"
                  >
                    Rp 100.000
                  </button>
                </div>
                {numericCash >= subtotal && subtotal > 0 && (
                  <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#16A34A]">
                    <span>Kembalian</span>
                    <span className="tabular-nums">{formatRupiah(changeAmount)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11.5px] font-medium text-[#6B7280]">
                  Kode Referensi QRIS (opsional)
                  <input
                    type="text"
                    value={qrisRef}
                    onChange={(e) => setQrisRef(e.target.value)}
                    placeholder="Contoh: QRIS-DM-90888"
                    className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 font-mono text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                  />
                </label>
              </div>
            )}

            <label className="block text-[11.5px] font-medium text-[#6B7280]">
              Catatan Pesanan (opsional)
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Bungkus terpisah, sambal ekstra"
                className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
              />
            </label>

            {errorMsg && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-[#DC3C2B]"
              >
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveTransaction}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E85D3F] py-3 text-xs font-bold text-white transition-colors hover:bg-[#C93D22]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Simpan Transaksi &amp; Cetak Struk
            </button>
          </div>
        </aside>
      </div>

      {/* Modal Pemilihan Varian */}
      {variantProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variant-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#F0E7E2] bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 id="variant-modal-title" className="text-base font-bold text-[#151923]">
                  Pilih Varian · {variantProduct.name}
                </h3>
                <p className="text-xs text-[#6B7280]">{variantProduct.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                aria-label="Tutup modal varian"
                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#FCF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs font-semibold text-[#C93D22]">
              Pilih tepat {variantProduct.maxVariantSelect || 1} varian (
              {chosenVariants.length}/{variantProduct.maxVariantSelect || 1} dipilih):
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {(variantProduct.variantOptions ?? []).map((opt) => {
                const selected = chosenVariants.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleVariantOption(opt)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                        : 'border-[#F0E7E2] bg-[#FCF8F5] text-[#151923] hover:border-[#F5A27F]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {variantError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC3C2B]">
                {variantError}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setVariantProduct(null)}
                className="flex-1 rounded-xl border border-[#F0E7E2] bg-white py-2.5 text-xs font-semibold text-[#151923]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmVariantAdd}
                className="flex-1 rounded-xl bg-[#E85D3F] py-2.5 text-xs font-bold text-white hover:bg-[#C93D22]"
              >
                Masukkan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal transaction={receiptTx} onClose={() => setReceiptTx(null)} />
    </div>
  );
}
