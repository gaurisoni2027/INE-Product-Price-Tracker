/**
 * Tabular price/stock history.
 */
export default function HistoryTable({ history }) {
  return (
    <div className="table-wrap">
      <h3>History table</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Raw</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{new Date(h.scrapedAt).toLocaleString()}</td>
              <td>
                {h.currency} {h.price}
              </td>
              <td>{h.inStock ? h.stockQty ?? 'In stock' : 'Out of stock'}</td>
              <td className="muted">
                {h.rawPrice} / {h.rawStock}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
