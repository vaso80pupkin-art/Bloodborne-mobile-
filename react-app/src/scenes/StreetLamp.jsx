import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const LAMP_HEIGHT = 4.2

function LanternGlass() {
  return (
    <mesh>
      <boxGeometry args={[0.42, 0.55, 0.42]} />
      <meshStandardMaterial
        color="#ffb45a"
        emissive="#ff9a2a"
        emissiveIntensity={2.4}
        roughness={0.35}
        metalness={0}
      />
    </mesh>
  )
}

export function StreetLamp({ position = [0, 0, 0] }) {
  const lightRef = useRef(null)
  const glassRef = useRef(null)
  const flickerSeed = useRef(Math.random() * 100)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + flickerSeed.current
    const flicker =
      0.82 +
      Math.sin(t * 9.5) * 0.06 +
      Math.sin(t * 27.3) * 0.04 +
      (Math.random() - 0.5) * 0.05
    if (lightRef.current) {
      lightRef.current.intensity = 26 * Math.max(0.55, flicker)
    }
    if (glassRef.current) {
      glassRef.current.material.emissiveIntensity = 2.4 * Math.max(0.55, flicker)
    }
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.4, 0.12, 16]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.9} metalness={0.3} />
      </mesh>

      <mesh position={[0, LAMP_HEIGHT / 2 + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, LAMP_HEIGHT, 10]} />
        <meshStandardMaterial color="#141416" roughness={0.6} metalness={0.7} />
      </mesh>

      <group position={[0, LAMP_HEIGHT + 0.35, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.26, 0.34, 0.1, 6]} />
          <meshStandardMaterial color="#141416" roughness={0.6} metalness={0.7} />
        </mesh>

        <group ref={glassRef} position={[0, -0.32, 0]}>
          <LanternGlass />
        </group>

        <mesh position={[0, -0.62, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.12, 0.12, 6]} />
          <meshStandardMaterial color="#141416" roughness={0.6} metalness={0.7} />
        </mesh>

        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.3, 0.22, 6]} />
          <meshStandardMaterial color="#101012" roughness={0.7} metalness={0.6} />
        </mesh>
      </group>

      <pointLight
        ref={lightRef}
        position={[0, LAMP_HEIGHT + 0.05, 0]}
        color="#ff9a3a"
        intensity={26}
        distance={18}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.004}
      />
    </group>
  )
}
