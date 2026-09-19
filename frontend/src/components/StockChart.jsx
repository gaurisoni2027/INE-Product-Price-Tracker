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
  const data = history
    .map((h) => ({
      timestamp: new Date(h.scrapedAt).getTime(),
      stock: Number.isInteger(h.stockQty) ? h.stockQty : h.inStock ? 1 : 0,
      inStock: h.inStock,
    }))
    .filter((point) => Number.isFinite(point.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (data.length === 0) {
    return (
      <div className="chart-wrap">
        <h3>Stock history</h3>
        <p className="muted">A chart will appear after the first successful scrape.</p>
      </div>
    );
  }

  const maxStock = Math.max(...data.map((point) => point.stock));
  return (
    <div className="chart-wrap">
      <h3>Stock history</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            minTickGap={32}
          />
          <YAxis domain={[0, Math.max(maxStock, 1)]} allowDecimals={false} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value, _name, item) => [
              item.payload.inStock ? `${value} available` : 'Out of stock',
              'Stock',
            ]}
          />
          <Line
            type="stepAfter"
            dataKey="stock"
            stroke="#059669"
            dot={data.length === 1}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
