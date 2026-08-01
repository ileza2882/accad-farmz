import React, { useState, useEffect } from 'react';
import { User, NotificationItem } from '../types';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/insforge';
import { Bell, CheckCheck, Clock, Info, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface NotificationsPageProps {
  user: User;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const items = await getNotifications(user.email);
      setNotifications(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    fetchNotifs();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(user.email);
    fetchNotifs();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">In-App Notifications</h1>
            <p className="text-xs text-slate-500 font-medium">Real-time alerts for farm log submissions, approvals, and user updates</p>
          </div>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3">
          <Bell className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Notifications</h3>
          <p className="text-xs text-slate-400">You have no unread or recent activity alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-4 ${
                !n.read 
                  ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' 
                  : 'bg-white border-slate-200 opacity-80'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                n.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                n.type === 'error' ? 'bg-rose-100 text-rose-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {n.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                 n.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900">{n.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2"></span>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
