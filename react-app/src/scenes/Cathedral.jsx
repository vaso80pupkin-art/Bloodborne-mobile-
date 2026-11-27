import React from 'react'

function Spire({ position, height = 26, radius = 2.2 }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[radius * 1.6, height, radius * 1.6]} />
        <meshStandardMaterial color="#0d0c11" roughness={0.95} />
      </mesh>
      <mesh position={[0, height + 3.2, 0]} castShadow>
        <coneGeometry args={[radius * 1.15, 6.5, 4]} />
        <meshStandardMaterial color="#0a090d" roughness={0.95} />
      </mesh>
      <mesh position={[0, height * 0.62, radius * 0.81]}>
        <planeGeometry args={[0.7, 1.6]} />
        <meshStandardMaterial color="#1e1408" emissive="#b06a18" emissiveIntensity={0.55} />
      </mesh>
    </group>
  )
}

export function Cathedral() {
  return (
    <group position={[0, 0, -72]} rotation={[0, 0.08, 0]}>
      <mesh position={[0, 9, 0]} castShadow>
        <boxGeometry args={[26, 18, 14]} />
        <meshStandardMaterial color="#0e0d12" roughness={0.95} />
      </mesh>
      <mesh position={[0, 19.5, 0]} castShadow>
        <coneGeometry args={[13, 5, 4]} />
        <meshStandardMaterial color="#0b0a0e" roughness={0.95} />
      </mesh>

      <Spire position={[-8, 0, 0]} height={24} radius={1.9} />
      <Spire position={[8, 0, 0]} height={24} radius={1.9} />
      <Spire position={[0, 0, -4]} height={30} radius={2.4} />

      <mesh position={[0, 12, 7.05]}>
        <circleGeometry args={[2.6, 24]} />
        <meshStandardMaterial color="#241608" emissive="#d08020" emissiveIntensity={1.1} />
      </mesh>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 6, 7.05]}>
          <planeGeometry args={[1.1, 4.2]} />
          <meshStandardMaterial color="#1e1408" emissive="#b06a18" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  )
}
