import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Users, Clock, Settings, LogOut, LayoutDashboard, CalendarOff } from 'lucide-react';

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
    { name: 'Leaves', path: '/leaves', icon: <CalendarOff size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-white flex flex-col border-r border-gray-800 shadow-xl">
        <div className="p-6 text-xl font-bold border-b border-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span>Ascentware</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path 
                  ? 'bg-primary text-white shadow' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 px-8 flex justify-between items-center z-10">
          <h1 className="text-xl font-semibold text-gray-800">
            {navItems.find((i) => i.path === location.pathname)?.name || 'Admin Portal'}
          </h1>
          <div className="text-sm font-medium px-4 py-2 bg-gray-100 rounded-full text-gray-600 border border-gray-200">
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
