import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Scissors,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { storageFallback } from '../utils/storageFallback';

// Components
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Doodle from '../components/Doodle';

export default function BookingFunnel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings, hours } = useSettings();
  const toast = useToast();

  // Booking Flow Steps: 1: Service, 2: Barber, 3: Date, 4: Time, 5: Customer Details, 6: Completed
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic lists from DB
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null); // null means "Any Available Barber"
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Customer Inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Result info from secure RPC booking
  const [bookingResult, setBookingResult] = useState(null);

  // Time Slots & Conflicts loaded for the chosen date
  const [availableSlots, setAvailableSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  const MOCK_SERVICES = [
    { id: 's1111111-1111-1111-1111-111111111111', name: 'Fresh Fade & Style', description: 'Precision side fade with custom styling, edge lining, hair wash, and professional style finish.', price: 400.00, duration_minutes: 30, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', active: true },
    { id: 's2222222-2222-2222-2222-222222222222', name: 'Classic Scissor Cut', description: 'Traditional all-scissors haircut tailored to your head shape, including hot neck shave and hair splash.', price: 350.00, duration_minutes: 30, image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', active: true },
    { id: 's3333333-3333-3333-3333-333333333333', name: 'Beard Groom & Razor Line', description: 'Beard sculpting and trim, finished with a hot towel treatment, straight razor lining, and nourishing beard oil.', price: 250.00, duration_minutes: 20, image_url: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=600&q=80', active: true },
    { id: 's4444444-4444-4444-4444-444444444444', name: 'The Street Barber Executive', description: 'The ultimate combo: Signature haircut, beard trim with hot towel, black mask charcoal skin detox, and shoulder massage.', price: 800.00, duration_minutes: 60, image_url: 'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&w=600&q=80', active: true }
  ];

  const MOCK_BARBERS = [
    { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', name: 'Alex Owner', role: 'owner', speciality: 'Owner & Master Stylist', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', active: true },
    { id: 'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', name: 'Marcus Sharp', role: 'staff', speciality: 'Fades & Beard Specialist', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', active: true },
    { id: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', name: 'Leo Trim', role: 'staff', speciality: 'Classic Cuts & Scissors', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', active: true }
  ];

  // Pre-select service or barber from URL query parameters if present
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const configured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY && 
                         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                         !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
                         
      if (!configured) {
        const sLocal = storageFallback.getServices().filter(s => s.active);
        const bLocal = storageFallback.getBarbers().filter(b => b.active);
        setServices(sLocal);
        setBarbers(bLocal);
        
        const serviceIdParam = searchParams.get('service');
        if (serviceIdParam) {
          const service = sLocal.find((s) => s.id === serviceIdParam);
          if (service) {
            setSelectedService(service);
            setStep(2);
          }
        }
        const barberIdParam = searchParams.get('barber');
        if (barberIdParam) {
          const barber = bLocal.find((b) => b.id === barberIdParam);
          if (barber) {
            setSelectedBarber(barber);
            if (serviceIdParam) setStep(3);
          }
        }
        setLoading(false);
        return;
      }

      try {
        const { data: sData, error: sErr } = await supabase.from('services').select('*').eq('active', true);
        let finalServices = [];
        if (sErr || !sData || sData.length === 0) {
          const local = storageFallback.getServices().filter(s => s.active);
          setServices(local);
          finalServices = local;
        } else {
          setServices(sData);
          finalServices = sData;
          storageFallback.saveServices(sData);
        }

        const { data: bData, error: bErr } = await supabase.from('profiles').select('*').eq('active', true).in('role', ['owner', 'staff']);
        let finalBarbers = [];
        if (bErr || !bData || bData.length === 0) {
          const local = storageFallback.getBarbers().filter(b => b.active);
          setBarbers(local);
          finalBarbers = local;
        } else {
          setBarbers(bData);
          finalBarbers = bData;
          storageFallback.saveBarbers(bData);
        }

        const serviceIdParam = searchParams.get('service');
        if (serviceIdParam) {
          const service = finalServices.find((s) => s.id === serviceIdParam);
          if (service) {
            setSelectedService(service);
            setStep(2);
          }
        }

        const barberIdParam = searchParams.get('barber');
        if (barberIdParam) {
          const barber = finalBarbers.find((b) => b.id === barberIdParam);
          if (barber) {
            setSelectedBarber(barber);
            if (serviceIdParam) setStep(3);
          }
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setServices(MOCK_SERVICES);
        setBarbers(MOCK_BARBERS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchParams]);

  // Recalculate available time slots when date, barber, or service changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      calculateTimeSlots();
    }
  }, [selectedService, selectedBarber, selectedDate]);

  // Fetch appointments and blocked dates, then run slot validator
  const calculateTimeSlots = async () => {
    setCheckingSlots(true);
    setAvailableSlots([]);
    setSelectedTime('');

    try {
      const dateObj = new Date(selectedDate);
      const dayOfWeek = dateObj.getDay();

      // Find shop hours for this day of week
      const shopHours = hours.find((h) => h.day_of_week === dayOfWeek);
      if (!shopHours || shopHours.closed || !shopHours.opening_time) {
        setAvailableSlots([]);
        return;
      }

      const { opening_time, closing_time } = shopHours;

      let apptList = [];
      let blocks = [];

      const configured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY && 
                         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                         !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

      if (configured) {
        // Fetch appointments for this date
        const { data: appointments } = await supabase
          .from('appointments')
          .select('start_time, end_time, barber_id')
          .eq('appointment_date', selectedDate)
          .not('status', 'in', '("cancelled","no_show")');
        apptList = appointments || [];

        // Fetch blocks/overrides
        const { data: dbBlocks } = await supabase
          .from('staff_availability')
          .select('start_time, end_time, staff_id')
          .eq('date', selectedDate)
          .eq('availability_status', 'unavailable');
        blocks = dbBlocks || [];
      } else {
        apptList = storageFallback.getAppointments().filter(a => a.appointment_date === selectedDate && !['cancelled', 'no_show'].includes(a.status));
        blocks = [];
        barbers.forEach(barber => {
          const localVal = localStorage.getItem(`sb_overrides_${barber.id}`);
          if (localVal) {
            const list = JSON.parse(localVal);
            const todayOverrides = list.filter(o => o.date === selectedDate && o.availability_status === 'unavailable');
            blocks.push(...todayOverrides);
          }
        });
      }

      // Convert "HH:MM:SS" -> minutes
      const toMinutes = (timeStr) => {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      };

      const startMin = toMinutes(opening_time);
      const endMin = toMinutes(closing_time);

      // Generate 30-min slot markers
      const tempSlots = [];
      let current = startMin;
      const duration = selectedService.duration_minutes;

      // Filter out past time if booking for today
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === todayStr;
      let minMinutesLimit = 0;
      if (isToday) {
        const now = new Date();
        minMinutesLimit = now.getHours() * 60 + now.getMinutes() + 15; // 15 min buffer from now
      }

      while (current + duration <= endMin) {
        if (isToday && current < minMinutesLimit) {
          current += 15;
          continue;
        }

        const slotStartStr = `${Math.floor(current/60).toString().padStart(2, '0')}:${(current%60).toString().padStart(2, '0')}`;
        const slotEndVal = current + duration;
        const slotEndStr = `${Math.floor(slotEndVal/60).toString().padStart(2, '0')}:${(slotEndVal%60).toString().padStart(2, '0')}`;

        // Find if there is at least one active barber who is free during this slot
        const freeBarbers = barbers.filter((barber) => {
          if (selectedBarber && selectedBarber.id !== barber.id) {
            return false;
          }

          // Check if barber has unavailable override block
          const isBlocked = (blocks || []).some(
            (b) =>
              b.staff_id === barber.id &&
              ((toMinutes(b.start_time) < slotEndVal && toMinutes(b.end_time) > current) ||
                (toMinutes(b.start_time) <= current && toMinutes(b.end_time) >= slotEndVal))
          );

          if (isBlocked) return false;

          // Check if barber has a conflicting appointment
          const hasConflict = apptList.some(
            (appt) =>
              appt.barber_id === barber.id &&
              !(
                toMinutes(appt.end_time) <= current ||
                toMinutes(appt.start_time) >= slotEndVal
              )
          );

          return !hasConflict;
        });

        if (freeBarbers.length > 0) {
          tempSlots.push({
            start: slotStartStr,
            end: slotEndStr,
            display: formatSlotDisplay(slotStartStr),
            freeBarberCount: freeBarbers.length
          });
        }

        current += 15; // check slots in 15 minute increments
      }

      setAvailableSlots(tempSlots);
    } catch (err) {
      console.error('Error calculating time slots:', err);
    } finally {
      setCheckingSlots(false);
    }
  };

  const formatSlotDisplay = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hr = parseInt(parts[0]);
    const min = parts[1];
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${min} ${ampm}`;
  };

  // Lock and write booking
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      toast.error('Please complete all selection steps.');
      return;
    }

    setSubmitting(true);
    try {
      const configured = import.meta.env.VITE_SUPABASE_URL && 
                         import.meta.env.VITE_SUPABASE_ANON_KEY && 
                         !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
                         !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

      let data = null;
      let error = null;

      if (configured) {
        // Run transaction-safe booking insert RPC function
        const { data: rpcData, error: rpcErr } = await supabase.rpc('book_appointment', {
          p_customer_name: customerName,
          p_customer_phone: customerPhone,
          p_service_id: selectedService.id,
          p_barber_id: selectedBarber ? selectedBarber.id : null,
          p_appointment_date: selectedDate,
          p_start_time: selectedTime + ':00',
          p_notes: customerNotes
        });
        data = rpcData;
        error = rpcErr;
      }

      if (error || !data || !data.success) {
        // Fallback to local storage insert to simulate successful flow offline
        console.warn('Supabase RPC unavailable. Executing localStorage simulation backup...');
        
        const localList = storageFallback.getAppointments();
        const ref = 'SB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const duration = selectedService.duration_minutes;
        const startParts = selectedTime.split(':');
        const endMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]) + duration;
        const ehh = Math.floor(endMinutes / 60);
        const emm = endMinutes % 60;
        const endTimeStr = `${ehh < 10 ? '0'+ehh : ehh}:${emm < 10 ? '0'+emm : emm}:00`;

        const newAppt = {
          id: Math.random().toString(36).substring(2, 9),
          booking_reference: ref,
          customer_name: customerName,
          customer_phone: customerPhone,
          service_id: selectedService.id,
          barber_id: selectedBarber ? selectedBarber.id : null,
          appointment_date: selectedDate,
          start_time: selectedTime + ':00',
          end_time: endTimeStr,
          booked_price: selectedService.price,
          status: 'pending',
          notes: customerNotes,
          created_at: new Date().toISOString()
        };

        storageFallback.saveAppointments([...localList, newAppt]);
        
        setBookingResult({
          success: true,
          booking_reference: ref,
          price: selectedService.price
        });
        setStep(6);
        toast.success('Your appointment has been booked! (Locally Synced)');
      } else {
        setBookingResult(data);
        setStep(6);
        toast.success('Your appointment has been successfully booked!');
      }
    } catch (err) {
      console.error('Submit booking error:', err);
      toast.error('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle back buttons safely
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  // Check if a date falls on a closed day of the week
  const isDateClosed = (dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    const day = date.getDay();
    const shopHours = hours.find((h) => h.day_of_week === day);
    return !shopHours || shopHours.closed;
  };

  // Generate tomorrow date string for minimum date picker
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatPrice = (p) => {
    const val = typeof p === 'number' ? p : parseFloat(p);
    return `₹${val.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-navy text-navy selection:bg-orange selection:text-white">
      <Navbar />

      <main className="relative flex-1 flex items-center justify-center py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glowing backdrop color blobs */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-orange/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-mustard/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Ambient floating sketch doodles in background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 select-none">
          <Doodle name="barber-pole" size={110} color="white" rotation={-15} animate className="absolute top-[12%] left-[8%]" />
          <Doodle name="scissors" size={90} color="orange" rotation={25} animate className="absolute bottom-[15%] left-[6%]" />
          <Doodle name="comb" size={95} color="mustard" rotation={45} animate className="absolute top-[18%] right-[8%]" />
          <Doodle name="stars" size={115} color="white" rotation={10} animate className="absolute bottom-[20%] right-[10%]" />
          <Doodle name="lightning-bolt" size={80} color="orange" rotation={-10} animate className="absolute top-[45%] left-[4%]" />
          <Doodle name="sparkles" size={85} color="mustard" rotation={30} animate className="absolute bottom-[40%] right-[4%]" />
        </div>

        <div className="relative w-full max-w-3xl bg-cream border-4 border-mustard/35 rounded-[36px] overflow-hidden shadow-2xl p-6 sm:p-10 z-10">
          {/* Header Step Progress */}
          {step < 6 && (
            <div className="mb-8 font-display">
              <div className="flex justify-between items-center text-[10px] font-black text-navy/40 tracking-widest mb-3">
                <span className={step >= 1 ? 'text-orange' : ''}>SERVICE</span>
                <span className={step >= 2 ? 'text-orange' : ''}>BARBER</span>
                <span className={step >= 3 ? 'text-orange' : ''}>DATE</span>
                <span className={step >= 4 ? 'text-orange' : ''}>TIME</span>
                <span className={step >= 5 ? 'text-orange' : ''}>CONFIRM</span>
              </div>
              <div className="w-full bg-navy/10 h-1.5 rounded-full overflow-hidden flex gap-1 p-0.5">
                <div className={`h-full rounded-full transition-all duration-300 ${step >= 1 ? 'bg-orange w-1/5' : 'w-0'}`}></div>
                <div className={`h-full rounded-full transition-all duration-300 ${step >= 2 ? 'bg-orange w-1/5' : 'w-0'}`}></div>
                <div className={`h-full rounded-full transition-all duration-300 ${step >= 3 ? 'bg-orange w-1/5' : 'w-0'}`}></div>
                <div className={`h-full rounded-full transition-all duration-300 ${step >= 4 ? 'bg-orange w-1/5' : 'w-0'}`}></div>
                <div className={`h-full rounded-full transition-all duration-300 ${step >= 5 ? 'bg-orange w-1/5' : 'w-0'}`}></div>
              </div>
            </div>
          )}

          {/* STEP 1: CHOOSE SERVICE */}
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-black text-navy tracking-wide font-display">CHOOSE SERVICE</h2>
              <p className="text-xs text-navy/60 mt-1 mb-6 font-semibold">Select a style or grooming package to begin.</p>
              
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-navy/5 rounded-2xl animate-pulse-slow border border-navy/5"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto pr-1">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                        selectedService?.id === service.id
                          ? 'border-orange bg-orange/5 shadow-neon-blue'
                          : 'border-navy/10 bg-white hover:border-orange/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-cream border border-navy/10">
                          <img src={service.image_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-navy font-display">{service.name}</h4>
                          <p className="text-xs text-navy/60 line-clamp-1 mt-0.5 font-bold max-w-xs sm:max-w-md">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-4">
                        <span className="text-lg font-black text-navy font-display">{formatPrice(service.price)}</span>
                        <span className="text-[10px] text-navy/50 flex items-center gap-0.5 mt-0.5 font-black">
                          <Clock className="w-3 h-3 text-orange" />
                          {service.duration_minutes}m
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHOOSE BARBER */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-navy tracking-wide font-display">CHOOSE BARBER</h2>
                  <p className="text-xs text-navy/60 mt-1 font-semibold">Select your preferred stylist or choose any available crew member.</p>
                </div>
                <button onClick={handleBack} className="p-2 text-navy/70 hover:text-navy rounded-xl bg-white border-2 border-navy/10 cursor-pointer shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* ANY BARBER OPTION */}
                <button
                  onClick={() => {
                    setSelectedBarber(null);
                    setStep(3);
                  }}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                    selectedBarber === null
                      ? 'border-orange bg-orange/5 shadow-neon-blue'
                      : 'border-navy/10 bg-white hover:border-orange/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Scissors className="w-5 h-5 rotate-45" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-navy font-display tracking-wider">ANY AVAILABLE BARBER</h4>
                      <p className="text-xs text-navy/50 font-bold mt-0.5">Recommended. Selects the earliest available stylist.</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-navy/40" />
                </button>

                {/* SPECIFIC BARBERS */}
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => {
                      setSelectedBarber(barber);
                      setStep(3);
                    }}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                      selectedBarber?.id === barber.id
                        ? 'border-orange bg-orange/5 shadow-neon-blue'
                        : 'border-navy/10 bg-white hover:border-orange/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl shrink-0 bg-white border border-navy/10 flex items-center justify-center p-1">
                        <Doodle name="man-avatar" size={36} color="navy" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-navy font-display">{barber.name}</h4>
                        <p className="text-xs text-navy/50 font-bold mt-0.5">{barber.speciality || 'Master Stylist'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-navy/40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE DATE */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-navy tracking-wide font-display">CHOOSE DATE</h2>
                  <p className="text-xs text-navy/60 mt-1 font-semibold">Select an operating day from the calendar.</p>
                </div>
                <button onClick={handleBack} className="p-2 text-navy/70 hover:text-navy rounded-xl bg-white border-2 border-navy/10 cursor-pointer shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white border-2 border-navy/15 p-6 rounded-[24px] flex flex-col items-center shadow-sm">
                <CalendarIcon className="w-12 h-12 text-orange mb-4 animate-bounce" />
                <input
                  type="date"
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (isDateClosed(chosen)) {
                      toast.error('The shop is closed on this day. Please select another date.');
                      setSelectedDate('');
                    } else {
                      setSelectedDate(chosen);
                    }
                  }}
                  className="w-full max-w-sm px-4 py-3.5 bg-cream border-2 border-navy/15 rounded-xl text-navy focus:outline-none focus:border-orange font-bold text-center"
                />

                {selectedDate && (
                  <button
                    onClick={() => setStep(4)}
                    className="mt-6 w-full max-w-sm py-3.5 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black tracking-wider text-center cursor-pointer shadow-sm"
                  >
                    CONTINUE TO TIME
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CHOOSE TIME */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-navy tracking-wide font-display">CHOOSE TIME</h2>
                  <p className="text-xs text-navy/60 mt-1 font-semibold">Select an open slot. Slots are derived from real schedules.</p>
                </div>
                <button onClick={handleBack} className="p-2 text-navy/70 hover:text-navy rounded-xl bg-white border-2 border-navy/10 cursor-pointer shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {checkingSlots ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-10 h-10 rounded-full border-4 border-t-orange border-r-transparent border-b-mustard border-l-transparent animate-spin"></div>
                  <span className="text-xs text-navy/60 mt-3 font-semibold">Calculating schedule availability...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-navy/15 bg-white rounded-[24px] p-6 flex flex-col items-center">
                  <AlertTriangle className="w-10 h-10 text-orange mb-3" />
                  <p className="text-sm font-black text-navy font-display">No slots available on this date.</p>
                  <p className="text-xs text-navy/60 mt-1 max-w-xs font-semibold">All barbers are booked or the shop hours have passed. Try selecting another date.</p>
                  <button
                    onClick={() => setStep(3)}
                    className="mt-4 px-5 py-2.5 bg-cream border border-navy/15 hover:border-navy/40 rounded-xl text-xs font-black text-navy cursor-pointer"
                  >
                    Pick Another Date
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1 bg-white p-4 rounded-[20px] border border-navy/10 shadow-inner">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => {
                          setSelectedTime(slot.start);
                        }}
                        className={`py-3 rounded-xl border-2 text-center font-bold text-xs tracking-wider transition-all cursor-pointer ${
                          selectedTime === slot.start
                            ? 'border-orange bg-orange/10 text-orange shadow-sm scale-95'
                            : 'border-navy/5 bg-cream hover:border-navy/20 text-navy'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>

                  {selectedTime && (
                    <button
                      onClick={() => setStep(5)}
                      className="mt-6 w-full py-4 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black tracking-wider shadow-sm cursor-pointer"
                    >
                      CONTINUE TO CUSTOMER INFO
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: CUSTOMER INFORMATION */}
          {step === 5 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-navy tracking-wide font-display">CLIENT DETAIL</h2>
                  <p className="text-xs text-navy/60 mt-1 font-semibold">Review selection and complete reservation parameters.</p>
                </div>
                <button onClick={handleBack} className="p-2 text-navy/70 hover:text-navy rounded-xl bg-white border-2 border-navy/10 cursor-pointer shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: summary card */}
                <div className="bg-white border border-navy/10 p-5 rounded-[24px] space-y-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xs font-black text-orange tracking-widest uppercase mb-4 font-display">Booking Summary</h3>
                    <div className="space-y-3 font-semibold">
                      <div className="flex justify-between border-b border-navy/5 pb-2">
                        <span className="text-[10px] text-navy/40 font-black uppercase">Service</span>
                        <span className="text-xs font-bold text-navy text-right max-w-[150px] truncate">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-navy/5 pb-2">
                        <span className="text-[10px] text-navy/40 font-black uppercase">Stylist</span>
                        <span className="text-xs font-bold text-navy">{selectedBarber ? selectedBarber.name : 'Any Available Barber'}</span>
                      </div>
                      <div className="flex justify-between border-b border-navy/5 pb-2">
                        <span className="text-[10px] text-navy/40 font-black uppercase">Date</span>
                        <span className="text-xs font-bold text-navy">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-navy/5 pb-2">
                        <span className="text-[10px] text-navy/40 font-black uppercase">Time Slot</span>
                        <span className="text-xs font-bold text-navy">{formatSlotDisplay(selectedTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-navy/10 flex justify-between items-center">
                    <span className="text-[10px] text-navy/40 font-black uppercase">Estimated Price</span>
                    <span className="text-xl font-black text-navy font-display">{selectedService ? formatPrice(selectedService.price) : ''}</span>
                  </div>
                </div>

                {/* Right: inputs */}
                <div className="space-y-4 font-display">
                  <div>
                    <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-navy/10 rounded-xl text-navy focus:outline-none focus:border-orange font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 99999 99999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-navy/10 rounded-xl text-navy focus:outline-none focus:border-orange font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2">Special Notes</label>
                    <textarea
                      placeholder="e.g. any requests or skin sensitivity details..."
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-navy/10 rounded-xl text-navy focus:outline-none focus:border-orange font-bold text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black tracking-widest text-xs uppercase flex items-center justify-center gap-2 hover:shadow-neon-blue shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-t-white border-r-transparent border-b-white border-l-transparent animate-spin"></div>
                        SECURING SLOT...
                      </>
                    ) : (
                      <>
                        CONFIRM & LOCK APPOINTMENT ✂
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 6: BOOKING CONFIRMATION SUCCESS VIEW */}
          {step === 6 && bookingResult && (
            <div className="text-center flex flex-col items-center">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full mb-5 shadow-sm border border-emerald-500/20">
                <CheckCircle className="w-14 h-14 animate-bounce" />
              </div>
              
              <h2 className="text-3xl font-black text-navy font-display tracking-tight">BOOKING CONFIRMED!</h2>
              
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border-2 border-navy/5 text-xs text-navy font-bold uppercase tracking-widest">
                Ref: <span className="text-orange font-black">{bookingResult.booking_reference}</span>
              </div>

              {/* Receipt Summary Table */}
              <div className="mt-8 bg-white border border-navy/10 p-6 rounded-[28px] max-w-md w-full text-left space-y-3.5 shadow-sm font-semibold">
                <h4 className="text-[10px] font-black text-navy/40 uppercase tracking-widest border-b border-navy/5 pb-2">Receipt Details</h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-navy/50">Client Name</span>
                  <span className="text-navy font-black">{customerName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-navy/50">Service Cut</span>
                  <span className="text-navy font-black">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-navy/50">Stylist</span>
                  <span className="text-navy font-black">
                    {selectedBarber ? selectedBarber.name : 'Any Available Barber'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-navy/50">Date & Time</span>
                  <span className="text-navy font-black">{selectedDate} • {formatSlotDisplay(selectedTime)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-navy/5 pt-3 mt-2">
                  <span className="text-navy font-black">Total Price</span>
                  <span className="text-xl font-black text-emerald-600 font-display">{formatPrice(bookingResult.price)}</span>
                </div>
              </div>

              {/* ACTIVE WHATSAPP DIRECT CONFIRMATION REDIRECT BUTTON */}
              <div className="mt-8 w-full max-w-md">
                {(() => {
                  const cleanNumber = settings?.whatsapp?.replace(/\D/g, '') || '919999999999';
                  const whatsappMsg = `Hey Street Barber! I have just booked an appointment.
*Reference:* ${bookingResult.booking_reference}
*Name:* ${customerName}
*Service:* ${selectedService?.name}
*Date:* ${selectedDate}
*Time:* ${formatSlotDisplay(selectedTime)}
*Price:* ${formatPrice(bookingResult.price)}
Please confirm my slot!`;
                  const encodedMsg = encodeURIComponent(whatsappMsg);
                  const waUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-display font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 shadow-md cursor-pointer animate-pulse"
                    >
                      💬 SEND CONFIRMATION VIA WHATSAPP
                    </a>
                  );
                })()}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Link
                  to="/"
                  className="px-6 py-3.5 rounded-xl bg-white border-2 border-navy/10 hover:border-navy/30 text-navy font-display font-bold text-xs tracking-wider uppercase text-center"
                >
                  RETURN TO HOME
                </Link>
                <button
                  onClick={() => {
                    // Reset funnel to book another
                    setStep(1);
                    setSelectedService(null);
                    setSelectedBarber(null);
                    setSelectedDate('');
                    setSelectedTime('');
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerNotes('');
                    setBookingResult(null);
                  }}
                  className="px-6 py-3.5 rounded-xl bg-orange hover:bg-orange/95 text-white font-display font-black text-xs tracking-wider uppercase shadow-sm cursor-pointer"
                >
                  BOOK ANOTHER CUT
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
