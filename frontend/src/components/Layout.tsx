import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Clock,
  Settings,
  LogOut,
  LayoutDashboard,
  CalendarOff,
  FileText,
  UserCheck,
  Briefcase,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { clearToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { NotificationBell } from './NotificationBell';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

function NavLinks({
  navItems,
  activePath,
  onNavigate,
}: {
  navItems: NavItem[];
  activePath: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          onClick={onNavigate}
          className={`flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors ${
            activePath === item.path
              ? 'bg-primary text-white shadow-sm'
              : 'text-tertiary hover:bg-surfaceHover hover:text-secondary'
          }`}
        >
          {item.icon}
          <span>{item.name}</span>
        </Link>
      ))}
    </>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  // Nav is built from {role, isManager}, not a fixed list - anyone can be a manager
  // regardless of role (emergent from the reporting chain), and role/capability area
  // aren't 1:1 (an ADMIN is still a person who wants their own attendance history).
  const navItems: NavItem[] = [
    { name: 'My Dashboard', path: '/my', icon: <LayoutDashboard size={20} /> },
  ];
  if (user?.isManager) {
    navItems.push({ name: 'My Team', path: '/team', icon: <UserCheck size={20} /> });
  }
  if (user?.role === 'HR') {
    navItems.push({ name: 'HR View', path: '/hr', icon: <Briefcase size={20} /> });
  }
  if (user?.role === 'ADMIN') {
    navItems.push(
      { name: 'Overview', path: '/overview', icon: <Activity size={20} /> },
      { name: 'Employees', path: '/employees', icon: <Users size={20} /> },
      { name: 'Shifts', path: '/shifts', icon: <Clock size={20} /> },
      { name: 'Attendance', path: '/attendance', icon: <FileText size={20} /> },
      { name: 'Leaves', path: '/leaves', icon: <CalendarOff size={20} /> },
      { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    );
  }

  const activeName = navItems.find((i) => i.path === location.pathname)?.name || 'Ascentware';

  return (
    <div className="flex h-screen bg-background text-secondary font-sans">
      {/* Sidebar: desktop */}
      <div className="hidden md:flex w-64 bg-surface flex-col border-r border-borderBase shadow-sm">
        <div className="p-6 text-xl font-bold border-b border-borderBase flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="tracking-tight text-secondary">Ascentware</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks navItems={navItems} activePath={location.pathname} onNavigate={() => setMobileNavOpen(false)} />
        </nav>
        <div className="p-4 border-t border-borderBase">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-lg text-sm font-medium text-tertiary hover:bg-surfaceHover hover:text-secondary transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Sidebar: mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-64 bg-surface flex flex-col border-r border-borderBase shadow-2xl">
            <div className="p-6 border-b border-borderBase flex items-center justify-between">
              <span className="tracking-tight text-secondary font-bold text-xl">Ascentware</span>
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <X size={20} className="text-secondary/60" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <NavLinks navItems={navItems} activePath={location.pathname} onNavigate={() => setMobileNavOpen(false)} />
            </nav>
            <div className="p-4 border-t border-borderBase">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 p-3 w-full rounded-lg text-sm font-medium text-tertiary hover:bg-surfaceHover hover:text-secondary transition-colors"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-surface/80 backdrop-blur-md border-b border-borderBase p-4 px-4 md:px-8 flex justify-between items-center z-10 sticky top-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 -ml-2 text-secondary/70 hover:text-secondary"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-secondary tracking-tight truncate">
              {activeName}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />
            <div className="hidden sm:block text-sm font-medium px-4 py-2 bg-background rounded-full text-tertiary border border-borderBase truncate max-w-[180px]">
              {user?.name || user?.email}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
