import React, { useMemo } from 'react'
import * as THREE from 'three'

function createCobblestoneTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#141210'
  ctx.fillRect(0, 0, size, size)

  const cols = 8
  const rows = 8
  const cell = size / cols

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offset = row % 2 === 0 ? 0 : cell / 2
      const x = col * cell + offset
      const y = row * cell
      const w = cell * 0.82
      const h = cell * 0.72

      const shade = 18 + Math.floor(Math.random() * 22)
      ctx.fillStyle = `rgb(${shade + 8}, ${shade + 4}, ${shade})`
      ctx.beginPath()
      const r = 5
      const cx = x + w / 2 + (Math.random() - 0.5) * 3
      const cy = y + h / 2 + (Math.random() - 0.5) * 3
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r)
      ctx.fill()

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.045)'
      ctx.beginPath()
      ctx.roundRect(cx - w / 2 + 3, cy - h / 2 + 3, w * 0.5, h * 0.35, 3)
      ctx.fill()
    }
  }

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '90, 80, 60' : '0, 0, 0'}, ${Math.random() * 0.12})`
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(7, 7)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function CobblestoneGround() {
  const texture = useMemo(() => createCobblestoneTexture(), [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[160, 160]} />
      <meshStandardMaterial map={texture} roughness={0.92} metalness={0.05} color="#9a9188" />
    </mesh>
  )
}
