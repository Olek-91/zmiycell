import { create } from 'zustand';
import { Material, BATTERY_TYPES, BatteryType } from '@/lib/constants';

interface AppStore {
  materials: Material[];
  productionLog: any[];
  status: 'idle' | 'saving' | 'success' | 'error';
  snakeActive: boolean;
  
  // Actions
  addProduction: (typeId: string, qty: number, worker: string, serials: string[]) => Promise<void>;
  setSnakeActive: (active: boolean) => void;
  updateStock: (matId: string, amount: number) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  materials: [
    { id: 'CELL_230', name: '230Ah Cells', unit: 'шт', stock: 100 },
    { id: 'CELL_150', name: '150Ah Cells', unit: 'шт', stock: 50 },
    { id: 'BMS_JK_16S', name: 'JK BMS 16S', unit: 'шт', stock: 10 },
    { id: 'ANDERSON_175', name: 'Anderson 175A', unit: 'шт', stock: 20 },
    // Mock data for initial dev
  ],
  productionLog: [],
  status: 'idle',
  snakeActive: false,

  setSnakeActive: (active) => set({ snakeActive: active }),

  updateStock: (matId, amount) => {
    console.log(`[STOCK] Updating ${matId} by ${amount}`);
    set((state) => ({
      materials: state.materials.map(m => 
        m.id === matId ? { ...m, stock: m.stock + amount } : m
      )
    }));
  },

  addProduction: async (typeId, qty, worker, serials) => {
    set({ status: 'saving' });
    const type = BATTERY_TYPES.find(t => t.id === typeId);
    if (!type) return set({ status: 'error' });

    // Deduct BOM components
    type.bom.forEach(item => {
      get().updateStock(item.matId, -(item.qty * qty));
    });

    // Mock delay for "saving"
    await new Promise(r => setTimeout(r, 1000));

    set({ 
      status: 'success', 
      snakeActive: true,
      productionLog: [
        { id: Math.random().toString(), typeId, qty, worker, serials, date: new Date().toISOString() },
        ...get().productionLog
      ]
    });

    setTimeout(() => set({ status: 'idle' }), 2000);
  }
}));
