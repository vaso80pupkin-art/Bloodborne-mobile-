import React, { useEffect, useRef } from 'react'
import { game } from '../game/store.js'

export function TouchControls() {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeId = useRef(null)

  useEffect(() => {
    const reset = () => {
      activeId.current = null
      game.input.joy.x = 0
      game.input.joy.y = 0
      if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
    }
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reset()
    })
    return () => window.removeEventListener('blur', reset)
  }, [])

  const setJoy = (x, y) => {
    game.input.joy.x = x
    game.input.joy.y = y
  }

  const handleMove = (e) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const max = rect.width / 2
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    setJoy(dx / max, dy / max)
  }

  const onPointerDown = (e) => {
    activeId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    handleMove(e)
  }

  const onPointerUp = (e) => {
    if (activeId.current !== null && e.pointerId !== activeId.current) return
    activeId.current = null
    knobRef.current.style.transform = 'translate(0px, 0px)'
    setJoy(0, 0)
  }

  const btn = (label, action, size, fontSize) => (
    <button
      className="tc-btn"
      style={{ width: size, height: size, fontSize }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        action()
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )

  return (
    <div className="tc-root">
      <style>{`
        .tc-root { position: fixed; inset: 0; pointer-events: none; z-index: 20; }
        @media (hover: hover) and (pointer: fine) { .tc-root { display: none; } }
        .tc-joy {
          position: absolute; left: 20px; bottom: 46px; width: 124px; height: 124px;
          border-radius: 50%; border: 1px solid rgba(150, 120, 70, 0.5);
          background: rgba(10, 8, 8, 0.4); pointer-events: auto; touch-action: none; }
        .tc-knob {
          position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px;
          border-radius: 50%; background: rgba(190, 150, 80, 0.35);
          border: 1px solid rgba(210, 170, 100, 0.6); pointer-events: none; }
        .tc-actions { position: absolute; right: 16px; bottom: 42px; display: grid;
          grid-template-columns: 64px 64px; gap: 10px; justify-items: end; align-items: end; }
        .tc-btn {
          pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent; border-radius: 50%;
          border: 1px solid rgba(170, 130, 70, 0.65); background: rgba(15, 10, 8, 0.55);
          color: #d8c290; font-family: 'Cinzel', serif; letter-spacing: 1px;
          transition: transform 0.05s; }
        .tc-btn:active { background: rgba(120, 40, 20, 0.7); transform: scale(0.93); }
        .tc-rotate { position: absolute; inset: 0; background: rgba(4, 3, 5, 0.92); z-index: 50;
          display: none; flex-direction: column; align-items: center; justify-content: center;
          color: #b89a5a; font-family: 'Cinzel', serif; letter-spacing: 4px; font-size: 16px;
          text-align: center; gap: 14px; pointer-events: auto; }
        .tc-rotate-icon { font-size: 44px; animation: tcspin 2.4s ease-in-out infinite; }
        @keyframes tcspin { 0%, 20% { transform: rotate(0deg); } 60%, 100% { transform: rotate(90deg); } }
        @media (orientation: portrait) and (pointer: coarse) { .tc-rotate { display: flex; } }
      `}</style>

      <div
        ref={baseRef}
        className="tc-joy"
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          if (activeId.current === e.pointerId) handleMove(e)
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={knobRef} className="tc-knob" />
      </div>

      <div className="tc-actions">
        {btn('БЕГ', () => {
          game.input.run = !game.input.run
        }, 58, 10)}
        {btn('ПАРИР', () => {
          game.input.parryReq++
        }, 62, 10)}
        {btn('ПЕРЕКАТ', () => {
          game.input.dodgeReq++
        }, 68, 9)}
        {btn('АТАКА', () => {
          game.input.attackReq++
        }, 82, 12)}
      </div>

      <div className="tc-rotate">
        <div className="tc-rotate-icon">📱</div>
        <div>ПОВЕРНИ ТЕЛЕФОН</div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: '#8a7d64' }}>
          Игра создана для горизонтального экрана
        </div>
      </div>
    </div>
  )
}
