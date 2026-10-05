import { useState, type ReactNode } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, matchPath } from 'react-router-dom';
import {
  Activity,
  CalendarOff,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { clearToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { NotificationBell } from './NotificationBell';
import { Avatar } from './ui/Page';

interface NavItem {
  name: string;
  path: string;
  icon: ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

function NavSections({ sections, onNavigate }: { sections: NavSection[]; onNavigate: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-tertiary/80">{section.title}</p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-tertiary hover:bg-surfaceHover hover:text-secondary'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
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

  // Built from {role, isManager}: anyone can be a manager (it comes from the reporting
  // chain), and an admin is still a person with their own attendance.
  const sections: NavSection[] = [
    { items: [{ name: 'My day', path: '/my', icon: <LayoutDashboard size={18} /> }] },
  ];
  if (user && (user.isManager || user.role === 'HR' || user.role === 'ADMIN')) {
    sections.push({
      title: 'Team',
      items: [
        { name: 'Today', path: '/today', icon: <Activity size={18} /> },
        { name: 'Work log', path: '/work-log', icon: <ClipboardList size={18} /> },
        { name: 'People', path: '/people', icon: <UsersRound size={18} /> },
        { name: 'Leave requests', path: '/leaves', icon: <CalendarOff size={18} /> },
      ],
    });
  }
  if (user?.role === 'ADMIN') {
    sections.push({
      title: 'Admin',
      items: [
        { name: 'Employees', path: '/employees', icon: <Users size={18} /> },
        { name: 'Shifts', path: '/shifts', icon: <Clock size={18} /> },
        { name: 'Groups & reminders', path: '/groups', icon: <MessagesSquare size={18} /> },
      ],
    });
  }

  const allItems = sections.flatMap((s) => s.items);
  const activeName =
    allItems.find((i) => i.path === location.pathname)?.name ??
    (matchPath('/employees/:id', location.pathname) ? 'Person' : 'Ascentware');

  const brand = (
    <div className="flex items-center gap-2.5">
      <img src="/ascentware-icon.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
      <span className="text-base font-bold tracking-tight text-secondary">Ascentware</span>
    </div>
  );

  const footer = (
    <div className="border-t border-borderBase p-3">
      {user && (
        <div className="mb-1 flex items-center gap-2.5 px-3 py-2">
          <Avatar name={user.name || user.email} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-secondary">{user.name}</p>
            <p className="truncate text-xs text-tertiary">{user.email}</p>
          </div>
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-surfaceHover hover:text-secondary"
      >
        <LogOut size={18} />
        <span>Log out</span>
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans text-secondary">
      {/* Sidebar: desktop */}
      <aside className="hidden w-60 flex-col border-r border-borderBase bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-borderBase px-5">{brand}</div>
        <NavSections sections={sections} onNavigate={() => setMobileNavOpen(false)} />
        {footer}
      </aside>

      {/* Sidebar: mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-secondary/30 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex w-64 flex-col border-r border-borderBase bg-surface shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-borderBase px-5">
              {brand}
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-tertiary hover:text-secondary">
                <X size={20} />
              </button>
            </div>
            <NavSections sections={sections} onNavigate={() => setMobileNavOpen(false)} />
            {footer}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-borderBase bg-surface/90 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="-ml-2 p-2 text-tertiary hover:text-secondary md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="truncate text-sm font-semibold text-secondary">{activeName}</h1>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
