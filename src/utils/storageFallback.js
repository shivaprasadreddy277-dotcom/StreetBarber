// Street Barber - LocalStorage Persistence Fallback Utility
// Allows the admin dashboard to CRUD services, barbers, and settings in-browser.

const KEYS = {
  SERVICES: 'sb_services_data',
  BARBERS: 'sb_barbers_data',
  GALLERY: 'sb_gallery_data',
  SETTINGS: 'sb_settings_data',
  HOURS: 'sb_hours_data',
  APPOINTMENTS: 'sb_appointments_data'
};

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

const MOCK_GALLERY = [
  { id: 'g1111111-1111-1111-1111-111111111111', image_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', caption: 'Skin Fade with Textured Top', active: true },
  { id: 'g2222222-2222-2222-2222-222222222222', image_url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=600&q=80', caption: 'Sharp Beard Shape & Trim', active: true },
  { id: 'g3333333-3333-3333-3333-333333333333', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', caption: 'Vibrant Salon Vibe', active: true },
  { id: 'g4444444-4444-4444-4444-444444444444', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', caption: 'Executive Hair & Beard Combo', active: true }
];

const DEFAULT_SETTINGS = {
  shop_name: 'Street Barber',
  phone: '+91 99999 99999',
  whatsapp: '+919999999999',
  address: 'LB Nagar, near Kamineni Hospital, Hyderabad, India',
  map_url: 'https://maps.google.com/?q=Kamineni+Hospital+LB+Nagar',
  instagram: 'https://instagram.com/streetbarber',
  booking_enabled: true
};

const DEFAULT_HOURS = [
  { id: 1, day_of_week: 0, closed: true },
  { id: 2, day_of_week: 1, opening_time: '09:00:00', closing_time: '19:00:00', closed: false },
  { id: 3, day_of_week: 2, opening_time: '09:00:00', closing_time: '19:00:00', closed: false },
  { id: 4, day_of_week: 3, opening_time: '09:00:00', closing_time: '19:00:00', closed: false },
  { id: 5, day_of_week: 4, opening_time: '09:00:00', closing_time: '19:00:00', closed: false },
  { id: 6, day_of_week: 5, opening_time: '09:00:00', closing_time: '20:00:00', closed: false },
  { id: 7, day_of_week: 6, opening_time: '09:00:00', closing_time: '18:00:00', closed: false }
];

export const storageFallback = {
  getServices: () => {
    const val = localStorage.getItem(KEYS.SERVICES);
    if (!val) {
      localStorage.setItem(KEYS.SERVICES, JSON.stringify(MOCK_SERVICES));
      return MOCK_SERVICES;
    }
    return JSON.parse(val);
  },
  saveServices: (list) => {
    localStorage.setItem(KEYS.SERVICES, JSON.stringify(list));
  },
  
  getBarbers: () => {
    const val = localStorage.getItem(KEYS.BARBERS);
    if (!val) {
      localStorage.setItem(KEYS.BARBERS, JSON.stringify(MOCK_BARBERS));
      return MOCK_BARBERS;
    }
    return JSON.parse(val);
  },
  saveBarbers: (list) => {
    localStorage.setItem(KEYS.BARBERS, JSON.stringify(list));
  },
  
  getGallery: () => {
    const val = localStorage.getItem(KEYS.GALLERY);
    if (!val) {
      localStorage.setItem(KEYS.GALLERY, JSON.stringify(MOCK_GALLERY));
      return MOCK_GALLERY;
    }
    return JSON.parse(val);
  },
  saveGallery: (list) => {
    localStorage.setItem(KEYS.GALLERY, JSON.stringify(list));
  },
  
  getSettings: () => {
    const val = localStorage.getItem(KEYS.SETTINGS);
    if (!val) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(val);
    if (parsed.address && (parsed.address.includes('MG Road') || parsed.address.includes('Bangalore') || parsed.address.includes('Grunge'))) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return parsed;
  },
  saveSettings: (obj) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(obj));
  },
  
  getHours: () => {
    const val = localStorage.getItem(KEYS.HOURS);
    if (!val) {
      localStorage.setItem(KEYS.HOURS, JSON.stringify(DEFAULT_HOURS));
      return DEFAULT_HOURS;
    }
    return JSON.parse(val);
  },
  saveHours: (list) => {
    localStorage.setItem(KEYS.HOURS, JSON.stringify(list));
  },

  getAppointments: () => {
    const val = localStorage.getItem(KEYS.APPOINTMENTS);
    return val ? JSON.parse(val) : [];
  },
  saveAppointments: (list) => {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(list));
  }
};
