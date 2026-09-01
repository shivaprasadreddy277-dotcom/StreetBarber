import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scissors, Lock, Mail, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully logged into Street Barber portal!');
      
      const lower = email.toLowerCase();
      if (lower === 'owner@streetbarber.com') {
        navigate('/dashboard/owner');
      } else {
        navigate('/dashboard/staff');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      {/* Simple Header */}
      <header className="py-6 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-tr from-electric-500 to-neonPurple-500 p-2 rounded-xl text-white">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-wider text-slate-900">
              STREET BARBER
            </span>
          </Link>
          <Link to="/" className="text-sm font-bold text-slate-500 hover:text-electric-500 transition-colors">
            Back to site
          </Link>
        </div>
      </header>

      {/* Main Form container */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative">
        <div className="absolute inset-0 bg-white opacity-20 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none"></div>

        <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl glass-panel">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-electric-500/10 text-electric-500 rounded-2xl mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-wide">STAFF PORTAL</h2>
            <p className="text-sm text-slate-500 mt-1">Provide secure credentials to enter the console.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="e.g. name@streetbarber.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 font-medium placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 font-medium placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-electric-500 to-neonPurple-500 text-white font-extrabold tracking-wide hover:shadow-neon-blue shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-t-white border-r-transparent border-b-white border-l-transparent animate-spin"></div>
                  SIGNING IN...
                </>
              ) : (
                'ENTER DASHBOARD'
              )}
            </button>
          </form>

          {/* Seed accounts helpful tip */}
          <div className="mt-8 border-t border-slate-100 pt-5 text-left text-xs text-slate-500">
            <div className="flex gap-2 items-start bg-slate-50 p-3.5 border border-slate-150 rounded-xl">
              <Sparkles className="w-4 h-4 text-electric-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700 mb-1">Development Tip (Seeded Logins):</p>
                <ul className="space-y-1 text-slate-500">
                  <li>• <span className="font-semibold text-slate-600">Owner:</span> owner@streetbarber.com</li>
                  <li>• <span className="font-semibold text-slate-600">Barbers:</span> barber1@streetbarber.com / barber2@streetbarber.com</li>
                  <li>• <span className="font-semibold text-slate-600">Password:</span> password123</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 font-medium border-t border-slate-200 bg-white">
        <p>© {new Date().getFullYear()} Street Barber platform. Internal Salon Tool.</p>
      </footer>
    </div>
  );
}
