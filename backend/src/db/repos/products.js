/**
 * Data access for tracked products.
 */
export async function upsertProduct(client, row) {
  const { rows } = await client.query(
    `insert into products (external_id, name, url, image_url)
     values ($1, $2, $3, $4)
     on conflict (external_id) do update set
       name = excluded.name,
       url = excluded.url,
       image_url = coalesce(excluded.image_url, products.image_url)
     returning *`,
    [row.externalId, row.name, row.url, row.imageUrl ?? null]
  );
  return rows[0];
}

export async function listProducts(pool) {
  const { rows } = await pool.query(`
    select p.*,
      h.price as latest_price,
      h.currency as latest_currency,
      h.in_stock as latest_in_stock,
      h.stock_qty as latest_stock_qty,
      h.scraped_at as latest_scraped_at
    from products p
    left join lateral (
      select * from price_history ph
      where ph.product_id = p.id
      order by scraped_at desc
      limit 1
    ) h on true
    where p.is_active = true
    order by p.created_at desc
  `);
  return rows;
}

export async function getProductById(pool, id) {
  const { rows } = await pool.query('select * from products where id = $1', [id]);
  return rows[0] ?? null;
}

export async function getProductByExternalId(pool, externalId) {
  const { rows } = await pool.query(
    'select * from products where external_id = $1',
    [externalId]
  );
  return rows[0] ?? null;
}

export async function deleteProduct(pool, id) {
  await pool.query('delete from products where id = $1', [id]);
}

export async function updateProductAfterSuccess(client, productId) {
  await client.query(
    `update products set
      last_success_at = now(),
      last_run_outcome = 'success',
      consecutive_failures = 0
     where id = $1`,
    [productId]
  );
}

export async function updateProductAfterFailure(client, productId, errorType) {
  await client.query(
    `update products set
      last_run_outcome = 'failed',
      consecutive_failures = consecutive_failures + 1
     where id = $1`,
    [productId]
  );
}

export async function advanceNextScrapeAt(client, productId, intervalMin, scheduledFor) {
  const { rows } = await client.query(
    `update products set next_scrape_at = (
       select ts from (
         select generate_series(
           $3::timestamptz,
           now() + ($2 || ' minutes')::interval,
           ($2 || ' minutes')::interval
         ) as ts
       ) s
       where ts > now()
       order by ts
       limit 1
     )
     where id = $1
     returning next_scrape_at`,
    [productId, intervalMin, scheduledFor]
  );
  return rows[0]?.next_scrape_at;
}
