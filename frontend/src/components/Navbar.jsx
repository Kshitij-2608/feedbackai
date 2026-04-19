import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, LayoutDashboard, Upload, MessageSquare, FileText, User, LogOut } from 'lucide-react';

import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { clearCurrentFlow } from '../lib/sessionStore';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/interview', label: 'Interview', icon: MessageSquare },
  { to: '/summary', label: 'Summary', icon: FileText },
  { to: '/account', label: 'Account', icon: User },
];

export default function Navbar({ theme, toggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    clearCurrentFlow();
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 glass-panel ghost-border-bottom">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center shadow-[0_0_16px_-2px] shadow-primary-dim/50">
          <Brain size={16} className="text-on-primary" />
        </div>
        <span className="font-headline font-bold text-lg text-on-surface tracking-tight">
          Feedback<span className="text-transparent bg-clip-text bg-primary-gradient">AI</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-1">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-label font-medium transition-all duration-200 ${
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle theme={theme} toggle={toggle} />
        {isAuthenticated ? (
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60 transition-all duration-200"
            >
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <span className="max-w-28 truncate">{user?.name || 'Account'}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold font-headline bg-surface-variant/20 text-primary ghost-border hover:bg-surface-high/40 transition-all duration-200"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold font-headline bg-primary-gradient text-on-primary shadow-[0_0_16px_-4px] shadow-primary-dim/50 hover:scale-[1.02] hover:shadow-[0_0_24px_-4px] hover:shadow-primary-dim/70 transition-all duration-200"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
