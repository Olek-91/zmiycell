import type { AppState } from '../store/useAppStore'

export interface ConsumedItem {
  matId: string
  name: string
  unit: string
  amount: number
  fromPersonal: number
  fromTeam: number
  fromStock: number
  totalStock: number
  isSubstitute?: boolean
  substituteFor?: string
}

export function buildConsumed(
  store: Pick<AppState, 'materials' | 'typeMaterials' | 'assemblies' | 'prepItems'>,
  typeId: string,
  qty: number,
  workerId?: string
): ConsumedItem[] {
  const { materials, typeMaterials, assemblies, prepItems } = store

  const tms = typeMaterials.filter(tm => tm.typeId === typeId)

  const expandAssemblyFallback = (rootMatId: string, rootDeficitQty: number, rootParentName: string, currentTypeId: string): ConsumedItem[] | null => {
    const visited = new Set<string>()
    const resolve = (defMatId: string, deficitQty: number, parentName: string): ConsumedItem[] | null => {
      if (visited.has(defMatId)) return null
      visited.add(defMatId)

      const a = assemblies.find(as => as.outputMatId === defMatId)
      const fits = a && (a.isUniversal || typeMaterials.some(tm => tm.typeId === currentTypeId && tm.matId === a.outputMatId))
      if (!a || !fits) return null

      const batchesNeeded = deficitQty / a.outputQty
      const allSubs: ConsumedItem[] = []

      a.components.forEach(ac => {
        const cgm = materials.find(m => m.id === ac.matId)
        if (!cgm) return
        const compAmt = +(ac.qty * batchesNeeded).toFixed(4)

        const onHand = !workerId ? 0 : prepItems
          .filter(p => p.matId === ac.matId && (p.workerId === workerId || p.scope === 'all') && p.status === 'active')
          .reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)

        const stock = cgm.stock || 0
        const fromPersonal = +Math.min(onHand, compAmt).toFixed(4)
        const remNeed = +(compAmt - fromPersonal).toFixed(4)
        const fromStock = +Math.min(stock, remNeed).toFixed(4)

        if (fromPersonal + fromStock >= compAmt) {
          allSubs.push({
            matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: compAmt,
            fromPersonal, fromTeam: 0, fromStock, totalStock: stock,
            isSubstitute: true, substituteFor: parentName
          })
        } else {
          if (fromPersonal + fromStock > 0) {
            allSubs.push({
              matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: +(fromPersonal + fromStock).toFixed(4),
              fromPersonal, fromTeam: 0, fromStock, totalStock: stock,
              isSubstitute: true, substituteFor: parentName
            })
          }
          const nestedDeficit = +(compAmt - fromPersonal - fromStock).toFixed(4)
          const nestedSubs = resolve(ac.matId, nestedDeficit, cgm.name)
          if (nestedSubs) {
            allSubs.push(...nestedSubs)
          } else {
            allSubs.push({
              matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: nestedDeficit,
              fromPersonal: 0, fromTeam: 0, fromStock: nestedDeficit, totalStock: stock,
              isSubstitute: true, substituteFor: parentName
            })
          }
        }
      })
      return allSubs.length > 0 ? allSubs : null
    }
    return resolve(rootMatId, rootDeficitQty, rootParentName)
  }

  const matMap = new Map<string, ConsumedItem>()

  const addOrUpdate = (item: ConsumedItem) => {
    if (matMap.has(item.matId)) {
      const e = matMap.get(item.matId)!
      e.amount = +(e.amount + item.amount).toFixed(4)
      e.fromPersonal = +(e.fromPersonal + item.fromPersonal).toFixed(4)
      e.fromTeam = +(e.fromTeam + item.fromTeam).toFixed(4)
      e.fromStock = +(e.fromStock + item.fromStock).toFixed(4)
    } else {
      matMap.set(item.matId, item)
    }
  }

  tms.forEach(tm => {
    const gm = materials.find(m => m.id === tm.matId)
    if (!gm) return

    let need = +(tm.perBattery * qty).toFixed(4)
    const needOrig = need

    const myPrep = prepItems.filter(p => workerId && p.workerId === workerId && p.status === 'active')
    const allPrep = prepItems.filter(p => p.scope === 'all' && p.status === 'active')

    const pAvail = myPrep.filter(p => p.matId === tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
    const fromPersonal = +Math.min(pAvail, need).toFixed(4)
    need = +(need - fromPersonal).toFixed(4)

    const aAvail = allPrep.filter(p => p.matId === tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
    const fromTeam = +Math.min(aAvail, need).toFixed(4)
    need = +(need - fromTeam).toFixed(4)

    const fromStockDirect = +Math.min(gm.stock, need).toFixed(4)
    const deficit = +(need - fromStockDirect).toFixed(4)

    if (deficit > 0) {
      const subs = expandAssemblyFallback(tm.matId, deficit, gm.name, typeId)
      if (subs) {
        subs.forEach(addOrUpdate)
        addOrUpdate({
          matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig,
          fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock
        })
      } else {
        addOrUpdate({
          matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig,
          fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock
        })
      }
    } else {
      addOrUpdate({
        matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig,
        fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock
      })
    }
  })

  return Array.from(matMap.values())
}
