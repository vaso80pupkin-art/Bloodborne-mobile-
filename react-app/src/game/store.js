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
  dead: false,
  flashAt: 0,
  resetNonce: 0,
  teleportReq: null,
  hunterPos: { x: 1.35, z: 3.1 },
  hunterFacing: { x: 0, z: -1 },
  input: {
    keys: {},
    joy: { x: 0, y: 0 },
    run: false,
    attackReq: 0,
    dodgeReq: 0
  }
}

if (typeof window !== 'undefined') {
  window.__game = game
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (e.code === 'KeyJ' || e.code === 'KeyF') game.input.attackReq++
    else if (e.code === 'Space') game.input.dodgeReq++
    else if (e.code === 'KeyR') game.input.run = !game.input.run
    game.input.keys[e.code] = true
  })
  window.addEventListener('keyup', (e) => {
    game.input.keys[e.code] = false
  })
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
      JSON.stringify({ blood: game.blood, kills: game.kills })
    )
  } catch {}
}

export function damagePlayer(amount) {
  if (game.dead) return
  game.hp = Math.max(0, game.hp - amount)
  game.flashAt = performance.now()
  if (game.hp <= 0) game.dead = true
  emit()
}

export function rewardBlood(amount) {
  game.blood += amount
  game.kills += 1
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
