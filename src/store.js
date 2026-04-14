import { create } from 'zustand'
import { gasCall } from './api.js'

export const useStore = create((set, get) => ({
  materials: [],
  typeMaterials: [],
  assemblies: [],
  batteryTypes: [],
  workers: [],
  log: [],
  prepItems: [],
  payments: [],
  tools: [],
  toolLog: [],
  repairLog: [],
  radioStations: [],
  playback: { isPlaying: false, stationIndex: 0 },
  backendVersion: '...',
  
  sync: 'loading',
  
  loadAll: async () => {
    set({ sync: 'loading' })
    try {
      const resp = await gasCall('loadAll')
      const sortByName = (arr) => [...(arr || [])].sort((a,b) => (a.name || '').localeCompare(b.name || '', 'uk'))
      const dedupeRadio = (arr) => {
        const seen = new Set()
        return sortByName(arr || []).filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true })
      }
      set({
        materials:     sortByName(resp.materials),
        typeMaterials: resp.typeMaterials || [],
        assemblies:    sortByName(resp.assemblies),
        batteryTypes:  sortByName(resp.batteryTypes),
        workers:       sortByName(resp.workers),
        log:           resp.log || [],
        prepItems:     resp.prepItems || [],
        payments:      resp.payments || [],
        tools:         sortByName(resp.tools),
        toolLog:       resp.toolLog || [],
        repairLog:     resp.repairLog || [],
        radioStations: dedupeRadio(resp.radioStations),
        backendVersion: resp.version || '?',
        sync: 'ok'
      })
    } catch (e) {
      console.error('Load Error:', e)
      set({ sync: 'error' })
    }
  },

  refresh: async () => {
    try {
      const resp = await gasCall('loadAll')
      const sortByName = (arr) => [...(arr || [])].sort((a,b) => (a.name || '').localeCompare(b.name || '', 'uk'))
      const dedupeRadio = (arr) => {
        const seen = new Set()
        return sortByName(arr || []).filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true })
      }
      set({
        materials:     sortByName(resp.materials),
        typeMaterials: resp.typeMaterials || [],
        assemblies:    sortByName(resp.assemblies),
        batteryTypes:  sortByName(resp.batteryTypes),
        workers:       sortByName(resp.workers),
        log:           resp.log || [],
        prepItems:     resp.prepItems || [],
        payments:      resp.payments || [],
        tools:         sortByName(resp.tools),
        toolLog:       resp.toolLog || [],
        repairLog:     resp.repairLog || [],
        radioStations: dedupeRadio(resp.radioStations),
        backendVersion: resp.version || '?',
        sync: 'ok'
      })
    } catch (e) {
      set({ sync: 'error' })
    }
  },

  setMaterials: (v) => set(s => ({ materials: typeof v === 'function' ? v(s.materials) : v })),
  setTypeMaterials: (v) => set(s => ({ typeMaterials: typeof v === 'function' ? v(s.typeMaterials) : v })),
  setAssemblies: (v) => set(s => ({ assemblies: typeof v === 'function' ? v(s.assemblies) : v })),
  setBatteryTypes: (v) => set(s => ({ batteryTypes: typeof v === 'function' ? v(s.batteryTypes) : v })),
  setWorkers: (v) => set(s => ({ workers: typeof v === 'function' ? v(s.workers) : v })),
  setLog: (v) => set(s => ({ log: typeof v === 'function' ? v(s.log) : v })),
  setPrepItems: (v) => set(s => ({ prepItems: typeof v === 'function' ? v(s.prepItems) : v })),
  setPayments: (v) => set(s => ({ payments: typeof v === 'function' ? v(s.payments) : v })),
  setTools: (v) => set(s => ({ tools: typeof v === 'function' ? v(s.tools) : v })),
  setToolLog: (v) => set(s => ({ toolLog: typeof v === 'function' ? v(s.toolLog) : v })),
  setRepairLog: (v) => set(s => ({ repairLog: typeof v === 'function' ? v(s.repairLog) : v })),
  setRadioStations: (v) => set(s => ({ radioStations: typeof v === 'function' ? v(s.radioStations) : v })),
  setPlayback: (v) => set(s => ({ playback: { ...s.playback, ...(typeof v === 'function' ? v(s.playback) : v) } })),
  setSync: (v) => set(s => ({ sync: typeof v === 'function' ? v(s.sync) : v })),
}))
