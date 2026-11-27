import React from 'react'

function Tombstone({ position, tilt = 0 }) {
  return (
    <group position={position} rotation={[tilt, Math.sin(position[0] * 7) * 0.4, tilt * 0.6]}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.7, 0.12]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.275, 0.275, 0.12, 16]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.95} />
      </mesh>
    </group>
  )
}

function Cross({ position }) {
  return (
    <group position={position} rotation={[0, 0.5, 0.04]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.1]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.9} />
      </mesh>
    </group>
  )
}

function DeadTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale} rotation={[0, position[0], 0]}>
      <mesh position={[0, 1.6, 0]} rotation={[0.05, 0, -0.07]} castShadow>
        <cylinderGeometry args={[0.07, 0.22, 3.2, 6]} />
        <meshStandardMaterial color="#171310" roughness={1} />
      </mesh>
      <mesh position={[0.45, 2.7, 0.1]} rotation={[0, 0, -0.9]} castShadow>
        <cylinderGeometry args={[0.02, 0.06, 1.4, 5]} />
        <meshStandardMaterial color="#171310" roughness={1} />
      </mesh>
      <mesh position={[-0.4, 2.9, -0.1]} rotation={[0.1, 0, 0.85]} castShadow>
        <cylinderGeometry args={[0.02, 0.05, 1.2, 5]} />
        <meshStandardMaterial color="#171310" roughness={1} />
      </mesh>
      <mesh position={[0.1, 3.5, 0.2]} rotation={[0.3, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.015, 0.04, 1.0, 5]} />
        <meshStandardMaterial color="#171310" roughness={1} />
      </mesh>
    </group>
  )
}

export function Graveyard() {
  const graves = [
    [-11, -3, 0.06],
    [-9.5, -5.5, -0.08],
    [-12.5, -7, 0.1],
    [-8, -9, 0],
    [-10.5, -11, -0.05]
  ]

  return (
    <group>
      {graves.map(([x, z, tilt], i) => (
        <Tombstone key={i} position={[x, 0, z]} tilt={tilt} />
      ))}
      <Cross position={[-6.5, 0, -4.5]} />
      <Cross position={[-13.5, 0, -10]} />
      <DeadTree position={[-14, 0, -5]} scale={1.15} />
      <DeadTree position={[13, 0, -12]} scale={0.9} />
    </group>
  )
}
