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
  const [showScrapeLog, setShowScrapeLog] = useState(false);
  const productQ = useQuery({ queryKey: ['product', id], queryFn: () => fetchProduct(id) });
  const historyQ = useQuery({ queryKey: ['history', id], queryFn: () => fetchHistory(id) });
  const logsQ = useQuery({
    queryKey: ['logs', id],
    queryFn: () => fetchLogs(id),
    enabled: showScrapeLog,
  });

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
      <section className="product-summary" aria-label="Tracked product details">
        <div><span>Store product ID</span><strong>{p.externalId}</strong></div>
        <div><span>Scrape schedule</span><strong>Every {p.scrapeIntervalMin} minutes</strong></div>
        <div><span>Last successful scrape</span><strong>{p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString() : 'Not yet'}</strong></div>
        <div><span>Next scheduled scrape</span><strong>{p.nextScrapeAt ? new Date(p.nextScrapeAt).toLocaleString() : 'Pending'}</strong></div>
        <div><span>Consecutive failures</span><strong>{p.consecutiveFailures}</strong></div>
        <div><span>Store page</span><a href={p.url} target="_blank" rel="noreferrer">Open storefront ↗</a></div>
      </section>
      <PriceChart history={history} />
      <StockChart history={history} />
      <HistoryTable history={history} />
      <section className="log-panel">
        <button type="button" onClick={() => setShowScrapeLog((visible) => !visible)}>
          {showScrapeLog ? 'Hide scrape log' : 'Show scrape log'}
        </button>
        {showScrapeLog && (logsQ.isLoading ? <p className="muted">Loading scrape log…</p> : <ScrapeLogTable runs={logsQ.data?.runs ?? []} />)}
      </section>
    </section>
  );
}
