import React, { useEffect, useReducer } from 'react'
import { game, subscribe, reviveAtLamp } from '../game/store.js'

export function Hud() {
  const [, force] = useReducer((c) => c + 1, 0)
  useEffect(() => subscribe(force), [])

  const hpRatio = Math.max(0, game.hp / game.maxHp) * 100
  const stRatio = Math.max(0, game.stamina / game.maxStamina) * 100
  const flashAge = performance.now() - game.flashAt
  const flashOn = game.flashAt > 0 && flashAge < 500

  return (
    <div className="hud-root">
      <style>{`
        .hud-root {
          position: fixed; inset: 0; pointer-events: none; z-index: 10;
          font-family: 'Cinzel', serif; color: #cfc4b0;
          user-select: none; -webkit-user-select: none;
        }
        .hud-bars { position: absolute; top: 16px; left: 16px; width: min(320px, 44vw); }
        .hud-bar { height: 14px; border: 1px solid #4a3c28; background: rgba(8, 6, 6, 0.72);
          margin-bottom: 7px; box-shadow: 0 0 8px rgba(0,0,0,0.8); overflow: hidden; }
        .hud-bar-fill { height: 100%; transition: width 0.18s ease-out; }
        .hp-fill { background: linear-gradient(90deg, #5e0d0d, #a11a12 70%, #c93a24); }
        .st-fill { background: linear-gradient(90deg, #3d4a12, #6f8a1e 70%, #93b32c); }
        .hud-meter { font-size: 10px; letter-spacing: 2px; color: #8a7d64; margin-bottom: 3px; }
        .hud-title { position: absolute; top: 16px; right: 18px; text-align: right;
          font-size: clamp(10px, 2.4vw, 14px); letter-spacing: 3px; color: #9a8c72;
          text-shadow: 0 0 10px #000; }
        .hud-blood { position: absolute; top: 34px; right: 18px; text-align: right;
          font-size: clamp(13px, 3vw, 19px); color: #d8b25a; text-shadow: 0 0 12px rgba(216,140,40,0.5); }
        .hud-hint { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          font-size: clamp(9px, 2vw, 12px); letter-spacing: 2px; color: #6f6552; white-space: nowrap;
          text-shadow: 0 1px 4px #000; }
        .hud-flash { position: absolute; inset: 0; background: radial-gradient(ellipse at center,
          rgba(120, 10, 5, 0) 40%, rgba(120, 10, 5, 0.55) 100%);
          animation: hudflash 0.5s ease-out forwards; }
        @keyframes hudflash { from { opacity: 1; } to { opacity: 0; } }
        .hud-died { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.78);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          pointer-events: auto; }
        .died-text { font-size: clamp(34px, 9vw, 72px); letter-spacing: 12px; color: #7a1512;
          text-shadow: 0 0 30px rgba(160, 20, 10, 0.8); margin-bottom: 6px; }
        .died-sub { font-size: clamp(11px, 2.6vw, 15px); letter-spacing: 4px; color: #7d7261;
          margin-bottom: 34px; }
        .died-btn { pointer-events: auto; cursor: pointer; background: rgba(20, 14, 8, 0.9);
          border: 1px solid #5a4830; color: #d0b87a; font-family: 'Cinzel', serif;
          font-size: clamp(13px, 3vw, 17px); letter-spacing: 3px; padding: 14px 34px; }
        .died-btn:active { background: rgba(60, 40, 20, 0.9); }
      `}</style>

      <div className="hud-bars">
        <div className="hud-meter">ЗДОРОВЬЕ</div>
        <div className="hud-bar">
          <div className="hud-bar-fill hp-fill" style={{ width: `${hpRatio}%` }} />
        </div>
        <div className="hud-bar" style={{ height: 9 }}>
          <div className="hud-bar-fill st-fill" style={{ width: `${stRatio}%` }} />
        </div>
      </div>

      <div className="hud-title">Yharnam · Ночной кошмар охотника</div>
      <div className="hud-blood">🩸 {game.blood} &nbsp;·&nbsp; ☠ {game.kills}</div>

      <div className="hud-hint">WASD / джойстик — движение · J / F — атака · Space — перекат · R — бег</div>

      {flashOn && <div className="hud-flash" key={game.flashAt} />}
      {game.dead && (
        <div className="hud-died">
          <div className="died-text">YOU DIED</div>
          <div className="died-sub">Смерть — не конец. Охотник всегда возвращается.</div>
          <button className="died-btn" onClick={reviveAtLamp}>
            ВОССТАТЬ У ФОНАРЯ
          </button>
        </div>
      )}
    </div>
  )
}
