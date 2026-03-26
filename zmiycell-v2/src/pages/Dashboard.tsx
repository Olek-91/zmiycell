import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardTitle, Chip, QtyBtn, TypeTabs, SubmitBtn, FormRow } from '../components/ui'
import { buildConsumed } from '../utils/materials'
import { gasCall } from '../api/client'
import { PrepBlock, StockBlock } from '../components/Warehouse'
import { G } from '../constants/theme'

export const Dashboard: React.FC = () => {
  const store = useAppStore()
  const { workers, batteryTypes, log, refresh, status } = store

  const [selWorkerId, setSelWorkerId] = useState('')
  const [selType, setSelType] = useState('')
  const [qty, setQty] = useState(1)
  const [serialsText, setSerialsText] = useState('')

  const activeWorkerName = workers.find(w => w.id === selWorkerId)?.name || ''
  const activeType = batteryTypes.find(t => t.id === selType)

  const consumed = useMemo(() => {
    if (!selType || qty < 1) return []
    return buildConsumed(store, selType, qty, selWorkerId)
  }, [store, selType, qty, selWorkerId])

  const hasDeficit = consumed.some(c => (c.totalStock - c.fromStock) < 0)
  const busy = status === 'saving'

  const handleSave = async () => {
    if (!selWorkerId || !selType || qty < 1) return
    const serialsArr = serialsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)

    if (activeType?.manual) {
      if (serialsArr.length !== qty) {
        return alert(`Потрібно ${qty} серійників (введено ${serialsArr.length})`)
      }
    } else if (serialsArr.length > 0) {
      return alert('Цей тип не вимагає вводу серійних номерів!')
    }

    if (hasDeficit) {
      if (!window.confirm('⚠️ УВАГА: На складі недостатньо матеріалів! Записати виготовлення у мінус?')) return
    }

    useAppStore.setState({ status: 'saving' })
    const compConsumed = consumed.map(c => `${c.matId}:${c.amount}:${c.fromPersonal}:${c.fromTeam}:${c.fromStock}`).join('|')
    
    try {
      await gasCall('saveLog', [{
        typeId: selType,
        typeName: activeType?.name,
        workerName: activeWorkerName,
        count: qty,
        serials: serialsArr.join('|'),
        consumedJson: compConsumed,
        kind: 'production'
      }])
      setQty(1)
      setSerialsText('')
      setSelType('')
      await refresh()
      useAppStore.setState({ status: 'success' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert('Помилка: ' + msg)
      useAppStore.setState({ status: 'error', error: msg })
    }
  }

  // Daily Stats for Header
  const todayStr = new Date().toLocaleDateString('uk-UA')
  const prodToday = log.filter(l => l.date === todayStr && l.kind === 'production').reduce((acc, curr) => acc + (curr.count || 0), 0)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 20 }}>
      
      <div style={{ textAlign: 'center', marginBottom: -4 }}>
        <Chip bg="rgba(6, 182, 212, 0.15)" color="var(--accent-primary)">Виготовлено сьогодні: {prodToday} шт</Chip>
      </div>

      <Card>
        <CardTitle color="var(--accent-primary)">🏭 ВИРОБНИЦТВО</CardTitle>
        
        <FormRow label="Працівник">
          <select 
            value={selWorkerId} 
            onChange={e => setSelWorkerId(e.target.value)}
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            <option value="">-- Хто виготовляє? --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormRow>

        <FormRow label="Тип акумулятора">
          <TypeTabs 
            types={batteryTypes.map(t => ({ id: t.id, name: t.name, color: t.color }))}
            active={selType}
            onSelect={setSelType}
          />
        </FormRow>

        {selType && (
          <FormRow label="Кількість">
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <QtyBtn onClick={() => setQty(Math.max(1, qty - 1))}>-</QtyBtn>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 24, fontWeight: 800, fontFamily: "'Fira Code', monospace", color: G.t1 }}>
                {qty}
              </div>
              <QtyBtn onClick={() => setQty(qty + 1)}>+</QtyBtn>
            </div>
          </FormRow>
        )}

        {activeType?.manual && (
          <FormRow label={`Серійні номери (${qty} шт)`}>
            <textarea
              rows={3}
              placeholder="Введіть серійники..."
              value={serialsText}
              onChange={e => setSerialsText(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </FormRow>
        )}

        {consumed.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 12, fontSize: 13, border: `1px solid ${G.b1}` }}>
            <div style={{ fontWeight: 700, color: G.t2, fontSize: 12, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>Матеріали:</div>
            {consumed.map((c, i) => {
              const def = c.totalStock - c.fromStock
              const isShort = def < 0
              const fromPrep = c.fromPersonal + c.fromTeam
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: c.isSubstitute ? G.pu : G.t1, fontWeight: 500 }}>
                      {c.isSubstitute && '↪ '}{c.name}
                    </span>
                    {c.isSubstitute && <span style={{ fontSize: 10, color: G.ts }}>заміна для {c.substituteFor}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: isShort ? G.rd : G.t1 }}>
                      {c.fromStock} {c.unit}
                    </div>
                    {fromPrep > 0 && (
                      <div style={{ fontSize: 10, color: G.gn }}>
                        +{fromPrep} з підготовки
                      </div>
                    )}
                    {isShort && (
                      <div style={{ fontSize: 10, color: G.rd }}>
                        різниця: {Math.abs(def).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <SubmitBtn 
          onClick={handleSave}
          disabled={!selWorkerId || !selType || qty < 1 || busy}
          color={hasDeficit ? G.rd : G.or}
        >
          {busy ? 'ЗАПИСУЄМО...' : (hasDeficit ? '⚠ ЗАПИСАТИ В МІНУС' : '🚀 ВИГОТОВИТИ')}
        </SubmitBtn>
      </Card>

      <PrepBlock />
      <StockBlock />

    </div>
  )
}
