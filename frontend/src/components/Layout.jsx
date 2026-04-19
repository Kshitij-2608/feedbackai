import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const hideFooterOn = ['/interview', '/login'];

export default function Layout({ theme, toggle }) {
  const location = useLocation();
  const showFooter = !hideFooterOn.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Navbar theme={theme} toggle={toggle} />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
