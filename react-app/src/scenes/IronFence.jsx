import React from 'react'

const FENCE_X = -5.8
const FENCE_Z_FROM = 1.5
const FENCE_Z_TO = -15
const SPACING = 1.35

export function IronFence() {
  const posts = []
  for (let z = FENCE_Z_FROM; z >= FENCE_Z_TO; z -= SPACING) {
    posts.push(z)
  }

  return (
    <group>
      {posts.map((z, i) => (
        <group key={i} position={[FENCE_X, 0, z]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 1.1, 6]} />
            <meshStandardMaterial color="#100f12" roughness={0.55} metalness={0.75} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <coneGeometry args={[0.055, 0.22, 6]} />
            <meshStandardMaterial color="#141317" roughness={0.45} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {[0.42, 0.95].map((y) => (
        <mesh
          key={y}
          position={[FENCE_X, y, (FENCE_Z_FROM + FENCE_Z_TO) / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.05, 0.07, FENCE_Z_FROM - FENCE_Z_TO]} />
          <meshStandardMaterial color="#100f12" roughness={0.55} metalness={0.75} />
        </mesh>
      ))}
    </group>
  )
}
