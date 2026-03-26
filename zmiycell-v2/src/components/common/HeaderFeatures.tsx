import React, { useState, useEffect, useRef } from 'react'
import { G } from '../../constants/theme'

// ─── LOGO ────────────────────────────────────────────────
interface LogoProps {
  size?: number
}

export const Logo = React.forwardRef<HTMLImageElement, LogoProps>(({ size = 32 }, ref) => {
  return (
    <img 
      ref={ref} 
      src="/logo.jpg" 
      alt="ZmiyCell" 
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }} 
    />
  )
})

// ─── SYNC BADGE ──────────────────────────────────────────
interface SyncBadgeProps {
  status: 'idle' | 'loading' | 'saving' | 'success' | 'error'
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({ status }) => {
  const configs: Record<string, [string, string, string, string, boolean]> = {
    loading: ['⟳ завантаження...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    success: ['✓ синхр.', '#052e16', G.gn, '#166534', false],
    error: ['✕ помилка', '#450a0a', G.rd, '#7f1d1d', false],
    idle: ['...', G.b1, G.t2, G.b2, false]
  }
  const cfg = configs[status] || configs.idle

  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 4, 
      fontSize: 11, 
      padding: '3px 9px', 
      borderRadius: 10, 
      background: cfg[1], 
      color: cfg[2] as string, 
      border: `1px solid ${cfg[3]}`, 
      animation: cfg[4] ? 'pulse 1s infinite' : '', 
      fontFamily: "'Fira Code',monospace" 
    }}>
      {cfg[0]}
    </span>
  )
}

// ─── BATTERY ICON ────────────────────────────────────────
export const BatteryIcon: React.FC = () => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const itv = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(itv)
  }, [])

  const h = now.getHours()
  const m = now.getMinutes()
  const t = h + m / 60

  let sections = 0
  let color = G.gn
  let pulse = false
  if (t >= 7 && t < 17) {
    const pct = Math.max(0, 100 - (t - 7) * 10)
    sections = Math.ceil(pct / 20)
    if (sections <= 2) { 
        color = G.rd
        pulse = true 
    }
  } else {
    sections = (Math.floor(now.getTime() / 1000) % 6)
  }

  return (
    <div style={{
      width: '100%', height: 20, border: `1.5px solid ${G.t2}`, borderRadius: 5,
      position: 'relative', padding: 2, display: 'flex', gap: 1.5,
      animation: pulse ? 'pulse 1s infinite' : 'none', opacity: 0.9
    }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          flex: 1, height: '100%', borderRadius: 1.5,
          background: i <= sections ? color : 'transparent',
          transition: 'background 0.3s'
        }} />
      ))}
      <div style={{
        position: 'absolute', right: -5, top: 4, width: 2.5, height: 9,
        background: G.t2, borderRadius: '0 1.5px 1.5px 0'
      }} />
    </div>
  )
}

// ─── SNAKE CUBE LOADER ───────────────────────────────────
interface SnakeCubeLoaderProps {
  status: 'idle' | 'loading' | 'saving' | 'success' | 'error'
  logoRef: React.RefObject<HTMLImageElement | null>
}

export const SnakeCubeLoader: React.FC<SnakeCubeLoaderProps> = ({ status, logoRef }) => {
  const [show, setShow] = useState(false)
  const [segments, setSegments] = useState<{ x: number, y: number, a: number, opacity: number }[]>([]) 
  const stateRef = useRef({ 
    headIdx: 0, 
    active: false, 
    stopAtEnd: false, 
    points: [] as { x: number, y: number, a: number }[], 
    loopRange: [0, 0] as [number, number]
  })
  
  const cubeSize = 25
  const snakeLen = 7

  useEffect(() => {
    if (status === 'loading') {
      stateRef.current.active = true
      stateRef.current.stopAtEnd = false
      setTimeout(() => setShow(true), 0)
    } else if (stateRef.current.active) {
      stateRef.current.stopAtEnd = true
    }
  }, [status])

  useEffect(() => {
    if (!show || !logoRef.current) return
    
    const rect = logoRef.current.getBoundingClientRect()
    const H = window.innerHeight
    const lx = rect.left + rect.width / 2
    const ly = rect.top + rect.height / 2
    
    const pts: { x: number, y: number, a: number }[] = []
    // same logic as V1
    for (let y = ly; y > 0; y -= cubeSize) pts.push({ x: lx, y, a: -90 })
    pts.push({ x: lx, y: 0, a: -90 })
    for (let x = lx; x > 0; x -= cubeSize) pts.push({ x, y: 0, a: 180 })
    pts.push({ x: 0, y: 0, a: 180 })
    
    const loopStartIdx = pts.length - 1
    for (let y = 0; y < H; y += cubeSize * 1.5) pts.push({ x: 0, y, a: 90 })
    pts.push({ x: 0, y: H, a: 90 })
    for (let y = H; y > 0; y -= cubeSize * 1.5) pts.push({ x: 0, y, a: -90 })
    const loopEndIdx = pts.length - 1
    
    for (let x = 0; x < lx; x += cubeSize) pts.push({ x, y: 0, a: 0 })
    pts.push({ x: lx, y: 0, a: 0 })
    for (let y = 0; y < ly; y += cubeSize) pts.push({ x: lx, y, a: 90 })
    pts.push({ x: lx, y: ly, a: 90 })
    
    stateRef.current.points = pts
    stateRef.current.loopRange = [loopStartIdx, loopEndIdx]
    
    const timer = setInterval(() => {
      const { points, stopAtEnd, loopRange } = stateRef.current
      let { headIdx } = stateRef.current
      headIdx++
      
      if (stopAtEnd && headIdx >= points.length - 1) {
        clearInterval(timer)
        setShow(false)
        stateRef.current.active = false
        return
      }
      
      if (!stopAtEnd && headIdx >= loopRange[1]) {
        headIdx = loopRange[0]
      }
      
      stateRef.current.headIdx = headIdx
      
      const newSegs = []
      for (let i = 0; i < snakeLen; i++) {
        const pIdx = headIdx - i
        if (pIdx >= 0) {
          const p = points[pIdx]
          newSegs.push({ ...p, opacity: 1 - (i / snakeLen) })
        }
      }
      setSegments(newSegs)
    }, 45)
    
    return () => clearInterval(timer)
  }, [show, logoRef])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {segments.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: s.x, top: s.y,
          width: cubeSize, height: cubeSize,
          background: G.or,
          opacity: s.opacity,
          transform: `translate(-50%, -50%) rotate(${s.a}deg)`,
          boxShadow: `0 0 15px ${G.or}`,
          borderRadius: 4
        }} />
      ))}
    </div>
  )
}
