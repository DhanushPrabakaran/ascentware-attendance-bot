import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Users, Clock, Settings, LogOut, LayoutDashboard, CalendarOff, FileText } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminEmail');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Employees', path: '/employees', icon: <Users size={20} /> },
    { name: 'Shifts', path: '/shifts', icon: <Clock size={20} /> },
    { name: 'Attendance', path: '/attendance', icon: <FileText size={20} /> },
    { name: 'Leaves', path: '/leaves', icon: <CalendarOff size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background text-secondary font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-surface flex flex-col border-r border-borderBase shadow-xl">
        <div className="p-6 text-xl font-bold border-b border-borderBase flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="tracking-tight text-secondary">Ascentware</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-tertiary hover:bg-surfaceHover hover:text-secondary'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-surface/80 backdrop-blur-md border-b border-borderBase p-4 px-8 flex justify-between items-center z-10 sticky top-0">
          <h1 className="text-xl font-semibold text-secondary tracking-tight">
            {navItems.find((i) => i.path === location.pathname)?.name || 'Admin Portal'}
          </h1>
          <div className="text-sm font-medium px-4 py-2 bg-background rounded-full text-tertiary border border-borderBase">
            {localStorage.getItem('adminEmail')}
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
