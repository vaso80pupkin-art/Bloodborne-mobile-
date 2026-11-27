import React, { Suspense, useMemo, useRef } from 'react'
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
import { Enemies } from './Enemies.jsx'
import { game, stageZone } from '../game/store.js'
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
  const ref = useRef(null)
  const target = useMemo(() => new THREE.Color('#8a5a5a'), [])
  useFrame(({ scene }, delta) => {
    const l = ref.current
    if (!l) return
    const zone = stageZone()
    const k = Math.min(1, delta * 1.2)
    target.set(zone.moon)
    l.color.lerp(target, k)
    l.intensity += (zone.moonI - l.intensity) * k
    const fog = scene.fog
    if (fog) {
      target.set(zone.fog)
      fog.color.lerp(target, k)
      fog.density += (zone.density - fog.density) * k
    }
  })
  return (
    <directionalLight
      ref={ref}
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

function FollowCam() {
  useFrame(({ camera, scene }, delta) => {
    if (typeof window !== 'undefined') {
      window.__threeCam = camera
      window.__threeScene = scene
    }
    const dt = Math.min(delta, 0.05)
    const now = performance.now()
    const k = 1 - Math.pow(0.002, dt)
    const p = game.hunterPos
    let sx = 0
    let sy = 0
    const shakeAge = now - game.shakeAt
    if (shakeAge < 350) {
      const amp = (game.shakeAmp || 0.14) * (1 - shakeAge / 350)
      sx = (Math.random() - 0.5) * amp
      sy = (Math.random() - 0.5) * amp
    }
    camera.position.x += (p.x + sx - camera.position.x) * k
    camera.position.z += (p.z + 7.5 - camera.position.z) * k
    camera.position.y += (3.4 + sy - camera.position.y) * k
    camera.lookAt(p.x, 1.9, p.z - 7)
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
  const lowEnd = useMemo(() => {
    if (softwareRenderer) return true
    try {
      return window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) < 900
    } catch {
      return false
    }
  }, [])
  return (
    <Canvas
      shadows
      dpr={[1, lowEnd ? 1.3 : 1.75]}
      camera={{ position: [0, 3.2, 11], fov: 55, near: 0.1, far: 220 }}
      gl={{ antialias: !lowEnd, powerPreference: 'high-performance' }}
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
        <Hunter />
        <Enemies />
        <StreetLamp position={[-7, 0, -6]} castShadow={false} />
        <StreetLamp position={[4, 0, -14]} castShadow={false} />
        {!lowEnd && <Puddles />}
        <GroundFog />
        <AshParticles />
        <Rain />
        <FollowCam />

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
              {!lowEnd && <Noise opacity={0.03} />}
            </>
          )}
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
