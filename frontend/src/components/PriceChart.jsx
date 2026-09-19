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
  const data = history.map((h) => ({
    t: new Date(h.scrapedAt).toLocaleString(),
    price: Number(h.price),
  }));
  return (
    <div className="chart-wrap">
      <h3>Price history</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#2563eb" dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
