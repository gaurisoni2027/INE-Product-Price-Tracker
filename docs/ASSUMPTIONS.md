# Assumptions (unverified or simplified)

- **Store search UI:** The mock storefront home page is paginated catalog only (`?page=`). There is no dedicated `/search?q=` endpoint. Backend search walks `/api/catalog` pages and filters `name` client-side (case-insensitive substring). Verified against JS bundle `qn()` and `rr()` components.
- **Invalid product IDs:** `/api/product/{id}` sometimes returns **429** instead of 404 under rate limiting; browser product pages show error UI instead of HTTP 404.
- **Product images:** Catalog items have no `imageUrl` in JSON; search results use `imageUrl: null` and the UI shows a category icon placeholder.
- **Quote API path:** Price/stock are loaded via obfuscated `fetch` chain in the SPA (not plain `/api/product` JSON). Scraper reads **rendered DOM** after "Reveal price" rather than reimplementing the token exchange.
- **Search result price:** Listing tiles do not show live prices; `priceText` in search API is omitted/`null` until the user opens the product page.
