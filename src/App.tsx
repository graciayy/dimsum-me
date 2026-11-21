/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { AnalisisSawPage } from './pages/AnalisisSawPage';
import { DashboardPage } from './pages/DashboardPage';
import { KlasifikasiC45Page } from './pages/KlasifikasiC45Page';
import { LaporanPage } from './pages/LaporanPage';
import { LoginPage } from './pages/LoginPage';
import { PenerimaanKasPage } from './pages/PenerimaanKasPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { ProdukPage } from './pages/ProdukPage';
import { ProfilPage } from './pages/ProfilPage';
import { RekonsiliasiPage } from './pages/RekonsiliasiPage';
import { TransaksiPage } from './pages/TransaksiPage';

function AppRouter() {
  const { isSupabaseMode, authLoading, currentUser, currentPage, loginAsRole } = useApp();

  useEffect(() => {
    if (isSupabaseMode || authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !currentUser) {
      loginAsRole('admin');
    }
  }, [isSupabaseMode, authLoading, currentUser, loginAsRole]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCF8F5] text-xs font-semibold text-[#6B7280]">
        Memeriksa sesi autentikasi...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'transaksi':
        return <TransaksiPage />;
      case 'produk':
        return <ProdukPage />;
      case 'penerimaan-kas':
        return <PenerimaanKasPage />;
      case 'rekonsiliasi':
        return <RekonsiliasiPage />;
      case 'analisis-saw':
        return currentUser.role === 'admin' ? <AnalisisSawPage /> : <DashboardPage />;
      case 'klasifikasi-c45':
        return currentUser.role === 'admin' ? <KlasifikasiC45Page /> : <DashboardPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'pengaturan':
        return <PengaturanPage />;
      case 'profil':
        return <ProfilPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
