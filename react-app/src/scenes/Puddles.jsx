import React from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'

const PUDDLES = [
  { x: -2.6, z: 1.4, r: 1.9, rot: 0.4, squish: 0.55 },
  { x: 3.9, z: -1.2, r: 1.5, rot: -0.7, squish: 0.5 },
  { x: -4.2, z: -4.6, r: 2.3, rot: 1.1, squish: 0.6 }
]

export function Puddles() {
  return (
    <group>
      {PUDDLES.map((p, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, 0.015, p.z]}
          scale={[1, p.squish, 1]}
        >
          <circleGeometry args={[p.r, 28]} />
          <MeshReflectorMaterial
            resolution={256}
            blur={[220, 60]}
            mixBlur={1}
            mixStrength={2.4}
            mirror={0.45}
            depthScale={0}
            minDepthThreshold={0.9}
            maxDepthThreshold={1}
            color="#0a0a0f"
            roughness={0.82}
            metalness={0.55}
          />
        </mesh>
      ))}
    </group>
  )
}
