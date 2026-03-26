import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardTitle, Chip, QtySelector, SubmitBtn, Modal, FormRow, Label } from '../components/ui'
import { gasCall } from '../api/client'
import { G } from '../constants/theme'
import { haptic } from '../utils/haptic'
import type { Tool } from '../types'

export const Tools: React.FC = () => {
  const { tools, workers, refresh, status, showToast } = useAppStore()
  const [tab, setTab] = useState<'active' | 'repairs'>('active')

  const busy = status === 'saving'
  
  const [repairModal, setRepairModal] = useState<Tool | null>(null)
  const [repairNote, setRepairNote] = useState('')
  const [repairWorker, setRepairWorker] = useState('')

  const activeTools = tools.filter(t => (t.working || 0) > 0)
  const brokenTools = tools.filter(t => (t.count || 0) > (t.working || 0))

  const handleUpdateWorking = async (t: Tool, nextVal: number) => {
    if (nextVal < 0 || nextVal > t.count) return
    useAppStore.setState({ status: 'saving' })
    try {
      await gasCall('updateToolCount', [t.id, t.count, nextVal])
      await refresh()
      useAppStore.setState({ status: 'success' })
      showToast('Оновлено', 'info')
    } catch {
      showToast('Помилка оновлення', 'err')
      useAppStore.setState({ status: 'error' })
    }
  }

  const submitRepair = async () => {
    if (!repairModal || !repairNote) return
    useAppStore.setState({ status: 'saving' })
    try {
      const wLabel = workers.find(w => w.id === repairWorker)?.name || ''
      await gasCall('reportToolRepair', [repairModal.id, repairNote, new Date().toLocaleDateString('uk-UA'), wLabel])
      await gasCall('logToolEvent', [repairModal.id, repairModal.name, new Date().toLocaleDateString('uk-UA'), new Date().toLocaleString('uk-UA'), 'broken', wLabel, repairNote])
      setRepairModal(null)
      setRepairNote('')
      await refresh()
      useAppStore.setState({ status: 'success' })
      showToast('Записано в ремонт', 'info')
    } catch {
      showToast('Помилка збереження', 'err')
      useAppStore.setState({ status: 'error' })
    }
  }

  const completeRepair = async (t: Tool) => {
    useAppStore.setState({ status: 'saving' })
    try {
      await gasCall('completeToolRepair', [t.id])
      await gasCall('logToolEvent', [t.id, t.name, new Date().toLocaleDateString('uk-UA'), new Date().toLocaleString('uk-UA'), 'fixed', '', 'Відремонтовано'])
      await refresh()
      useAppStore.setState({ status: 'success' })
      showToast('Інструмент полагодили!', 'info')
    } catch {
      showToast('Помилка відновлення', 'err')
      useAppStore.setState({ status: 'error' })
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 4, border: `1px solid ${G.b1}` }}>
        <button 
          onClick={() => { setTab('active'); haptic(30); }}
          style={{ 
            flex: 1, padding: '12px 0', 
            background: tab === 'active' ? 'rgba(6, 182, 212, 0.15)' : 'transparent', 
            color: tab === 'active' ? G.cy : G.t2, 
            borderRadius: 12, fontWeight: 700, fontSize: 12, transition: '0.2s',
            border: tab === 'active' ? `1px solid ${G.cy}` : '1px solid transparent'
          }}
        >
          ПРАЦЮЮТЬ ({activeTools.length})
        </button>
        <button 
          onClick={() => { setTab('repairs'); haptic(30); }}
          style={{ 
            flex: 1, padding: '12px 0', 
            background: tab === 'repairs' ? 'rgba(239, 68, 68, 0.15)' : 'transparent', 
            color: tab === 'repairs' ? G.rd : G.t2, 
            borderRadius: 12, fontWeight: 700, fontSize: 12, transition: '0.2s',
            border: tab === 'repairs' ? `1px solid ${G.rd}` : '1px solid transparent'
          }}
        >
          В РЕМОНТІ ({brokenTools.length})
        </button>
      </div>

      {tab === 'active' && (
        <Card>
          <CardTitle color={G.cy}>🛠️ ХАРДВЕР (СПРАВНИЙ)</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activeTools.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${G.b1}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: G.t1 }}>{t.name}</div>
                  {t.notes && <div style={{ fontSize: 11, color: G.ts, marginTop: 2 }}>{t.notes}</div>}
                  <div style={{ marginTop: 6 }}>
                    <Chip bg={G.b1} color={G.ts}>всього: {t.count}</Chip>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <QtySelector 
                      value={t.working || 0} 
                      onChange={(v) => handleUpdateWorking(t, v)}
                      min={0}
                      max={t.count}
                    />
                    <div style={{ fontSize: 9, color: G.ts, marginTop: 4, fontWeight: 700, letterSpacing: 0.5 }}>СПРАВНІ</div>
                  </div>
                  <button 
                    disabled={busy}
                    onClick={() => { setRepairModal(t); haptic(50); }}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: G.rd, padding: '8px 12px', borderRadius: 10, border: `1px solid rgba(239, 68, 68, 0.2)`, fontSize: 11, fontWeight: 700 }}
                  >
                    🔧 ЗЛАМАВСЯ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'repairs' && (
        <Card>
          <CardTitle color={G.rd}>🔧 СЕРВІС / РЕМОНТ</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {brokenTools.length === 0 ? (
              <div style={{ color: G.ts, textAlign: 'center', padding: '40px 0', fontSize: 14 }}>Жоден інструмент не потребує ремонту 🙌</div>
            ) : (
              brokenTools.map(t => (
                <div key={t.id} style={{ padding: '16px 0', borderBottom: `1px solid ${G.b1}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: G.rd }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: G.ts, marginTop: 2 }}>Кількість: {t.count - (t.working || 0)} шт</div>
                      <div style={{ 
                        fontSize: 13, background: 'rgba(239,68,68,0.05)', 
                        padding: '10px 14px', borderRadius: 12, margin: '10px 0', 
                        color: G.t1, borderLeft: `3px solid ${G.rd}`, fontStyle: 'italic'
                      }}>
                        {t.repairNote || 'Причина не вказана'}
                      </div>
                      <div style={{ fontSize: 11, color: G.ts, fontWeight: 600 }}>
                        ⏳ {t.repairDate} 
                        {t.repairBy && <span style={{ marginLeft: 8 }}>• {t.repairBy}</span>}
                      </div>
                    </div>
                    <button 
                      disabled={busy}
                      onClick={() => { completeRepair(t); haptic(80); }}
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.15)', color: G.gn, 
                        padding: '10px 14px', borderRadius: 12, fontWeight: 700, 
                        fontSize: 12, border: `1px solid rgba(16, 185, 129, 0.3)`,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ ПОЛАГОДИЛИ
                    </button>
                  </div>
                </div>
              ))
             )}
          </div>
        </Card>
      )}

      {/* Repair Modal */}
      {repairModal && (
        <Modal 
          isOpen={!!repairModal} 
          onClose={() => setRepairModal(null)}
          title={`🔧 ЗЛАМАВСЯ: ${repairModal.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormRow>
              <Label>Що саме зламалося?</Label>
              <textarea 
                rows={3} 
                className="mono-font"
                placeholder="Наприклад: згорів блок живлення, зламався роз'єм..." 
                value={repairNote} 
                onChange={e => setRepairNote(e.target.value)} 
                style={{ padding: 12, borderRadius: 12, fontSize: 14, background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, width: '100%', outline: 'none' }}
              />
            </FormRow>

            <FormRow>
              <Label>Хто користувався?</Label>
              <select 
                value={repairWorker} 
                onChange={e => setRepairWorker(e.target.value)}
                style={{ background: G.b1, border: `1px solid ${G.b2}`, padding: 12, borderRadius: 12, color: G.t1, width: '100%', outline: 'none' }}
              >
                <option value="">-- Оберіть працівника --</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormRow>

            <SubmitBtn 
              disabled={busy || !repairNote.trim()}
              onClick={submitRepair}
              busy={busy}
              color={G.rd}
            >
              ПЕРЕДАТИ В РЕМОНТ
            </SubmitBtn>
          </div>
        </Modal>
      )}
    </div>
  )
}
