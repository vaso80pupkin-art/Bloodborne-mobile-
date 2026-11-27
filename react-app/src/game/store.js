const listeners = new Set()

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('bb_yharnam_save') || '{}')
  } catch {
    return {}
  }
})()

export const game = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  blood: saved.blood || 0,
  kills: saved.kills || 0,
  stage: 1,
  stageKills: 0,
  dead: false,
  flashAt: 0,
  shakeAt: 0,
  shakeAmp: 0.14,
  hitstopUntil: 0,
  parryAt: -9999,
  resetNonce: 0,
  banner: null,
  upgrades: saved.upgrades || { hp: 0, dmg: 0, stam: 0 },
  hunterPos: { x: 1.35, z: 3.1 },
  hunterFacing: { x: 0, z: -1 },
  input: {
    keys: {},
    joy: { x: 0, y: 0 },
    run: false,
    attackReq: 0,
    dodgeReq: 0,
    parryReq: 0
  }
}

export const waveQuota = () => 2 + game.stage

export const STAGE_ZONES = [
  { name: 'УЛИЦА ОХОТНИКА', x: 1.35, z: 3.1, fog: '#0a0a12', density: 0.024, moon: '#8a5a5a', moonI: 0.6 },
  { name: 'ПЛОЩАДЬ СОБОРА', x: 1, z: -13, fog: '#0d0b16', density: 0.019, moon: '#7a6a9a', moonI: 0.72 },
  { name: 'КЛАДБИЩЕ', x: -2.5, z: -24, fog: '#0a0f0e', density: 0.028, moon: '#6a8a7a', moonI: 0.52 }
]

export function stageZone(stage = game.stage) {
  return STAGE_ZONES[(stage - 1) % STAGE_ZONES.length]
}

export const playerDamage = () => 26 + game.upgrades.dmg * 9 + Math.floor(Math.random() * 14)

export const enemyMaxHp = () => Math.round(100 * (1 + (game.stage - 1) * 0.5))

export const bossMaxHp = () => 300 + game.stage * 45

export const enemyStrikeDamage = () => 8 + game.stage * 2 + Math.floor(Math.random() * 6)

export const upgradeCost = (kind) => {
  const base = kind === 'hp' ? 40 : kind === 'dmg' ? 55 : 35
  return Math.round(base * Math.pow(1.6, game.upgrades[kind]))
}

export function buyUpgrade(kind) {
  const cost = upgradeCost(kind)
  if (game.blood < cost) return false
  game.blood -= cost
  game.upgrades[kind] += 1
  if (kind === 'hp') {
    game.maxHp += 22
    game.hp = Math.min(game.maxHp, game.hp + 22)
  } else if (kind === 'stam') {
    game.maxStamina += 14
  }
  saveGame()
  emit()
  return true
}

export function showBanner(text, sub = '') {
  game.banner = { text, sub, at: performance.now() }
  emit()
}

export function hitStop(ms = 90) {
  game.hitstopUntil = performance.now() + ms
}

export function hitstopActive() {
  return performance.now() < (game.hitstopUntil || 0)
}

export function shake(amp = 0.14) {
  game.shakeAt = performance.now()
  game.shakeAmp = amp
}

export function stageCleared() {
  game.stage += 1
  game.stageKills = 0
  game.hp = game.maxHp
  const zone = stageZone()
  game.teleportReq = { x: zone.x, z: zone.z }
  showBanner(`ЭТАП ${game.stage} · ${zone.name}`, 'Охота продолжается. Звери голоднее.')
  saveGame()
  emit()
}

export function emit() {
  listeners.forEach((l) => l())
}

export function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function saveGame() {
  try {
    localStorage.setItem(
      'bb_yharnam_save',
      JSON.stringify({ blood: game.blood, kills: game.kills, upgrades: game.upgrades })
    )
  } catch {}
}

export function damagePlayer(amount) {
  if (game.dead) return
  game.hp = Math.max(0, game.hp - amount)
  game.flashAt = performance.now()
  shake(0.16)
  if (game.hp <= 0) game.dead = true
  emit()
}

export function registerKill(isBoss) {
  game.kills += 1
  game.stageKills += 1
  if (isBoss) {
    game.blood += 80 + game.stage * 15
    showBanner('ЗВЕРЬ ПОВЕРЖЕН', 'Кровь рекой стекает в твои руки.')
  }
  saveGame()
  emit()
}

export function reviveAtLamp() {
  game.hp = game.maxHp
  game.stamina = game.maxStamina
  game.dead = false
  game.resetNonce++
  emit()
}

if (typeof window !== 'undefined') {
  window.__game = game
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (e.code === 'KeyJ' || e.code === 'KeyF') game.input.attackReq++
    else if (e.code === 'Space') game.input.dodgeReq++
    else if (e.code === 'KeyQ') game.input.parryReq++
    else if (e.code === 'KeyR') game.input.run = !game.input.run
    game.input.keys[e.code] = true
  })
  window.addEventListener('keyup', (e) => {
    game.input.keys[e.code] = false
  })
}
