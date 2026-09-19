/**
 * Price history line chart (no interpolation across gaps).
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

export default function PriceChart({ history }) {
  const data = history
    .map((h) => ({
      timestamp: new Date(h.scrapedAt).getTime(),
      price: Number(h.price),
      currency: h.currency,
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.price))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (data.length === 0) {
    return (
      <div className="chart-wrap">
        <h3>Price history</h3>
        <p className="muted">A chart will appear after the first successful scrape.</p>
      </div>
    );
  }

  const prices = data.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = Math.max((max - min) * 0.1, max * 0.01, 1);
  const currency = data.at(-1).currency || 'INR';
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency });

  return (
    <div className="chart-wrap">
      <h3>Price history</h3>
      <ResponsiveContainer width="100%" height={260}>
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
          <YAxis domain={[Math.max(0, min - padding), max + padding]} tickFormatter={(value) => money.format(value)} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value) => [money.format(Number(value)), 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            dot={data.length === 1}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
