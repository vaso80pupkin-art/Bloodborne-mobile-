import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 400
const AREA = 40
const HEIGHT = 9

export function AshParticles() {
  const pointsRef = useRef(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * AREA
      positions[i * 3 + 1] = Math.random() * HEIGHT
      positions[i * 3 + 2] = (Math.random() - 0.5) * AREA
      speeds[i] = 0.15 + Math.random() * 0.45
    }
    return { positions, speeds }
  }, [])

  useFrame((state, delta) => {
    const geometry = pointsRef.current?.geometry
    if (!geometry) return
    const attr = geometry.attributes.position
    const t = state.clock.getElapsedTime()
    for (let i = 0; i < COUNT; i++) {
      let y = attr.getY(i) - speeds[i] * delta
      if (y < 0) y = HEIGHT
      attr.setY(i, y)
      attr.setX(i, attr.getX(i) + Math.sin(t * 0.6 + i) * 0.003)
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#8a8378"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
