"use client";

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BATTERY_TYPES } from '@/lib/constants';
import { SnakeFeedback } from '@/components/SnakeFeedback';
import { Package, ShieldAlert, Cpu, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const store = useAppStore();
  const [selType, setSelType] = useState(BATTERY_TYPES[0].id);
  const [qty, setQty] = useState(1);
  const [startSN, setStartSN] = useState('501');
  const [worker, setWorker] = useState('Oleh');
  const [showGate, setShowGate] = useState(false);

  const activeType = BATTERY_TYPES.find(t => t.id === selType)!;
  const serials = Array.from({ length: qty }, (_, i) => `SN-${activeType.name.split(' ')[0]}-${parseInt(startSN) + i}`);

  const handleSave = async () => {
    console.log('--- HANDLE SAVE CALLED ---');
    console.log('Type:', selType, 'Qty:', qty, 'Worker:', worker);
    setShowGate(false);
    await store.addProduction(selType, qty, worker, serials);
    console.log('--- ADD PRODUCTION FINISHED ---');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 pb-32">
      <SnakeFeedback 
        active={store.snakeActive} 
        onComplete={() => store.setSnakeActive(false)} 
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden p-6 md:p-8 border border-edge bg-card rounded-2xl group transition-all duration-500 hover:border-toxic/30 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Package size={160} className="md:size-[200px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-1 md:gap-2">
          <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-toxic uppercase">PRODUCTION WORKLOAD</span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground drop-shadow-sm">zmiyCell OS v1.0</h1>
          <p className="text-xs md:text-sm text-foreground/40 max-w-sm">
            Automatic BOM deduction. Batch serial generation. 
            Real-time sync.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        
        {/* Production Form */}
        <section className="space-y-6">
          <div className="p-6 bg-card border border-edge rounded-2xl space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-black tracking-widest text-foreground/50 border-b border-edge pb-4 mb-4 uppercase">
              <Cpu size={14} className="text-toxic" /> Core Production
            </h2>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/30 uppercase pl-1">Battery Type</label>
              <div className="grid grid-cols-1 gap-2">
                {BATTERY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelType(t.id)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-300 active:scale-[0.98] active:bg-toxic/20",
                      selType === t.id 
                        ? 'bg-toxic/5 border-toxic text-toxic' 
                        : 'bg-dim border-edge text-foreground/40 hover:border-foreground/20 hover:text-foreground'
                    )}
                  >
                    <span>{t.name}</span>
                    {selType === t.id && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground/30 uppercase pl-1">Start SN</label>
                <input 
                  type="text" 
                  value={startSN}
                  onChange={(e) => setStartSN(e.target.value)}
                  className="w-full bg-dim border border-edge text-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-toxic/50 text-xs font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground/30 uppercase pl-1">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-dim border border-edge text-foreground px-4 py-3 rounded-xl focus:outline-none focus:border-toxic/50 text-xs font-bold"
                />
              </div>
            </div>

            <button 
              onClick={() => setShowGate(true)}
              className="w-full py-4 bg-toxic text-black font-black text-xs tracking-widest rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] active:scale-95 active:brightness-90 uppercase flex items-center justify-center gap-2 mt-4"
            >
              <Zap size={14} fill="currentColor" /> Initiate Production
            </button>
          </div>

          {/* Quick Stock Monitor - Added for Verifying Deductions */}
          <div className="p-6 bg-card border border-edge rounded-2xl space-y-4">
            <h2 className="flex items-center gap-2 text-[10px] font-black tracking-widest text-foreground/30 uppercase">
              Current Stock Status
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {store.materials.slice(0, 4).map(m => (
                <div key={m.id} className="p-3 bg-dim border border-edge rounded-xl">
                  <div className="text-[8px] font-bold text-foreground/30 uppercase mb-1">{m.name}</div>
                  <div className="text-sm font-black text-toxic">{m.stock} <span className="text-[8px] text-foreground/20">{m.unit}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview & Serials */}
        <section className="space-y-6">
          <div className="p-6 bg-card border border-edge rounded-2xl h-full flex flex-col">
            <h2 className="flex items-center gap-2 text-xs font-black tracking-widest text-foreground/50 border-b border-edge pb-4 mb-4 uppercase">
              <Package size={14} className="text-electric" /> Batch Preview
            </h2>
            
            <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {serials.map((sn, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-dim border border-edge rounded-lg group hover:border-toxic/30 transition-colors">
                  <span className="text-[10px] text-foreground/30 font-bold">#{(parseInt(startSN) + i).toString().padStart(3, '0')}</span>
                  <span className="text-xs font-bold text-foreground group-hover:text-toxic transition-colors">{sn}</span>
                  <ChevronRight size={12} className="text-foreground/10 group-hover:text-toxic/50" />
                </div>
              ))}
            </div>

            <div className="pt-6 mt-auto border-t border-edge">
              <div className="p-4 bg-dim rounded-xl border border-edge">
                <div className="flex items-center justify-between text-[10px] font-bold text-foreground/30 uppercase mb-2">
                  <span>BOM Summary</span>
                  <span>{qty} Units</span>
                </div>
                <div className="space-y-1">
                  {activeType.bom.map(item => (
                    <div key={item.matId} className="flex justify-between text-[10px] font-bold">
                      <span className="text-foreground/60">{item.matId}</span>
                      <span className="text-toxic">{(item.qty * qty).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Mobile Debugger */}
      <div className="p-4 bg-black border border-edge rounded-xl mt-8">
        <h3 className="text-[8px] font-bold text-foreground/30 uppercase mb-2">System Logs (Mobile Debug)</h3>
        <div id="mobile-logs" className="text-[10px] font-mono text-toxic max-h-32 overflow-y-auto space-y-1">
          <div>&gt; Waiting for hydration...</div>
        </div>
      </div>

      {/* Safety Gate Modal */}
      {showGate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-6">
          <div className="w-full max-w-md bg-card border border-scrap/30 p-8 rounded-3xl shadow-[0_0_100px_rgba(255,49,49,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-scrap/10 rounded-full text-scrap animate-pulse">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tighter">SAFETY GATE</h3>
              <p className="text-xs text-foreground/40 leading-relaxed uppercase tracking-wider">
                About to deduct <b className="text-toxic">{qty} units</b> of <b className="text-toxic">{activeType.name}</b> from stock. 
                Negative balance checks active. Proceed?
              </p>
              
              <div className="w-full h-px bg-edge my-4" />
              
              <div className="w-full grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowGate(false)}
                  className="py-4 bg-dim border border-edge text-foreground/40 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:text-foreground transition-colors"
                >
                  Aborting
                </button>
                <button 
                  onClick={handleSave}
                  className="py-4 bg-scrap text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(255,49,49,0.3)] hover:scale-105 transition-transform"
                >
                  Override & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
