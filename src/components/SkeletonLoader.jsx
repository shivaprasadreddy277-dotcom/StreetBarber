import React from 'react';

export default function SkeletonLoader({ type = 'card-grid', count = 3 }) {
  if (type === 'card-grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-barberDark-800 border border-slate-800/40 rounded-2xl overflow-hidden glass-panel">
            <div className="h-48 w-full bg-barberDark-900 animate-pulse-slow"></div>
            <div className="p-5 flex flex-col gap-3">
              <div className="h-6 w-2/3 bg-barberDark-900 rounded-lg animate-pulse-slow"></div>
              <div className="h-4 w-full bg-barberDark-900 rounded-lg animate-pulse-slow"></div>
              <div className="h-4 w-5/6 bg-barberDark-900 rounded-lg animate-pulse-slow"></div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-barberDark-900">
                <div className="h-5 w-16 bg-barberDark-900 rounded-lg animate-pulse-slow"></div>
                <div className="h-9 w-24 bg-barberDark-900 rounded-lg animate-pulse-slow"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-barberDark-800 border border-slate-800/40 rounded-xl animate-pulse-slow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-barberDark-900"></div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-28 bg-barberDark-900 rounded"></div>
                <div className="h-3 w-20 bg-barberDark-900 rounded"></div>
              </div>
            </div>
            <div className="h-8 w-20 bg-barberDark-900 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-barberDark-800 border border-slate-800/40 rounded-xl h-24 animate-pulse-slow">
              <div className="h-4 w-12 bg-barberDark-900 rounded mb-2"></div>
              <div className="h-8 w-16 bg-barberDark-900 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-64 bg-barberDark-800 border border-slate-800/40 rounded-xl animate-pulse-slow"></div>
      </div>
    );
  }

  return null;
}
