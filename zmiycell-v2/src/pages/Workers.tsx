import React, { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardTitle, Chip } from '../components/ui'
import { gasCall } from '../api/client'
import type { Worker } from '../types'

import { getWorkerColor } from '../utils/colors'

const uid = () => Math.random().toString(36).substring(2, 9)

export const WorkersPage: React.FC = () => {
  const { workers, log, payments, refresh } = useAppStore()
  const [newName, setNewName] = useState('')
  const isAdmin = true // Assumed admin for testing this view

  const paidByWorker = useMemo(() => {
    const map: Record<string, number> = {}
    payments.forEach(p => {
      const key = p.workerId || p.workerName
      if (!key) return
      map[key] = (map[key] || 0) + (p.count || 0)
    })
    return map
  }, [payments])

  const producedByName = useMemo(() => {
    const map: Record<string, number> = {}
    log.filter(l => l.kind === 'production').forEach(l => {
      const key = l.workerName
      if (!key) return
      map[key] = (map[key] || 0) + (l.count || 0)
    })
    return map
  }, [log])

  const addWorker = async () => {
    if (!newName.trim()) return alert('Введіть ім\'я')
    const w: Worker = { id: 'w' + uid(), name: newName.trim(), color: '' }
    try {
      await gasCall('saveWorker', [w])
      setNewName('')
      refresh()
    } catch {
      alert('Помилка збереження')
    }
  }

  const deleteWorker = async (w: Worker) => {
    if (!window.confirm(`Видалити працівника ${w.name}?`)) return
    try {
      await gasCall('deleteWorker', [w.id])
      refresh()
    } catch {
      alert('Помилка видалення')
    }
  }

  const addPayment = async (w: Worker) => {
    const val = window.prompt(`Оплачено для ${w.name} (кількість):`)
    if (!val) return
    const cnt = parseInt(val)
    if (!cnt || cnt <= 0) return alert('Невірна кількість')
    
    const entry = {
      id: uid(),
      workerId: w.id,
      workerName: w.name,
      count: cnt,
      date: new Date().toLocaleDateString('uk-UA'),
      datetime: new Date().toLocaleString('uk-UA')
    }
    
    try {
      await gasCall('addPayment', [entry])
      refresh()
    } catch {
      alert('Помилка оплати')
    }
  }

  const updateColor = (w: Worker, hex: string) => {
    // In a real app we'd debounce this or manage local state, but we'll do simple for now
    gasCall('saveWorker', [{ ...w, color: hex }]).then(() => refresh())
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <CardTitle>👷 КОМАНДА ({workers.length})</CardTitle>
        {workers.map(w => {
          const produced = producedByName[w.name] || 0
          const paid = paidByWorker[w.id] || paidByWorker[w.name] || 0
          const unpaid = Math.max(0, produced - paid)
          const color = getWorkerColor(w.name, w.color)

          return (
            <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdmin && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <input
                        type="color"
                        defaultValue={color}
                        title="Змінити колір працівника"
                        onBlur={(e) => updateColor(w, e.target.value)}
                        style={{ width: 40, height: 40, padding: 0, margin: -8, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                  <span style={{ fontSize: 16, color, fontWeight: 700 }}>{w.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {isAdmin && (
                    <button
                      onClick={() => addPayment(w)}
                      style={{ background: 'rgba(16, 185, 129, 0.15)', border: `1px solid var(--accent-success)`, color: 'var(--accent-success)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                    >
                      + Оплачено
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => deleteWorker(w)}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: 'var(--accent-danger)', padding: '4px 10px', borderRadius: 8, fontSize: 12 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Chip bg="rgba(255,255,255,0.05)" color="var(--text-secondary)">Вироблено: {produced}</Chip>
                <Chip bg="rgba(16, 185, 129, 0.15)" color="var(--accent-success)" bd="rgba(16, 185, 129, 0.3)">Оплачено: {paid}</Chip>
                <Chip bg="rgba(245, 158, 11, 0.15)" color="var(--accent-warning)" bd="rgba(245, 158, 11, 0.3)">Неопл.: {unpaid}</Chip>
              </div>
            </div>
          )
        })}
      </Card>

      {isAdmin && (
        <Card>
          <CardTitle color="var(--accent-success)">+ ДОДАТИ ПРАЦІВНИКА</CardTitle>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              placeholder="Ім'я та прізвище"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWorker()}
            />
            <button
              onClick={addWorker}
              style={{ padding: '8px 16px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + ДОДАТИ
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
