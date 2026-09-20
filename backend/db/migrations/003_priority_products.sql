insert into products (external_id, name, url, scrape_interval_min, next_scrape_at)
values
  ('639', 'Vista Sandal Three', 'https://demo.inelabteamdev.com/product/639', 120, now()),
  ('876', 'Auralite Waterproof Boot XL', 'https://demo.inelabteamdev.com/product/876', 120, now()),
  ('714', 'Summit Approach Shoe S', 'https://demo.inelabteamdev.com/product/714', 120, now()),
  ('331', 'Vista Workstation Lite', 'https://demo.inelabteamdev.com/product/331', 120, now()),
  ('406', 'Summit Turntable Plus', 'https://demo.inelabteamdev.com/product/406', 120, now())
on conflict (external_id) do update set
  name = excluded.name,
  url = excluded.url,
  is_active = true,
  next_scrape_at = least(products.next_scrape_at, now());
