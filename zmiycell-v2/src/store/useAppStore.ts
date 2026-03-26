import { create } from 'zustand'
import { gasCall } from '../api/client'
import type { GlobalDataResponse, Material, Worker, BatteryType, TypeMaterial, Assembly, Tool, ActionLog, RepairLog, PrepItem, Payment, ToolLog } from '../types'

export interface AppState {
  materials: Material[]
  typeMaterials: TypeMaterial[]
  assemblies: Assembly[]
  batteryTypes: BatteryType[]
  workers: Worker[]
  tools: Tool[]
  log: ActionLog[]
  repairLog: RepairLog[]
  prepItems: PrepItem[]
  payments: Payment[]
  toolLog: ToolLog[]
  
  status: 'idle' | 'loading' | 'saving' | 'success' | 'error'
  error: string | null
  toast: { msg: string, type: 'info' | 'err' } | null
  
  loadAll: () => Promise<void>
  refresh: () => Promise<void>
  showToast: (msg: string, type?: 'info' | 'err') => void
}

export const useAppStore = create<AppState>((set) => ({
  materials: [],
  typeMaterials: [],
  assemblies: [],
  batteryTypes: [],
  workers: [],
  tools: [],
  log: [],
  repairLog: [],
  prepItems: [],
  payments: [],
  toolLog: [],
  
  status: 'idle',
  error: null,
  toast: null,
  
  showToast: (msg, type = 'info') => {
    set({ toast: { msg, type } })
    setTimeout(() => {
      set((state) => (state.toast?.msg === msg ? { toast: null } : {}))
    }, 3000)
  },

  loadAll: async () => {
    set({ status: 'loading', error: null })
    try {
      const data = await gasCall<GlobalDataResponse>('loadAll', [])
      set({
        status: 'success',
        materials: data.materials || [],
        typeMaterials: data.typeMaterials || [],
        assemblies: data.assemblies || [],
        batteryTypes: data.batteryTypes || [],
        workers: data.workers || [],
        tools: data.tools || [],
        log: data.log || [],
        repairLog: data.repairLog || [],
        prepItems: data.prepItems || [],
        payments: data.payments || [],
        toolLog: data.toolLog || []
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ status: 'error', error: msg })
    }
  },
  
  refresh: async () => {
    try {
      const data = await gasCall<GlobalDataResponse>('loadAll', [])
      set({
        materials: data.materials || [],
        typeMaterials: data.typeMaterials || [],
        assemblies: data.assemblies || [],
        batteryTypes: data.batteryTypes || [],
        workers: data.workers || [],
        tools: data.tools || [],
        log: data.log || [],
        repairLog: data.repairLog || [],
        prepItems: data.prepItems || [],
        payments: data.payments || [],
        toolLog: data.toolLog || []
      })
    } catch (e) {
      console.error('Failed to refresh data:', e)
    }
  }
}))
