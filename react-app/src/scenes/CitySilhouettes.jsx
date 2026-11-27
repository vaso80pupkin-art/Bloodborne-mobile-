import React, { useMemo } from 'react'
import * as THREE from 'three'

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function CitySilhouettes() {
  const buildings = useMemo(() => {
    const rand = seededRandom(77)
    const list = []
    for (let i = 0; i < 26; i++) {
      const side = rand() > 0.5 ? 1 : -1
      const z = -14 - rand() * 46
      const x = side * (6 + rand() * 30)
      const w = 4 + rand() * 6
      const d = 4 + rand() * 6
      const h = 7 + rand() * 16
      const gabled = rand() > 0.45
      list.push({ x, y: h / 2, z, w, d, h, gabled, rot: (rand() - 0.5) * 0.3 })
    }
    return list
  }, [])

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#0e0d12" roughness={0.95} metalness={0} />
          </mesh>
          {b.gabled && (
            <mesh position={[0, b.h + 1.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[Math.max(b.w, b.d) * 0.72, 2.4, 4]} />
              <meshStandardMaterial color="#0b0a0e" roughness={0.95} metalness={0} />
            </mesh>
          )}
          <mesh position={[0, b.h * 0.75, b.d / 2 + 0.02]}>
            <planeGeometry args={[0.55, 0.8]} />
            <meshStandardMaterial color="#2a1c10" emissive="#c07820" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
