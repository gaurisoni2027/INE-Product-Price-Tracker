/**
 * App routes.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import SearchPage from './pages/SearchPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import { useServerWake } from './hooks/useServerWake.js';
import ServerWakeBanner from './components/ServerWakeBanner.jsx';

export default function App() {
  const wake = useServerWake();
  return (
    <Layout>
      <ServerWakeBanner active={!wake.ready} error={wake.error} />
      <Routes>
        <Route path="/" element={<SearchPage apiReady={wake.ready} />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
