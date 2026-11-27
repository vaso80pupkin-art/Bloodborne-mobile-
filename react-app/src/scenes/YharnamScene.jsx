import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import {
  EffectComposer,
  Bloom,
  Vignette,
  HueSaturation,
  BrightnessContrast,
  Noise
} from '@react-three/postprocessing'
import { CobblestoneGround } from './CobblestoneGround.jsx'
import { StreetLamp } from './StreetLamp.jsx'
import { AshParticles } from './AshParticles.jsx'
import { CitySilhouettes } from './CitySilhouettes.jsx'
import { GroundFog } from './GroundFog.jsx'
import { Cathedral } from './Cathedral.jsx'
import { Graveyard } from './Graveyard.jsx'
import { Hunter } from './Hunter.jsx'
import { Rain } from './Rain.jsx'
import { Puddles } from './Puddles.jsx'
import { Crows } from './Crows.jsx'
import { IronFence } from './IronFence.jsx'
import { useFrame } from '@react-three/fiber'

function createHaloTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(200, 60, 45, 0.55)')
  g.addColorStop(0.35, 'rgba(150, 35, 30, 0.22)')
  g.addColorStop(1, 'rgba(90, 20, 20, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function Moon() {
  const halo = useMemo(() => createHaloTexture(), [])
  return (
    <group position={[-40, 55, -90]}>
      <sprite scale={[34, 34, 1]}>
        <spriteMaterial
          map={halo}
          color="#c04030"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>
      <mesh>
        <sphereGeometry args={[7, 32, 32]} />
        <meshBasicMaterial color="#b8402e" fog={false} />
      </mesh>
      <pointLight color="#5a3038" intensity={600} distance={400} decay={2} />
    </group>
  )
}

function Moonlight() {
  return (
    <directionalLight
      position={[-30, 45, -40]}
      intensity={0.6}
      color="#8a5a5a"
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

function CameraDrift() {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime()
    camera.position.y = 3.2 + Math.sin(t * 0.4) * 0.05
    camera.position.x = Math.sin(t * 0.21) * 0.4
    camera.lookAt(0, 2.4, -8)
  })
  return null
}

function detectSoftwareRenderer() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''
    return /SwiftShader|llvmpipe|Software/i.test(String(r))
  } catch {
    return true
  }
}

export function YharnamScene() {
  const softwareRenderer = useMemo(detectSoftwareRenderer, [])
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.2, 11], fov: 55, near: 0.1, far: 220 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#07070d']} />
      <fogExp2 attach="fog" args={['#0a0a12', 0.024]} />
      <ambientLight intensity={0.16} color="#2a2a3a" />
      <hemisphereLight intensity={0.2} color="#3a3a55" groundColor="#0a0806" />

      <Suspense fallback={null}>
        <Stars radius={120} depth={50} count={2500} factor={4} saturation={0} fade speed={0.4} />
        <Moon />
        <Moonlight />
        <CobblestoneGround />
        <CitySilhouettes />
        <Cathedral />
        <Crows />
        <IronFence />
        <Graveyard />
        <StreetLamp position={[2.5, 0, 2]} />
        <Hunter position={[1.35, 0, 3.1]} rotationY={Math.PI / 2} />
        <StreetLamp position={[-7, 0, -6]} castShadow={false} />
        <StreetLamp position={[4, 0, -14]} castShadow={false} />
        {!softwareRenderer && <Puddles />}
        <GroundFog />
        <AshParticles />
        <Rain />
        <CameraDrift />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.25}
            mipmapBlur
          />
          {!softwareRenderer && (
            <>
              <HueSaturation saturation={-0.25} hue={0} />
              <BrightnessContrast brightness={-0.04} contrast={0.18} />
              <Vignette eskil={false} offset={0.22} darkness={0.85} />
              <Noise opacity={0.03} />
            </>
          )}
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
