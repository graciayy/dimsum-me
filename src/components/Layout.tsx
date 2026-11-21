import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  GitFork,
  Layers,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ASSETS } from '../data/seedData';
import { PageId } from '../types';
import { formatRupiah } from '../utils/formatters';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'kasir'>;
}

const MENU_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, roles: ['admin', 'kasir'] },
  { id: 'transaksi', label: 'Transaksi', icon: ShoppingCart, roles: ['admin', 'kasir'] },
  { id: 'produk', label: 'Produk', icon: Package, roles: ['admin', 'kasir'] },
  { id: 'penerimaan-kas', label: 'Penerimaan Kas', icon: Wallet, roles: ['admin', 'kasir'] },
  { id: 'rekonsiliasi', label: 'Rekonsiliasi', icon: Layers, roles: ['admin', 'kasir'] },
  { id: 'analisis-saw', label: 'Analisis SAW', icon: BarChart3, roles: ['admin'] },
  { id: 'klasifikasi-c45', label: 'Klasifikasi C4.5', icon: GitFork, roles: ['admin'] },
  { id: 'laporan', label: 'Laporan', icon: FileText, roles: ['admin', 'kasir'] },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['admin', 'kasir'] },
  { id: 'profil', label: 'Profil', icon: User, roles: ['admin', 'kasir'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    isSupabaseMode,
    currentPage,
    setCurrentPage,
    currentUser,
    logout,
    switchRole,
    transactions,
    reports,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = currentUser?.role ?? 'admin';

  const pendingNotifications = useMemo(() => {
    const qrisPending = transactions.filter(
      (t) => t.paymentMethod === 'QRIS' && t.verificationStatus === 'Menunggu Verifikasi'
    );
    const mismatches = transactions.filter((t) => t.status === 'Tidak Sesuai');
    return {
      qrisPending,
      mismatches,
      total: qrisPending.length + mismatches.length,
    };
  }, [transactions]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { menus: [], txs: [], reps: [] };
    const menus = [...MENU_ITEMS, ...ACCOUNT_ITEMS].filter(
      (m) => m.roles.includes(role) && m.label.toLowerCase().includes(q)
    );
    const txs = transactions
      .filter(
        (t) =>
          t.invoiceNo.toLowerCase().includes(q) ||
          t.cashierName.toLowerCase().includes(q) ||
          t.items.some((i) => i.productName.toLowerCase().includes(q))
      )
      .slice(0, 4);
    const reps = reports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    );
    return { menus, txs, reps };
  }, [searchQuery, role, transactions, reports]);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div className="px-5 pt-5">
        {/* Brand Header matching reference */}
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className="mb-6 flex w-full flex-col items-center text-center focus:outline-none"
        >
          <img
            src={ASSETS.logo}
            alt="Dimsum Me Steamer Logo"
            className="h-16 w-16 rounded-2xl object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="mt-1 text-[23px] font-extrabold tracking-tight text-[#C93D22]">
            Dimsum Me
          </span>
          <span className="text-[11px] font-medium italic text-[#151923]">
            Dimsum &amp; Snack House
          </span>
        </button>

        {/* MENU Section */}
        <div className="mb-5">
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
            MENU
          </p>
          <nav aria-label="Menu Utama" className="space-y-1">
            {MENU_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FDECE7] font-semibold text-[#E85D3F]'
                      : 'font-medium text-[#374151] hover:bg-[#FCF8F5] hover:text-[#151923]'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-[#E85D3F]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ACCOUNT Section */}
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
            ACCOUNT
          </p>
          <nav aria-label="Akun" className="space-y-1">
            {ACCOUNT_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FDECE7] font-semibold text-[#E85D3F]'
                      : 'font-medium text-[#374151] hover:bg-[#FCF8F5] hover:text-[#151923]'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-[#E85D3F]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-medium text-[#374151] transition-colors hover:bg-red-50 hover:text-[#DC3C2B] whitespace-nowrap"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-[#6B7280]" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Dimsum Illustration matching reference */}
      <div className="mt-2 overflow-hidden pt-1">
        <img
          src={ASSETS.sidebarFooter}
          alt="Ilustrasi Dimsum Me"
          className="h-32 w-full object-contain object-bottom"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FCF8F5] text-[#151923]">
      {/* Fixed Desktop Sidebar (~258px) */}
      <aside className="hidden w-[258px] shrink-0 border-r border-[#F0E7E2] bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/35"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[264px] overflow-y-auto border-r border-[#F0E7E2] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu navigasi"
              className="absolute top-4 right-4 rounded-lg p-1.5 text-[#6B7280] hover:bg-[#FCF8F5]"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#F0E7E2] bg-[#FCF8F5]/95 px-5 py-3.5 backdrop-blur-sm lg:px-8">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-xl border border-[#F0E7E2] bg-white p-2 text-[#151923] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar */}
            <div className="relative w-full max-w-[360px]">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Cari menu, transaksi, atau laporan..."
                aria-label="Cari menu, transaksi, atau laporan"
                className="w-full rounded-xl border border-[#F0E7E2] bg-white py-2.5 pr-4 pl-10 text-[13px] text-[#151923] placeholder-[#9CA3AF] transition-colors focus:border-[#E85D3F] focus:outline-none"
              />
              {searchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 z-40 mt-2 w-full rounded-2xl border border-[#F0E7E2] bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#6B7280]">Hasil Pencarian</span>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-[11px] font-medium text-[#E85D3F]"
                    >
                      Tutup
                    </button>
                  </div>
                  {searchResults.menus.length === 0 &&
                  searchResults.txs.length === 0 &&
                  searchResults.reps.length === 0 ? (
                    <p className="py-2 text-xs text-[#6B7280]">Tidak ditemukan hasil yang cocok.</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {searchResults.menus.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleNavigate(m.id)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-[#FCF8F5]"
                        >
                          <span className="font-semibold text-[#151923]">{m.label}</span>
                          <span className="text-[11px] text-[#6B7280]">Halaman</span>
                        </button>
                      ))}
                      {searchResults.txs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleNavigate('penerimaan-kas')}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-[#FCF8F5]"
                        >
                          <span className="font-mono font-semibold text-[#151923]">
                            {t.invoiceNo} · {t.cashierName}
                          </span>
                          <span className="tabular-nums text-[#E85D3F]">
                            {formatRupiah(t.totalAmount)}
                          </span>
                        </button>
                      ))}
                      {searchResults.reps.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleNavigate('laporan')}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-[#FCF8F5]"
                        >
                          <span className="font-medium text-[#151923]">{r.title}</span>
                          <span className="text-[11px] text-[#6B7280]">Laporan</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                aria-label="Notifikasi verifikasi kas"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0E7E2] bg-white text-[#151923] transition-colors hover:bg-[#FAF2EE]"
              >
                <Bell className="h-[18px] w-[18px]" />
                {pendingNotifications.total > 0 && (
                  <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#E85D3F] ring-2 ring-white" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-[#F0E7E2] bg-white p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#151923]">Notifikasi Audit Kas</h4>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-[#6B7280] hover:text-[#151923]"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {pendingNotifications.qrisPending.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          handleNavigate('penerimaan-kas');
                        }}
                        className="flex w-full items-start justify-between rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-2.5 text-left hover:border-[#E85D3F]"
                      >
                        <div>
                          <p className="font-semibold text-[#151923]">
                            QRIS Menunggu Verifikasi · {tx.invoiceNo}
                          </p>
                          <p className="text-[#6B7280]">
                            {tx.cashierName} · {tx.time} WIB
                          </p>
                        </div>
                        <span className="tabular-nums font-bold text-[#E85D3F]">
                          {formatRupiah(tx.totalAmount)}
                        </span>
                      </button>
                    ))}
                    {pendingNotifications.mismatches.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          handleNavigate('rekonsiliasi');
                        }}
                        className="flex w-full items-start justify-between rounded-xl border border-red-100 bg-red-50/70 p-2.5 text-left hover:border-red-300"
                      >
                        <div>
                          <p className="font-semibold text-[#DC3C2B]">
                            Selisih / Ditolak · {tx.invoiceNo}
                          </p>
                          <p className="text-[#6B7280]">{tx.notes || 'Perlu pemeriksaan admin'}</p>
                        </div>
                        <span className="tabular-nums font-bold text-[#DC3C2B]">
                          {formatRupiah(tx.totalAmount)}
                        </span>
                      </button>
                    ))}
                    {pendingNotifications.total === 0 && (
                      <p className="py-3 text-center text-[#6B7280]">
                        Seluruh penerimaan kas hari ini sudah terverifikasi.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                aria-expanded={profileOpen}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F0E7E2] bg-[#FDECE7] text-xs font-bold text-[#C93D22]">
                  {currentUser?.avatarLabel ?? 'AD'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-semibold leading-tight text-[#151923] whitespace-nowrap">
                    {currentUser?.name ?? 'Admin Dimsum Me'}
                  </p>
                  <p className="text-[11px] leading-tight text-[#6B7280] whitespace-nowrap">
                    {currentUser?.email ?? 'admin@dimsumme.local'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#6B7280]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-[#F0E7E2] bg-white p-2 shadow-lg">
                  <div className="border-b border-[#F0E7E2] px-3 py-2">
                    <p className="text-xs font-bold text-[#151923]">{currentUser?.name}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      Role aktif: <span className="font-semibold uppercase text-[#E85D3F]">{role}</span>
                    </p>
                  </div>
                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        handleNavigate('profil');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#151923] hover:bg-[#FCF8F5]"
                    >
                      <User className="h-3.5 w-3.5 text-[#6B7280]" />
                      Profil Akun
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        handleNavigate('pengaturan');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#151923] hover:bg-[#FCF8F5]"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#6B7280]" />
                      Pengaturan Sistem
                    </button>
                    {!isSupabaseMode && (
                      <>
                        <div className="my-1 border-t border-[#F0E7E2]" />
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          Ganti Peran
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            switchRole('admin');
                            setProfileOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                            role === 'admin'
                              ? 'bg-[#FDECE7] font-semibold text-[#C93D22]'
                              : 'text-[#374151] hover:bg-[#FCF8F5]'
                          }`}
                        >
                          <span>Mode Admin</span>
                          {role === 'admin' && <span>Aktif</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            switchRole('kasir');
                            setProfileOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                            role === 'kasir'
                              ? 'bg-[#FDECE7] font-semibold text-[#C93D22]'
                              : 'text-[#374151] hover:bg-[#FCF8F5]'
                          }`}
                        >
                          <span>Mode Kasir</span>
                          {role === 'kasir' && <span>Aktif</span>}
                        </button>
                      </>
                    )}
                    <div className="my-1 border-t border-[#F0E7E2]" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#DC3C2B] hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Keluar (Logout)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
