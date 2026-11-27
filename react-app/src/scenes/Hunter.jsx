import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = `${import.meta.env.BASE_URL}models/hunter_light.glb`
const TARGET_HEIGHT = 1.75

export function Hunter({ position = [0, 0, 0], rotationY = 0, targetHeight = TARGET_HEIGHT }) {
  const { scene } = useGLTF(MODEL_URL)
  const innerRef = useRef(null)
  const outerRef = useRef(null)

  useEffect(() => {
    const obj = innerRef.current
    if (!obj) return
    obj.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const scale = targetHeight / Math.max(size.y, 0.0001)
    obj.scale.setScalar(scale)
    obj.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)

    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.frustumCulled = false
      }
    })
  }, [scene, targetHeight])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (outerRef.current) {
      outerRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.012
      outerRef.current.rotation.z = Math.sin(t * 0.55) * 0.012
      outerRef.current.rotation.x = Math.sin(t * 0.4 + 1.3) * 0.008
    }
  })

  return (
    <group ref={outerRef} position={position} rotation={[0, rotationY, 0]}>
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
