/**
 * Validated price/stock history rows.
 */
export async function insertHistory(client, row) {
  const { rows } = await client.query(
    `insert into price_history (
      product_id, run_id, price, currency, in_stock, stock_qty, raw_price, raw_stock
    ) values ($1, $2, $3, $4, $5, $6, $7, $8)
    returning *`,
    [
      row.productId,
      row.runId,
      row.price,
      row.currency,
      row.inStock,
      row.stockQty,
      row.rawPrice,
      row.rawStock,
    ]
  );
  return rows[0];
}

export async function listHistory(pool, productId, limit) {
  const { rows } = await pool.query(
    `select * from price_history
     where product_id = $1
     order by scraped_at asc
     limit $2`,
    [productId, limit]
  );
  return rows;
}
