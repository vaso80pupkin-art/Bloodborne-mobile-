import React, { useEffect, useReducer, useState } from 'react'
import {
  game,
  subscribe,
  reviveAtLamp,
  waveQuota,
  upgradeCost,
  buyUpgrade
} from '../game/store.js'
import { toggleMute, playLevelUp } from '../game/audio.js'

const UPGRADE_LABELS = {
  hp: { name: 'ЗДОРОВЬЕ', desc: '+22 к максимуму и лечение' },
  dmg: { name: 'УРОН ПИЛЫ', desc: '+9 к урону удара' },
  stam: { name: 'ВЫНОСЛИВОСТЬ', desc: '+14 к запасу сил' }
}

export function Hud() {
  const [, force] = useReducer((c) => c + 1, 0)
  const [shopOpen, setShopOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  useEffect(() => subscribe(force), [])
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now()
      if (now - game.flashAt < 600 || (game.banner && now - game.banner.at < 3600)) force()
    }, 300)
    return () => clearInterval(id)
  }, [])

  const hpRatio = Math.max(0, game.hp / game.maxHp) * 100
  const stRatio = Math.max(0, game.stamina / game.maxStamina) * 100
  const flashAge = performance.now() - game.flashAt
  const flashOn = game.flashAt > 0 && flashAge < 500
  const bannerAge = game.banner ? (performance.now() - game.banner.at) / 1000 : 999
  const bannerOn = bannerAge < 3.5
  const left = Math.max(0, waveQuota() - game.stageKills)

  const buy = (kind) => {
    if (buyUpgrade(kind)) playLevelUp()
  }

  return (
    <div className="hud-root">
      <style>{`
        .hud-root {
          position: fixed; inset: 0; pointer-events: none; z-index: 10;
          font-family: 'Cinzel', serif; color: #cfc4b0;
          user-select: none; -webkit-user-select: none;
        }
        .hud-bars { position: absolute; top: 16px; left: 16px; width: min(300px, 42vw); }
        .hud-bar { height: 13px; border: 1px solid #4a3c28; background: rgba(8, 6, 6, 0.72);
          margin-bottom: 6px; box-shadow: 0 0 8px rgba(0,0,0,0.8); overflow: hidden; }
        .hud-bar-fill { height: 100%; transition: width 0.18s ease-out; }
        .hp-fill { background: linear-gradient(90deg, #5e0d0d, #a11a12 70%, #c93a24); }
        .st-fill { background: linear-gradient(90deg, #3d4a12, #6f8a1e 70%, #93b32c); }
        .hud-meter { font-size: 9px; letter-spacing: 2px; color: #8a7d64; margin-bottom: 3px; }
        .hud-right { position: absolute; top: 14px; right: 14px; text-align: right; }
        .hud-title { font-size: clamp(9px, 2.2vw, 13px); letter-spacing: 3px; color: #9a8c72;
          text-shadow: 0 0 10px #000; }
        .hud-blood { font-size: clamp(13px, 3vw, 18px); color: #d8b25a; margin-top: 4px;
          text-shadow: 0 0 12px rgba(216,140,40,0.5); }
        .hud-stage { font-size: clamp(9px, 2.2vw, 12px); letter-spacing: 2px; color: #a89878; margin-top: 3px; }
        .hud-echo { font-size: clamp(9px, 2.2vw, 12px); letter-spacing: 2px; color: #ff5a48; margin-top: 4px;
          text-shadow: 0 0 10px rgba(255,40,20,0.6); animation: echoPulse 1.4s ease-in-out infinite; }
        @keyframes echoPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        .hud-btn-row { margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; pointer-events: auto; }
        .hud-btn { cursor: pointer; background: rgba(15, 11, 8, 0.75); border: 1px solid #5a4830;
          color: #d0b87a; font-family: 'Cinzel', serif; font-size: clamp(10px, 2.4vw, 13px);
          letter-spacing: 1px; padding: 6px 12px; }
        .hud-btn:active { background: rgba(80, 50, 22, 0.85); }
        .hud-hint { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
          font-size: clamp(8px, 1.8vw, 11px); letter-spacing: 2px; color: #6f6552; white-space: nowrap;
          text-shadow: 0 1px 4px #000; }
        .hud-flash { position: absolute; inset: 0; background: radial-gradient(ellipse at center,
          rgba(120, 10, 5, 0) 40%, rgba(120, 10, 5, 0.55) 100%);
          animation: hudflash 0.5s ease-out forwards; }
        @keyframes hudflash { from { opacity: 1; } to { opacity: 0; } }
        .hud-banner { position: absolute; top: 22%; left: 0; right: 0; text-align: center;
          animation: bannerin 3.5s ease-out forwards; }
        .banner-text { font-size: clamp(22px, 6vw, 44px); letter-spacing: 8px; color: #b89a5a;
          text-shadow: 0 0 24px rgba(120, 70, 10, 0.9); }
        .banner-sub { font-size: clamp(10px, 2.4vw, 14px); letter-spacing: 3px; color: #8a7d64; margin-top: 6px; }
        @keyframes bannerin { 0% { opacity: 0; } 12% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
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
        .shop-backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.6);
          display: flex; align-items: center; justify-content: center; pointer-events: auto; }
        .shop-panel { background: rgba(12, 9, 7, 0.95); border: 1px solid #5a4830;
          padding: 22px 26px; min-width: min(420px, 88vw); max-height: 80vh; overflow-y: auto; }
        .shop-title { font-size: clamp(15px, 3.4vw, 20px); letter-spacing: 4px; color: #d8b25a;
          text-align: center; margin-bottom: 4px; }
        .shop-blood { text-align: center; font-size: clamp(12px, 2.6vw, 15px); color: #c98a3a; margin-bottom: 16px; }
        .shop-item { display: flex; align-items: center; justify-content: space-between; gap: 14px;
          border: 1px solid #3a2f20; padding: 12px 14px; margin-bottom: 10px; }
        .shop-name { font-size: clamp(12px, 2.8vw, 15px); letter-spacing: 2px; color: #cfc4b0; }
        .shop-desc { font-size: clamp(9px, 2.2vw, 11px); color: #8a7d64; margin-top: 3px; letter-spacing: 1px; }
        .shop-lvl { font-size: clamp(10px, 2.2vw, 12px); color: #9a8c72; margin-top: 3px; }
        .shop-buy { cursor: pointer; background: rgba(40, 28, 12, 0.9); border: 1px solid #6a5530;
          color: #e0c070; font-family: 'Cinzel', serif; padding: 10px 14px; font-size: clamp(11px, 2.4vw, 13px);
          letter-spacing: 1px; white-space: nowrap; }
        .shop-buy:disabled { opacity: 0.35; cursor: default; }
        .shop-buy:not(:disabled):active { background: rgba(90, 60, 25, 0.95); }
        .shop-close { width: 100%; margin-top: 6px; cursor: pointer; background: transparent;
          border: 1px solid #4a3c28; color: #9a8c72; font-family: 'Cinzel', serif;
          padding: 10px; letter-spacing: 3px; font-size: clamp(11px, 2.4vw, 13px); }
      `}</style>

      <div className="hud-bars">
        <div className="hud-meter">ЗДОРОВЬЕ {Math.ceil(game.hp)}/{game.maxHp}</div>
        <div className="hud-bar">
          <div className="hud-bar-fill hp-fill" style={{ width: `${hpRatio}%` }} />
        </div>
        <div className="hud-bar" style={{ height: 9 }}>
          <div className="hud-bar-fill st-fill" style={{ width: `${stRatio}%` }} />
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-title">Yharnam · Ночной кошмар охотника</div>
        <div className="hud-blood">🩸 {game.blood} &nbsp;·&nbsp; ☠ {game.kills}</div>
        <div className="hud-stage">ЭТАП {game.stage} · ЗВЕРЕЙ ОСТАЛОСЬ {left}</div>
        {game.echo && <div className="hud-echo">💀 ЭХО КРОВИ ОСТАЛОСЬ НА МЕСТЕ ГИБЕЛИ</div>}
        <div className="hud-btn-row">
          <button
            className="hud-btn"
            onClick={() => {
              setMuted(toggleMute())
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="hud-btn" onClick={() => setShopOpen(true)}>
            ⬆ УЛУЧШЕНИЯ
          </button>
        </div>
      </div>

      <div className="hud-hint">WASD / джойстик — движение · J / F — атака · Space — перекат · Q — парирование · R — бег</div>

      {flashOn && <div className="hud-flash" key={game.flashAt} />}
      {bannerOn && game.banner && (
        <div className="hud-banner" key={game.banner.at}>
          <div className="banner-text">{game.banner.text}</div>
          {game.banner.sub && <div className="banner-sub">{game.banner.sub}</div>}
        </div>
      )}

      {shopOpen && (
        <div className="shop-backdrop" onClick={() => setShopOpen(false)}>
          <div className="shop-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shop-title">КРОВАЯ МАСТЕРСКАЯ</div>
            <div className="shop-blood">🩸 У тебя {game.blood} крови</div>
            {Object.entries(UPGRADE_LABELS).map(([kind, info]) => {
              const cost = upgradeCost(kind)
              return (
                <div className="shop-item" key={kind}>
                  <div>
                    <div className="shop-name">{info.name}</div>
                    <div className="shop-desc">{info.desc}</div>
                    <div className="shop-lvl">Уровень {game.upgrades[kind]}</div>
                  </div>
                  <button className="shop-buy" disabled={game.blood < cost} onClick={() => buy(kind)}>
                    🩸 {cost}
                  </button>
                </div>
              )
            })}
            <button className="shop-close" onClick={() => setShopOpen(false)}>
              ЗАКРЫТЬ
            </button>
          </div>
        </div>
      )}

      {game.dead && (
        <div className="hud-died">
          <div className="died-text">YOU DIED</div>
          <div className="died-sub">{game.echo ? 'Твоя кровь осталась на месте гибели. Вернись и забери её.' : 'Смерть — не конец. Охотник всегда возвращается.'}</div>
          <button
            className="died-btn"
            onClick={() => {
              reviveAtLamp()
            }}
          >
            ВОССТАТЬ У ФОНАРЯ
          </button>
        </div>
      )}
    </div>
  )
}
