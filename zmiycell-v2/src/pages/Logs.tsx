import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardTitle, Chip } from '../components/ui'
import { getWorkerColor } from './Workers'
import { G } from '../constants/theme'

export const Logs: React.FC = () => {
  const { log } = useAppStore()
  const [showAll, setShowAll] = useState(false)
  const [filterKind, setFilterKind] = useState('all')

  const todayStr = new Date().toLocaleDateString('uk-UA')
  
  const filteredLog = useMemo(() => {
    let list = showAll ? log : log.filter(l => l.date === todayStr)
    if (filterKind !== 'all') {
      list = list.filter(l => l.kind === filterKind)
    }
    return [...list].sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''))
  }, [log, showAll, filterKind, todayStr])

  const kinds = [
    { id: 'all', label: 'УСЕ', icon: '📋' },
    { id: 'production', label: 'ВИР.', icon: '🔋' },
    { id: 'prep', label: 'ПІДГ.', icon: '📦' },
    { id: 'repair', label: 'РЕМОНТ', icon: '🔧' },
    { id: 'transfer', label: 'ПЕРЕД.', icon: '🚚' },
    { id: 'write-off', label: 'СПИС.', icon: '📉' }
  ]

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 20 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <CardTitle color={G.or}>📋 ЖУРНАЛ ПОДІЙ</CardTitle>
          <button 
            onClick={() => setShowAll(!showAll)}
            style={{ 
              background: showAll ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)', 
              color: showAll ? G.or : G.t2,
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${showAll ? G.or : G.b2}`,
              transition: '0.2s'
            }}
          >
            {showAll ? 'СЬОГОДНІ' : 'ВЕСЬ ЖУРНАЛ'}
          </button>
        </div>

        <div className="tab-nav" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${G.b1}` }}>
          {kinds.map(k => (
            <button
              key={k.id}
              onClick={() => setFilterKind(k.id)}
              style={{
                background: filterKind === k.id ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                color: filterKind === k.id ? G.or : G.t2,
                border: `1px solid ${filterKind === k.id ? G.or : G.b2}`,
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                transition: '0.2s'
              }}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>

        {filteredLog.length === 0 ? (
          <div style={{ color: G.ts, textAlign: 'center', padding: '40px 0', fontSize: 14 }}>Записів не знайдено</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredLog.map(e => {
              const wColor = getWorkerColor(e.workerName)
              const isProd = e.kind === 'production'
              const isPrep = e.kind === 'prep'
              const kindCfg = kinds.find(k => k.id === e.kind) || { icon: '•', color: G.t2 }
              
              return (
                <div key={e.id} style={{ 
                  display: 'flex', gap: 14, padding: '14px 12px', 
                  borderBottom: `1px solid ${G.b1}`, background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, marginBottom: 2
                }}>
                  <div style={{ width: 4, borderRadius: 4, background: wColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: G.t1 }}>
                        <span style={{ marginRight: 6 }}>{kindCfg.icon}</span>
                        <span style={{ color: wColor }}>{e.workerName}</span>
                      </div>
                      {isProd && e.count && (
                        <Chip bg="rgba(16, 185, 129, 0.15)" color={G.gn} bd="rgba(16, 185, 129, 0.3)">
                          +{e.count} шт
                        </Chip>
                      )}
                    </div>

                    <div style={{ color: G.t1, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                      {isProd ? e.typeName : (isPrep ? `Видача: ${e.typeName || 'Матеріали'}` : e.typeName || e.kind)}
                      {isProd && e.serials && e.serials.length > 0 && e.serials[0] !== '' && (
                        <div style={{ color: G.ts, fontSize: 11, fontFamily: "'Fira Code', monospace", marginTop: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 4 }}>
                          {e.serials.join(', ')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ color: G.ts, fontSize: 11, fontWeight: 600 }}>
                        {e.datetime?.split(', ')[1] || e.datetime} 
                        <span style={{ marginLeft: 8, opacity: 0.6 }}>{e.date}</span>
                      </div>
                      {e.consumed && e.consumed.length > 0 && (
                        <div style={{ fontSize: 10, color: G.ts, border: `1px solid ${G.b2}`, padding: '2px 6px', borderRadius: 6 }}>
                          {e.consumed.length} матеріалів
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
