export interface Material {
  id: string
  name: string
  unit: string
  stock: number
  photoUrl: string | null
  isOrdered: boolean
  shopUrl: string
  minStock: number
}

export interface TypeMaterial {
  id: string
  typeId: string
  matId: string
  perBattery: number
  minStock: number
}

export interface AssemblyComponent {
  id: string
  assemblyId: string
  matId: string
  qty: number
}

export interface Assembly {
  id: string
  name: string
  outputMatId: string
  outputQty: number
  unit: string
  notes: string
  manual: string
  isUniversal: boolean
  components: AssemblyComponent[]
}

export interface BatteryType {
  id: string
  name: string
  color: string
  manual: string
}

export interface Worker {
  id: string
  name: string
  color: string
}

export interface Tool {
  id: string
  name: string
  category: string
  count: number
  working: number
  serial: string
  notes: string
  repairNote: string
  repairDate: string
  repairBy: string
}

export interface ConsumedItem {
  matId: string
  name: string
  unit: string
  amount: number
  fromPersonal?: number
  fromTeam?: number
  fromStock?: number
  totalStock?: number
  isSubstitute?: boolean
  substituteFor?: string
}

export interface ActionLog {
  id: string
  datetime: string
  date: string
  typeId?: string
  typeName?: string
  workerName: string
  count?: number
  serials?: string[]
  consumed?: ConsumedItem[]
  kind: 'production' | 'prep' | 'repair' | 'other'
  repairNote?: string
}

export interface RepairLog {
  id: string
  datetime: string
  date: string
  serial: string
  typeName: string
  typeId: string
  originalWorker: string
  repairWorker: string
  issue: string
  note: string
  status: 'new' | 'repairing' | 'completed' | 'returned'
  consumed: ConsumedItem[]
}

export interface PrepItem {
  id: string
  date: string
  datetime: string
  matId: string
  typeId: string
  workerId: string
  workerName: string
  qty: number
  isAssembly: boolean
  status: 'active' | 'returned'
  returnedQty: number
  scope: 'personal' | 'all'
}

export interface Payment {
  id: string
  workerId: string
  workerName: string
  count: number
  date: string
  datetime: string
}

export interface ToolLog {
  id: string
  toolId: string
  toolName: string
  date: string
  datetime: string
  event: 'broken' | 'fixed' | 'added' | 'removed'
  workerName: string
  note: string
}

export interface GlobalDataResponse {
  ok: boolean
  batteryTypes: BatteryType[]
  materials: Material[]
  typeMaterials: TypeMaterial[]
  assemblies: Assembly[]
  workers: Worker[]
  tools: Tool[]
  log: ActionLog[]
  repairLog: RepairLog[]
  prepItems: PrepItem[]
  payments: Payment[]
  toolLog: ToolLog[]
}
