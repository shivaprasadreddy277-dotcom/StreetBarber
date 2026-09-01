import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Award,
  ShieldCheck,
  Star,
  Quote,
  Zap,
  Scissors
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { storageFallback } from '../utils/storageFallback';

const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// Components
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FloatingWhatsapp from '../components/FloatingWhatsapp';
import SkeletonLoader from '../components/SkeletonLoader';
import Doodle from '../components/Doodle';

export default function Home() {
  const navigate = useNavigate();
  const { settings, hours } = useSettings();
  const toast = useToast();

  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [availabilityText, setAvailabilityText] = useState('Checking...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const configured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY && 
                         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                         !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
                         
      if (!configured) {
        const sLocal = storageFallback.getServices().filter(s => s.active);
        const bLocal = storageFallback.getBarbers().filter(b => b.active);
        const gLocal = storageFallback.getGallery().filter(g => g.active);
        setServices(sLocal);
        setBarbers(bLocal);
        setGallery(gLocal);
        await calculateLiveAvailability(bLocal);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch active services
        const { data: servicesData, error: sErr } = await supabase
          .from('services')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: true });
        
        if (sErr || !servicesData || servicesData.length === 0) {
          const local = storageFallback.getServices().filter(s => s.active);
          setServices(local);
        } else {
          setServices(servicesData);
          storageFallback.saveServices(servicesData);
        }

        // 2. Fetch active barbers
        const { data: barbersData, error: bErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('active', true)
          .in('role', ['owner', 'staff']);

        let currentBarbers = [];
        if (bErr || !barbersData || barbersData.length === 0) {
          const local = storageFallback.getBarbers().filter(b => b.active);
          setBarbers(local);
          currentBarbers = local;
        } else {
          setBarbers(barbersData);
          currentBarbers = barbersData;
          storageFallback.saveBarbers(barbersData);
        }

        // 3. Fetch active gallery images
        const { data: galleryData, error: gErr } = await supabase
          .from('gallery')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (gErr || !galleryData || galleryData.length === 0) {
          const local = storageFallback.getGallery().filter(g => g.active);
          setGallery(local);
        } else {
          setGallery(galleryData);
          storageFallback.saveGallery(galleryData);
        }

        // 4. Calculate live availability
        await calculateLiveAvailability(currentBarbers);
      } catch (err) {
        console.error('Error loading home data:', err);
        const sLocal = storageFallback.getServices().filter(s => s.active);
        const bLocal = storageFallback.getBarbers().filter(b => b.active);
        const gLocal = storageFallback.getGallery().filter(g => g.active);
        setServices(sLocal);
        setBarbers(bLocal);
        setGallery(gLocal);
        await calculateLiveAvailability(bLocal);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [hours]);

  // Derive live availability based on active barbers, schedules, and appointments
  const calculateLiveAvailability = async (activeBarbers) => {
    if (!activeBarbers || activeBarbers.length === 0) {
      setAvailabilityText('Unavailable Today');
      return;
    }

    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
      const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"

      // Get shop hours for today
      const todayHours = hours.find((h) => h.day_of_week === currentDayOfWeek);
      if (!todayHours || todayHours.closed || !todayHours.opening_time) {
        setAvailabilityText('Closed Today');
        return;
      }

      const { opening_time, closing_time } = todayHours;

      // If shop is not open yet
      if (currentTimeStr < opening_time) {
        setAvailabilityText(`Opens at ${formatTimeString(opening_time)}`);
        return;
      }

      // If shop is closed for the day
      if (currentTimeStr >= closing_time) {
        setAvailabilityText('Closed For Today');
        return;
      }

      let apptList = [];
      let blocks = [];
      
      const configured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY && 
                         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                         !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
                         
      if (configured) {
        // Fetch today's active appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('start_time, end_time, barber_id')
          .eq('appointment_date', todayStr)
          .not('status', 'in', '("cancelled","no_show")');
        apptList = appointments || [];

        // Fetch today's unavailable blocks for barbers
        const { data: dbBlocks } = await supabase
          .from('staff_availability')
          .select('start_time, end_time, staff_id')
          .eq('date', todayStr)
          .eq('availability_status', 'unavailable');
        blocks = dbBlocks || [];
      } else {
        apptList = storageFallback.getAppointments().filter(a => a.appointment_date === todayStr && !['cancelled', 'no_show'].includes(a.status));
        blocks = [];
        activeBarbers.forEach(barber => {
          const localVal = localStorage.getItem(`sb_overrides_${barber.id}`);
          if (localVal) {
            const list = JSON.parse(localVal);
            const todayOverrides = list.filter(o => o.date === todayStr && o.availability_status === 'unavailable');
            blocks.push(...todayOverrides);
          }
        });
      }

      // Helper: converts "HH:MM" or "HH:MM:SS" to minutes since midnight
      const toMinutes = (timeStr) => {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      };

      const currentMinutes = toMinutes(currentTimeStr);
      const closeMinutes = toMinutes(closing_time);

      // Check remaining slots in 30 minute blocks from now until closing time
      let checkSlotStart = Math.ceil(currentMinutes / 15) * 15; // align to nearest 15-min
      let foundAvailableSlot = null;

      while (checkSlotStart + 30 <= closeMinutes) {
        const slotEnd = checkSlotStart + 30;

        // Check if there is ANY barber who is available at [checkSlotStart, slotEnd]
        const availableBarber = activeBarbers.find((barber) => {
          // Check if barber is blocked
          const isBlocked = (blocks || []).some(
            (b) =>
              b.staff_id === barber.id &&
              ((toMinutes(b.start_time) < slotEnd && toMinutes(b.end_time) > checkSlotStart) ||
                (toMinutes(b.start_time) <= checkSlotStart && toMinutes(b.end_time) >= slotEnd))
          );

          if (isBlocked) return false;

          // Check if barber has an overlapping appointment
          const hasConflict = apptList.some(
            (appt) =>
              appt.barber_id === barber.id &&
              !(
                toMinutes(appt.end_time) <= checkSlotStart ||
                toMinutes(appt.start_time) >= slotEnd
              )
          );

          return !hasConflict;
        });

        if (availableBarber) {
          foundAvailableSlot = checkSlotStart;
          break;
        }

        checkSlotStart += 15; // increment by 15 mins to check next
      }

      if (foundAvailableSlot !== null) {
        if (foundAvailableSlot <= currentMinutes + 15) {
          setAvailabilityText('Available Now');
        } else {
          // Convert minutes back to HH:MM format
          const hh = Math.floor(foundAvailableSlot / 60);
          const mm = foundAvailableSlot % 60;
          const ampm = hh >= 12 ? 'PM' : 'AM';
          const displayHr = hh % 12 || 12;
          const displayMin = mm < 10 ? '0' + mm : mm;
          setAvailabilityText(`Next Available: ${displayHr}:${displayMin} ${ampm}`);
        }
      } else {
        setAvailabilityText('Fully Booked Today');
      }
    } catch (err) {
      console.error('Error calculating live availability:', err);
      setAvailabilityText('Available Today');
    }
  };

  const formatTimeString = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
  };

  const formatPrice = (price) => {
    const val = typeof price === 'number' ? price : parseFloat(price);
    return `₹${val.toFixed(0)}`;
  };

  // Helper to map services to unique doodles
  const getServiceDoodle = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('combo') || lower.includes('executive') || lower.includes('hair + beard')) return 'hair-dryer';
    if (lower.includes('fade') || lower.includes('taper')) return 'scissors';
    if (lower.includes('beard') || lower.includes('trim') || lower.includes('shave')) return 'razor';
    if (lower.includes('scissor') || lower.includes('classic')) return 'comb';
    return 'hair-strands';
  };

  return (
    <div className="relative min-h-screen bg-cream text-navy selection:bg-orange selection:text-white font-sans overflow-x-hidden">
      <Navbar />

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsapp />

      {/* 1. HERO SECTION */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center pt-28 pb-16 overflow-hidden bg-cream"
      >
        {/* Background Decorative Doodles */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none opacity-40">
          <Doodle name="stars" size={120} color="mustard" rotation={15} animate className="absolute top-[15%] left-[8%]" />
          <Doodle name="lightning-bolt" size={90} color="orange" rotation={-10} animate className="absolute bottom-[20%] left-[12%]" />
          <Doodle name="sparkles" size={100} color="mustard" rotation={45} animate className="absolute top-[20%] right-[10%]" />
          <Doodle name="circle" size={150} color="navy" rotation={0} className="absolute bottom-[10%] right-[8%] opacity-30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 text-left flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange/10 border-2 border-orange/20 text-orange text-xs font-black tracking-wider uppercase mb-6 w-fit animate-pulse">
                <Sparkles className="w-4 h-4 text-orange" />
                STREET BARBER CO.
              </div>

              <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-navy leading-none font-display">
                YOUR STYLE.<br />
                <span className="text-orange relative">
                  YOUR STREET.
                  {/* Scribble underline under YOUR STREET */}
                  <Doodle name="underline" size={320} color="mustard" className="absolute -bottom-4 left-0 w-full h-4" />
                </span>
              </h1>

              <p className="mt-8 max-w-lg text-lg sm:text-xl text-navy/85 font-semibold leading-relaxed">
                Fresh cuts. Sharp fades. Street-ready confidence.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
                <Link
                  to="/book"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-orange hover:bg-orange/90 text-white font-display font-black tracking-wider shadow-neon-blue hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-center"
                >
                  BOOK YOUR CUT ✂
                </Link>
                <a
                  href="#services"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border-3 border-navy hover:bg-navy/5 text-navy font-display font-black tracking-wider transition-all duration-300 transform hover:-translate-y-1 text-center"
                >
                  EXPLORE STYLES
                </a>
              </div>

              {/* Live Availability Status Bar */}
              <div className="mt-12 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border-2 border-navy/10 shadow-sm w-fit">
                <span className="relative flex h-3.5 w-3.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    availabilityText.includes('Available') ? 'bg-emerald-400' : 'bg-orange'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    availabilityText.includes('Available') ? 'bg-emerald-500' : 'bg-orange'
                  }`}></span>
                </span>
                <span className="text-xs font-black text-navy uppercase tracking-widest font-display">
                  {availabilityText}
                </span>
              </div>
            </div>

            {/* Right Hero Image Container with sketch doodles & annotations */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              {/* Doodle frames surrounding image */}
              <div className="absolute -top-6 -left-6 z-20">
                <Doodle name="scissors" size={80} color="navy" rotation={-25} animate />
              </div>
              <div className="absolute -bottom-8 -right-6 z-20">
                <Doodle name="comb" size={85} color="orange" rotation={35} animate />
              </div>
              <div className="absolute top-[40%] -right-12 z-20">
                <Doodle name="arrow" size={75} color="mustard" rotation={130} />
              </div>
              <div className="absolute -top-10 -right-8 z-20">
                <Doodle name="stars" size={70} color="mustard" rotation={12} animate />
              </div>

              {/* Handwritten style annotations */}
              <div className="absolute -left-12 top-[25%] z-20 font-handwritten text-orange font-bold text-3xl -rotate-12 bg-white/95 px-3 py-1 rounded-xl shadow-sm border border-navy/5">
                FRESH CUT ✂
              </div>
              <div className="absolute right-4 bottom-[25%] z-20 font-handwritten text-navy font-bold text-3xl rotate-6 bg-[#FFF9EE] px-3.5 py-1 rounded-xl shadow-sm border border-navy/5">
                LOOK SHARP
              </div>
              <div className="absolute left-[20%] -bottom-6 z-20 font-handwritten text-navy font-bold text-3xl -rotate-3 bg-white px-4 py-1.5 rounded-xl shadow-md border-2 border-orange/45">
                ⚡ STREET READY
              </div>

              {/* Hero Image Container */}
              <div className="relative w-80 h-96 sm:w-96 sm:h-[480px] rounded-[36px] border-4 border-navy overflow-hidden bg-white shadow-xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop"
                  alt="Street Barber Haircut Style"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT SECTION */}
      <section id="about" className="py-24 bg-white border-y border-navy/10 relative">
        <div className="absolute top-10 right-[15%] opacity-20 z-0">
          <Doodle name="circle" size={130} color="mustard" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Image grid */}
            <div className="lg:col-span-5 relative flex justify-center">
              <Doodle name="razor" size={80} color="orange" rotation={45} animate className="absolute -top-8 -left-2 z-20" />
              
              <div className="relative w-72 h-80 rounded-[32px] border-4 border-navy overflow-hidden bg-cream shadow-lg -rotate-3">
                <img
                  src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80"
                  alt="Atmosphere at Street Barber"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right details */}
            <div className="lg:col-span-7 text-left">
              <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">THE PHILOSOPHY</h2>
              <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
                MORE THAN A HAIRCUT.
              </p>
              <div className="w-16 h-1.5 bg-orange mt-4 mb-8 rounded-full"></div>

              <p className="text-base sm:text-lg text-navy/85 leading-relaxed font-semibold">
                Street Barber is about personal style, confidence, and individuality. We merge streetwear branding, contemporary barber aesthetics, and playfulness to deliver a premium service that elevates your confidence to street-ready status.
              </p>
              <p className="mt-4 text-sm text-navy/70 leading-relaxed font-medium">
                Whether you need a razor-sharp skin fade, classic scissor cuts, or signature beard sculpting, our crew is here to make your style stand out. We respect your time: book online, secure your spot, and walk in straight to your chair.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-navy/10 relative">
                <div className="absolute top-[20%] right-[33%] pointer-events-none">
                  <Doodle name="sparkles" size={40} color="mustard" />
                </div>
                <div className="text-left">
                  <span className="block text-3xl sm:text-4xl font-black text-orange font-display">500+</span>
                  <span className="block text-[11px] font-black text-navy uppercase tracking-widest mt-1">Fresh Cuts</span>
                </div>
                <div className="text-left">
                  <span className="block text-3xl sm:text-4xl font-black text-navy font-display">10+</span>
                  <span className="block text-[11px] font-black text-navy uppercase tracking-widest mt-1">Signature Styles</span>
                </div>
                <div className="text-left">
                  <span className="block text-3xl sm:text-4xl font-black text-orange font-display">5★</span>
                  <span className="block text-[11px] font-black text-navy uppercase tracking-widest mt-1">Experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES SECTION */}
      <section id="services" className="py-24 bg-cream relative">
        {/* Background Doodles */}
        <Doodle name="barber-pole" size={100} color="navy" rotation={-15} className="absolute top-12 left-10 opacity-30" />
        <Doodle name="stars" size={70} color="mustard" rotation={25} className="absolute bottom-20 right-12 opacity-35" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">STYLE MENU</h2>
            <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
              PICK YOUR STYLE.
            </p>
            <div className="w-16 h-1.5 bg-orange mx-auto mt-4 rounded-full"></div>
          </div>

          {loading ? (
            <SkeletonLoader type="card-grid" count={4} />
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-navy/60 font-semibold bg-white rounded-3xl border-2 border-navy/15 max-w-md mx-auto">
              No active services found in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="group bg-white border-2 border-navy rounded-[28px] overflow-hidden shadow-sm flex flex-col justify-between hover:border-orange hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
                >
                  {/* Inline Doodle Top Right */}
                  <div className="absolute top-5 right-5 z-20 bg-cream/90 p-2 rounded-xl border border-navy/5 text-navy group-hover:text-orange group-hover:rotate-12 transition-all duration-300">
                    <Doodle name={getServiceDoodle(service.name)} size={32} color="navy" className="group-hover:text-orange" />
                  </div>

                  <div className="relative h-52 overflow-hidden bg-cream border-b-2 border-navy group-hover:border-orange transition-colors">
                    <img
                      src={service.image_url || 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80'}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent"></div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <h3 className="text-xl font-black text-navy tracking-wide font-display group-hover:text-orange transition-colors">
                        {service.name}
                      </h3>
                      <p className="mt-3 text-xs text-navy/70 font-semibold line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-navy/10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-navy/50 font-black uppercase tracking-wider">Price</span>
                        <span className="text-2xl font-black text-navy font-display">{formatPrice(service.price)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-navy/50 font-black uppercase tracking-wider">Time</span>
                        <span className="text-xs font-bold text-navy/70 flex items-center gap-1 mt-0.5 bg-cream px-2.5 py-1 rounded-lg border border-navy/5">
                          <Clock className="w-3.5 h-3.5 text-orange shrink-0" />
                          {service.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 bg-white">
                    <Link
                      to={`/book?service=${service.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-sm"
                    >
                      BOOK NOW
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. STYLE GALLERY */}
      <section id="gallery" className="py-24 bg-white border-t border-navy/10 relative">
        <Doodle name="sparkles" size={80} color="mustard" rotation={10} className="absolute top-16 right-[10%] opacity-40 animate-pulse" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">LOOKBOOK</h2>
            <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
              WHAT'S YOUR LOOK?
            </p>
            <div className="w-16 h-1.5 bg-orange mx-auto mt-4 rounded-full"></div>
          </div>

          {loading ? (
            <SkeletonLoader type="card-grid" count={4} />
          ) : gallery.length === 0 ? (
            <div className="text-center py-12 text-navy/60 font-semibold bg-cream rounded-3xl border-2 border-navy/15 max-w-md mx-auto">
              Lookbook is currently empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-[28px] overflow-hidden aspect-[4/5] bg-cream border-2 border-navy shadow-sm hover:shadow-xl hover:border-orange transition-all duration-500 transform hover:-translate-y-2"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || 'Haircut'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    <p className="text-xs font-display font-black text-mustard tracking-widest uppercase mb-1">STREET CUT</p>
                    <p className="text-sm font-black text-white tracking-wide leading-snug mb-4">{item.caption || 'Classic Barber Work'}</p>
                    <Link
                      to="/book"
                      className="px-4 py-2 bg-orange hover:bg-orange/90 text-white text-[10px] font-display font-black tracking-widest rounded-xl text-center uppercase transition-colors shadow-sm"
                    >
                      GET THIS LOOK
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. EXPERIENCE ADVERTISEMENT SECTION */}
      <section className="py-28 bg-[#FFF9EE] border-y border-navy/10 relative overflow-hidden">
        {/* Decorative elements */}
        <Doodle name="lightning-bolt" size={110} color="orange" rotation={15} animate className="absolute -top-10 left-[20%] opacity-40 z-0" />
        <Doodle name="arrow" size={90} color="mustard" rotation={-45} className="absolute bottom-[10%] right-[15%] opacity-40 z-0" />
        <Doodle name="circle" size={240} color="navy" rotation={0} className="absolute -right-20 -top-20 opacity-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-orange/10 border-2 border-orange/20 text-orange rounded-3xl mb-6">
            <Scissors className="w-8 h-8 rotate-45" />
          </div>
          
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight text-navy leading-none font-display mb-8">
            COME FOR THE CUT.<br />
            <span className="text-orange relative inline-block mt-2">
              STAY FOR THE VIBE.
              <Doodle name="underline" size={280} color="mustard" className="absolute -bottom-3 left-0 w-full h-3" strokeWidth="6" />
            </span>
          </h2>

          <p className="mt-8 max-w-2xl mx-auto text-base sm:text-lg text-navy/80 font-bold leading-relaxed">
            Street Barber isn't just about the service, it's a lifestyle brand. Fresh tunes, friendly crew, and street-ready confidence wrapped in an energetic premium environment.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto font-display">
            <div className="bg-white border-2 border-navy rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange transition-all duration-300">
              <span className="font-black text-orange text-lg">01 / MUSIC</span>
              <p className="text-xs text-navy/70 font-semibold mt-2">Urban beats & lo-fi vibes playlist humming while you sit back and relax.</p>
            </div>
            <div className="bg-white border-2 border-navy rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange transition-all duration-300">
              <span className="font-black text-orange text-lg">02 / REFRESH</span>
              <p className="text-xs text-navy/70 font-semibold mt-2">Complimentary beverages to keep you cool during your styling sessions.</p>
            </div>
            <div className="bg-white border-2 border-navy rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange transition-all duration-300">
              <span className="font-black text-orange text-lg">03 / SOCIAL</span>
              <p className="text-xs text-navy/70 font-semibold mt-2">Catch up with the community, chat with the crew, and meet the neighborhood.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BARBER SECTION */}
      <section id="barbers" className="py-24 bg-cream relative">
        <Doodle name="comb" size={90} color="mustard" rotation={-35} animate className="absolute top-10 right-[15%] opacity-35" />
        <Doodle name="razor" size={80} color="navy" rotation={15} animate className="absolute bottom-16 left-[8%] opacity-35" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">THE CREW</h2>
            <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
              MEET THE CREW.
            </p>
            <div className="w-16 h-1.5 bg-orange mx-auto mt-4 rounded-full"></div>
          </div>

          {loading ? (
            <SkeletonLoader type="card-grid" count={3} />
          ) : barbers.length === 0 ? (
            <div className="text-center py-12 text-navy/60 font-semibold bg-white rounded-3xl border-2 border-navy/15 max-w-md mx-auto">
              No master barbers found in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="group bg-white border-2 border-navy rounded-[28px] overflow-hidden flex flex-col justify-between hover:border-orange hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-72 bg-cream border-b-2 border-navy group-hover:border-orange transition-colors flex items-center justify-center p-6">
                    <Doodle
                      name="man-avatar"
                      size={180}
                      color="navy"
                      className="group-hover:text-orange group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-4 right-4 bg-white/95 border border-navy/10 px-3.5 py-1 rounded-full text-[10px] font-black text-navy uppercase tracking-widest font-display shadow-sm">
                      {barber.role === 'owner' ? 'Shop Owner' : 'Barber'}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between bg-white relative">
                    {/* Small background sparkle decor */}
                    <div className="absolute top-5 right-5 z-10 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity">
                      <Doodle name="sparkles" size={28} color="mustard" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-navy font-display">{barber.name}</h3>
                      <p className="text-xs font-black text-orange uppercase tracking-wider mt-1 font-display">
                        {barber.speciality || 'Master Stylist'}
                      </p>
                      
                      <div className="mt-4 flex items-center gap-2.5 text-xs text-navy/70 bg-cream border border-navy/5 px-3.5 py-2 rounded-xl font-bold">
                        <Clock className="w-4 h-4 text-orange shrink-0" />
                        <span>Weekly Shift Availability</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-navy/10 flex items-center gap-3">
                      <Link
                        to={`/book?barber=${barber.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black text-xs tracking-wider uppercase transition-all duration-300 shadow-sm"
                      >
                        BOOK WITH ME
                      </Link>
                      
                      {settings?.instagram && (
                        <a
                          href={settings.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl border-2 border-navy/10 hover:border-orange/30 text-navy hover:text-orange transition-colors shadow-sm bg-white"
                          title="View work on Instagram"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. CLIENT REVIEWS */}
      <section id="reviews" className="py-24 bg-white border-t border-navy/10 relative">
        <Doodle name="stars" size={100} color="mustard" rotation={-15} animate className="absolute top-12 left-10 opacity-35" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">THE VERDICT</h2>
            <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
              THE STREET LOVES US.
            </p>
            <div className="w-16 h-1.5 bg-orange mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Review 1 - slightly rotated */}
            <div className="p-6 bg-white border-2 border-navy rounded-[28px] shadow-sm flex flex-col justify-between relative transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <Quote className="absolute right-6 top-6 w-10 h-10 text-cream shrink-0 z-0" />
              <div className="relative z-10">
                <div className="flex gap-0.5 text-mustard">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="mt-5 text-sm text-navy/85 font-semibold leading-relaxed italic">
                  "Marcus gave me the sharpest skin fade I've had in years. The hot towel service is a total game changer. Friendly team, fresh vibes and extremely clear pricing. Highly recommended!"
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-navy/10 pt-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-cream border border-navy/5 flex items-center justify-center font-black text-xs text-navy shrink-0">JD</div>
                <div>
                  <h5 className="text-xs font-black text-navy font-display uppercase tracking-wider">Johnathan D.</h5>
                  <span className="text-[9px] text-navy/50 font-black uppercase tracking-widest">Booked Skin Fade</span>
                </div>
              </div>
            </div>

            {/* Review 2 - slightly rotated opposite way */}
            <div className="p-6 bg-white border-2 border-navy rounded-[28px] shadow-sm flex flex-col justify-between relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
              <Quote className="absolute right-6 top-6 w-10 h-10 text-cream shrink-0 z-0" />
              <div className="relative z-10">
                <div className="flex gap-0.5 text-mustard">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="mt-5 text-sm text-navy/85 font-semibold leading-relaxed italic">
                  "Amazing vibe in the shop! You select your service and slot online, then walk straight in. No standing around in lines for hours. Leo is a true scissor master."
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-navy/10 pt-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-cream border border-navy/5 flex items-center justify-center font-black text-xs text-navy shrink-0">RT</div>
                <div>
                  <h5 className="text-xs font-black text-navy font-display uppercase tracking-wider">Robert T.</h5>
                  <span className="text-[9px] text-navy/50 font-black uppercase tracking-widest">Booked Classic Cut</span>
                </div>
              </div>
            </div>

            {/* Review 3 - slightly rotated */}
            <div className="p-6 bg-white border-2 border-navy rounded-[28px] shadow-sm flex flex-col justify-between relative transform -rotate-1.5 hover:rotate-0 transition-transform duration-300">
              <Quote className="absolute right-6 top-6 w-10 h-10 text-cream shrink-0 z-0" />
              <div className="relative z-10">
                <div className="flex gap-0.5 text-mustard">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="mt-5 text-sm text-navy/85 font-semibold leading-relaxed italic">
                  "I travel 20 miles to get my beard groomed here. The attention to detail and straight razor outline is flawless. Easy booking system makes it super convenient."
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-navy/10 pt-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-cream border border-navy/5 flex items-center justify-center font-black text-xs text-navy shrink-0">MK</div>
                <div>
                  <h5 className="text-xs font-black text-navy font-display uppercase tracking-wider">Marcus K.</h5>
                  <span className="text-[9px] text-navy/50 font-black uppercase tracking-widest">Booked Beard Trim</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BOOKING CTA */}
      <section className="py-24 bg-cream border-t border-navy/10 relative overflow-hidden">
        {/* Floating background sketch shapes */}
        <Doodle name="stars" size={130} color="mustard" rotation={25} animate className="absolute -top-10 left-[8%] opacity-35" />
        <Doodle name="lightning-bolt" size={100} color="orange" rotation={-15} animate className="absolute bottom-[10%] right-[10%] opacity-40" />
        <Doodle name="circle" size={180} color="navy" rotation={0} className="absolute left-[40%] bottom-[-80px] opacity-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-navy leading-none font-display">
            READY FOR A FRESH CUT?
          </h2>
          
          <p className="mt-6 max-w-xl mx-auto text-lg text-navy/80 font-bold">
            Your next look is just one appointment away.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              to="/book"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-orange hover:bg-orange/90 text-white font-display font-black tracking-widest text-sm sm:text-base uppercase shadow-neon-blue hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
            >
              BOOK YOUR CUT ✂
            </Link>
          </div>
        </div>
      </section>

      {/* 9. CONTACT & LOCATION SECTION */}
      <section id="contact" className="py-24 bg-white relative border-t border-navy/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Contact Details */}
            <div className="lg:col-span-6 text-left flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xs font-black tracking-widest text-orange uppercase font-display">FIND US</h2>
                <p className="mt-3 text-4xl sm:text-5xl font-black text-navy tracking-tight font-display">
                  VISIT STREET BARBER.
                </p>
                <div className="w-16 h-1.5 bg-orange mt-4 mb-6 rounded-full"></div>
                <p className="text-base text-navy/70 leading-relaxed font-semibold max-w-md">
                  Stop by today for the sharpest cut in the city. Walk-ins are welcome but booking online is highly recommended to secure your preferred stylist and slot.
                </p>

                <div className="mt-10 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-cream rounded-xl border border-navy/5 text-orange shrink-0 shadow-sm">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-navy font-black font-display text-sm tracking-wide">Salon Address</h4>
                      <p className="mt-1 text-navy/70 text-xs font-semibold">{settings?.address || '123 Grunge Avenue, Sector 7'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-cream rounded-xl border border-navy/5 text-orange shrink-0 shadow-sm">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-navy font-black font-display text-sm tracking-wide">Phone Call</h4>
                      <a href={`tel:${settings?.phone}`} className="mt-1 text-navy hover:text-orange text-xs font-semibold transition-colors block">
                        {settings?.phone || '+1 (555) 987-6543'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-cream rounded-xl border border-navy/5 text-emerald-500 shrink-0 shadow-sm">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-navy font-black font-display text-sm tracking-wide">WhatsApp Chat</h4>
                      <a
                        href={`https://wa.me/${settings?.whatsapp?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-navy hover:text-emerald-500 text-xs font-semibold transition-colors block"
                      >
                        {settings?.whatsapp || '+15559876543'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram link */}
              {settings?.instagram && (
                <div className="mt-12 pt-6 border-t border-navy/10 flex items-center gap-3 font-display">
                  <Instagram className="w-5 h-5 text-orange" />
                  <span className="text-xs font-black text-navy/60">Follow our styles:</span>
                  <a
                    href={settings.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black text-navy hover:text-orange transition-colors underline"
                  >
                    @streetbarber
                  </a>
                </div>
              )}
            </div>

            {/* Map Frame */}
            <div className="lg:col-span-6 bg-cream border-2 border-navy rounded-[36px] p-4 overflow-hidden h-96 flex flex-col justify-between shadow-sm">
              <div className="w-full h-[82%] rounded-[28px] bg-slate-200 overflow-hidden relative border border-navy/10">
                <iframe
                  title="Street Barber Location"
                  src="https://maps.google.com/maps?q=Kamineni%20Hospitals%20L.B.%20Nagar%20Hyderabad&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="opacity-80 grayscale contrast-125"
                ></iframe>
              </div>
              <div className="flex items-center justify-between pt-3 px-1">
                <div className="text-left max-w-xs">
                  <span className="text-[9px] text-navy/50 font-black uppercase tracking-wider">Location</span>
                  <p className="text-xs text-navy font-bold truncate leading-none mt-0.5">{settings?.address || '123 Grunge Avenue, Sector 7'}</p>
                </div>
                <a
                  href={settings?.map_url || 'https://maps.google.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-navy hover:bg-navy/90 text-white font-display font-black text-[10px] hover:shadow-neon-coral transition-all duration-300 whitespace-nowrap uppercase tracking-widest"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
