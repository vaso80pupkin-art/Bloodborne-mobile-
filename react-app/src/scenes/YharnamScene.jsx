import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { CobblestoneGround } from './CobblestoneGround.jsx'
import { StreetLamp } from './StreetLamp.jsx'
import { AshParticles } from './AshParticles.jsx'
import { CitySilhouettes } from './CitySilhouettes.jsx'

function Moon() {
  return (
    <group position={[-40, 55, -90]}>
      <mesh>
        <sphereGeometry args={[7, 32, 32]} />
        <meshBasicMaterial color="#b8c4d8" fog={false} />
      </mesh>
      <pointLight color="#4a5a7a" intensity={600} distance={400} decay={2} />
    </group>
  )
}

function Moonlight() {
  return (
    <directionalLight
      position={[-30, 45, -40]}
      intensity={0.35}
      color="#6a7a9a"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-camera-far={120}
    />
  )
}

export function YharnamScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.2, 11], fov: 55, near: 0.1, far: 220 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#07070d']} />
      <fogExp2 attach="fog" args={['#0a0a12', 0.042]} />
      <ambientLight intensity={0.08} color="#2a2a3a" />
      <hemisphereLight intensity={0.12} color="#3a3a55" groundColor="#0a0806" />

      <Suspense fallback={null}>
        <Stars radius={120} depth={50} count={2500} factor={4} saturation={0} fade speed={0.4} />
        <Moon />
        <Moonlight />
        <CobblestoneGround />
        <CitySilhouettes />
        <StreetLamp position={[2.5, 0, 2]} />
        <StreetLamp position={[-7, 0, -6]} />
        <AshParticles />
      </Suspense>
    </Canvas>
  )
}
