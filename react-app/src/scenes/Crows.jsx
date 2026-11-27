import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Crow({ center, radius, height, speed, phase }) {
  const ref = useRef(null)
  const leftWing = useRef(null)
  const rightWing = useRef(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const a = t * speed + phase
    if (ref.current) {
      ref.current.position.set(
        center[0] + Math.cos(a) * radius,
        height + Math.sin(t * 2.3 + phase) * 1.4,
        center[2] + Math.sin(a) * radius
      )
      ref.current.rotation.y = -a
    }
    const flap = Math.sin(t * 10 + phase) * 0.75
    if (leftWing.current) leftWing.current.rotation.z = flap
    if (rightWing.current) rightWing.current.rotation.z = -flap
  })

  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.09, 0.62, 6]} />
        <meshStandardMaterial color="#07070a" roughness={0.9} />
      </mesh>
      <group ref={leftWing}>
        <mesh position={[0.42, 0.05, 0]} rotation={[0, 0, 0.1]}>
          <planeGeometry args={[0.84, 0.3]} />
          <meshStandardMaterial color="#07070a" roughness={0.9} side={2} />
        </mesh>
      </group>
      <group ref={rightWing}>
        <mesh position={[-0.42, 0.05, 0]} rotation={[0, 0, -0.1]}>
          <planeGeometry args={[0.84, 0.3]} />
          <meshStandardMaterial color="#07070a" roughness={0.9} side={2} />
        </mesh>
      </group>
    </group>
  )
}

export function Crows() {
  const crows = [
    { center: [0, 0, -46], radius: 10, height: 24, speed: 0.3, phase: 0 },
    { center: [0, 0, -46], radius: 13, height: 27, speed: -0.22, phase: 2.1 },
    { center: [0, 0, -46], radius: 8, height: 21, speed: 0.4, phase: 4.4 },
    { center: [-14, 0, -18], radius: 6, height: 12, speed: 0.34, phase: 1.2 },
    { center: [12, 0, -10], radius: 5, height: 9, speed: -0.42, phase: 3.3 }
  ]
  return (
    <group>
      {crows.map((c, i) => (
        <Crow key={i} {...c} />
      ))}
    </group>
  )
}
