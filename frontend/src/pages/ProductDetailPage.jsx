/**
 * Charts, history, scrape log, manual scrape.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const productQ = useQuery({ queryKey: ['product', id], queryFn: () => fetchProduct(id) });
  const historyQ = useQuery({ queryKey: ['history', id], queryFn: () => fetchHistory(id) });
  const logsQ = useQuery({ queryKey: ['logs', id], queryFn: () => fetchLogs(id) });

  const scrapeMut = useMutation({
    mutationFn: () => scrapeNow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history', id] });
      qc.invalidateQueries({ queryKey: ['logs', id] });
      qc.invalidateQueries({ queryKey: ['product', id] });
    },
  });

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
      </p>
      <PriceChart history={history} />
      <StockChart history={history} />
      <HistoryTable history={history} />
      <ScrapeLogTable runs={logsQ.data?.runs ?? []} />
    </section>
  );
}
