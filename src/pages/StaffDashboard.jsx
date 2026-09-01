import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  User,
  Phone,
  Scissors,
  CheckCircle,
  Play,
  Check,
  XCircle,
  HelpCircle,
  Calendar,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { storageFallback } from '../utils/storageFallback';

// Components
import DashboardLayout from '../components/DashboardLayout';
import Dialog from '../components/Dialog';
import SkeletonLoader from '../components/SkeletonLoader';

export default function StaffDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0 });

  // Dialog states for status changes
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');

  // Availability state
  const [overrides, setOverrides] = useState([]);
  const [overridesLoading, setOverridesLoading] = useState(false);

  // New override form state
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newStatus, setNewStatus] = useState('unavailable');

  useEffect(() => {
    if (currentTab === 'overview') {
      loadTodayAppointments();
    } else if (currentTab === 'schedule') {
      loadAvailabilityOverrides();
    }
  }, [currentTab, profile]);

  // Load today's appointments and calculate dashboard stats
  const loadTodayAppointments = async () => {
    if (!profile) return;
    setLoading(true);

    const configured = import.meta.env.VITE_SUPABASE_URL && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY && 
                       !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                       !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

    if (!configured) {
      const todayStr = new Date().toISOString().split('T')[0];
      const local = storageFallback.getAppointments().filter(a => a.appointment_date === todayStr);
      const decorated = local.map(a => {
        const sObj = storageFallback.getServices().find(s => s.id === a.service_id);
        return {
          ...a,
          services: sObj ? { name: sObj.name, duration_minutes: sObj.duration_minutes } : { name: 'Grooming Cut', duration_minutes: 30 }
        };
      });
      setAppointments(decorated);
      calculateStats(decorated);
      setLoading(false);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch all appointments for today
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services ( name, duration_minutes )
        `)
        .eq('appointment_date', todayStr)
        .order('start_time', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to local storage list
        const local = storageFallback.getAppointments().filter(a => a.appointment_date === todayStr);
        const decorated = local.map(a => {
          const sObj = storageFallback.getServices().find(s => s.id === a.service_id);
          return {
            ...a,
            services: sObj ? { name: sObj.name, duration_minutes: sObj.duration_minutes } : { name: 'Grooming Cut', duration_minutes: 30 }
          };
        });
        setAppointments(decorated);
        calculateStats(decorated);
      } else {
        setAppointments(data);
        calculateStats(data);
        storageFallback.saveAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching today appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const pending = data.filter((a) => a.status === 'pending' || a.status === 'confirmed').length;
    const active = data.filter((a) => a.status === 'in_progress').length;
    const completed = data.filter((a) => a.status === 'completed').length;
    setStats({ total, pending, active, completed });
  };

  // Load availability overrides for the current staff member
  const loadAvailabilityOverrides = async () => {
    if (!profile) return;
    setOverridesLoading(true);

    const configured = import.meta.env.VITE_SUPABASE_URL && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY && 
                       !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                       !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

    if (!configured) {
      const localVal = localStorage.getItem(`sb_overrides_${profile.id}`);
      setOverrides(localVal ? JSON.parse(localVal) : []);
      setOverridesLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_id', profile.id)
        .order('date', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to local storage overrides simulation
        const localVal = localStorage.getItem(`sb_overrides_${profile.id}`);
        setOverrides(localVal ? JSON.parse(localVal) : []);
      } else {
        setOverrides(data);
        localStorage.setItem(`sb_overrides_${profile.id}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setOverridesLoading(false);
    }
  };

  // Trigger atomic claim RPC for unassigned bookings
  const handleAcceptAppointment = async (apptId) => {
    try {
      const { data, error } = await supabase.rpc('accept_appointment_secure', {
        p_appointment_id: apptId,
        p_barber_id: profile.id,
      });

      if (error) throw error;

      if (data) {
        toast.success('You have successfully accepted the booking!');
        loadTodayAppointments();
      } else {
        toast.error('Could not claim booking. Another barber might have accepted it first.');
        loadTodayAppointments();
      }
    } catch (err) {
      console.warn('Supabase offline or RPC missing. Securing locally...');
      const local = storageFallback.getAppointments();
      const updated = local.map(a => a.id === apptId ? { ...a, barber_id: profile.id, status: 'confirmed' } : a);
      storageFallback.saveAppointments(updated);
      toast.success('You have successfully accepted the booking! (Locally Synced)');
      loadTodayAppointments();
    }
  };

  // Prompt confirmation for important status changes
  const promptStatusChange = (appt, status) => {
    setSelectedAppt(appt);
    setTargetStatus(status);
    setDialogOpen(true);
  };

  // Perform appointment status updates
  const executeStatusChange = async () => {
    if (!selectedAppt || !targetStatus) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: targetStatus, updated_at: new Date() })
        .eq('id', selectedAppt.id);

      if (error) throw error;

      toast.success(`Appointment status updated to ${targetStatus.replace('_', ' ').toUpperCase()}`);
      setDialogOpen(false);
      loadTodayAppointments();
    } catch (err) {
      console.warn('Network issue or offline status change. Synced to local storage...');
      const local = storageFallback.getAppointments();
      const updated = local.map(a => a.id === selectedAppt.id ? { ...a, status: targetStatus, updated_at: new Date().toISOString() } : a);
      storageFallback.saveAppointments(updated);
      toast.success(`Appointment status updated to ${targetStatus.replace('_', ' ').toUpperCase()} (Locally Synced)`);
      setDialogOpen(false);
      loadTodayAppointments();
    }
  };

  // Handle adding a new availability override block
  const handleAddOverride = async (e) => {
    e.preventDefault();
    if (!newDate || !newStartTime || !newEndTime) {
      toast.error('Please complete all availability override fields.');
      return;
    }

    const payload = {
      staff_id: profile.id,
      date: newDate,
      start_time: newStartTime + ':00',
      end_time: newEndTime + ':00',
      availability_status: newStatus,
    };

    try {
      const { error } = await supabase.from('staff_availability').insert(payload);

      if (error) throw error;

      toast.success('Availability override updated successfully.');
      setNewDate('');
      loadAvailabilityOverrides();
    } catch (err) {
      const localVal = localStorage.getItem(`sb_overrides_${profile.id}`);
      const list = localVal ? JSON.parse(localVal) : [];
      const newOverride = { id: 'o-' + Math.random().toString(36).substring(2, 9), ...payload };
      const updated = [...list, newOverride];
      localStorage.setItem(`sb_overrides_${profile.id}`, JSON.stringify(updated));
      toast.success('Availability override saved locally.');
      setNewDate('');
      loadAvailabilityOverrides();
    }
  };

  // Handle removing an availability override block
  const handleDeleteOverride = async (id) => {
    try {
      const { error } = await supabase.from('staff_availability').delete().eq('id', id);

      if (error) throw error;

      toast.success('Availability override removed.');
      loadAvailabilityOverrides();
    } catch (err) {
      const localVal = localStorage.getItem(`sb_overrides_${profile.id}`);
      if (localVal) {
        const list = JSON.parse(localVal);
        const filtered = list.filter(o => o.id !== id);
        localStorage.setItem(`sb_overrides_${profile.id}`, JSON.stringify(filtered));
        toast.success('Availability override removed locally.');
      }
      loadAvailabilityOverrides();
    }
  };

  const getStatusBadge = (status) => {
    let classes = 'bg-slate-100 text-slate-500 border-slate-200';
    if (status === 'pending') classes = 'bg-amber-50 text-amber-650 border-amber-200';
    if (status === 'confirmed') classes = 'bg-sky-50 text-sky-600 border-sky-200';
    if (status === 'in_progress') classes = 'bg-orange-50 text-orange-600 border-orange-200';
    if (status === 'completed') classes = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (status === 'cancelled') classes = 'bg-rose-50 text-rose-600 border-rose-200';
    if (status === 'no_show') classes = 'bg-purple-50 text-purple-600 border-purple-200';

    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${classes}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout>
      {/* Dialog Confirmation */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={executeStatusChange}
        title="Confirm Status Change"
        message={`Are you sure you want to change this appointment status to ${targetStatus.replace('_', ' ').toUpperCase()}?`}
        confirmText="Yes, Update"
        variant={targetStatus === 'cancelled' || targetStatus === 'no_show' ? 'danger' : 'success'}
      />

      {/* TABS SELECTOR FOR MOBILE */}
      <div className="flex md:hidden border-b border-slate-200 mb-6 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setSearchParams({ tab: 'overview' })}
          className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all cursor-pointer ${
            currentTab === 'overview' ? 'bg-electric-500 text-white shadow-neon-blue' : 'text-slate-500'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'schedule' })}
          className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all cursor-pointer ${
            currentTab === 'schedule' ? 'bg-electric-500 text-white shadow-neon-blue' : 'text-slate-500'
          }`}
        >
          My Schedule
        </button>
      </div>

      {/* TAB CONTAINER: OVERVIEW */}
      {currentTab === 'overview' && (
        <div className="space-y-8 text-slate-800">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Jobs</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending</span>
              <p className="text-3xl font-black text-amber-500 mt-1">{stats.pending}</p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">In Progress</span>
              <p className="text-3xl font-black text-orange-500 mt-1">{stats.active}</p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed</span>
              <p className="text-3xl font-black text-emerald-600 mt-1">{stats.completed}</p>
            </div>
          </div>

          {/* Appointments Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Schedule timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 tracking-wide">Today's Appointments</h3>
                <span className="text-xs text-slate-400 font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>

              {loading ? (
                <SkeletonLoader type="list" count={3} />
              ) : appointments.filter(a => a.barber_id === profile?.id).length === 0 ? (
                <div className="p-10 text-center border border-dashed border-slate-200 rounded-3xl bg-white text-slate-450 font-semibold flex flex-col items-center">
                  <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                  No direct bookings scheduled for you today.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter((a) => a.barber_id === profile?.id)
                    .map((appt) => (
                      <div
                        key={appt.id}
                        className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between gap-4 border-neon-glow-hover transition-all duration-300"
                      >
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-electric-500/10 text-electric-650 flex flex-col items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                            <span className="text-[9px] font-black mt-0.5">{appt.services?.duration_minutes || 30}m</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h4 className="text-sm font-extrabold text-slate-900">{appt.customer_name}</h4>
                              {getStatusBadge(appt.status)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5 font-bold flex items-center gap-1 text-electric-500">
                              <Scissors className="w-3.5 h-3.5" />
                              {appt.services?.name}
                            </p>
                            {appt.notes && (
                              <div className="mt-3 text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                Note: "{appt.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status workflow triggers */}
                        <div className="flex sm:flex-col justify-between items-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Start Time</span>
                            <span className="text-base font-black text-slate-900 mt-0.5 block">{formatTime(appt.start_time)}</span>
                          </div>

                          <div className="flex gap-1.5 self-end">
                            {appt.status === 'pending' || appt.status === 'confirmed' ? (
                              <button
                                onClick={() => promptStatusChange(appt, 'in_progress')}
                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Start Cut
                              </button>
                            ) : appt.status === 'in_progress' ? (
                              <button
                                onClick={() => promptStatusChange(appt, 'completed')}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Complete
                              </button>
                            ) : null}

                            {appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'no_show' && (
                              <div className="relative group">
                                <button className="px-2 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-500 cursor-pointer">
                                  •••
                                </button>
                                <div className="absolute right-0 bottom-full mb-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 hidden group-hover:block z-20">
                                  <button
                                    onClick={() => promptStatusChange(appt, 'no_show')}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-purple-650 font-bold cursor-pointer"
                                  >
                                    Mark No Show
                                  </button>
                                  <button
                                    onClick={() => promptStatusChange(appt, 'cancelled')}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-rose-600 font-bold cursor-pointer"
                                  >
                                    Cancel Booking
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Unassigned Claim Panel */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 tracking-wide mb-4">Unassigned Bookings</h3>

              {loading ? (
                <SkeletonLoader type="card" count={2} />
              ) : appointments.filter(a => a.barber_id === null && a.status === 'pending').length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-3xl bg-white text-slate-400 text-xs font-semibold flex flex-col items-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500/80 mb-2" />
                  No unassigned jobs pending today.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter((a) => a.barber_id === null && a.status === 'pending')
                    .map((appt) => (
                      <div
                        key={appt.id}
                        className="p-4 bg-amber-50/20 border border-amber-200/50 rounded-3xl shadow-sm flex flex-col justify-between h-44 hover:border-amber-400 transition-colors"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatTime(appt.start_time)}</span>
                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">Unassigned</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-900 mt-2">{appt.customer_name}</h4>
                          <p className="text-xs text-slate-500 mt-1 font-bold flex items-center gap-1">
                            <Scissors className="w-3.5 h-3.5 text-electric-500" />
                            {appt.services?.name}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcceptAppointment(appt.id)}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Claim Booking
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTAINER: SCHEDULE */}
      {currentTab === 'schedule' && (
        <div className="space-y-8 text-slate-800">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">MY SCHEDULE MANAGER</h2>
            <p className="text-sm text-slate-500 mt-1">Configure date availability blocks and leave overrides.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Add override block form */}
            <form onSubmit={handleAddOverride} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Add Schedule Override</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Availability Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-electric-500 text-xs font-bold"
                >
                  <option value="unavailable">Unavailable (Block Bookings)</option>
                  <option value="available">Available (Force Shifts)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold tracking-wider uppercase rounded-xl transition-colors cursor-pointer"
              >
                Add Override Block
              </button>
            </form>

            {/* Right: override log table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 tracking-wide">Active Schedule Blocks</h3>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-650 uppercase">Date overrides</span>
              </div>

              {overridesLoading ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full border-2 border-t-electric-500 border-r-transparent border-b-neonPurple-500 border-l-transparent animate-spin"></div>
                </div>
              ) : overrides.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center">
                  <Calendar className="w-10 h-10 text-slate-300 mb-2 shrink-0" />
                  No custom blocks active on your account.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs font-medium">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <th className="p-4 pl-6">Date</th>
                        <th className="p-4">Time Interval</th>
                        <th className="p-4">Status Type</th>
                        <th className="p-4 pr-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overrides.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="p-4 pl-6 font-bold text-slate-900">{o.date}</td>
                          <td className="p-4 font-semibold text-slate-700">
                            {formatTime(o.start_time)} to {formatTime(o.end_time)}
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                              o.availability_status === 'unavailable'
                                ? 'bg-rose-50 text-rose-600 border-rose-250'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-250'
                            }`}>
                              {o.availability_status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => handleDeleteOverride(o.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Delete Block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
