"use client";

import React, { useEffect, useState } from 'react';
import { Battery, Radio, Settings, Wrench, Package, Truck, LayoutDashboard, Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ShiftBattery() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const start = new Date();
      start.setHours(8, 0, 0);
      const end = new Date();
      end.setHours(17, 0, 0);

      if (now < start) setPercent(0);
      else if (now > end) setPercent(100);
      else {
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        setPercent(Math.round((elapsed / total) * 100));
      }
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-dim border border-edge rounded-full">
      <div className="relative w-6 md:w-8 h-3 md:h-4 border border-foreground/30 rounded-sm overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-toxic transition-all duration-1000" 
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[9px] md:text-[10px] font-bold text-toxic whitespace-nowrap">
        {percent}% <span className="hidden xs:inline">SHIFT</span>
      </span>
    </div>
  );
}

export function RockRadio() {
  const [playing, setPlaying] = useState(false);
  
  return (
    <button 
      onClick={() => setPlaying(!playing)}
      className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-full border transition-all duration-300 ${
        playing ? 'bg-toxic/10 border-toxic text-toxic animate-pulse' : 'bg-dim border-edge text-foreground/50 hover:text-foreground'
      }`}
    >
      <Radio size={14} />
      <span className="text-[9px] md:text-[10px] font-bold whitespace-nowrap overflow-hidden max-w-[100px]">ROCK BALLADS</span>
      {playing && (
        <audio 
          autoPlay 
          src="https://streamingv2.shoutcast.com/rockballads" // Example stream
          onError={() => setPlaying(false)}
        />
      )}
    </button>
  );
}

export function Navigation({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'DASHBOARD', href: '/', icon: LayoutDashboard },
    { name: 'PRODUCTION', href: '/', icon: Package }, // Redirecting for now
    { name: 'REPAIRS', href: '/', icon: Wrench },
    { name: 'LOGISTICS', href: '/', icon: Truck },
    { name: 'ADMIN', href: '/', icon: Settings },
  ];

  return (
    <nav className="flex flex-col gap-1 py-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-bold transition-all duration-200 border-l-2 ${
              isActive 
                ? 'bg-toxic/15 border-toxic text-toxic' 
                : 'border-transparent text-foreground/40 hover:text-foreground hover:bg-white/5'
            }`}
          >
            <item.icon size={18} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="md:hidden w-12 h-12 flex items-center justify-center text-foreground/50 hover:text-toxic transition-colors relative z-50 cursor-pointer touch-manipulation"
        aria-label="Open Menu"
      >
        <Menu size={26} />
      </button>

      {/* Drawer Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-edge z-[200] transition-transform duration-300 md:hidden ${
        open ? 'translate-x-0 shadow-[0_0_100px_rgba(0,0,0,0.8)]' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-edge flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Zap className="text-toxic fill-toxic/20" size={20} />
             <span className="text-sm font-black tracking-tighter">zmiyCell OS</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-foreground/40 hover:text-toxic">
            <X size={20} />
          </button>
        </div>
        <Navigation onItemClick={() => setOpen(false)} />
        <div className="mt-auto p-4 border-t border-edge text-[8px] text-foreground/20 font-bold uppercase tracking-widest">
            Slide Menu v1.0
        </div>
      </aside>
    </>
  );
}
