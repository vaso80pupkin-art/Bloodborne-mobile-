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

  const btn = (label, action, cls) => (
    <button
      className={`tc-btn ${cls}`}
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
          position: absolute; left: calc(22px + env(safe-area-inset-left)); bottom: calc(34px + env(safe-area-inset-bottom));
          width: 132px; height: 132px;
          border-radius: 50%; border: 1px solid rgba(150, 120, 70, 0.55);
          background: radial-gradient(circle, rgba(30, 22, 14, 0.35) 0%, rgba(10, 8, 8, 0.5) 100%);
          pointer-events: auto; touch-action: none; }
        .tc-knob {
          position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px;
          border-radius: 50%; background: rgba(190, 150, 80, 0.4);
          border: 1px solid rgba(220, 180, 110, 0.7); pointer-events: none;
          box-shadow: 0 0 12px rgba(200, 150, 70, 0.35); }
        .tc-btn {
          position: absolute; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent; border-radius: 50%;
          border: 1px solid rgba(180, 140, 75, 0.7);
          background: radial-gradient(circle, rgba(40, 28, 16, 0.62) 0%, rgba(12, 8, 7, 0.72) 100%);
          color: #dcc79a; font-family: 'Cinzel', serif; letter-spacing: 1px;
          transition: transform 0.05s; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
        .tc-btn:active { background: radial-gradient(circle, rgba(150, 45, 22, 0.75) 0%, rgba(60, 16, 8, 0.8) 100%);
          transform: scale(0.92); border-color: rgba(255, 160, 80, 0.8); }
        .tc-attack { right: calc(18px + env(safe-area-inset-right)); bottom: calc(30px + env(safe-area-inset-bottom)); width: 86px; height: 86px; font-size: 13px; }
        .tc-dodge { right: calc(112px + env(safe-area-inset-right)); bottom: calc(44px + env(safe-area-inset-bottom)); width: 64px; height: 64px; font-size: 10px; }
        .tc-parry { right: calc(64px + env(safe-area-inset-right)); bottom: calc(128px + env(safe-area-inset-bottom)); width: 64px; height: 64px; font-size: 10px; }
        .tc-run { right: calc(158px + env(safe-area-inset-right)); bottom: calc(122px + env(safe-area-inset-bottom)); width: 54px; height: 54px; font-size: 9px; }
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

      {btn('БЕГ', () => {
        game.input.run = !game.input.run
      }, 'tc-run')}
      {btn('ПАРИР', () => {
        game.input.parryReq++
      }, 'tc-parry')}
      {btn('ПЕРЕКАТ', () => {
        game.input.dodgeReq++
      }, 'tc-dodge')}
      {btn('АТАКА', () => {
        game.input.attackReq++
      }, 'tc-attack')}

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
