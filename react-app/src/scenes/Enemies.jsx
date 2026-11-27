import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  game,
  emit,
  damagePlayer,
  registerKill,
  waveQuota,
  playerDamage,
  enemyMaxHp,
  bossMaxHp,
  enemyStrikeDamage,
  showBanner,
  stageCleared
} from '../game/store.js'
import { playHit, playKill, playGrowl, playBossRoar, playSwing, playHurt } from '../game/audio.js'

const RANGE_CHASE = 10
const RANGE_WINDUP = 2.4

export const deathEvents = []

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function Beast({ spawn }) {
  const group = useRef(null)
  const barFg = useRef(null)
  const barWrap = useRef(null)
  const eyesRef = useRef(null)
  const bodyRef = useRef(null)
  const bossLightRef = useRef(null)
  const state = useRef({
    alive: true,
    hp: enemyMaxHp(),
    maxHp: enemyMaxHp(),
    boss: false,
    mode: 'wander',
    timer: 1 + Math.random() * 2,
    dirX: 0,
    dirZ: 1,
    x: spawn.x,
    z: spawn.z,
    homeX: spawn.x,
    homeZ: spawn.z,
    rotY: Math.random() * Math.PI * 2,
    hitDone: false,
    deathT: 0,
    playerIframes: 0,
    growled: false
  })

  const takeHit = (dmg, dirX, dirZ) => {
    const st = state.current
    if (!st.alive || game.dead) return
    st.hp -= dmg
    st.x += dirX * 0.5
    st.z += dirZ * 0.5
    playHit()
    if (st.hp <= 0) {
      st.alive = false
      st.deathT = 0
      playKill()
      deathEvents.push({ x: st.x, z: st.z, at: performance.now() })
      registerKill(st.boss)
      if (barWrap.current) barWrap.current.visible = false
    }
    emit()
  }

  useEffect(() => {
    const handle = {
      state: state.current,
      takeHit,
      refs: { group, barWrap }
    }
    enemies.push(handle)
    return () => {
      const i = enemies.indexOf(handle)
      if (i >= 0) enemies.splice(i, 1)
    }
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const st = state.current
    const g = group.current
    if (!g) return

    if (!st.alive) {
      st.deathT += dt
      g.position.y = -Math.min(st.deathT * 1.6, 2.2)
      g.rotation.z = Math.min(st.deathT * 2.4, Math.PI / 2)
      if (st.deathT > 2.2) g.visible = false
      return
    }

    const px = game.hunterPos.x
    const pz = game.hunterPos.z
    const dx = px - st.x
    const dz = pz - st.z
    const dist = Math.hypot(dx, dz)
    const t = clock.getElapsedTime()

    const targetScale = st.boss ? 1.85 : 1
    if (Math.abs(g.scale.x - targetScale) > 0.005) {
      const ns = g.scale.x + (targetScale - g.scale.x) * Math.min(1, dt * 2.2)
      g.scale.set(ns, g.scale.y, ns)
    } else if (g.scale.x !== targetScale) {
      g.scale.x = targetScale
      g.scale.z = targetScale
    }

    if (st.hp < st.maxHp) {
      if (barWrap.current) barWrap.current.visible = true
    }

    if (game.dead) {
      st.mode = 'wander'
      st.timer = Math.min(st.timer, 0.5)
    }

    if (st.mode === 'wander') {
      st.timer -= dt
      if (st.timer <= 0) {
        st.timer = 2 + Math.random() * 3
        const a = Math.random() * Math.PI * 2
        st.dirX = Math.sin(a)
        st.dirZ = Math.cos(a)
        if (Math.random() < 0.35) {
          st.dirX = 0
          st.dirZ = 0
        }
      }
      st.x += st.dirX * 0.7 * dt
      st.z += st.dirZ * 0.7 * dt
      if (st.dirX || st.dirZ) {
        st.rotY += (Math.atan2(st.dirX, st.dirZ) - st.rotY) * Math.min(1, dt * 4)
      }
      if (dist < RANGE_CHASE && !game.dead) {
        st.mode = 'chase'
        if (!st.growled) {
          st.growled = true
          playGrowl()
        }
      }
    } else if (st.mode === 'chase') {
      const nx = dx / (dist || 1)
      const nz = dz / (dist || 1)
      st.rotY += (Math.atan2(nx, nz) - st.rotY) * Math.min(1, dt * 6)
      const speed = st.boss ? 2.0 : 2.4
      if (dist > RANGE_WINDUP) {
        st.x += nx * speed * dt
        st.z += nz * speed * dt
      }
      if (dist < RANGE_WINDUP) {
        st.mode = 'windup'
        st.timer = st.boss ? 0.55 : 0.45
        st.hitDone = false
        playGrowl()
      }
      if (dist > RANGE_CHASE + 6 || game.dead) st.mode = 'wander'
    } else if (st.mode === 'windup') {
      st.timer -= dt
      const nx = dx / (dist || 1)
      const nz = dz / (dist || 1)
      st.rotY += (Math.atan2(nx, nz) - st.rotY) * Math.min(1, dt * 8)
      const windupDur = st.boss ? 0.55 : 0.45
      if (g) g.scale.y = g.scale.x * (1 + Math.sin(Math.min(1, Math.max(0, 1 - st.timer / windupDur)) * Math.PI) * 0.12)
      if (st.timer <= 0) {
        st.mode = 'strike'
        st.timer = 0.28
        st.dirX = nx
        st.dirZ = nz
        playSwing()
      }
    } else if (st.mode === 'strike') {
      st.timer -= dt
      const dash = st.boss ? 10 : 8.5
      st.x += st.dirX * dash * dt
      st.z += st.dirZ * dash * dt
      if (!st.hitDone) {
        const d2 = Math.hypot(px - st.x, pz - st.z)
        if (d2 < 2.1 && performance.now() > st.playerIframes) {
          st.hitDone = true
          st.playerIframes = performance.now() + 900
          if (navigator.vibrate) navigator.vibrate(60)
          playHurt()
          damagePlayer(enemyStrikeDamage() * (st.boss ? 2 : 1))
        }
      }
      if (st.timer <= 0) {
        st.mode = 'recover'
        st.timer = st.boss ? 1.1 : 0.9
        if (g) g.scale.y = g.scale.x
      }
    } else if (st.mode === 'recover') {
      st.timer -= dt
      if (st.timer <= 0) st.mode = dist < RANGE_WINDUP ? 'windup' : 'chase'
    }

    st.x = Math.max(-4.4, Math.min(15, st.x))
    st.z = Math.max(-34, Math.min(7, st.z))

    for (const other of enemies) {
      if (other.state === st || !other.state.alive) continue
      const ox = st.x - other.state.x
      const oz = st.z - other.state.z
      const od = Math.hypot(ox, oz)
      if (od < 1.3 && od > 0.001) {
        st.x += (ox / od) * (1.3 - od) * 0.5
        st.z += (oz / od) * (1.3 - od) * 0.5
      }
    }

    g.position.x = st.x
    g.position.z = st.z
    g.position.y = Math.sin(t * 2 + spawn.phase) * 0.04
    g.rotation.y = st.rotY
    if (eyesRef.current) {
      eyesRef.current.material.emissiveIntensity = (st.boss ? 6 : 2.8) + Math.sin(t * 5 + spawn.phase) * 1.2
    }
    if (bodyRef.current) {
      bodyRef.current.material.emissiveIntensity = st.boss ? 1.15 + Math.sin(t * 3 + spawn.phase) * 0.3 : 0.14
    }
    if (bossLightRef.current) {
      bossLightRef.current.intensity = st.boss ? 14 + Math.sin(t * 3 + spawn.phase) * 4 : 0
    }

    if (barWrap.current) {
      barWrap.current.position.set(st.x, st.boss ? 4.1 : 2.35, st.z)
    }
    if (barFg.current) {
      const ratio = Math.max(0, st.hp) / st.maxHp
      barFg.current.scale.x = ratio
      barFg.current.position.x = -(1 - ratio) * (st.boss ? 1.05 : 0.55)
    }
  })

  return (
    <>
      <group ref={group} position={[spawn.x, 0, spawn.z]}>
        <pointLight ref={bossLightRef} position={[0, 2, 0]} color="#ff2010" intensity={0} distance={8} decay={2} />
        <mesh ref={bodyRef} position={[0, 1.05, 0]} castShadow>
          <capsuleGeometry args={[0.34, 0.95, 4, 10]} />
          <meshStandardMaterial color="#6f6578" roughness={0.85} metalness={0.1} emissive="#4a4556" emissiveIntensity={0.14} />
        </mesh>
        <mesh position={[0, 1.85, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#5e5568" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.45, 0.3]} castShadow>
          <boxGeometry args={[0.5, 0.7, 0.18]} />
          <meshStandardMaterial color="#2e2837" roughness={0.9} />
        </mesh>
        <mesh ref={eyesRef} position={[0, 1.88, 0.19]}>
          <boxGeometry args={[0.32, 0.08, 0.06]} />
          <meshStandardMaterial color="#1a0505" emissive="#ff2a1a" emissiveIntensity={3.2} fog={false} />
        </mesh>
        <mesh position={[0, 0.5, -0.18]} rotation={[0.5, 0, 0]} castShadow>
          <coneGeometry args={[0.3, 1.0, 7]} />
          <meshStandardMaterial color="#201b28" roughness={0.9} />
        </mesh>
      </group>
      <group ref={barWrap} position={[spawn.x, 2.35, spawn.z]} visible={false}>
        <sprite scale={[1.14, 0.12, 1]}>
          <spriteMaterial color="#1a0808" fog={false} depthWrite={false} />
        </sprite>
        <sprite ref={barFg} position={[0, 0, 0.01]} scale={[1.1, 0.07, 1]}>
          <spriteMaterial color="#8a1a14" fog={false} depthWrite={false} />
        </sprite>
      </group>
    </>
  )
}

const enemies = []
if (typeof window !== 'undefined') window.__enemies = enemies

function applyStageToEnemies() {
  const bossStage = game.stage % 3 === 0
  let bossAssigned = false
  const maxHp = enemyMaxHp()
  for (const e of enemies) {
    const st = e.state
    if (bossStage && !bossAssigned) {
      st.boss = true
      st.maxHp = bossMaxHp()
      st.hp = st.maxHp
      st.alive = true
      st.deathT = 0
      st.x = st.homeX
      st.z = st.homeZ
      st.mode = 'wander'
      st.growled = false
      if (st.refs) {
        st.refs.group.current.visible = true
        st.refs.group.current.rotation.z = 0
        st.refs.group.current.position.y = 0
        st.refs.group.current.scale.set(1, 1, 1)
        if (st.refs.barWrap.current) st.refs.barWrap.current.visible = false
      }
      playBossRoar()
      showBanner('ЗВЕРЬ-БОСС', 'Он больше, злее и жаждет твоей крови.')
      bossAssigned = true
      continue
    }
    st.boss = false
    st.maxHp = maxHp
    if (st.alive) {
      st.hp = Math.min(maxHp, Math.max(st.hp, maxHp * 0.6))
      if (st.refs && st.refs.group.current) st.refs.group.current.scale.set(1, 1, 1)
    }
  }
  emit()
}

export function playerAttackHit(originX, originZ, facingX, facingZ) {
  let hitAny = false
  for (const e of enemies) {
    const st = e.state
    if (!st.alive) continue
    const dx = st.x - originX
    const dz = st.z - originZ
    const dist = Math.hypot(dx, dz)
    if (dist > 2.8) continue
    const dot = (dx / (dist || 1)) * facingX + (dz / (dist || 1)) * facingZ
    if (dot < 0.35) continue
    e.takeHit(playerDamage(), dx / (dist || 1), dz / (dist || 1))
    hitAny = true
  }
  return hitAny
}

function BloodStains() {
  const stains = useRef([])
  const meshRefs = useRef([])
  const rand = useMemo(() => seededRandom(55), [])

  stains.current = Array.from({ length: 10 }, () => ({
    x: 0, z: 0, at: 0, r: 1
  }))

  useFrame(() => {
    const now = performance.now()
    while (deathEvents.length) {
      const ev = deathEvents.shift()
      const slot = stains.current.findIndex((s) => now - s.at > 30000)
      const idx = slot >= 0 ? slot : 0
      const st = stains.current[idx]
      st.x = ev.x
      st.z = ev.z
      st.at = now
      st.r = 0.9 + rand() * 0.9
      const mesh = meshRefs.current[idx]
      if (mesh) {
        mesh.position.x = st.x
        mesh.position.z = st.z
        mesh.scale.setScalar(st.r)
      }
    }
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const st = stains.current[i]
      const age = now - st.at
      mesh.material.opacity = st.at === 0 ? 0 : Math.max(0, 0.75 * (1 - age / 30000))
    })
  })

  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02 + i * 0.001, 0]}
        >
          <circleGeometry args={[0.8, 16]} />
          <meshBasicMaterial color="#3d0806" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Enemies() {
  const spawns = useMemo(() => {
    const rand = seededRandom(101)
    return Array.from({ length: 7 }, () => ({
      x: -2 + rand() * 14,
      z: -28 + rand() * 26,
      phase: rand() * Math.PI * 2,
      delay: rand() * 8
    }))
  }, [])

  const stageLock = useRef(game.stage)

  useFrame(() => {
    if (stageLock.current !== game.stage) {
      stageLock.current = game.stage
      applyStageToEnemies()
    }
    if (!game.dead && game.stageKills >= waveQuota()) {
      stageCleared()
    }
  })

  return (
    <group>
      {spawns.map((s, i) => (
        <Beast key={i} spawn={s} />
      ))}
      <BloodStains />
    </group>
  )
}
