import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { game, emit } from '../game/store.js'
import { playerAttackHit } from './Enemies.jsx'
import { playStep, playDodge, playSwing, playDied, switchMusic } from '../game/audio.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/hunter_rigged.glb`
const IDLE = 'Idle'
const RUN = 'Run'
const YAW_OFFSET = Math.PI / 2

const BOUNDS = { minX: -4.4, maxX: 15, minZ: -34, maxZ: 7 }

export function Hunter() {
  const { scene, animations } = useGLTF(MODEL_URL)
  const innerRef = useRef(null)
  const outerRef = useRef(null)
  const { actions } = useAnimations(animations, innerRef)
  const currentRef = useRef(IDLE)
  const busyUntilRef = useRef(0)
  const posRef = useRef({ x: game.hunterPos.x, z: game.hunterPos.z })
  const facingRef = useRef({ x: 0, z: -1 })
  const dodgeRef = useRef({ active: false, until: 0, dirX: 0, dirZ: 0 })
  const attackHitDoneRef = useRef(false)
  const stepAccRef = useRef(0)
  const deadWatchRef = useRef(false)
  const lastNonceRef = useRef(game.resetNonce)
  const emittedRef = useRef({ hp: -1, stamina: -1 })

  const setState = (name, loop = THREE.LoopOnce, fade = 0.2) => {
    const next = actions[name]
    const prev = actions[currentRef.current]
    if (!next || !prev || currentRef.current === name) return
    next.reset().setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity)
    if (loop === THREE.LoopOnce) next.clampWhenFinished = true
    next.fadeIn(fade).play()
    prev.fadeOut(fade)
    currentRef.current = name
  }

  useEffect(() => {
    innerRef.current?.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.frustumCulled = false
      }
    })
  }, [scene])

  useEffect(() => {
    if (!actions[IDLE]) return
    actions[IDLE].reset().fadeIn(0.3).play()
    currentRef.current = IDLE
    return () => actions[IDLE]?.fadeOut(0.3)
  }, [actions])

  useEffect(() => {
    const mixer = innerRef.current?.animationMixer
    if (!mixer) return
    const onFinished = () => {
      busyUntilRef.current = 0
      if (currentRef.current !== IDLE && currentRef.current !== RUN) {
        setState(game.input.run ? RUN : IDLE, THREE.LoopRepeat, 0.25)
      }
    }
    mixer.addEventListener('finished', onFinished)
    return () => mixer.removeEventListener('finished', onFinished)
  }, [actions])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const now = performance.now()
    const t = clock.getElapsedTime()
    const input = game.input
    const outer = outerRef.current

    if (game.teleportReq) {
      posRef.current = { x: game.teleportReq.x, z: game.teleportReq.z }
      game.teleportReq = null
    }

    if (lastNonceRef.current !== game.resetNonce) {
      lastNonceRef.current = game.resetNonce
      posRef.current = { x: 1.35, z: 3.1 }
      facingRef.current = { x: 0, z: -1 }
      dodgeRef.current.active = false
      busyUntilRef.current = 0
      if (outer) outer.rotation.y = YAW_OFFSET
      setState(game.input.run ? RUN : IDLE, THREE.LoopRepeat)
    }

    if (game.dead && !deadWatchRef.current) {
      deadWatchRef.current = true
      playDied()
      switchMusic(true)
      if (currentRef.current !== IDLE) setState(IDLE, THREE.LoopRepeat, 0.4)
      return
    }
    if (!game.dead && deadWatchRef.current) {
      deadWatchRef.current = false
      switchMusic(false)
    }
    if (game.dead) return

    if (input.attackReq > 0 && now >= busyUntilRef.current && !dodgeRef.current.active) {
      input.attackReq = 0
      busyUntilRef.current = now + 1100
      attackHitDoneRef.current = false
      setState('Attack')
    } else if (input.attackReq > 0) {
      input.attackReq = 0
    }

    if (input.dodgeReq > 0 && now >= busyUntilRef.current && !dodgeRef.current.active) {
      input.dodgeReq = 0
      if (game.stamina >= 20) {
        game.stamina -= 20
        busyUntilRef.current = now + 800
        dodgeRef.current = {
          active: true,
          until: now + 420,
          dirX: facingRef.current.x,
          dirZ: facingRef.current.z
        }
        playDodge()
        setState('Dodge')
        emit()
      }
    } else if (input.dodgeReq > 0) {
      input.dodgeReq = 0
    }

    let mx = 0
    let mz = 0
    const keys = input.keys
    if (keys.KeyW || keys.ArrowUp) mz -= 1
    if (keys.KeyS || keys.ArrowDown) mz += 1
    if (keys.KeyA || keys.ArrowLeft) mx -= 1
    if (keys.KeyD || keys.ArrowRight) mx += 1
    mx += input.joy.x
    mz += input.joy.y
    const mlen = Math.hypot(mx, mz)
    if (mlen > 1) {
      mx /= mlen
      mz /= mlen
    }
    const moving = mlen > 0.15

    const running = input.run && moving && game.stamina > 1 && !dodgeRef.current.active && now >= busyUntilRef.current

    if (running) {
      game.stamina = Math.max(0, game.stamina - 14 * dt)
    } else {
      game.stamina = Math.min(game.maxStamina, game.stamina + 20 * dt)
    }
    if (Math.abs(game.stamina - emittedRef.current.stamina) > 0.8) {
      emittedRef.current.stamina = game.stamina
      emit()
    }

    if (dodgeRef.current.active) {
      const d = dodgeRef.current
      if (now < d.until) {
        posRef.current.x += d.dirX * 9 * dt
        posRef.current.z += d.dirZ * 9 * dt
      } else {
        d.active = false
        setState(moving ? RUN : IDLE, THREE.LoopRepeat)
      }
    } else if (moving && now >= busyUntilRef.current) {
      const speed = running ? 6.2 : 3.1
      const prevX = posRef.current.x
      const prevZ = posRef.current.z
      posRef.current.x += mx * speed * dt
      posRef.current.z += mz * speed * dt
      stepAccRef.current += Math.hypot(posRef.current.x - prevX, posRef.current.z - prevZ)
      const stepLen = running ? 2.1 : 1.5
      if (stepAccRef.current >= stepLen) {
        stepAccRef.current = 0
        playStep(running)
      }
      facingRef.current = { x: mx / mlen, z: mz / mlen }
      const targetRot = Math.atan2(-facingRef.current.x, -facingRef.current.z) + YAW_OFFSET
      if (outer) {
        let diff = targetRot - outer.rotation.y
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        outer.rotation.y += diff * Math.min(1, dt * 12)
      }
      if (currentRef.current !== RUN) setState(RUN, THREE.LoopRepeat)
    } else if (!moving && now >= busyUntilRef.current && !dodgeRef.current.active) {
      if (currentRef.current !== IDLE && currentRef.current !== 'Attack' && currentRef.current !== 'Dodge') {
        setState(IDLE, THREE.LoopRepeat)
      }
    }

    posRef.current.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, posRef.current.x))
    posRef.current.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, posRef.current.z))

    if (currentRef.current === 'Attack' && !attackHitDoneRef.current) {
      const progress = actions['Attack']?.time ?? 0
      if (progress > 0.45) {
        attackHitDoneRef.current = true
        const hit = playerAttackHit(
          posRef.current.x,
          posRef.current.z,
          facingRef.current.x,
          facingRef.current.z
        )
        if (hit && navigator.vibrate) navigator.vibrate(40)
      }
    }

    game.hunterPos.x = posRef.current.x
    game.hunterPos.z = posRef.current.z
    game.hunterFacing = facingRef.current

    if (outer) {
      outer.position.x = posRef.current.x
      outer.position.z = posRef.current.z
      outer.position.y = currentRef.current === IDLE ? Math.sin(t * 1.1) * 0.008 : 0
    }
  })

  return (
    <group ref={outerRef} position={[game.hunterPos.x, 0, game.hunterPos.z]} rotation={[0, YAW_OFFSET, 0]}>
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
