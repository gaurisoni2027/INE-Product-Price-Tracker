/**
 * In-stock step chart over time.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function StockChart({ history }) {
  const data = history.map((h) => ({
    t: new Date(h.scrapedAt).toLocaleString(),
    inStock: h.inStock ? 1 : 0,
    qty: h.stockQty ?? (h.inStock ? 1 : 0),
  }));
  return (
    <div className="chart-wrap">
      <h3>Stock (in stock = 1)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" hide />
          <YAxis domain={[0, 1]} ticks={[0, 1]} />
          <Tooltip />
          <Line
            type="stepAfter"
            dataKey="inStock"
            stroke="#059669"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
