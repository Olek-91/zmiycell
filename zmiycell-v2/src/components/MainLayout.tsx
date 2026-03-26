import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Logo, BatteryIcon, SnakeCubeLoader, SyncBadge } from './common/HeaderFeatures'
import { G } from '../constants/theme'
import { haptic } from '../utils/haptic'

const NAV_ITEMS = [
  { path: '/', icon: '⚙', label: 'ВИР.' },
  { path: '/workers', icon: '👷', label: 'КОМАНДА' },
  { path: '/logs', icon: '📋', label: 'ЖУРНАЛ' },
  { path: '/tools', icon: '🔧', label: 'ІНСТР.' },
]

export const MainLayout: React.FC = () => {
  const { status, loadAll, toast } = useAppStore()
  const logoRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: G.bg, position: 'relative', overflow: 'hidden' }}>
      <SnakeCubeLoader status={status} logoRef={logoRef} />

      {/* Header */}
      <header className="glass-panel" style={{ margin: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <div style={{ position: 'absolute', inset: -2, background: `linear-gradient(135deg, ${G.or}, ${G.cy})`, borderRadius: '50%', opacity: 0.3 }} />
            <Logo ref={logoRef} size={44} />
          </div>
          <div>
            <div className="title-font" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: G.t1 }}>ZMIYCELL <span style={{ color: G.or }}>v2</span></div>
            <div style={{ width: 60, marginTop: 2 }}>
              <BatteryIcon />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: G.t2, marginRight: 8 }}>
            {new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
          </span>
          <SyncBadge status={status} />
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {status === 'success' || status === 'saving' ? (
          <div id="page-container">
            <Outlet />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: G.t2 }}>
            {status === 'error' ? 'Помилка завантаження' : 'Завантаження даних...'}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-panel" style={{ margin: '0 8px 8px', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: `1px solid ${G.b1}` }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => haptic(20)}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              textDecoration: 'none', color: isActive ? G.or : G.t2, transition: '0.2s', flex: 1
            })}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{ 
          position: 'fixed', top: 20, left: 12, right: 12, zIndex: 10000, 
          background: toast.type === 'err' ? 'rgba(69, 10, 10, 0.95)' : 'rgba(5, 46, 22, 0.95)', 
          border: `1px solid ${toast.type === 'err' ? G.rd : G.gn}`, 
          color: toast.type === 'err' ? '#fca5a5' : '#86efac', 
          padding: '14px 18px', borderRadius: 12, fontSize: 13, 
          fontFamily: "'Fira Code', monospace", boxShadow: '0 8px 32px rgba(0,0,0,0.5)', 
          animation: 'fadeIn 0.25s ease-out', backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'err' ? '✕ ' : '✓ '} {toast.msg}
        </div>
      )}
    </div>
  )
}
