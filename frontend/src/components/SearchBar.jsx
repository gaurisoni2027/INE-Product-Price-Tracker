/**
 * Controlled search input.
 */
export default function SearchBar({ value, onChange }) {
  return (
    <input
      className="search-input"
      type="search"
      placeholder="Search products by name…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search products"
    />
  );
}
