import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createFogTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(185, 190, 210, 0.5)')
  gradient.addColorStop(0.5, 'rgba(165, 170, 190, 0.2)')
  gradient.addColorStop(1, 'rgba(155, 160, 180, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const LAYERS = 12

export function GroundFog() {
  const texture = useMemo(() => createFogTexture(), [])
  const groupRef = useRef(null)

  const layers = useMemo(
    () =>
      Array.from({ length: LAYERS }, (_, i) => ({
        x: (Math.random() - 0.5) * 44,
        z: -4 - Math.random() * 40,
        y: 0.4 + Math.random() * 1.6,
        size: 9 + Math.random() * 14,
        driftSpeed: 0.12 + Math.random() * 0.25,
        driftPhase: Math.random() * Math.PI * 2,
        driftRange: 1.5 + Math.random() * 2.5,
        opacity: 0.1 + Math.random() * 0.14
      })),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    groupRef.current?.children.forEach((mesh, i) => {
      const layer = layers[i]
      mesh.position.x = layer.x + Math.sin(t * layer.driftSpeed + layer.driftPhase) * layer.driftRange
      mesh.position.z = layer.z + Math.cos(t * layer.driftSpeed * 0.6 + layer.driftPhase) * layer.driftRange * 0.5
      mesh.material.opacity = layer.opacity * (0.8 + 0.2 * Math.sin(t * 0.35 + layer.driftPhase))
    })
  })

  return (
    <group ref={groupRef}>
      {layers.map((layer, i) => (
        <mesh key={i} position={[layer.x, layer.y, layer.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[layer.size, layer.size]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            color="#6a7086"
          />
        </mesh>
      ))}
    </group>
  )
}
