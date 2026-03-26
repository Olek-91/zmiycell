import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardTitle, Chip } from './ui'
import { gasCall } from '../api/client'
import { getWorkerColor } from '../utils/colors'
import { G } from '../constants/theme'

export const PrepBlock: React.FC = () => {
  const { prepItems, materials, workers, assemblies, refresh } = useAppStore()
  const [filterWorker, setFilterWorker] = useState('')
  const [filterMat, setFilterMat] = useState('')

  const activePreps = prepItems.filter(p => {
    if (p.status !== 'active') return false
    if (filterWorker && p.workerId != filterWorker) return false
    if (filterMat && p.matId != filterMat) return false
    return true
  })

  // Grouping logic
  const groups = activePreps.reduce((acc, p) => {
    const key = `${p.matId}-${p.workerId}-${p.scope}`
    if (!acc[key]) {
      acc[key] = { 
        matId: p.matId, 
        workerId: p.workerId, 
        scope: p.scope, 
        items: [], 
        totalQty: 0, 
        totalRet: 0 
      }
    }
    acc[key].items.push(p)
    acc[key].totalQty += p.qty
    acc[key].totalRet += p.returnedQty
    return acc
  }, {} as Record<string, { matId: string, workerId: string, scope: string, items: typeof prepItems, totalQty: number, totalRet: number }>)

  const groupList = Object.values(groups).filter(g => (g.totalQty - g.totalRet) > 0)

  const handleReturn = async (matId: string, workerId: string, name: string) => {
    const val = window.prompt(`Повернути "${name}" на склад (введіть кількість):`)
    if (!val) return
    const num = parseFloat(val.replace(',', '.'))
    if (!num || num <= 0) return alert('Невірна кількість')

    // Find items in this group and return from them
    const groupItems = activePreps.filter(p => p.matId === matId && p.workerId === workerId)
    let remainingToReturn = num

    try {
      for (const item of groupItems) {
        if (remainingToReturn <= 0) break
        const avail = item.qty - item.returnedQty
        const toTake = Math.min(avail, remainingToReturn)
        if (toTake > 0) {
          await gasCall('returnPrepItem', [item.id, toTake])
          remainingToReturn -= toTake
        }
      }
      refresh()
    } catch {
      alert('Помилка повернення')
    }
  }

  const handleToggleScope = async (group: { items: typeof prepItems, scope: string }) => {
    const newScope = group.scope === 'all' ? 'personal' : 'all'
    try {
      // Toggle scope for all items in group
      for (const item of group.items) {
        await gasCall('updatePrepScope', [item.id, newScope])
      }
      refresh()
    } catch {
      alert('Помилка зміни області')
    }
  }

  if (groupList.length === 0) return null

  return (
    <Card>
      <CardTitle color={G.yw}>📦 АКТИВНІ ВИДАЧІ (ПІДГОТОВКА)</CardTitle>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select 
          value={filterWorker} 
          onChange={e => setFilterWorker(e.target.value)} 
          style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '6px 8px', borderRadius: 8, background: G.bg, border: `1px solid ${G.b2}`, color: G.t1 }}
        >
          <option value="">👤 Всі працівники</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select 
          value={filterMat} 
          onChange={e => setFilterMat(e.target.value)} 
          style={{ flex: 2, minWidth: 180, fontSize: 12, padding: '6px 8px', borderRadius: 8, background: G.bg, border: `1px solid ${G.b2}`, color: G.t1 }}
        >
          <option value="">📦 Всі матеріали та збірки</option>
          <optgroup label="ЗБІРКИ">
            {assemblies.map(a => <option key={a.id} value={a.outputMatId}>⚙️ {a.name}</option>)}
          </optgroup>
          <optgroup label="МАТЕРІАЛИ">
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </optgroup>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groupList.map((g, idx) => {
          const mat = materials.find(m => m.id === g.matId)
          const worker = workers.find(w => w.id === g.workerId)
          const rem = +(g.totalQty - g.totalRet).toFixed(4)
          const color = getWorkerColor(worker?.name || '')

          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${G.b1}`, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: G.t1 }}>{mat?.name || 'Невідомо'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Chip bg={`${G.b1}`} color={G.t1} style={{ fontSize: 12, padding: '2px 8px' }}>
                    {rem} {mat?.unit || 'шт'}
                  </Chip>
                  <span style={{ color: color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {worker?.name}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <button 
                  onClick={() => handleReturn(g.matId, g.workerId, mat?.name || '')}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: G.rd, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid rgba(239,68,68,0.2)` }}
                >
                  ↩ Повернути
                </button>
                <button 
                  onClick={() => handleToggleScope(g)}
                  style={{ background: 'transparent', border: `1px solid ${G.b2}`, color: G.t2, padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600 }}
                >
                  {g.scope === 'all' ? '🫂 СПІЛЬНЕ' : '👤 МОЄ'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export const StockBlock: React.FC = () => {
  const { materials, assemblies, workers, refresh, status } = useAppStore()
  const [filter, setFilter] = useState('')
  const busy = status === 'saving'

  const handleTake = async (matId: string, name: string) => {
    const val = window.prompt(`Взяти "${name}" на підготовку (кількість):`)
    if (!val) return
    const num = parseFloat(val.replace(',', '.'))
    if (!num || num <= 0) return alert('Невірна кількість')

    const wNameStr = workers.map(w => w.name).join(', ')
    const workerNameInput = window.prompt(`Для кого? Введіть ім'я (доступні: ${wNameStr}):`)
    if (!workerNameInput) return
    const worker = workers.find(w => w.name.toLowerCase().includes(workerNameInput.toLowerCase()))
    if (!worker) return alert('Не знайдено працівника')

    const isAll = window.confirm('Це спільна підготовка (для всіх)? OK = Спільна, Cancel = Персональна')

    useAppStore.setState({ status: 'saving' })
    try {
      await gasCall('addPrepItem', [matId, worker.id, num, isAll ? 'all' : 'personal', new Date().toLocaleDateString('uk-UA')])
      await refresh()
      useAppStore.setState({ status: 'success' })
    } catch {
      alert('Помилка видачі')
      useAppStore.setState({ status: 'error' })
    }
  }

  const combined = [
    ...materials,
    ...assemblies.map(a => ({
      id: `asm-${a.id}`,
      name: `⚙️ ${a.name}`,
      stock: materials.find(m => m.id === a.outputMatId)?.stock ?? 0,
      unit: a.unit,
      outputMatId: a.outputMatId,
      isAssembly: true
    }))
  ]

  const list = combined.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <CardTitle color={G.gn}>🧮 СКЛАД</CardTitle>
        <input 
          placeholder="Пошук..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          style={{ padding: '6px 12px', fontSize: 13, width: 140, borderRadius: 10, background: G.bg, border: `1px solid ${G.b2}` }}
        />
      </div>
      
      <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${G.b1}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: G.t1 }}>{m.name}</div>
              <div style={{ color: G.t2, fontSize: 11 }}>Доступно: <strong style={{color: G.t1}}>{m.stock} {m.unit}</strong></div>
            </div>
            <button 
              disabled={busy || m.stock <= 0}
              onClick={() => handleTake((m as any).outputMatId || m.id, m.name)}
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: G.gn, padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1px solid rgba(16,185,129,0.2)`, cursor: 'pointer', opacity: (busy || m.stock <= 0) ? 0.5 : 1 }}
            >
              + ВЗЯТИ
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
