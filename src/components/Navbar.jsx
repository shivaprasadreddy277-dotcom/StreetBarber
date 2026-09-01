import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Scissors, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { settings } = useSettings();
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (anchor) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(anchor);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(anchor);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const dashboardUrl = role === 'owner' ? '/dashboard/owner' : '/dashboard/staff';

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-cream/90 shadow-md border-b border-navy/10 backdrop-blur-md py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-orange p-2 rounded-xl text-cream group-hover:rotate-12 transition-transform duration-300 shadow-sm">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-wider text-navy group-hover:text-orange transition-all duration-300">
              {settings?.shop_name?.toUpperCase() || 'STREET BARBER'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 font-display">
            <button
              onClick={() => handleNavClick('home')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('services')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Styles
            </button>
            <button
              onClick={() => handleNavClick('barbers')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Barbers
            </button>
            <button
              onClick={() => handleNavClick('gallery')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Gallery
            </button>
            <button
              onClick={() => handleNavClick('reviews')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Reviews
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="text-navy hover:text-orange font-bold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>

          {/* Desktop CTA/Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={dashboardUrl}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-navy/10 text-orange hover:bg-cream hover:border-orange/30 text-sm font-display font-bold transition-all duration-300 shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Console
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-white border border-navy/10 text-navy hover:text-orange hover:border-orange/30 transition-all duration-300 cursor-pointer shadow-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-navy/10 text-navy/80 hover:text-navy hover:border-navy/30 text-sm font-display font-semibold transition-all duration-300"
              >
                <User className="w-4 h-4" />
                Staff Portal
              </Link>
            )}

            <Link
              to="/book"
              className="px-6 py-2.5 rounded-xl bg-orange hover:bg-orange/90 text-white font-display font-black text-sm tracking-wide shadow-neon-blue hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              BOOK NOW
            </Link>
          </div>

          {/* Mobile hamburger icon */}
          <div className="md:hidden flex items-center gap-3">
            <Link
              to="/book"
              className="px-4 py-1.5 rounded-lg bg-orange text-white font-display font-black text-xs shadow-neon-blue"
            >
              BOOK
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-navy hover:text-orange p-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-0 top-[60px] bg-cream/95 backdrop-blur-lg border-t border-navy/10 transition-all duration-300 transform z-30 ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col p-6 gap-6 h-full justify-between pb-24">
          <div className="flex flex-col gap-4 text-lg font-display font-bold">
            <button
              onClick={() => handleNavClick('home')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('services')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Styles
            </button>
            <button
              onClick={() => handleNavClick('barbers')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Barbers
            </button>
            <button
              onClick={() => handleNavClick('gallery')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Gallery
            </button>
            <button
              onClick={() => handleNavClick('reviews')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Reviews
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="text-left text-navy hover:text-orange transition-colors cursor-pointer py-1.5"
            >
              Contact
            </button>
          </div>

          <div className="flex flex-col gap-4 border-t border-navy/10 pt-6">
            {user ? (
              <div className="flex flex-col gap-3">
                <Link
                  to={dashboardUrl}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-navy/10 text-orange font-display font-bold shadow-sm"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Console
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-navy/10 text-navy font-display font-bold cursor-pointer shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-navy/10 text-navy font-display font-bold"
              >
                <User className="w-5 h-5" />
                Staff Portal
              </Link>
            )}
            <Link
              to="/book"
              onClick={() => setIsOpen(false)}
              className="w-full py-3.5 rounded-xl bg-orange text-white font-display font-black text-center shadow-neon-blue"
            >
              BOOK APPOINTMENT
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
