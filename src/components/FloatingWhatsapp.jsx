import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function FloatingWhatsapp() {
  const { settings } = useSettings();

  if (!settings?.whatsapp) return null;

  // Clean phone number (keep digits only)
  const cleanNumber = settings.whatsapp.replace(/\D/g, '');
  const encodedText = encodeURIComponent('Hey Street Barber! I would like to ask about services or appointments.');
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-neon-emerald hover:shadow-xl transition-all duration-300 hover:scale-110 group cursor-pointer"
      title="Contact on WhatsApp"
    >
      {/* Pulse effect */}
      <span className="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-ping group-hover:animate-none"></span>
      <MessageSquare className="w-6 h-6 relative z-10 font-bold" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 rounded-xl bg-barberDark-800 border border-slate-700 text-slate-200 text-xs font-semibold shadow-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none origin-right">
        Chat with us!
      </span>
    </a>
  );
}
