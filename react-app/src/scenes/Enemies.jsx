import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { game, emit, damagePlayer, rewardBlood } from '../game/store.js'

const RANGE_CHASE = 10
const RANGE_WINDUP = 2.4
const HIT_RANGE = 2.1

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
  const state = useRef({
    alive: true,
    hp: 100,
    mode: 'wander',
    timer: 1 + Math.random() * 2,
    dirX: 0,
    dirZ: 1,
    x: spawn.x,
    z: spawn.z,
    rotY: Math.random() * Math.PI * 2,
    hitDone: false,
    deathT: 0,
    respawnT: 0,
    playerIframes: 0
  })

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const st = state.current
    const g = group.current
    if (!g || !st.alive) {
      if (!st.alive) {
        st.deathT += dt
        g.position.y = -Math.min(st.deathT * 1.6, 2.2)
        g.rotation.z = Math.min(st.deathT * 2.4, Math.PI / 2)
        if (st.deathT > 2.2) g.visible = false
        if (st.deathT > 14 + spawn.delay) {
          st.alive = true
          st.hp = 100
          st.mode = 'wander'
          st.x = spawn.x
          st.z = spawn.z
          st.deathT = 0
          g.visible = true
          g.position.set(st.x, 0, st.z)
          if (barWrap.current) barWrap.current.visible = true
          emit()
        }
      }
      return
    }

    const px = game.hunterPos.x
    const pz = game.hunterPos.z
    const dx = px - st.x
    const dz = pz - st.z
    const dist = Math.hypot(dx, dz)
    const t = clock.getElapsedTime()

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
      if (dist < RANGE_CHASE && !game.dead) st.mode = 'chase'
    } else if (st.mode === 'chase') {
      const nx = dx / (dist || 1)
      const nz = dz / (dist || 1)
      st.rotY += (Math.atan2(nx, nz) - st.rotY) * Math.min(1, dt * 6)
      if (dist > RANGE_WINDUP) {
        st.x += nx * 2.3 * dt
        st.z += nz * 2.3 * dt
      }
      if (dist < RANGE_WINDUP) {
        st.mode = 'windup'
        st.timer = 0.45
        st.hitDone = false
      }
      if (dist > RANGE_CHASE + 6 || game.dead) st.mode = 'wander'
    } else if (st.mode === 'windup') {
      st.timer -= dt
      const nx = dx / (dist || 1)
      const nz = dz / (dist || 1)
      st.rotY += (Math.atan2(nx, nz) - st.rotY) * Math.min(1, dt * 8)
      if (g) g.scale.y = 1 + Math.sin(Math.min(1, 1 - st.timer / 0.45) * Math.PI) * 0.12
      if (st.timer <= 0) {
        st.mode = 'strike'
        st.timer = 0.28
        st.dirX = nx
        st.dirZ = nz
        g.scale.y = 1
      }
    } else if (st.mode === 'strike') {
      st.timer -= dt
      st.x += st.dirX * 8.5 * dt
      st.z += st.dirZ * 8.5 * dt
      if (!st.hitDone) {
        const d2 = Math.hypot(px - st.x, pz - st.z)
        if (d2 < 2.1 && performance.now() > st.playerIframes) {
          st.hitDone = true
          st.playerIframes = performance.now() + 900
          damagePlayer(10 + Math.floor(Math.random() * 9))
        }
      }
      if (st.timer <= 0) {
        st.mode = 'recover'
        st.timer = 0.9
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
      eyesRef.current.material.emissiveIntensity = 2 + Math.sin(t * 5 + spawn.phase) * 1.2
    }

    if (barWrap.current) {
      barWrap.current.position.set(st.x, 2.35, st.z)
    }
    if (barFg.current) {
      const ratio = Math.max(0, st.hp) / 100
      barFg.current.scale.x = ratio
      barFg.current.position.x = -(1 - ratio) * 0.55
    }
  })

  useEffect(() => {
    const handle = { state: state.current, takeHit }
    enemies.push(handle)
    return () => {
      const i = enemies.indexOf(handle)
      if (i >= 0) enemies.splice(i, 1)
    }
  }, [])

  const takeHit = (dmg, dirX, dirZ) => {
    const st = state.current
    if (!st.alive) return
    st.hp -= dmg
    st.x += dirX * 0.5
    st.z += dirZ * 0.5
    if (st.hp <= 0) {
      st.alive = false
      st.deathT = 0
      st.respawnT = 0
      rewardBlood(10 + Math.floor(Math.random() * 19))
      if (barWrap.current) barWrap.current.visible = false
    }
    emit()
  }

  return (
    <>
      <group ref={group} position={[spawn.x, 0, spawn.z]}>
        <mesh position={[0, 1.05, 0]} castShadow>
          <capsuleGeometry args={[0.34, 0.95, 4, 10]} />
          <meshStandardMaterial color="#221c26" roughness={0.8} metalness={0.15} />
        </mesh>
        <mesh position={[0, 1.85, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#1a161e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.45, 0.3]} castShadow>
          <boxGeometry args={[0.5, 0.7, 0.18]} />
          <meshStandardMaterial color="#0f0d13" roughness={0.9} />
        </mesh>
        <mesh ref={eyesRef} position={[0, 1.88, 0.19]}>
          <boxGeometry args={[0.32, 0.08, 0.06]} />
          <meshStandardMaterial color="#1a0505" emissive="#ff2a1a" emissiveIntensity={3.2} fog={false} />
        </mesh>
        <mesh position={[0, 0.5, -0.18]} rotation={[0.5, 0, 0]} castShadow>
          <coneGeometry args={[0.3, 1.0, 7]} />
          <meshStandardMaterial color="#100e14" roughness={0.9} />
        </mesh>
      </group>
      <group ref={barWrap} position={[spawn.x, 2.35, spawn.z]}>
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

export function Enemies() {
  const spawns = useMemo(() => {
    const rand = seededRandom(101)
    return Array.from({ length: 7 }, (_, i) => ({
      x: -2 + rand() * 14,
      z: -28 + rand() * 26,
      phase: rand() * Math.PI * 2,
      delay: rand() * 8
    }))
  }, [])

  return (
    <group>
      {spawns.map((s, i) => (
        <Beast key={i} spawn={s} />
      ))}
    </group>
  )
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
    e.takeHit(28 + Math.floor(Math.random() * 15), dx / (dist || 1), dz / (dist || 1))
    hitAny = true
  }
  return hitAny
}
