import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const DROPS = 700
const RAIN_AREA = { x: 26, zNear: 9, zFar: -48, top: 17 }

export function Rain() {
  const geoRef = useRef(null)

  const drops = useMemo(() => {
    const rand = () => Math.random()
    return Array.from({ length: DROPS }, () => ({
      x: (rand() - 0.5) * 2 * RAIN_AREA.x,
      z: RAIN_AREA.zFar + rand() * (RAIN_AREA.zNear - RAIN_AREA.zFar),
      y: rand() * RAIN_AREA.top,
      speed: 13 + rand() * 9,
      len: 0.5 + rand() * 0.45
    }))
  }, [])

  const positions = useMemo(() => {
    const arr = new Float32Array(DROPS * 2 * 3)
    drops.forEach((d, i) => {
      const o = i * 6
      arr[o] = d.x
      arr[o + 1] = d.y
      arr[o + 2] = d.z
      arr[o + 3] = d.x - 0.09
      arr[o + 4] = d.y + d.len
      arr[o + 5] = d.z
    })
    return arr
  }, [drops])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const arr = geoRef.current?.attributes.position?.array
    if (!arr) return
    for (let i = 0; i < DROPS; i++) {
      const o = i * 6
      const d = drops[i]
      d.y -= d.speed * dt
      if (d.y < 0) {
        d.y = RAIN_AREA.top + Math.random() * 3
        d.x = (Math.random() - 0.5) * 2 * RAIN_AREA.x
        d.z = RAIN_AREA.zFar + Math.random() * (RAIN_AREA.zNear - RAIN_AREA.zFar)
      }
      arr[o + 1] = d.y
      arr[o] = d.x
      arr[o + 2] = d.z
      arr[o + 4] = d.y + d.len
      arr[o + 3] = d.x - 0.09
      arr[o + 5] = d.z
    }
    geoRef.current.attributes.position.needsUpdate = true
  })

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#7d8899"
        transparent
        opacity={0.17}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog
      />
    </lineSegments>
  )
}
