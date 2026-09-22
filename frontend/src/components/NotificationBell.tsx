import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';
import type { AppNotification } from '../lib/types';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setNotifications(await api.notifications.list());
    } catch {
      // best-effort - a failed notification fetch shouldn't break the page
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = async (id: string) => {
    await api.notifications.markRead(id);
    load();
  };

  const markAllRead = async () => {
    await api.notifications.markAllRead();
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-secondary/70 hover:text-secondary hover:bg-surfaceHover transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface border border-borderBase rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-borderBase flex items-center justify-between">
            <h3 className="text-sm font-bold text-secondary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-borderBase">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-secondary/40">
                No notifications yet.
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && markRead(n.id)}
                className={`w-full text-left p-4 hover:bg-surfaceHover transition-colors ${
                  n.readAt ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-secondary">{n.title}</p>
                    <p className="text-xs text-secondary/60 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-secondary/40 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
