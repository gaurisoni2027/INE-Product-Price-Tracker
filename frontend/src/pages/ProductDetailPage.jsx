/**
 * Charts, history, scrape log, manual scrape.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchHistory,
  fetchLogs,
  fetchProduct,
  scrapeNow,
} from '../api/endpoints.js';
import PriceChart from '../components/PriceChart.jsx';
import StockChart from '../components/StockChart.jsx';
import HistoryTable from '../components/HistoryTable.jsx';
import ScrapeLogTable from '../components/ScrapeLogTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function ProductDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [refreshingAfterScrape, setRefreshingAfterScrape] = useState(false);
  const productQ = useQuery({ queryKey: ['product', id], queryFn: () => fetchProduct(id) });
  const historyQ = useQuery({ queryKey: ['history', id], queryFn: () => fetchHistory(id) });
  const logsQ = useQuery({ queryKey: ['logs', id], queryFn: () => fetchLogs(id) });

  const scrapeMut = useMutation({
    mutationFn: () => scrapeNow(id),
    onSuccess: () => {
      // The API intentionally returns 202 while the browser scrape continues in the background.
      // Poll briefly so a successful manual run appears in the charts without a page reload.
      setRefreshingAfterScrape(true);
      qc.invalidateQueries({ queryKey: ['history', id] });
      qc.invalidateQueries({ queryKey: ['logs', id] });
      qc.invalidateQueries({ queryKey: ['product', id] });
    },
  });

  useEffect(() => {
    if (!refreshingAfterScrape) return undefined;
    const timer = setTimeout(() => setRefreshingAfterScrape(false), 60_000);
    return () => clearTimeout(timer);
  }, [refreshingAfterScrape]);

  useEffect(() => {
    if (!refreshingAfterScrape) return undefined;
    const timer = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['history', id] });
      qc.invalidateQueries({ queryKey: ['logs', id] });
      qc.invalidateQueries({ queryKey: ['product', id] });
    }, 5_000);
    return () => clearInterval(timer);
  }, [id, qc, refreshingAfterScrape]);

  if (productQ.isLoading) return <p>Loading…</p>;
  if (!productQ.data) {
    return (
      <p>
        Not found. <Link to="/dashboard">Back</Link>
      </p>
    );
  }

  const p = productQ.data;
  const history = historyQ.data?.history ?? [];

  return (
    <section>
      <p>
        <Link to="/dashboard">‹ Dashboard</Link>
      </p>
      <h1>{p.name}</h1>
      <p className="row">
        <StatusBadge outcome={p.lastRunOutcome} />
        <button type="button" onClick={() => scrapeMut.mutate()} disabled={scrapeMut.isPending}>
          Scrape now
        </button>
        {refreshingAfterScrape && <span className="muted">Refreshing results…</span>}
      </p>
      <PriceChart history={history} />
      <StockChart history={history} />
      <HistoryTable history={history} />
      <ScrapeLogTable runs={logsQ.data?.runs ?? []} />
    </section>
  );
}
