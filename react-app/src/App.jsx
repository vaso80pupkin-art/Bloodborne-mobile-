import React from 'react'
import { YharnamScene } from './scenes/YharnamScene.jsx'
import { Hud } from './ui/Hud.jsx'

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <YharnamScene />
      <Hud />
    </div>
  )
}
