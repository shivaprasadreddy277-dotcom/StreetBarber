import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Scissors,
  LayoutDashboard,
  Calendar,
  Settings,
  Users,
  Image,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  Check,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';

export default function DashboardLayout({ children }) {
  const { profile, logout, role } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  // Define navigation tabs based on role
  const getNavItems = () => {
    if (role === 'owner') {
      return [
        { name: 'Dashboard', path: '/dashboard/owner?tab=stats', icon: LayoutDashboard },
        { name: 'Appointments', path: '/dashboard/owner?tab=appointments', icon: Calendar },
        { name: 'Services CRUD', path: '/dashboard/owner?tab=services', icon: Scissors },
        { name: 'Staff Management', path: '/dashboard/owner?tab=staff', icon: Users },
        { name: 'Gallery settings', path: '/dashboard/owner?tab=gallery', icon: Image },
        { name: 'Business settings', path: '/dashboard/owner?tab=settings', icon: Settings },
        { name: 'Staff View', path: '/dashboard/staff', icon: User },
      ];
    }
    return [
      { name: 'Dashboard', path: '/dashboard/staff?tab=overview', icon: LayoutDashboard },
      { name: 'My Schedule', path: '/dashboard/staff?tab=schedule', icon: Calendar },
    ];
  };

  const navItems = getNavItems();

  const isTabActive = (itemPath) => {
    const currentPath = location.pathname + location.search;
    
    // Exact match or prefix match for queries
    if (itemPath.includes('?')) {
      const [path, query] = itemPath.split('?');
      const tabName = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      return location.pathname === path && currentTab === tabName;
    }
    
    return location.pathname === itemPath;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 h-screen sticky top-0 z-20">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-electric-500 to-neonPurple-500 p-2 rounded-xl text-white">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-wider text-slate-900">
              {settings?.shop_name?.toUpperCase() || 'STREET BARBER'}
            </span>
          </div>

          {/* User Profile */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
              <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'} alt={profile?.name} className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-900 truncate leading-tight">{profile?.name || 'Stylist'}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-600 border border-electric-500/20 uppercase tracking-widest mt-1 inline-block">
                {role === 'owner' ? 'Owner / Admin' : 'Barber Staff'}
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5 flex-1">
            {navItems.map((item) => {
              const active = isTabActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    active
                      ? 'bg-electric-500/5 border-l-4 border-electric-500 text-electric-650'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-electric-500' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-coral-500 hover:bg-rose-500/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              {role === 'owner' ? 'Owner Administration' : 'Barber Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Realtime Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-electric-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse shadow-neon-blue/40">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden glass-panel py-2 animate-scale-up">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inbox Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-extrabold text-electric-500 hover:text-electric-655 uppercase cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-450 font-medium">
                          No notifications found.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer ${
                              !n.read ? 'bg-electric-500/5' : ''
                            }`}
                          >
                            <div className="mt-1">
                              {!n.read ? (
                                <span className="flex h-2 w-2 rounded-full bg-electric-500 animate-ping"></span>
                              ) : (
                                <Check className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-xs font-extrabold text-slate-900 tracking-wide">{n.title}</h5>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                              <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 mt-2">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Profile Image */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 pr-3.5 rounded-2xl">
              <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-200 border border-slate-300">
                <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-slate-600 truncate max-w-24">{profile?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE BODY VIEW PORT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 3. MOBILE MENU SLIDE OVER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}></div>

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full border-r border-slate-200 shadow-xl animate-slide-right p-6 z-10 justify-between">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-tr from-electric-500 to-neonPurple-500 p-2 rounded-xl text-white">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-base tracking-wider text-slate-900">
                    {settings?.shop_name || 'Street Barber'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profiles */}
              <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                  <img src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-none">{profile?.name}</h4>
                  <span className="text-[8px] font-black text-electric-500 mt-1 uppercase block tracking-wider">
                    {role}
                  </span>
                </div>
              </div>

              {/* Links */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isTabActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                        active
                          ? 'bg-electric-500/5 border-l-4 border-electric-500 text-electric-650'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-electric-500' : 'text-slate-450'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-500 hover:text-coral-500 hover:bg-rose-500/5 transition-all cursor-pointer border-t border-slate-100 pt-6"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
