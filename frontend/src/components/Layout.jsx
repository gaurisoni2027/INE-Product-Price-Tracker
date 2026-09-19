/**
 * Shell layout with nav links.
 */
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const loc = useLocation();
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          INE Price Tracker
        </Link>
        <nav>
          <Link className={loc.pathname === '/' ? 'active' : ''} to="/">
            Search
          </Link>
          <Link className={loc.pathname.startsWith('/dashboard') ? 'active' : ''} to="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
