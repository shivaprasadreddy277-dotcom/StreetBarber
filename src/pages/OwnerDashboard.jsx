import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Scissors,
  Users,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Save,
  Lock,
  Unlock,
  Upload,
  BarChart2
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { storageFallback } from '../utils/storageFallback';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const toast = useToast();
  const { refreshSettings } = useSettings();

  // Active sub-navigation tabs
  const [activeTab, setActiveTab] = useState('stats');

  // Stats / Analytics state
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    revenueByService: [],
    appointmentTrends: []
  });

  // Services CRUD state
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: 30,
    image_url: '',
    active: true
  });

  // Staff Management state
  const [staff, setStaff] = useState([]);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    speciality: '',
    avatar_url: '',
    role: 'staff',
    active: true
  });

  // Appointments master register
  const [appointments, setAppointments] = useState([]);
  const [apptFilter, setApptFilter] = useState('all');

  // Gallery CRUD state
  const [gallery, setGallery] = useState([]);
  const [galleryCaption, setGalleryCaption] = useState('');
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Business settings state
  const [shopSettings, setShopSettings] = useState({
    shop_name: 'Street Barber',
    phone: '',
    whatsapp: '',
    address: '',
    map_url: '',
    instagram: '',
    booking_enabled: true
  });
  const [shopHours, setShopHours] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    const configured = import.meta.env.VITE_SUPABASE_URL && 
                       import.meta.env.VITE_SUPABASE_ANON_KEY && 
                       !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                       !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
                       
    if (!configured) {
      const apptsLocal = storageFallback.getAppointments();
      const sLocal = storageFallback.getServices();
      const bLocal = storageFallback.getBarbers();
      const gLocal = storageFallback.getGallery();
      const hLocal = storageFallback.getHours();
      
      const decorated = apptsLocal.map(a => {
        const sObj = sLocal.find(s => s.id === a.service_id);
        const bObj = bLocal.find(b => b.id === a.barber_id);
        return {
          ...a,
          services: sObj ? { name: sObj.name, price: sObj.price } : { name: 'Custom Fade', price: a.booked_price },
          profiles: bObj ? { name: bObj.name } : { name: 'Any Stylist' }
        };
      });
      
      setAppointments(decorated);
      setServices(sLocal);
      setStaff(bLocal);
      setGallery(gLocal);
      setShopHours(hLocal);
      calculateAnalytics(decorated, sLocal);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch appointments
      const { data: apptData, error: apptErr } = await supabase
        .from('appointments')
        .select(`
          *,
          services (name, price),
          profiles (name)
        `)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      let finalAppts = [];
      if (apptErr || !apptData) {
        // Fallback to local storage list
        const local = storageFallback.getAppointments();
        // Decorate with mocked relation descriptors
        const decorated = local.map(a => {
          const sObj = storageFallback.getServices().find(s => s.id === a.service_id);
          const bObj = storageFallback.getBarbers().find(b => b.id === a.barber_id);
          return {
            ...a,
            services: sObj ? { name: sObj.name, price: sObj.price } : { name: 'Custom Fade', price: a.booked_price },
            profiles: bObj ? { name: bObj.name } : { name: 'Any Stylist' }
          };
        });
        setAppointments(decorated);
        finalAppts = decorated;
      } else {
        setAppointments(apptData);
        finalAppts = apptData;
        storageFallback.saveAppointments(apptData);
      }

      // 2. Fetch services list
      const { data: servData, error: servErr } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      let finalServices = [];
      if (servErr || !servData) {
        const local = storageFallback.getServices();
        setServices(local);
        finalServices = local;
      } else {
        setServices(servData);
        finalServices = servData;
        storageFallback.saveServices(servData);
      }

      // 3. Fetch staff list
      const { data: stfData, error: stfErr } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['owner', 'staff']);

      let finalStaff = [];
      if (stfErr || !stfData) {
        const local = storageFallback.getBarbers();
        setStaff(local);
        finalStaff = local;
      } else {
        setStaff(stfData);
        finalStaff = stfData;
        storageFallback.saveBarbers(stfData);
      }

      // 4. Fetch gallery list
      const { data: galData, error: galErr } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (galErr || !galData) {
        setGallery(storageFallback.getGallery());
      } else {
        setGallery(galData);
        storageFallback.saveGallery(galData);
      }

      // 5. Fetch settings
      const { data: settingsData } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (settingsData) {
        setShopSettings(settingsData);
        storageFallback.saveSettings(settingsData);
      } else {
        setShopSettings(storageFallback.getSettings());
      }

      // 6. Fetch hours
      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (hoursData && hoursData.length > 0) {
        setShopHours(hoursData);
        storageFallback.saveHours(hoursData);
      } else {
        setShopHours(storageFallback.getHours());
      }

      // 7. Calculate Analytics
      calculateAnalytics(finalAppts, finalServices);
    } catch (err) {
      console.error('Error loading admin details:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (appts, servs) => {
    const completed = appts.filter(a => a.status === 'completed');
    const pending = appts.filter(a => a.status === 'pending' || a.status === 'confirmed');
    
    const revenue = completed.reduce((sum, a) => sum + parseFloat(a.booked_price || 0), 0);

    // Group revenue by service
    const serviceMap = {};
    completed.forEach(a => {
      const sName = a.services?.name || 'Uncategorized';
      serviceMap[sName] = (serviceMap[sName] || 0) + parseFloat(a.booked_price || 0);
    });

    const revenueByService = Object.keys(serviceMap).map(name => ({
      name,
      value: serviceMap[name]
    }));

    setAnalytics({
      totalRevenue: revenue,
      totalAppointments: appts.length,
      pendingAppointments: pending.length,
      completedAppointments: completed.length,
      revenueByService,
      appointmentTrends: []
    });
  };

  // SERVICES TAB HANDLERS (Admin CRUD price & menu)
  const handleSaveService = async (e) => {
    e.preventDefault();
    const servicePayload = {
      name: serviceFormData.name,
      description: serviceFormData.description,
      price: parseFloat(serviceFormData.price),
      duration_minutes: parseInt(serviceFormData.duration_minutes),
      image_url: serviceFormData.image_url,
      active: serviceFormData.active
    };

    try {
      if (editingService) {
        // UPDATE existing service
        const { data, error } = await supabase
          .from('services')
          .update(servicePayload)
          .eq('id', editingService.id)
          .select();

        if (error) throw error;
        toast.success('Service updated successfully.');
      } else {
        // CREATE new service
        const { data, error } = await supabase
          .from('services')
          .insert([servicePayload])
          .select();

        if (error) throw error;
        toast.success('New service created successfully.');
      }
    } catch (err) {
      console.warn('Supabase offline or permission denied. Persisting to localStorage fallback instead...');
      // LocalStorage Simulation
      const localList = storageFallback.getServices();
      if (editingService) {
        const updated = localList.map(s => s.id === editingService.id ? { ...s, ...servicePayload } : s);
        storageFallback.saveServices(updated);
      } else {
        const newServ = { id: 's-' + Math.random().toString(36).substring(2, 9), ...servicePayload, created_at: new Date().toISOString() };
        storageFallback.saveServices([...localList, newServ]);
      }
      toast.success('Service saved locally. (Offline Synced)');
    } finally {
      setEditingService(null);
      setShowServiceForm(false);
      resetServiceForm();
      loadDashboardData();
    }
  };

  const handleToggleServiceStatus = async (service) => {
    const updatedStatus = !service.active;
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: updatedStatus })
        .eq('id', service.id);

      if (error) throw error;
      toast.success(`Service status toggled successfully.`);
    } catch (err) {
      const local = storageFallback.getServices();
      const updated = local.map(s => s.id === service.id ? { ...s, active: updatedStatus } : s);
      storageFallback.saveServices(updated);
      toast.success(`Service status toggled locally.`);
    } finally {
      loadDashboardData();
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      duration_minutes: 30,
      image_url: '',
      active: true
    });
  };

  // STAFF TAB HANDLERS
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const staffPayload = {
      name: staffFormData.name,
      speciality: staffFormData.speciality,
      avatar_url: staffFormData.avatar_url,
      role: staffFormData.role,
      active: staffFormData.active
    };

    try {
      if (editingStaff) {
        // Prevent downgrading the master owner role accidentally
        if (editingStaff.id === user.id && staffPayload.role !== 'owner') {
          toast.error('You cannot downgrade your own owner role.');
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update(staffPayload)
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast.success('Staff account details saved.');
      } else {
        // For new accounts, real project setup should sign up in Supabase Auth first.
        // We simulate profile save here.
        const { error } = await supabase
          .from('profiles')
          .insert([{ id: 'mock-uuid-' + Math.random().toString(36).substring(2, 6), ...staffPayload }]);

        if (error) throw error;
        toast.success('Staff account profile created.');
      }
    } catch (err) {
      console.warn('Supabase connection offline. Syncing staff changes locally...');
      const local = storageFallback.getBarbers();
      if (editingStaff) {
        const updated = local.map(b => b.id === editingStaff.id ? { ...b, ...staffPayload } : b);
        storageFallback.saveBarbers(updated);
      } else {
        const newStaff = { id: 'b-' + Math.random().toString(36).substring(2, 9), ...staffPayload, created_at: new Date().toISOString() };
        storageFallback.saveBarbers([...local, newStaff]);
      }
      toast.success('Staff details saved locally.');
    } finally {
      setEditingStaff(null);
      setShowStaffForm(false);
      resetStaffForm();
      loadDashboardData();
    }
  };

  const handleToggleStaffStatus = async (member) => {
    if (member.id === user.id) {
      toast.error('You cannot lock your own owner account.');
      return;
    }
    const targetStatus = !member.active;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: targetStatus })
        .eq('id', member.id);

      if (error) throw error;
      toast.success('Staff status updated.');
    } catch (err) {
      const local = storageFallback.getBarbers();
      const updated = local.map(b => b.id === member.id ? { ...b, active: targetStatus } : b);
      storageFallback.saveBarbers(updated);
      toast.success('Staff status updated locally.');
    } finally {
      loadDashboardData();
    }
  };

  const resetStaffForm = () => {
    setStaffFormData({
      name: '',
      speciality: '',
      avatar_url: '',
      role: 'staff',
      active: true
    });
  };

  // APPOINTMENTS ACTION STATUS HANDLERS
  const handleUpdateApptStatus = async (apptId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', apptId);

      if (error) throw error;
      toast.success(`Appointment status updated to ${newStatus}.`);
    } catch (err) {
      const local = storageFallback.getAppointments();
      const updated = local.map(a => a.id === apptId ? { ...a, status: newStatus } : a);
      storageFallback.saveAppointments(updated);
      toast.success(`Status updated to ${newStatus} locally.`);
    } finally {
      loadDashboardData();
    }
  };

  // GALLERY MANAGEMENT HANDLERS
  const handleAddGalleryPost = async (e) => {
    e.preventDefault();
    if (!galleryImageUrl) {
      toast.error('Please input a styling photo URL.');
      return;
    }

    const galleryPayload = {
      image_url: galleryImageUrl,
      caption: galleryCaption,
      active: true
    };

    try {
      const { error } = await supabase
        .from('gallery')
        .insert([galleryPayload]);

      if (error) throw error;
      toast.success('Photo added to public lookbook.');
    } catch (err) {
      const local = storageFallback.getGallery();
      const newPhoto = { id: 'g-' + Math.random().toString(36).substring(2, 9), ...galleryPayload, created_at: new Date().toISOString() };
      storageFallback.saveGallery([...local, newPhoto]);
      toast.success('Photo added locally.');
    } finally {
      setGalleryCaption('');
      setGalleryImageUrl('');
      loadDashboardData();
    }
  };

  const handleDeleteGalleryPost = async (id) => {
    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Photo deleted from lookbook.');
    } catch (err) {
      const local = storageFallback.getGallery();
      const filtered = local.filter(g => g.id !== id);
      storageFallback.saveGallery(filtered);
      toast.success('Photo deleted locally.');
    } finally {
      loadDashboardData();
    }
  };

  // SHOP CONFIGURATION HANDLERS
  const handleSaveShopSettings = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('business_settings')
        .update(shopSettings)
        .eq('id', 1);

      if (error) throw error;
      toast.success('Business configuration details saved.');
    } catch (err) {
      storageFallback.saveSettings(shopSettings);
      toast.success('Settings saved locally.');
    } finally {
      refreshSettings();
      loadDashboardData();
    }
  };

  const handleSaveHours = async (e) => {
    e.preventDefault();
    try {
      // Save each operational day row loop
      for (const h of shopHours) {
        await supabase
          .from('business_hours')
          .update({
            opening_time: h.opening_time,
            closing_time: h.closing_time,
            closed: h.closed
          })
          .eq('id', h.id);
      }
      toast.success('Shop operational hours saved.');
    } catch (err) {
      storageFallback.saveHours(shopHours);
      toast.success('Operational hours saved locally.');
    } finally {
      refreshSettings();
      loadDashboardData();
    }
  };

  const toggleHoursClosed = (id) => {
    setShopHours(
      shopHours.map((h) => (h.id === id ? { ...h, closed: !h.closed } : h))
    );
  };

  const updateHoursTime = (id, field, value) => {
    setShopHours(
      shopHours.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  // Helper date conversions
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Closed';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  // Filter appointments
  const filteredAppts = appointments.filter((appt) => {
    if (apptFilter === 'all') return true;
    if (apptFilter === 'pending') return appt.status === 'pending' || appt.status === 'confirmed';
    return appt.status === apptFilter;
  });

  const formatPrice = (price) => {
    const val = typeof price === 'number' ? price : parseFloat(price);
    return `₹${val.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-coral-500 text-white shrink-0 shadow-lg flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-6 mb-6">
            <div className="bg-white/10 p-2 rounded-xl text-electric-400">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-electric-400">Control Panel</span>
              <h1 className="text-sm font-bold tracking-wide">Owner Dashboard</h1>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              Stats & Analytics
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Manage Bookings
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Scissors className="w-5 h-5" />
              Menu & Pricing
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              Manage Stylists
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              Public Lookbook
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-electric-500 text-white shadow-neon-blue'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              Shop Settings
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-white/10 bg-white/5 text-xs text-slate-300 space-y-1">
          <p>Logged in as:</p>
          <p className="font-bold text-white truncate">{profile?.name || 'Administrator'}</p>
          <span className="text-[9px] font-black uppercase text-electric-400">Master Super Admin</span>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <div className="w-10 h-10 rounded-full border-4 border-t-electric-500 border-r-transparent border-b-neonPurple-500 border-l-transparent animate-spin"></div>
            <span className="text-xs text-slate-500 mt-4 font-bold uppercase tracking-wider">Syncing Admin Data Panel...</span>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* TAB 1: ANALYTICS OVERVIEW */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">SALON OVERVIEW</h2>
                  <p className="text-sm text-slate-500 mt-1">Live analytics, booking volumes, and financial aggregates.</p>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Income</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">₹{analytics.totalRevenue.toFixed(2)}</h3>
                    </div>
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appointments</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.totalAppointments}</h3>
                    </div>
                    <div className="p-4 bg-electric-500/10 text-electric-500 rounded-2xl">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unserved/Active</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.pendingAppointments}</h3>
                    </div>
                    <div className="p-4 bg-amber-500/10 text-amber-600 rounded-2xl">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cuts Done</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.completedAppointments}</h3>
                    </div>
                    <div className="p-4 bg-purple-500/10 text-purple-600 rounded-2xl">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Revenue distribution list */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 tracking-wide mb-4">Revenue Breakdown by Service</h3>
                    {analytics.revenueByService.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-10 font-medium">No sales recorded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {analytics.revenueByService.map((item, index) => (
                          <div key={index}>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span>{item.name}</span>
                              <span>₹{item.value.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-electric-500 to-neonPurple-500 h-full rounded-full"
                                style={{
                                  width: `${(item.value / analytics.totalRevenue) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick summary notes */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-wide mb-4">Salon Performance Audit</h3>
                      <div className="space-y-3.5 text-xs text-slate-600">
                        <p>✓ All operations are currently synced with local browser cache fallbacks.</p>
                        <p>✓ Current active services count: <span className="font-bold text-slate-900">{services.length}</span></p>
                        <p>✓ Active roster barber count: <span className="font-bold text-slate-900">{staff.filter(s=>s.active).length}</span></p>
                        <p>✓ Booking funnel switch status: <span className="font-extrabold text-emerald-600">ACTIVE</span></p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-150 flex justify-between">
                      <button onClick={() => navigate('/')} className="px-4 py-2 border border-slate-250 hover:border-slate-400 text-xs font-bold rounded-xl text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer">
                        Public Website <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setActiveTab('appointments')} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
                        Inspect Bookings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGE BOOKINGS */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">MANAGE APPOINTMENTS</h2>
                    <p className="text-sm text-slate-500 mt-1">Review registrations, claim bookings, and log states.</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1.5 bg-slate-200/60 p-1.5 rounded-xl self-start border border-slate-200">
                    {['all', 'pending', 'completed', 'cancelled'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setApptFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          apptFilter === f ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f === 'pending' ? 'Active' : f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  {filteredAppts.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center">
                      <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                      No appointments matching filter selection.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <th className="p-4 pl-6">Client Info</th>
                            <th className="p-4">Service</th>
                            <th className="p-4">Stylist</th>
                            <th className="p-4">Date & Time</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium">
                          {filteredAppts.map((appt) => (
                            <tr key={appt.id} className="hover:bg-slate-50/50">
                              <td className="p-4 pl-6">
                                <div className="font-bold text-slate-900">{appt.customer_name}</div>
                                <div className="text-slate-400 mt-0.5">{appt.customer_phone}</div>
                                {appt.booking_reference && (
                                  <span className="inline-block mt-1 font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                    Ref: {appt.booking_reference}
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-slate-900 font-semibold">{appt.services?.name || 'Haircut'}</div>
                                <div className="text-slate-400 mt-0.5">₹{parseFloat(appt.booked_price || 0).toFixed(2)}</div>
                              </td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                  {appt.profiles?.name || 'Unassigned'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-slate-900 font-bold">{appt.appointment_date}</div>
                                <div className="text-electric-500 font-semibold mt-0.5">{formatTime(appt.start_time)}</div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  appt.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : appt.status === 'cancelled' || appt.status === 'no_show'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="p-4 pr-6 text-right space-x-1.5">
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateApptStatus(appt.id, 'completed')}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                      title="Complete"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateApptStatus(appt.id, 'cancelled')}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SERVICES CRUD (ADMIN CAN EDIT PRICE & MENU) */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">MANAGE SERVICE MENU</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure options, durations, pricing, and visual catalogs.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingService(null);
                      resetServiceForm();
                      setShowServiceForm(true);
                    }}
                    className="flex items-center gap-1 px-4 py-2.5 bg-electric-500 hover:bg-electric-600 text-white text-xs font-extrabold rounded-xl shadow-neon-blue transition-all duration-300"
                  >
                    <Plus className="w-4 h-4" /> Add Service
                  </button>
                </div>

                {/* Service Edit / Creation Modal Overlay Form */}
                {showServiceForm && (
                  <form onSubmit={handleSaveService} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-md space-y-4">
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                      {editingService ? 'Edit Menu Item Details' : 'Register New Service Cut'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Service Name</label>
                        <input
                          type="text"
                          required
                          value={serviceFormData.name}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. Sharp Taper Fade"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Pricing Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={serviceFormData.price}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. 35.00"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Duration Minutes</label>
                        <input
                          type="number"
                          required
                          value={serviceFormData.duration_minutes}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. 30"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Image Link URL</label>
                        <input
                          type="text"
                          value={serviceFormData.image_url}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, image_url: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. https://images.unsplash.com/photo-..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Short Menu Description</label>
                      <textarea
                        required
                        value={serviceFormData.description}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold resize-none"
                        rows={2}
                        placeholder="Detail of grooming wash/styling inclusions..."
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowServiceForm(false);
                          setEditingService(null);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Save Service
                      </button>
                    </div>
                  </form>
                )}

                {/* Services list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {services.map((s) => (
                    <div key={s.id} className="p-5 bg-white border border-slate-200 rounded-3xl flex justify-between gap-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                          <img src={s.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">{s.name}</h4>
                            {!s.active && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-black uppercase text-slate-500 tracking-wider">Deactivated</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-xs">{s.description}</p>
                          <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-450 font-bold">
                            <span className="text-slate-800 font-extrabold text-sm">{formatPrice(s.price)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3.5 h-3.5 text-electric-500" />
                              {s.duration_minutes} Minutes
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingService(s);
                              setServiceFormData({
                                name: s.name,
                                description: s.description,
                                price: s.price.toString(),
                                duration_minutes: s.duration_minutes,
                                image_url: s.image_url || '',
                                active: s.active
                              });
                              setShowServiceForm(true);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleServiceStatus(s)}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            s.active
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-rose-500/5 hover:text-rose-600 hover:border-rose-500/20'
                              : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-emerald-500/5 hover:text-emerald-600 hover:border-emerald-500/20'
                          }`}
                        >
                          {s.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: STAFF MANAGEMENT */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">MANAGE BARBER ROSTER</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure profile bios, specialist categories, and account roles.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingStaff(null);
                      resetStaffForm();
                      setShowStaffForm(true);
                    }}
                    className="flex items-center gap-1 px-4 py-2.5 bg-electric-500 hover:bg-electric-600 text-white text-xs font-extrabold rounded-xl shadow-neon-blue transition-all duration-300"
                  >
                    <Plus className="w-4 h-4" /> Add Stylist
                  </button>
                </div>

                {showStaffForm && (
                  <form onSubmit={handleSaveStaff} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-md space-y-4">
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                      {editingStaff ? 'Edit Stylist Profile Details' : 'Register New Barber'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Barber Full Name</label>
                        <input
                          type="text"
                          required
                          value={staffFormData.name}
                          onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. Marcus Sharp"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Speciality Description</label>
                        <input
                          type="text"
                          required
                          value={staffFormData.speciality}
                          onChange={(e) => setStaffFormData({ ...staffFormData, speciality: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. Skin Fades & Shaves"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role Level</label>
                        <select
                          value={staffFormData.role}
                          onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-electric-500 text-xs font-bold"
                        >
                          <option value="staff">Staff Barber</option>
                          <option value="owner">Super Admin / Owner</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Avatar Image Link</label>
                        <input
                          type="text"
                          value={staffFormData.avatar_url}
                          onChange={(e) => setStaffFormData({ ...staffFormData, avatar_url: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                          placeholder="e.g. https://images.unsplash.com/..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowStaffForm(false);
                          setEditingStaff(null);
                        }}
                        className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Save Stylist
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {staff.map((member) => (
                    <div key={member.id} className="p-5 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between gap-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                          <img src={member.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-base font-bold text-slate-900">{member.name}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-black uppercase text-slate-500 tracking-wider">
                              {member.role}
                            </span>
                          </div>
                          <p className="text-xs text-electric-500 font-bold mt-1">{member.speciality || 'Master Stylist'}</p>
                          <div className="mt-2 flex items-center gap-1">
                            {member.active ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">Active</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-rose-500/10 text-rose-600 uppercase">Locked</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 border-t border-slate-100 justify-between items-center">
                        <button
                          onClick={() => {
                            setEditingStaff(member);
                            setStaffFormData({
                              name: member.name,
                              speciality: member.speciality || '',
                              avatar_url: member.avatar_url || '',
                              role: member.role,
                              active: member.active
                            });
                            setShowStaffForm(true);
                          }}
                          className="px-3 py-1.5 border border-slate-250 text-[10px] font-bold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Edit Profile
                        </button>

                        <button
                          onClick={() => handleToggleStaffStatus(member)}
                          disabled={member.id === user.id}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                            member.active ? 'border-rose-500/20 bg-rose-500/5 text-rose-600' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                          }`}
                        >
                          {member.active ? 'Lock Account' : 'Unlock Account'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: PUBLIC GALLERY LOOKBOOK */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">MANAGE PUBLIC LOOKBOOK</h2>
                  <p className="text-sm text-slate-500 mt-1">Publish portfolio cuts, styles, and salon work updates.</p>
                </div>

                {/* Upload Section */}
                <form onSubmit={handleAddGalleryPost} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Add New Photo to Lookbook</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Photo Link URL</label>
                      <input
                        type="text"
                        required
                        value={galleryImageUrl}
                        onChange={(e) => setGalleryImageUrl(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Caption Description</label>
                      <input
                        type="text"
                        value={galleryCaption}
                        onChange={(e) => setGalleryCaption(e.target.value)}
                        placeholder="e.g. Textured skin fade with crop style"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Add Photo
                    </button>
                  </div>
                </form>

                {/* Gallery List */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {gallery.map((g) => (
                    <div key={g.id} className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden aspect-square">
                      <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                        <span className="text-[10px] text-slate-300 font-medium">{g.caption || 'Lookbook Image'}</span>
                        <button
                          onClick={() => handleDeleteGalleryPost(g.id)}
                          className="self-end p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: SHOP SETTINGS */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Salon coordinates config */}
                <form onSubmit={handleSaveShopSettings} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Salon Configurations</h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Shop Display Name</label>
                      <input
                        type="text"
                        required
                        value={shopSettings.shop_name}
                        onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Call Line</label>
                      <input
                        type="tel"
                        required
                        value={shopSettings.phone}
                        onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp International Contact</label>
                      <input
                        type="tel"
                        required
                        value={shopSettings.whatsapp}
                        onChange={(e) => setShopSettings({ ...shopSettings, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Physical Address Location</label>
                      <input
                        type="text"
                        required
                        value={shopSettings.address}
                        onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Instagram Profile Link URL</label>
                      <input
                        type="text"
                        value={shopSettings.instagram || ''}
                        onChange={(e) => setShopSettings({ ...shopSettings, instagram: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Google Maps Redirect URL</label>
                      <input
                        type="text"
                        value={shopSettings.map_url || ''}
                        onChange={(e) => setShopSettings({ ...shopSettings, map_url: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-electric-500 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Save className="w-4 h-4" /> Save Shop settings
                    </button>
                  </div>
                </form>

                {/* Salon weekly shifts hours */}
                <form onSubmit={handleSaveHours} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Operational Weekly Hours</h3>

                  <div className="space-y-4">
                    {shopHours.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-4 text-xs font-bold py-1">
                        <span className="w-24 text-slate-800 capitalize">{getDayName(h.day_of_week)}</span>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={h.closed}
                            value={h.opening_time || '09:00'}
                            onChange={(e) => updateHoursTime(h.id, 'opening_time', e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none text-[10px] font-bold disabled:opacity-40"
                          />
                          <span className="text-slate-400 font-semibold">to</span>
                          <input
                            type="time"
                            disabled={h.closed}
                            value={h.closing_time || '17:00'}
                            onChange={(e) => updateHoursTime(h.id, 'closing_time', e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none text-[10px] font-bold disabled:opacity-40"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleHoursClosed(h.id)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                            h.closed
                              ? 'border-rose-500/20 bg-rose-500/5 text-rose-600'
                              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                          }`}
                        >
                          {h.closed ? 'Closed' : 'Open'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Save className="w-4 h-4" /> Save Shifts Hours
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
