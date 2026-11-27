import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = `${import.meta.env.BASE_URL}models/hunter_rigged.glb`
const IDLE = 'Idle'
const LOOPED = new Set([IDLE, 'Run'])

export function Hunter({ position = [0, 0, 0], rotationY = Math.PI / 2 }) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const innerRef = useRef(null)
  const outerRef = useRef(null)
  const { actions } = useAnimations(animations, innerRef)
  const currentRef = useRef(IDLE)
  const busyUntilRef = useRef(0)

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
      const idle = actions[IDLE]
      const prev = actions[currentRef.current]
      if (idle && currentRef.current !== IDLE) {
        idle.reset().fadeIn(0.25).play()
        if (prev) prev.fadeOut(0.25)
        currentRef.current = IDLE
      }
    }
    mixer.addEventListener('finished', onFinished)
    return () => mixer.removeEventListener('finished', onFinished)
  }, [actions])

  useEffect(() => {
    const onKeyDown = (e) => {
      const now = performance.now()
      const busy = now < busyUntilRef.current
      const play = (name, fade = 0.2) => {
        const next = actions[name]
        const prev = actions[currentRef.current]
        if (!next || !prev || currentRef.current === name) return
        next.reset().setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
        next.fadeIn(fade).play()
        prev.fadeOut(fade)
        currentRef.current = name
      }
      if (e.code === 'Space' && !busy && actions['Dodge']) {
        busyUntilRef.current = now + 800
        play('Dodge')
      } else if ((e.code === 'KeyJ' || e.code === 'KeyF') && !busy && actions['Attack']) {
        busyUntilRef.current = now + 1100
        play('Attack')
      } else if (e.code === 'KeyR' && actions['Run']) {
        const next = currentRef.current === 'Run' ? IDLE : 'Run'
        const runAction = actions[next]
        const prev = actions[currentRef.current]
        if (!runAction || !prev) return
        runAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play()
        prev.fadeOut(0.3)
        currentRef.current = next
        busyUntilRef.current = 0
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (outerRef.current && currentRef.current === IDLE) {
      outerRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.008
    } else if (outerRef.current) {
      outerRef.current.position.y = position[1]
    }
  })

  return (
    <group ref={outerRef} position={position} rotation={[0, rotationY, 0]}>
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
