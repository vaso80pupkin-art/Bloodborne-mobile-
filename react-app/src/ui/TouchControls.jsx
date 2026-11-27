import React, { useRef } from 'react'
import { game } from '../game/store.js'

export function TouchControls() {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeId = useRef(null)

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

  const onPointerUp = () => {
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
        action()
      }}
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
          position: absolute; left: 22px; bottom: 64px; width: 118px; height: 118px;
          border-radius: 50%; border: 1px solid rgba(150, 120, 70, 0.5);
          background: rgba(10, 8, 8, 0.4); pointer-events: auto; touch-action: none; }
        .tc-knob {
          position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px;
          border-radius: 50%; background: rgba(190, 150, 80, 0.35);
          border: 1px solid rgba(210, 170, 100, 0.6); }
        .tc-actions { position: absolute; right: 18px; bottom: 58px; display: flex;
          gap: 12px; align-items: flex-end; }
        .tc-btn {
          pointer-events: auto; touch-action: none; border-radius: 50%;
          border: 1px solid rgba(170, 130, 70, 0.65); background: rgba(15, 10, 8, 0.55);
          color: #d8c290; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        .tc-btn:active { background: rgba(90, 55, 25, 0.6); }
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
      >
        <div ref={knobRef} className="tc-knob" />
      </div>

      <div className="tc-actions">
        {btn('БЕГ', () => {
          game.input.run = !game.input.run
        }, 56, 11)}
        {btn('ПЕРЕКАТ', () => {
          game.input.dodgeReq++
        }, 62, 9)}
        {btn('АТАКА', () => {
          game.input.attackReq++
        }, 76, 12)}
      </div>
    </div>
  )
}
