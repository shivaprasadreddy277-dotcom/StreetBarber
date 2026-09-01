import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Phone, MapPin, MessageSquare } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

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

export default function Footer() {
  const { settings, hours } = useSettings();

  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
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
    <footer className="bg-[#FFF9EE] border-t border-navy/10 pt-16 pb-8 text-navy font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-orange p-2 rounded-xl text-cream group-hover:rotate-12 transition-transform duration-300">
                <Scissors className="w-5 h-5" />
              </div>
              <span className="font-display font-black text-xl tracking-wider text-navy">
                {settings?.shop_name?.toUpperCase() || 'STREET BARBER'}
              </span>
            </Link>
            <p className="text-sm text-navy/70 leading-relaxed mt-2 font-medium">
              Fresh cuts. Street confidence. Premium grooming tailored for the modern street style. Your barber, your time.
            </p>
            
            {/* Social media icons */}
            <div className="flex items-center gap-3 mt-4">
              {settings?.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-navy/10 text-navy hover:text-orange hover:border-orange/30 transition-all duration-300 shadow-sm"
                  title="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-navy/10 text-navy hover:text-emerald-500 hover:border-emerald-500/30 transition-all duration-300 shadow-sm"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-bold text-base mb-4 tracking-wide uppercase text-navy">Quick Links</h3>
            <ul className="flex flex-col gap-3 text-sm font-semibold text-navy/80">
              <li>
                <a href="#home" className="hover:text-orange transition-colors">Home</a>
              </li>
              <li>
                <a href="#about" className="hover:text-orange transition-colors">About</a>
              </li>
              <li>
                <a href="#services" className="hover:text-orange transition-colors">Styles</a>
              </li>
              <li>
                <a href="#barbers" className="hover:text-orange transition-colors">Our Barbers</a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-orange transition-colors">Gallery</a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="font-display font-bold text-base mb-4 tracking-wide uppercase text-navy">Contact Us</h3>
            <ul className="flex flex-col gap-4 text-sm font-semibold text-navy/85">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange shrink-0 mt-0.5" />
                <a
                  href={settings?.map_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange transition-colors leading-relaxed"
                >
                  {settings?.address || '123 Grunge Avenue, Sector 7'}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange shrink-0" />
                <a href={`tel:${settings?.phone}`} className="hover:text-orange transition-colors">
                  {settings?.phone || '+1 (555) 987-6543'}
                </a>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-display font-bold text-base mb-4 tracking-wide uppercase text-navy">Opening Hours</h3>
            <div className="flex flex-col gap-2 text-sm font-semibold text-navy/80">
              {hours && hours.length > 0 ? (
                hours.map((h) => (
                  <div key={h.id} className="flex justify-between items-center border-b border-navy/5 pb-1.5">
                    <span className="font-medium text-navy/70">{getDayName(h.day_of_week)}</span>
                    <span className="text-navy">
                      {h.closed ? (
                        <span className="text-orange font-bold text-xs bg-orange/10 px-2.5 py-0.5 rounded-full uppercase">Closed</span>
                      ) : (
                        `${formatTime(h.opening_time)} - ${formatTime(h.closing_time)}`
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <p>Loading shop hours...</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-navy/10 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-navy/55">
          <p>© {new Date().getFullYear()} {settings?.shop_name || 'Street Barber'}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-orange transition-colors">Staff Login</Link>
            <a href="#" className="hover:text-orange transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-orange transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
